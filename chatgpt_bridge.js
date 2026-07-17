chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INJECT_PROMPT" && request.prompt) {
    injectAndSubmit(request.prompt);
    sendResponse({ status: "processing" });
  }
  return true;
});

function injectAndSubmit(textPrompt) {
  const inputArea = 
    document.querySelector("#prompt-textarea") || 
    document.querySelector('div[contenteditable="true"]');

  if (!inputArea) return;

  inputArea.focus();
  document.execCommand('insertText', false, textPrompt);
  inputArea.dispatchEvent(new Event("input", { bubbles: true }));

  setTimeout(() => {
    const sendButton = 
      document.querySelector('button[data-testid="send-button"]') || 
      document.querySelector('button[aria-label="Send prompt"]') ||
      document.querySelector('button[aria-label="Send message"]');

    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    } else {
      inputArea.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
    }
    
    startUnthrottledStream();
  }, 350);
}

function startUnthrottledStream() {
  let lastText = "";

  // Prevents Chrome timer throttling in hidden tabs
  const keepAliveAudio = new Audio();
  
  const streamInterval = setInterval(() => {
    const responses = document.querySelectorAll(".markdown, .agent-turn");
    if (responses.length > 0) {
      const latestResponse = responses[responses.length - 1];
      const answer = latestResponse.innerText.trim();

      if (answer.length > 0 && answer !== lastText) {
        lastText = answer;
        chrome.runtime.sendMessage({ action: "RELAY_ANSWER_TO_QUIZ", answer: answer });
      }

      const isGenerating = document.querySelector('button[aria-label="Stop generating"]') || 
                           document.querySelector('button[data-testid="stop-button"]');

      if (!isGenerating && lastText.length > 0) {
        chrome.runtime.sendMessage({ action: "RELAY_ANSWER_TO_QUIZ", answer: lastText });
        clearInterval(streamInterval);
      }
    }
  }, 150); // High frequency prevents sleep states

  setTimeout(() => clearInterval(streamInterval), 30000);
}

if (window.location.search.includes("q=")) {
  setTimeout(() => {
    const sendBtn = 
      document.querySelector('button[data-testid="send-button"]') || 
      document.querySelector('button[aria-label="Send prompt"]');
    if (sendBtn) sendBtn.click();
    startUnthrottledStream();
  }, 1000);
}