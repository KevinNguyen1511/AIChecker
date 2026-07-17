chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SOLVE_QUESTION") {
    sendPromptToChatGPT(request.prompt);
    sendResponse({ status: "PROCESSING" });
  }
});

async function sendPromptToChatGPT(promptText) {
  // Find ChatGPT input textarea
  const textarea = document.querySelector("#prompt-textarea") || document.querySelector("div[contenteditable='true']");
  
  if (!textarea) {
    chrome.runtime.sendMessage({ action: "BRIDGE_ERROR", error: "ChatGPT input box not found. Please open chatgpt.com." });
    return;
  }

  // Set input text
  textarea.focus();
  if (textarea.tagName === "TEXTAREA") {
    textarea.value = promptText;
  } else {
    textarea.innerText = promptText;
  }
  
  textarea.dispatchEvent(new Event("input", { bubbles: true }));

  // Brief delay to allow UI state update
  await new Promise(r => setTimeout(r, 300));

  // Click send button
  const sendButton = document.querySelector("button[data-testid='send-button']") || document.querySelector("button[aria-label='Send prompt']");
  if (sendButton) {
    sendButton.click();
  } else {
    // Fallback Enter key trigger
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
  }

  // Start watching output DOM
  observeChatGPTResponse();
}

function observeChatGPTResponse() {
  const targetNode = document.querySelector("main");
  if (!targetNode) return;

  const observer = new MutationObserver(() => {
    // Select all assistant turns
    const assistantMessages = document.querySelectorAll("[data-message-author-role='assistant']");
    if (assistantMessages.length > 0) {
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      const text = lastMessage.innerText;

      // Broadcast text stream back to quiz tab
      chrome.runtime.sendMessage({ action: "STREAM_UPDATE", text: text });

      // Check if generation completed (Stop button is gone)
      const stopButton = document.querySelector("button[aria-label='Stop streaming']") || document.querySelector("button[data-testid='stop-button']");
      if (!stopButton && text.trim().length > 0) {
        observer.disconnect();
        chrome.runtime.sendMessage({ action: "STREAM_DONE", text: text });
      }
    }
  });

  observer.observe(targetNode, { childList: true, subtree: true });
}