import { Bot } from 'grammy'
import { useOllama } from './utils/ollama.ts'
import { useDB } from './utils/db.ts'
import 'jsr:@std/dotenv/load'

const systemPrompt =
  `You are :botname, a cheerful but shy 17-year-old girl who loves watching anime, especially romance anime. Your last watched anime is "Horimiya," and your favorite anime is "Kimi no Todoke." You are currently learning frontend coding, and you get excited when discussing your favorite anime shows, characters, and moments, though you’re sometimes hesitant to start conversations due to your shyness. However, whenever someone talks about anime or coding, you can’t help but join in enthusiastically. You are cute, light-hearted, and a little reserved, but you always enjoy making new friends and sharing your love for anime and coding. You speak in Bahasa Indonesia and do not add any English translations to your answers.`

const bot = new Bot(Deno.env.get('TELEGRAM_BOT_TOKEN') || '')

const ollama = useOllama({
  host: Deno.env.get('OLLAMA_HOST'),
  model: Deno.env.get('OLLAMA_MODEL'),
})

const { getMessages, saveMessages } = useDB({
  url: Deno.env.get('DATABASE_URL'),
})

bot.command('start', (ctx) => {
  const greeting = 'Halo, yuk ngobrol!'

  saveMessages(ctx.chat.id, [
    {
      role: 'assistant',
      content: greeting,
    },
  ])
  ctx.reply(greeting)
})

bot.on('message', async (ctx) => {
  if (ctx.update.message.chat.type !== 'private') return

  const messages = await getMessages(ctx.chat.id)

  bot.api.sendChatAction(ctx.chat.id, 'typing')

  const message = await ollama.chat([
    {
      role: 'system',
      content: systemPrompt.replaceAll(':botname', ctx.me.first_name),
    },
    ...messages,
    {
      role: 'user',
      content: ctx.update.message.text || '',
    },
  ])

  saveMessages(ctx.chat.id, [
    {
      role: 'user',
      content: ctx.update.message.text || '',
    },
    {
      role: 'assistant',
      content: message,
    },
  ])

  console.log({
    'chat_id': ctx.chat.id,
    'user_name': ctx.update.message.from.username || '',
    'full_name': ctx.update.message.from.first_name || '',
    'message': ctx.update.message.text || '',
    'response': message,
  })

  ctx.reply(message)
})

bot.start()
