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
    chrome.tabs.sendMessage(tab.id, { action: "DISPLAY_ANSWER", answer: "⏳ Connecting to ChatGPT..." });
    handleChatGPTFlow(info.selectionText);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        currentQuizTabId = tabs[0].id;
        chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
          if (response?.text) {
            handleChatGPTFlow(response.text);
          }
        });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "RELAY_ANSWER_TO_QUIZ" && currentQuizTabId) {
    chrome.tabs.sendMessage(currentQuizTabId, {
      action: "DISPLAY_ANSWER",
      answer: request.answer
    });
  }
});

async function handleChatGPTFlow(promptText) {
  const formattedPrompt = `State the best direct answer choice for this question in 1-2 short sentences:\n\n${promptText}`;
  
  const tabs = await chrome.tabs.query({ url: "https://chatgpt.com/*" });
  let targetTab = null;

  if (tabs.length > 0) {
    targetTab = tabs[0];
  } else {
    // Open ChatGPT tab explicitly
    targetTab = await chrome.tabs.create({ url: "https://chatgpt.com/", active: true });
    
    // Wait for initial DOM load
    await new Promise(r => setTimeout(r, 4000));
    
    // Return focus back to quiz tab
    if (currentQuizTabId) {
      chrome.tabs.update(currentQuizTabId, { active: true });
    }
  }

  // Inject content script reliably
  try {
    await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      files: ["chatgpt_bridge.js"]
    });
  } catch (e) {
    console.log("Script injection check:", e);
  }

  // Send prompt to chatgpt_bridge
  setTimeout(() => {
    chrome.tabs.sendMessage(targetTab.id, { action: "INJECT_PROMPT", prompt: formattedPrompt }, (res) => {
      if (chrome.runtime.lastError && currentQuizTabId) {
        chrome.tabs.sendMessage(currentQuizTabId, {
          action: "DISPLAY_ANSWER",
          answer: "❌ Unable to connect to ChatGPT. Refresh your ChatGPT tab and try again!"
        });
      }
    });
  }, 600);
}