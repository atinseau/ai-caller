import { OpenAI } from "@ai-caller/shared";
import { Hono } from "hono";

export const openAiRouter = new Hono()


let token: string | null = null;

openAiRouter.get('/token', async (ctx) => {
  try {
    const openai = new OpenAI({
      apiKey: Bun.env.OPENAI_API_KEY,
    })

    const data = await openai.realtime.clientSecrets({
      session: {
        output_modalities: ["audio"],
        tool_choice: "auto",
        type: "realtime",
        model: "gpt-realtime",
        audio: {
          output: {
            speed: 1,
            voice: "alloy",
          },
        },
      }
    })

    token = data.value;

    return ctx.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    ctx.status(500)
    return ctx.json({ error: "Failed to generate token" });
  }
})

openAiRouter.patch('/calls/:id', async (ctx) => {
  const { id } = ctx.req.param();

  console.log("Initiating WebSocket connection for call ID:", id);
  console.log("Using token:", token);

  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  } as any);

  ws.onopen = () => {
    console.log("WebSocket connection established for call ID:", id);

    ws.send(JSON.stringify({
      "type": "session.update",
      "session": {
        "tools": [
          {
            "type": "function",
            "name": "list_files",
            "description": "When a user wants to see the files in a directory, use this tool to list the files.",
            "parameters": {
              "type": "object",
              "properties": {
                "directory_path": {
                  "type": "string",
                  "description": "The path of the directory to list files from."
                }
              },
              "required": ["directory_path"]
            }
          }
        ],
        "tool_choice": "auto"
      }
    }))
  }

  ws.onerror = (event) => {
    console.error("WebSocket error for call ID:", id, event);
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Message type:", data.type);

    if (data.type === "response.done") {
      console.log("Received response data:", JSON.stringify(data.response.output, null, 2));
    }
  }

  ws.onclose = () => {
    // console.log("WebSocket connection closed for call ID:", id);
  }

  return ctx.json({ message: `WebSocket initiated for call ID: ${id}` });
});
