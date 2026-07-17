chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INJECT_PROMPT" && request.prompt) {
    injectAndSubmitPrompt(request.prompt);
    sendResponse({ status: "processing" });
  }
  return true;
});

function injectAndSubmitPrompt(textPrompt) {
  const textarea = 
    document.querySelector("#prompt-textarea") || 
    document.querySelector('div[contenteditable="true"]');

  if (!textarea) return;

  textarea.focus();
  
  // 1. Force React to recognize input via ExecCommand
  document.execCommand('insertText', false, textPrompt);
  
  // 2. Dispatch native input/change events
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));

  // 3. Wait for Send button to enable and click it
  setTimeout(() => {
    const sendBtn = 
      document.querySelector('button[data-testid="send-button"]') || 
      document.querySelector('button[aria-label="Send prompt"]') ||
      document.querySelector('button[aria-label="Send message"]');

    if (sendBtn) {
      sendBtn.click();
      observeChatGPTResponse();
    }
  }, 300);
}

// Watch ChatGPT stream the response and relay it back to your quiz tab
function observeChatGPTResponse() {
  const observer = new MutationObserver(() => {
    const markdownElements = document.querySelectorAll(".markdown, .agent-turn");
    if (markdownElements.length > 0) {
      const lastResponseElement = markdownElements[markdownElements.length - 1];
      const answerText = lastResponseElement.innerText.trim();

      // Send answer text back to extension background script
      chrome.runtime.sendMessage({
        action: "RELAY_ANSWER_TO_QUIZ",
        answer: answerText
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Disconnect observer after 20 seconds to save system memory
  setTimeout(() => observer.disconnect(), 20000);
}