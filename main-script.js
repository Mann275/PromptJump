function attachTracker() {
  const configScript = document.createElement("script");
  configScript.src = chrome.runtime.getURL("chat-manager.js");
  configScript.onerror = function () {
    console.warn(
      "PromptJump: chat-manager injection failed, using DOM fallback mode",
    );
  };
  configScript.onload = function () {
    this.remove();

    // Load XHR Tracker
    const xhrScript = document.createElement("script");
    xhrScript.src = chrome.runtime.getURL("xhr-tracker.js");
    xhrScript.onerror = function () {
      console.warn("PromptJump: xhr-tracker injection failed");
    };
    xhrScript.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(xhrScript);

    // Load API Tracker
    const fetchScript = document.createElement("script");
    fetchScript.src = chrome.runtime.getURL("api-tracker.js");
    fetchScript.onerror = function () {
      console.warn("PromptJump: api-tracker injection failed");
    };
    fetchScript.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(fetchScript);
  };
  (document.head || document.documentElement).appendChild(configScript);
}

function createNavButton() {
  const button = document.createElement("button");
  button.classList.add("promptjump-toggle-btn");
  button.innerHTML = "💬";
  button.style.position = "fixed";
  button.style.top = "50%";
  button.style.right = "20px";
  button.style.transform = "translateY(-50%)";
  button.style.padding = "12px 14px";
  button.style.backgroundColor = "rgba(11, 18, 32, 0.9)";
  button.style.color = "#e6eef3";
  button.style.border = "1px solid rgba(255,255,255,0.15)";
  button.style.borderRadius = "12px";
  button.style.cursor = "pointer";
  button.style.zIndex = "9999";
  button.style.display = "block";
  button.style.fontSize = "22px";
  button.style.fontWeight = "500";
  button.style.boxShadow =
    "0 8px 24px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.2)";
  button.style.backdropFilter = "blur(16px)";
  button.style.webkitBackdropFilter = "blur(16px)";
  button.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
  button.onmouseover = () => {
    button.style.backgroundColor = "rgba(138, 180, 255, 0.15)";
    button.style.borderColor = "rgba(138, 180, 255, 0.3)";
    button.style.transform = "translateY(-50%) translateX(-2px) scale(1.05)";
    button.style.boxShadow =
      "0 12px 32px rgba(0,0,0,0.5), 0 6px 12px rgba(138, 180, 255, 0.2)";
  };
  button.onmouseout = () => {
    button.style.backgroundColor = "rgba(11, 18, 32, 0.9)";
    button.style.borderColor = "rgba(255,255,255,0.15)";
    button.style.transform = "translateY(-50%) scale(1)";
    button.style.boxShadow =
      "0 8px 24px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.2)";
  };
  button.onclick = togglePromptPanel;

  // Check if document.body exists before appending
  if (document.body) {
    document.body.appendChild(button);
  } else {
    console.warn("PromptJump: document.body not ready for nav button");
  }

  // Add hover tooltip
  button.title = "Prompts";

  // Make button draggable
  makeDraggable(button);

  return button;
}

function togglePromptPanel() {
  const promptPanel = document.querySelector(".promptjump-panel");
  const toggleButton = document.querySelector(".promptjump-toggle-btn");

  if (promptPanel) {
    const isVisible = promptPanel.style.display !== "none";
    if (isVisible) {
      // Hide panel
      promptPanel.style.opacity = "0";
      setTimeout(() => {
        promptPanel.style.display = "none";
        promptPanel.style.visibility = "hidden";
      }, 300);
      toggleButton.style.display = "block";
    } else {
      // Show panel with proper positioning first
      promptPanel.style.display = "block";
      promptPanel.style.visibility = "visible";
      // Force reflow to ensure position is set
      void promptPanel.offsetHeight;
      promptPanel.style.opacity = "1";
      toggleButton.style.display = "none";
      refreshPromptPanelContent(true);
    }
  }
}

