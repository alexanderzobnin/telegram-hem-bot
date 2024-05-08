const clientWahlin = require("./wahlinfastigheter/client");
const clientBostad = require("./bostad-stockholm/client");
const clientHomeQ = require("./homeq/client");

const clientModules = [clientWahlin, clientBostad, clientHomeQ];

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
