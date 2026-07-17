chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INJECT_PROMPT" && request.prompt) {
    const inputField = 
      document.querySelector("#prompt-textarea") || 
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea');

    if (inputField) {
      inputField.focus();
      
      if (inputField.tagName.toLowerCase() === 'textarea') {
        inputField.value = request.prompt;
      } else {
        inputField.innerHTML = `<p>${request.prompt}</p>`;
      }
      
      inputField.dispatchEvent(new Event("input", { bubbles: true }));
      inputField.dispatchEvent(new Event("change", { bubbles: true }));

      // Dispatch automated submission after state update
      setTimeout(() => {
        const sendBtn = 
          document.querySelector('button[data-testid="send-button"]') || 
          document.querySelector('button[aria-label="Send prompt"]') ||
          document.querySelector('button[aria-label="Send message"]');
        
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
        } else {
          // Fallback Enter key trigger
          inputField.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true
          }));
        }
      }, 400);

      sendResponse({ status: "success" });
    }
  }
  return true;
});