const api = typeof browser !== "undefined" ? browser : chrome;

function injectScript(file) {
  const script = document.createElement('script');
  script.src = api.runtime.getURL(file);
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

injectScript('injected.js');


window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.type === "LeetCodeSubmissionAccepted") {
    api.runtime.sendMessage({ action: "leetcodeAccepted" });
  }
});


function getMonacoCode(callback) {
  const listener = (event) => {
    if (event.data && event.data.type === "RESPONSE_LEETCODE_CODE") {
      window.removeEventListener("message", listener);
      callback(event.data.code);
    }
  };
  window.addEventListener("message", listener);
  window.postMessage({ type: "REQUEST_LEETCODE_CODE" }, "*");
}

// Expose to popup via messaging
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getCode") {
    getMonacoCode((code) => sendResponse({ code }));
    return true; // Keep the message channel open for sendResponse  
  }
});