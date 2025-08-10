console.log("Inside content_script");

(function () {
    console.log("Content script initialized - " + new Date().toISOString());

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        try {
            const response = await originalFetch(...args);
            
            // Check specifically for the submission status check endpoint
            if (typeof args[0] === "string" && 
                (args[0].includes("/submissions/detail/") || 
                 args[0].includes("/check/") ||
                 args[0].includes("/judge/") ||
                 args[0].includes("/submissions/verify_result/"))) {
                
                console.log("Found LeetCode submission check:", args[0]);
                
                // Clone response before reading
                const responseClone = response.clone();
                
                try {
                    const data = await responseClone.json();
                    console.log("Submission check response:", data);
                    
                    // Check both status_msg and state for acceptance
                    if ((data.status_msg === "Accepted" || data.state === "SUCCESS") && 
                        data.status_code === 10) {
                        console.log("Solution Accepted! ✨");
                        
                        chrome.runtime.sendMessage(
                            { action: "leetcodeAccepted" },
                            (response) => {
                                if (chrome.runtime.lastError) {
                                    console.error("Failed to send message:", chrome.runtime.lastError);
                                } else {
                                    console.log("Notification message sent successfully");
                                }
                            }
                        );
                    }
                } catch (parseError) {
                    console.error("Failed to parse submission response:", parseError);
                }
            }
            
            return response;
        } catch (error) {
            console.error("Fetch interceptor error:", error);
            throw error;
        }
    };

    // Verify the script is running
    console.log("LeetCode submission interceptor active");
})();