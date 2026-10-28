const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const TeamMessage = require('../src/models/TeamMessage');
const teamChatRoutes = require('../src/routes/teamChatRoutes');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

afterEach(() => mock.restoreAll());

test('GET /channels returns shared Bakery Team Room and other bakery members for direct messaging', async () => {
  const adminId = new mongoose.Types.ObjectId();
  const staff1Id = new mongoose.Types.ObjectId();
  const staff2Id = new mongoose.Types.ObjectId();
  const platformId = new mongoose.Types.ObjectId();

  mock.method(User, 'find', () => ({
    select() {
      return this;
    },
    sort: async () => [
      { _id: adminId, displayName: 'Head Baker', email: 'admin@example.com', role: 'bakery_admin' },
      { _id: staff1Id, displayName: 'Staff One', email: 'staff1@example.com', role: 'bakery_staff' },
      { _id: staff2Id, displayName: 'Staff Two', email: 'staff2@example.com', role: 'bakery_staff' },
    ],
  }));

  mock.method(TeamMessage, 'find', () => ({
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    limit: async () => [],
  }));

  const getChannelsHandler = teamChatRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/channels' && layer.route.methods.get
  ).route.stack.at(-1).handle;

  const req = {
    platformId,
    user: { _id: staff1Id, platform: platformId, role: 'bakery_staff' },
  };
  const res = createResponse();

  await getChannelsHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.generalChannel.channelKey, 'general');
  assert.equal(res.body.members.length, 2);
  assert.equal(res.body.members[0].displayName, 'Head Baker');
  assert.equal(res.body.members[0].role, 'bakery_admin');
  assert.equal(res.body.members[1].displayName, 'Staff Two');
});

test('POST /messages creates and broadcasts a team message in general or direct channel', async () => {
  const adminId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const platformId = new mongoose.Types.ObjectId();
  const messageId = new mongoose.Types.ObjectId();

  mock.method(TeamMessage, 'create', async (doc) => ({
    _id: messageId,
    ...doc,
    createdAt: new Date(),
  }));

  mock.method(TeamMessage, 'findById', () => ({
    populate: async () => ({
      _id: messageId,
      platform: platformId,
      channelType: 'group',
      channelKey: 'general',
      sender: { _id: staffId, displayName: 'Staff One', email: 'staff1@example.com', role: 'bakery_staff' },
      senderRole: 'bakery_staff',
      text: 'Hello team and admin!',
      createdAt: new Date(),
    }),
  }));

  let emittedEvent = null;
  const req = {
    platformId,
    user: { _id: staffId, platform: platformId, role: 'bakery_staff' },
    body: { channelKey: 'general', text: 'Hello team and admin!' },
    app: {
      get: () => ({
        to: () => ({
          emit(event, payload) {
            emittedEvent = { event, payload };
          },
        }),
      }),
    },
  };
  const res = createResponse();

  const postHandler = teamChatRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/messages' && layer.route.methods.post
  ).route.stack.at(-1).handle;

  await postHandler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.message.text, 'Hello team and admin!');
  assert.equal(res.body.message.channelKey, 'general');
  assert.equal(emittedEvent.event, 'team:message:new');
});

