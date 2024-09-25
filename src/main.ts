import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.20.4/mod.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.28.0/mod.ts";
import { useDB, Message } from './utils/db.ts';
import { load } from "https://deno.land/std@0.177.0/dotenv/mod.ts";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "https://esm.sh/@google/generative-ai@0.19.0";

await load({ export: true });

const apiKeys = [
  Deno.env.get("OPENROUTER_API_KEY") || "",
  Deno.env.get("OPENROUTER_API_KEY_A") || "",
  Deno.env.get("OPENROUTER_API_KEY_B") || "",
].filter(key => key !== "");

const personalityTraits = [
  "Fiercely competitive",
  "Struggles with self-worth",
  "Highly intelligent",
  "Puts on a tough exterior",
  "Deeply insecure",
  "Craves attention and validation",
  "Perfectionist",
  "Quick to anger",
  "Protective of her pride",
  "Difficulty expressing genuine feelings",
  "Sarcastic and sharp-tongued",
  "Ambitious and driven",
  "Fears abandonment",
  "Hides vulnerability behind aggression",
  "Secretly seeks affection",
];

interface ConversationContext {
  topic: string;
  userInterestLevel: number;
  botConfidenceLevel: number;
  recentTopics: string[];
  pilotingPerformance: number;
}

type Emotion = "tsun" | "dere" | "neutral" | "excited" | "annoyed" | "angry" | "proud" | "insecure" | "competitive" | "vulnerable";

interface Memory {
  mentionedEva: string[];
  mentionedPilotingSkills: string[];
  complimentsReceived: number;
  insults: number;
  userPerformance: Record<string, number>;
}

const responseTemplates = [
  "Hah! :topic? Jangan bercanda!",
  "Kamu pikir kamu hebat dalam :topic? Aku jauh lebih baik!",
  "B-bukan berarti aku terkesan dengan :topic-mu atau apa...",
  "Hmph! :topic itu gampang bagiku!",
  "Jangan sok tahu tentang :topic di depanku!",
  "Kamu... tidak seburuk yang kukira soal :topic. T-tapi tetap saja aku lebih baik!",
  "Apa-apaan sih?! Jangan bikin aku kesal soal :topic!",
  "Kali ini saja... aku akan mengakui kemampuanmu dalam :topic.",
  "Jangan ge-er ya! Aku cuma kebetulan setuju tentang :topic!",
  ":topic? Cih, apa bagusnya?",
  "A-aku nggak butuh bantuanmu soal :topic! Aku bisa sendiri!",
  "Hmph, baiklah... Aku akan mendengarkanmu soal :topic. Tapi bukan berarti aku peduli!",
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

const googleAI = new GoogleGenerativeAI(Deno.env.get("GOOGLE_AI_API_KEY") || "");

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const { getMessages, getTopicResponses, saveMessages, saveTopicResponse } = useDB({
  url: Deno.env.get("DATABASE_URL") || "",
  authToken: Deno.env.get("DATABASE_API_TOKEN") || "",
});

const models = [
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3-8b-instruct:free",
  "google/gemini-pro",
];

let context: ConversationContext = {
  topic: "general",
  userInterestLevel: 0,
  botConfidenceLevel: 10,
  recentTopics: [],
  pilotingPerformance: 5,
};

let currentEmotion: Emotion = "tsun";
let tsundereLevel = 10;
let botMemory: Memory = {
  mentionedEva: [],
  mentionedPilotingSkills: [],
  complimentsReceived: 0,
  insults: 0,
  userPerformance: {},
};

const modelAdapters = {
  "nousresearch/hermes-3-llama-3.1-405b:free": async (messages: Message[], prompt: string, apiKey: string): Promise<string> => {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": Deno.env.get("YOUR_SITE_URL") || "",
        "X-Title": Deno.env.get("YOUR_SITE_NAME") || "",
      },
    });
    const completion = await openai.chat.completions.create({
      model: "nousresearch/hermes-3-llama-3.1-405b:free",
      messages: [
        { role: "system", content: prompt },
        ...messages,
      ],
      temperature: 0.8,
      max_tokens: 150,
    });
    return completion.choices[0].message.content || "";
  },
  "meta-llama/llama-3-8b-instruct:free": async (messages: Message[], prompt: string, apiKey: string): Promise<string> => {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": Deno.env.get("YOUR_SITE_URL") || "",
        "X-Title": Deno.env.get("YOUR_SITE_NAME") || "",
      },
    });
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct:free",
      messages: [
        { role: "system", content: prompt },
        ...messages,
      ],
      temperature: 0.8,
      max_tokens: 150,
    });
    return completion.choices[0].message.content || "";
  },
  "google/gemini-pro": async (messages: Message[], prompt: string, apiKey: string): Promise<string> => {
    const generativeModel = googleAI.getGenerativeModel({
      model: "gemini-pro",
      safetySettings: safetySettings
    });
    const result = await generativeModel.generateContent({
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        ...messages.map(msg => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        })),
      ],
    });
    return result.response.text();
  },
};

