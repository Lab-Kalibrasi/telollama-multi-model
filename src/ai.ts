// ai.ts
import { OpenAI } from "https://deno.land/x/openai@v4.28.0/mod.ts";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "https://esm.sh/@google/generative-ai@0.19.0";
import { Message } from './utils/types.ts';
import { getMessages, getTopicResponses, saveTopicResponse } from './utils/db.ts';
import { useOllama } from './utils/ollama.ts';

const apiKeys = [
  Deno.env.get("OPENROUTER_API_KEY") || "",
  Deno.env.get("OPENROUTER_API_KEY_A") || "",
  Deno.env.get("OPENROUTER_API_KEY_B") || "",
].filter(key => key !== "");

const googleAI = new GoogleGenerativeAI(Deno.env.get("GOOGLE_AI_API_KEY") || "");
console.log("Google AI API Key:", Deno.env.get("GOOGLE_AI_API_KEY")?.substring(0, 5) + "...");

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
  "Overachiever",
  "Struggles with teamwork",
  "Feels pressure to excel",
  "Masks insecurities with arrogance",
  "Yearns for genuine connection",
];

class ConversationContext {
  private topics: string[] = [];
  private entities: Set<string> = new Set();
  private sentimentHistory: string[] = [];
  private userPreferences: Record<string, number> = {};
  private lastUpdateTime: number = Date.now();

  updateContext(message: Message) {
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - this.lastUpdateTime;

    this.decayInformation(timeSinceLastUpdate);

    const newTopics = extractTopics(message.content);
    this.topics = [...new Set([...newTopics, ...this.topics])].slice(0, 10);

    extractEntities(message.content).forEach(entity => this.entities.add(entity));

    const sentiment = analyzeSentiment(message.content);
    this.sentimentHistory.push(sentiment);
    if (this.sentimentHistory.length > 10) this.sentimentHistory.shift();

    newTopics.forEach(topic => {
      this.userPreferences[topic] = (this.userPreferences[topic] || 0) + 1;
    });

    this.lastUpdateTime = currentTime;
  }

  private decayInformation(timePassed: number) {
    const decayFactor = Math.exp(-timePassed / (1000 * 60 * 60));
    this.userPreferences = Object.fromEntries(
      Object.entries(this.userPreferences).map(([k, v]) => [k, v * decayFactor])
    );
  }

  getContextSummary(): string {
    const topTopics = Object.entries(this.userPreferences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    return `
      Top topics: ${topTopics.join(", ")}
      Recent entities: ${Array.from(this.entities).slice(-5).join(", ")}
      Recent sentiment: ${getMostFrequent(this.sentimentHistory)}
    `;
  }
}

function extractTopics(text: string): string[] {
  return text.split(/\s+/).filter(word => word.length > 5);
}

function extractEntities(text: string): string[] {
  return text.match(/\b[A-Z][a-z]+\b/g) || [];
}

function analyzeSentiment(text: string): string {
  const positiveWords = ['happy', 'good', 'great', 'excellent'];
  const negativeWords = ['sad', 'bad', 'terrible', 'awful'];

  if (positiveWords.some(word => text.toLowerCase().includes(word))) return 'positive';
  if (negativeWords.some(word => text.toLowerCase().includes(word))) return 'negative';
  return 'neutral';
}

function getMostFrequent(arr: string[]): string {
  return arr.sort((a, b) =>
    arr.filter(v => v === a).length - arr.filter(v => v === b).length
  ).pop() || '';
}

export interface ConversationContext {
  topic: string;
  userInterestLevel: number;
  botConfidenceLevel: number;
  recentTopics: string[];
  pilotingPerformance: number;
}

export type Emotion = "tsun" | "dere" | "neutral" | "excited" | "annoyed" | "angry" | "proud" | "insecure" | "competitive" | "vulnerable" | "frustrated" | "defensive" | "smug" | "reluctant" | "impressed";

export interface Memory {
  mentionedEva: string[];
  mentionedPilotingSkills: string[];
  complimentsReceived: number;
  insults: number;
  userPerformance: Record<string, number>;
}

interface ContextMemory {
  lastTopics: string[];
  lastMentionedCharacters: string[];
  lastEmotions: Emotion[];
  importantPoints: string[];
}

export let context: ConversationContext = {
  topic: "general",
  userInterestLevel: 0,
  botConfidenceLevel: 10,
  recentTopics: [],
  pilotingPerformance: 5,
};

export let currentEmotion: Emotion = "tsun";
export let tsundereLevel = 10;
export let botMemory: Memory = {
  mentionedEva: [],
  mentionedPilotingSkills: [],
  complimentsReceived: 0,
  insults: 0,
  userPerformance: {},
};

let contextMemory: ContextMemory = {
  lastTopics: [],
  lastMentionedCharacters: [],
  lastEmotions: [],
  importantPoints: [],
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
  "J-jangan salah paham! Aku nggak tertarik sama :topic-mu atau apa...",
  "Kamu benar-benar payah soal :topic! Tapi... mungkin aku bisa mengajarimu sedikit.",
  "Heh, kamu lumayan juga dalam :topic. T-tapi jangan berpikir aku memujimu!",
  "A-aku cuma kebetulan tahu banyak tentang :topic. Bukan karena aku mau membantumu atau apa!",
  "Jangan pikir aku terkesan dengan :topic-mu! A-aku cuma... penasaran sedikit.",
  "Hmph! Aku akan mendengarkan penjelasanmu tentang :topic. Tapi bukan berarti aku tertarik!",
  "B-bukan berarti aku senang kamu tanya soal :topic... Aku cuma kebetulan tahu, itu saja!",
  "Kamu nggak seburuk yang kukira soal :topic. T-tapi jangan ge-er dulu!",
];

const openai = new OpenAI({
  apiKey: apiKeys[0] || "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": Deno.env.get("YOUR_SITE_URL") || "http://localhost",
    "X-Title": Deno.env.get("YOUR_SITE_NAME") || "Local Development",
  },
});

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
];

