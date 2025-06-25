const axios = require("axios");
const { filterItems } = require("../../filter");
const { sortBy } = require("../../sort");
const { getDistanceKm, centralPoint } = require("../../geo");
const { mHttpRequestCount } = require("../../metrics");

const BASE_URL = "https://bostad.stockholm.se";
const GET_API_URL = `${BASE_URL}/AllaAnnonser`;

class Client {
  constructor() {
    this.name = "Bostad stockholm";
    this.list_homes_url = GET_API_URL;
  }

  async list(filter = {}) {
    const ts = Date.now().valueOf();
    const url = this.list_homes_url;
    try {
      const res = await axios.get(url);
      mHttpRequestCount.inc();

      const data = res.data;
      let homes = await this.convert(data);
      homes = filterItems(homes, filter);
      sortBy(homes, "price");
      return homes;
    } catch (error) {
      console.error(error.response || error);
      return [];
    }
  }

  async convert(ads = []) {
    let list = [];
    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      const item = {
        source: this.name,
        id: `b-${ad.AnnonsId}`,
        totalApartments: ad.Antal,
        adress: `${ad.Gatuadress}, ${ad.Kommun}, ${ad.Gatuadress}`,
        adressStreet: ad.Gatuadress,
        adressCity: ad.Kommun,
        area: ad.Stadsdel,
        rooms: ad.AntalRum || ad.HögstaAntalRum,
        roomsMax: ad.LägstaAntalRum,
        price: ad.Hyra || ad.LägstaHyran,
        priceMax: ad.HögstaHyran,
        size: ad.Yta || ad.LägstaYtan,
        sizeMax: ad.HögstaYtan,
        floor: ad.Floor,
        location: { long: ad.KoordinatLongitud, lat: ad.KoordinatLatitud },
        moveIn: null,
        yearBuilt: null,
        yearRebuilt: null,
        imageUrl: null,
        link: getLink(ad),
        description: ad.DescriptionHtml,
        queueType: ad.Ko === "Bostadskön" ? "Queue" : ad.Ko,
        queueMin: ad.LiknadeLagenhetStatistik?.KotidFordelningQ1,
        queueMax: ad.LiknadeLagenhetStatistik?.KotidFordelningQ3,
        lift: ad.Hiss,
        newProduction: ad.Nyproduktion,
        adFrom: ad.AnnonseradFran,
        adTo: ad.AnnonseradTill,
        senior: ad.Senior,
        student: ad.Student,
        youth: ad.Ungdom,
        short: ad.Korttid,
      };
      if (item.location.lat && item.location.long) {
        item.distance = getDistanceKm(item.location.lat, item.location.long, centralPoint[0], centralPoint[1]);
      }
      list.push(item);
    }
    return list;
  }
}

function getLink(item) {
  return `${BASE_URL}${item.Url}`;
}

function getClient() {
  const client = new Client();
  return client;
}

module.exports = {
  Client,
  getClient,
};