function createPromptPanel() {
  const div = document.createElement("div");
  // add a class to the div
  div.classList.add("promptjump-panel");

  // Create header container
  const headerContainer = document.createElement("div");
  headerContainer.style.display = "flex";
  headerContainer.style.justifyContent = "space-between";
  headerContainer.style.alignItems = "center";
  headerContainer.style.paddingBottom = "4px";
  headerContainer.style.marginBottom = "6px";
  headerContainer.style.borderBottom = "1px solid #374151";
  headerContainer.style.cursor = "grab";
  headerContainer.style.transition = "transform 0.1s ease";

  // Add proper hand cursor for dragging with better animation
  headerContainer.onmousedown = () => {
    headerContainer.style.cursor = "grabbing";
    headerContainer.style.transform = "scale(0.98)";
  };

  headerContainer.onmouseup = () => {
    headerContainer.style.cursor = "grab";
    headerContainer.style.transform = "scale(1)";
  };

  headerContainer.onmouseenter = () => {
    if (headerContainer.style.cursor !== "grabbing") {
      headerContainer.style.cursor = "grab";
    }
  };

  // Create title
  const titleElement = document.createElement("h3");
  titleElement.innerHTML = "Prompts";
  titleElement.style.margin = "0";
  titleElement.style.fontSize = "16px";
  titleElement.style.fontWeight = "600";
  titleElement.style.background =
    "linear-gradient(90deg, #60a5fa, #a78bfa, #ec4899, #60a5fa)";
  titleElement.style.backgroundSize = "200% 100%";
  titleElement.style.webkitBackgroundClip = "text";
  titleElement.style.webkitTextFillColor = "transparent";
  titleElement.style.backgroundClip = "text";
  titleElement.style.animation = "promptjump-gradient-shift 3s ease infinite";

  // Create buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.style.display = "flex";
  buttonsContainer.style.gap = "8px";
  buttonsContainer.style.alignItems = "center";

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "✕";
  closeButton.style.background = "transparent";
  closeButton.style.border = "1px solid #ffffff";
  closeButton.style.color = "#ffffff";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontSize = "12px";
  closeButton.style.padding = "5px 8px";
  closeButton.style.borderRadius = "4px";
  closeButton.style.transition = "all 0.2s ease";
  closeButton.style.fontWeight = "bold";
  closeButton.style.lineHeight = "1";
  closeButton.style.display = "flex";
  closeButton.style.alignItems = "center";
  closeButton.style.justifyContent = "center";

  closeButton.onmouseover = () => {
    closeButton.style.backgroundColor = "#ffffff";
    closeButton.style.color = "#000000";
  };

  closeButton.onmouseout = () => {
    closeButton.style.backgroundColor = "transparent";
    closeButton.style.color = "#ffffff";
  };
  closeButton.onclick = togglePromptPanel;

  buttonsContainer.appendChild(closeButton);
  headerContainer.appendChild(titleElement);
  headerContainer.appendChild(buttonsContainer);

  // Create search bar
  const searchContainer = document.createElement("div");
  searchContainer.style.marginBottom = "8px";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search prompts...";
  searchInput.style.width = "100%";
  searchInput.style.padding = "8px 12px";
  searchInput.style.border = "1px solid #374151";
  searchInput.style.borderRadius = "6px";
  searchInput.style.backgroundColor = "#111827";
  searchInput.style.color = "#ffffff";
  searchInput.style.fontSize = "13px";
  searchInput.style.outline = "none";
  searchInput.style.boxSizing = "border-box";
  searchInput.style.transition = "all 0.2s ease";
  searchInput.style.fontFamily = "inherit";
  searchInput.style.margin = "0 0 4px 0";

  searchInput.onfocus = () => {
    searchInput.style.borderColor = "#60a5fa";
    searchInput.style.backgroundColor = "#111827";
    searchInput.style.boxShadow = "0 0 0 2px rgba(96, 165, 250, 0.2)";
  };

  searchInput.onblur = () => {
    searchInput.style.borderColor = "#374151";
    searchInput.style.backgroundColor = "#111827";
    searchInput.style.boxShadow = "none";
  };

  searchContainer.appendChild(searchInput);

  // Create content wrapper
  const contentWrapper = document.createElement("div");
  contentWrapper.classList.add("content-wrapper");
  contentWrapper.style.height = "280px";
  contentWrapper.style.overflowY = "auto";
  contentWrapper.style.overflowX = "hidden";
  contentWrapper.style.background = "rgba(15, 23, 42, 0.8)";
  contentWrapper.style.border = "1px solid rgba(51, 65, 85, 0.6)";
  contentWrapper.style.borderRadius = "6px";
  contentWrapper.style.padding = "6px";
  contentWrapper.style.margin = "0";
  contentWrapper.innerHTML = "";

  // Panel styling with more transparency and blur
  div.style.position = "fixed";
  div.style.top = "20px";
  div.style.right = "20px";
  div.style.transform = "none";
  div.style.backgroundColor = "rgba(15, 23, 42, 0.5)";
  div.style.backdropFilter = "blur(30px)";
  div.style.webkitBackdropFilter = "blur(30px)";
  div.style.padding = "14px";
  div.style.zIndex = "10000";
  div.style.border = "1px solid rgba(51, 65, 85, 0.5)";
  div.style.borderRadius = "8px";
  div.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
  div.style.maxWidth = "360px";
  div.style.minWidth = "360px";
  div.style.maxHeight = "420px";
  div.style.fontSize = "14px";
  div.style.fontFamily =
    "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  div.style.visibility = "hidden";
  div.style.display = "none";
  div.style.color = "#ffffff";
  div.style.opacity = "0";
  div.style.transition = "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

  div.appendChild(headerContainer);
  div.appendChild(searchContainer);
  div.appendChild(contentWrapper);

  // Check if document.body exists before appending
  if (document.body) {
    document.body.appendChild(div);
  } else {
    console.warn("PromptJump: document.body not ready for prompt panel");
  }

  // Make div draggable by header
  makeDraggable(div, headerContainer);

  // Add search functionality - use event delegation since messages are added dynamically
  searchInput.addEventListener("input", function () {
    const searchTerm = this.value.trim().toLowerCase();

    // Query for message items using the class we added
    const messageItems = contentWrapper.querySelectorAll(
      ".prompt-message-item",
    );

    if (!searchTerm) {
      // Show all messages if search is empty
      messageItems.forEach((item) => {
        item.style.display = "block";
      });
      return;
    }

    // Filter messages
    messageItems.forEach((item) => {
      const msgButton = item.querySelector("button");
      if (msgButton) {
        const messageText = msgButton.textContent.toLowerCase();
        if (messageText.includes(searchTerm)) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      }
    });
  });
}

