if (!window.chatGptBridgeInitialized) {
  window.chatGptBridgeInitialized = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "INJECT_PROMPT" && request.prompt) {
      injectAndSubmitPrompt(request.prompt);
      sendResponse({ status: "success" });
    }
    return true;
  });
}

function injectAndSubmitPrompt(textPrompt) {
  const textarea = 
    document.querySelector("#prompt-textarea") || 
    document.querySelector('div[contenteditable="true"]');

  if (!textarea) return;

  textarea.focus();

  // Insert prompt natively into ChatGPT text area
  document.execCommand('insertText', false, textPrompt);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));

  // Wait for React state to update before clicking submit
  setTimeout(() => {
    const sendBtn = 
      document.querySelector('button[data-testid="send-button"]') || 
      document.querySelector('button[aria-label="Send prompt"]') ||
      document.querySelector('button[aria-label="Send message"]');

    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
      observeChatGPTResponse();
    } else {
      // Fallback submission event
      textarea.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
      observeChatGPTResponse();
    }
  }, 350);
}

function observeChatGPTResponse() {
  let checkCount = 0;
  const interval = setInterval(() => {
    checkCount++;
    const markdownElements = document.querySelectorAll(".markdown, .agent-turn");
    
    if (markdownElements.length > 0) {
      const lastResponseElement = markdownElements[markdownElements.length - 1];
      const answerText = lastResponseElement.innerText.trim();

      if (answerText.length > 0) {
        chrome.runtime.sendMessage({
          action: "RELAY_ANSWER_TO_QUIZ",
          answer: answerText
        });
      }
    }

    // Stop checking after 25 seconds
    if (checkCount > 50) {
      clearInterval(interval);
    }
  }, 500);
}