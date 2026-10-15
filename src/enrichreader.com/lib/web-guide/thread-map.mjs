/** Permanent opaque URLs. Missing threads may retire; numbers never transfer. */
export function validateThreadMap(threads, mapping, previous = null) {
  const numbers = new Set();
  for (const [id, number] of Object.entries(mapping)) {
    if (!id || !Number.isSafeInteger(number) || number < 1 || numbers.has(number)) throw new Error('Invalid permanent thread map');
    numbers.add(number);
  }
  if (previous) for (const [id, number] of Object.entries(previous)) {
    if (mapping[id] !== number) throw new Error('Cannot remove or reassign a mystery URL');
  }
  const ids = new Set();
  for (const thread of threads) {
    if (ids.has(thread.id) || mapping[thread.id] == null || String(mapping[thread.id]) !== thread.slug) throw new Error('Thread URL does not match permanent map');
    ids.add(thread.id);
  }
}
