chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INJECT_PROMPT" && request.prompt) {
    injectTextAndSubmit(request.prompt);
    sendResponse({ status: "ok" });
  }
  return true;
});

function injectTextAndSubmit(textPrompt) {
  const inputEl = 
    document.querySelector("#prompt-textarea") || 
    document.querySelector('div[contenteditable="true"]') ||
    document.querySelector('textarea');

  if (!inputEl) return;

  inputEl.focus();

  // Clear existing content and write prompt
  if (inputEl.tagName.toLowerCase() === 'textarea') {
    inputEl.value = textPrompt;
  } else {
    inputEl.innerHTML = `<p>${textPrompt}</p>`;
  }

  // Dispatch events to satisfy React forms
  inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  inputEl.dispatchEvent(new Event("change", { bubbles: true }));

  setTimeout(() => {
    const sendBtn = 
      document.querySelector('button[data-testid="send-button"]') || 
      document.querySelector('button[aria-label="Send prompt"]') ||
      document.querySelector('button[aria-label="Send message"]');

    if (sendBtn) {
      sendBtn.click();
      monitorResponse();
    } else {
      // Fallback submission
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      inputEl.dispatchEvent(enterEvent);
      monitorResponse();
    }
  }, 400);
}

function monitorResponse() {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    const responses = document.querySelectorAll(".markdown, .agent-turn");
    
    if (responses.length > 0) {
      const latestResponse = responses[responses.length - 1];
      const answer = latestResponse.innerText.trim();

      if (answer.length > 0) {
        chrome.runtime.sendMessage({
          action: "RELAY_ANSWER_TO_QUIZ",
          answer: answer
        });
      }
    }

    if (attempts > 40) {
      clearInterval(interval);
    }
  }, 600);
}