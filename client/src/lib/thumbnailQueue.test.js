import { describe, it, expect, vi } from 'vitest';
import { createThumbnailQueue } from './thumbnailQueue';

const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
};
describe('thumbnail recovery', () => {
  it('persists a failed upload and retries after a page reload', async () => {
    const disk = storage();
    const fail = vi.fn().mockRejectedValue(new Error('offline'));
    await createThumbnailQueue(disk, fail, () => true).enqueue('owner', 'design', 'image');
    const upload = vi.fn().mockResolvedValue({});
    await createThumbnailQueue(disk, upload, () => true).flush('owner');
    expect(upload).toHaveBeenCalledWith('design', 'image', 'owner');
    expect(JSON.parse(disk.getItem('cakenmake_pending_thumbnails:owner'))).toEqual({});
  });
  it('serializes uploads and preserves the newest capture during an in-flight upload', async () => {
    let finish;
    const upload = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({});
    const queue = createThumbnailQueue(storage(), upload, () => true);
    const pending = queue.enqueue('owner', 'design', 'old');
    queue.enqueue('owner', 'design', 'new');
    queue.enqueue('owner', 'second', 'other');
    expect(upload).toHaveBeenCalledTimes(1);
    finish();
    await pending;
    expect(upload.mock.calls).toEqual([['design', 'old', 'owner'], ['design', 'new', 'owner'], ['second', 'other', 'owner']]);
  });
  it('does not upload another account’s pending images', async () => {
    const upload = vi.fn();
    const queue = createThumbnailQueue(storage(), upload, owner => owner === 'current');
    await queue.enqueue('previous', 'design', 'private image');
    expect(upload).not.toHaveBeenCalled();
  });
});
