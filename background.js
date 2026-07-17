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
  // Enhanced prompt instructing ChatGPT to respond exclusively with short multiple-choice answers
  const formattedPrompt = `SYSTEM INSTRUCTION: You are an instant multiple-choice quiz solver. Respond ONLY with the correct multiple-choice option (letter and answer choice) and a 1-sentence explanation. Keep it extremely brief and short.\n\nQUESTION:\n${promptText}`;

  // Notify user immediately on the quiz page
  if (currentQuizTabId) {
    chrome.tabs.sendMessage(currentQuizTabId, { 
      action: "DISPLAY_ANSWER", 
      answer: "🔍 Looking at ChatGPT..." 
    });
  }

  chrome.tabs.query({ url: "https://chatgpt.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      // Tab exists: submit silently in background
      chatGptTabId = tabs[0].id;
      chrome.tabs.sendMessage(chatGptTabId, { action: "INJECT_PROMPT", prompt: formattedPrompt });
    } else {
      // First-time setup: open tab, submit, and quickly return to quiz tab
      const encodedQuery = encodeURIComponent(formattedPrompt);
      chrome.tabs.create({ url: `https://chatgpt.com/?q=${encodedQuery}`, active: true }, (newTab) => {
        chatGptTabId = newTab.id;

        setTimeout(() => {
          if (currentQuizTabId) {
            chrome.tabs.update(currentQuizTabId, { active: true });
          }
        }, 1200);
      });
    }
  });
}

// Forward responses directly to active quiz tab
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "RELAY_ANSWER_TO_QUIZ" && currentQuizTabId) {
    chrome.tabs.sendMessage(currentQuizTabId, {
      action: "DISPLAY_ANSWER",
      answer: request.answer
    });
  }
});