// src/main.ts
import { load } from "https://deno.land/std@0.177.0/dotenv/mod.ts";
import { bot, initializeBot, handleUpdate } from './bot.ts';
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

// Load environment variables from .env file
const result = await load({ export: true });

console.log("Loaded environment variables:", result);

// Check if TELEGRAM_BOT_TOKEN is set
const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
if (!TOKEN) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN is not set in the .env file or environment variables.");
  Deno.exit(1);
}

console.log("TELEGRAM_BOT_TOKEN is set.");

// Initialize the bot with the token
initializeBot(TOKEN);

Deno.serve(async (req) => {
  if (req.method === "GET" && new URL(req.url).pathname === "/ping") {
    return new Response("pong", { status: 200 });
  }

  if (req.method === "POST") {
    const url = new URL(req.url);
    if (url.pathname.slice(1) === bot.token) {
      try {
        return await handleUpdate(req);
      } catch (err) {
        console.error(err);
      }
    }
  }

  // Log some information about the current state
  console.log({
    currentEmotion,
    tsundereLevel,
    context,
    botMemory
  });

  return new Response("Not found", { status: 404 });
});

console.log("Server is running on http://localhost:8000");
