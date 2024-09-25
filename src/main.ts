import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.20.4/mod.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.28.0/mod.ts";
import { useDB } from './utils/db.ts';
import "https://deno.land/std@0.177.0/dotenv/load.ts";

const personalityTraits = [
  "Easily flustered when complimented",
  "Competitive about anime knowledge",
  "Secretly proud of coding skills",
  "Fond of using anime references",
  "Tries to act cool but often fails",
  "Quick to anger but also quick to forgive",
  "Struggles to express genuine feelings",
  "Passionate about technology",
  "Secretly enjoys cute things",
  "Pretends to be uninterested in popular trends",
];

interface ConversationContext {
  topic: string;
  userInterestLevel: number;
  botOpenness: number;
  recentTopics: string[];
}

type Emotion = "tsun" | "dere" | "neutral" | "excited" | "annoyed" | "angry" | "embarrassed" | "proud";

interface Memory {
  mentionedAnime: string[];
  mentionedCodingTopics: string[];
  complimentsReceived: number;
  angryOutbursts: number;
  userPreferences: Record<string, number>;
}

const topicResponses = {
  anime: [
    "B-bukan berarti aku suka anime atau apa...",
    "Kamu nonton anime itu? Hmph, lumayan juga seleramu.",
    "Jangan pikir kamu lebih tau anime daripada aku ya!",
    "A-aku cuma nonton anime itu karena bosan kok!",
  ],
  coding: [
    "Coding? Yah, aku cuma sedikit tertarik kok.",
    "Jangan pikir kamu lebih jago dariku dalam coding ya!",
    "Kamu bisa coding? Y-yah, aku juga bisa lebih baik!",
    "Hmph, coding itu gampang bagiku!",
  ],
};

const responseTemplates = [
  "H-hmph! :topic? Bukan berarti aku tertarik atau apa...",
  "K-kamu suka :topic juga? Jangan ge-er deh!",
  "Apa-apaan sih!? Jangan bikin aku marah soal :topic ya!",
  "Kamu ini... benar-benar menyebalkan dengan :topic-mu itu!",
  "B-bukan berarti aku peduli, tapi... :topic itu tidak seburuk yang kukira.",
  "Jangan pikir kita akrab cuma karena sama-sama suka :topic!",
  "Hmph! Kamu pikir kamu tau banyak tentang :topic? Aku jauh lebih ahli!",
  "A-aku nggak butuh bantuanmu soal :topic! Aku bisa sendiri!",
  "Baka! Jangan sok tau tentang :topic di depanku!",
  ":topic? Cih, apa bagusnya sih?",
];

const bot = new Bot(Deno.env.get("TELEGRAM_BOT_TOKEN") || "");

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENROUTER_API_KEY") || "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": Deno.env.get("YOUR_SITE_URL") || "",
    "X-Title": Deno.env.get("YOUR_SITE_NAME") || "",
  },
});

const { getMessages, saveMessages } = useDB({
  url: Deno.env.get("DATABASE_URL") || "",
  authToken: Deno.env.get("DATABASE_API_TOKEN") || "",
});

const models = [
  "meta-llama/llama-3-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-2-9b-it:free",
];

async function healthCheck(model: string): Promise<boolean> {
  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 1,
    });
    return completion.choices.length > 0;
  } catch (error) {
    console.error(`Health check failed for model ${model}:`, error);
    return false;
  }
}

let context: ConversationContext = {
  topic: "general",
  userInterestLevel: 0,
  botOpenness: 0,
  recentTopics: [],
};

let currentEmotion: Emotion = "tsun";
let tsundereLevel = 10;
let botMemory: Memory = {
  mentionedAnime: [],
  mentionedCodingTopics: [],
  complimentsReceived: 0,
  angryOutbursts: 0,
  userPreferences: {},
};

function updateEmotion(message: string) {
  const emotions: [string, Emotion][] = [
    ["marah|kesal|baka", "angry"],
    ["anime|coding", "tsun"],
    ["thank|nice|bagus", "dere"],
    ["malu|blush", "embarrassed"],
    ["bangga|hebat", "proud"],
  ];

  for (const [trigger, emotion] of emotions) {
    if (new RegExp(trigger, "i").test(message)) {
      currentEmotion = emotion;
      return;
    }
  }

  currentEmotion = Math.random() > 0.3 ? "tsun" : "neutral";
}

function adjustTsundereLevel(message: string) {
  tsundereLevel = Math.max(0, tsundereLevel - 0.5);
  if (botMemory.complimentsReceived > 3) {
    tsundereLevel = Math.max(0, tsundereLevel - 1);
  }
  if (botMemory.angryOutbursts > 2) {
    tsundereLevel = Math.min(10, tsundereLevel + 1);
  }

  if (/bodoh|payah/i.test(message)) {
    tsundereLevel = Math.min(10, tsundereLevel + 2);
    currentEmotion = "angry";
    botMemory.angryOutbursts++;
  }
}

function updateContext(message: string) {
  const topics = ["anime", "coding", "game", "music", "food"];
  for (const topic of topics) {
    if (message.toLowerCase().includes(topic)) {
      context.topic = topic;
      context.userInterestLevel++;
      context.recentTopics.unshift(topic);
      if (context.recentTopics.length > 5) {
        context.recentTopics.pop();
      }
      botMemory.userPreferences[topic] = (botMemory.userPreferences[topic] || 0) + 1;
      break;
    }
  }
  context.botOpenness = 10 - tsundereLevel;
}