// Function to make an element draggable
function makeDraggable(element, dragHandle) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  if (dragHandle) {
    // If present, the dragHandle is where you move the element from
    dragHandle.onmousedown = dragMouseDown;
  } else {
    // Otherwise, move the element from anywhere inside it
    element.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e.preventDefault();
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call function whenever the cursor moves
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";
    element.style.right = "auto"; // Remove the right position so it doesn't conflict
  }

  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

const PROMPTJUMP_STATE = {
  messageMap: new Map(),
  observer: null,
  isRendering: false,
  lastRenderFingerprint: "",
  lastLoggedCount: -1,
};

function getActivePlatform() {
  if (window.location.hostname.includes("claude.ai")) {
    return "claude";
  }
  if (window.location.hostname.includes("chatgpt.com")) {
    return "chatgpt";
  }
  return "unknown";
}

function isConversationPage() {
  const platform = getActivePlatform();
  const path = window.location.pathname || "";

  if (platform === "claude") {
    // Claude conversations are under /chat/<id>. /new should be treated as no-chat.
    return /^\/chat\//.test(path);
  }

  if (platform === "chatgpt") {
    // ChatGPT conversation pages commonly include /c/<id>.
    if (/^\/c\//.test(path)) {
      return true;
    }

    // Fallback: if a user message node already exists, we are in a conversation view.
    return Boolean(
      document.querySelector(
        "[data-message-author-role='user'], [data-testid*='user-message']",
      ),
    );
  }

  return false;
}

