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

1. **Enhanced Context Memory:**
   - Improved tracking of conversation topics, mentioned characters, and important points
   - Maintains a history of emotional transitions for more coherent personality shifts

2. **Dynamic Personality Shifts:**
   - Subtle changes in Asuka's personality based on conversation length and user interactions
   - Gradual adjustments to tsundere level for more natural character development

3. **Conversation Hooks:**
   - Special responses triggered by specific topics or phrases
   - Enhances character consistency and adds depth to interactions

4. **Adaptive Response Length:**
   - Dynamically adjusts response length based on user input
   - Ensures more balanced and natural conversation flow

5. **Emotion Transition System:**
   - Implements gradual transitions between emotional states
   - Prevents abrupt mood changes for a more realistic personality

6. **Topic Chaining:**
   - Intelligent system for suggesting related topics
   - Enables more natural topic transitions and extended conversations

7. **Dynamic Prompt Generation:**
   - Incorporates recent emotional changes, key points, and suggested topics into AI prompts
   - Results in more contextually appropriate and engaging responses

8. **Interruption Mechanism:**
   - Occasionally interrupts the conversation flow with character-appropriate interjections
   - Adds spontaneity and realism to Asuka's behavior

9. **Multi-API Key Support:**
   - Rotates through multiple API keys for OpenRouter models
   - Enhances reliability and manages rate limits more effectively

10. **Fallback Model Hierarchy:**
    - Implements a prioritized fallback system (OpenRouter -> Google AI -> Local Ollama)
    - Ensures continuous operation even if primary models are unavailable

11. **Improved Error Handling:**
    - Enhanced logging for better debugging and error tracking
    - Implemented retry mechanism for API calls to handle temporary failures

12. **Ollama Integration:**
    - Added support for local Ollama models as an additional fallback option
    - Improved health checks for Ollama to ensure reliable operation

13. **Dynamic Conversation Memory:**
    - Updated context memory to include recent topics, characters, and important points
    - Utilizes this information to generate more coherent and context-aware responses

14. **Enhanced Personality Traits:**
    - Expanded the list of personality traits for more varied character expression
    - Improved integration of personality traits into response generation

15. **Topic-Specific Responses:**
    - Implemented a system to store and retrieve topic-specific responses
    - Enhances the bot's ability to maintain consistent knowledge about various subjects

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

- **Tsundere Level Adjustment:** The bot's tsundere behavior adapts based on user interactions, compliments received, and insults detected.
- **Performance Tracking:** Monitors user's performance in various topics, influencing future interactions.
- **Dynamic Conversation Hooks:** Triggers special responses for mentions of key characters or concepts from Neon Genesis Evangelion.
- **Adaptive Max Tokens:** Adjusts the maximum token length for responses based on the length of user messages.
- **Emotion Spectrum:** Implements a nuanced emotion system with gradual transitions between states.
- **Topic Chaining:** Uses a predefined topic relationship map to suggest relevant follow-up topics.
- **Interruption Generation:** Occasionally injects character-appropriate interruptions to add realism to conversations.
- **Retry Mechanism:** Implements automatic retries for API calls to handle temporary failures.

## Technical Details

- **Multi-Model Support:** Seamlessly switches between OpenRouter models, Google AI, and local Ollama based on availability and performance.
- **API Key Rotation:** Intelligently rotates through multiple OpenRouter API keys to optimize usage and handle rate limits.
- **Fallback Mechanism:** Gracefully degrades to alternative models or pre-defined responses if all AI models are unavailable.
- **Asynchronous Processing:** Utilizes asynchronous operations for improved performance and responsiveness.
- **Persistent Storage:** Uses Turso database for storing conversation history and topic-specific responses.
- **Error Handling:** Implements robust error handling and logging for easier debugging and maintenance.
- **Health Checks:** Performs regular health checks on all models to ensure system reliability.

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
