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