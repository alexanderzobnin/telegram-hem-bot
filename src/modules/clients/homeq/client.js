const axios = require("axios");
const { filterItems } = require("../../filter");
const { sortBy } = require("../../sort");
const { getDistanceKm, centralPoint } = require("../../geo");
const { mHttpRequestCount } = require("../../metrics");

const BASE_URL = "https://homeq.se";
const BASE_SEARCH_URL = "https://search.homeq.se";
const SEARCH_API_URL = `${BASE_SEARCH_URL}/api/v3/search`;

class Client {
  constructor() {
    this.name = "HomeQ";
    this.list_homes_url = SEARCH_API_URL;
  }

  async list(filter = {}) {
    const ts = Date.now().valueOf();
    const url = this.list_homes_url;
    const searchParams = {
      sorting: "proximity_map_center.asc",
      // Roughly Stockhom area
      geo_bounds: {
        min_lat: 59.11387004196621,
        max_lat: 59.5448610223209,
        min_lng: 17.168997279091343,
        max_lng: 18.998875758963976,
      },
    };
    try {
      const res = await axios.post(url, searchParams);
      mHttpRequestCount.inc();

      const data = res.data.results;
      let homes = await this.convert(data);
      homes = filterItems(homes, filter);
      homes = sortBy(homes, "price");
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
        id: `w-${ad.id}`,
        adress: `${ad.title}, ${ad.municipality}, ${ad.city}`,
        adressStreet: ad.title,
        adressCity: ad.city,
        area: ad.municipality,
        rooms: ad.rooms,
        price: ad.rent,
        size: ad.area,
        floor: undefined,
        location: { long: ad.location.lon, lat: ad.location.lat },
        moveIn: ad.date_access,
        imageUrl: getImageUrl(ad),
        link: getLink(ad),
        queueType: ad.ShowRandomSort ? "Bolotto" : "",
      };
      if (item.location.lat && item.location.long) {
        item.distance = getDistanceKm(item.location.lat, item.location.long, centralPoint[0], centralPoint[1]);
      }
      list.push(item);
    }
    // list = await getImages(list);
    return list;
  }
}

function getImageUrl(item) {
  if (item.images?.length) {
    return item.images[0].image;
  }
  return "";
}

function getLink(item) {
  return `${BASE_URL}${item.uri}`;
}

function getClient() {
  const client = new Client();
  return client;
}

module.exports = {
  Client,
  getClient,
};
