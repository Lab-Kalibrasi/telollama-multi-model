# Telollama Multi Model Plus

Telollama is a sophisticated Telegram bot that emulates the persona of Asuka Langley Soryu from Neon Genesis Evangelion. It utilizes multiple AI models to generate engaging, dynamic conversations with a tsundere personality.

![Tellolama Demo](tellolama-demo.png)

[Try the Telegram Bot](https://t.me/nekocharm_99_bot)

## Main Features

- Seamless integration with Telegram
- Multi-model AI support (OpenRouter, Google AI, and local Ollama)
- Dynamic personality system with emotional states (tsundere, angry, shy, etc.)
- Context-aware conversation memory
- Responds exclusively in Bahasa Indonesia
- Adaptive response generation based on conversation flow and user interaction
- Topic-specific response storage and retrieval
- Intelligent model switching for enhanced reliability
- Mood-based language adaptation

## Recent Enhancements

1. **Enhanced Conversation Context Tracking:**
   - Implemented a `ConversationContext` class for improved tracking of conversation topics, entities, and sentiment
   - Maintains a history of user preferences and conversation themes

2. **Improved Conversation Summarization:**
   - Enhanced `summarizeConversation` function to create more detailed summaries
   - Includes recent topics, key phrases, and overall sentiment analysis

3. **Dynamic Prompt Generation:**
   - Incorporates conversation context, recent emotions, key points, and suggested topics into AI prompts
   - Results in more contextually appropriate and engaging responses

4. **Post-Processing of Responses:**
   - Ensures responses maintain the tsundere character
   - Adds follow-up questions to encourage continued conversation

5. **Adaptive Personality Management:**
   - Implements subtle changes in Asuka's personality based on conversation length and user interactions
   - Gradual adjustments to tsundere level for more natural character development

6. **Enhanced Error Handling and Retry Mechanism:**
   - Implemented a retry function for API calls to handle temporary failures
   - Improved logging for better debugging and error tracking

7. **Improved Topic and Entity Extraction:**
   - Basic implementation of topic and entity extraction from messages
   - Lays groundwork for more sophisticated NLP techniques in future updates

8. **Sentiment Analysis Integration:**
   - Basic sentiment analysis to gauge the emotional tone of messages
   - Influences the bot's emotional responses and conversation flow

9. **Conversation Hooks and Interruptions:**
   - Expanded system of conversation hooks for character-specific responses
   - Implemented an interruption mechanism for more dynamic conversations

10. **Decay Mechanism for User Preferences:**
    - Implemented a system to gradually decay old information in user preferences
    - Ensures the conversation remains relevant to recent interactions

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
   OPENROUTER_API_KEY_A=your_openrouter_api_key_a
   OPENROUTER_API_KEY_B=your_openrouter_api_key_b
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

## Advanced Features

- **Enhanced Context Memory:** Tracks and utilizes a more comprehensive conversation history, including topics, entities, and sentiment.
- **Dynamic Conversation Summarization:** Creates detailed summaries of recent conversations to inform AI responses.
- **Adaptive Personality System:** Adjusts the bot's personality and tsundere level based on conversation length and user interactions.
- **Sentiment-Aware Responses:** Incorporates basic sentiment analysis to tailor the emotional tone of responses.
- **Entity and Topic Extraction:** Basic implementation for identifying key topics and entities in conversations.
- **Information Decay Mechanism:** Gradually reduces the influence of older conversation topics and user preferences.

## Technical Details

- **ConversationContext Class:** Manages and updates detailed conversation context over time.
- **Enhanced Prompt Engineering:** Dynamically generates AI prompts incorporating recent conversation context and suggested topics.
- **Post-Processing Pipeline:** Ensures generated responses align with the character's personality and adds engagement elements.
- **Basic NLP Integration:** Incorporates simple topic extraction, entity recognition, and sentiment analysis techniques.

## Tools and Technologies

- **Deno:** A secure runtime for JavaScript and TypeScript
- **Telegram Bot API:** For bot communication and interaction
- **OpenRouter:** Provides access to various large language models
- **Google AI:** Offers the Gemini Pro model as a fallback option
- **Turso:** SQLite database for persistent storage
- **Ollama:** Optional local AI model for additional fallback support

## Contributing

We welcome contributions to improve Telollama! Feel free to submit issues, feature requests, or pull requests. Please adhere to our coding standards and provide clear documentation for your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
