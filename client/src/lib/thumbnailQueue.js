// Persist before starting network work, so a closed page can retry next visit.
export function createThumbnailQueue(storage, upload, isOwnerActive) {
  const running = new Map();
  const key = owner => `cakenmake_pending_thumbnails:${owner}`;
  const read = owner => {
    try { return JSON.parse(storage.getItem(key(owner)) || '{}'); } catch { return {}; }
  };
  const write = (owner, jobs) => {
    try { storage.setItem(key(owner), JSON.stringify(jobs)); } catch { /* Network saving still works when storage is full. */ }
  };
  const memory = new Map();
  const jobsFor = owner => {
    if (!memory.has(owner)) memory.set(owner, read(owner));
    return memory.get(owner);
  };
  const flush = owner => {
    if (running.has(owner)) return running.get(owner);
    const task = (async () => {
      const jobs = jobsFor(owner);
      const attempted = new Set();
      while (isOwnerActive(owner)) {
        const id = Object.keys(jobs).find(id => !attempted.has(id));
        if (!id) break;
        attempted.add(id);
        while (jobs[id] && isOwnerActive(owner)) {
          const image = jobs[id];
          try { await upload(id, image, owner); }
          catch (error) {
            if ([403, 404].includes(error.status)) { delete jobs[id]; write(owner, jobs); }
            break;
          }
          if (jobs[id] === image) { delete jobs[id]; write(owner, jobs); }
        }
      }
    })().finally(() => running.delete(owner));
    running.set(owner, task);
    return task;
  };
  return {
    enqueue(owner, id, image) {
      const jobs = jobsFor(owner);
      jobs[id] = image;
      write(owner, jobs);
      return flush(owner);
    },
    flush,
  };
}
