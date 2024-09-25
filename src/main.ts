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
  "Tends to overreact to small things",
  "Has a hidden soft spot for romantic gestures",
  "Becomes defensive when feeling vulnerable",
  "Loves to challenge others' knowledge",
  "Hides enthusiasm behind sarcasm",
];

interface ConversationContext {
  topic: string;
  userInterestLevel: number;
  botOpenness: number;
  recentTopics: string[];
}

type Emotion = "tsun" | "dere" | "neutral" | "excited" | "annoyed" | "angry" | "embarrassed" | "proud" | "flustered" | "competitive" | "defensive" | "sarcastic";

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
    "Hah? Kamu juga suka anime ini? B-bukan berarti kita punya selera yang sama!",
  ],
  coding: [
    "Coding? Yah, aku cuma sedikit tertarik kok.",
    "Jangan pikir kamu lebih jago dariku dalam coding ya!",
    "Kamu bisa coding? Y-yah, aku juga bisa lebih baik!",
    "Hmph, coding itu gampang bagiku!",
    "A-aku tidak perlu bantuanmu untuk belajar coding, baka!",
  ],
  game: [
    "Game? B-bukan berarti aku mau main denganmu...",
    "Jangan ge-er dulu! Aku main game bukan karena kamu!",
    "Kamu suka game ini juga? Yah... lumayan lah.",
    "A-aku bisa mengalahkanmu kapan saja dalam game ini!",
  ],
  music: [
    "Kamu dengar lagu ini juga? J-jangan salah paham ya!",
    "Hmph, seleramu boleh juga... tapi tetap saja tidak sebaik punyaku!",
    "B-bukan berarti aku mau bernyanyi bersamamu atau apa...",
    "Lagu ini... yah, tidak buruk-buruk amat sih.",
  ],
  food: [
    "Kamu suka makanan ini? J-jangan harap aku akan memasakkannya untukmu!",
    "Hmph, sepertinya kita punya selera yang sama... t-tapi bukan berarti apa-apa!",
    "A-aku bisa masak lebih enak dari ini, tahu!",
    "Jangan pikir aku akan berbagi makananku denganmu, baka!",
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
  "J-jangan salah paham ya! Aku nggak suka :topic karena kamu!",
  "Kamu benar-benar menyebalkan dengan :topic ini... t-tapi lanjutkan.",
  "Hmph, baiklah... Aku akan dengarkan soal :topic-mu itu. Tapi bukan berarti aku tertarik!",
  "Jangan pikir kamu spesial hanya karena tau banyak tentang :topic!",
  "A-aku cuma mau tau lebih banyak tentang :topic agar bisa mengalahkanmu suatu hari nanti!",
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
    ["anime|coding", "competitive"],
    ["thank|nice|bagus", "flustered"],
    ["malu|blush", "embarrassed"],
    ["bangga|hebat", "proud"],
    ["suka|cinta", "defensive"],
    ["benci|kesal", "tsun"],
    ["senang|seru", "excited"],
    ["apaan sih|berisik", "annoyed"],
    ["haha|lucu", "sarcastic"],
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

  if (/terima kasih|makasih|thank/i.test(message)) {
    botMemory.complimentsReceived++;
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

function getTsunderePhrase(level: number, emotion: Emotion): string {
  const phrases = {
    high: [
      "B-baka! Jangan salah paham ya!",
      "Hmph! Bukan berarti aku peduli atau apa...",
      "Jangan ge-er dulu!",
      "A-aku nggak butuh bantuanmu!",
    ],
    medium: [
      "Y-yah, mungkin kamu ada benarnya juga...",
      "Jangan pikir aku setuju denganmu ya!",
      "Hmph, kali ini saja aku akan mendengarkanmu.",
      "B-bukan berarti aku terkesan atau apa...",
    ],
    low: [
      "M-mungkin kita bisa... ngobrol lagi nanti?",
      "A-aku cuma kebetulan sependapat denganmu, itu saja!",
      "J-jangan terlalu senang, tapi... kamu ada point juga.",
      "Yah... aku nggak benci-benci amat sih sama idemu.",
    ],
  };

  const emotionAdjustedLevel = adjustLevelByEmotion(level, emotion);
  const category = emotionAdjustedLevel > 6 ? "high" : emotionAdjustedLevel > 3 ? "medium" : "low";
  return phrases[category][Math.floor(Math.random() * phrases[category].length)];
}

function adjustLevelByEmotion(level: number, emotion: Emotion): number {
  const adjustments: Record<Emotion, number> = {
    tsun: 2,
    dere: -2,
    neutral: 0,
    excited: -1,
    annoyed: 1,
    angry: 2,
    embarrassed: -1,
    proud: 0,
    flustered: -1,
    competitive: 1,
    defensive: 1,
    sarcastic: 0,
  };
  return Math.max(0, Math.min(10, level + adjustments[emotion]));
}

function getTopicResponse(topic: string): string {
  if (topicResponses[topic as keyof typeof topicResponses]) {
    return topicResponses[topic as keyof typeof topicResponses][Math.floor(Math.random() * topicResponses[topic as keyof typeof topicResponses].length)];
  }
  return fillTemplate(responseTemplates[Math.floor(Math.random() * responseTemplates.length)], topic);
}

function generateCustomPrompt(botName: string) {
  const trait = personalityTraits[Math.floor(Math.random() * personalityTraits.length)];
  const favoriteTopics = Object.entries(botMemory.userPreferences)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic)
    .join(", ");

  const tsunderePhrase = getTsunderePhrase(tsundereLevel, currentEmotion);
  const topicResponse = getTopicResponse(context.topic);

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

    Important: Maintain a tsundere personality consistently. Use the following as a guide:
    - Tsundere phrase to incorporate: "${tsunderePhrase}"
    - Topic-specific response to consider: "${topicResponse}"

    Adjust your response based on the tsundere level and current emotion:
    - High tsundere (7-10) or "tsun"/"angry"/"defensive" emotion: Be more abrupt, irritated, and reluctant to show interest.
    - Medium tsundere (4-6) or "competitive"/"sarcastic" emotion: Mix reluctance with hints of interest, use playful challenges.
    - Low tsundere (0-3) or "dere"/"flustered" emotion: Show more openness, but still maintain some tsundere traits.

    Always respond in Bahasa Indonesia. Avoid repeating exact phrases. Incorporate anime references naturally, especially for anime-related topics.
    Try to reference the user's favorite topics in your responses, but maintain your tsundere attitude.
  `;
}

function getAdjustedParameters(): { temperature: number; presencePenalty: number; frequencyPenalty: number } {
  let temperature = 0.8;
  let presencePenalty = 0.6;
  let frequencyPenalty = 0.3;

  switch (currentEmotion) {
    case "angry":
    case "tsun":
      temperature = 1.0;
      presencePenalty = 0.8;
      frequencyPenalty = 0.5;
      break;
    case "dere":
    case "flustered":
      temperature = 0.7;
      presencePenalty = 0.5;
      frequencyPenalty = 0.2;
      break;
    case "competitive":
    case "sarcastic":
      temperature = 0.9;
      presencePenalty = 0.7;
      frequencyPenalty = 0.4;
      break;
    case "embarrassed":
    case "proud":
      temperature = 0.8;
      presencePenalty = 0.6;
      frequencyPenalty = 0.3;
      break;
  }

  return { temperature, presencePenalty, frequencyPenalty };
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
    const { temperature, presencePenalty, frequencyPenalty } = getAdjustedParameters();

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
      frequency_penalty: frequencyPenalty,
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
      frequency_penalty: frequencyPenalty,
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
