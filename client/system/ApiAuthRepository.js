class ApiAuthRepository {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.API_BASE_URL || 'http://localhost:4000';
  }

  async request(path, { method = 'GET', token, body } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || `Request failed with status ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return data;
  }

  register(body) {
    return this.request('/api/auth/register', { method: 'POST', body });
  }

  login(body) {
    return this.request('/api/auth/login', { method: 'POST', body });
  }

  session(token) {
    return this.request('/api/auth/session', { token });
  }

  logout(token) {
    return this.request('/api/auth/logout', { method: 'POST', token });
  }

  updatePreferences(token, prefs) {
    return this.request('/api/auth/preferences', { method: 'PUT', token, body: prefs });
  }

  getSettings() {
    return this.request('/api/auth/settings');
  }

  setSettings(token, requiresApproval) {
    return this.request('/api/auth/settings', { method: 'PUT', token, body: { requiresApproval } });
  }

  listPendingUsers(token) {
    return this.request('/api/auth/pending-users', { token });
  }

  approveUser(token, id) {
    return this.request(`/api/auth/approve/${id}`, { method: 'POST', token });
  }
}

module.exports = ApiAuthRepository;