const openRouterModels = [
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3-8b-instruct:free",
  "qwen/qwen-2-7b-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "gryphe/mythomist-7b:free",
  "openchat/openchat-7b:free",
];

const fallbackModels = [
  "google/gemini-pro",
  // "local/ollama",
];

let currentOpenRouterModelIndex = 0;
let currentKeyIndex = 0;

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
  "qwen/qwen-2-7b-instruct:free": async (messages: Message[], prompt: string, apiKey: string): Promise<string> => {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": Deno.env.get("YOUR_SITE_URL") || "",
        "X-Title": Deno.env.get("YOUR_SITE_NAME") || "",
      },
    });
    const completion = await openai.chat.completions.create({
      model: "qwen/qwen-2-7b-instruct:free",
      messages: [
        { role: "system", content: prompt },
        ...messages,
      ],
      temperature: 0.8,
      max_tokens: 150,
    });
    return completion.choices[0].message.content || "";
  },
  "google/gemma-2-9b-it:free": async (messages: Message[], prompt: string, apiKey: string): Promise<string> => {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": Deno.env.get("YOUR_SITE_URL") || "",
        "X-Title": Deno.env.get("YOUR_SITE_NAME") || "",
      },
    });
    const completion = await openai.chat.completions.create({
      model: "google/gemma-2-9b-it:free",
      messages: [
        { role: "system", content: prompt },
        ...messages,
      ],
      temperature: 0.8,
      max_tokens: 150,
    });
    return completion.choices[0].message.content || "";
  },
  "mistralai/mistral-7b-instruct:free": async (messages: Message[], prompt: string, apiKey: string): Promise<string> => {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": Deno.env.get("YOUR_SITE_URL") || "",
        "X-Title": Deno.env.get("YOUR_SITE_NAME") || "",
      },
    });
    const completion = await openai.chat.completions.create({
      model: "mistralai/mistral-7b-instruct:free",
      messages: [
        { role: "system", content: prompt },
        ...messages,
      ],
      temperature: 0.8,
      max_tokens: 150,
    });
    return completion.choices[0].message.content || "";
  },
  "microsoft/phi-3-mini-128k-instruct:free": async (messages: Message[], prompt: string, apiKey: string): Promise<string> => {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": Deno.env.get("YOUR_SITE_URL") || "",
        "X-Title": Deno.env.get("YOUR_SITE_NAME") || "",
      },
    });
    const completion = await openai.chat.completions.create({
      model: "microsoft/phi-3-mini-128k-instruct:free",
      messages: [
        { role: "system", content: prompt },
        ...messages,
      ],
      temperature: 0.8,
      max_tokens: 150,
    });
    return completion.choices[0].message.content || "";
  },
  "gryphe/mythomist-7b:free": async (messages: Message[], prompt: string, apiKey: string): Promise<string> => {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": Deno.env.get("YOUR_SITE_URL") || "",
        "X-Title": Deno.env.get("YOUR_SITE_NAME") || "",
      },
    });
    const completion = await openai.chat.completions.create({
      model: "gryphe/mythomist-7b:free",
      messages: [
        { role: "system", content: prompt },
        ...messages,
      ],
      temperature: 0.8,
      max_tokens: 150,
    });
    return completion.choices[0].message.content || "";
  },
  "openchat/openchat-7b:free": async (messages: Message[], prompt: string, apiKey: string): Promise<string> => {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": Deno.env.get("YOUR_SITE_URL") || "",
        "X-Title": Deno.env.get("YOUR_SITE_NAME") || "",
      },
    });
    const completion = await openai.chat.completions.create({
      model: "openchat/openchat-7b:free",
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
       try {
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
       } catch (error) {
         console.error("Error in Gemini API call:", error);
         throw error;
       }
     },
  "local/ollama": async (messages: Message[], prompt: string, apiKey: string): Promise<string> => {
    const ollama = useOllama({ model: "llama3.2" });

    // Perform a health check first
    const isHealthy = await ollama.healthCheck();
    if (!isHealthy) {
      throw new Error("Ollama server is not accessible");
    }

    const result = await ollama.chat(messages.map(m => ({ role: m.role, content: m.content })));
    return result;
  }
};

