/**
 * github.js - GitHub Repository Content API Wrapper
 */

const GITHUB_CMS = (function() {
  'use strict';

  const OWNER = 'YangtzeChen';
  const REPO = 'YangtzeChen.github.io';
  const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

  /**
   * Commits a file to the repository.
   * Handles both creation and updates.
   */
  async function commitFile(path, content, message) {
    const token = CMS_AUTH.getToken();
    if (!token) throw new Error('Not authenticated with GitHub.');

    // 1. Check if file exists to get SHA
    let sha = null;
    try {
      const res = await fetch(`${API_BASE}/${path}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        sha = data.sha;
      }
    } catch (e) { /* File might not exist */ }

    // 2. Perform PUT request
    const body = {
      message: message || `CMS update: ${path}`,
      content: btoa(unescape(encodeURIComponent(content))), // UTF-8 safe base64
      branch: 'main'
    };
    if (sha) body.sha = sha;

    const res = await fetch(`${API_BASE}/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'GitHub API commit failed');
    }

    return await res.json();
  }

  /**
   * Fetches raw content from GitHub
   */
  /**
   * Fetches raw content from GitHub (with auth if available)
   */
  async function fetchFile(path) {
    const token = CMS_AUTH.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `token ${token}`;

    const res = await fetch(`${API_BASE}/${path}?ref=main&t=${Date.now()}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    // 关键修复：移除 Base64 中的换行符再解码
    const cleanBase64 = data.content.replace(/\s/g, '');
    return decodeURIComponent(escape(atob(cleanBase64)));
  }

  /**
   * Deletes a file from the repository.
   */
  async function deleteFile(path, message) {
    const token = CMS_AUTH.getToken();
    if (!token) throw new Error('Not authenticated.');

    // 1. Get SHA
    let sha = null;
    const resGet = await fetch(`${API_BASE}/${path}`, {
      headers: { 'Authorization': `token ${token}` }
    });
    if (resGet.ok) {
      const data = await resGet.json();
      sha = data.sha;
    } else {
      return; // Already gone?
    }

    // 2. Perform DELETE
    const body = {
      message: message || `CMS delete: ${path}`,
      sha: sha,
      branch: 'main'
    };

    const resDel = await fetch(`${API_BASE}/${path}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!resDel.ok) {
      const errorData = await resDel.json();
      throw new Error(errorData.message || 'GitHub API delete failed');
    }
  }

  return {
    commitFile,
    fetchFile,
    deleteFile
  };
})();
