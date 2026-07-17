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
    chrome.tabs.sendMessage(tab.id, { action: "DISPLAY_ANSWER", answer: "⏳ Sending question to ChatGPT..." });
    forwardToChatGPT(info.selectionText);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        currentQuizTabId = tabs[0].id;
        chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
          if (response?.text) {
            forwardToChatGPT(response.text);
          }
        });
      }
    });
  }
});

// Relays the completed response back from chatgpt_bridge.js to the quiz tab
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "RELAY_ANSWER_TO_QUIZ" && currentQuizTabId) {
    chrome.tabs.sendMessage(currentQuizTabId, {
      action: "DISPLAY_ANSWER",
      answer: request.answer
    });
  }
});

function forwardToChatGPT(promptText) {
  const formattedPrompt = `Give only the direct answer choice for this question in 1-2 short sentences:\n\n${promptText}`;

  chrome.tabs.query({ url: "https://chatgpt.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      const chatTab = tabs[0];
      chrome.tabs.sendMessage(chatTab.id, { action: "INJECT_PROMPT", prompt: formattedPrompt }, (response) => {
        if (chrome.runtime.lastError && currentQuizTabId) {
          chrome.tabs.sendMessage(currentQuizTabId, { 
            action: "DISPLAY_ANSWER", 
            answer: "❌ ChatGPT tab lost connection. Refresh your ChatGPT tab once!" 
          });
        }
      });
    } else if (currentQuizTabId) {
      chrome.tabs.sendMessage(currentQuizTabId, { 
        action: "DISPLAY_ANSWER", 
        answer: "⚠️ Please open https://chatgpt.com in a separate tab first!" 
      });
    }
  });
}