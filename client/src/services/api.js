const API_BASE_URL = 'http://localhost:5000/api';

// Get user ID from localStorage (simplified auth)
const getUserId = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.email || 'guest-user';
};

// Design API calls
export const designApi = {
  // Get all designs for current user
  getDesigns: async () => {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/designs?userId=${userId}`);
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



// Only one bakery exists right now, so this is hardcoded. Once a real bakery
// admin login flow exists, store the logged-in bakery's slug here instead.
const DEFAULT_PLATFORM_SLUG = 'mamshie-bakery';

const getPlatformSlug = () => {
  return localStorage.getItem('bakeryPlatformSlug') || DEFAULT_PLATFORM_SLUG;
};

export const bakeryApi = {
  getReservations: async (status) => {
    const platformSlug = getPlatformSlug();
    const qs = status && status !== 'all' ? `&status=${status}` : '';
    const response = await fetch(`${API_BASE_URL}/bakery/reservations?platformSlug=${platformSlug}${qs}`);
    if (!response.ok) throw new Error('Failed to fetch reservations');
    return response.json();
  },

  updateReservationStatus: async (id, status) => {
    const platformSlug = getPlatformSlug();
    const response = await fetch(`${API_BASE_URL}/bakery/reservations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, platformSlug }),
    });
    if (!response.ok) throw new Error('Failed to update reservation status');
    return response.json();
  },
};

export const pricingApi = {
  getPresets: async () => {
    const platformSlug = getPlatformSlug();
    const response = await fetch(`${API_BASE_URL}/bakery/pricing?platformSlug=${platformSlug}`);
    if (!response.ok) throw new Error('Failed to fetch pricing presets');
    return response.json();
  },

  updatePresetPrice: async (id, price, reason) => {
    const platformSlug = getPlatformSlug();
    const response = await fetch(`${API_BASE_URL}/bakery/pricing/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price, reason, platformSlug }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update price');
    }
    return response.json();
  },

  getChangeLog: async () => {
    const platformSlug = getPlatformSlug();
    const response = await fetch(`${API_BASE_URL}/bakery/pricing/log?platformSlug=${platformSlug}`);
    if (!response.ok) throw new Error('Failed to fetch change log');
    return response.json();
  },
};

export const billingApi = {
  getAIUsageSummary: async () => {
    const platformSlug = getPlatformSlug();
    const response = await fetch(`${API_BASE_URL}/bakery/billing/usage?platformSlug=${platformSlug}`);
    if (!response.ok) throw new Error('Failed to fetch billing usage');
    return response.json();
  },

  getInvoiceHistory: async () => {
    const platformSlug = getPlatformSlug();
    const response = await fetch(`${API_BASE_URL}/bakery/billing/invoices?platformSlug=${platformSlug}`);
    if (!response.ok) throw new Error('Failed to fetch invoice history');
    return response.json();
  },
};

export const transactionApi = {
  getTransactions: async () => {
    const platformSlug = getPlatformSlug();
    const response = await fetch(`${API_BASE_URL}/bakery/transactions?platformSlug=${platformSlug}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },
};