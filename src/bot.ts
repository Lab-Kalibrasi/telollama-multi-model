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
  bot.command("start", async (ctx) => {
    const greetings = [
      "Hah! Kamu pikir bisa jadi pilot EVA? Jangan membuatku tertawa!",
      "B-bukan berarti aku senang kamu di sini atau apa... Tapi selamat datang, kurasa.",
      "Oh, jadi kamu mau jadi pilot juga? Hmph! Jangan harap bisa mengalahkanku!",
      "Akhirnya kamu muncul juga. Kupikir kamu terlalu takut untuk mencoba.",
      "Jangan berpikir kita akan berteman hanya karena kamu di sini. Aku tak butuh teman!",
      "Kamu terlambat! Apa kamu selalu selamban ini? Bagaimana bisa jadi pilot handal?",
      "Oh, lihat siapa yang datang. Jangan ganggu aku kalau kamu tidak serius soal ini!",
      "Hmph! Jangan pikir aku akan memujimu hanya karena kamu berani muncul di sini.",
      "Baiklah, ayo kita lihat apa yang bisa kamu lakukan. Tapi jangan berharap aku akan terkesan!",
      "Kamu? Jadi pilot EVA? ...Yah, kurasa kita harus mulai dari suatu tempat.",
    ];

    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    await saveMessages(ctx.chat.id, [{ role: "assistant", content: greeting }]);
    await ctx.reply(greeting);
  });

  bot.on("message", async (ctx) => {
    console.log("Received message from chat ID:", ctx.chat.id);

    if (ctx.update.message.chat.type !== "private") return;

    try {
      await bot.api.sendChatAction(ctx.chat.id, "typing");

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

      await saveMessages(ctx.chat.id, [
        { role: "user", content: userMessage },
      ]);

      const workingModel = await getWorkingModel();
      console.log({
        chat_id: ctx.chat.id,
        user_name: ctx.update.message.from.username || "",
        full_name: ctx.update.message.from.first_name || "",
        message: userMessage,
        model_used: workingModel,
        current_emotion: context.currentEmotion,
        tsundere_level: context.tsundereLevel,
        context: context,
      });
    } catch (error) {
      console.error("Error in message processing:", error);
      await sendResponseWithRetry(ctx, getFallbackResponse());
    }
  });
}

const messageQueue: Array<{ chatId: number; userMessage: string; ctx: any }> = [];
let isProcessing = false;

async function streamResponse(ctx: any, chatId: number, userMessage: string) {
  try {
    const response = await generateResponseWithTimeout(chatId, userMessage, 30000);
    await sendResponseWithRetry(ctx, response);
    console.log(`Response sent for chat ${chatId}`);
  } catch (error) {
    console.error("Error generating streaming response:", error);
    await sendResponseWithRetry(ctx, getFallbackResponse());
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
      if (error instanceof GrammyError) {
        console.error(`Attempt ${i + 1} failed to send message:`, error.description);
        if (error.description === "Bad Request: chat not found") {
          console.error(`Chat not found. Chat ID: ${ctx.chat.id}`);
          return; // Stop retrying if the chat is not found
        }
      } else if (error instanceof HttpError) {
        console.error(`Attempt ${i + 1} failed due to network error:`, error);
      } else {
        console.error(`Attempt ${i + 1} failed due to unexpected error:`, error);
      }

      if (i === maxRetries - 1) throw error;
      await delay(1000 * Math.pow(2, i));
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
