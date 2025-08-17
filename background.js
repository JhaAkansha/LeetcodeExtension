// background.js
const api = typeof browser !== "undefined" ? browser : chrome;

function wrapComment(text, lang) {
  const commentStyles = {
    py: { start: '"""', end: '"""' },
    rb: { start: "=begin", end: "=end" },
    rkt: { start: "#|", end: "|#" },
    ex: { start: "###", end: "###" },
    erl: { start: "%", end: "" },
    sh: { start: "#", end: "" },
    default: { start: "/**", end: "*/" },
  };
  const style = commentStyles[lang] || commentStyles.default;
  return style.end
    ? `${style.start}\n${text}\n${style.end}`
    : text
        .split("\n")
        .map((line) => `${style.start} ${line}`)
        .join("\n");
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;

  if (message.action === "leetcodeAccepted") {
    console.log("Background: Submission Accepted");
    api.storage.local.set({ leetcodeAccepted: true, buttonState: "enabled" });
    api.runtime.sendMessage({type: "enablePushButton"});

    api.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "LeetCode Submission Accepted",
      message: "Open popup to push solution to GitHub",
    });
  }

  if (message.action === "pushToGitHub") {
    api.storage.local.set({ buttonState: "pushing" });
    api.runtime.sendMessage({type: "disablePushButton"});
    api.storage.sync.get(["repoUrl", "githubToken"], async ({ repoUrl, githubToken }) => {
      if (!repoUrl || !githubToken) {
        api.runtime.sendMessage({
          type: "error",
          message: "Set your GitHub repo URL and token in popup.",
        });
        api.runtime.sendMessage({type: "enablePushButton"});
        return;
      }

      try {
        const { title, tags, statement, code, lang } = message.problemData;
        const topic = tags.length > 0 ? tags[0] : "Misc";
        const safeTitle = title.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
        const filePath = `${topic}/${safeTitle}.${lang}`;

        const probStatement = wrapComment(statement, lang);
        const fileContent = `${probStatement}\n\n${code}`;
        const encodedContent = btoa(unescape(encodeURIComponent(fileContent)));

        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
        if (!match) throw new Error("Invalid GitHub repo URL");
        const owner = match[1];
        const repo = match[2];

        const safePath = `${topic}/${safeTitle}.${lang}`.replace(/\/+/g, '/');
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${safePath}`;

        // Check if file exists
        let sha = null;
        const checkRes = await fetch(apiUrl, {
          headers: { Authorization: `token ${githubToken}` },
        });
        if (checkRes.ok) {
          const data = await checkRes.json();
          sha = data.sha;
        }

        // Upload
        const res = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Authorization: `token ${githubToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Add solution for ${title}`,
            content: encodedContent,
            sha: sha || undefined,
          }),
        });

        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

        api.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "LeetSync",
          message: `Uploaded: ${filePath}`,
        });

        // Reset flag so button disables until next Accepted
        api.storage.local.set({ leetcodeAccepted: false, buttonState: "disabled" });
        sendResponse({ success: true });
      } catch (err) {
        console.error(err);
        api.runtime.sendMessage({ type: "error", message: err.toString() });
        sendResponse({ success: false, error: err.toString() });
        api.storage.local.set({ buttonState: "enabled" });
        api.runtime.sendMessage({type: "enablePushButton"});
      }
    });
  }

  return true;
});