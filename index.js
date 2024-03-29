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
  filters: {
    rooms: 3,
    price: 12000,
    size: 80,
  },
  fetched: {},
};

bot.start(async (ctx) => {
  await ctx.reply("Welcome");
  return await ctx.reply(
    "Select actions",
    Markup.keyboard([["Show apartments", "Filters", "Reset"]])
      .oneTime()
      .resize()
  );
});

bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.on(message("sticker"), (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

bot.command("reset", (ctx) => {
  state.fetched = {};
  ctx.reply("State reset");
});

bot.hears("Show apartments", async (ctx) => {
  await getHomeList(ctx.chat.id, state.filters);
});

bot.hears("Filters", async (ctx) => {
  return showFilters(ctx);
});

bot.hears("Reset", async (ctx) => {
  state.fetched = {};
});

bot.command("filters", (ctx) => {
  return showFilters(ctx);
});

function showFilters(ctx) {
  return ctx.reply("Select desired parameters", {
    parse_mode: "MarkdownV2",
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback("1 room", `{"rooms":1}`),
        Markup.button.callback("2", `{"rooms":2}`),
        Markup.button.callback("3", `{"rooms":3}`),
        Markup.button.callback("4 or more", `{"rooms":4}`),
      ],
      [Markup.button.callback("10 000 kr", `{"price":10000}`), Markup.button.callback("15 000 kr", `{"price":15000}`)],
      [
        Markup.button.callback("Queue < 2 years", `{"queueMin":2}`),
        Markup.button.callback("< 5 years", `{"queueMin":5}`),
        Markup.button.callback("< 10 years", `{"queueMin":10}`),
      ],
    ]),
  });
}

bot.action(/.+/, (ctx) => {
  const data = JSON.parse(ctx.match[0]);
  if (data) {
    state.filters = { ...state.filters, ...data };
    return ctx.answerCbQuery(`Filters updated with ${JSON.stringify(data)}`);
  }
});

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
  let hasFetched = false;
  for (const client of clients) {
    let clientHomes = await client.list(filter);
    if (!clientHomes || !clientHomes.length) {
      continue;
    }
    const total = clientHomes.length;
    clientHomes = filterFetchedHomes(clientHomes);
    if (clientHomes.length < total) {
      hasFetched = true;
    }
    homes.push(...clientHomes);
    saveFetchedHomes(clientHomes);
  }

  if (homes.length === 0 && hasFetched) {
    telegram.sendMessage(chatId, "No new apartments found with given criteria");
  } else if (homes.length === 0) {
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

function saveFetchedHomes(items) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    state.fetched[item.id] = true;
  }
}

function filterFetchedHomes(items = []) {
  return items.filter((item) => !state.fetched[item.id]);
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
