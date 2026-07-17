// Register context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToChatGPT",
    title: "Solve with ChatGPT",
    contexts: ["selection"]
  });
});

// Handle Right-Click menu triggers
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToChatGPT" && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "DISPLAY_ANSWER", answer: "⏳ Sending question to ChatGPT..." });
    forwardToChatGPT(info.selectionText, tab.id);
  }
});

// Handle Option+S shortcut triggers
chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Quiz tab not refreshed:", chrome.runtime.lastError.message);
            return;
          }
          if (response?.text) {
            forwardToChatGPT(response.text, tabs[0].id);
          }
        });
      }
    });
  }
});

function forwardToChatGPT(promptText, quizTabId) {
  const formattedPrompt = `Give only the direct answer/choice for this question in 1-2 short sentences:\n\n${promptText}`;

  chrome.tabs.query({ url: "https://chatgpt.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      const chatTab = tabs[0];
      
      chrome.tabs.sendMessage(chatTab.id, { action: "INJECT_PROMPT", prompt: formattedPrompt }, (response) => {
        if (chrome.runtime.lastError) {
          chrome.tabs.sendMessage(quizTabId, { 
            action: "DISPLAY_ANSWER", 
            answer: "❌ ChatGPT tab is not ready. Please refresh your ChatGPT tab." 
          });
        }
      });
    } else {
      chrome.tabs.sendMessage(quizTabId, { 
        action: "DISPLAY_ANSWER", 
        answer: "⚠️ Please open https://chatgpt.com in a separate tab first!" 
      });
    }
  });
}