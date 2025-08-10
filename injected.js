// Optional: intercept LeetCode's submission API calls to capture code & metadata
console.log("Injected script loaded.");

(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);

    if (typeof args[0] === "string" && args[0].includes("/check/")) {
      try {
        const cloned = response.clone();
        const data = await cloned.json();

        if (data.status_code === 10 && (data.status_msg === "Accepted" || data.state === "SUCCESS")) {
          // Send a message to the content script via window.postMessage
          window.postMessage({ type: "LeetCodeSubmissionAccepted" }, "*");
        }
      } catch (e) {
        console.error("Error parsing fetch response in injected script:", e);
      }
    }
    return response;
  };
})();
