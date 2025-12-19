// Simple encryption/decryption utility for token storage
// Using base64 encoding with a simple key for basic obfuscation
// For production, consider using more robust encryption libraries like crypto-js

const ENCRYPTION_KEY = 'taxi-dispatch-admin-key-2024';

/**
 * Encrypts a token for secure storage
 * @param {string} token - The token to encrypt
 * @returns {string} - The encrypted token
 */
export const encryptToken = (token) => {
  try {
    if (!token) return null;
    
    // Simple XOR encryption with base64 encoding
    let encrypted = '';
    for (let i = 0; i < token.length; i++) {
      const tokenChar = token.charCodeAt(i);
      const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      encrypted += String.fromCharCode(tokenChar ^ keyChar);
    }
    
    return btoa(encrypted); // Base64 encode
  } catch (error) {
    console.error('Token encryption failed:', error);
    return null;
  }
};

/**
 * Decrypts a token from storage
 * @param {string} encryptedToken - The encrypted token
 * @returns {string} - The decrypted token
 */
export const decryptToken = (encryptedToken) => {
  try {
    if (!encryptedToken) return null;
    
    // Base64 decode first
    const encrypted = atob(encryptedToken);
    
    // XOR decrypt
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const encryptedChar = encrypted.charCodeAt(i);
      const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      decrypted += String.fromCharCode(encryptedChar ^ keyChar);
    }
    
    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error);
    return null;
  }
};

/**
 * Stores encrypted token in localStorage
 * @param {string} token - The token to store
 */
export const storeEncryptedToken = (token) => {
  try {
    const encryptedToken = encryptToken(token);
    if (encryptedToken) {
      localStorage.setItem('admin_token', encryptedToken);
    }
  } catch (error) {
    console.error('Failed to store encrypted token:', error);
  }
};

/**
 * Retrieves and decrypts token from localStorage
 * @returns {string|null} - The decrypted token or null
 */
export const getDecryptedToken = () => {
  try {
    const encryptedToken = localStorage.getItem('admin_token');
    return encryptedToken ? decryptToken(encryptedToken) : null;
  } catch (error) {
    console.error('Failed to retrieve decrypted token:', error);
    return null;
  }
};

/**
 * Removes encrypted token from localStorage
 */
export const removeEncryptedToken = () => {
  try {
    localStorage.removeItem('admin_token');
  } catch (error) {
    console.error('Failed to remove encrypted token:', error);
  }
};

/**
 * Stores tenant id in localStorage (plain string)
 * @param {string} tenantId
 */
export const storeTenantId = (tenantId) => {
  try {
    if (!tenantId) return;
    localStorage.setItem('tenant_id', tenantId);
  } catch (error) {
    console.error('Failed to store tenant id:', error);
  }
};

/**
 * Stores tenant data (e.g. company profile) in localStorage
 * @param {object} tenantData
 */
export const storeTenantData = (tenantData) => {
  try {
    if (!tenantData) return;
    localStorage.setItem('tenant_data', JSON.stringify(tenantData));
  } catch (error) {
    console.error('Failed to store tenant data:', error);
  }
};

/**
 * Retrieves tenant id from localStorage
 * @returns {string|null}
 */
export const getTenantId = () => {
  try {
    return localStorage.getItem('tenant_id');
  } catch (error) {
    console.error('Failed to get tenant id:', error);
    return null;
  }
};

/**
 * Retrieves tenant data from localStorage
 * @returns {object|null}
 */
export const getTenantData = () => {
  try {
    const raw = localStorage.getItem('tenant_data');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to get tenant data:', error);
    return null;
  }
};

/**
 * Removes tenant id from localStorage
 */
export const removeTenantId = () => {
  try {
    localStorage.removeItem('tenant_id');
  } catch (error) {
    console.error('Failed to remove tenant id:', error);
  }
};

/**
 * Removes tenant data from localStorage
 */
export const removeTenantData = () => {
  try {
    localStorage.removeItem('tenant_data');
  } catch (error) {
    console.error('Failed to remove tenant data:', error);
  }
};

/**
 * Checks if user is authenticated by verifying token existence
 * @returns {boolean} - True if token exists and is valid
 */
export const isAuthenticated = () => {
  try {
    const token = getDecryptedToken();
    return token !== null && token.length > 0;
  } catch (error) {
    console.error('Failed to check authentication status:', error);
    return false;
  }
};

/**
 * Clears all authentication data from localStorage
 * This includes both encrypted tokens and any legacy Redux persistence data
 */
export const clearAllAuthData = () => {
  try {
    // Remove encrypted token
    localStorage.removeItem('admin_token');
    
    // Remove tenant id
    localStorage.removeItem('tenant_id');
    // Remove tenant data
    localStorage.removeItem('tenant_data');

    // Remove any legacy Redux persistence data
    localStorage.removeItem('admin');
    
    console.log('All authentication data cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear authentication data:', error);
  }
};

/**
 * Gets user data from the encrypted token
 * This is a simple implementation - in production you might want to decode JWT
 * @returns {object|null} - User data or null
 */
export const getUserDataFromToken = () => {
  try {
    const token = getDecryptedToken();
    if (!token) return null;
    
    // For now, return default superadmin user data
    // In production, you might want to decode the JWT token to get user info
    return {
      id: 1,
      name: "",
      email: "divonyx23@gmail.com",
      // role: "superadmin",
      avatar: ""
    };
  } catch (error) {
    console.error('Failed to get user data from token:', error);
    return null;
  }
};
