# Telollama Multi Model Plus

Telollama is an engaging Telegram bot built with [Deno](https://deno.land) that uses [OpenRouter](https://openrouter.ai/) to access various AI models. The bot features a dynamic female tsundere personality for fun and engaging conversations.

![Tellolama Demo](tellolama-demo.png)

[Try the Telegram Bot Demo](https://t.me/nekocharm_99_bot)

## Key Features

- 🤖 Seamless Telegram integration using [Telegram Bot API](https://core.telegram.org/bots/api)
- 🧠 Multiple AI models via OpenRouter (Meta's Llama, Mistral AI, Google's Gemma)
- 👩 Dynamic tsundere personality with evolving emotions and behaviors
- 🎭 Advanced emotion system affecting responses and language model parameters
- 🧬 Context-aware responses with memory of key conversation points
- 🇮🇩 Responds in Bahasa Indonesia
- 🎛️ Adaptive conversation flow based on topics, preferences, and dynamic parameters
- 🎨 Diverse personality traits and response templates

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/ceroberoz/telollama-multi-model.git
   cd telollama-multi-model
   ```

2. Set up your `.env` file with necessary credentials:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   OPENROUTER_API_KEY=your_openrouter_api_key
   DATABASE_URL=your_database_url
   DATABASE_API_TOKEN=your_database_api_token
   YOUR_SITE_URL=your_site_url
   YOUR_SITE_NAME=your_site_name
   ```

3. Run the bot:
   ```bash
   deno run -A --unstable-kv ./src/main.ts
   ```

## Advanced Features

- Dynamic adjustment of language model parameters based on emotional state
- Adaptive tsundere level affecting openness and response style
- Enhanced topic memory for contextually relevant interactions
- User preference analysis for personalized conversations
- Nuanced emotion transitions

## Technologies

- [Deno](https://deno.land/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [OpenRouter](https://openrouter.ai/)
- [Turso](https://turso.tech/) for database storage

## Contributing

Contributions are welcome! Feel free to submit pull requests or open issues.

## License

This project is licensed under the MIT License.
