// ChatGPT & Claude PromptJump popup script
document.addEventListener("DOMContentLoaded", function () {
  const openPanelBtn = document.getElementById("open-panel");
  const reportBugBtn = document.getElementById("report-bug");

  if (!openPanelBtn) {
    console.error("Popup elements not found");
    return;
  }

  // Bug report functionality
  if (reportBugBtn) {
    reportBugBtn.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({
        url: "https://github.com/Mann275/ChatGPT__PromptJump/issues/new",
      });
      window.close();
    });
  }

  openPanelBtn.addEventListener("click", async () => {
    try {
      // Check if we're in extension context
      if (
        typeof chrome === "undefined" ||
        !chrome.runtime ||
        !chrome.runtime.id
      ) {
        console.error("Not in extension context");
        return;
      }

      // Check if chrome APIs are available
      if (!chrome.tabs || !chrome.scripting) {
        console.error("Required Chrome APIs not available");
        return;
      }

      // Focus the active tab and show the panel
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab) return;

      // Check if tab is on a supported site
      const isSupportedSite =
        tab.url &&
        (tab.url.includes("chatgpt.com") || tab.url.includes("claude.ai"));

      if (!isSupportedSite) {
        // Open ChatGPT if not on supported site
        chrome.tabs.create({ url: "https://chatgpt.com" });
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            // Try to click the promptjump button
            const promptBtn = document.querySelector(".promptjump-toggle-btn");
            if (promptBtn) {
              promptBtn.click();
            } else {
              // If no button exists, trigger the panel creation
              const event = new CustomEvent("promptjump_open_from_popup");
              window.dispatchEvent(event);
            }
          } catch (error) {
            console.log("PromptJump popup error:", error);
          }
        },
      });
    } catch (error) {
      console.error("PromptJump main function error:", error);
      // Fallback: try to focus the tab if possible
      try {
        if (chrome && chrome.tabs && tab) {
          chrome.tabs.update(tab.id, { active: true });
        }
      } catch (e) {
        console.error("Fallback error:", e);
      }
    }
  });
});
