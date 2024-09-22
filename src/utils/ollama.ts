import { defu } from 'defu'

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OllamaOptions {
  host: string
  model: string
  stream: boolean
}

export function useOllama(options: Partial<OllamaOptions>) {
  options = defu(options, {
    host: 'http://localhost:11434',
    model: 'gemma2:2b',
    stream: false,
  })

  const chat = async (messages: OllamaMessage[]) => {
    const data = {
      model: options.model,
      messages: messages,
      stream: options.stream,
    }

    const res = await fetch(options.host + '/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      throw new Error(res.statusText)
    }

    const json = await res.json()

    return json.message.content
  }

  return {
    chat,
  }
}
