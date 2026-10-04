import { auth } from '@/lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const cakeAiApi = {
  sendMessage: (messages, config) =>
    fetch(`${API_BASE_URL}/cake-ai/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, config }),
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(`Cake AI request failed (${response.status})`);
        if (['PROMPT_REJECTED', 'INVALID_AI_REQUEST'].includes(body.code)) error.validationMessage = body.error;
        throw error;
      }
      return response.json();
    }),
};

const parseJsonResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.code = data.code;
    error.status = response.status;
    throw error;
  }

  return data;
};

const requestJson = async (url, options) => {
  const response = await fetch(url, options);
  return parseJsonResponse(response);
};

export const blueprintApi = {
  submit: (submission) => requestAuthenticatedJson(`${API_BASE_URL}/blueprint-submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  }),
};

const requestAuthenticatedJson = async (url, options = {}) => {
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    const error = new Error('You must be signed in.');
    error.code = 'AUTH_REQUIRED';
    error.status = 401;
    throw error;
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  return parseJsonResponse(response);
};

export const authApi = {
  requestEmailOtp: (email) => requestJson(`${API_BASE_URL}/auth/email/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }),
  verifyEmailOtp: (email, code) => requestJson(`${API_BASE_URL}/auth/email/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  }),
};

export const accountApi = {
  sync: () => requestAuthenticatedJson(`${API_BASE_URL}/account/sync`, {
    method: 'POST',
  }),
  getMe: () => requestAuthenticatedJson(`${API_BASE_URL}/account/me`),
  updateMe: (updates) => requestAuthenticatedJson(`${API_BASE_URL}/account/me`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),
  requestEmailLinkOtp: (email) => requestAuthenticatedJson(`${API_BASE_URL}/account/email/request-otp`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  verifyEmailLinkOtp: (email, code) => requestAuthenticatedJson(`${API_BASE_URL}/account/email/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  }),
};

// Design API calls
export const designApi = {
  getAiChat: id => requestAuthenticatedJson(`${API_BASE_URL}/designs/${id}/ai-chat`),
  saveAiChat: (id, conversation) => requestAuthenticatedJson(`${API_BASE_URL}/designs/${id}/ai-chat`, {
    method: 'PUT', body: JSON.stringify(conversation),
  }),
  // Get all designs for current user
  getDesigns: async ({ trashOnly = false } = {}) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/designs?isTrashed=${trashOnly}`);
  },

  // Get a single design by ID
  getDesignById: async (id) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/designs/${id}`);
  },

  // Create a new design
  createDesign: async (designData) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/designs`, {
      method: 'POST',
      body: JSON.stringify(designData)
    });
  },

  // Update an existing design
  updateDesign: async (id, designData) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/designs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(designData)
    });
  },

  // Delete a design
  deleteDesign: async (id) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/designs/${id}`, {
      method: 'DELETE'
    });
  },

  // Move design to trash
  moveToTrash: async (id) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/designs/${id}/trash`, {
      method: 'POST'
    });
  },

  // Restore design from trash
  restoreFromTrash: async (id) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/designs/${id}/restore`, {
      method: 'POST'
    });
  },

  // Permanently delete design
  permanentlyDelete: async (id) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/designs/${id}/permanent`, {
      method: 'DELETE'
    });
  },

  // Upload image to Cloudinary
  uploadImage: async (designId, base64Image) => {
    // Ensure the base64 data has the data URL prefix
    const imageData = base64Image.startsWith('data:')
      ? base64Image
      : `data:image/png;base64,${base64Image}`;

    const upload = await requestAuthenticatedJson(
      `${API_BASE_URL}/designs/${designId}/thumbnail/upload-signature`,
      { method: 'POST' }
    );
    const formData = new FormData();
    formData.append('file', imageData);
    formData.append('api_key', upload.apiKey);
    formData.append('timestamp', String(upload.timestamp));
    formData.append('signature', upload.signature);
    formData.append('folder', upload.folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(upload.cloudName)}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary upload error:', errorText);
      throw new Error('Failed to upload image');
    }
    const data = await response.json();
    return requestAuthenticatedJson(`${API_BASE_URL}/designs/${designId}/thumbnail`, {
      method: 'PATCH',
      body: JSON.stringify({ publicId: data.public_id, secureUrl: data.secure_url }),
    });
  }
};



export const bakeryApi = {
  recordDownPayment: (id, payment) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/reservations/${encodeURIComponent(id)}/down-payment`, { method: 'POST', body: JSON.stringify(payment) }),
  getBlueprints: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/blueprints`),
  getBlueprintAccess: (id, download = false) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/blueprints/${encodeURIComponent(id)}/access?download=${download}`),
  getReservations: async (status) => {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return requestAuthenticatedJson(`${API_BASE_URL}/bakery/reservations${qs}`);
  },

  updateReservationStatus: async (id, status) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/bakery/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

export const templateApi = {
  getPublicTemplates: () => requestJson(`${API_BASE_URL}/templates/public`),
  getPublicTemplateById: (id) => requestJson(`${API_BASE_URL}/templates/public/${id}`),

  getBakeryTemplates: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/templates`),
  createTemplate: (data) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/templates`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateTemplate: (id, data) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteTemplate: (id) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/templates/${id}`, {
    method: 'DELETE',
  }),
  reorderTemplates: (sectionId, orderedIds) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/templates/reorder`, {
    method: 'POST',
    body: JSON.stringify({ sectionId, orderedIds }),
  }),

  getSections: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/templates/sections`),
  createSection: (name) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/templates/sections`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  updateSection: (id, data) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/templates/sections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteSection: (id) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/templates/sections/${id}`, {
    method: 'DELETE',
  }),
  reorderSections: (orderedIds) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/templates/sections/reorder`, {
    method: 'POST',
    body: JSON.stringify({ orderedIds }),
  }),
};

export const pricingApi = {
  getWorkspace: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing`),
  createDraft: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing/draft`, { method: 'POST' }),
  updateDraftItem: async (componentKey, costBasisMinor, markupMinor) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing/draft/items/${encodeURIComponent(componentKey)}`, {
      method: 'PATCH',
      body: JSON.stringify({ costBasisMinor, markupMinor }),
    });
  },
  updateDraftRates: async (rates) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing/draft/rates`, {
      method: 'PATCH',
      body: JSON.stringify({ rates }),
    });
  },
  scheduleDraft: (reason) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing/draft/schedule`, { method: 'POST', body: JSON.stringify({ reason }) }),
  publishDraftNow: (reason) => requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing/draft/publish-now`, { method: 'POST', body: JSON.stringify({ reason }) }),
  discardDraft: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing/draft`, { method: 'DELETE' }),
  cancelScheduled: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing/scheduled/cancel`, { method: 'POST' }),
  getActiveCatalog: (platform = 'mamshie-bakery') => requestJson(`${API_BASE_URL}/pricing/active?platform=${encodeURIComponent(platform)}`),
  quoteCake: (config, platform = 'mamshie-bakery') => requestJson(`${API_BASE_URL}/pricing/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, config }),
  }),
};

export const billingApi = {
  getAIUsageSummary: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/billing/usage`),

  getInvoiceHistory: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/billing/invoices`),
};

export const transactionApi = {
  getTransactions: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/transactions`),
};