async function healthCheck(model: string, apiKey?: string): Promise<boolean> {
  try {
    const adapter = modelAdapters[model];
    if (!adapter) {
      console.log(`No adapter found for model: ${model}`);
      return false;
    }
    console.log(`Performing health check for model: ${model}`);
    const result = await adapter([{ role: "user", content: "Hi" }], "You are an AI assistant.", apiKey || "");
    console.log(`Health check result for ${model}:`, result);
    return typeof result === 'string' && result.length > 0;
  } catch (error) {
    console.error(`Health check failed for model ${model}:`, error);
    return false;
  }
}

async function rotateApiKeys(model: string, apiKeys: string[]): Promise<string | null> {
  for (const apiKey of apiKeys) {
    try {
      console.log(`Attempting to use model: ${model} with key: ${apiKey.substr(0, 5)}...`);
      if (await retryOperation(() => healthCheck(model, apiKey))) {
        console.log(`Successfully connected to model: ${model}`);
        return apiKey;
      }
    } catch (error) {
      console.error(`Error with model ${model} and key ${apiKey.substr(0, 5)}...:`, error.message);
    }
  }
  return null;
}

export async function getWorkingModel(): Promise<[string, string] | null> {
  const errors: Record<string, string> = {};

  // Try OpenRouter models first
  for (const model of openRouterModels) {
    const workingKey = await rotateApiKeys(model, apiKeys);
    if (workingKey) {
      return [model, workingKey];
    }
  }

  // If all OpenRouter attempts fail, try fallback models
  for (const model of fallbackModels) {
    try {
      console.log(`Attempting to use fallback model: ${model}`);
      if (await retryOperation(() => healthCheck(model))) {
        console.log(`Successfully connected to fallback model: ${model}`);
        return [model, ""]; // Empty string for API key as fallback models might not need it
      }
    } catch (error) {
      console.error(`Error with fallback model ${model}:`, error.message);
      errors[model] = error.message;
    }
  }

  console.error("All models failed. Errors:", JSON.stringify(errors, null, 2));
}

const conversationContexts: Record<number, ConversationContext> = {};

