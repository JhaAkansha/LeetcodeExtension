// Optional: intercept LeetCode's submission API calls to capture code & metadata
console.log("Injected script loaded.");

(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      if (typeof args[0] === "string" && args[0].includes("/check/")) {
        const cloned = response.clone();
        const data = await cloned.json();

        let submissionId = data.submission_id;
        if (submissionId === undefined || submissionId === null) return response;

        // Normalize to string
        submissionId = String(submissionId);

        // Ignore Run Code
        if (submissionId.startsWith("runcode_")) {
          console.log("Ignored Run Code:", submissionId);
          return response;
        }

        // Only trigger for SUCCESS + Accepted
        if (data.state === "SUCCESS" && data.status_msg === "Accepted") {
          if (!window.__leetAccepted) window.__leetAccepted = new Set();
          if (window.__leetAccepted.has(submissionId)) return response;

          window.__leetAccepted.add(submissionId);

          console.log("REAL SUBMIT ACCEPTED:", submissionId);
          window.postMessage({ type: "LeetCodeSubmissionAccepted", submissionId }, "*");
        }
      }
    } catch (e) {
      console.error("Error in fetch hook:", e);
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
