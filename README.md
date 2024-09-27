# Telollama Multi Model Plus

Hey there! Welcome to Telollama, a fun Telegram bot that acts like Asuka from Neon Genesis Evangelion. It uses different AI models to chat with you in a tsundere style. Cool, right?

![Tellolama Demo](tellolama-demo.png)

[Try it out on Telegram!](https://t.me/nekocharm_99_bot)

## What's Special About Telollama?

- It works on Telegram, so it's easy to use
- It uses different AI models to keep things interesting
- Its personality changes as you talk to it
- It remembers what you've talked about before
- It only speaks in Bahasa Indonesia (for now)
- It adjusts how it talks based on your conversation
- It learns about different topics and uses that knowledge later
- It can switch between AI models if one isn't working well
- Its language style changes with its mood

## What's New?

We've added lots of cool stuff recently:
1. It's better at following topics and understanding mood
2. It can sum up conversations better
3. Its responses are more dynamic and interesting
4. It stays in character more consistently
5. Its personality changes slowly during long chats
6. It handles errors better, so it doesn't break as easily
7. It can spot topics and important words in your messages
8. It can guess how you're feeling
9. It has special responses for certain topics
10. It forgets old stuff over time, just like a real person
11. It handles user and chat info better
12. It's better at dealing with API problems
13. It's smarter about switching between AI models
14. It changes how long its responses are based on your messages
15. It has special reactions to certain topics

## How Does It Work?

Telollama is pretty clever! Here's a simple breakdown:

1. You send a message to the bot on Telegram
2. The bot thinks about your message and picks the best AI to respond
3. The AI creates a response, and the bot sends it back to you

There's a lot happening behind the scenes:
- The bot checks the conversation history
- It picks the best AI model to use
- It generates a response and tweaks it to sound more like Asuka
- It saves the conversation for later

Want to know more? Check out our [FAQ](FAQ-MULTI-MODEL.md) for all the techy details!

## Want to Try It Yourself?

1. Copy this project to your computer
2. Install a program called Deno
3. Set up a file called `.env` with your API keys
4. Install the stuff the bot needs
5. Start the bot!

Need more help? Just ask, and we'll guide you through it!

## For Developers

To run the bot while you're working on it:

```bash
deno run --watch --allow-net --allow-env --allow-read ./src/main.ts
```

## What We Use

- Deno (it's like Node, but cooler)
- Telegram Bot API
- OpenRouter
- Google AI
- Turso database
- Ollama (if you want to use it)

## Want to Help?

We'd love your help to make Telollama even better! Feel free to tell us about problems, suggest new features, or even add new stuff yourself.

## Can I Use This?

Sure! This project uses the MIT License. That means you can pretty much do what you want with it, as long as you include the license file. Check out the LICENSE file for the boring legal stuff.
