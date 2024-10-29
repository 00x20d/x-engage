## XEngage - AI-Powered X.com Engagement Assistant

This Chrome extension enhances your X.com experience by providing AI-generated responses to tweets, making engagement faster and more efficient. 

**Features:**

- **One-Click AI Responses:** Generate responses expressing agreement, disagreement, questions, or general positivity with a single click.
- **Customizable Themes:** Personalize the extension's look with different color themes.
- **Personal Writing Style:** Train the AI on your writing style to ensure authentic-sounding responses.
- **Secure API Key Management:** Your Anthropic API key is securely stored using Cloudflare Workers.

**How It Works:**

1. **Install & Setup:**
   - Clone this repo and load it into your chrome-based browser.
   - Enter your Anthropic API key in the extension popup.
   - (Optional) Provide a sample of your writing style in the settings.

2. **Generate Responses:**
   - Compose a new tweet or reply to an existing one.
   - Click on one of the AI response buttons that appear below the compose box.
   - The extension will analyze the tweet and generate a relevant response based on your chosen interaction type.
   - Edit the generated response if needed and post your tweet!

**Inputs:**

- **Anthropic API Key:** Required for AI response generation.
- **Tweet Content:** The extension analyzes the tweet you're replying to for context.
- **Response Type:** Choose between "Agree," "Disagree," "Question," or "Great" to control the sentiment of the generated response.
- **Writing Style (Optional):** A sample of your writing to help the AI mimic your style.

**Outputs:**

- **AI-Generated Response:** A tweet response tailored to the context and your chosen interaction type.
- **Visual Feedback:**  Loading indicators and success/error messages keep you informed.

**Security & Privacy:**

- Your API key is securely stored using Cloudflare Workers and never shared.
- XEngage does not track your browsing activity or store any personal data beyond your API key and optional writing style sample.