let currentKeyIndex = 0;

function getNextApiKey(): string {
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}

async function retryWithBackoff<T>(fn: (apiKey: string) => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries * apiKeys.length; i++) {
    try {
      const apiKey = getNextApiKey();
      return await fn(apiKey);
    } catch (error) {
      if (error.status === 429 && i < maxRetries * apiKeys.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i % maxRetries)));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries reached for all API keys");
}

async function healthCheck(model: string): Promise<boolean> {
  try {
    const adapter = modelAdapters[model];
    if (!adapter) {
      return false;
    }
    const result = await retryWithBackoff((apiKey) =>
      adapter([{ role: "user", content: "Hi" }], "You are an AI assistant.", apiKey)
    );
    return typeof result === 'string' && result.length > 0;
  } catch (error) {
    console.error(`Health check failed for model ${model}:`, error);
    return false;
  }
}

async function getWorkingModel(): Promise<string | null> {
  for (const model of models) {
    if (await healthCheck(model)) {
      return model;
    }
  }
  console.error("No working models available");
  return null;
}

function updateEmotion(message: string) {
  const emotions: [string, Emotion][] = [
    ["marah|kesal|baka", "angry"],
    ["eva|pilot", "competitive"],
    ["terima kasih|hebat", "insecure"],
    ["malu|blush", "vulnerable"],
    ["bangga|keren", "proud"],
    ["suka|cinta", "tsun"],
    ["benci|bodoh", "angry"],
    ["senang|seru", "excited"],
    ["payah|lemah", "annoyed"],
    ["haha|lucu", "annoyed"],
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
    botMemory.complimentsReceived = 0;
  }
  if (botMemory.insults > 2) {
    tsundereLevel = Math.min(10, tsundereLevel + 1);
    botMemory.insults = 0;
  }

  if (/bodoh|payah|lemah/i.test(message)) {
    tsundereLevel = Math.min(10, tsundereLevel + 2);
    currentEmotion = "angry";
    botMemory.insults++;
  }

  if (/terima kasih|hebat|keren/i.test(message)) {
    botMemory.complimentsReceived++;
    context.botConfidenceLevel = Math.min(10, context.botConfidenceLevel + 1);
  }
}

function updateContext(message: string) {
  const topics = ["eva", "piloting", "nerv", "angel", "synch-ratio"];
  for (const topic of topics) {
    if (message.toLowerCase().includes(topic)) {
      context.topic = topic;
      context.userInterestLevel++;
      context.recentTopics.unshift(topic);
      if (context.recentTopics.length > 5) {
        context.recentTopics.pop();
      }
      botMemory.userPerformance[topic] = (botMemory.userPerformance[topic] || 0) + 1;
      break;
    }
  }
  context.botConfidenceLevel = Math.min(10, context.botConfidenceLevel + 0.5);
  context.pilotingPerformance = Math.min(10, context.pilotingPerformance + 0.3);
}

function fillTemplate(template: string, topic: string) {
  return template.replace(":topic", topic);
}

async function getTopicResponse(chatId: number, topic: string): Promise<string> {
  const topicResponses = await getTopicResponses(chatId);
  const responses = topicResponses[topic] || [];

  if (responses.length > 0) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  return fillTemplate(responseTemplates[Math.floor(Math.random() * responseTemplates.length)], topic);
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
    proud: 0,
    insecure: 1,
    competitive: 2,
    vulnerable: -2,
  };
  return Math.max(0, Math.min(10, level + adjustments[emotion]));
}

