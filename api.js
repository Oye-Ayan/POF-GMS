/* ════════════════════════════════════════════════════════════════════
   POF GMS — Frontend API Helper
   *** PREVIOUS VERSION without register is preserved in api.js.bak ***
   Manages all fetch requests to the backend with JWT injection.
   Author: Muhammad Ayan Khan | Software Engineer
   ════════════════════════════════════════════════════════════════════ */

'use strict';

const API = {
  BASE_URL: '/api',

  // ── Token Management ──
  getToken() {
    return localStorage.getItem('pof_gms_jwt');
  },

  setToken(token) {
    localStorage.setItem('pof_gms_jwt', token);
  },

  clearToken() {
    localStorage.removeItem('pof_gms_jwt');
    localStorage.removeItem('pof_gms_user');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('pof_gms_user'));
    } catch { return null; }
  },

  setUser(user) {
    localStorage.setItem('pof_gms_user', JSON.stringify(user));
  },

  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  isManager() {
    const user = this.getUser();
    return user && user.role === 'manager';
  },

  // ── Generic Fetch Wrapper ──
  async request(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (response.status === 401) {
        this.clearToken();
        if (typeof showAuthScreen === 'function') showAuthScreen();
        throw new Error(data.message || 'Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP Error ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please ensure the backend is running.');
      }
      throw error;
    }
  },

  // ════════════════════════════════════════
  // AUTH ENDPOINTS
  // ════════════════════════════════════════
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.success && data.token) {
      this.setToken(data.token);
      this.setUser(data.user);
    }
    return data;
  },

  async register(fullName, username, email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, username, email, password }),
    });
    if (data.success && data.token) {
      this.setToken(data.token);
      this.setUser(data.user);
    }
    return data;
  },

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  logout() {
    this.clearToken();
  },

  // ════════════════════════════════════════
  // MEMBER ENDPOINTS
  // ════════════════════════════════════════
  async getMembers() {
    return this.request('/members');
  },

  async getMember(id) {
    return this.request(`/members/${id}`);
  },

  async createMember(memberData) {
    return this.request('/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  },

  async updateMember(id, memberData) {
    return this.request(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
  },

  async updateMemberFee(id, year, month, status) {
    return this.request(`/members/${id}/fee`, {
      method: 'PATCH',
      body: JSON.stringify({ year, month, status }),
    });
  },

  async deleteMember(id) {
    return this.request(`/members/${id}`, {
      method: 'DELETE',
    });
  },

  // ════════════════════════════════════════
  // SHIFT ENDPOINTS
  // ════════════════════════════════════════
  async getShifts() {
    return this.request('/shifts');
  },

  async updateShift(category, timings) {
    return this.request(`/shifts/${encodeURIComponent(category)}`, {
      method: 'PUT',
      body: JSON.stringify(timings),
    });
  },
};
