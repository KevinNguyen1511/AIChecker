chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SOLVE_QUESTION") {
    sendPromptToChatGPT(request.prompt);
    sendResponse({ status: "PROCESSING" });
  }
});

async function sendPromptToChatGPT(promptText) {
  // Find ChatGPT input element (handles both standard and ProseMirror inputs)
  const inputEl = document.querySelector("#prompt-textarea") || 
                  document.querySelector("div[contenteditable='true']") || 
                  document.querySelector("textarea");

  if (!inputEl) {
    chrome.runtime.sendMessage({ action: "BRIDGE_ERROR", error: "ChatGPT input box not found. Make sure chatgpt.com is loaded." });
    return;
  }

  inputEl.focus();

  // Inject text cleanly into standard textareas or rich-text divs
  if (inputEl.tagName === "TEXTAREA") {
    inputEl.value = promptText;
  } else {
    // Clear existing inner HTML and append text block
    inputEl.innerHTML = "";
    const p = document.createElement("p");
    p.innerText = promptText;
    inputEl.appendChild(p);
  }

  // Trigger input events so React registers the text state change
  inputEl.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  inputEl.dispatchEvent(new Event("change", { bubbles: true }));

  await new Promise(r => setTimeout(r, 400));

  // Find send button using multi-selector search
  const sendButton = document.querySelector("button[data-testid='send-button']") || 
                     document.querySelector("button[aria-label*='Send']") || 
                     document.querySelector("button[title*='Send']");

  if (sendButton && !sendButton.disabled) {
    sendButton.click();
  } else {
    // Fallback key press trigger
    inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
  }

  observeChatGPTResponse();
}

function observeChatGPTResponse() {
  const targetNode = document.querySelector("main") || document.body;
  if (!targetNode) return;

  const observer = new MutationObserver(() => {
    const assistantMessages = document.querySelectorAll("[data-message-author-role='assistant']");
    if (assistantMessages.length > 0) {
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      const text = lastMessage.innerText;

      chrome.runtime.sendMessage({ action: "STREAM_UPDATE", text: text });

      // Detect generation end (Stop button replaced by send button)
      const stopButton = document.querySelector("button[aria-label*='Stop']") || document.querySelector("button[data-testid='stop-button']");
      if (!stopButton && text.trim().length > 0) {
        observer.disconnect();
        chrome.runtime.sendMessage({ action: "STREAM_DONE", text: text });
      }
    }
  });

  observer.observe(targetNode, { childList: true, subtree: true });
}