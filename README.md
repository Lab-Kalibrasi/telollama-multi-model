# Telollama Multi Model Plus

Telollama is a Telegram bot that uses multiple AI models to create fun conversations. It acts like Asuka from Neon Genesis Evangelion, with a tsundere personality.

![Tellolama Demo](tellolama-demo.png)

[Try the Telegram Bot](https://t.me/nekocharm_99_bot)

## Main Features

- Works with Telegram
- Uses different AI models (OpenRouter and Google AI)
- Has a changing personality that can be happy, angry, or shy
- Remembers parts of conversations
- Responds in Bahasa Indonesia
- Changes how it talks based on the conversation
- Stores special responses for different topics
- Switches to a different AI if one stops working
- Adjusts its language based on its mood

## What It Can Do

- Acts like Asuka from Evangelion
- Changes its answers based on its mood
- Remembers past talks about Eva and piloting
- Keeps track of what topics the user is good at
- Makes special responses for each chat
- Handles many topics with saved responses
- Avoids repeating itself
- Keeps a record of each chat for checking later

## How to Start

1. Clone the project repository:
   ```bash
   git clone https://github.com/ceroberoz/telollama-multi-model.git
   cd telollama-multi-model
   ```

2. Install Deno:
   Follow the instructions at https://deno.land/#installation to install Deno for your operating system.

3. Create a `.env` file in the project root with your credentials:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   OPENROUTER_API_KEY=your_openrouter_api_key
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   DATABASE_URL=your_database_url
   DATABASE_API_TOKEN=your_database_api_token
   YOUR_SITE_URL=your_site_url
   YOUR_SITE_NAME=your_site_name
   ```

4. Install project dependencies:
   ```bash
   deno cache ./src/main.ts
   ```

5. Start the bot:
   ```bash
   deno run --allow-net --allow-env --allow-read ./src/main.ts
   ```

   Note: The `--allow-net`, `--allow-env`, and `--allow-read` flags grant necessary permissions to the script. Adjust these as needed based on your security requirements.

6. Your bot should now be running and responding to messages on Telegram.

## Development

To run the bot in development mode with file watching:

```bash
deno run --watch --allow-net --allow-env --allow-read ./src/main.ts
```

This will automatically restart the bot when you make changes to the source files.

## Cool Extras

- Changes how it talks based on its mood
- Acts more or less friendly depending on the chat
- Remembers topics better for more natural talks
- Learns what the user likes for better chats
- Slowly changes its mood
- Uses a backup AI if the first one doesn't work

## Tools Used

- Deno
- Telegram Bot API
- OpenRouter
- Google AI
- Turso for saving data

## Want to Help?

Feel free to suggest changes or report problems by opening an issue or submitting a pull request!

## License

This project uses the MIT License.
