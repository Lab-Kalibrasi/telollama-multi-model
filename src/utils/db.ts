// src/utils/db.ts
import { type Config, createClient } from '@libsql/client/web'
import { defu } from 'defu'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface MockDB {
  messages: Message[];
}

const mockDB: MockDB = {
  messages: []
};

export const useDB = (config: Partial<Config>) => {
  config = defu(config, {
    url: '',
  })

  let isInMemory = false;
  let turso: ReturnType<typeof createClient> | null = null;

  if (!config.url) {
    console.warn("DATABASE_URL is not set. Using in-memory mock database. Data will not persist.");
    isInMemory = true;
  } else {
    turso = createClient(config as Config);
    turso.execute(
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY,
        role TEXT,
        content TEXT,
        chat_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  }

  const getMessages = async (chatId: number): Promise<Message[]> => {
    if (isInMemory) {
      return mockDB.messages.filter(m => m.role !== 'system');
    }
    const data = await turso!.execute({
      sql: `SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC`,
      args: [chatId],
    });
    return data.rows as Message[];
  }

  const getTopicResponses = async (chatId: number): Promise<Record<string, string[]>> => {
    try {
      let assistantMessages: Message[];
      if (isInMemory) {
        assistantMessages = mockDB.messages.filter(m => m.role === 'assistant');
      } else {
        const data = await turso!.execute({
          sql: `SELECT content FROM messages WHERE chat_id = ? AND role = 'assistant'`,
          args: [chatId],
        });
        assistantMessages = data.rows as Message[];
      }

      const topicResponses: Record<string, string[]> = {};

      for (const message of assistantMessages) {
        const colonIndex = message.content.indexOf(':');
        if (colonIndex !== -1) {
          const topic = message.content.slice(0, colonIndex).trim();
          const response = message.content.slice(colonIndex + 1).trim();
          if (topic && response) {
            if (!topicResponses[topic]) {
              topicResponses[topic] = [];
            }
            topicResponses[topic].push(response);
          }
        }
      }

      return topicResponses;
    } catch (error) {
      console.error("Error fetching topic responses:", error);
      return {};
    }
  }

  const saveMessages = async (chatId: number, messages: Message[]) => {
    if (isInMemory) {
      mockDB.messages.push(...messages);
      return;
    }
    const placeholders = messages.map(() => '(?, ?, ?)').join(',');
    const args = messages.map((m) => [m.role, m.content, chatId]).flat();

    return await turso!.execute({
      sql: `INSERT INTO messages (role, content, chat_id) VALUES ${placeholders}`,
      args,
    });
  }

  const saveTopicResponse = async (chatId: number, topic: string, response: string) => {
    if (isInMemory) {
      mockDB.messages.push({ role: 'assistant', content: `${topic}: ${response}` });
      return;
    }
    return await turso!.execute({
      sql: `INSERT INTO messages (role, content, chat_id) VALUES (?, ?, ?)`,
      args: ['assistant', `${topic}: ${response}`, chatId],
    });
  }

  return {
    getMessages,
    getTopicResponses,
    saveMessages,
    saveTopicResponse,
  }
}

// Initialize the database connection and export the functions
const db = useDB({
  url: Deno.env.get("DATABASE_URL") || '',
  authToken: Deno.env.get("DATABASE_API_TOKEN") || '',
});

// Export the functions directly
export const getMessages = db.getMessages;
export const getTopicResponses = db.getTopicResponses;
export const saveMessages = db.saveMessages;
export const saveTopicResponse = db.saveTopicResponse;
