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