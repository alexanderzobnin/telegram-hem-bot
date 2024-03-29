function filterItems(items, filters) {
  let filtered = items;
  if (filters.rooms) {
    filtered = filtered.filter((h) => h.rooms >= filters.rooms || h.roomsMax >= filters.rooms);
  }
  if (filters.price) {
    filtered = filtered.filter((h) => h.price >= filters.price || h.priceMax >= filters.price);
  }
  if (filters.size) {
    filtered = filtered.filter((h) => h.size >= filters.size || h.sizeMax >= filters.size);
  }
  if (filters.queueMin) {
    filtered = filtered.filter((h) => !h.queueMin || h.queueMin <= filters.queueMin);
  }
  if (filters.distance) {
    filtered = filtered.filter((h) => !h.distance || h.distance <= filters.distance);
  }
  // Remove youth, student and senior apartments
  filtered = filtered.filter((h) => !h.student && !h.senior && !h.youth && !h.short);
  return filtered;
}

module.exports = {
  filterItems,
};
