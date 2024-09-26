// src/bot.ts
import { Bot, webhookCallback, GrammyError, HttpError } from "https://deno.land/x/grammy@v1.20.4/mod.ts";
import { delay } from "https://deno.land/std@0.177.0/async/delay.ts";
import {
  generateResponse,
  updateEmotion,
  adjustTsundereLevel,
  updateContext,
  getWorkingModel,
  getFallbackResponse,
  context,
  botMemory
} from './ai.ts';
import { saveMessages, saveTopicResponse } from './utils/db.ts';

export let bot: Bot;

export function initializeBot(token: string) {
  bot = new Bot(token);
  setupBotHandlers();
}

function setupBotHandlers() {
  bot.command("start", (ctx) => {
    const greeting = "Hah! Kamu pikir bisa jadi pilot EVA? Jangan membuatku tertawa!";
    saveMessages(ctx.chat.id, [{ role: "assistant", content: greeting }]);
    ctx.reply(greeting);
  });

  bot.on("message", async (ctx) => {
    if (ctx.update.message.chat.type !== "private") return;

    bot.api.sendChatAction(ctx.chat.id, "typing");

    try {
      const userMessage = ctx.update.message.text || "";
      updateEmotion(userMessage);
      adjustTsundereLevel(userMessage);
      updateContext(userMessage);

      messageQueue.push({ chatId: ctx.chat.id, userMessage, ctx });
      processQueue();

      if (userMessage.toLowerCase().includes("eva") && !botMemory.mentionedEva.includes(userMessage)) {
        botMemory.mentionedEva.push(userMessage);
      }
      if (userMessage.toLowerCase().includes("pilot") && !botMemory.mentionedPilotingSkills.includes(userMessage)) {
        botMemory.mentionedPilotingSkills.push(userMessage);
      }

      if (context.topic !== "general") {
        await saveTopicResponse(ctx.chat.id, context.topic, userMessage);
      }

      saveMessages(ctx.chat.id, [
        { role: "user", content: userMessage },
      ]);

      console.log({
        chat_id: ctx.chat.id,
        user_name: ctx.update.message.from.username || "",
        full_name: ctx.update.message.from.first_name || "",
        message: userMessage,
        model_used: await getWorkingModel(),
        current_emotion: context.currentEmotion,
        tsundere_level: context.tsundereLevel,
        context: context,
      });
    } catch (error) {
      console.error("Error in message processing:", error);
      ctx.reply(getFallbackResponse()).catch(console.error);
    }
  });
}

const messageQueue: Array<{ chatId: number; userMessage: string; ctx: any }> = [];
let isProcessing = false;

async function streamResponse(ctx: any, chatId: number, userMessage: string) {
  try {
    const response = await generateResponseWithTimeout(chatId, userMessage, 30000);
    await ctx.reply(response);
    console.log(`Response sent for chat ${chatId}`);
  } catch (error) {
    console.error("Error generating streaming response:", error);
    await ctx.reply(getFallbackResponse());
  }
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (messageQueue.length > 0) {
    const { chatId, userMessage, ctx } = messageQueue.shift()!;
    try {
      console.log(`Processing message for chat ${chatId}: ${userMessage}`);
      await streamResponse(ctx, chatId, userMessage);
    } catch (error) {
      console.error(`Error processing message for chat ${chatId}:`, error);
      await sendResponseWithRetry(ctx, getFallbackResponse());
    }
    await delay(1000);
  }

  isProcessing = false;
}

async function sendResponseWithRetry(ctx: any, response: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await ctx.reply(response);
      return;
    } catch (error) {
      if (error instanceof GrammyError || error instanceof HttpError) {
        console.error(`Attempt ${i + 1} failed to send message:`, error);
        if (i === maxRetries - 1) throw error;
        await delay(1000 * Math.pow(2, i));
      } else {
        throw error;
      }
    }
  }
}

async function generateResponseWithTimeout(chatId: number, userMessage: string, timeout: number): Promise<string> {
  const responsePromise = generateResponse(chatId, userMessage);
  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error("Response generation timed out")), timeout)
  );

  try {
    return await Promise.race([responsePromise, timeoutPromise]);
  } catch (error) {
    console.error("Error generating response:", error);
    return getFallbackResponse();
  }
}

export const handleUpdate = (req: Request) => {
  if (!bot) {
    throw new Error("Bot has not been initialized");
  }
  return webhookCallback(bot, "std/http", {
    timeoutMilliseconds: 60000, // Increase to 60 seconds
  })(req);
};
