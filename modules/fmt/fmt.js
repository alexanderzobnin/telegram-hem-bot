function formatMessage(item) {
  let message = `*[${item.adressStreet}](${formatLocation(item)})*, ${item.adressCity}, ${item.area}\n`;
  if (item.totalApartments > 1) {
    message += `*${item.totalApartments} apartments*\n`;
    if (item.cost != item.costMax) {
      message += `*${formatPrice(item.cost)} - ${formatPrice(item.costMax)} kr*`;
    } else {
      message += `*${formatPrice(item.cost)} kr*`;
    }
    message += item.rooms != item.roomsMax ? ` • *${item.rooms} - ${item.roomsMax} rooms*` : ` • *${item.rooms} rooms*`;
    message += item.size != item.sizeMax ? ` • *${item.size} - ${item.sizeMax} m²*\n` : ` • *${item.size} m²*\n`;
  } else {
    message += `*${formatPrice(item.cost)} kr* • *${item.rooms} rooms* • *${item.size} m²*\n`;
  }
  if (item.floor) {
    message += `${item.floor} floor • ${item.yearBuilt || ""} ${item.yearRebuilt ? "• " + item.yearRebuilt : ""}\n`;
  }
  if (item.moveIn) {
    message += `Move in ${formatDate(item.moveIn)}\n`;
  }
  message += `${item.source} • ${item.queueType === "Bolotto" ? "🔀" : ""} ${item.queueType}`;
  if (item.queueType == "queue" && item.queueTime.from) {
    message += ` \\(${item.queueTime.from} - ${item.queueTime.to} years\\)\n`;
  } else {
    message += "\n";
  }
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

function formatPrice(price = 0) {
  const priceStr = `${price}`;
  const thousands = priceStr.slice(0, -3);
  const rest = priceStr.slice(-3);
  return `${thousands} ${rest}`;
}

module.exports = {
  formatMessage,
};
