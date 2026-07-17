// Function to force-click send or simulate Enter key
function triggerAutoSubmit() {
  const checkInput = setInterval(() => {
    const inputArea = 
      document.querySelector("#prompt-textarea") || 
      document.querySelector('div[contenteditable="true"]');

    const sendButton = 
      document.querySelector('button[data-testid="send-button"]') || 
      document.querySelector('button[aria-label="Send prompt"]') ||
      document.querySelector('button[aria-label="Send message"]');

    if (inputArea) {
      inputArea.focus();

      // If send button exists and is clickable, click it
      if (sendButton && !sendButton.disabled) {
        sendButton.click();
        clearInterval(checkInput);
        observeChatGPTResponse();
      } else {
        // Fallback: Dispatch Enter key press directly on input
        const enterEvent = new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        inputArea.dispatchEvent(enterEvent);
      }
    }
  }, 300);

  // Stop checking after 10 seconds to prevent endless loops
  setTimeout(() => clearInterval(checkInput), 10000);
}

// Watch ChatGPT's generated response and relay it back to quiz box
function observeChatGPTResponse() {
  let checkCount = 0;
  const interval = setInterval(() => {
    checkCount++;
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

    if (checkCount > 40) {
      clearInterval(interval);
    }
  }, 800);
}

// Run auto-submit check if URL has prompt query
if (window.location.search.includes("q=")) {
  setTimeout(triggerAutoSubmit, 1000);
}