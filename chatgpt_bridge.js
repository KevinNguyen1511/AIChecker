// Automatically monitor ChatGPT's response when opened via ?q= query
function observeChatGPTResponse() {
  let checkCount = 0;
  const interval = setInterval(() => {
    checkCount++;
    const responses = document.querySelectorAll(".markdown, .agent-turn");
    
    if (responses.length > 0) {
      const latestResponse = responses[responses.length - 1];
      const answer = latestResponse.innerText.trim();

      if (answer.length > 0) {
        // Send answer back to extension background worker
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

// Run monitor after page finishes loading
if (window.location.search.includes("q=")) {
  setTimeout(observeChatGPTResponse, 1500);
}