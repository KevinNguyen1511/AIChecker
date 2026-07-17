let currentQuizTabId = null;
let activePort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "chatgpt_stream") {
    activePort = port;
    
    port.onMessage.addListener((msg) => {
      if (msg.action === "RELAY_ANSWER_TO_QUIZ" && currentQuizTabId) {
        sendAnswerToQuizTab(currentQuizTabId, msg.answer);
      }
    });

    port.onDisconnect.addListener(() => {
      activePort = null;
    });
  }
});

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
        
        // Ensure content script is injected before asking for selection
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
          // Fallback if scripting API fails
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
    sendAnswerToQuizTab(currentQuizTabId, "🔍 Looking at ChatGPT...");
  }

  chrome.tabs.query({ url: "https://chatgpt.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      const targetTabId = tabs[0].id;
      chrome.tabs.sendMessage(targetTabId, { action: "INJECT_PROMPT", prompt: formattedPrompt });
    } else {
      const encodedQuery = encodeURIComponent(formattedPrompt);
      chrome.tabs.create({ url: `https://chatgpt.com/?q=${encodedQuery}`, active: true }, (newTab) => {
        setTimeout(() => {
          if (currentQuizTabId) {
            chrome.tabs.update(currentQuizTabId, { active: true });
          }
        }, 1200);
      });
    }
  });
}

// Robust answer delivery that injects content.js if missing
function sendAnswerToQuizTab(tabId, answerText) {
  chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: answerText }, (response) => {
    if (chrome.runtime.lastError || !response) {
      // Content script was missing or dropped message; force inject and retry
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"]
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: answerText });
        }, 100);
      }).catch(err => console.log("Script execution error:", err));
    }
  });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "RELAY_ANSWER_TO_QUIZ" && currentQuizTabId) {
    sendAnswerToQuizTab(currentQuizTabId, request.answer);
  }
});