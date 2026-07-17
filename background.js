let currentQuizTabId = null;
let chatGptTabId = null;

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
    processQuery(info.selectionText);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        currentQuizTabId = tabs[0].id;
        chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
          if (response?.text) {
            processQuery(response.text);
          }
        });
      }
    });
  }
});

function processQuery(promptText) {
  const formattedPrompt = `State the best direct answer choice for this question in 1-2 short sentences:\n\n${promptText}`;

  if (currentQuizTabId) {
    chrome.tabs.sendMessage(currentQuizTabId, { 
      action: "DISPLAY_ANSWER", 
      answer: "⏳ Fetching answer from ChatGPT..." 
    });
  }

  chrome.tabs.query({ url: "https://chatgpt.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      // ChatGPT tab already exists: send in background without tab switching
      chatGptTabId = tabs[0].id;
      chrome.tabs.sendMessage(chatGptTabId, { action: "INJECT_PROMPT", prompt: formattedPrompt });
    } else {
      // First time setup: open tab with query parameter
      const encodedQuery = encodeURIComponent(formattedPrompt);
      chrome.tabs.create({ url: `https://chatgpt.com/?q=${encodedQuery}`, active: true }, (newTab) => {
        chatGptTabId = newTab.id;

        // Return focus back to quiz page after submit triggers
        setTimeout(() => {
          if (currentQuizTabId) {
            chrome.tabs.update(currentQuizTabId, { active: true });
          }
        }, 1200);
      });
    }
  });
}

// Relays generated answer back to quiz popup box
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "RELAY_ANSWER_TO_QUIZ" && currentQuizTabId) {
    chrome.tabs.sendMessage(currentQuizTabId, {
      action: "DISPLAY_ANSWER",
      answer: request.answer
    });
  }
});