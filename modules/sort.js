function sortBy(items, type) {
  if (type == "price") {
    return sortByProperty(items, "price");
  } else {
    return items;
  }
}

function sortByProperty(items = [], prop) {
  items.sort((a, b) => a[prop] - b[prop]);
  return items;
}

module.exports = {
  sortBy,
};