function normalizeMessageText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function isInsidePromptJumpUI(element) {
  if (!element || !element.closest) {
    return false;
  }

  return Boolean(
    element.closest(".promptjump-panel") ||
    element.closest(".promptjump-toggle-btn"),
  );
}

function getConversationRoot() {
  return (
    document.querySelector("main") ||
    document.querySelector("[data-testid='chat-content']") ||
    document.querySelector("[class*='conversation']") ||
    document.body
  );
}

function hasImageAttachment(element) {
  if (!element || isInsidePromptJumpUI(element)) {
    return false;
  }

  return Boolean(
    element.querySelector("img") ||
    element.querySelector("[data-testid*='image']") ||
    element.querySelector("[data-testid*='attachment']") ||
    element.querySelector("[class*='image']") ||
    element.querySelector("[class*='attachment']"),
  );
}

function hasMeaningfulText(text) {
  if (!text) {
    return false;
  }

  // Support all languages, not just ASCII, when deciding whether prompt text exists.
  return /[\p{L}\p{N}]/u.test(text);
}

function buildPromptPreview(text, hasImage) {
  const normalizedText = normalizeMessageText(text);
  const meaningful = hasMeaningfulText(normalizedText);

  if (hasImage && meaningful) {
    return "Mixed content (Image + Text)";
  }

  if (hasImage) {
    return "Image uploaded";
  }

  if (meaningful) {
    return normalizedText;
  }

  return "";
}