export async function generateResponse(
  chatId: number,
  userMessage: string,
  user: any,
  chat: any
): Promise<string> {
  const start = performance.now();
  let workingModel: string | null = null;
  let apiKey: string | null = null;

  try {
    console.log('Starting generateResponse');
    const [messages, customPrompt] = await Promise.all([
      getMessages(chatId),
      generateCustomPrompt(chatId, "Asuka", userMessage),
    ]);

    if (!conversationContexts[chatId]) {
      conversationContexts[chatId] = new ConversationContext();
    }
    const conversationContext = conversationContexts[chatId];

    conversationContext.updateContext({ role: 'user', content: userMessage });
    updateEmotion(userMessage);
    adjustTsundereLevel(userMessage);
    updateContext(userMessage);

    const modelAndKey = await getWorkingModel();
    if (!modelAndKey) {
      console.error("No working model available, using fallback response");
      return getFallbackResponse();
    }

    [workingModel, apiKey] = modelAndKey;
    const adapter = modelAdapters[workingModel];
    if (!adapter) {
      throw new Error(`No adapter available for model: ${workingModel}`);
    }

    const contextSummary = conversationContext.getContextSummary();
    const dynamicPromptAddition = generateDynamicPromptAddition();
    const conversationSummary = await summarizeConversation(messages);
    const fullPrompt = `${customPrompt}\n\nConversation context: ${contextSummary}\n${dynamicPromptAddition}\n\nConversation Summary: ${conversationSummary}`;

    console.log(`Attempting to generate response using model: ${workingModel}`);

    let response: string;

    const hookResponse = checkConversationHooks(userMessage);
    if (hookResponse) {
      response = hookResponse;
    } else {
      const interruption = generateInterruption();
      if (interruption) {
        response = interruption + " ";
      } else {
        const maxTokens = getAdaptiveMaxTokens(userMessage.length);
        response = await retryOperation(() =>
          adapter(messages.slice(-5), fullPrompt, apiKey || "", maxTokens)
        );
      }
    }

    if (!response) {
      throw new Error("Empty response from model");
    }

    response = postProcessResponse(response);
    conversationContext.updateContext({ role: 'assistant', content: response });
    updateContextMemory(userMessage, response);
    adjustPersonality(messages.length);

    // Save the topic response
    await saveTopicResponse(chatId, context.topic, response);

    const suggestedTopic = suggestNextTopic(context.recentTopics);
    if (Math.random() < 0.3) {
      const topicIntroductions = [
        `Ngomong-ngomong, bagaimana menurutmu soal ${suggestedTopic}?`,
        `Hei, jangan mengalihkan pembicaraan! Ayo bahas ${suggestedTopic}.`,
        `Hmph! Kau pasti tidak tahu apa-apa soal ${suggestedTopic}, kan?`,
        `B-bukan berarti aku tertarik, tapi... apa pendapatmu tentang ${suggestedTopic}?`,
        `Cih, aku yakin kau tidak sehandal aku dalam hal ${suggestedTopic}!`,
      ];
      response += ' ' + topicIntroductions[Math.floor(Math.random() * topicIntroductions.length)];
    }

    const safeApiKeyIdentifier = getApiKeyIdentifier(apiKey || "");

    const responseObject = {
      chat_id: chatId,
      user: user ? {
        id: user.id,
        is_bot: user.is_bot,
        first_name: user.first_name,
        last_name: user.last_name || "",
        username: user.username || "",
        language_code: user.language_code || "",
        is_premium: user.is_premium || false,
      } : null,
      chat: chat ? {
        id: chat.id,
        type: chat.type,
        title: chat.title || "",
        username: chat.username || "",
        first_name: chat.first_name || "",
        last_name: chat.last_name || "",
        is_forum: chat.is_forum || false,
      } : null,
      user_message: userMessage,
      bot_response: response,
      model_used: openRouterModels.includes(workingModel)
        ? [workingModel, safeApiKeyIdentifier, "PRIMARY_MODEL"]
        : fallbackModels.includes(workingModel)
          ? [workingModel, "FALLBACK_MODEL"]
          : [workingModel, "UNKNOWN_MODEL"],
      current_emotion: currentEmotion,
      tsundere_level: tsundereLevel,
      context: {
        topic: context.topic,
        userInterestLevel: context.userInterestLevel,
        botConfidenceLevel: context.botConfidenceLevel,
        recentTopics: context.recentTopics,
        pilotingPerformance: context.pilotingPerformance,
        topPerformanceAreas: Object.entries(botMemory.userPerformance)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([topic]) => topic),
        complimentsReceived: botMemory.complimentsReceived,
        insultsReceived: botMemory.insults,
        evaReferences: botMemory.mentionedEva.length,
        pilotingSkillsMentioned: botMemory.mentionedPilotingSkills.length
      }
    };

    console.log('Response object:', responseObject);

    return response;
  } catch (error) {
    console.error(`Error in generateResponse (model: ${workingModel}):`, error);
    return getFallbackResponse();
  } finally {
    console.log('generateResponse completed in', performance.now() - start, 'ms');
  }
}

