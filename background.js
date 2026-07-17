let currentQuizTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToChatGPT",
    title: "Solve with ChatGPT",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToChatGPT" && info.selectionText && tab?.id) {
    currentQuizTabId = tab.id;
    processDirectStream(info.selectionText);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        currentQuizTabId = tabs[0].id;

        // Ensure content script is ready
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["content.js"]
        }).then(() => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
            if (response?.text) {
              processDirectStream(response.text);
            }
          });
        }).catch(() => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
            if (response?.text) {
              processDirectStream(response.text);
            }
          });
        });
      }
    });
  }
});

// Helper to get active session token from chatgpt.com
async function getAccessToken() {
  try {
    const response = await fetch("https://chatgpt.com/api/auth/session");
    if (!response.ok) return null;
    const data = await response.json();
    return data.accessToken || null;
  } catch (e) {
    return null;
  }
}

async function processDirectStream(promptText) {
  if (!currentQuizTabId) return;

  sendAnswerToQuizTab(currentQuizTabId, "⚡ Connecting to ChatGPT stream...");

  const accessToken = await getAccessToken();

  if (!accessToken) {
    sendAnswerToQuizTab(
      currentQuizTabId,
      "❌ Not logged in! Please open chatgpt.com in a new tab, log in, and try again."
    );
    return;
  }

  const formattedPrompt = `SYSTEM INSTRUCTION: You are an instant multiple-choice quiz solver. Respond ONLY with the correct multiple-choice option (letter and answer choice) and a 1-sentence explanation. Keep it extremely brief and short.\n\nQUESTION:\n${promptText}`;

  try {
    const response = await fetch("https://chatgpt.com/backend-api/conversation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        action: "next",
        messages: [
          {
            id: crypto.randomUUID(),
            author: { role: "user" },
            content: { content_type: "text", parts: [formattedPrompt] }
          }
        ],
        model: "auto",
        timezone_offset_min: -480
      })
    });

    if (!response.ok) {
      sendAnswerToQuizTab(currentQuizTabId, `❌ ChatGPT Error: ${response.statusText}`);
      return;
    }

    // Read response network stream in real-time
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedAnswer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ") && !line.includes("[DONE]")) {
          try {
            const parsed = JSON.parse(line.replace("data: ", ""));
            const parts = parsed?.message?.content?.parts;
            if (parts && parts.length > 0) {
              accumulatedAnswer = parts[0];
              sendAnswerToQuizTab(currentQuizTabId, accumulatedAnswer);
            }
          } catch (e) {
            // Ignore incomplete JSON stream chunks
          }
        }
      }
    }
  } catch (err) {
    sendAnswerToQuizTab(currentQuizTabId, `❌ Stream failed: ${err.message}`);
  }
}

function sendAnswerToQuizTab(tabId, answerText) {
  chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: answerText }, (response) => {
    if (chrome.runtime.lastError || !response) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"]
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: answerText });
        }, 100);
      }).catch(() => {});
    }
  });
}