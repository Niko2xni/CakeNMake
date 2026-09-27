const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');

const {
  cloudinary,
  deleteTrustedThumbnail,
  verifyThumbnailAsset,
} = require('../src/config/cloudinary');

afterEach(() => mock.restoreAll());

test('thumbnail deletion rejects untrusted and cross-design public IDs', async () => {
  const destroy = mock.method(cloudinary.uploader, 'destroy', async () => ({ result: 'ok' }));

  const untrusted = await deleteTrustedThumbnail({
    asset: { trusted: false, ownerUid: 'user-1', publicId: 'cakenmake/users/user-1/designs/design-1/image' },
    firebaseUid: 'user-1',
    designId: 'design-1',
  });
  const wrongDesign = await deleteTrustedThumbnail({
    asset: { trusted: true, ownerUid: 'user-1', publicId: 'cakenmake/users/user-1/designs/design-2/image' },
    firebaseUid: 'user-1',
    designId: 'design-1',
  });

  assert.equal(untrusted, false);
  assert.equal(wrongDesign, false);
  assert.equal(destroy.mock.callCount(), 0);
});

test('thumbnail verification rejects attacker-controlled hosts before Cloudinary lookup', async () => {
  const resource = mock.method(cloudinary.api, 'resource', async () => assert.fail('resource lookup should not run'));
  const verified = await verifyThumbnailAsset({
    firebaseUid: 'user-1',
    designId: 'design-1',
    publicId: 'cakenmake/users/user-1/designs/design-1/image',
    secureUrl: 'https://attacker.example/image/upload/image.png',
  });

  assert.equal(verified, null);
  assert.equal(resource.mock.callCount(), 0);
});
