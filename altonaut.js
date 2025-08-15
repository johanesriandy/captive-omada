// altonaut.js
// API client for login, sign up, and orders

const API_BASE_URL = 'https://quota-management--quota-management-3be9d.asia-east1.hosted.app';

// Utility functions
const sanitizeBearerToken = (token) => {
    const t = String(token || '').trim();
    if (!t) return '';
    return t.toLowerCase().startsWith('bearer') ? t : `Bearer ${t}`;
};

const getQueryParams = () => {
    try {
        return Object.fromEntries(new URLSearchParams(window.location.search));
    } catch {
        // Fallback for older browsers
        const params = {};
        const query = window.location.search.replace(/^\?/, '');
        query.split('&').forEach(pair => {
            if (!pair) return;
            const [key, value = ''] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value);
        });
        return params;
    }
};

const getOmadaPathInfo = () => {
    try {
        const segments = window.location.pathname.split('/').filter(Boolean);
        console.log('Path segments:', segments);
        
        // Find 'entry' index, preferring the one after 'portal'
        let entryIndex = -1;
        for (let i = 1; i < segments.length; i++) {
            if (segments[i] === 'entry' && segments[i - 1] === 'portal') {
                entryIndex = i;
                break;
            }
        }
        
        if (entryIndex === -1) {
            entryIndex = segments.indexOf('entry');
        }
        
        if (entryIndex === -1) return null;
        
        const [controllerId, siteId, portalId] = segments.slice(entryIndex + 1);
        return siteId ? { controllerId, siteId, portalId } : null;
    } catch (error) {
        console.error('Failed to parse Omada path info:', error);
        return null;
    }
};

// API utilities
const extractToken = (result) => {
    if (!result || typeof result !== 'object') return undefined;
    return result.token || result.data?.token;
};

const extractError = (result, fallback = 'Request failed') => {
    if (!result || typeof result !== 'object') return fallback;
    return result.error || result.message || result.msg || fallback;
};

const createApiRequest = async (url, options = {}) => {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        const result = await response.json();
        
        return {
            response,
            result,
            meta: { status: response.status, url }
        };
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

/**
 * Login function
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success: boolean, token?: string, error?: string, meta?: object }>}
 */
const login = async (email, password) => {
    try {
        const { response, result, meta } = await createApiRequest(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        const token = extractToken(result);
        if (response.ok && token) {
            return { success: true, token, meta };
        }
        
        return { 
            success: false, 
            error: extractError(result, 'Login failed.'), 
            meta: { ...meta, body: result }
        };
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

/**
 * Sign up function
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success: boolean, token?: string, error?: string, meta?: object }>}
 */
const signUp = async (name, email, password) => {
    try {
        const { response, result, meta } = await createApiRequest(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        const token = extractToken(result);
        if (response.ok && token) {
            return { success: true, token, meta };
        }
        
        return { 
            success: false, 
            error: extractError(result, 'Sign up failed.'), 
            meta: { ...meta, body: result }
        };
    } catch (error) {
        console.error('Sign up error:', error);
        throw error;
    }
};

/**
 * Get user info using token
 * @param {string} token
 * @returns {Promise<{ success: boolean, user?: object, error?: string, meta?: object }>}
 */
const getUser = async (token) => {
    try {
        const { response, result, meta } = await createApiRequest(`${API_BASE_URL}/api/auth/user`, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Authorization': sanitizeBearerToken(token)
            }
        });

        if (!response.ok || response.status === 204) {
            return { 
                success: false, 
                error: extractError(result, 'Failed to fetch user.'), 
                meta: { ...meta, body: result }
            };
        }

        // Extract user data from various possible structures
        const user = result?.data || result?.user || result;
        const isValidUser = user && typeof user === 'object' && !Array.isArray(user) && Object.keys(user).length > 0;
        
        if (!isValidUser) {
            return { 
                success: false, 
                error: 'No user info returned from server.', 
                meta: { ...meta, body: result }
            };
        }

        return { success: true, user, meta };
    } catch (error) {
        console.error('Get user error:', error);
        throw error;
    }
};

/**
 * Get all orders for a user
 * @param {string} token - User's auth token
 * @param {string} [siteId] - Site ID (optional, defaults to path value)
 * @returns {Promise<{ success: boolean, orders?: object[], error?: string, meta?: object }>}
 */
const getOrders = async (token, siteId) => {
    const pathInfo = getOmadaPathInfo();
    const effectiveSiteId = siteId || pathInfo?.siteId;

    if (!effectiveSiteId) {
        return { success: false, error: 'Site not found. Please contact technical support.' };
    }

    const url = `${API_BASE_URL}/api/site-orders?siteId=${encodeURIComponent(effectiveSiteId)}`;
    console.debug('[altonautApi] Fetching site orders', { siteId: effectiveSiteId, url });

    try {
        const { response, result, meta } = await createApiRequest(url, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Authorization': sanitizeBearerToken(token)
            }
        });

        if (!response.ok) {
            return { 
                success: false, 
                error: extractError(result, 'Failed to fetch orders.'), 
                meta: { ...meta, body: result }
            };
        }

        const orders = result?.data?.orders || [];
        if (!Array.isArray(orders)) {
            return { 
                success: false, 
                error: 'Invalid orders payload.', 
                meta: { ...meta, body: result }
            };
        }

        console.debug('[altonautApi] Site orders fetched successfully', { count: orders.length });
        return { success: true, orders, meta };
    } catch (error) {
        console.error('[altonautApi] Site orders error:', error);
        throw error;
    }
};

// Export API
window.altonautApi = {
    login,
    signUp,
    getUser,
    getOrders,
    getOmadaPathInfo,
};

