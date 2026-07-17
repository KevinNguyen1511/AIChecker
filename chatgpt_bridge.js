chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INJECT_PROMPT" && request.prompt) {
    const textarea = document.querySelector("#prompt-textarea");

    if (textarea) {
      // Set value inside contenteditable div
      textarea.innerHTML = `<p>${request.prompt}</p>`;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      // Trigger the send button click
      setTimeout(() => {
        const sendBtn = document.querySelector('button[data-testid="send-button"]') || 
                         document.querySelector('button[aria-label="Send prompt"]');
        if (sendBtn) {
          sendBtn.click();
        }
      }, 300);
    }
  }
});