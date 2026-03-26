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

  /**
   * Commits binary content (using Base64 directly)
   */
  async function commitRaw(path, base64Content, message) {
    const token = CMS_AUTH.getToken();
    if (!token) throw new Error('Not authenticated.');

    // 1. Get SHA if exists
    let sha = null;
    try {
      const res = await fetch(`${API_BASE}/${path}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        sha = data.sha;
      }
    } catch (e) {}

    // 2. Perform PUT
    const body = {
      message: message || `Upload binary: ${path}`,
      content: base64Content,
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
      throw new Error(errorData.message || 'Upload failed');
    }
    return await res.json();
  }

  /**
   * Lists files in a directory
   */
  async function listDir(path) {
    const token = CMS_AUTH.getToken();
    if (!token) throw new Error('Not authenticated.');

    const res = await fetch(`${API_BASE}/${path}`, {
      headers: { 'Authorization': `token ${token}` }
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      const errorData = await res.json();
      throw new Error(errorData.message || 'List directory failed');
    }

    return await res.json();
  }

  /**
   * Fetches the latest runs for a workflow
   */
  async function getLatestWorkflowRun(workflowFileName) {
    const token = CMS_AUTH.getToken();
    if (!token) return null;

    const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${workflowFileName}/runs?per_page=1`;
    const res = await fetch(url, {
      headers: { 'Authorization': `token ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.workflow_runs && data.workflow_runs.length > 0 ? data.workflow_runs[0] : null;
  }

  /**
   * Polls until the workflow run completes
   */
  async function waitForWorkflow(workflowFileName, lastRunId, onProgress) {
    const maxAttempts = 40; // ~6 minutes
    const interval = 8000;  // 8 seconds

    console.log(`[waitForWorkflow] Starting poll for ${workflowFileName}. lastRunId: ${lastRunId}`);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const run = await getLatestWorkflowRun(workflowFileName);
        if (run) {
          console.log(`[waitForWorkflow] Poll ${i}: Run ID ${run.id}, status: ${run.status}, conclusion: ${run.conclusion}`);
          
          // If we had no previous run, or we're waiting for a NEW one to start
          if (lastRunId !== null && run.id <= lastRunId) {
            if (run.status === 'completed') {
              // The "latest" is still an old completed one, wait for the new one to trigger
              if (onProgress) onProgress('waiting_to_start', i);
            } else {
              // It's in progress but it's the OLD one? Unlikely but check
              if (onProgress) onProgress(run.status, i);
            }
          } else {
            // This is either the first run ever, or a NEWER run than lastRunId
            if (onProgress) onProgress(run.status, i, run.conclusion);
            if (run.status === 'completed') {
              return run.conclusion === 'success';
            }
          }
        } else {
          if (onProgress) onProgress('searching', i);
        }
      } catch (e) {
        console.error('[waitForWorkflow] Poll error:', e);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  }

  return {
    commitFile,
    fetchFile,
    deleteFile,
    commitRaw,
    listDir,
    getLatestWorkflowRun,
    waitForWorkflow
  };
})();
