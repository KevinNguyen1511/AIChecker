// Register right-click context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToChatGPT",
    title: "Solve with ChatGPT",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToChatGPT" && info.selectionText) {
    forwardToChatGPT(info.selectionText);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
          // Handle case where content.js isn't loaded on the active quiz tab
          if (chrome.runtime.lastError) {
            console.warn("Quiz tab not ready or refreshed:", chrome.runtime.lastError.message);
            return;
          }
          if (response?.text) {
            forwardToChatGPT(response.text);
          }
        });
      }
    });
  }
});

function forwardToChatGPT(promptText) {
  const formattedPrompt = `Solve this quiz question quickly and clearly. State the best option/answer first:\n\n${promptText}`;

  chrome.tabs.query({ url: "https://chatgpt.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      const chatTab = tabs[0];
      
      // Try sending message to existing ChatGPT tab
      chrome.tabs.sendMessage(chatTab.id, { action: "INJECT_PROMPT", prompt: formattedPrompt }, (response) => {
        // If receiving end doesn't exist yet, focus and reload or open a fresh tab
        if (chrome.runtime.lastError) {
          console.log("ChatGPT tab bridge missing. Opening prompt directly via URL...");
          chrome.tabs.create({
            url: `https://chatgpt.com/?q=${encodeURIComponent(formattedPrompt)}`
          });
        } else {
          chrome.tabs.update(chatTab.id, { active: true });
        }
      });
    } else {
      // If no ChatGPT tab is open, open one automatically with query parameter
      chrome.tabs.create({
        url: `https://chatgpt.com/?q=${encodeURIComponent(formattedPrompt)}`
      });
    }
  });
}