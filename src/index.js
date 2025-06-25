#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { Telegraf, Telegram, Markup } = require("telegraf");
// const { message } = require("telegraf/filters");
const { getClients } = require("./modules/clients/clients");
const { formatMessage } = require("./modules/fmt/fmt");
const { Crawler } = require("./modules/crawler");
const {
  initDefaultMetrics,
  mBotRequestCount,
  mBotErrorCount,
  mBotNewClientCount,
  mBotClients,
} = require("./modules/metrics");

const MINUTE = 1000 * 60;
const CRAWLER_DEFAULT_UDATE_INTERVAL = 1000 * 60 * 10;
const SUBSCRIBE_INTERVAL = MINUTE * 60;

const dataDir = process.env.DATA_DIR || "data";
const stateFileName = "state.json";

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
const stateFile = path.join(dataDir, stateFileName);

let envFilePath = ".env.dev";
if (process.env.NODE_ENV === "production") {
  envFilePath = ".env";
}

require("dotenv").config({ path: envFilePath });

const crawlerUpdateInterval = process.env.CRAWLER_UDATE_INTERVAL || CRAWLER_DEFAULT_UDATE_INTERVAL;

console.log("Starting application...");
console.log(`Environment is ${process.env.NODE_ENV || "development"}`);
console.debug("Using env file", envFilePath);
console.debug("Update interval (seconds):", crawlerUpdateInterval / 1000);

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

let state = {
  clients: {},
};

function getState(ctx) {
  const chatId = ctx.chat.id;
  if (!state.clients[chatId]) {
    mBotNewClientCount.inc();
    state.clients[chatId] = defaultState();
  }
  mBotClients.set(Object.keys(state.clients).length || 0);
  return state.clients[chatId];
}

bot.use(async (ctx, next) => {
  mBotRequestCount.inc();
  await next();
});

bot.start(async (ctx) => {
  await ctx.reply("Welcome to hembot! 🏡");
  return await ctx.reply(
    "Select actions",
    Markup.keyboard([
      ["Show apartments", "Filters"],
      ["Reset filters", "Reset cache", "Unsubscribe"],
    ]).resize()
  );
});

bot.help((ctx) => ctx.reply("Send me a sticker"));

bot.command("reset", (ctx) => {
  onStateReset(ctx);
});

bot.command("show", async (ctx) => {
  await getHomeList(ctx);
  await subscribe(ctx.chat.id);
});

bot.hears("Show apartments", async (ctx) => {
  await getHomeList(ctx);
  await subscribe(ctx.chat.id);
});

bot.hears(["subscribe", "sub", "s"], async (ctx) => {
  await subscribe(ctx.chat.id);
});

bot.hears(["unsubscribe", "Unsubscribe", "stop"], async (ctx) => {
  const res = await unsubscribe(ctx.chat.id);
  if (res) {
    return ctx.reply("Unsubscribed");
  }
});

bot.hears("Filters", async (ctx) => {
  return showFilters(ctx);
});

bot.hears("Reset cache", async (ctx) => {
  onStateReset(ctx);
});

bot.hears("Reset filters", async (ctx) => {
  onFiltersReset(ctx);
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
    const clientState = getState(ctx);
    clientState.filters = { ...clientState.filters, ...data };
    try {
      saveStateToFile();
    } catch (err) {
      mHttpBotErrorCount.inc();
      console.error(err);
    }
    return ctx.answerCbQuery(`Filters updated with ${JSON.stringify(data)}`);
  }
});

async function onLaunch() {
  loadStateFromFile();

  const crawler = new Crawler(crawlerUpdateInterval);
  crawler.run();

  for (const chatId in state.clients) {
    state.clients[chatId] = null;
    subscribe(chatId);
  }
}

async function onStateReset(ctx) {
  const clientState = getState(ctx);
  clientState.fetched = {};
  saveStateToFile();
  ctx.reply("State reset");
}

