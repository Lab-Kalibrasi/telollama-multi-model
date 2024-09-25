import { type Config, createClient } from '@libsql/client/web'
import { defu } from 'defu'
import type { OllamaMessage } from './types.ts'

export const useDB = (config: Partial<Config>) => {
  config = defu(config, {
    url: ':memory:',
  })

  const turso = createClient(config as Config)

  turso.execute(
    `CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, role TEXT, content TEXT, chat_id INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
  )

  const getMessages = async (chatId: number): Promise<OllamaMessage[]> => {
    const data = await turso.execute({
      sql: `SELECT role, content FROM messages WHERE chat_id = :chatId ORDER BY created_at ASC`,
      args: { chatId },
    })

    return data.rows as unknown as OllamaMessage[]
  }

  const getTopicResponses = async (): Promise<Record<string, string[]>> => {
    try {
      const data = await turso.execute({
        sql: `SELECT content FROM messages WHERE chat_id = 0`,
      });

      const topicResponses: Record<string, string[]> = {};

      if (data && data.rows && Array.isArray(data.rows)) {
        for (const row of data.rows as { content: string }[]) {
          const [topic, response] = row.content.split(': ');
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
  };

  const saveMessages = async (chatId: number, messages: OllamaMessage[]) => {
    const placeholders = messages.map(() => '(?, ?, ?)').join(',')
    const args = messages.map((m) => [m.role, m.content, chatId]).flat()

    return await turso.execute({
      sql: `INSERT INTO messages (role, content, chat_id) VALUES ${placeholders}`,
      args,
    })
  }

  const saveTopicResponse = async (topic: string, response: string) => {
    return await turso.execute({
      sql: `INSERT INTO messages (role, content, chat_id) VALUES (?, ?, ?)`,
      args: ['assistant', `${topic}: ${response}`, 0],
    })
  }

  return {
    getMessages,
    getTopicResponses,
    saveMessages,
    saveTopicResponse,
  }
}
