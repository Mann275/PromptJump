(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = resource instanceof Request ? resource.url : resource;
    const method =
      resource instanceof Request ? resource.method : config?.method || "GET";

    // Extract request payload
    let requestData = null;
    if (resource instanceof Request) {
      try {
        // Clone the request to read its body
        const clonedRequest = resource.clone();
        if (
          clonedRequest.headers
            .get("content-type")
            ?.includes("application/json")
        ) {
          requestData = await clonedRequest.text().then((text) => {
            try {
              return JSON.parse(text);
            } catch {
              return text;
            }
          });
        }
      } catch (e) {
        console.error("Error reading request body:", e);
      }
    } else if (config && config.body) {
      try {
        if (
          typeof config.body === "string" &&
          config.headers?.["Content-Type"]?.includes("application/json")
        ) {
          requestData = JSON.parse(config.body);
        } else {
          requestData = config.body;
        }
      } catch (e) {
        requestData = config.body;
      }
    }

    // Use PromptJump platform detector
    const platform = window.__PROMPTJUMP_PLATFORM;
    const promptConfig = window.__PROMPTJUMP_CORE_CONFIG;
    const shouldLog =
      platform && promptConfig && platform.shouldTrackRequest(url, method);

    try {
      const response = await originalFetch.apply(this, args);
      if (shouldLog) {
        const clone = response.clone();
        clone
          .text()
          .then((body) => {
            try {
              const responseData = JSON.parse(body);
              promptConfig.trackResponse(url, responseData, requestData);
            } catch {
              promptConfig.trackResponse(url, body, requestData);
            }
          })
          .catch((err) => {
            promptConfig.trackResponse(url, err.message, requestData);
            console.error("Error reading response:", err.message);
          });
      }

      return response;
    } catch (error) {
      throw error;
    }
  };
})();