async function onFiltersReset(ctx) {
  const clientState = getState(ctx);
  clientState.filters = {};
  saveStateToFile();
  ctx.reply("Filters reset");
}

async function subscribe(chatId) {
  const ctx = {
    chat: { id: chatId },
  };

  if (state.clients[chatId]) {
    console.log(`client already subscribed, chat id: ${chatId}, sub id: ${state.clients[chatId]}`);
    return;
  }

  // Random delay within 10 sec interval
  const delay = Math.random() * 1000 * 10;
  setTimeout(async () => {
    fetchHomeList(ctx);
  }, delay);

  const intervalID = setInterval(async () => {
    fetchHomeList(ctx);
  }, SUBSCRIBE_INTERVAL);

  const clientState = getState(ctx);
  clientState.intervalID = Number(intervalID);
  console.log(`client ${ctx.chat.id} subscribed`);
  saveStateToFile();
}

async function fetchHomeList(ctx) {
  try {
    await getHomeList(ctx, { silent: true });
  } catch (error) {
    mHttpBotErrorCount.inc();
    console.error(error);
  }
}

async function unsubscribe(chatId) {
  if (!state.clients[chatId]) {
    console.log(`client ${chatId} is not subscribed`);
    return false;
  }

  const intervalID = state.clients[chatId].intervalID;

  if (!intervalID) {
    console.log("client is not subscribed");
    return false;
  }

  clearInterval(intervalID);
  delete state.clients[chatId];
  console.log(`client ${chatId} unsubscribed`);
  saveStateToFile();

  return true;
}

async function onStart(ctx) {
  const chatId = ctx.chat.id;
  if (!state.clients[chatId]) {
    state.clients[chatId] = defaultState();
  }

  await ctx.reply("Welcome to hembot! 🏡");
  return await ctx.reply(
    "Select actions",
    Markup.keyboard([
      ["Show apartments", "Filters"],
      ["Reset filters", "Reset cache", "Unsubscribe"],
    ]).resize()
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
    console.log(`No apartments found with given criteria for client ${chatId}`);
  }
  if (homes.length === 0 && hasFetched && !options.silent) {
    telegram.sendMessage(chatId, "No new apartments found with given criteria");
  } else if (homes.length === 0 && !options.silent) {
    telegram.sendMessage(chatId, "No apartments found with given criteria");
  }

  for (let i = 0; i < homes.length; i++) {
    const home = homes[i];
    sendMessage(telegram, chatId, home);
  }

  saveStateToFile();
}

async function sendMessage(telegram, chatId, home) {
  if (home.imageUrl) {
    try {
      await telegram.sendPhoto(chatId, home.imageUrl, {
        caption: formatMessage(home),
        parse_mode: "MarkdownV2",
      });
      return;
    } catch (error) {
      console.error(error);
    }
  }

  try {
    await telegram.sendMessage(chatId, formatMessage(home), {
      parse_mode: "MarkdownV2",
    });
  } catch (error) {
    console.error(error);
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

function saveStateToFile() {
  const data = JSON.stringify(state);
  try {
    fs.writeFileSync(stateFile, data);
  } catch (err) {
    mHttpBotErrorCount.inc();
    console.error(err);
  }
}

function loadStateFromFile() {
  if (!fs.existsSync(stateFile)) {
    return;
  }

  try {
    const data = fs.readFileSync(stateFile, "utf8");
    const loadedState = JSON.parse(data);
    state = loadedState;
  } catch (err) {
    mHttpBotErrorCount.inc();
    console.error(err);
  }
}

initDefaultMetrics();
bot.launch(onLaunch);

const onSIGINT = () => {
  console.log("SIGINT");
  bot.stop("SIGINT");
  process.exit();
};

const onSIGTERM = () => {
  console.log("SIGTERM");
  bot.stop("SIGTERM");
  process.exit();
};

// Enable graceful stop
process.once("SIGINT", onSIGINT);
process.once("SIGTERM", onSIGTERM);