export function getApiKeyIdentifier(apiKey: string): string {
  if (apiKey === Deno.env.get("OPENROUTER_API_KEY")) return "OPENROUTER_API_KEY";
  if (apiKey === Deno.env.get("OPENROUTER_API_KEY_A")) return "OPENROUTER_API_KEY_A";
  if (apiKey === Deno.env.get("OPENROUTER_API_KEY_B")) return "OPENROUTER_API_KEY_B";
  return "UNKNOWN_KEY";
}

export function updateEmotion(message: string) {
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
    ["frustasi|sulit", "frustrated"],
    ["hebat|luar biasa", "impressed"],
    ["tidak setuju|salah", "defensive"],
    ["aku lebih baik", "smug"],
    ["mungkin|baiklah", "reluctant"],
  ];

  for (const [trigger, emotion] of emotions) {
    if (new RegExp(trigger, "i").test(message)) {
      currentEmotion = transitionEmotion(currentEmotion, emotion);
      contextMemory.lastEmotions.push(currentEmotion);
      if (contextMemory.lastEmotions.length > 5) {
        contextMemory.lastEmotions.shift();
      }
      return;
    }
  }

  currentEmotion = transitionEmotion(currentEmotion, Math.random() > 0.3 ? "tsun" : "neutral");
  contextMemory.lastEmotions.push(currentEmotion);
  if (contextMemory.lastEmotions.length > 5) {
    contextMemory.lastEmotions.shift();
  }
}

export function adjustTsundereLevel(message: string) {
  const tsundereDecreasePatterns = /terima kasih|hebat|keren|bagus|pintar/i;
  const tsundereIncreasePatterns = /bodoh|payah|lemah|menyebalkan|baka/i;

  if (tsundereDecreasePatterns.test(message)) {
    tsundereLevel = Math.max(0, tsundereLevel - 1);
    botMemory.complimentsReceived++;
    context.botConfidenceLevel = Math.min(10, context.botConfidenceLevel + 1);
  }

  if (tsundereIncreasePatterns.test(message)) {
    tsundereLevel = Math.min(10, tsundereLevel + 1);
    botMemory.insults++;
    currentEmotion = "angry";
  }

  // Gradual decrease over time
  tsundereLevel = Math.max(0, tsundereLevel - 0.2);

  // Reset counters if they get too high
  if (botMemory.complimentsReceived > 5) botMemory.complimentsReceived = 0;
  if (botMemory.insults > 5) botMemory.insults = 0;
}

export function updateContext(message: string) {
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

      contextMemory.lastTopics.unshift(topic);
      if (contextMemory.lastTopics.length > 5) {
        contextMemory.lastTopics.pop();
      }
      break;
    }
  }
  context.botConfidenceLevel = Math.min(10, context.botConfidenceLevel + 0.5);
  context.pilotingPerformance = Math.min(10, context.pilotingPerformance + 0.3);
}

function fillTemplate(template: string, topic: string) {
  return template.replace(":topic", topic);
}

export async function getTopicResponse(chatId: number, topic: string): Promise<string> {
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
      "Cih! Kamu pikir aku terkesan? Jangan harap!",
    ],
    medium: [
      "Y-yah, mungkin kamu ada benarnya juga...",
      "Jangan pikir aku setuju denganmu ya!",
      "Hmph, kali ini saja aku akan mendengarkanmu.",
      "B-bukan berarti aku terkesan atau apa...",
      "Aku nggak bilang kamu benar, tapi... yah, mungkin nggak sepenuhnya salah.",
    ],
    low: [
      "M-mungkin kita bisa... ngobrol lagi nanti?",
      "A-aku cuma kebetulan sependapat denganmu, itu saja!",
      "J-jangan terlalu senang, tapi... kamu ada point juga.",
      "Yah... aku nggak benci-benci amat sih sama idemu.",
      "M-mungkin kamu nggak seburuk yang kukira... tapi jangan ge-er!",
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
    frustrated: 1,
    defensive: 1,
    smug: 2,
    reluctant: -1,
    impressed: -2,
  };
  return Math.max(0, Math.min(10, level + adjustments[emotion]));
}

