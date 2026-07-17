let currentQuizTabId = null;
let activeChatGptTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToChatGPT",
    title: "Solve with ChatGPT",
    contexts: ["selection"]
  });
});

// Context Menu trigger
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToChatGPT" && info.selectionText && tab?.id) {
    currentQuizTabId = tab.id;
    chrome.tabs.sendMessage(tab.id, { action: "DISPLAY_ANSWER", answer: "⏳ Processing question..." });
    ensureChatGPTTabAndSend(info.selectionText);
  }
});

// Shortcut trigger (Option + S)
chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        currentQuizTabId = tabs[0].id;
        chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
          if (response?.text) {
            ensureChatGPTTabAndSend(response.text);
          }
        });
      }
    });
  }
});

// Relay generated answer back to quiz tab
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "RELAY_ANSWER_TO_QUIZ" && currentQuizTabId) {
    chrome.tabs.sendMessage(currentQuizTabId, {
      action: "DISPLAY_ANSWER",
      answer: request.answer
    });
  }
});

// Ensures ChatGPT is open, injects bridge script if missing, and submits prompt
async function ensureChatGPTTabAndSend(promptText) {
  const tabs = await chrome.tabs.query({ url: "https://chatgpt.com/*" });
  
  let targetTab = null;

  if (tabs.length > 0) {
    targetTab = tabs[0];
  } else {
    // Open ChatGPT in a background tab if not found
    targetTab = await chrome.tabs.create({ url: "https://chatgpt.com/", active: false });
    // Wait briefly for page structure to load
    await new Promise((resolve) => setTimeout(resolve, 3500));
  }

  activeChatGptTabId = targetTab.id;

  // Force-inject content script to guarantee active listener
  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeChatGptTabId },
      files: ["chatgpt_bridge.js"]
    });
  } catch (err) {
    console.log("Script already injected or permission allowed:", err);
  }

  // Send prompt to bridge script
  const formattedPrompt = `Give only the direct answer choice for this question in 1-2 short sentences:\n\n${promptText}`;
  
  setTimeout(() => {
    chrome.tabs.sendMessage(activeChatGptTabId, { action: "INJECT_PROMPT", prompt: formattedPrompt }, (res) => {
      if (chrome.runtime.lastError && currentQuizTabId) {
        chrome.tabs.sendMessage(currentQuizTabId, {
          action: "DISPLAY_ANSWER",
          answer: "⚠️ ChatGPT tab loading... Try pressing Option+S again in 3 seconds!"
        });
      }
    });
  }, 500);
}