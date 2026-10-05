const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bodyErrors = require('../src/middleware/bodyErrors');

test('oversized JSON returns a readable 413 and the server still accepts later requests', async () => {
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  app.post('/save', (req, res) => res.json({ saved: true }));
  app.use(bodyErrors);
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${server.address().port}/save`;
    const post = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const large = await post(JSON.stringify({ config: 'x'.repeat(2000) }));
    assert.equal(large.status, 413);
    assert.equal((await large.json()).code, 'PAYLOAD_TOO_LARGE');
    const valid = await post('{}');
    assert.equal(valid.status, 200);
    assert.deepEqual(await valid.json(), { saved: true });
    const malformed = await post('{');
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).code, 'INVALID_JSON');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
