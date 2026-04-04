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
      return { error: data.error || 'Something went wrong', status: response.status };
    }

    return { data, status: response.status };
  } catch (err) {
    return { error: 'Network error — check your connection', status: 0 };
  }
}

// Auth endpoints
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