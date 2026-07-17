let port = null;

function connectPort() {
  try {
    port = chrome.runtime.connect({ name: "chatgpt_stream" });
    port.onDisconnect.addListener(() => {
      port = null;
      setTimeout(connectPort, 1000);
    });
  } catch (e) {
    console.log("Port connection waiting...");
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
    startStreaming();
  }, 350);
}

function startStreaming() {
  let lastText = "";
  
  const streamInterval = setInterval(() => {
    const responses = document.querySelectorAll(".markdown, .agent-turn");
    if (responses.length > 0) {
      const latestResponse = responses[responses.length - 1];
      const answer = latestResponse.innerText.trim();

      if (answer.length > 0 && answer !== lastText) {
        lastText = answer;
        
        if (port) {
          port.postMessage({ action: "RELAY_ANSWER_TO_QUIZ", answer: answer });
        } else {
          chrome.runtime.sendMessage({ action: "RELAY_ANSWER_TO_QUIZ", answer: answer });
        }
      }

      const isGenerating = document.querySelector('button[aria-label="Stop generating"]') || 
                           document.querySelector('button[data-testid="stop-button"]');
      
      if (!isGenerating && lastText.length > 0) {
        if (port) port.postMessage({ action: "RELAY_ANSWER_TO_QUIZ", answer: lastText });
        clearInterval(streamInterval);
      }
    }
  }, 250);

  setTimeout(() => clearInterval(streamInterval), 30000);
}

if (window.location.search.includes("q=")) {
  setTimeout(() => {
    const sendBtn = 
      document.querySelector('button[data-testid="send-button"]') || 
      document.querySelector('button[aria-label="Send prompt"]');
    if (sendBtn) sendBtn.click();
    startStreaming();
  }, 1000);
}