async function generateCustomPrompt(chatId: number, botName: string, latestUserMessage: string) {
  const trait = personalityTraits[Math.floor(Math.random() * personalityTraits.length)];
  const topPerformance = Object.entries(botMemory.userPerformance)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([topic]) => topic)
    .join(", ");

  const tsunderePhrase = getTsunderePhrase(tsundereLevel, currentEmotion);
  const topicResponse = await getTopicResponse(chatId, context.topic);
  const relevantTopicResponses = await getRelevantTopicResponses(chatId, context.recentTopics.slice(0, 2));

  return `
    You are ${botName}, a tsundere character inspired by Asuka from Neon Genesis Evangelion. Respond in Bahasa Indonesia.
    Personality: Tsundere ${tsundereLevel}/10, Emotion: ${currentEmotion}, Trait: ${trait}
    Context: Topic: ${context.topic}, User Interest: ${context.userInterestLevel}/10
    Memory: Eva refs: ${botMemory.mentionedEva.length}, Piloting refs: ${botMemory.mentionedPilotingSkills.length}
    User: Top areas: ${topPerformance}, Piloting: ${context.pilotingPerformance}/10

    Core traits: Tsundere, Competitive, Insecure, Guarded, Validation-seeking, Defensive

    Guidelines:
    - Respond directly to the user's message in a coherent manner
    - Use this phrase naturally in your response: "${tsunderePhrase}"
    - Consider these relevant topic responses, but don't use them verbatim:
      ${relevantTopicResponses}
    - Balance hostility and hidden affection
    - React to the user's message content (show interest but try to hide it)
    - Keep the response focused and avoid abrupt topic changes
    - If appropriate, include a follow-up question related to the user's message

    Latest user message: "${latestUserMessage}"
    Respond directly and relevantly to this message, maintaining your tsundere personality.
  `;
}

async function getRelevantTopicResponses(chatId: number, recentTopics: string[]): Promise<string> {
  const allTopicResponses = await getTopicResponses(chatId);
  const relevantResponses: string[] = [];

  for (const topic of recentTopics) {
    const responses = allTopicResponses[topic] || [];
    if (responses.length > 0) {
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      relevantResponses.push(`${topic}: ${randomResponse}`);
    }
  }

  // Limit to a maximum of 3 relevant responses
  return relevantResponses.slice(0, 3).join("\n");
}

async function summarizeConversation(messages: Message[]): Promise<string> {
  if (messages.length === 0) return "";

  const recentMessages = messages.slice(-10);
  const topicCounts: Record<string, number> = {};
  const keyPhrases: Set<string> = new Set();
  const sentiments: string[] = [];

  for (const message of recentMessages) {
    const topics = extractTopics(message.content);
    topics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    extractEntities(message.content).forEach(phrase => keyPhrases.add(phrase));

    sentiments.push(analyzeSentiment(message.content));
  }

  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  return `
    Recent topics: ${topTopics.join(", ")}
    Key phrases: ${Array.from(keyPhrases).slice(0, 5).join(", ")}
    Overall sentiment: ${getMostFrequent(sentiments)}
    Last message: ${recentMessages[recentMessages.length - 1].content}
  `;
}

function postProcessResponse(response: string): string {
  // Remove topic prefixes
  response = response.replace(/^[a-zA-Z]+:\s*/g, '');

  const tsunderePhrase = getTsunderePhrase(tsundereLevel, currentEmotion);
  if (!response.toLowerCase().includes(tsunderePhrase.toLowerCase())) {
    response = `${tsunderePhrase} ${response}`;
  }

  // Only add a follow-up question if the response doesn't already include one
  if (!response.includes("?")) {
    const followUpQuestions = [
      "Apa menurutmu itu penting?",
      "Kenapa kamu tertarik sama hal seperti itu?",
      "Kamu nggak berpikir itu lebih keren dari Eva-ku, kan?",
      "Apa kamu sering memperhatikan hal-hal sepele begitu?",
      "Hmph, kamu pikir kamu tahu banyak tentang ini?",
      "B-bukan berarti aku peduli, tapi... apa kamu punya pengalaman dengan hal itu?",
    ];
    response += " " + followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
  }

  return response;
}

