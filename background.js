let currentQuizTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToChatGPT",
    title: "Solve with ChatGPT",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToChatGPT" && info.selectionText && tab?.id) {
    currentQuizTabId = tab.id;
    processAndOpenChatGPT(info.selectionText);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        currentQuizTabId = tabs[0].id;
        chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
          if (response?.text) {
            processAndOpenChatGPT(response.text);
          }
        });
      }
    });
  }
});

function processAndOpenChatGPT(promptText) {
  const formattedPrompt = `State the best direct answer choice for this question in 1-2 short sentences:\n\n${promptText}`;
  const encodedQuery = encodeURIComponent(formattedPrompt);
  const targetUrl = `https://chatgpt.com/?q=${encodedQuery}`;

  // 1. Update status on quiz popup
  if (currentQuizTabId) {
    chrome.tabs.sendMessage(currentQuizTabId, { 
      action: "DISPLAY_ANSWER", 
      answer: "🚀 Opening ChatGPT in new tab..." 
    });
  }

  // 2. Query if ChatGPT is already open
  chrome.tabs.query({ url: "https://chatgpt.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      // Navigate existing ChatGPT tab directly to URL query
      chrome.tabs.update(tabs[0].id, { url: targetUrl, active: true });
    } else {
      // Create a new active tab directly
      chrome.tabs.create({ url: targetUrl, active: true });
    }
  });
}

// Receive streamed response from chatgpt_bridge.js and relay back to quiz box
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "RELAY_ANSWER_TO_QUIZ" && currentQuizTabId) {
    chrome.tabs.sendMessage(currentQuizTabId, {
      action: "DISPLAY_ANSWER",
      answer: request.answer
    });
  }
});