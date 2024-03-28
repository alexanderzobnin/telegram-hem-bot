const axios = require("axios");

const GET_API_URL = "";

class Client {
  constructor() {
    this.list_homes_url = GET_API_URL;
  }

  async list() {
    console.log("not implemented");
  }
}

function getClient() {
  const client = new Client();
  return client;
}

module.exports = {
  Client,
  getClient,
};
