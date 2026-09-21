import { auth } from '@/lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
  cancelEmailOtp: (email) => requestJson(`${API_BASE_URL}/auth/email/cancel-otp`, {
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
};

// Get user ID from localStorage (simplified auth)
const getUserId = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.email || 'guest-user';
};

// Design API calls
export const designApi = {
  // Get all designs for current user
  getDesigns: async ({ trashOnly = false } = {}) => {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/designs?userId=${userId}&isTrashed=${trashOnly}`);
    if (!response.ok) throw new Error('Failed to fetch designs');
    return response.json();
  },

  // Get a single design by ID
  getDesignById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/designs/${id}`);
    if (!response.ok) throw new Error('Failed to fetch design');
    return response.json();
  },

  // Create a new design
  createDesign: async (designData) => {
    const userId = getUserId();
    const payload = { ...designData, userId };
    console.log('Sending design data:', payload);

    const response = await fetch(`${API_BASE_URL}/designs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error('Failed to create design');
    }

    return response.json();
  },

  // Update an existing design
  updateDesign: async (id, designData) => {
    console.log('Updating design:', id, 'with data:', designData);
    const response = await fetch(`${API_BASE_URL}/designs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(designData)
    });
    if (!response.ok) throw new Error('Failed to update design');
    const result = await response.json();
    console.log('Update result:', result);
    return result;
  },

  // Delete a design
  deleteDesign: async (id) => {
    const response = await fetch(`${API_BASE_URL}/designs/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete design');
    return response.json();
  },

  // Move design to trash
  moveToTrash: async (id) => {
    const response = await fetch(`${API_BASE_URL}/designs/${id}/trash`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to move to trash');
    return response.json();
  },

  // Restore design from trash
  restoreFromTrash: async (id) => {
    const response = await fetch(`${API_BASE_URL}/designs/${id}/restore`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to restore from trash');
    return response.json();
  },

  // Permanently delete design
  permanentlyDelete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/designs/${id}/permanent`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to permanently delete');
    return response.json();
  },

  // Upload image to Cloudinary
  uploadImage: async (base64Image) => {
    // Ensure the base64 data has the data URL prefix
    const imageData = base64Image.startsWith('data:')
      ? base64Image
      : `data:image/png;base64,${base64Image}`;

    const formData = new FormData();
    formData.append('file', imageData);
    formData.append('upload_preset', 'cakenmake_uploads');
    // Note: format and quality parameters are not allowed with unsigned uploads
    // These should be configured in the upload preset settings on Cloudinary dashboard

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/de5zq27ye/image/upload`,
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
    return data.secure_url;
  }
};



export const bakeryApi = {
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

export const pricingApi = {
  getPresets: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing`),

  updatePresetPrice: async (id, price, reason) => {
    return requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ price, reason }),
    });
  },

  getChangeLog: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/pricing/log`),
};

export const billingApi = {
  getAIUsageSummary: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/billing/usage`),

  getInvoiceHistory: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/billing/invoices`),
};

export const transactionApi = {
  getTransactions: () => requestAuthenticatedJson(`${API_BASE_URL}/bakery/transactions`),
};
