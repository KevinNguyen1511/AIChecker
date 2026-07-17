// =========================================================
// 🔑 PASTE YOUR FREE GEMINI API KEY HERE:
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
// =========================================================

let currentQuizTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToGemini",
    title: "Solve with Gemini",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToGemini" && info.selectionText && tab?.id) {
    currentQuizTabId = tab.id;
    processApiStream(info.selectionText);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        currentQuizTabId = tabs[0].id;

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["content.js"]
        }).then(() => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
            if (response?.text) {
              processApiStream(response.text);
            }
          });
        }).catch(() => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTION" }, (response) => {
            if (response?.text) {
              processApiStream(response.text);
            }
          });
        });
      }
    });
  }
});

async function processApiStream(promptText) {
  if (!currentQuizTabId) return;

  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("YOUR_GEMINI_API_KEY_HERE")) {
    sendAnswerToQuizTab(
      currentQuizTabId,
      "❌ Missing API Key! Please paste your free Gemini key at top of background.js."
    );
    return;
  }

  sendAnswerToQuizTab(currentQuizTabId, "⚡ Thinking...");

  const formattedPrompt = `SYSTEM INSTRUCTION: You are an instant multiple-choice quiz solver. Respond ONLY with the correct multiple-choice option (letter and answer choice) and a 1-sentence explanation. Keep it extremely brief and short.\n\nQUESTION:\n${promptText}`;

  // Direct SSE stream endpoint for Gemini 1.5 Flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: formattedPrompt }] }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      sendAnswerToQuizTab(currentQuizTabId, `❌ Gemini Error (${response.status}): ${errText}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.replace("data: ", ""));
            const textChunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              accumulatedText += textChunk;
              sendAnswerToQuizTab(currentQuizTabId, accumulatedText);
            }
          } catch (e) {
            // Ignore partial JSON frames
          }
        }
      }
    }
  } catch (err) {
    sendAnswerToQuizTab(currentQuizTabId, `❌ Request failed: ${err.message}`);
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