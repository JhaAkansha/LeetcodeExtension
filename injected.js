// Optional: intercept LeetCode's submission API calls to capture code & metadata
console.log("Injected script loaded.");

(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);

      try {
        if (typeof args[0] === "string" && args[0].includes("/check/")) {
          const cloned = response.clone();
          const data = await cloned.json();

        if (data.status_code === 10 && (data.status_msg === "Accepted" || data.state === "SUCCESS")) {
          // Send a message to the content script via window.postMessage
          window.postMessage({ type: "LeetCodeSubmissionAccepted" }, "*");
        }
      }
      } catch (e) {
        console.error("Error parsing fetch response in injected script:", e);
      }
    return response;
  };
})();


(function() {
  window.getLeetCodeCode = function() {
    try {
      if (window.monaco && monaco.editor && monaco.editor.getModels) {
        const models = monaco.editor.getModels();
        if (models.length > 0) {
          return models[0].getValue();
        }
      }
    } catch (e) {
      console.error("Error getting Monaco code:", e);
    }
    return "";
  };

  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "REQUEST_LEETCODE_CODE") {
      window.postMessage({
        type: "RESPONSE_LEETCODE_CODE",
        code: window.getLeetCodeCode()
      }, "*");
    }
  });
})();
