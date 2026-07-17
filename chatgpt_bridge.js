let port = null;

function connectPort() {
  try {
    port = chrome.runtime.connect({ name: "chatgpt_stream" });
    port.onDisconnect.addListener(() => {
      port = null;
      setTimeout(connectPort, 1000);
    });
  } catch (e) {
    setTimeout(connectPort, 1000);
  }
}

connectPort();

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
    
    // Start tracking real-time DOM changes
    observeLiveStream();
  }, 350);
}

function observeLiveStream() {
  let lastText = "";

  const sendUpdate = (text) => {
    if (text && text !== lastText) {
      lastText = text;
      const messageData = { action: "RELAY_ANSWER_TO_QUIZ", answer: text };
      if (port) {
        try {
          port.postMessage(messageData);
        } catch (e) {
          chrome.runtime.sendMessage(messageData);
        }
      } else {
        chrome.runtime.sendMessage(messageData);
      }
    }
  };

  // Watch ChatGPT DOM for streaming updates
  const observer = new MutationObserver(() => {
    const responses = document.querySelectorAll(".markdown, .agent-turn");
    if (responses.length > 0) {
      const latestResponse = responses[responses.length - 1];
      const text = latestResponse.innerText.trim();
      sendUpdate(text);
    }
  });

  const targetNode = document.querySelector("main") || document.body;
  observer.observe(targetNode, { childList: true, subtree: true, characterData: true });

  // Fallback check to ensure observer doesn't miss the end of generation
  const pollInterval = setInterval(() => {
    const responses = document.querySelectorAll(".markdown, .agent-turn");
    if (responses.length > 0) {
      const latestResponse = responses[responses.length - 1];
      sendUpdate(latestResponse.innerText.trim());
    }

    const isGenerating = document.querySelector('button[aria-label="Stop generating"]') || 
                         document.querySelector('button[data-testid="stop-button"]');

    if (!isGenerating && lastText.length > 0) {
      observer.disconnect();
      clearInterval(pollInterval);
    }
  }, 300);

  // Safety cleanup timeout after 45 seconds
  setTimeout(() => {
    observer.disconnect();
    clearInterval(pollInterval);
  }, 45000);
}

// Handle query params when ChatGPT opens in a new tab
if (window.location.search.includes("q=")) {
  setTimeout(() => {
    const sendBtn = 
      document.querySelector('button[data-testid="send-button"]') || 
      document.querySelector('button[aria-label="Send prompt"]');
    if (sendBtn) sendBtn.click();
    observeLiveStream();
  }, 1000);
}