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
    processQuery(info.selectionText);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        currentQuizTabId = tabs[0].id;
        
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["content.js"]
        }).then(() => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
            if (response?.text) {
              processQuery(response.text);
            }
          });
        }).catch(() => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
            if (response?.text) {
              processQuery(response.text);
            }
          });
        });
      }
    });
  }
});

function processQuery(promptText) {
  const formattedPrompt = `SYSTEM INSTRUCTION: You are an instant multiple-choice quiz solver. Respond ONLY with the correct multiple-choice option (letter and answer choice) and a 1-sentence explanation. Keep it extremely brief and short.\n\nQUESTION:\n${promptText}`;

  if (currentQuizTabId) {
    sendAnswerToQuizTab(currentQuizTabId, "⚡ Thinking...");
  }

  chrome.tabs.query({ url: "https://chatgpt.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      const targetTabId = tabs[0].id;

      // Un-throttle the background tab by briefly focusing then returning
      chrome.tabs.sendMessage(targetTabId, { action: "INJECT_PROMPT", prompt: formattedPrompt });
    } else {
      const encodedQuery = encodeURIComponent(formattedPrompt);
      // Open tab pin-backgrounded so Chrome grants active execution cycles
      chrome.tabs.create({ url: `https://chatgpt.com/?q=${encodedQuery}`, active: false }, (newTab) => {
        // Keep focus on original quiz tab
        if (currentQuizTabId) {
          chrome.tabs.update(currentQuizTabId, { active: true });
        }
      });
    }
  });
}

function sendAnswerToQuizTab(tabId, answerText) {
  chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: answerText }, (response) => {
    if (chrome.runtime.lastError || !response) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"]
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: answerText });
        }, 100);
      }).catch(() => {});
    }
  });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "RELAY_ANSWER_TO_QUIZ" && currentQuizTabId) {
    sendAnswerToQuizTab(currentQuizTabId, request.answer);
  }
});