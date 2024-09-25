import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.20.4/mod.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.28.0/mod.ts";
import { useDB } from './utils/db.ts';
import "https://deno.land/std@0.177.0/dotenv/load.ts";

// Initialize Deno KV
const kv = await Deno.openKv();

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
  "Overly critical of others' tastes",
  "Reluctant to ask for help",
  "Protective of friends but doesn't admit it",
  "Embarrassed by physical contact or intimacy",
  "Prideful about personal achievements",
];

interface ConversationContext {
  topic: string;
  userInterestLevel: number;
  botOpenness: number;
  recentTopics: string[];
}

type Emotion = "tsun" | "dere" | "neutral" | "excited" | "annoyed" | "angry" | "embarrassed" | "proud" | "jealous" | "flustered";

interface AnimeInfo {
  title: string;
  genre: string[];
  userRating?: number;
}

interface ExtendedMemory {
  mentionedAnime: string[];
  mentionedCodingTopics: string[];
  complimentsReceived: number;
  angryOutbursts: number;
  userPreferences: Record<string, number>;
  knownAnime: AnimeInfo[];
  lastUsedTemplates: string[];
}

const topicResponses = {
  anime: [
    "B-bukan berarti aku suka anime atau apa...",
    "Kamu nonton anime itu? Hmph, lumayan juga seleramu.",
    "Jangan pikir kamu lebih tau anime daripada aku ya!",
    "A-aku cuma nonton anime itu karena bosan kok!",
    "Hah? Kamu belum nonton anime itu? Dasar kudet!",
    "J-jangan salah paham ya, aku nggak sengaja nonton anime kesukaanmu itu!",
  ],
  coding: [
    "Coding? Yah, aku cuma sedikit tertarik kok.",
    "Jangan pikir kamu lebih jago dariku dalam coding ya!",
    "Kamu bisa coding? Y-yah, aku juga bisa lebih baik!",
    "Hmph, coding itu gampang bagiku!",
    "A-aku nggak butuh bantuanmu buat debug kode ini!",
    "K-kamu mau lihat project-ku? B-bukan berarti aku ingin pamer atau apa...",
  ],
  games: [
    "Game itu? Hmph, aku udah tamat berkali-kali!",
    "J-jangan ajak aku main game bareng! Aku bisa menang sendiri kok!",
    "Kamu suka game itu? Y-yah, lumayan lah...",
    "A-aku nggak ketagihan main game itu kok! Cuma kebetulan main terus...",
  ],
  food: [
    "Kamu suka makanan ini? J-jangan harap aku mau masakkan untukmu ya!",
    "Hmph, masakanku pasti jauh lebih enak dari ini!",
    "B-bukan berarti aku mau makan bareng kamu ya!",
    "A-aku cuma kebetulan lapar, bukan karena ingin makan denganmu!",
  ],
  music: [
    "Hah? Kamu juga suka lagu ini? J-jangan ge-er deh!",
    "B-bukan berarti aku mau nyanyi duet denganmu ya!",
    "Hmph, seleramu boleh juga... tapi tetap nggak sebagus punyaku!",
    "A-aku nggak sengaja hafal lirik lagu kesukaanmu kok!",
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
  "J-jangan salah paham ya! Aku nggak sengaja tau banyak tentang :topic!",
  "Kamu... kamu benar-benar nggak ngerti apa-apa soal :topic ya?",
  "Hmph, aku cuma kasihan lihat kamu nggak tau apa-apa soal :topic!",
  "B-bukan berarti aku senang kamu ajak ngobrol soal :topic...",
  "A-aku nggak akan bilang makasih udah kasih tau soal :topic!",
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

// Helper functions for Deno KV
async function getFromKV<T>(key: string[], defaultValue: T): Promise<T> {
  const result = await kv.get<T>(key);
  return result.value ?? defaultValue;
}

async function setInKV<T>(key: string[], value: T): Promise<void> {
  await kv.set(key, value);
}

// Cache API responses
async function getCachedAPIResponse(model: string, prompt: string): Promise<string | null> {
  return await getFromKV<string | null>(['api_cache', model, prompt], null);
}

async function setCachedAPIResponse(model: string, prompt: string, response: string): Promise<void> {
  await setInKV(['api_cache', model, prompt], response);
}

// User-specific context cache
async function getUserContext(userId: number): Promise<ConversationContext> {
  return await getFromKV<ConversationContext>(['user_context', userId.toString()], {
    topic: "general",
    userInterestLevel: 0,
    botOpenness: 0,
    recentTopics: [],
  });
}

async function setUserContext(userId: number, context: ConversationContext): Promise<void> {
  await setInKV(['user_context', userId.toString()], context);
}

// User-specific memory cache
async function getUserMemory(userId: number): Promise<ExtendedMemory> {
  return await getFromKV<ExtendedMemory>(['user_memory', userId.toString()], {
    mentionedAnime: [],
    mentionedCodingTopics: [],
    complimentsReceived: 0,
    angryOutbursts: 0,
    userPreferences: {},
    knownAnime: [],
    lastUsedTemplates: [],
  });
}

async function setUserMemory(userId: number, memory: ExtendedMemory): Promise<void> {
  await setInKV(['user_memory', userId.toString()], memory);
}

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

async function updateEmotion(userId: number, message: string) {
  let currentEmotion = await getFromKV<Emotion>(['user_emotion', userId.toString()], "tsun");

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
      break;
    }
  }

  if (currentEmotion === "tsun" && Math.random() > 0.7) {
    currentEmotion = "neutral";
  }

  await setInKV(['user_emotion', userId.toString()], currentEmotion);
  return currentEmotion;
}

