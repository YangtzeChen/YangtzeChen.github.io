/**
 * auth.js - Secure Session-Only GitHub PAT Encryption
 * Uses Web Crypto API (AES-GCM + PBKDF2)
 */

const CMS_AUTH = (function() {
  'use strict';

  let decryptedToken = null; // In-Memory Only

  // Helper: Convert string to ArrayBuffer
  function strToBuffer(str) {
    return new TextEncoder().encode(str);
  }

  // Helper: Convert ArrayBuffer to Base64
  function bufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  // Helper: Convert Base64 back to ArrayBuffer
  function base64ToBuffer(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
  }

  /**
   * Derives a cryptographic key from a passphrase and salt.
   */
  async function deriveKey(passphrase, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts the GitHub PAT and stores it in sessionStorage.
   */
  async function lock(token, pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pin, salt);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      strToBuffer(token)
    );

    // Save to sessionStorage (Burn on close)
    const authData = {
      ciphertext: bufferToBase64(encrypted),
      salt: bufferToBase64(salt),
      iv: bufferToBase64(iv)
    };
    sessionStorage.setItem('cms_auth_burn', JSON.stringify(authData));
    decryptedToken = token;
    return true;
  }

  /**
   * Decrypts the PAT from sessionStorage using the PIN.
   */
  async function unlock(pin) {
    const raw = sessionStorage.getItem('cms_auth_burn');
    if (!raw) return false;

    try {
      const { ciphertext, salt, iv } = JSON.parse(raw);
      const key = await deriveKey(pin, base64ToBuffer(salt));

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBuffer(iv) },
        key,
        base64ToBuffer(ciphertext)
      );

      decryptedToken = new TextDecoder().decode(decrypted);
      return true;
    } catch (e) {
      console.warn('Unlock failed: Invalid PIN or corrupted data.');
      return false;
    }
  }

  function logout() {
    sessionStorage.removeItem('cms_auth_burn');
    decryptedToken = null;
    location.reload();
  }

  /**
   * Validates the token against GitHub API.
   */
  async function validateToken(token) {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${token}` }
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  function getToken() {
    return decryptedToken;
  }

  function isUnlocked() {
    return !!decryptedToken;
  }

  function hasStoredSession() {
    return !!sessionStorage.getItem('cms_auth_burn');
  }

  return {
    lock,
    unlock,
    logout,
    getToken,
    isUnlocked,
    hasStoredSession,
    validateToken
  };
})();
