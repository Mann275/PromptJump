// PromptJump unique configuration to avoid conflicts
window.__PROMPTJUMP_RESPONSE_DATA = {};
window.__PROMPTJUMP_REQUEST_QUEUE = [];
window.__PROMPTJUMP_USER_MSGS = {};
window.__PROMPTJUMP_CORE_CONFIG = {
  // Get API pattern from platform detector
  get apiPattern() {
    const platformConfig = window.__PROMPTJUMP_PLATFORM?.getConfig();
    return platformConfig?.apiPattern || /^https:\/\/chatgpt\.com\/backend-api/;
  },

  shouldLogRequest: function (url) {
    const platform = window.__PROMPTJUMP_PLATFORM;
    if (!platform) return false;
    return platform.shouldTrackRequest(url);
  },
  isResponseInProgress: function () {
    const controls = document.querySelectorAll("button, [role='button']");
    for (const control of controls) {
      if (control.closest(".promptjump-panel, .promptjump-toggle-btn")) {
        continue;
      }

      const controlLabel = `${
        control.getAttribute("aria-label") || ""
      } ${control.getAttribute("title") || ""} ${
        control.textContent || ""
      }`.toLowerCase();

      if (
        controlLabel.includes("stop generating") ||
        controlLabel.includes("stop response") ||
        controlLabel.includes("stop output") ||
        controlLabel.includes("cancel response")
      ) {
        return true;
      }
    }

    return false;
  },
  formatMessageContent: function (content) {
    // Handle different content types
    if (typeof content === "string") {
      return content;
    }

    if (typeof content === "object" && content !== null) {
      // Check if it's an array with mixed content (text + images)
      if (Array.isArray(content)) {
        let hasImage = false;
        let textContent = "";

        content.forEach((item) => {
          if (typeof item === "string") {
            textContent += item + " ";
          } else if (typeof item === "object" && item !== null) {
            if (
              item.type === "image_url" ||
              item.image_url ||
              item.type === "image"
            ) {
              hasImage = true;
            } else if (item.type === "text" && item.text) {
              textContent += item.text + " ";
            }
          }
        });

        textContent = textContent.trim();

        if (hasImage && textContent) {
          return "Mixed content (Image + Text)";
        } else if (hasImage) {
          return "Image uploaded";
        } else if (textContent) {
          return textContent;
        }
      }

      // Handle single object content
      if (
        content.type === "image_url" ||
        content.image_url ||
        content.type === "image"
      ) {
        return "Image uploaded";
      }

      if (content.type === "text" && content.text) {
        return content.text;
      }

      // If it's an object but not recognized format, try to extract text
      if (content.text) {
        return content.text;
      }

      // Fallback for unrecognized object format
      return "Mixed content (Image + Text)";
    }

    // Fallback for other types
    return String(content);
  },
  extractUserMessages: function () {
    const platform = window.__PROMPTJUMP_PLATFORM;

    if (platform?.isChatGPT) {
      // ChatGPT extraction from API data
      const mapping = window.__PROMPTJUMP_RESPONSE_DATA.mapping;
      if (!mapping) return {};
      for (const [id, node] of Object.entries(mapping)) {
        if (
          node.message &&
          node.message.author &&
          node.message.author.role === "user"
        ) {
          if (node?.message?.content?.parts?.[0]) {
            const rawContent = node.message.content.parts[0];
            window.__PROMPTJUMP_USER_MSGS[id] =
              this.formatMessageContent(rawContent);
          }
        }
      }
    } else if (platform?.isClaude) {
      // Claude extraction from DOM
      this.extractClaudeMessagesFromDOM();
    }

    return window.__PROMPTJUMP_USER_MSGS;
  },

  extractClaudeMessagesFromDOM: function () {
    // Extract messages from Claude's DOM structure
    window.__PROMPTJUMP_USER_MSGS = {};

    // Try multiple selectors to find user messages in Claude
    const selectors = [
      '[data-testid="user-message"]',
      '[class*="user-message"]',
      '.text-message[data-role="user"]',
      '[data-role="user"]',
      '[class*="user"]', // Generic user class
    ];

    let found = 0;
    for (const selector of selectors) {
      const msgElements = document.querySelectorAll(selector);
      console.log(
        `[PromptJump] Found ${msgElements.length} messages with selector: ${selector}`,
      );

      if (msgElements.length > 0) {
        msgElements.forEach((msgEl, index) => {
          // Get the text content
          let textContent = msgEl.textContent?.trim() || "";

          // Try to extract just the message, not metadata
          const innerText = msgEl.innerText?.trim() || "";
          if (innerText && innerText.length > 0) {
            textContent = innerText;
          }

          // Look for paragraph elements which usually contain the actual message
          const paragraphs = msgEl.querySelectorAll("p");
          if (paragraphs.length > 0 && paragraphs[0].textContent) {
            textContent = paragraphs[0].textContent.trim();
          }

          if (textContent && textContent.length > 0) {
            // Limit to first 100 chars for preview
            const preview =
              textContent.substring(0, 100) +
              (textContent.length > 100 ? "..." : "");
            const id = `claude-user-${found}-${index}`;
            window.__PROMPTJUMP_USER_MSGS[id] = preview;
            found++;
          }
        });
      }

      if (found > 0) break; // Found messages, stop trying other selectors
    }

    console.log(
      "[PromptJump] Extracted Claude messages:",
      window.__PROMPTJUMP_USER_MSGS,
    );
  },
  processUserRequests: function () {
    const requests = window.__PROMPTJUMP_REQUEST_QUEUE || [];
    for (const request of requests) {
      try {
        if (
          request &&
          request.messages &&
          request.messages[0] &&
          request.messages[0].content &&
          request.messages[0].content.parts &&
          request.messages[0].content.parts[0]
        ) {
          const messageId = request.messages[0].id;
          const rawMessage = request.messages[0].content.parts[0];
          const formattedMessage = this.formatMessageContent(rawMessage);
          window.__PROMPTJUMP_USER_MSGS[messageId] = formattedMessage;
        }
      } catch (error) {
        console.warn("PromptJump: Error processing request:", error);
      }
    }
    return window.__PROMPTJUMP_USER_MSGS;
  },
  jumpToMessage: function (messageId) {
    // Try ChatGPT selector first, then Claude selector
    let targetElement = document.querySelector(
      `[data-message-id="${messageId}"]`,
    );

    if (!targetElement) {
      // Try Claude or other platform selectors
      targetElement = document.querySelector(
        `[data-testid*="${messageId}"], [id*="${messageId}"]`,
      );
    }

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Enhanced highlight effect with pulsing animation
      const originalBg = targetElement.style.backgroundColor;
      const originalBorder = targetElement.style.border;
      const originalBoxShadow = targetElement.style.boxShadow;

      targetElement.style.transition = "all 0.3s ease";
      targetElement.style.backgroundColor = "rgba(59, 130, 246, 0.15)";
      targetElement.style.border = "2px solid rgba(59, 130, 246, 0.5)";
      targetElement.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
      targetElement.style.borderRadius = "8px";

      // Pulse effect
      let pulseCount = 0;
      const pulseInterval = setInterval(() => {
        if (pulseCount % 2 === 0) {
          targetElement.style.backgroundColor = "rgba(59, 130, 246, 0.25)";
          targetElement.style.boxShadow = "0 0 30px rgba(59, 130, 246, 0.5)";
        } else {
          targetElement.style.backgroundColor = "rgba(59, 130, 246, 0.15)";
          targetElement.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
        }
        pulseCount++;
        if (pulseCount >= 4) {
          clearInterval(pulseInterval);
          setTimeout(() => {
            targetElement.style.backgroundColor = originalBg;
            targetElement.style.border = originalBorder;
            targetElement.style.boxShadow = originalBoxShadow;
          }, 500);
        }
      }, 300);
    }
  },
  updatePromptPanel: function (retryCount = 0) {
    const promptPanel = document.querySelector(".promptjump-panel");
    const platform = window.__PROMPTJUMP_PLATFORM;

    // Always extract messages for Claude, or use stored data for ChatGPT
    let userMessages = this.extractUserMessages();
    userMessages = this.processUserRequests();

    // For Claude, always do a fresh DOM scrape
    if (platform?.isClaude) {
      this.extractClaudeMessagesFromDOM();
      userMessages = window.__PROMPTJUMP_USER_MSGS;
    }

    if (promptPanel) {
      // Find or create content wrapper
      let contentWrapper = promptPanel.querySelector(".content-wrapper");
      if (!contentWrapper) {
        contentWrapper = promptPanel.children[1]; // Second child after close button
      }

      // Clear previous content
      if (contentWrapper) {
        contentWrapper.innerHTML = "";
      }

      // Add full mapping section
      const fullMappingSection = document.createElement("div");

      // Add a style to the fullMappingSection
      fullMappingSection.style.overflow = "visible";
      fullMappingSection.style.maxHeight = "none";

      // Check if we have user messages
      if (Object.keys(userMessages).length === 0) {
        const noMsgDiv = document.createElement("div");
        noMsgDiv.style.margin = "10px 0";
        noMsgDiv.textContent = platform?.isClaude
          ? "No messages yet. Start a conversation with Claude to see messages here."
          : "No messages yet. Start a conversation with ChatGPT to see messages here.";
        fullMappingSection.appendChild(noMsgDiv);
      } else {
        let messageEntries = Object.entries(userMessages);

        // Show latest prompt only after assistant response is complete.
        if (this.isResponseInProgress() && messageEntries.length > 0) {
          messageEntries = messageEntries.slice(0, -1);
        }

        // Display newest first - reverse to show new prompts at top
        messageEntries.reverse().forEach(([id, message]) => {
          const messageDiv = document.createElement("div");
          messageDiv.classList.add("prompt-message-item");
          messageDiv.style.marginBottom = "6px";
          messageDiv.style.padding = "0";

          const msgButton = document.createElement("button");
          // Use different icons for different content types
          const icon = message.includes("Image") ? "🖼️" : "💬";
          msgButton.innerHTML = `${icon} ${message}`;
          msgButton.style.cursor = "pointer";
          msgButton.style.border = "1px solid rgba(51, 65, 85, 0.5)";
          msgButton.style.padding = "8px 12px";
          msgButton.style.textAlign = "left";
          msgButton.style.width = "100%";
          msgButton.style.borderRadius = "6px";
          msgButton.style.fontSize = "13px";
          msgButton.style.display = "-webkit-box";
          msgButton.style.webkitLineClamp = "2";
          msgButton.style.webkitBoxOrient = "vertical";
          msgButton.style.overflow = "hidden";
          msgButton.style.textOverflow = "ellipsis";
          msgButton.style.background = "rgba(30, 41, 59, 0.7)";
          msgButton.style.color = "#f1f5f9";
          msgButton.style.border = "1px solid rgba(51, 65, 85, 0.5)";
          msgButton.style.marginBottom = "1px";
          msgButton.style.transition = "all 0.2s ease";
          msgButton.onmouseover = () => {
            msgButton.style.backgroundColor = "rgba(51, 65, 85, 0.8)";
            msgButton.style.borderColor = "rgba(96, 165, 250, 0.5)";
            msgButton.style.transform = "translateY(-1px)";
          };
          msgButton.onmouseout = () => {
            msgButton.style.backgroundColor = "rgba(30, 41, 59, 0.7)";
            msgButton.style.borderColor = "rgba(138, 180, 255, 0.15)";
            msgButton.style.transform = "translateY(0)";
          };

          msgButton.onclick = () => this.jumpToMessage(id);

          messageDiv.appendChild(msgButton);
          fullMappingSection.appendChild(messageDiv);
        });
      }

      if (contentWrapper) {
        contentWrapper.appendChild(fullMappingSection);
      }

      // Scroll to the top to show the latest messages (newest first)
      fullMappingSection.scrollTop = 0;
    } else if (retryCount < 5) {
      setTimeout(() => {
        this.updatePromptPanel(retryCount + 1);
      }, 2000);
    }
  },
  trackResponse: function (url, response, request) {
    console.log("[PromptJump] trackResponse:", url, response, request);
    const platform = window.__PROMPTJUMP_PLATFORM;

    if (typeof response === "object" && platform?.isChatGPT) {
      // For ChatGPT, store the response data
      window.__PROMPTJUMP_RESPONSE_DATA = response;
      window.__PROMPTJUMP_REQUEST_QUEUE = [];
      window.__PROMPTJUMP_USER_MSGS = {};
    }

    // POST request for delete chat or new chat (ChatGPT specific)
    const isDeleteChat = request && request?.is_visible === false;
    const isNewChat = request && !request.conversation_id;
    if (isDeleteChat || isNewChat) {
      window.__PROMPTJUMP_RESPONSE_DATA = {};
      window.__PROMPTJUMP_REQUEST_QUEUE = [];
      window.__PROMPTJUMP_USER_MSGS = {};
      if (isDeleteChat) return;
    }

    // POST request for new chat
    if (request) {
      window.__PROMPTJUMP_REQUEST_QUEUE.push(request);
    }

    // For Claude, always extract from DOM when messages are received
    if (platform?.isClaude) {
      this.extractClaudeMessagesFromDOM();
    }

    // Start the retry process for updating the prompt panel
    this.updatePromptPanel(0);
  },
};

// Set up mutation observer for Claude to auto-update when messages change
if (window.__PROMPTJUMP_PLATFORM?.isClaude) {
  console.log("[PromptJump] Setting up mutation observer for Claude");

  // Debounce function to avoid too many updates
  let updateTimeout;
  const debouncedUpdate = () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      window.__PROMPTJUMP_CORE_CONFIG.updatePromptPanel(0);
    }, 500);
  };

  // Watch for DOM changes
  const observer = new MutationObserver((mutations) => {
    // Check if any mutation is related to message content
    const hasMessageChanges = mutations.some((mutation) => {
      return (
        mutation.type === "childList" ||
        (mutation.type === "characterData" && mutation.target.textContent)
      );
    });

    if (hasMessageChanges) {
      debouncedUpdate();
    }
  });

  // Start observing the document body
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false,
  });

  console.log("[PromptJump] Mutation observer started for Claude");
}
