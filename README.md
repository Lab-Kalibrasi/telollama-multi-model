
# Telollama

Telollama is a fun Telegram bot project built with [Deno](https://deno.land) and utilizes [Ollama](https://ollama.ai) to enhance its functionality. The bot is designed for entertainment and interactive conversations with Telegram users, using the default Ollama model `gemma2:2b`.

## Features

- 🤖 **Telegram Bot Integration**: Connects seamlessly with Telegram using [Telegram Bot API](https://core.telegram.org/bots/api).
- 💬 **Ollama AI Integration**: Uses Ollama for generating fun and intelligent responses.

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/radyakaze/telollama.git
   cd telollama
   ```

2. Create a new Telegram bot using [BotFather](https://t.me/botfather).

  - Open [BotFather](https://t.me/botfather) on Telegram.
  - Follow the instructions to create a new bot and get your bot token.

3. Set up your environment variables by creating a `.env` file and adding your Telegram bot token and Ollama model (optional):

   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   OLLAMA_MODEL=gemma2:2b  # Change this to use a different Ollama model
   ```

4. Start the bot in development mode:

   ```bash
   deno task dev
   ```

## Usage

1. Add the bot to your Telegram app by searching for the bot username.
2. Start chatting with the bot to see the magic of Ollama's AI in action, powered by the `gemma2:2b` model (or another model if you set it in the `.env` file).

## Changing the Ollama Model

To change the default Ollama model, modify the `OLLAMA_MODEL` variable in your `.env` file. For example:

```env
OLLAMA_MODEL=another_model_name
```

This allows you to experiment with different AI models depending on your use case.


## Technologies Used

- [Deno](https://deno.land/) - A modern runtime for JavaScript and TypeScript
- [Telegram Bot API](https://core.telegram.org/bots/api) - For creating the bot
- [Ollama AI](https://ollama.ai) - AI platform using the `gemma2:2b` model for generating responses

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue to improve Telollama.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
