# Telollama Multi Model Plus

Telollama is an engaging Telegram bot project built with [Deno](https://deno.land) that utilizes [OpenRouter](https://openrouter.ai/) to access various AI models. The bot embodies a female tsundere personality, making for fun and dynamic conversations with Telegram users.

![Tellolama Demo](tellolama-demo.png)

[Click here for Telegram Bot Demo](https://t.me/nekocharm_99_bot)

## Features

- 🤖 **Telegram Bot Integration**: Seamlessly connects with Telegram using [Telegram Bot API](https://core.telegram.org/bots/api).
- 🧠 **Multiple AI Models**: Utilizes OpenRouter to access various AI models, including Meta's Llama, Mistral AI, and Google's Gemma.
- 👩 **Dynamic Tsundere Personality**: Implements a female tsundere character with evolving emotions and behaviors.
- 🎭 **Advanced Emotion System**: Features a sophisticated emotion system that affects responses and language model parameters.
- 🧬 **Context-Aware Responses**: Maintains conversation context and remembers key points for personalized interactions.
- 🇮🇩 **Bahasa Indonesia**: Responds in Bahasa Indonesia, catering to Indonesian users.
- 🎛️ **Adaptive Conversation Flow**: Tracks recent topics, user preferences, and adjusts language model parameters dynamically.
- 🎨 **Diverse Personality Traits**: Incorporates a wide range of traits and response templates for varied interactions.

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/ceroberoz/telollama-multi-model.git
   cd telollama-multi-model
   ```

2. Create a new Telegram bot using [BotFather](https://t.me/botfather) and get your bot token.

3. Set up your environment variables in a `.env` file:

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
   deno run ./src/main.ts
   ```

## Usage

Start a chat with the bot on Telegram. The bot will respond with a female tsundere personality, dynamically adjusting its behavior based on the conversation context, emotional state, and user preferences.

## AI Models

The bot uses the following models through OpenRouter:

- Meta's Llama (llama-3-8b-instruct)
- Mistral AI (mistral-7b-instruct)
- Google's Gemma (gemma-2-9b-it)

## Technologies Used

- [Deno](https://deno.land/) - A modern runtime for JavaScript and TypeScript
- [Telegram Bot API](https://core.telegram.org/bots/api) - For creating the bot
- [OpenRouter](https://openrouter.ai/) - For accessing various AI models
- [Turso](https://turso.tech/) - For database storage

## Advanced Features

- **Dynamic Emotional Parameters**: Adjusts language model parameters based on emotional state.
- **Adaptive Tsundere Level**: Changes openness and response style throughout the conversation.
- **Enhanced Topic Memory**: Tracks mentioned topics for contextually relevant interactions.
- **User Preference Analysis**: Remembers and tailors conversations to user's favorite topics.
- **Emotion Transition Refinement**: Implements nuanced transitions between emotional states.

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue to improve Telollama.

## License

This project is licensed under the MIT License
