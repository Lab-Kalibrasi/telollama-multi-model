import { type Config, createClient } from '@libsql/client/web'
import { defu } from 'defu'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const useDB = (config: Partial<Config>) => {
  config = defu(config, {
    url: ':memory:',
  })

  const turso = createClient(config as Config)

  turso.execute(
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY,
      role TEXT,
      content TEXT,
      chat_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  )

  const getMessages = async (chatId: number): Promise<Message[]> => {
    const data = await turso.execute({
      sql: `SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC`,
      args: [chatId],
    })

    return data.rows as Message[]
  }

  const getTopicResponses = async (chatId: number): Promise<Record<string, string[]>> => {
    try {
      const data = await turso.execute({
        sql: `SELECT content FROM messages WHERE chat_id = ? AND role = 'assistant'`,
        args: [chatId],
      })

      const topicResponses: Record<string, string[]> = {}

      if (data && data.rows && Array.isArray(data.rows)) {
        for (const row of data.rows as { content: string }[]) {
          const colonIndex = row.content.indexOf(':')
          if (colonIndex !== -1) {
            const topic = row.content.slice(0, colonIndex).trim()
            const response = row.content.slice(colonIndex + 1).trim()
            if (topic && response) {
              if (!topicResponses[topic]) {
                topicResponses[topic] = []
              }
              topicResponses[topic].push(response)
            }
          }
        }
      }

      return topicResponses
    } catch (error) {
      console.error("Error fetching topic responses:", error)
      return {}
    }
  }

  const saveMessages = async (chatId: number, messages: Message[]) => {
    const placeholders = messages.map(() => '(?, ?, ?)').join(',')
    const args = messages.map((m) => [m.role, m.content, chatId]).flat()

    return await turso.execute({
      sql: `INSERT INTO messages (role, content, chat_id) VALUES ${placeholders}`,
      args,
    })
  }

  const saveTopicResponse = async (chatId: number, topic: string, response: string) => {
    return await turso.execute({
      sql: `INSERT INTO messages (role, content, chat_id) VALUES (?, ?, ?)`,
      args: ['assistant', `${topic}: ${response}`, chatId],
    })
  }

  return {
    getMessages,
    getTopicResponses,
    saveMessages,
    saveTopicResponse,
  }
}
