#!/usr/bin/env node
require("dotenv").config();
const { Telegraf, Telegram, Markup } = require("telegraf");
const { message } = require("telegraf/filters");
const { getClients } = require("./modules/clients/clients");
const { formatMessage } = require("./modules/fmt/fmt");

const bot = new Telegraf(process.env.BOT_TOKEN);
const telegram = new Telegram(process.env.BOT_TOKEN);

bot.use(Telegraf.log());

let state = {
  chatId: process.env.TELEGRAM_CHAT_ID,
};

bot.start(async (ctx) => {
  await ctx.reply("Welcome");
  return await ctx.reply(
    "Select filters",
    Markup.keyboard([["1 room", "2 rooms", "3 rooms", "4 rooms"]])
      .oneTime()
      .resize()
  );
});

bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.on(message("sticker"), (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

bot.hears(/^(\d+) rooms?$/, async (ctx) => {
  const rooms = ctx.match[1];
  await getHomeList(ctx.chat.id, { rooms });
});

// bot.on(message("text"), async (ctx) => {
//   console.log(ctx.message.chat.id);
//   state.chatId = ctx.chat.id;
//   // Explicit usage
//   // await ctx.telegram.sendMessage(ctx.message.chat.id, `Hello ${ctx.state.role}`);

//   await getHomeList(ctx.chat.id);

//   // Using context shortcut
//   // await ctx.reply(`Hello ${ctx.state.role}`);
// });

bot.launch(onLaunch);

async function onLaunch() {
  if (state.chatId) {
    // telegram.sendMessage(state.chatId, "hello from start");
  }
  // await getHomeList(state.chatId);
}

async function getHomeList(chatId, filter = {}) {
  const clients = getClients();
  let homes = [];
  for (const client of clients) {
    let clientHomes = await client.list();
    if (!clientHomes || !clientHomes.length) {
      continue;
    }

    // console.log(homes);
    if (filter.rooms) {
      clientHomes = clientHomes.filter((h) => h.rooms >= filter.rooms);
    }
    homes.push(...clientHomes);
  }

  if (homes.length === 0) {
    telegram.sendMessage(chatId, "No apartments found with given criteria");
  }

  for (let i = 0; i < homes.length; i++) {
    const home = homes[i];
    if (home.imageUrl) {
      await telegram.sendPhoto(chatId, home.imageUrl, {
        caption: formatMessage(home),
        parse_mode: "MarkdownV2",
      });
    } else {
      await telegram.sendMessage(chatId, formatMessage(home), { parse_mode: "MarkdownV2" });
    }
  }
}

const onSIGINT = () => {
  console.log("SIGINT");
  bot.stop("SIGINT");
};

const onSIGTERM = () => {
  console.log("SIGTERM");
  bot.stop("SIGTERM");
};

// Enable graceful stop
process.once("SIGINT", onSIGINT);
process.once("SIGTERM", onSIGTERM);
