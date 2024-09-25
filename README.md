# Telollama Multi Model Plus

Telollama is an engaging Telegram bot project built with [Deno](https://deno.land) that now utilizes [OpenRouter](https://openrouter.ai/) to access various AI models. The bot embodies a female tsundere personality, making for fun and dynamic conversations with Telegram users.

![Tellolama Demo](tellolama-demo.png)

[Click here for Telegram Bot Demo](https://t.me/nekocharm_99_bot)

## Features

- 🤖 **Telegram Bot Integration**: Seamlessly connects with Telegram using [Telegram Bot API](https://core.telegram.org/bots/api).
- 🧠 **Multiple AI Models**: Utilizes OpenRouter to access various AI models, including Meta's Llama, Mistral AI, and Google's Gemma.
- 👩 **Female Tsundere Personality**: Implements a dynamic female tsundere personality that evolves throughout the conversation.
- 🎭 **Advanced Emotion System**: Features a sophisticated emotion system that affects the bot's responses and language model parameters.
- 🧬 **Context-Aware Responses**: Maintains conversation context for more coherent and personalized interactions.
- 💾 **Enhanced Memory System**: Remembers key points from earlier in the conversation, including compliments, angry outbursts, and mentioned topics.
- 🇮🇩 **Bahasa Indonesia**: Responds in Bahasa Indonesia, catering to Indonesian users.
- 🎛️ **Dynamic Parameter Adjustment**: Automatically adjusts language model parameters based on the bot's current emotional state.

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

   Start a chat with the bot on Telegram. The bot will respond with a female tsundere personality, dynamically adjusting its behavior based on the conversation context and its emotional state. It can discuss various topics, with a particular interest in anime and coding. The bot's responses will vary in unpredictability and topic consistency depending on whether it's in a "tsun" (more erratic) or "dere" (more consistent) state.

   ## AI Models

   The bot uses the following models through OpenRouter:

   - Meta's Llama (llama-3-8b-instruct)
   - Mistral AI (mistral-7b-instruct)
   - Google's Gemma (gemma-2-9b-it)

   The bot automatically selects an available model for each interaction and adjusts parameters like temperature and presence penalty based on its current emotional state.

   ## Technologies Used

   - [Deno](https://deno.land/) - A modern runtime for JavaScript and TypeScript
   - [Telegram Bot API](https://core.telegram.org/bots/api) - For creating the bot
   - [OpenRouter](https://openrouter.ai/) - For accessing various AI models
   - [Turso](https://turso.tech/) - For database storage

   ## Advanced Features

   - **Dynamic Emotional Parameters**: The bot adjusts its language model parameters (temperature and presence penalty) based on its current emotional state, resulting in more varied and context-appropriate responses.
   - **Personality Trait System**: Incorporates random personality traits into each interaction, adding depth to the bot's character.
   - **Adaptive Tsundere Level**: The bot's tsundere level changes throughout the conversation, affecting its openness and response style.
   - **Topic Memory**: Keeps track of mentioned anime and coding topics for more contextually relevant future interactions.

   ## Contributing

   Contributions are welcome! Feel free to submit a pull request or open an issue to improve Telollama.

   ## License

   This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
