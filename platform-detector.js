// PromptJump Platform Detector
// Detects whether the user is on ChatGPT or Claude

window.__PROMPTJUMP_PLATFORM = {
  current: null,
  isChatGPT: false,
  isClaude: false,
  isSupported: false,

  detect: function () {
    const url = window.location.href;

    if (url.includes("chatgpt.com")) {
      this.current = "chatgpt";
      this.isChatGPT = true;
      this.isClaude = false;
      this.isSupported = true;
    } else if (url.includes("claude.ai")) {
      this.current = "claude";
      this.isChatGPT = false;
      this.isClaude = true;
      this.isSupported = true;
    } else {
      this.current = null;
      this.isSupported = false;
    }

    console.log("[PromptJump] Platform detected:", this.current);
    return this.current;
  },

  getConfig: function () {
    if (this.isChatGPT) {
      return {
        apiPattern:
          /^https:\/\/chatgpt\.com\/backend-api(?:\/[^\/]*)?\/(conversation|chat)(?:\/[0-9a-f-]+)?$/,
        messageSelector: "[data-message-id]",
        userMessageRole: "user",
        botMessageRole: "assistant",
        contentExtractor: this.extractChatGPTContent,
        buttonPosition: { right: "20px", top: "50%" },
      };
    } else if (this.isClaude) {
      return {
        apiPattern: /^https:\/\/claude\.ai\/api\/(conversations|messages)/,
        messageSelector: '[data-testid*="message"]',
        userMessageRole: "user",
        botMessageRole: "assistant",
        contentExtractor: this.extractClaudeContent,
        buttonPosition: { right: "20px", top: "50%" },
      };
    }
    return null;
  },

  extractChatGPTContent: function (message) {
    // ChatGPT content extraction from node structure
    if (message?.message?.content?.parts?.[0]) {
      const rawContent = message.message.content.parts[0];
      if (typeof rawContent === "string") {
        return rawContent;
      }
      if (
        rawContent.type === "image_url" ||
        rawContent.image_url ||
        rawContent.type === "image"
      ) {
        return "Image uploaded";
      }
      if (rawContent.type === "text" && rawContent.text) {
        return rawContent.text;
      }
      if (rawContent.text) {
        return rawContent.text;
      }
    }
    return "Mixed content (Image + Text)";
  },

  extractClaudeContent: function (messageElement) {
    // Claude content extraction from DOM
    if (!messageElement) return "";

    // Look for text content in Claude's message structure
    const textElement = messageElement.querySelector(
      '[data-testid="message-text"], .text-content, p, [class*="prose"], [class*="text"]',
    );
    if (textElement) {
      return textElement.textContent.trim();
    }

    // Try to find any paragraph or text nodes
    const paragraphs = messageElement.querySelectorAll("p");
    if (paragraphs.length > 0) {
      return paragraphs[0].textContent.trim();
    }

    // Fallback to textContent
    return messageElement.textContent.trim();
  },

  shouldTrackRequest: function (url, method) {
    const config = this.getConfig();
    if (!config) return false;
    console.log("[PromptJump] Checking URL:", url);
    return config.apiPattern.test(url);
  },
};

// Auto-detect platform on load
window.__PROMPTJUMP_PLATFORM.detect();
