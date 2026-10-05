const express = require('express');
const authenticate = require('../middleware/authenticate');
const { loadAppUser } = require('../middleware/authorize');
const {
  createConversation,
  getMessages,
  listConversations,
  markRead,
  postOrderAcknowledgement,
  postMessage,
  updateStatus,
} = require('../controllers/conversationController');

const router = express.Router();
router.use(authenticate, loadAppUser);

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', postMessage);
router.post('/:id/order-acknowledgement', postOrderAcknowledgement);
router.patch('/:id/read', markRead);
router.patch('/:id/status', updateStatus);

module.exports = router;
