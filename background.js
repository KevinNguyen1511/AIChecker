// Create Right-Click Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "solve-with-gemini",
    title: "Solve with Gemini",
    contexts: ["selection"]
  });
});

// Listen for Right-Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "solve-with-gemini" && info.selectionText) {
    callGeminiAPI(tab.id, info.selectionText);
  }
});

// Listen for Keyboard Shortcut (Alt+S / Option+S)
chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      
      const tabId = tabs[0].id;
      
      // Ask content.js for the highlighted text
      chrome.tabs.sendMessage(tabId, { action: "GET_SELECTION" }, (response) => {
        
        // Prevent crashes if the shortcut is pressed on restricted pages
        if (chrome.runtime.lastError) {
          console.warn("Cannot run on this page. Try on a normal website.");
          return;
        }
        
        if (response && response.text) {
          callGeminiAPI(tabId, response.text);
        } else {
          chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: "⚠️ Please highlight a question first." });
        }
      });
    });
  }
});

async function callGeminiAPI(tabId, promptText) {
  // Show loading state
  chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: "⏳ Thinking..." });

  // Get API key from storage
  const data = await chrome.storage.local.get("geminiKey");
  if (!data.geminiKey) {
    chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: "❌ Missing API Key. Right-click the extension icon and click 'Options' to add it." });
    return;
  }

  // Your new strict, concise instructions
  const systemInstruction = "Give short answers only. In case of multiple choice, give the direct correct answer or letter immediately, followed by a super short 1-sentence explanation max.";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${data.geminiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\nQuestion: ${promptText}` }] }]
      })
    });

    const json = await response.json();
    
    if (json.error) throw new Error(json.error.message);
    
    const answer = json.candidates[0].content.parts[0].text;
    chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: answer });

  } catch (error) {
    chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: `❌ Error: ${error.message}` });
  }
}