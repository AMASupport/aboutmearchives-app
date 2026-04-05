const API_BASE = 'https://aboutmearchives.com/wp-json/tlr/v1';

export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body = null, token = null } = options;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const config = {
    method,
    headers,
  };
  if (body) {
    config.body = JSON.stringify(body);
  }
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error || data.message || 'Something went wrong', status: response.status };
    }
    return { data, status: response.status };
  } catch (err) {
    return { error: 'Network error — check your connection', status: 0 };
  }
}

// ============================================================
// Auth endpoints
// ============================================================

export const login = (email, password) =>
  apiRequest('/auth/login', { method: 'POST', body: { email, password } });

export const getMe = (token) =>
  apiRequest('/auth/me', { token });

export const refreshToken = (token) =>
  apiRequest('/auth/refresh', { method: 'POST', token });

// Dashboard
export const getDashboard = (token) =>
  apiRequest('/dashboard', { token });

// ============================================================
// Recording / Video endpoints
// ============================================================

// Legacy Snapshot — get 10 questions with recorded status
export const getSnapshotProgress = (token) =>
  apiRequest('/videos/snapshots', { token });

// All user videos
export const getMyVideos = (token) =>
  apiRequest('/videos/my', { token });

// Save video metadata after Bunny.net upload
export const saveVideo = (token, videoData) =>
  apiRequest('/videos/save', { method: 'POST', body: videoData, token });

// Delete a video
export const deleteVideo = (token, videoId) =>
  apiRequest(`/videos/${videoId}`, { method: 'DELETE', token });

// Get Bunny.net upload URL
export const getUploadUrl = (token, videoType) =>
  apiRequest('/videos/upload-url', { method: 'POST', body: { video_type: videoType }, token });

// Guided Questions — all categories with questions
export const getGuidedQuestions = (token) =>
  apiRequest('/questions', { token });

// ============================================================
// Bunny.net direct upload
// ============================================================

export async function uploadToBunny(uploadUrl, apiKey, fileUri) {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'video/mp4',
      },
      body: blob,
    });
    return { success: uploadResponse.ok, status: uploadResponse.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// Family Tree endpoints
// ============================================================

// Get all family members (card list)
export const getFamilyMembers = (token) =>
  apiRequest('/family/members', { token });

// Get full tree data (nodes + relationships for visualization)
export const getFamilyTree = (token) =>
  apiRequest('/family/tree', { token });

// Add a new family member
export const addFamilyMember = (token, memberData) =>
  apiRequest('/family/add', { method: 'POST', body: memberData, token });

// Edit a family member
export const editFamilyMember = (token, memberId, memberData) =>
  apiRequest(`/family/edit/${memberId}`, { method: 'PUT', body: memberData, token });

// Remove a family member
export const removeFamilyMember = (token, memberId) =>
  apiRequest(`/family/remove/${memberId}`, { method: 'DELETE', token });

// Send/resend invitation email
export const inviteFamilyMember = (token, memberId) =>
  apiRequest('/family/invite', { method: 'POST', body: { member_id: memberId }, token });

// ============================================================
// Tapestry endpoints
// ============================================================

// Get connections (friends + pending sent/received)
export const getTapestryConnections = (token) =>
  apiRequest('/tapestry/connections', { token });

// Get network data for visualization
export const getTapestryNetwork = (token) =>
  apiRequest('/tapestry/network', { token });

// Send invitation
export const sendTapestryInvite = (token, name, email) =>
  apiRequest('/tapestry/invite', { method: 'POST', body: { name, email }, token });

// Accept invitation
export const acceptTapestryInvite = (token, connectionId) =>
  apiRequest('/tapestry/accept', { method: 'POST', body: { connection_id: connectionId }, token });

// Decline invitation
export const declineTapestryInvite = (token, connectionId) =>
  apiRequest('/tapestry/decline', { method: 'POST', body: { connection_id: connectionId }, token });

// Remove connection
export const removeTapestryConnection = (token, connectionId) =>
  apiRequest('/tapestry/remove', { method: 'POST', body: { connection_id: connectionId }, token });

// Resend invitation
export const resendTapestryInvite = (token, connectionId) =>
  apiRequest('/tapestry/resend', { method: 'POST', body: { connection_id: connectionId }, token });
// Cancel invitation
export const cancelTapestryInvite = (token, connectionId) =>
  apiRequest('/tapestry/cancel', { method: 'POST', body: { connection_id: connectionId }, token });
// ============================================
// VAULT ENDPOINTS
// ============================================

// GET /vault/messages — List all vault messages + stats
export async function getVaultMessages(token) {
  const res = await fetch(`${API_BASE}/vault/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// POST /vault/create — Create a new vault message
export async function createVaultMessage(token, data) {
  const res = await fetch(`${API_BASE}/vault/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

// PUT /vault/edit/{id} — Edit an existing vault message
export async function editVaultMessage(token, vaultId, data) {
  const res = await fetch(`${API_BASE}/vault/edit/${vaultId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

// DELETE /vault/delete/{id} — Delete a vault message
export async function deleteVaultMessage(token, vaultId) {
  const res = await fetch(`${API_BASE}/vault/delete/${vaultId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}