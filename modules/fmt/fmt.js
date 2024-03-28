function formatMessage(item) {
  const message = `[${item.adress}](${formatLocation(item)})
*${item.cost} kr* • *${item.size} m²* • *${item.rooms} rooms* • ${item.floor} floor
${item.area} • ${item.yearBuilt || ""} • ${item.yearRebuilt || ""}
${formatDate(item.moveIn)}
[click for details](${item.link})
`;
  return escape(message);
}

function formatDate(dateTime) {
  return new Date(dateTime).toLocaleDateString("en-SE", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function escape(str) {
  return str.replaceAll("-", `\\-`);
}

function formatLocation(item) {
  const googleMapsURL = "https://www.google.com/maps";
  const loc = item.location;
  if (!loc || !loc.long || !loc.lat) {
    return "";
  }
  // return `${googleMapsURL}/@${loc.lat},${loc.long},12z?entry=ttu`;
  return `${googleMapsURL}/search/?api=1&query=${item.adress}&ll=${loc.lat}%2C${loc.long}&z=12`;
}

module.exports = {
  formatMessage,
};
