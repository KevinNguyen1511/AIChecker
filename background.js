let quizTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToChatGPT",
    title: "Solve with ChatGPT",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToChatGPT" && info.selectionText && tab?.id) {
    initiateSolveProcess(tab.id, info.selectionText);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
          if (response?.text) {
            initiateSolveProcess(tabs[0].id, response.text);
          }
        });
      }
    });
  }
});

async function initiateSolveProcess(originTabId, questionText) {
  quizTabId = originTabId;

  // Find open chatgpt tab
  const gptTabs = await chrome.tabs.query({ url: "https://chatgpt.com/*" });

  if (gptTabs.length === 0) {
    chrome.tabs.sendMessage(quizTabId, { 
      action: "DISPLAY_ANSWER", 
      answer: "❌ Please open chatgpt.com in another tab first!" 
    });
    return;
  }

  const gptTab = gptTabs[0];
  const formattedPrompt = `SYSTEM INSTRUCTION: You are an instant multiple-choice quiz solver. Respond ONLY with the correct multiple-choice option (letter and answer choice) and a 1-sentence explanation.\n\nQUESTION:\n${questionText}`;

  // 1. Temporarily focus ChatGPT tab to wake Chrome JS engine up (bypasses tab throttling)
  await chrome.tabs.update(gptTab.id, { active: true });

  // 2. Send request to bridge script inside ChatGPT
  chrome.tabs.sendMessage(gptTab.id, { action: "SOLVE_QUESTION", prompt: formattedPrompt }, async () => {
    // 3. Instantly switch back to quiz tab
    await chrome.tabs.update(quizTabId, { active: true });
  });
}

// Relay stream updates back to quiz tab
chrome.runtime.onMessage.addListener((message) => {
  if (quizTabId && (message.action === "STREAM_UPDATE" || message.action === "STREAM_DONE")) {
    chrome.tabs.sendMessage(quizTabId, { action: "DISPLAY_ANSWER", answer: message.text });
  } else if (quizTabId && message.action === "BRIDGE_ERROR") {
    chrome.tabs.sendMessage(quizTabId, { action: "DISPLAY_ANSWER", answer: `❌ ${message.error}` });
  }
});