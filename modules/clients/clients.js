const clientWahlin = require("./wahlinfastigheter/client");
const clientBostad = require("./bostad-stockholm/client");

const clientModules = [clientWahlin, clientBostad];

function getClients() {
  const clients = [];
  for (const mod of clientModules) {
    const client = mod.getClient();
    clients.push(client);
  }
  return clients;
}

module.exports = {
  getClients,
};
