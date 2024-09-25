import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.20.4/mod.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.28.0/mod.ts";
import { useDB } from './utils/db.ts';
import "https://deno.land/std@0.177.0/dotenv/load.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

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

const topicResponses = {
  eva: [
    "Hah! Kamu pikir kamu tahu tentang EVA? Aku yang terbaik di sini!",
    "EVA bukan mainan, tau! Jangan sok tahu!",
    "Hmph, mungkin kamu tidak seburuk yang kukira soal EVA...",
    "Kamu... benar-benar paham EVA? B-bukan berarti aku terkesan atau apa!",
  ],
  piloting: [
    "Jangan harap bisa mengalahkan rekorku dalam simulasi!",
    "Kamu pikir bisa jadi pilot yang lebih baik? Jangan membuatku tertawa!",
    "B-bukan berarti aku mengakuimu sebagai pilot yang baik atau apa...",
    "Hmph, lumayan juga kemampuan pilotingmu. Tapi masih jauh di bawahku!",
  ],
  nerv: [
    "NERV? Hah, aku yang paling berharga di sini!",
    "Jangan bicara seolah kamu tahu segalanya tentang NERV!",
    "Kamu... lumayan juga pengetahuanmu tentang NERV. T-tapi tetap saja aku lebih tahu!",
  ],
  angel: [
    "Angel? Aku bisa mengalahkan mereka semua sendirian!",
    "Jangan sok berani! Menghadapi Angel tidak semudah yang kau kira!",
    "Hmph, setidaknya kamu tahu tentang ancaman Angel...",
  ],
};

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

const { getMessages, saveMessages } = useDB({
  url: Deno.env.get("DATABASE_URL") || "",
  authToken: Deno.env.get("DATABASE_API_TOKEN") || "",
});

const models = [
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3-8b-instruct:free",
  "google/gemini-pro",
  "google/gemma-2b-it",
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

async function healthCheck(model: string): Promise<boolean> {
  try {
    if (model.startsWith("google/")) {
      const generativeModel = googleAI.getGenerativeModel({ model: model.replace("google/", "") });
      const result = await generativeModel.generateContent("Hi");
      return result.response.candidates.length > 0;
    } else {
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 1,
      });
      return completion.choices.length > 0;
    }
  } catch (error) {
    console.error(`Health check failed for model ${model}:`, error);
    return false;
  }
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

function getTopicResponse(topic: string): string {
  if (topicResponses[topic as keyof typeof topicResponses]) {
    return topicResponses[topic as keyof typeof topicResponses][Math.floor(Math.random() * topicResponses[topic as keyof typeof topicResponses].length)];
  }
  return fillTemplate(responseTemplates[Math.floor(Math.random() * responseTemplates.length)], topic);
}

function generateCustomPrompt(botName: string) {
  const trait = personalityTraits[Math.floor(Math.random() * personalityTraits.length)];
  const topPerformance = Object.entries(botMemory.userPerformance)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic)
    .join(", ");

  const tsunderePhrase = getTsunderePhrase(tsundereLevel, currentEmotion);
  const topicResponse = getTopicResponse(context.topic);

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

    Adjust your response based on the tsundere level and current emotion:
    - High tsundere (7-10) or "angry"/"competitive" emotion: Be more aggressive, boastful, and dismissive.
    - Medium tsundere (4-6) or "annoyed"/"proud" emotion: Mix arrogance with backhanded compliments, show reluctant acknowledgment.
    - Low tsundere (0-3) or "vulnerable"/"insecure" emotion: Show more openness, but still maintain some pride and defensiveness.

    Always respond in Bahasa Indonesia. Avoid repeating exact phrases. Incorporate Eva and piloting references naturally, especially for related topics.
    React to the user's piloting performance, either by mocking low scores or reluctantly acknowledging high ones.
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
    case "vulnerable":
      temperature = 0.7;
      presencePenalty = 0.5;
      frequencyPenalty = 0.2;
      break;
    case "competitive":
    case "proud":
      temperature = 0.9;
      presencePenalty = 0.7;
      frequencyPenalty = 0.4;
      break;
    case "insecure":
    case "annoyed":
      temperature = 0.8;
      presencePenalty = 0.6;
      frequencyPenalty = 0.3;
      break;
  }

  return { temperature, presencePenalty, frequencyPenalty };
}

bot.command("start", (ctx) => {
  const greeting = "Hah! Kamu pikir bisa jadi pilot EVA? Jangan membuatku tertawa!";
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
    ctx.reply("Hmph! Aku sedang tidak mood untuk bicara. Coba lagi nanti, baka!");
    return;
  }

  try {
    const userMessage = ctx.update.message.text || "";
    updateEmotion(userMessage);
    adjustTsundereLevel(userMessage);
    updateContext(userMessage);

    const customPrompt = generateCustomPrompt(ctx.me.first_name);
    const { temperature, presencePenalty, frequencyPenalty } = getAdjustedParameters();

    let message: string;

    if (selectedModel.startsWith("google/")) {
      const generativeModel = googleAI.getGenerativeModel({ model: selectedModel.replace("google/", "") });
      const result = await generativeModel.generateContent([
        { role: "system", parts: [{ text: customPrompt }] },
        ...messages.map(msg => ({ role: msg.role, parts: [{ text: msg.content }] })),
        { role: "user", parts: [{ text: userMessage }] },
      ]);
      message = result.response.candidates[0].content.parts[0].text;
    } else {
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

      message = completion.choices[0].message.content;
    }

    if (userMessage.toLowerCase().includes("eva") && !botMemory.mentionedEva.includes(userMessage)) {
      botMemory.mentionedEva.push(userMessage);
    }
    if (userMessage.toLowerCase().includes("pilot") && !botMemory.mentionedPilotingSkills.includes(userMessage)) {
      botMemory.mentionedPilotingSkills.push(userMessage);
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
    ctx.reply("Baka! Ada yang salah. Coba lagi nanti, kalau kamu memang masih berani!");
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
