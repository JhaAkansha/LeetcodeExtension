const api = typeof browser !== "undefined" ? browser : chrome;

// This function will run in the page context
function scrapeLeetCodeData() {
  // Title
  let title = "Unknown Title";
  const titleEl = 
    document.querySelector('div[data-cy="question-title"]') ||
    document.querySelector('h1') ||
    document.querySelector('div.text-title-large, div[class*="text-title-"]');
  if (titleEl) title = titleEl.textContent.trim();

  // Tags
  const tags = Array.from(document.querySelectorAll('a[href*="/tag/"]'))
    .map(tag => tag.textContent.trim());

  // Statement
  let statement = "No statement found";
  
  // Try multiple selectors in case LeetCode changes class names
  const possibleStatementEl = document.querySelector(
    'div[data-track-load="description_content"], .content__u3I1.question-content__JfgR, div[class*="question-content"]'
  );
  if (possibleStatementEl) {
    statement = possibleStatementEl.innerText.trim();
  }

  // Code
  let code = "";
  const codeLines = document.querySelectorAll(".view-lines .view-line");
  if (codeLines.length > 0) {
    code = Array.from(codeLines).map(line => line.innerText).join("\n");
  }

  // Language
  let lang = "";
  // Try to get from the language button/dropdown
  const langBtn = document.querySelector('button[aria-haspopup="dialog"][aria-controls][data-state][class*="inline-flex"]');
  if (langBtn) {
    lang = langBtn.childNodes[0]?.textContent.trim() || langBtn.innerText.split('\n')[0].trim();
  } else {
    // Fallback: try select element
    const langSelect = document.querySelector('[data-cy="lang-select"] select');
    if (langSelect) lang = langSelect.value;
  }

  
// Map language name to extension
const langMap = {
  "c++": "cpp",
  "cpp": "cpp",
  "c": "c",
  "c#": "cs",
  "java": "java",
  "python": "py",
  "python3": "py",
  "javascript": "js",
  "typescript": "ts",
  "ruby": "rb",
  "swift": "swift",
  "go": "go",
  "kotlin": "kt",
  "rust": "rs",
  "php": "php",
  "dart": "dart",
  "scala": "scala",
  "racket": "rkt",
  "elixir": "ex",
  "erlang": "erl"
};
lang = langMap[lang.toLowerCase()] || "txt";

  return { title, tags, statement, code, lang };
}

// Save repo URL + token
document.getElementById("saveBtn").addEventListener("click", () => {
  const repoUrl = document.getElementById("repoUrl").value.trim();
  const githubToken = document.getElementById("githubToken").value.trim();

  if (!repoUrl || !githubToken) {
    alert("Please enter both Repo URL and GitHub Token");
    return;
  }

  api.storage.sync.set({ repoUrl, githubToken }, () => {
    const username = getUsernameFromRepoUrl(repoUrl);
    showUserInfo(username);
  });
});


document.getElementById("fetchBtn").addEventListener("click", () => {
  api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    api.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: scrapeLeetCodeData
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          const problemData = results[0].result;

          // Send to background script for GitHub push
          api.runtime.sendMessage({ action: "pushToGitHub", problemData });
          api.storage.local.set({ leetcodeAccepted: false });
        } else {
          alert("Could not fetch problem data. Open a LeetCode problem page.");
        }
      }
    );
  });
});

// On popup load, check if last submission was accepted
api.storage.local.get(["leetcodeAccepted"], (data) => {
  if (data.leetcodeAccepted) {
    document.getElementById("fetchBtn").disabled = false;
  }
});


// Extract GitHub username from repo URL
function getUsernameFromRepoUrl(url) {
  try {
    const match = url.match(/github\.com\/([^\/]+)/);
    return match ? match[1] : "Unknown";
  } catch {
    return "Unknown";
  }
}

function showUserInfo(username) {
  document.getElementById("settingsForm").style.display = "none";
  document.getElementById("userInfo").style.display = "block";
  document.getElementById("usernameDisplay").textContent = `Logged in as: ${username}`;
}

function showSettingsForm() {
  document.getElementById("settingsForm").style.display = "block";
  document.getElementById("userInfo").style.display = "none";
}

// On popup load, check if details exist
api.storage.sync.get(["repoUrl", "githubToken"], ({ repoUrl, githubToken }) => {
  if (repoUrl && githubToken) {
    const username = getUsernameFromRepoUrl(repoUrl);
    showUserInfo(username);
  } else {
    showSettingsForm();
  }
});

document.getElementById("deleteBtn").addEventListener("click", () => {
  api.storage.sync.remove(["repoUrl", "githubToken"], () => {
    showSettingsForm();
  });
});
