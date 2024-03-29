const axios = require("axios");
const { filterItems } = require("../../filter");
const { sortBy } = require("../../sort");
const { getDistanceKm, centralPoint } = require("../../geo");

const BASE_URL = "https://minasidor.wahlinfastigheter.se";
const GET_API_URL = `${BASE_URL}/rentalobject/Listapartment/published`;

class Client {
  constructor() {
    this.name = "Wåhlin fastigheter";
    this.list_homes_url = GET_API_URL;
  }

  async list(filter = {}) {
    const ts = Date.now().valueOf();
    const url = `${this.list_homes_url}?timestamp=${ts}`;
    try {
      const res = await axios.get(url);
      const data = JSON.parse(res.data.data);
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
        id: `w-${ad.Id}`,
        adress: `${ad.Adress1}, ${ad.Adress2}, ${ad.Adress3}`,
        adressStreet: ad.Adress1,
        adressCity: ad.Adress3,
        area: ad.AreaName,
        rooms: ad.NoOfRooms,
        price: ad.Cost,
        size: ad.Size,
        floor: ad.Floor,
        location: { long: ad.Longitude, lat: ad.Latitude },
        moveIn: ad.MoveInDate,
        yearBuilt: ad.YearBuilt,
        yearRebuilt: ad.YearRebuilt,
        imageUrl: getImageUrl(ad),
        link: getLink(ad),
        description: ad.DescriptionHtml,
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

async function getImages(homeList = []) {
  const promises = [];

  const task = async (i) => {
    const item = homeList[i];
    const res = await axios.get(item.imageUrl);
    if (res.data) {
      item.images.push(res.data);
    }
  };

  for (let i = 0; i < homeList.length; i++) {
    promises.push(task(i));
  }
  await Promise.all(promises);
  return homeList;
}

function getImageUrl(item) {
  const width = 415;
  const height = 280;
  const desc = item.FirstImage;
  const imagePath = `Content/ImageUrl?guid=${desc.Guid}&extension=${desc.Extension}&datechanged=${desc.DateChanged}&width=${width}&height=${height}`;
  return `${BASE_URL}/${imagePath}`;
}

function getLink(item) {
  return `${BASE_URL}${item.DetailsUrl}`;
}

function getClient() {
  const client = new Client();
  return client;
}

module.exports = {
  Client,
  getClient,
};