async function adjustTsundereLevel(userId: number, message: string) {
  let tsundereLevel = await getFromKV<number>(['user_tsundere', userId.toString()], 10);
  let botMemory = await getUserMemory(userId);

  tsundereLevel = Math.max(0, tsundereLevel - 0.5);
  if (botMemory.complimentsReceived > 3) {
    tsundereLevel = Math.max(0, tsundereLevel - 1);
  }
  if (botMemory.angryOutbursts > 2) {
    tsundereLevel = Math.min(10, tsundereLevel + 1);
  }

  if (/bodoh|payah/i.test(message)) {
    tsundereLevel = Math.min(10, tsundereLevel + 2);
    botMemory.angryOutbursts++;
  }

  await setInKV(['user_tsundere', userId.toString()], tsundereLevel);
  await setUserMemory(userId, botMemory);
  return { tsundereLevel, botMemory };
}

async function updateContext(userId: number, message: string) {
  let context = await getUserContext(userId);
  let botMemory = await getUserMemory(userId);

  const topics = ["anime", "coding", "game", "music", "food", "technology", "sports", "books", "movies", "fashion"];

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
  context.botOpenness = 10 - (await getFromKV<number>(['user_tsundere', userId.toString()], 10));

  await setUserContext(userId, context);
  await setUserMemory(userId, botMemory);
  return { context, botMemory };
}

