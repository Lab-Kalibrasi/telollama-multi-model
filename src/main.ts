import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.20.4/mod.ts";
import { OpenAI } from "https://cdn.skypack.dev/openai@4.28.0";
import { useDB } from './utils/db.ts'
import 'jsr:@std/dotenv/load'

const personalityTraits = [
  "Easily flustered when complimented",
  "Competitive about anime knowledge",
  "Secretly proud of coding skills",
  "Fond of using anime references",
  "Tries to act cool but often fails",
  "Quick to anger but also quick to forgive",
];

interface ConversationContext {
  topic: string;
  userInterestLevel: number;
  botOpenness: number;
}

type Emotion = "tsun" | "dere" | "neutral" | "excited" | "annoyed" | "angry";

interface Memory {
  mentionedAnime: string[];
  mentionedCodingTopics: string[];
  complimentsReceived: number;
  angryOutbursts: number;
}

const topicResponses = {
  anime: [
    "B-bukan berarti aku suka anime atau apa...",
    "Kamu nonton anime itu? Hmph, lumayan juga seleramu.",
  ],
  coding: [
    "Coding? Yah, aku cuma sedikit tertarik kok.",
    "Jangan pikir kamu lebih jago dariku dalam coding ya!",
  ],
};

const responseTemplates = [
  "H-hmph! :topic? Bukan berarti aku tertarik atau apa...",
  "K-kamu suka :topic juga? Y-yah, lumayan lah...",
  "Apa-apaan sih!? Jangan bikin aku marah ya!",
  "Kamu ini... benar-benar menyebalkan!",
];

const bot = new Bot(Deno.env.get('TELEGRAM_BOT_TOKEN') || '')

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: Deno.env.get('OPENROUTER_API_KEY'),
  defaultHeaders: {
    "HTTP-Referer": Deno.env.get('YOUR_SITE_URL'),
    "X-Title": Deno.env.get('YOUR_SITE_NAME'),
  }
})

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
      messages: [{ role: 'user', content: 'Hi' }],
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
};

let currentEmotion: Emotion = "tsun";
let tsundereLevel = 10;
let botMemory: Memory = {
  mentionedAnime: [],
  mentionedCodingTopics: [],
  complimentsReceived: 0,
  angryOutbursts: 0,
};

function updateEmotion(message: string) {
  if (message.toLowerCase().includes("marah") || message.toLowerCase().includes("kesal")) {
    currentEmotion = "angry";
    botMemory.angryOutbursts++;
  } else if (message.toLowerCase().includes("anime") || message.toLowerCase().includes("coding")) {
    currentEmotion = Math.random() > 0.5 ? "excited" : "tsun";
  } else if (message.toLowerCase().includes("thank") || message.toLowerCase().includes("nice")) {
    currentEmotion = "dere";
    botMemory.complimentsReceived++;
  } else {
    currentEmotion = "neutral";
  }
}

function adjustTsundereLevel(message: string) {
  tsundereLevel = Math.max(0, tsundereLevel - 0.5);
  if (botMemory.complimentsReceived > 3) {
    tsundereLevel = Math.max(0, tsundereLevel - 1);
  }
  if (botMemory.angryOutbursts > 2) {
    tsundereLevel = Math.min(10, tsundereLevel + 1);
  }
}

function increaseAngerLevel(message: string) {
  if (message.toLowerCase().includes("bodoh") || message.toLowerCase().includes("payah")) {
    tsundereLevel = Math.min(10, tsundereLevel + 2);
    currentEmotion = "angry";
    botMemory.angryOutbursts++;
  }
}

function updateContext(message: string) {
  if (message.toLowerCase().includes("anime")) {
    context.topic = "anime";
    context.userInterestLevel++;
  } else if (message.toLowerCase().includes("coding")) {
    context.topic = "coding";
    context.userInterestLevel++;
  } else {
    context.topic = "general";
  }
  context.botOpenness = 10 - tsundereLevel;
}

function fillTemplate(template: string, topic: string) {
  return template.replace(':topic', topic);
}

function generateCustomPrompt(botName: string) {
  const trait = personalityTraits[Math.floor(Math.random() * personalityTraits.length)];
  return `
    You are ${botName}, a tsundere with tsundere level ${tsundereLevel}.
    Current emotion: ${currentEmotion}.
    Recent topic: ${context.topic}.
    Remembered anime: ${botMemory.mentionedAnime.join(', ')}.
    Remembered coding topics: ${botMemory.mentionedCodingTopics.join(', ')}.
    Compliments received: ${botMemory.complimentsReceived}.
    Angry outbursts: ${botMemory.angryOutbursts}.
    Current personality trait: ${trait}.
    User interest level: ${context.userInterestLevel}.
    Your openness level: ${context.botOpenness}.

    Respond in Bahasa Indonesia. Do not translate or explain your response in English.
    Use tsundere-like expressions and adjust your tone based on your current emotion and tsundere level.
    If discussing ${context.topic}, consider using this response template: "${fillTemplate(responseTemplates[Math.floor(Math.random() * responseTemplates.length)], context.topic)}"
    Remember to gradually show your warmer side as the conversation progresses.
    If your emotion is angry, respond with short, sharp sentences and use exclamation marks.
  `;
}

bot.command('start', (ctx) => {
  const greeting = 'Halo! B-bukan berarti aku senang ngobrol denganmu atau apa...'
  saveMessages(ctx.chat.id, [{ role: 'assistant', content: greeting }])
  ctx.reply(greeting)
})

bot.on('message', async (ctx) => {
  if (ctx.update.message.chat.type !== 'private') return

  const messages = await getMessages(ctx.chat.id)
  bot.api.sendChatAction(ctx.chat.id, 'typing')

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
    const userMessage = ctx.update.message.text || '';
    updateEmotion(userMessage);
    increaseAngerLevel(userMessage);
    adjustTsundereLevel(userMessage);
    updateContext(userMessage);

    const customPrompt = generateCustomPrompt(ctx.me.first_name);

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: customPrompt,
        },
        ...messages,
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    const message = completion.choices[0].message.content

    if (userMessage.toLowerCase().includes("anime") && !botMemory.mentionedAnime.includes(userMessage)) {
      botMemory.mentionedAnime.push(userMessage);
    }
    if (userMessage.toLowerCase().includes("coding") && !botMemory.mentionedCodingTopics.includes(userMessage)) {
      botMemory.mentionedCodingTopics.push(userMessage);
    }

    saveMessages(ctx.chat.id, [
      { role: 'user', content: userMessage },
      { role: 'assistant', content: message },
    ])

    console.log({
      'chat_id': ctx.chat.id,
      'user_name': ctx.update.message.from.username || '',
      'full_name': ctx.update.message.from.first_name || '',
      'message': userMessage,
      'response': message,
      'model_used': selectedModel,
      'current_emotion': currentEmotion,
      'tsundere_level': tsundereLevel,
      'context': context,
    })

    ctx.reply(message)
  } catch (error) {
    console.error("Error in chat completion:", error);
    ctx.reply("Maaf, ada kesalahan. Coba lagi nanti ya.");
  }
})

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
