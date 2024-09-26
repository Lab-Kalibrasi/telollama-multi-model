// src/main.ts
import { load } from "https://deno.land/std@0.177.0/dotenv/mod.ts";
import { initializeBot, handleUpdate } from './bot.ts';
import {
  generateResponse,
  updateEmotion,
  adjustTsundereLevel,
  updateContext,
  getWorkingModel,
  getFallbackResponse,
  context,
  currentEmotion,
  tsundereLevel,
  botMemory,
  ConversationContext,
  Emotion,
  Memory
} from './ai.ts';

// Load environment variables
await load({ export: true, allowEmptyValues: true });

// Log some environment variables to verify they're loaded correctly
console.log("TELEGRAM_BOT_TOKEN:", Deno.env.get("TELEGRAM_BOT_TOKEN")?.substring(0, 10) + "...");
console.log("OPENROUTER_API_KEY:", Deno.env.get("OPENROUTER_API_KEY")?.substring(0, 10) + "...");
console.log("OPENROUTER_API_KEY_B:", Deno.env.get("OPENROUTER_API_KEY_A")?.substring(0, 10) + "...");
console.log("OPENROUTER_API_KEY_A:", Deno.env.get("OPENROUTER_API_KEY_B")?.substring(0, 10) + "...");
console.log("GOOGLE_AI_API_KEY:", Deno.env.get("GOOGLE_AI_API_KEY")?.substring(0, 10) + "...");
console.log("YOUR_SITE_URL:", Deno.env.get("YOUR_SITE_URL"));
console.log("DATABASE_URL:", Deno.env.get("DATABASE_URL"));

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
if (!TOKEN) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN is not set in the .env file or environment variables.");
  Deno.exit(1);
}

// Initialize the bot
initializeBot(TOKEN);

// Start the server
Deno.serve(async (req) => {
  if (req.method === "GET" && new URL(req.url).pathname === "/ping") {
    return new Response("pong", { status: 200 });
  }

  if (req.method === "POST") {
    const url = new URL(req.url);
    if (url.pathname.slice(1) === TOKEN) {
      try {
        return await handleUpdate(req);
      } catch (err) {
        console.error(err);
      }
    }
  }

  return new Response("Not found", { status: 404 });
});

console.log("Server is running on http://localhost:8000");
