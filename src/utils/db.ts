import { type Config, createClient } from '@libsql/client/node'
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
      sql:
        `SELECT role, content FROM messages WHERE chat_id = :chatId ORDER BY created_at ASC`,
      args: { chatId },
    })

    return data.rows as unknown as OllamaMessage[]
  }

  const saveMessages = async (
    chatId: number,
    messages: OllamaMessage[],
  ) => {
    const placeholders = messages.map(() => '(?, ?, ?)').join(',')
    const args = messages.map((m) => [m.role, m.content, chatId]).flat()

    return await turso.execute({
      sql:
        `INSERT INTO messages (role, content, chat_id) VALUES ${placeholders}`,
      args,
    })
  }

  return {
    getMessages,
    saveMessages,
  }
}
