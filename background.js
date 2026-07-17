// Register Context Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToChatGPT",
    title: "Solve with ChatGPT",
    contexts: ["selection", "page"]
  });
});

// Context Menu Click Listener
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToChatGPT") {
    const textToSend = info.selectionText || "";
    routeToChatGPT(textToSend, tab.id);
  }
});

// Shortcut (Alt+S) Listener
chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "EXTRACT_QUESTION" }, (response) => {
          if (response?.text) {
            routeToChatGPT(response.text);
          }
        });
      }
    });
  }
});

function routeToChatGPT(rawText, tabId) {
  const prompt = `Please answer this quiz question concisely. State the correct answer choice first:\n\n${rawText}`;

  chrome.tabs.query({ url: "https://chatgpt.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      const chatGPTTab = tabs[0];
      chrome.tabs.sendMessage(chatGPTTab.id, { action: "INJECT_PROMPT", prompt: prompt });
    } else {
      // Fallback if ChatGPT isn't opened yet
      chrome.tabs.create({
        url: `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
      });
    }
  });
}