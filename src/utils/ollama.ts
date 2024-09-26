// src/utils/ollama.ts

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
    model: 'llama3.2',
    stream: false,
  })

  const chat = async (messages: OllamaMessage[]) => {
    try {
      const data = {
        model: options.model,
        messages: messages,
        stream: options.stream,
      }

      console.log(`Sending request to Ollama: ${options.host}/api/chat`);
      console.log('Request data:', JSON.stringify(data, null, 2));

      const res = await fetch(options.host + '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Ollama API error: ${res.status} ${res.statusText}`);
        console.error('Error details:', errorText);
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }

      const json = await res.json()
      console.log('Ollama response:', JSON.stringify(json, null, 2));

      if (!json.message || !json.message.content) {
        console.error('Unexpected Ollama response format:', json);
        throw new Error('Unexpected response format from Ollama');
      }

      return json.message.content
    } catch (error) {
      console.error('Error in Ollama chat:', error);
      throw error;
    }
  }

  const generate = async (prompt: string) => {
    try {
      const data = {
        model: options.model,
        prompt: prompt,
        stream: options.stream,
      }

      console.log(`Sending generate request to Ollama: ${options.host}/api/generate`);
      console.log('Generate request data:', JSON.stringify(data, null, 2));

      const res = await fetch(options.host + '/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Ollama API error: ${res.status} ${res.statusText}`);
        console.error('Error details:', errorText);
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }

      const json = await res.json()
      console.log('Ollama generate response:', JSON.stringify(json, null, 2));

      if (!json.response) {
        console.error('Unexpected Ollama generate response format:', json);
        throw new Error('Unexpected response format from Ollama generate');
      }

      return json.response
    } catch (error) {
      console.error('Error in Ollama generate:', error);
      throw error;
    }
  }

  const healthCheck = async (): Promise<boolean> => {
    try {
      const res = await fetch(options.host + '/api/version', {
        method: 'GET',
      })

      if (!res.ok) {
        console.error(`Ollama health check failed: ${res.status} ${res.statusText}`);
        return false;
      }

      const json = await res.json()
      console.log('Ollama health check response:', JSON.stringify(json, null, 2));

      return true;
    } catch (error) {
      console.error('Error in Ollama health check:', error);
      return false;
    }
  }

  return {
    chat,
    generate,
    healthCheck,
  }
}
