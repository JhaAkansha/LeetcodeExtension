// console.log("Inside content_script");

// (function () {
//     console.log("Content script initialized - " + new Date().toISOString());

//     const originalFetch = window.fetch;
//     window.fetch = async (...args) => {
//         try {
//             const response = await originalFetch(...args);
            
//             // Check specifically for the submission status check endpoint
//             if (typeof args[0] === "string" && 
//                 (args[0].includes("/submit/") || 
//                  args[0].includes("/check/") ||
//                  args[0].includes("/qd-submission-banner/"))) {
                
//                 console.log("Found LeetCode submission check:", args[0]);
                
//                 // Clone response before reading
//                 const responseClone = response.clone();
                
//                 try {
//                     const data = await responseClone.json();
//                     console.log("Submission check response:", data);
                    
//                     // Check both status_msg and state for acceptance
//                     if ((data.status_msg === "Accepted" || data.state === "SUCCESS") && 
//                         data.status_code === 10) {
//                         console.log("Solution Accepted! ✨");
                        
//                         chrome.runtime.sendMessage(
//                             { action: "leetcodeAccepted" },
//                             (response) => {
//                                 if (chrome.runtime.lastError) {
//                                     console.error("Failed to send message:", chrome.runtime.lastError);
//                                 } else {
//                                     console.log("Notification message sent successfully");
//                                 }
//                             }
//                         );
//                     }
//                 } catch (parseError) {
//                     console.error("Failed to parse submission response:", parseError);
//                 }
//             }
            
//             return response;
//         } catch (error) {
//             console.error("Fetch interceptor error:", error);
//             throw error;
//         }
//     };

//     // Verify the script is running
//     console.log("LeetCode submission interceptor active");
// })();


function injectScript(file) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(file);
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

injectScript('injected.js');


window.addEventListener("message", event => {
  // We only accept messages from ourselves
  if (event.source !== window) return;
  if (event.data.type && event.data.type === "LeetCodeSubmissionAccepted") {
    console.log("Received LeetCode submission accepted message from injected script");
    chrome.runtime.sendMessage({ action: "leetcodeAccepted" }, response => {
  if (chrome.runtime.lastError) {
    console.error("SendMessage failed:", chrome.runtime.lastError.message);
  } else {
    console.log("Message sent successfully:", response);
  }
});

  }
});
