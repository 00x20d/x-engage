document.addEventListener("DOMContentLoaded", async () => {
  const { hasApiKey } = await chrome.storage.local.get("hasApiKey");

  const apiKeySection = document.querySelector(".api-key-section");
  const mainContent = document.querySelector(".main-content");

  if (!hasApiKey) {
    apiKeySection.style.display = "flex";
    mainContent.style.display = "none";
  } else {
    apiKeySection.style.display = "none";
    mainContent.style.display = "flex";
  }

  // Theme selection
  const themeButtons = document.querySelectorAll(".theme-btn");
  themeButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const theme = btn.dataset.theme;
      await chrome.storage.sync.set({ theme });

      // Send message to content script
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "THEME_CHANGED",
          theme,
        });
      }
    });
  });

  // API key handling
  const apiKeyInput = document.getElementById("apiKey");
  const saveKeyBtn = document.getElementById("saveKey");

  saveKeyBtn.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value;
    if (!apiKey) return;

    try {
      console.log("Popup: Starting API key save process");
      saveKeyBtn.disabled = true;
      saveKeyBtn.textContent = "Saving...";

      console.log("Popup: Sending message to background script");
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_API_KEY",
        apiKey,
      });
      console.log("Popup: Received response from background script:", response);

      if (response.success) {
        console.log("Popup: API key saved successfully");
        apiKeySection.style.display = "none";
        mainContent.style.display = "flex";
      } else {
        console.error("Popup: Error from background script:", response.error);
        throw new Error(response.error);
      }
    } catch (error) {
      console.error("Popup: Error in save process:", error);
      alert(`Failed to save API key: ${error.message}`);
    } finally {
      saveKeyBtn.disabled = false;
      saveKeyBtn.textContent = "Save Key";
    }
  });

  // Settings button
  const settingsBtn = document.getElementById("settingsBtn");
  settingsBtn.addEventListener("click", () => {
    chrome.tabs.create({
      url: "settings.html",
    });
  });

  // Load saved data
  chrome.storage.sync.get(["theme", "apiKey"], (data) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
    if (data.theme) {
      document
        .querySelector(`[data-theme="${data.theme}"]`)
        .classList.add("active");
    }
  });
});
