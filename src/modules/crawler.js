const { getClients } = require("./clients/clients");

// 10 minutes
// const UDATE_INTERVAL = 1000 * 60 * 10;
const UDATE_INTERVAL = 1000 * 2;

class Crawler {
  constructor() {
    this.runId = 0;
    this.homesIndex = {};
    this.homes = [];
    this.subscribers = [];
    this.published = {};
  }

  async run() {
    if (this.runId) {
      // Don't run if process already running
      console.debug("crawler is already running, skip");
      return;
    }
    console.debug("running crawler...");

    const loop = () => {
      this.runId = setTimeout(async () => {
        await this.fetch();

        loop();
      }, UDATE_INTERVAL);
    };

    await this.fetch();
    loop();
  }

  clear() {
    clearInterval(this.runId);
    clearTimeout(this.runId);
    this.runId = 0;
  }

  async fetch() {
    const clients = getClients();
    const newItems = [];
    for (const client of clients) {
      let clientHomes;
      try {
        clientHomes = await client.list();
      } catch (error) {
        console.error(error);
        continue;
      }

      console.debug("fetched homes:", clientHomes.length);
      if (!clientHomes || !clientHomes.length) {
        continue;
      }
      for (let i = 0; i < clientHomes.length; i++) {
        const h = clientHomes[i];
        if (!this.homesIndex[h.id]) {
          // new item
          this.homesIndex[h.id] = h;
          this.homes.push(h);
          newItems.push(h.id);

          // Notify subscribers
          this.publish(h);
        }
      }
    }
    console.debug("new homes:", newItems.length);
  }

  /**
   *
   * @param {string} subscriberId
   * @param {(item) => void} onNewItem
   */
  subscribe(subscriberId, onNewItem) {
    const s = this.subscribers.find((s) => s.id === subscriberId);
    if (s) {
      s = { id: subscriberId, onNewItem };
    } else {
      this.subscribers.push({ id: subscriberId, onNewItem });

      // Publish existing items for the new subscriber
      for (let i = 0; i < this.homes.length; i++) {
        const item = this.homes[i];
        if (!this.published[subscriberId][item.id]) {
          this.publishToSubscriber(s, item);
        }
      }
    }
  }

  publish(item) {
    for (let i = 0; i < this.subscribers.length; i++) {
      const s = this.subscribers[i];
      if (!this.published[s.id][item.id]) {
        this.publishToSubscriber(s, item);
      }
    }
  }

  publishToSubscriber(subscriber, item) {
    subscriber.onNewItem(item);
    this.setPublished(subscriber.id, item);
  }

  setPublished(subscriberId, item) {
    this.published[subscriberId][item.id] = true;
  }

  clearPublished(subscriberId) {
    this.published[subscriberId] = {};
  }
}

module.exports = {
  Crawler,
};
