import { auth } from '@/lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function chatRequest(path, options = {}) {
  const user = auth?.currentUser;
  if (!user) throw Object.assign(new Error('You must be signed in.'), { code: 'AUTH_REQUIRED' });
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'Chat request failed.'), {
      code: data.code || 'CHAT_REQUEST_FAILED',
      status: response.status,
    });
  }
  return data;
}

export const chatApi = {
  openReservationChat: (id) => chatRequest(`/bakery/reservations/${id}/chat`, { method: 'POST' }),
  listConversations: () => chatRequest('/conversations'),
  createConversation: (platformId) => chatRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify(platformId ? { platformId } : {}),
  }),
  getMessages: (conversationId, { before, limit = 30 } = {}) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (before) query.set('before', before);
    return chatRequest(`/conversations/${conversationId}/messages?${query}`);
  },
  sendMessage: (conversationId, payload) => chatRequest(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  markRead: (conversationId) => chatRequest(`/conversations/${conversationId}/read`, { method: 'PATCH' }),
  updateStatus: (conversationId, status) => chatRequest(`/conversations/${conversationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
};

export const moderationApi = {
  overview: () => chatRequest('/moderation/overview'),
  mine: () => chatRequest('/moderation/mine'),
  evidence: (id) => chatRequest(`/moderation/customers/${id}/evidence`),
  restrict: (id, payload) => chatRequest(`/moderation/customers/${id}/restriction`, { method: 'POST', body: JSON.stringify(payload) }),
  review: (id, decision, reason) => chatRequest(`/moderation/messages/${id}/review`, { method: 'POST', body: JSON.stringify({ decision, reason }) }),
  flag: (id, reason) => chatRequest(`/moderation/messages/${id}/flag`, { method: 'POST', body: JSON.stringify({ reason }) }),
  createRequest: (payload) => chatRequest('/moderation/requests', { method: 'POST', body: JSON.stringify(payload) }),
  reply: (id, text, resolve = false) => chatRequest(`/moderation/requests/${id}/reply`, { method: 'POST', body: JSON.stringify({ text, resolve }) }),
  blueprintAccess: (id) => chatRequest(`/moderation/blueprints/${id}/access`),
};