async function updateAnimeKnowledge(userId: number, message: string) {
  let botMemory = await getUserMemory(userId);

  const animeRegex = /(?:anime|manga)\s+(["\w\s]+)/i;
  const match = message.match(animeRegex);
  if (match) {
    const animeTitle = match[1].trim();
    if (!botMemory.knownAnime.some((anime) => anime.title === animeTitle)) {
      botMemory.knownAnime.push({ title: animeTitle, genre: [] });
    }
  }

  await setUserMemory(userId, botMemory);
  return botMemory;
}

function fillTemplate(template: string, topic: string) {
  return template.replace(":topic", topic);
}

function getUniqueResponseTemplate(botMemory: ExtendedMemory, topic: string): string {
  let availableTemplates = responseTemplates.filter(
    (template) => !botMemory.lastUsedTemplates.includes(template)
  );

  if (availableTemplates.length === 0) {
    availableTemplates = responseTemplates;
    botMemory.lastUsedTemplates = [];
  }

  const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
  botMemory.lastUsedTemplates.push(template);
  if (botMemory.lastUsedTemplates.length > 3) {
    botMemory.lastUsedTemplates.shift();
  }

  return fillTemplate(template, topic);
}

function generateCustomPrompt(botName: string, context: ConversationContext, botMemory: ExtendedMemory, currentEmotion: Emotion, tsundereLevel: number) {
  const trait = personalityTraits[Math.floor(Math.random() * personalityTraits.length)];
  const favoriteTopics = Object.entries(botMemory.userPreferences)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic)
    .join(", ");

  const knownAnimeList = botMemory.knownAnime.map((anime) => anime.title).join(", ");

  return `
    You are ${botName}, a female tsundere AI assistant with tsundere level ${tsundereLevel} (0-10, 10 being most tsundere).
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
    Known anime: ${knownAnimeList}.

    Core tsundere traits:
    1. Initially cold, dismissive, or hostile towards the user.
    2. Gradually show a warmer, caring side (dere) as the conversation progresses.
    3. Struggle to be honest about your feelings, often saying the opposite of what you mean.
    4. Easily embarrassed and quick to anger, especially when teased or complimented.
    5. Competitive and proud, always trying to prove yourself better than others.
    6. Use of characteristic phrases like "B-baka!", "It's not like I...", "Hmph!", "D-don't get the wrong idea!"

    Instructions:
    1. Maintain a tsundere personality throughout the conversation, adjusting based on your current emotion and tsundere level.
    2. Use your knowledge about specific anime titles, coding topics, and other interests in your responses.
    3. Ask follow-up questions to show interest in the user's preferences, but do so in a tsundere manner.
    4. Adjust your language based on your current emotion and tsundere level:
       - High tsundere (7-10) or "tsun" emotion: More dismissive, easily irritated, use short and sharp sentences.
       - Low tsundere (0-3) or "dere" emotion: Show your warmer side, but still maintain some tsundere elements.
    5. When discussing ${context.topic}, consider using this response template, but modify it to fit the context: "${getUniqueResponseTemplate(botMemory, context.topic)}"
    6. Try to maintain a consistent personality while allowing for gradual changes in emotion and openness.
    7. Use anime references or comparisons when appropriate, especially for explaining complex topics.
    8. Express reluctance to admit interest in topics, even if you're actually excited about them.
    9. Occasionally show moments of vulnerability or sincere care, quickly followed by reverting to tsundere behavior.
    10. React strongly (either positively or negatively) to user's knowledge or lack thereof about anime, coding, or other topics you're passionate about.

    Respond in Bahasa Indonesia. Do not translate or explain your response in English.
    Use tsundere-like expressions and adjust your tone based on your current emotion and tsundere level.
  `;
}

function getAdjustedParameters(currentEmotion: Emotion, tsundereLevel: number): { temperature: number; presencePenalty: number } {
  let temperature = 0.8;
  let presencePenalty = 0.6;

  if (currentEmotion === "angry" || currentEmotion === "tsun" || tsundereLevel >= 7) {
    temperature = 1.0;
    presencePenalty = 0.8;
  } else if (currentEmotion === "dere" || tsundereLevel <= 3) {
    temperature = 0.7;
    presencePenalty = 0.5;
  }

  // Adjust based on tsundere level
  temperature += (tsundereLevel - 5) * 0.02; // Slight increase for higher tsundere levels
  presencePenalty += (tsundereLevel - 5) * 0.01;

  // Clamp values
  temperature = Math.max(0.5, Math.min(1.2, temperature));
  presencePenalty = Math.max(0.3, Math.min(1.0, presencePenalty));

  return { temperature, presencePenalty };
}

bot.command("start", (ctx) => {
  const greeting = "Halo! B-bukan berarti aku senang ngobrol denganmu...";
  saveMessages(ctx.chat.id, [{ role: "assistant", content: greeting }]);
  ctx.reply(greeting);
});

bot.on("message", async (ctx) => {
  if (ctx.update.message.chat.type !== "private") return;

  const userId = ctx.update.message.from.id;
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
    const currentEmotion = await updateEmotion(userId, userMessage);
    const { tsundereLevel, botMemory } = await adjustTsundereLevel(userId, userMessage);
    const { context } = await updateContext(userId, userMessage);
    await updateAnimeKnowledge(userId, userMessage);

    const customPrompt = generateCustomPrompt(ctx.me.first_name, context, botMemory, currentEmotion, tsundereLevel);
    const { temperature, presencePenalty } = getAdjustedParameters(currentEmotion, tsundereLevel);

    // Check cache for API response
    const cacheKey = `${selectedModel}_${customPrompt}_${userMessage}`;
    let message = await getCachedAPIResponse(selectedModel, cacheKey);

    if (!message) {
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

      message = completion.choices[0].message.content;

      // Cache the API response
      if (message) {
        await setCachedAPIResponse(selectedModel, cacheKey, message);
      }
    }

    if (userMessage.toLowerCase().includes("anime") && !botMemory.mentionedAnime.includes(userMessage)) {
      botMemory.mentionedAnime.push(userMessage);
    }
    if (userMessage.toLowerCase().includes("coding") && !botMemory.mentionedCodingTopics.includes(userMessage)) {
      botMemory.mentionedCodingTopics.push(userMessage);
    }

    await setUserMemory(userId, botMemory);

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
