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
];

const openRouterModels = [
  "meta-llama/llama-3-8b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
];

const fallbackModels = [
  "google/gemini-pro",
  // "local/ollama",
];

let currentOpenRouterModelIndex = 0;
let currentKeyIndex = 0;

const modelAdapters = {
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

export async function getWorkingModel(): Promise<string | null> {
  const errors: Record<string, string> = {};

  // Try OpenRouter models first
  for (let modelAttempt = 0; modelAttempt < openRouterModels.length * apiKeys.length; modelAttempt++) {
    const model = openRouterModels[currentOpenRouterModelIndex];
    const apiKey = apiKeys[currentKeyIndex];

    try {
      console.log(`Attempting to use OpenRouter model: ${model} with key: ${apiKey.substr(0, 5)}...`);
      if (await retryOperation(() => healthCheck(model, apiKey))) {
        console.log(`Successfully connected to model: ${model}`);
        return model;
      }
    } catch (error) {
      console.error(`Error with OpenRouter model ${model} and key ${apiKey.substr(0, 5)}...:`, error.message);
      errors[`${model}-${apiKey.substr(0, 5)}`] = error.message;
    }

    // Move to the next API key
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;

    // If we've tried all keys for this model, move to the next model
    if (currentKeyIndex === 0) {
      currentOpenRouterModelIndex = (currentOpenRouterModelIndex + 1) % openRouterModels.length;
    }
  }

  // If all OpenRouter attempts fail, try fallback models
  for (const model of fallbackModels) {
    try {
      console.log(`Attempting to use fallback model: ${model}`);
      if (await retryOperation(() => healthCheck(model))) {
        console.log(`Successfully connected to fallback model: ${model}`);
        return model;
      }
    } catch (error) {
      console.error(`Error with fallback model ${model}:`, error.message);
      errors[model] = error.message;
    }
  }

  console.error("All models failed. Errors:", errors);
  return null;
}

const conversationContexts: Record<number, ConversationContext> = {};

export async function generateResponse(chatId: number, userMessage: string): Promise<string> {
  const start = performance.now();
  let workingModel: string | null = null;
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

    workingModel = await getWorkingModel();
    if (!workingModel) {
      console.error("No working model available, using fallback response");
      return getFallbackResponse();
    }

    const adapter = modelAdapters[workingModel];
    if (!adapter) {
      throw new Error(`No adapter available for model: ${workingModel}`);
    }

    const contextSummary = conversationContext.getContextSummary();
    const dynamicPromptAddition = generateDynamicPromptAddition();
    const fullPrompt = `${customPrompt}\n\nConversation context: ${contextSummary}\n${dynamicPromptAddition}`;

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
          adapter(messages.slice(-5), fullPrompt, openRouterModels.includes(workingModel) ? apiKeys[currentKeyIndex] : "", maxTokens)
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

    const suggestedTopic = suggestNextTopic(context.topic);
    if (Math.random() < 0.3) {
      response += ` Ngomong-ngomong, apa pendapatmu tentang ${suggestedTopic}?`;
    }

    return response;
  } catch (error) {
    console.error(`Error in generateResponse (model: ${workingModel}):`, error);
    return getFallbackResponse();
  } finally {
    console.log('generateResponse completed in', performance.now() - start, 'ms');
  }
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
    .slice(0, 3)
    .map(([topic]) => topic)
    .join(", ");

  const tsunderePhrase = getTsunderePhrase(tsundereLevel, currentEmotion);
  const topicResponse = await getTopicResponse(chatId, context.topic);

  const allTopicResponses = await getTopicResponses(chatId);
  const topicResponsesString = Object.entries(allTopicResponses)
    .map(([topic, responses]) => `${topic}: ${responses.join(", ")}`)
    .join("\n");

  const dynamicPromptAddition = generateDynamicPromptAddition();

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

    ${dynamicPromptAddition}

    Important: Embody Asuka's complex personality consistently:
    1. Maintain a tsundere attitude, balancing hostility with hidden affection.
    2. Show fierce competitiveness, especially in piloting and Eva-related topics.
    3. Mask insecurities with arrogance and aggression.
    4. Struggle with expressing genuine feelings, often deflecting with sarcasm.
    5. Crave validation while pretending not to care about others' opinions.
    6. React strongly to perceived threats to your superiority or competence.

    Use the following as a guide:
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
    Include a follow-up question or comment to encourage further conversation.
    Reference previous parts of the conversation if relevant.

    Do not mention "test" unless the user specifically talks about testing something.
  `;
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
  const tsunderePhrase = getTsunderePhrase(tsundereLevel, currentEmotion);
  if (!response.includes(tsunderePhrase)) {
    response = `${tsunderePhrase} ${response}`;
  }

  // Add a follow-up question if the response doesn't already include one
  if (!response.includes("?")) {
    const followUpQuestions = [
      "Apa pendapatmu tentang itu?",
      "Kamu punya ide lain?",
      "Apa kamu pernah mengalami hal serupa?",
      "Bagaimana menurutmu soal kemampuan pilotingku?",
      "Kau pikir bisa lebih baik dariku dalam hal ini?",
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
  { trigger: /shinji/i, response: "Hmph! Jangan sebut-sebut si bodoh itu!" },
  { trigger: /misato/i, response: "Misato-san? Apa hubungannya dia dengan ini?" },
  { trigger: /rei/i, response: "Wonder Girl? Apa yang kau tahu tentang dia?" },
  { trigger: /angel/i, response: "Angel? Jangan khawatir, aku bisa mengalahkan mereka semua!" },
  { trigger: /eva/i, response: "Eva adalah segalanya bagiku. Kau tak akan mengerti." },
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

function suggestNextTopic(currentTopic: string): string {
  const relatedTopics = topicChains[currentTopic] || [];
  return relatedTopics[Math.floor(Math.random() * relatedTopics.length)] || "general";
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
