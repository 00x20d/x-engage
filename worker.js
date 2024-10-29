const CLAUDE_MODEL = "claude-3-sonnet-20240229";

async function generateAnthropicResponse(
  tweetContent,
  responseType,
  apiKey,
  writingStyle
) {
  const systemPrompt = `You are a friendly and engaging social media expert. Your task is to generate a ${responseType.toLowerCase()} response to a tweet. 
The response should be:
- Authentic and conversational
- Brief (max 280 characters)
- Relevant to the tweet's content
- Express ${responseType.toLowerCase()} sentiment
- Avoid hashtags or @mentions
- Natural, as if written by a human

Here's a sample of the user's writing style to mimic:
"${writingStyle}"

Analyze this writing style and incorporate similar patterns, vocabulary, and tone in your response.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 150,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Tweet: "${tweetContent}"

Generate a ${responseType.toLowerCase()} response.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export default {
  async fetch(request, env, ctx) {
    console.log("Worker: Received request:", request.method, request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      console.log("Worker: Handling CORS preflight");
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    console.log("Worker: Processing route:", url.pathname);

    // Route handling
    if (url.pathname === "/save-key") {
      if (request.method !== "POST") {
        console.log("Worker: Method not allowed:", request.method);
        return new Response("Method not allowed", { status: 405 });
      }

      try {
        const body = await request.json();
        console.log("Worker: Received request body");

        const { apiKey } = body;
        const userId = request.headers.get("X-User-Id");
        console.log("Worker: Extracted userId and apiKey:", {
          userId: !!userId,
          hasApiKey: !!apiKey,
        });

        if (!apiKey || !userId) {
          console.log("Worker: Missing required fields");
          return new Response("Missing required fields", {
            status: 400,
            headers: corsHeaders,
          });
        }

        console.log("Worker: Storing in KV");
        await env.API_KEYS.put(userId, apiKey);
        console.log("Worker: Successfully stored in KV");

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error("Worker: Error processing request:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to save API key",
            details: error.message,
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Update the /generate-response route
    if (url.pathname === "/generate-response") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: corsHeaders,
        });
      }

      try {
        const { tweetContent, responseType, userId } = await request.json();

        // Get API key from KV
        const apiKey = await env.API_KEY.get(userId);
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error: "NO_API_KEY",
              message: "Please set up your API key in the extension settings",
            }),
            {
              status: 401,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        // Get writing style from KV
        const writingStyle = (await env.WRITING.get(`${userId}_style`)) || "";

        const generatedResponse = await generateAnthropicResponse(
          tweetContent,
          responseType,
          apiKey,
          writingStyle
        );

        return new Response(JSON.stringify({ response: generatedResponse }), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error("Error generating response:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to generate response",
            details: error.message,
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    } else if (url.pathname === "/reset-key") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: corsHeaders,
        });
      }

      try {
        const userId = request.headers.get("X-User-Id");

        if (!userId) {
          return new Response(JSON.stringify({ error: "Missing user ID" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          });
        }

        // Delete the API key from KV
        await env.API_KEYS.delete(userId);

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error("Error resetting API key:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to reset API key",
            details: error.message,
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
      // Add this new endpoint inside the fetch handler, before the final "Not found" response
    } else if (url.pathname === "/save-writing-style") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: corsHeaders,
        });
      }

      try {
        const { writingStyle } = await request.json();
        const userId = request.headers.get("X-User-Id");

        if (!writingStyle || !userId) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        // Save to WRITING KV namespace
        await env.WRITING.put(`${userId}_style`, writingStyle);

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error("Error saving writing style:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to save writing style",
            details: error.message,
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