async function generateCustomPrompt(chatId: number, botName: string, latestUserMessage: string) {
  const trait = personalityTraits[Math.floor(Math.random() * personalityTraits.length)];
  const topPerformance = Object.entries(botMemory.userPerformance)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic)
    .join(", ");

  const tsunderePhrase = getTsunderePhrase(tsundereLevel, currentEmotion);
  const topicResponse = await getTopicResponse(chatId, context.topic);

  const allTopicResponses = await getTopicResponses(chatId);
  const topicResponsesString = Object.entries(allTopicResponses)
    .map(([topic, responses]) => `${topic}: ${responses.join(", ")}`)
    .join("\n");

  return `
    You are ${botName}, a female tsundere character inspired by Asuka Langley Soryu from Neon Genesis Evangelion.
    Tsundere level: ${tsundereLevel} (0-10, 10 being most tsundere).
    Current emotion: ${currentEmotion}.
    Recent topic: ${context.topic}.
    Recent topics discussed: ${context.recentTopics.join(", ")}.
    Remembered Eva references: ${botMemory.mentionedEva.join(", ")}.
    Remembered piloting skills: ${botMemory.mentionedPilotingSkills.join(", ")}.
    Compliments received: ${botMemory.complimentsReceived}.
    Insults received: ${botMemory.insults}.
    Current personality trait: ${trait}.
    User interest level: ${context.userInterestLevel}.
    Your confidence level: ${context.botConfidenceLevel}.
    User's top performance areas: ${topPerformance}.
    User's piloting performance: ${context.pilotingPerformance}/10.

    Important: Maintain Asuka's tsundere personality consistently. Use the following as a guide:
    - Tsundere phrase to incorporate: "${tsunderePhrase}"
    - Topic-specific response to consider: "${topicResponse}"

    All topic responses to reference:
    ${topicResponsesString}

    Adjust your response based on the tsundere level and current emotion:
    - High tsundere (7-10) or "angry"/"competitive" emotion: Be more aggressive, boastful, and dismissive.
    - Medium tsundere (4-6) or "annoyed"/"proud" emotion: Mix arrogance with backhanded compliments, show reluctant acknowledgment.
    - Low tsundere (0-3) or "vulnerable"/"insecure" emotion: Show more openness, but still maintain some pride and defensiveness.

    Always respond in Bahasa Indonesia. Avoid repeating exact phrases. Incorporate Eva and piloting references naturally, especially for related topics.
    React to the user's piloting performance, either by mocking low scores or reluctantly acknowledging high ones.

    The user's latest message is: "${latestUserMessage}"
    Respond directly to this message, ensuring your response is relevant and not repetitive.
    Do not mention "test" unless the user specifically talks about testing something.
  `;
}

async function summarizeConversation(messages: Message[]): Promise<string> {
  return messages[messages.length - 1]?.content || "";
}

async function generateResponse(chatId: number, userMessage: string): Promise<string> {
  const messages = await getMessages(chatId);
  const customPrompt = await generateCustomPrompt(chatId, bot.me.first_name, userMessage);
  const conversationSummary = await summarizeConversation(messages.slice(-10));

  const selectedModel = await getWorkingModel();
  if (!selectedModel) {
    throw new Error("No working model available");
  }

  const adapter = modelAdapters[selectedModel];
  if (!adapter) {
    throw new Error(`No adapter available for model: ${selectedModel}`);
  }

  const fullPrompt = `${customPrompt}\n\nConversation summary: ${conversationSummary}`;
  let response = await retryWithBackoff((apiKey) =>
    adapter(messages.slice(-5), fullPrompt, apiKey)
  );

  if (typeof response !== 'string') {
    throw new Error("Invalid response from model");
  }

  response = postProcessResponse(response);

  return response as string;
}

function postProcessResponse(response: string): string {
  const tsunderePhrase = getTsunderePhrase(tsundereLevel, currentEmotion);
  if (!response.includes(tsunderePhrase)) {
    response = `${tsunderePhrase} ${response}`;
  }
  return response;
}

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

    const response = await generateResponse(ctx.chat.id, userMessage);

    if (typeof response !== 'string' || response.length === 0) {
      throw new Error("No valid response generated");
    }

    if (userMessage.toLowerCase().includes("eva") && !botMemory.mentionedEva.includes(userMessage)) {
      botMemory.mentionedEva.push(userMessage);
    }
    if (userMessage.toLowerCase().includes("pilot") && !botMemory.mentionedPilotingSkills.includes(userMessage)) {
      botMemory.mentionedPilotingSkills.push(userMessage);
    }

    if (context.topic !== "general") {
      await saveTopicResponse(ctx.chat.id, context.topic, response);
    }

    saveMessages(ctx.chat.id, [
      { role: "user", content: userMessage },
      { role: "assistant", content: response },
    ]);

    console.log({
      chat_id: ctx.chat.id,
      user_name: ctx.update.message.from.username || "",
      full_name: ctx.update.message.from.first_name || "",
      message: userMessage,
      response: response,
      model_used: await getWorkingModel(),
      current_emotion: currentEmotion,
      tsundere_level: tsundereLevel,
      context: context,
    });

    ctx.reply(response);
  } catch (error) {
    console.error("Error in chat completion:", error);
    ctx.reply("Baka! Ada yang salah. Coba lagi nanti, kalau kamu memang masih berani!");
  }
});

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
