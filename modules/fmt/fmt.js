function formatMessage(item) {
  let message = `*[${item.adressStreet}](${formatLocation(item)})*, ${item.adressCity}, ${item.area}\n`;

  let labels = "";
  if (item.newProduction) {
    labels += `🛠️ *New production*`;
  }
  if (item.totalApartments > 1) {
    labels += ` • *${item.totalApartments} apartments*`;
  }
  if (labels) {
    message += `${labels}\n`;
  }

  // Price and size
  message += `*${formatItemPrice(item)} • ${formatRooms(item)} • ${formatSize(item)}*\n`;

  // Building info
  if (item.floor) {
    message += `${item.floor} floor • ${item.yearBuilt || ""} ${item.yearRebuilt ? "• " + item.yearRebuilt : ""}\n`;
  }

  if (item.moveIn) {
    message += `Move in ${formatDate(item.moveIn)}\n`;
  }

  // Queue info
  message += `${item.queueType === "Bolotto" ? "🔀 " : ""}${item.queueType}`;
  if (item.queueType == "Queue" && item.queueMin) {
    message += ` \\(${item.queueMin} - ${item.queueMax} years\\)`;
  }
  message += ` • ${item.source}\n`;
  message += `[click for details](${item.link})`;
  return escape(message);
}

function formatDate(dateTime) {
  return new Date(dateTime).toLocaleDateString("en-SE", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function escape(str = "") {
  str = str.replaceAll("-", `\\-`);
  str = str.replaceAll(".", `\\.`);
  return str;
}

function formatLocation(item) {
  const googleMapsURL = "https://www.google.com/maps";
  const loc = item.location;
  if (!loc || !loc.long || !loc.lat) {
    return "";
  }
  // return `${googleMapsURL}/@${loc.lat},${loc.long},12z?entry=ttu`;
  const adress = encodeURIComponent(item.adress);
  return `${googleMapsURL}/search/?api=1&query=${adress}`;
}

function formatItemPrice(item) {
  let priceStr = formatPrice(item.price);
  if (item.priceMax && item.priceMax != item.price) {
    priceStr += ` - ${formatPrice(item.priceMax)}`;
  }
  priceStr += " kr";
  return priceStr;
}

function formatPrice(price = 0) {
  const priceStr = `${price}`;
  const thousands = priceStr.slice(0, -3);
  const rest = priceStr.slice(-3);
  return `${thousands} ${rest}`;
}

function formatRooms(item) {
  let str = `${item.rooms}`;
  if (item.roomsMax && item.roomsMax != item.rooms) {
    str += ` - ${item.roomsMax}`;
  }
  str += ` rooms`;
  return str;
}

function formatSize(item) {
  let str = `${item.size}`;
  if (item.sizeMax && item.sizeMax != item.size) {
    str += ` - ${item.sizeMax}`;
  }
  str += ` m²`;
  return str;
}

module.exports = {
  formatMessage,
};
