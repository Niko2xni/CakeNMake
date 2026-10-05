const assert = require('node:assert/strict');
const { test, afterEach, mock } = require('node:test');
const { PassThrough } = require('node:stream');
const { decodeImage, uploadImage, MAX_IMAGE_BYTES } = require('../src/controllers/imageUploadController');
const Conversation = require('../src/models/Conversation');
const { cloudinary } = require('../src/config/cloudinary');

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const image = `data:image/png;base64,${png.toString('base64')}`;
afterEach(() => mock.restoreAll());
const response = () => ({ status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });

test('image validation rejects disguised, unsupported, empty, and oversized images', () => {
  assert.deepEqual(decodeImage(image), png);
  for (const invalid of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,ZXhl', '', 'https://example.com/image.png']) {
    assert.throws(() => decodeImage(invalid), error => error.status === 400);
  }
  assert.throws(() => decodeImage(`data:image/png;base64,${Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64')}`), error => error.status === 413);
});

test('chat uploads cannot access a different customer conversation', async () => {
  const find = mock.method(Conversation, 'findOne', async () => null);
  mock.method(cloudinary.uploader, 'upload_stream', () => assert.fail('must not upload'));
  const res = response();
  await uploadImage({ user: { _id: 'customer', role: 'bakery_staff', platform: 'bakery' }, body: { kind: 'chat', conversationId: '111111111111111111111111', image } }, res);
  assert.equal(res.code, 404);
  assert.equal(find.mock.calls[0].arguments[0].platform, 'bakery');
});

test('avatar uploads use trusted ownership and server-controlled Cloudinary options', async () => {
  const names = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const prior = names.map(name => process.env[name]);
  try {
    for (const name of names) process.env[name] = 'test';
    let settings;
    mock.method(cloudinary.uploader, 'upload_stream', (options, callback) => {
      settings = options;
      const stream = new PassThrough();
      stream.resume();
      stream.on('finish', () => callback(null, { resource_type: 'image', secure_url: `https://res.cloudinary.com/test/image/upload/${options.public_id}.png` }));
      return stream;
    });
    const res = response();
    await uploadImage({ user: { _id: 'trusted-user' }, body: { kind: 'avatar', image, owner: 'someone-else' } }, res);
    assert.equal(res.code, 201);
    assert.match(settings.public_id, /^cakenmake\/avatars\/trusted-user\//);
    assert.equal(settings.overwrite, false);
    assert.deepEqual(settings.allowed_formats, ['jpg', 'jpeg', 'png', 'webp']);
  } finally {
    names.forEach((name, i) => prior[i] === undefined ? delete process.env[name] : process.env[name] = prior[i]);
  }
});
