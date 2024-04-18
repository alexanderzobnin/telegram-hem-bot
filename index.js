#!/usr/bin/env node
require("dotenv").config();
const { Telegraf, Telegram, Markup } = require("telegraf");
// const { message } = require("telegraf/filters");
const { getClients } = require("./modules/clients/clients");
const { formatMessage } = require("./modules/fmt/fmt");

const bot = new Telegraf(process.env.BOT_TOKEN);
const telegram = new Telegram(process.env.BOT_TOKEN);
bot.use(Telegraf.log());

const defaultState = () => ({
  filters: {
    rooms: 3,
    price: 13000,
    size: 70,
    queueMin: 2,
    distance: 12,
  },
  fetched: {},
});

let state = {};

function getState(ctx) {
  const chatId = ctx.chat.id;
  if (!state[chatId]) {
    state[chatId] = defaultState();
  }
  return state[chatId];
}

bot.use(async (ctx, next) => {
  await next();
});

bot.start(async (ctx) => {
  await ctx.reply("Welcome to hembot! 🏡");
  return await ctx.reply(
    "Select actions",
    Markup.keyboard([
      ["Show apartments", "Filters"],
      ["Reset filters", "Reset cache"],
    ])
      .oneTime()
      .resize()
  );
});

bot.hears("hi", (ctx) => ctx.reply("Hey there"));
bot.help((ctx) => ctx.reply("Send me a sticker"));

bot.command("reset", (ctx) => {
  state.fetched = {};
  ctx.reply("State reset");
});

bot.command("show", async (ctx) => {
  await getHomeList(ctx);
});

bot.hears("Show apartments", async (ctx) => {
  await getHomeList(ctx);
});

bot.hears("Filters", async (ctx) => {
  return showFilters(ctx);
});

bot.hears("Reset cache", async (ctx) => {
  state.fetched = {};
});

bot.hears("Reset filters", async (ctx) => {
  state.filters = {};
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
      [
        Markup.button.callback("Distance", "0"),
        Markup.button.callback("any", `{"distance":0}`),
        Markup.button.callback("10 km", `{"distance":10}`),
        Markup.button.callback("12", `{"distance":12}`),
        Markup.button.callback("15", `{"distance":15}`),
      ],
    ]).resize(),
  });
}

bot.action(/.+/, (ctx) => {
  if (!ctx.match[0]) {
    return;
  }
  const data = JSON.parse(ctx.match[0]);
  if (data) {
    state.filters = { ...state.filters, ...data };
    return ctx.answerCbQuery(`Filters updated with ${JSON.stringify(data)}`);
  }
});

bot.launch(onLaunch);

const HOUR = 1000 * 60 * 60;
async function onLaunch() {
  // for (const chatId in state) {
  //   if (Object.hasOwnProperty.call(state, chatId)) {
  //     const clientState = state[chatId];
  //     setInterval(async () => {
  //       try {
  //         await getHomeList(chatId, { silent: true });
  //       } catch (error) {
  //         console.error(error);
  //       }
  //     }, HOUR);
  //   }
  // }
}

async function onStart(ctx) {
  const chatId = ctx.chat.id;
  if (!state[chatId]) {
    state[chatId] = defaultState();
  }

  await ctx.reply("Welcome to hembot! 🏡");
  return await ctx.reply(
    "Select actions",
    Markup.keyboard([
      ["Show apartments", "Filters"],
      ["Reset filters", "Reset cache"],
    ])
      .oneTime()
      .resize()
  );
}

function setChatId(ctx) {
  state.chatId = ctx.chat.id;
}

async function getHomeList(ctx, options = {}) {
  const chatId = ctx.chat.id;
  const clientState = getState(ctx);
  const filter = clientState.filters;
  if (!chatId) {
    console.log("chat id not set, skip");
    return;
  }

  const clients = getClients();
  let homes = [];
  let hasFetched = false;
  for (const client of clients) {
    let clientHomes = await client.list(filter);
    if (!clientHomes || !clientHomes.length) {
      continue;
    }
    const total = clientHomes.length;
    clientHomes = filterFetchedHomes(clientState, clientHomes);
    if (clientHomes.length < total) {
      hasFetched = true;
    }
    homes.push(...clientHomes);
    saveFetchedHomes(clientState, clientHomes);
  }

  if (homes.length === 0) {
    console.log("No apartments found with given criteria");
  }
  if (homes.length === 0 && hasFetched && !options.silent) {
    telegram.sendMessage(chatId, "No new apartments found with given criteria");
  } else if (homes.length === 0 && !options.silent) {
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
      await telegram.sendMessage(chatId, formatMessage(home), {
        parse_mode: "MarkdownV2",
      });
    }
  }
}

function saveFetchedHomes(clientState, items) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    clientState.fetched[item.id] = true;
  }
}

function filterFetchedHomes(clientState, items = []) {
  return items.filter((item) => !clientState.fetched[item.id]);
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
