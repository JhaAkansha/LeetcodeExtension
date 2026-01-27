// background.js
const api = typeof browser !== "undefined" ? browser : chrome;

/**
 * Wrap problem statement as a comment depending on language
 */
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

  if (!style.end) {
    return text
      .split("\n")
      .map(line => `${style.start} ${line}`)
      .join("\n");
  }

  return `${style.start}\n${text}\n${style.end}`;
}

/**
 * SINGLE message listener
 */
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.action) return;

  /**
   * Reset accepted flag when new problem loads
   */
  if (message.action === "resetAccepted") {
    api.storage.local.set({
      leetcodeAccepted: false,
      buttonState: "disabled",
    });
    return;
  }

  /**
   * Submission accepted
   */
  if (message.action === "leetcodeAccepted") {
    console.log("Background: Submission Accepted");

    api.storage.local.set({
      leetcodeAccepted: true,
      buttonState: "enabled",
    });

    api.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "LeetCode Accepted",
      message: "You can now push this solution to GitHub",
    });

    return;
  }

  /**
   * Push solution to GitHub
   */
  if (message.action === "pushToGitHub") {
    api.storage.local.set({ buttonState: "pushing" });

    api.storage.sync.get(["repoUrl", "githubToken"], async ({ repoUrl, githubToken }) => {
      try {
        if (!repoUrl || !githubToken) {
          throw new Error("GitHub repo URL or token not set");
        }

        const { title, tags, statement, code, lang } = message.problemData;

        const topic = tags.length ? tags[0] : "Misc";
        const safeTitle = title.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
        const filePath = `${topic}/${safeTitle}.${lang}`;

        const commentedStatement = wrapComment(statement, lang);
        const content = `${commentedStatement}\n\n${code}`;
        const encoded = btoa(unescape(encodeURIComponent(content)));

        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
        if (!match) throw new Error("Invalid GitHub repo URL");

        const owner = match[1];
        const repo = match[2];
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

        // Check if file exists
        let sha;
        const check = await fetch(apiUrl, {
          headers: { Authorization: `token ${githubToken}` },
        });

        if (check.ok) {
          const data = await check.json();
          sha = data.sha;
        }

        // Upload / update
        const res = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Authorization: `token ${githubToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Add solution for ${title}`,
            content: encoded,
            sha,
          }),
        });

        if (!res.ok) {
          throw new Error(`GitHub API error: ${res.status}`);
        }

        api.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "LeetSync",
          message: `Uploaded: ${filePath}`,
        });

        // Disable until next Accepted
        api.storage.local.set({
          leetcodeAccepted: false,
          buttonState: "disabled",
        });

        sendResponse({ success: true });
      } catch (err) {
        console.error(err);

        api.storage.local.set({
          buttonState: "enabled",
        });

        sendResponse({
          success: false,
          error: err.toString(),
        });
      }
    });

    return true; // keep message channel open
  }
});
