function filterItems(items, filters) {
  let filtered = items;
  if (filters.rooms) {
    filtered = filtered.filter((h) => h.rooms >= filters.rooms);
  }
  if (filters.price) {
    filtered = filtered.filter((h) => h.price >= filters.price);
  }
  if (filters.size) {
    filtered = filtered.filter((h) => h.size >= filters.size);
  }
  if (filters.queueMin) {
    filtered = filtered.filter((h) => h.queueMin <= filters.queueMin || !h.queueMin);
  }
  // Remove youth, student and senior apartments
  filtered = filtered.filter((h) => !h.student && !h.senior && !h.youth && !h.short);
  return filtered;
}

module.exports = {
  filterItems,
};
