# Telollama

Telollama is an engaging Telegram bot project built with [Deno](https://deno.land) that now utilizes [OpenRouter](https://openrouter.ai/) to access various AI models. The bot embodies a tsundere personality, making for fun and dynamic conversations with Telegram users.

## Features

- 🤖 **Telegram Bot Integration**: Seamlessly connects with Telegram using [Telegram Bot API](https://core.telegram.org/bots/api).
- 🧠 **Multiple AI Models**: Utilizes OpenRouter to access various AI models, including Meta's Llama, Mistral AI, and Google's Gemma.
- 😳 **Tsundere Personality**: Implements a dynamic tsundere personality that evolves throughout the conversation.
- 🎭 **Emotion System**: Features an emotion system that affects the bot's responses, including anger.
- 🧬 **Context-Aware Responses**: Maintains conversation context for more coherent interactions.
- 💾 **Memory System**: Remembers key points from earlier in the conversation, including compliments and angry outbursts.
- 🇮🇩 **Bahasa Indonesia**: Responds in Bahasa Indonesia, catering to Indonesian users.

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/ceroberoz/telollama-multi-model.git
   cd telollama-multi-model
   ```

2. Create a new Telegram bot using [BotFather](https://t.me/botfather).

   - Open [BotFather](https://t.me/botfather) on Telegram.
   - Follow the instructions to create a new bot and get your bot token.

3. Set up your environment variables by creating a `.env` file:

   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   OPENROUTER_API_KEY=your_openrouter_api_key
   DATABASE_URL=your_database_url
   DATABASE_API_TOKEN=your_database_api_token
   YOUR_SITE_URL=your_site_url
   YOUR_SITE_NAME=your_site_name
   ```

4. Start the bot in development mode:

   ```bash
   deno run -A --unstable-kv ./src/main.ts
   ```

## Usage

Simply start a chat with the bot on Telegram. The bot will respond with a tsundere personality, gradually warming up as the conversation progresses. It can discuss topics like anime and coding, adapting its responses based on the context of the conversation. The bot can now also express anger in response to certain triggers, adding more depth to its emotional range.

## AI Models

The bot uses the following models through OpenRouter:

- Meta's Llama (llama-3-8b-instruct)
- Mistral AI (mistral-7b-instruct)
- Google's Gemma (gemma-2-9b-it)

The bot automatically selects an available model for each interaction.

## Technologies Used

- [Deno](https://deno.land/) - A modern runtime for JavaScript and TypeScript
- [Telegram Bot API](https://core.telegram.org/bots/api) - For creating the bot
- [OpenRouter](https://openrouter.ai/) - For accessing various AI models
- [Turso](https://turso.tech/) - For database storage

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue to improve Telollama.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
