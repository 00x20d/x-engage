document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("writingStyle");
  const charCount = document.querySelector(".char-count");
  const saveButton = document.getElementById("saveWritingStyle");
  const successMessage = document.getElementById("successMessage");

  // Load existing writing style from both storage and KV
  chrome.storage.sync.get(
    ["writingStyle", "userId"],
    ({ writingStyle, userId }) => {
      if (writingStyle) {
        textarea.value = writingStyle;
        updateCharCount();
      }
    }
  );

  function updateCharCount() {
    const count = textarea.value.length;
    charCount.textContent = `${count}/300 characters`;
    saveButton.disabled = count < 200 || count > 300;
  }

  textarea.addEventListener("input", updateCharCount);

  saveButton.addEventListener("click", async () => {
    const writingStyle = textarea.value;

    try {
      // Get userId from storage
      const { userId } = await chrome.storage.sync.get("userId");

      // Save to both sync storage and KV through worker
      await chrome.storage.sync.set({ writingStyle });

      const response = await fetch(
        "https://ai-commenting-tool.djuergens561.workers.dev/save-writing-style",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId,
          },
          body: JSON.stringify({ writingStyle }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save writing style: ${response.statusText}`);
      }

      // Show success message
      successMessage.style.display = "block";
      setTimeout(() => {
        successMessage.style.display = "none";
      }, 3000);

      // After successful save, notify background script
      chrome.runtime.sendMessage({
        type: "API_KEY_UPDATED",
      });
    } catch (error) {
      console.error("Error saving writing style:", error);
      alert("Failed to save writing style. Please try again.");
    }
  });

  // Add API key reset handling
  const resetApiKeyBtn = document.getElementById("resetApiKey");
  const resetMessage = document.getElementById("resetMessage");

  resetApiKeyBtn.addEventListener("click", async () => {
    if (
      !confirm(
        "Are you sure you want to reset your API key? You'll need to enter a new one to continue using the extension."
      )
    ) {
      return;
    }

    try {
      resetApiKeyBtn.disabled = true;
      resetApiKeyBtn.textContent = "Resetting...";

      const { userId } = await chrome.storage.sync.get("userId");

      const response = await fetch(
        "https://ai-commenting-tool.djuergens561.workers.dev/reset-key",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to reset API key: ${response.statusText}`);
      }

      // Clear local storage API key flag
      await chrome.storage.local.set({ hasApiKey: false });

      // Show success message
      resetMessage.style.display = "block";
      setTimeout(() => {
        resetMessage.style.display = "none";
      }, 3000);
    } catch (error) {
      console.error("Error resetting API key:", error);
      alert("Failed to reset API key. Please try again.");
    } finally {
      resetApiKeyBtn.disabled = false;
      resetApiKeyBtn.textContent = "Reset API Key";
    }
  });
});