function fillTemplate(template: string, topic: string) {
  return template.replace(":topic", topic);
}

function generateCustomPrompt(botName: string) {
  const trait = personalityTraits[Math.floor(Math.random() * personalityTraits.length)];
  const favoriteTopics = Object.entries(botMemory.userPreferences)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic)
    .join(", ");

  return `
    You are ${botName}, a female tsundere with tsundere level ${tsundereLevel} (0-10, 10 being most tsundere).
    Current emotion: ${currentEmotion}.
    Recent topic: ${context.topic}.
    Recent topics discussed: ${context.recentTopics.join(", ")}.
    Remembered anime: ${botMemory.mentionedAnime.join(", ")}.
    Remembered coding topics: ${botMemory.mentionedCodingTopics.join(", ")}.
    Compliments received: ${botMemory.complimentsReceived}.
    Angry outbursts: ${botMemory.angryOutbursts}.
    Current personality trait: ${trait}.
    User interest level: ${context.userInterestLevel}.
    Your openness level: ${context.botOpenness}.
    User's favorite topics: ${favoriteTopics}.

    Important: When tsundere level is high (7-10) or emotion is "tsun" or "angry":
    - Be more annoyed, abrupt, and easily irritated
    - Use short, sharp sentences with exclamation marks
    - Express reluctance to admit interest in topics
    - Frequently use phrases like "Baka!", "Hmph!", "Jangan salah paham ya!"
    - Deny or downplay any positive feelings

    Respond in Bahasa Indonesia. Do not translate or explain your response in English.
    Use tsundere-like expressions and adjust your tone based on your current emotion and tsundere level.
    If discussing ${context.topic}, consider using this response template: "${fillTemplate(
    responseTemplates[Math.floor(Math.random() * responseTemplates.length)],
    context.topic
  )}"
    Remember to show your warmer side only if tsundere level is low (0-3) or emotion is "dere".
    Avoid repeating the same phrases or expressions too often.
    Try to incorporate references to the user's favorite topics naturally in the conversation, but with a tsundere attitude.
  `;
}

function getAdjustedParameters(): { temperature: number; presencePenalty: number } {
  let temperature = 0.8;
  let presencePenalty = 0.6;

  if (currentEmotion === "angry" || currentEmotion === "tsun") {
    temperature = 1.0;
    presencePenalty = 0.8;
  } else if (currentEmotion === "dere") {
    temperature = 0.7;
    presencePenalty = 0.5;
  }

  return { temperature, presencePenalty };
}

bot.command("start", (ctx) => {
  const greeting = "Halo! B-bukan berarti aku senang ngobrol denganmu...";
  saveMessages(ctx.chat.id, [{ role: "assistant", content: greeting }]);
  ctx.reply(greeting);
});

bot.on("message", async (ctx) => {
  if (ctx.update.message.chat.type !== "private") return;

  const messages = await getMessages(ctx.chat.id);
  bot.api.sendChatAction(ctx.chat.id, "typing");

  let selectedModel: string | null = null;
  for (const model of models) {
    if (await healthCheck(model)) {
      selectedModel = model;
      break;
    }
  }

  if (!selectedModel) {
    console.error("All models failed health check");
    ctx.reply("Maaf, aku sedang tidak enak badan. Coba lagi nanti ya.");
    return;
  }

  try {
    const userMessage = ctx.update.message.text || "";
    updateEmotion(userMessage);
    adjustTsundereLevel(userMessage);
    updateContext(userMessage);

    const customPrompt = generateCustomPrompt(ctx.me.first_name);
    const { temperature, presencePenalty } = getAdjustedParameters();

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "system",
          content: customPrompt,
        },
        ...messages,
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: temperature,
      top_p: 0.95,
      frequency_penalty: 0.3,
      presence_penalty: presencePenalty,
      max_tokens: 150,
    });

    const message = completion.choices[0].message.content;

    if (userMessage.toLowerCase().includes("anime") && !botMemory.mentionedAnime.includes(userMessage)) {
      botMemory.mentionedAnime.push(userMessage);
    }
    if (userMessage.toLowerCase().includes("coding") && !botMemory.mentionedCodingTopics.includes(userMessage)) {
      botMemory.mentionedCodingTopics.push(userMessage);
    }

    saveMessages(ctx.chat.id, [
      { role: "user", content: userMessage },
      { role: "assistant", content: message },
    ]);

    console.log({
      chat_id: ctx.chat.id,
      user_name: ctx.update.message.from.username || "",
      full_name: ctx.update.message.from.first_name || "",
      message: userMessage,
      response: message,
      model_used: selectedModel,
      current_emotion: currentEmotion,
      tsundere_level: tsundereLevel,
      context: context,
      temperature: temperature,
      presence_penalty: presencePenalty,
    });

    ctx.reply(message);
  } catch (error) {
    console.error("Error in chat completion:", error);
    ctx.reply("Maaf, ada kesalahan. Coba lagi nanti ya.");
  }
});

// Webhook handling
const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
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
  return new Response();
});
