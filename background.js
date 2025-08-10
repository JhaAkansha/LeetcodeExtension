function wrapComment(text, lang) {
    const commentStyles = {
        py: {start: '"""', end:'"""'},
        rb:   { start: '=begin', end: '=end' },
        rkt:  { start: '#|', end: '|#' },
        ex:   { start: '###', end: '###' },
        erl:  { start: '%', end: '' },
        sh:   { start: '#', end: '' },
        default: { start: '/**', end: '*/' }
    };
    const style = commentStyles[lang] || commentStyles.default;
    return style.end
        ?`${style.start}\n${text}\n${style.end}`
        :text.split('\n').map(line => `${style.start} ${line}`).join('\n');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) {
        console.error("Received undefined or null message");
        return;
    }
    if (!message.action) {
        console.error("Received message without action:", message);
        return;
    }

    if (message.action === "pushToGitHub") {
        chrome.storage.sync.get(["repoUrl", "githubToken"], async ({ repoUrl, githubToken }) => {
            if (!repoUrl || !githubToken) {
                chrome.runtime.sendMessage({ type: "error", message: "Please set your GitHub repo URL and token in the popup." });
                return;
            }

            try {
                const { title, tags, statement, code, lang } = message.problemData;

                // Prepare folder name and file name
                const topic = tags.length > 0 ? tags[0] : "Misc";
                const safeTitle = title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
                const filePath = `${topic}/${safeTitle}.${lang}`;




                const probStatement = wrapComment(statement, lang);
                const fileContent = `${probStatement}\n\n${code}`;

                // Prepend statement as comment
                // const fileContent = `/*\n${statement}\n*/\n\n${code}`;
                const encodedContent = btoa(unescape(encodeURIComponent(fileContent)));

                // Extract owner/repo from URL
                const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\.git)?/);
                if (!match) throw new Error("Invalid GitHub repo URL");
                const owner = match[1];
                const repo = match[2];

                // Create or update file on GitHub
                const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

                // Check if file exists to get sha
                let sha = null;
                const checkRes = await fetch(apiUrl, { headers: { Authorization: `token ${githubToken}` } });
                if (checkRes.ok) {
                    const data = await checkRes.json();
                    sha = data.sha;
                }

                const res = await fetch(apiUrl, {
                    method: "PUT",
                    headers: {
                        Authorization: `token ${githubToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: `Add solution for ${title}`,
                        content: encodedContent,
                        sha: sha || undefined
                    })
                });

                if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icons/icon48.png",
                    title: "LeetSync",
                    message: `Uploaded to GitHub: ${filePath}`
                });
            } catch (err) {
                console.error(err);
                chrome.runtime.sendMessage({ type: "error", message: err.toString() });
            }
        });
    }

    if (message.action === "uploadSolution") {
        const { title, tags, statement, code, lang } = message.problemData;
        const topic = tags.length > 0 ? tags[0] : "Misc";
        const filename = title.replace(/\s+/g, "_") + `.${lang}`;
        const fileContent = `/*
${title}
Tags: ${tags.join(", ")}
${statement}
*/
${code}
`;

        uploadToGitHub(filename, fileContent, topic)
            .then(res => {
                console.log("Uploaded:", res);
                sendResponse({ success: true });
            })
            .catch(err => {
                console.error(err);
                sendResponse({ success: false, error: err });
            });

        return true; // async
    }

     if (message.action === "leetcodeAccepted") {
  console.log("Background: Received leetcodeAccepted message");

  chrome.storage.local.set({ leetcodeAccepted: true });

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "LeetCode Submission Accepted",
    message: "Click here to push your code to GitHub"
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error("Notification error:", chrome.runtime.lastError);
    } else {
      console.log("Notification created with ID:", notificationId);
    }
  });
}


    return true; // keep async responses alive

});

async function uploadToGitHub(filename, content, topic) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(["repoUrl", "githubToken"], async ({ repoUrl, githubToken }) => {
            if (!repoUrl || !githubToken) {
                return reject("GitHub repo or token not set");
            }

            const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) {
                return reject("Invalid repo URL");
            }
            
            const owner = match[1];
            const repo = match[2];

            const path = `${topic}/${filename}`;
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

            const base64Content = btoa(unescape(encodeURIComponent(content)));

            // Check if file already exists (GET request)
            let sha = null;
            const existingFile = await fetch(apiUrl, {
                headers: { Authorization: `token ${githubToken}` }
            });
            if (existingFile.status === 200) {
                const data = await existingFile.json();
                sha = data.sha;
            }

            const res = await fetch(apiUrl, {
                method: "PUT",
                headers: {
                    Authorization: `token ${githubToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: `Add solution: ${filename}`,
                    content: base64Content,
                    sha
                })
            });

            if (res.ok) {
                resolve(await res.json());
            } else {
                reject(await res.text());
            }
        });
    });
}