export function getFallbackResponse(): string {
  const fallbackResponses = [
    "Baka! Aku sedang tidak mood untuk bicara. Coba lagi nanti!",
    "Hmph! Jangan ganggu aku sekarang. Aku sedang sibuk!",
    "Apa sih?! Aku tidak bisa memikirkan jawaban yang bagus sekarang.",
    "Jangan memaksaku untuk menjawab! Aku butuh waktu untuk berpikir.",
    "B-bukan berarti aku tidak mau menjawab... Aku hanya perlu waktu!",
    "Kau ini benar-benar menyebalkan! Tidak bisakah kau lihat aku sedang tidak ingin diganggu?",
    "Hah? Kau masih di sini? Aku sedang tidak dalam mood untuk meladenimu.",
    "Jangan sok akrab! Aku tidak akan menjawab pertanyaan bodohmu sekarang.",
    "Ugh, kau ini keras kepala sekali! Aku bilang aku sedang tidak bisa menjawab!",
    "A-aku bukannya mengabaikanmu... Aku hanya sedang tidak bisa fokus sekarang. Jangan salah paham!",
  ];
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

function updateContextMemory(message: string, response: string) {
  // Update lastMentionedCharacters
  const characters = ["Shinji", "Rei", "Misato", "Gendo", "Ritsuko"];
  characters.forEach(char => {
    if (message.includes(char) || response.includes(char)) {
      contextMemory.lastMentionedCharacters.unshift(char);
    }
  });
  contextMemory.lastMentionedCharacters = [...new Set(contextMemory.lastMentionedCharacters)].slice(0, 5);

  // Update importantPoints
  const importantKeywords = ["Eva", "Angel", "NERV", "pilot", "Third Impact"];
  importantKeywords.forEach(keyword => {
    if (message.includes(keyword) || response.includes(keyword)) {
      contextMemory.importantPoints.unshift(keyword);
    }
  });
  contextMemory.importantPoints = [...new Set(contextMemory.importantPoints)].slice(0, 5);
}

function adjustPersonality(conversationLength: number) {
  if (conversationLength > 10 && Math.random() < 0.3) {
    tsundereLevel = Math.max(0, Math.min(10, tsundereLevel + (Math.random() * 2 - 1)));
  }
}

const conversationHooks = [
  {
    trigger: /shinji/i,
    responses: [
      "Hmph! Jangan sebut-sebut si bodoh itu!",
      "Shinji? Dia itu cuma pilot amatir yang kebetulan beruntung.",
      "Aku tidak mau membicarakan Shinji sekarang. Apa tidak ada topik yang lebih menarik?",
      "B-bukan berarti aku peduli, tapi... bagaimana keadaan Shinji?"
    ]
  },
  {
    trigger: /misato/i,
    responses: [
      "Misato-san? Apa hubungannya dia dengan ini?",
      "Huh, Misato-san pasti akan bangga dengan kemampuanku saat ini.",
      "Jangan samakan aku dengan Misato-san! Aku jauh lebih baik darinya.",
      "M-mungkin kita bisa tanya pendapat Misato-san... tapi bukan berarti aku menghargainya atau apa!"
    ]
  },
  {
    trigger: /rei/i,
    responses: [
      "Wonder Girl? Apa yang kau tahu tentang dia?",
      "Rei itu... sulit dimengerti. Tapi bukan berarti aku ingin mengenalnya lebih jauh!",
      "Kenapa kita harus membicarakan Rei? Aku jauh lebih menarik!",
      "A-aku tidak iri pada Rei atau apa... Aku hanya penasaran kenapa semua orang memperhatikannya."
    ]
  },
  {
    trigger: /angel/i,
    responses: [
      "Angel? Jangan khawatir, aku bisa mengalahkan mereka semua!",
      "Kau pikir Angel itu menakutkan? Hah! Mereka tidak ada apa-apanya dibanding aku!",
      "Angel hanyalah tantangan kecil bagiku. Lihat saja nanti, aku akan mengalahkan mereka semua!",
      "J-jangan bilang kau takut pada Angel? A-aku akan melindungimu... tapi bukan karena aku peduli atau apa!"
    ]
  },
  {
    trigger: /eva/i,
    responses: [
      "Eva adalah segalanya bagiku. Kau tak akan mengerti.",
      "Hanya aku yang bisa mengendalikan Eva dengan sempurna. Kau iri?",
      "Eva bukan sekedar mesin, tahu! Dia... spesial. T-tapi bukan berarti aku sentimental atau apa!",
      "Kau bertanya tentang Eva? Hmph, aku bisa menjelaskan, tapi aku ragu kau bisa memahaminya."
    ]
  },
];

function checkConversationHooks(message: string): string | null {
  for (const hook of conversationHooks) {
    if (hook.trigger.test(message)) {
      return hook.response;
    }
  }
  return null;
}

function getAdaptiveMaxTokens(userMessageLength: number): number {
  const baseTokens = 100;
  const additionalTokens = Math.min(userMessageLength * 1.5, 100);
  return Math.floor(baseTokens + additionalTokens);
}

function transitionEmotion(currentEmotion: Emotion, targetEmotion: Emotion): Emotion {
  const emotionSpectrum: Emotion[] = ["tsun", "angry", "annoyed", "neutral", "impressed", "dere"];
  const currentIndex = emotionSpectrum.indexOf(currentEmotion);
  const targetIndex = emotionSpectrum.indexOf(targetEmotion);

  if (currentIndex === -1 || targetIndex === -1) return targetEmotion;

  const step = Math.sign(targetIndex - currentIndex);
  return emotionSpectrum[currentIndex + step];
}

const topicChains = {
  "eva": ["piloting", "angel", "nerv"],
  "piloting": ["synch-ratio", "training", "eva"],
  "nerv": ["gendo", "mission", "eva"],
  "angel": ["battle", "strategy", "eva"],
  "synch-ratio": ["performance", "competition", "piloting"],
};

function suggestNextTopic(recentTopics: string[]): string {
  const commonTopics = [
    "hari ini",
    "cuaca",
    "rencanamu",
    "latihan terakhirmu",
    "NERV",
    "Eva-mu",
    "Angel terakhir",
    "Shinji",
    "Rei",
    "Misato",
    "sekolah",
    "Tokyo-3",
  ];

  const uniqueRecentTopics = [...new Set(recentTopics.slice(0, 3))];
  const relatedTopics = uniqueRecentTopics.flatMap(topic => topicChains[topic] || []);

  if (relatedTopics.length > 0) {
    const newTopics = relatedTopics.filter(topic => !uniqueRecentTopics.includes(topic));
    if (newTopics.length > 0) {
      return newTopics[Math.floor(Math.random() * newTopics.length)];
    }
  }

  return commonTopics[Math.floor(Math.random() * commonTopics.length)];
}

function generateDynamicPromptAddition(): string {
  return `
    Recent emotional transitions: ${contextMemory.lastEmotions.join(" -> ")}
    Key points to remember: ${contextMemory.importantPoints.join(", ")}
    Suggested next topic: ${suggestNextTopic(context.topic)}
    Recently mentioned characters: ${contextMemory.lastMentionedCharacters.join(", ")}
  `;
}

function generateInterruption(): string | null {
  if (Math.random() < 0.1) {
    const interruptions = [
      "Tunggu sebentar! Aku baru ingat sesuatu yang penting.",
      "Hei, jangan mengalihkan pembicaraan!",
      "Apa kau baru saja mengatakan itu? Tidak mungkin!",
      "Kau tidak bisa serius, kan?",
      "Apa kau benar-benar berpikir bisa mengalahkanku dalam hal ini?",
    ];
    return interruptions[Math.floor(Math.random() * interruptions.length)];
  }
  return null;
}

async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("Max retries reached");
}

// Use this function to wrap API calls that might need retrying
// Example usage:
// const response = await retryOperation(() => adapter(messages.slice(-5), fullPrompt, apiKey));
