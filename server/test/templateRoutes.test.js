const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');
const templateRoutes = require('../src/routes/templateRoutes');
const Template = require('../src/models/Template');
const TemplateSection = require('../src/models/TemplateSection');

afterEach(() => mock.restoreAll());

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

// Helper to get the actual route handler from Express router stack
const getRouteHandler = (path, method) => {
  const layer = templateRoutes.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

test('GET / (bakery templates) seeds default sections if empty and returns sections with templates', async () => {
  const handler = getRouteHandler('/', 'get');

  let insertedDocs = [];
  mock.method(TemplateSection, 'countDocuments', async () => 0);
  mock.method(TemplateSection, 'insertMany', async (docs) => {
    insertedDocs = docs;
    return docs;
  });

  const dummySections = [
    { _id: 'sec1', name: 'Featured Cakes', order: 0 },
    { _id: 'sec2', name: 'Birthday Cakes', order: 1 },
  ];
  const dummyTemplates = [
    { _id: 'tpl1', name: 'Chocolate Drip', sectionId: 'sec1', order: 0 },
    { _id: 'tpl2', name: 'Vanilla Confetti', sectionId: 'sec2', order: 0 },
  ];

  mock.method(TemplateSection, 'find', () => ({
    sort: () => ({
      lean: async () => dummySections,
    }),
  }));

  mock.method(Template, 'find', () => ({
    sort: () => ({
      lean: async () => dummyTemplates,
    }),
  }));

  const res = mockRes();
  await handler({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(insertedDocs.length, 4);
  assert.equal(insertedDocs[0].name, 'Featured Cakes');
  assert.equal(res.body.sections.length, 2);
  assert.equal(res.body.sections[0].templates.length, 1);
  assert.equal(res.body.sections[0].templates[0].name, 'Chocolate Drip');
  assert.equal(res.body.allTemplates.length, 2);
});

test('GET /public seeds default sections if empty and returns published templates', async () => {
  const handler = getRouteHandler('/public', 'get');

  mock.method(TemplateSection, 'countDocuments', async () => 1);
  mock.method(TemplateSection, 'find', () => ({
    sort: () => ({
      lean: async () => [{ _id: 'sec1', name: 'Featured Cakes', order: 0 }],
    }),
  }));

  mock.method(Template, 'find', (query) => {
    assert.equal(query.isPublished, true);
    assert.ok(Array.isArray(query.$or));
    return {
      sort: () => ({
        lean: async () => [{ _id: 'tpl1', name: 'Berry Bliss', sectionId: 'sec1', order: 0 }],
      }),
    };
  });

  const res = mockRes();
  await handler({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.sections[0].templates[0].name, 'Berry Bliss');
  assert.equal(res.body.allTemplates.length, 1);
});

test('POST / creates template under first section when sectionId is omitted', async () => {
  const handler = getRouteHandler('/', 'post');

  mock.method(TemplateSection, 'countDocuments', async () => 1);
  mock.method(TemplateSection, 'findOne', () => ({
    sort: async () => ({ _id: 'sec_first', name: 'Featured Cakes', order: 0 }),
  }));

  mock.method(Template, 'findOne', () => ({
    sort: async () => ({ order: 2 }),
  }));

  let createdPayload = null;
  mock.method(Template, 'create', async (payload) => {
    createdPayload = payload;
    return { _id: 'new_tpl', ...payload };
  });

  const req = {
    body: {
      name: 'Strawberry Shortcake',
      description: 'Fresh strawberries and cream',
      priceMinor: 250000,
    },
  };
  const res = mockRes();
  await handler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createdPayload.sectionId, 'sec_first');
  assert.equal(createdPayload.order, 3);
  assert.equal(createdPayload.name, 'Strawberry Shortcake');
});

test('POST /upload-signature returns 503 if Cloudinary is not configured', async () => {
  const handler = getRouteHandler('/upload-signature', 'post');

  const origCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_CLOUD_NAME;

  try {
    const res = mockRes();
    await handler({}, res);

    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { message: 'Cloudinary upload service is not configured' });
  } finally {
    if (origCloudName) process.env.CLOUDINARY_CLOUD_NAME = origCloudName;
  }
});

test('POST /upload-signature returns valid upload credentials and signature', async () => {
  const handler = getRouteHandler('/upload-signature', 'post');

  const origCloud = process.env.CLOUDINARY_CLOUD_NAME;
  const origKey = process.env.CLOUDINARY_API_KEY;
  const origSecret = process.env.CLOUDINARY_API_SECRET;

  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';

  try {
    const res = mockRes();
    await handler({}, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.cloudName, 'test-cloud');
    assert.equal(res.body.apiKey, 'test-key');
    assert.equal(res.body.folder, 'cakenmake/templates');
    assert.equal(typeof res.body.signature, 'string');
    assert.equal(typeof res.body.timestamp, 'number');
  } finally {
    process.env.CLOUDINARY_CLOUD_NAME = origCloud;
    process.env.CLOUDINARY_API_KEY = origKey;
    process.env.CLOUDINARY_API_SECRET = origSecret;
  }
});

test('GET /drafts returns drafted template changes itemized with summary', async () => {
  const handler = getRouteHandler('/drafts', 'get');
  const res = mockRes();

  const dummyDraftTemplates = [
    {
      _id: 'd1',
      name: 'Festive Holiday Cake',
      priceMinor: 150000,
      thumbnail: 'thumb.jpg',
      pendingAction: 'create',
      sectionId: { _id: 'sec1', name: 'Special Celebrations' },
      effectiveAt: new Date(Date.now() + 3600000),
      draftOriginalState: null,
    },
    {
      _id: 'd2',
      name: 'Berry Bliss v2',
      priceMinor: 180000,
      thumbnail: 'thumb2.jpg',
      pendingAction: 'update',
      sectionId: { _id: 'sec1', name: 'Special Celebrations' },
      effectiveAt: new Date(Date.now() + 3600000),
      draftOriginalState: { name: 'Berry Bliss', priceMinor: 160000 },
    },
  ];

  mock.method(Template, 'find', () => ({
    populate: () => ({
      lean: async () => dummyDraftTemplates,
    }),
  }));

  await handler({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.drafts[0].pendingAction, 'create');
  assert.match(res.body.drafts[0].summary, /New Template/);
  assert.equal(res.body.drafts[1].pendingAction, 'update');
  assert.match(res.body.drafts[1].summary, /Updated/);
});

test('DELETE /drafts/:id reverts an updated template back to its live state', async () => {
  const handler = getRouteHandler('/drafts/:id', 'delete');
  const res = mockRes();

  let saved = false;
  const mockTemplateDoc = {
    _id: 'd2',
    name: 'Berry Bliss v2',
    priceMinor: 180000,
    pendingAction: 'update',
    draftOriginalState: {
      name: 'Berry Bliss',
      priceMinor: 160000,
      isPublished: true,
    },
    async save() {
      saved = true;
    },
  };

  mock.method(Template, 'findById', async () => mockTemplateDoc);

  await handler({ params: { id: 'd2' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(mockTemplateDoc.name, 'Berry Bliss');
  assert.equal(mockTemplateDoc.priceMinor, 160000);
  assert.equal(mockTemplateDoc.pendingAction, 'none');
  assert.equal(mockTemplateDoc.draftOriginalState, null);
  assert.equal(mockTemplateDoc.effectiveAt, null);
  assert.equal(saved, true);
});


