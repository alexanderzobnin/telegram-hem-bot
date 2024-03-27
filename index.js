#!/usr/bin/env node
const { Telegraf, Telegram } = require("telegraf");
const { message } = require("telegraf/filters");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const telegram = new Telegram(process.env.BOT_TOKEN);

let state = {
  chatId: process.env.TELEGRAM_CHAT_ID,
};

bot.start((ctx) => ctx.reply("Welcome"));
bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.on(message("sticker"), (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

bot.on(message("text"), async (ctx) => {
  state.chatId = ctx.chat.id;
  // Explicit usage
  await ctx.telegram.sendMessage(
    ctx.message.chat.id,
    `Hello ${ctx.state.role}`
  );

  // Using context shortcut
  // await ctx.reply(`Hello ${ctx.state.role}`);
});

bot.launch(onLaunch);

function onLaunch() {
  telegram.sendMessage(state.chatId, "hello from start");
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