function isResponseInProgress() {
  const controls = document.querySelectorAll("button, [role='button']");
  for (const control of controls) {
    if (isInsidePromptJumpUI(control)) {
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
}

function isUiNoise(text) {
  const lower = text.toLowerCase();
  const blockedPhrases = [
    "new chat",
    "projects",
    "artifacts",
    "customize",
    "search",
    "share",
    "retry",
    "copy",
    "edit",
    "reply...",
    "sonnet",
    "made with",
    "prompts not showing",
    "jump to saved prompts",
    "search prompts",
    "prompts",
    "free plan upgrade",
    "upgrade",
    "welcome",
    "type / for skills",
  ];
  return blockedPhrases.some(
    (phrase) => lower === phrase || lower.includes(phrase),
  );
}

function extractTextFromElement(element) {
  if (!element || isInsidePromptJumpUI(element)) {
    return "";
  }

  const richText = element.querySelector(
    "p, .whitespace-pre-wrap, .markdown, [class*='prose']",
  );
  if (richText && richText.textContent) {
    return normalizeMessageText(richText.textContent);
  }

  return normalizeMessageText(element.innerText || element.textContent || "");
}

function extractChatGPTMessages() {
  const root = getConversationRoot();
  const userNodes = root.querySelectorAll(
    "[data-message-author-role='user'], [data-testid*='user-message']",
  );

  const messages = [];

  userNodes.forEach((node, index) => {
    if (isInsidePromptJumpUI(node)) {
      return;
    }

    const rawText = extractTextFromElement(node);
    const hasImage = hasImageAttachment(node);
    const previewText = buildPromptPreview(rawText, hasImage);

    if (!previewText || isUiNoise(previewText)) {
      return;
    }

    const id = node.getAttribute("data-message-id") || `chatgpt-user-${index}`;
    messages.push({
      id: `${id}-${index}`,
      preview:
        previewText.length > 140
          ? `${previewText.slice(0, 140)}...`
          : previewText,
      element: node,
      hasImage,
    });
  });

  return messages;
}

function isLikelyClaudeUserNode(node) {
  if (!node || isInsidePromptJumpUI(node)) {
    return false;
  }

  const testId = (node.getAttribute("data-testid") || "").toLowerCase();
  const className = (node.className || "").toString().toLowerCase();
  const ariaLabel = (node.getAttribute("aria-label") || "").toLowerCase();
  const hints = `${testId} ${className} ${ariaLabel}`;

  if (
    hints.includes("user") ||
    hints.includes("human") ||
    hints.includes("prompt")
  ) {
    return true;
  }

  const rect = node.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  // Claude user bubbles are usually right-aligned and compact.
  return (
    rect.left > window.innerWidth * 0.33 && rect.width < window.innerWidth * 0.8
  );
}

function extractClaudeMessages() {
  const root = getConversationRoot();
  const selectors = [
    "[data-testid*='user-message']",
    "[data-testid*='message']",
    "article",
    "[role='article']",
    "[class*='message']",
    "[class*='prose']",
  ];

  const candidates = [];
  const seenNodes = new Set();

  selectors.forEach((selector) => {
    root.querySelectorAll(selector).forEach((node) => {
      if (!seenNodes.has(node) && !isInsidePromptJumpUI(node)) {
        seenNodes.add(node);
        candidates.push(node);
      }
    });
  });

  const messages = [];

  candidates.forEach((node, index) => {
    if (!isLikelyClaudeUserNode(node)) {
      return;
    }

    const rawText = extractTextFromElement(node);
    const hasImage = hasImageAttachment(node);
    const previewText = buildPromptPreview(rawText, hasImage);

    if (!previewText || isUiNoise(previewText)) {
      return;
    }

    const id =
      node.getAttribute("data-message-id") || node.id || `claude-user-${index}`;
    messages.push({
      id: `${id}-${index}`,
      preview:
        previewText.length > 140
          ? `${previewText.slice(0, 140)}...`
          : previewText,
      element: node,
      hasImage,
    });
  });

  // Fallback: detect right-aligned bubble-like blocks if selectors fail.
  if (messages.length === 0) {
    const allDivs = root.querySelectorAll("div");
    const seenFallbackText = new Set();
    const maxScan = Math.min(allDivs.length, 2200);

    for (let i = 0; i < maxScan; i++) {
      const node = allDivs[i];
      if (!node || node.children.length > 10) {
        continue;
      }

      if (isInsidePromptJumpUI(node)) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      if (
        rect.width < 80 ||
        rect.height < 20 ||
        rect.width > window.innerWidth * 0.9 ||
        rect.left <= window.innerWidth * 0.4
      ) {
        continue;
      }

      const style = window.getComputedStyle(node);
      const hasBubbleBackground =
        style.backgroundColor &&
        style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        style.backgroundColor !== "transparent";

      if (!hasBubbleBackground) {
        continue;
      }

      const rawText = extractTextFromElement(node);
      const hasImage = hasImageAttachment(node);
      const previewText = buildPromptPreview(rawText, hasImage);

      if (!previewText || previewText.length > 300 || isUiNoise(previewText)) {
        continue;
      }

      const dedupeKey = previewText.toLowerCase();
      if (seenFallbackText.has(dedupeKey)) {
        continue;
      }
      seenFallbackText.add(dedupeKey);

      messages.push({
        id: `claude-fallback-${i}`,
        preview:
          previewText.length > 140
            ? `${previewText.slice(0, 140)}...`
            : previewText,
        element: node,
        hasImage,
      });
    }
  }

  return messages;
}

function getConversationMessages() {
  if (!isConversationPage()) {
    return [];
  }

  const platform = getActivePlatform();
  let messages = [];

  if (platform === "claude") {
    messages = extractClaudeMessages();
  }
  if (platform === "chatgpt") {
    messages = extractChatGPTMessages();
  }

  // Only list completed prompts. If assistant is still generating, latest user prompt stays hidden.
  if (messages.length > 0 && isResponseInProgress()) {
    return messages.slice(0, -1);
  }

  return messages;
}

function buildMessageFingerprint(messages) {
  return messages
    .map((message) => message.preview.toLowerCase())
    .sort()
    .join("||");
}

function jumpToTrackedMessage(messageId) {
  const target = PROMPTJUMP_STATE.messageMap.get(messageId);
  if (!target || !target.element) {
    return;
  }

  const targetElement = target.element;
  targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

  const originalBg = targetElement.style.backgroundColor;
  const originalBorder = targetElement.style.border;
  const originalBoxShadow = targetElement.style.boxShadow;

  targetElement.style.transition = "all 0.3s ease";
  targetElement.style.backgroundColor = "rgba(59, 130, 246, 0.15)";
  targetElement.style.border = "2px solid rgba(59, 130, 246, 0.5)";
  targetElement.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
  targetElement.style.borderRadius = "8px";

  setTimeout(() => {
    targetElement.style.backgroundColor = originalBg;
    targetElement.style.border = originalBorder;
    targetElement.style.boxShadow = originalBoxShadow;
  }, 1200);
}

function refreshPromptPanelContent(force = false) {
  if (PROMPTJUMP_STATE.isRendering) {
    return;
  }

  const promptPanel = document.querySelector(".promptjump-panel");
  if (!promptPanel) {
    return;
  }

  const contentWrapper = promptPanel.querySelector(".content-wrapper");
  if (!contentWrapper) {
    return;
  }

  const messages = getConversationMessages();
  const fingerprint = buildMessageFingerprint(messages);
  if (!force && fingerprint === PROMPTJUMP_STATE.lastRenderFingerprint) {
    return;
  }

  PROMPTJUMP_STATE.lastRenderFingerprint = fingerprint;

  if (messages.length !== PROMPTJUMP_STATE.lastLoggedCount) {
    console.log("[PromptJump] DOM mode extracted messages:", messages.length);
    PROMPTJUMP_STATE.lastLoggedCount = messages.length;
  }

  PROMPTJUMP_STATE.isRendering = true;
  PROMPTJUMP_STATE.messageMap.clear();

  try {
    contentWrapper.innerHTML = "";

    if (messages.length === 0) {
      const helperTitleDiv = document.createElement("div");
      helperTitleDiv.style.margin = "0 0 4px 0";
      helperTitleDiv.style.color = "#94a3b8";
      helperTitleDiv.style.fontSize = "13px";
      helperTitleDiv.style.textAlign = "center";
      helperTitleDiv.style.padding = "8px 0";
      helperTitleDiv.textContent = "Jump to saved prompts for this chat";
      contentWrapper.appendChild(helperTitleDiv);

      const helperWarnDiv = document.createElement("div");
      helperWarnDiv.style.margin = "0 0 8px 0";
      helperWarnDiv.style.color = "#fbbf24";
      helperWarnDiv.style.fontSize = "11px";
      helperWarnDiv.style.textAlign = "center";
      helperWarnDiv.style.padding = "4px 8px";
      helperWarnDiv.style.background = "rgba(251, 191, 36, 0.1)";
      helperWarnDiv.style.border = "1px solid rgba(251, 191, 36, 0.3)";
      helperWarnDiv.style.borderRadius = "4px";
      helperWarnDiv.textContent =
        "⚠️ Prompts not showing? Try reloading the Page";
      contentWrapper.appendChild(helperWarnDiv);
    } else {
      messages
        .slice()
        .reverse()
        .forEach((message, index) => {
          const messageId = `${message.id}-${index}`;
          PROMPTJUMP_STATE.messageMap.set(messageId, message);

          const messageDiv = document.createElement("div");
          messageDiv.classList.add("prompt-message-item");
          messageDiv.style.marginBottom = "6px";
          messageDiv.style.padding = "0";

          const msgButton = document.createElement("button");
          const messageIcon = message.hasImage ? "🖼️" : "💬";
          msgButton.innerHTML = `${messageIcon} ${message.preview}`;
          msgButton.style.cursor = "pointer";
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
          msgButton.onclick = () => jumpToTrackedMessage(messageId);

          messageDiv.appendChild(msgButton);
          contentWrapper.appendChild(messageDiv);
        });
    }

    if (messages.length === 0) {
      const footerDiv = document.createElement("div");
      footerDiv.style.textAlign = "center";
      footerDiv.style.borderTop = "1px solid rgba(51, 65, 85, 0.4)";
      footerDiv.style.paddingTop = "6px";
      footerDiv.style.marginTop = "6px";
      footerDiv.style.fontSize = "10px";
      const madeWithSpan = document.createElement("span");
      madeWithSpan.innerHTML = "Made with ❤️";
      madeWithSpan.style.color = "rgba(148, 163, 184, 0.7)";
      footerDiv.appendChild(madeWithSpan);
      contentWrapper.appendChild(footerDiv);
    }
  } finally {
    PROMPTJUMP_STATE.isRendering = false;
  }
}

function setupConversationObserver() {
  if (PROMPTJUMP_STATE.observer) {
    return;
  }

  const root = getConversationRoot();
  if (!root) {
    return;
  }

  let refreshTimeout;
  PROMPTJUMP_STATE.observer = new MutationObserver((mutations) => {
    const hasRelevantMutation = mutations.some((mutation) => {
      const targetNode =
        mutation.target?.nodeType === Node.ELEMENT_NODE
          ? mutation.target
          : mutation.target?.parentElement;

      if (!targetNode) {
        return false;
      }

      return !isInsidePromptJumpUI(targetNode);
    });

    if (!hasRelevantMutation) {
      return;
    }

    clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(() => {
      const panel = document.querySelector(".promptjump-panel");
      if (!panel || panel.style.display === "none") {
        return;
      }
      refreshPromptPanelContent(false);
    }, 300);
  });

  PROMPTJUMP_STATE.observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

// Add CSS animations for smooth transitions
function injectStyles() {
  if (document.head && !document.getElementById("promptjump-styles")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "promptjump-styles";
    styleSheet.textContent = `
      @keyframes promptjump-fadein {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      
      @keyframes promptjump-slideup {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      
      @keyframes promptjump-gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      .promptjump-panel {
        animation: promptjump-fadein 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .promptjump-panel .content-wrapper > div {
        animation: promptjump-slideup 0.2s ease-out;
      }
    `;
    (document.head || document.documentElement).appendChild(styleSheet);
  }
}

// Try to inject styles immediately, or wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectStyles);
} else {
  injectStyles();
}

// Initialize the tracker with error handling
try {
  attachTracker();
} catch (error) {
  console.error("PromptJump: Error attaching tracker:", error);
}

// Handle popup events
window.addEventListener("promptjump_open_from_popup", () => {
  const promptPanel = document.querySelector(".promptjump-panel");
  const toggleButton = document.querySelector(".promptjump-toggle-btn");

  if (promptPanel) {
    promptPanel.style.display = "block";
    promptPanel.style.visibility = "visible";
    promptPanel.style.opacity = "1";
    if (toggleButton) toggleButton.style.display = "none";
    refreshPromptPanelContent(true);
    setupConversationObserver();
  } else {
    // Create panel if it doesn't exist
    createPromptPanel();
    createNavButton();
    setTimeout(() => {
      const newPanel = document.querySelector(".promptjump-panel");
      if (newPanel) {
        newPanel.style.display = "block";
        newPanel.style.visibility = "visible";
        newPanel.style.opacity = "1";
      }
      refreshPromptPanelContent(true);
      setupConversationObserver();
    }, 100);
  }
});

window.addEventListener("promptjump_refresh", () => {
  refreshPromptPanelContent(true);
});

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    try {
      // Ensure all required objects are initialized
      if (!window.__PROMPTJUMP_USER_MSGS) {
        window.__PROMPTJUMP_USER_MSGS = {};
      }
      if (!window.__PROMPTJUMP_RESPONSE_DATA) {
        window.__PROMPTJUMP_RESPONSE_DATA = {};
      }
      if (!window.__PROMPTJUMP_REQUEST_QUEUE) {
        window.__PROMPTJUMP_REQUEST_QUEUE = [];
      }

      createPromptPanel();
      createNavButton();
      refreshPromptPanelContent(true);
      setupConversationObserver();
    } catch (error) {
      console.error("PromptJump: Error creating UI elements:", error);
    }
  }, 2000);
});
