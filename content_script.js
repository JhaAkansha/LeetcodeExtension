const api = typeof browser !== "undefined" ? browser : chrome;

function injectScript(file) {
  const script = document.createElement('script');
  script.src = api.runtime.getURL(file);
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

injectScript('injected.js');


window.addEventListener("message", event => {
  // We only accept messages from ourselves
  if (event.source !== window) return;
  if (event.data.type && event.data.type === "LeetCodeSubmissionAccepted") {
    console.log("Received LeetCode submission accepted message from injected script");
    api.runtime.sendMessage({ action: "leetcodeAccepted" }, response => {
  if (api.runtime.lastError) {
    console.error("SendMessage failed:", api.runtime.lastError.message);
  } else {
    console.log("Message sent successfully:", response);
  }
});

  }
});

function getMonacoCode(callback) {
  window.addEventListener("message", function handler(event) {
    if (event.source !== window) return;
    if (event.data.type === "RESPONSE_LEETCODE_CODE") {
      window.removeEventListener("message", handler);
      callback(event.data.code);
    }
  });

  window.postMessage({ type: "REQUEST_LEETCODE_CODE" }, "*");
}
