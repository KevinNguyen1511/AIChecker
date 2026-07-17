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
    setupMutationObserver();
  }, 350);
}

// Uses DOM MutationObserver instead of setInterval to bypass background tab throttling
function setupMutationObserver() {
  let lastText = "";

  const observer = new MutationObserver(() => {
    const responses = document.querySelectorAll(".markdown, .agent-turn");
    if (responses.length > 0) {
      const latestResponse = responses[responses.length - 1];
      const answer = latestResponse.innerText.trim();

      if (answer.length > 0 && answer !== lastText) {
        lastText = answer;
        chrome.runtime.sendMessage({
          action: "RELAY_ANSWER_TO_QUIZ",
          answer: answer
        });
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Disconnect observer after 25 seconds to prevent memory leaks
  setTimeout(() => observer.disconnect(), 25000);
}

// Handles initial open via query string
if (window.location.search.includes("q=")) {
  setTimeout(() => {
    const sendBtn = 
      document.querySelector('button[data-testid="send-button"]') || 
      document.querySelector('button[aria-label="Send prompt"]');
    if (sendBtn) sendBtn.click();
    setupMutationObserver();
  }, 1000);
}