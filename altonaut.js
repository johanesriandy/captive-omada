// altonaut.js
// Mock API client for login and sign up

const API_BASE_URL = 'http://localhost:3001'; // Change to your API base URL

/**
 * Login function (real API)
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success: boolean, token?: string, error?: string }>}
 */
function login(email, password) {
    return fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(async (response) => {
        const result = await response.json();
        console.log(Boolean(result.data.token), Boolean(response.ok));
        if (response.ok && result.data.token) {
            return { success: true, token: result.data.token };
        } else {
            return { success: false, error: result.error || 'Login failed.' };
        }
    })
    .catch(() => ({ success: false, error: 'Network error.' }));
}

/**
 * Sign up function (real API)
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success: boolean, token?: string, error?: string }>}
 */
function signUp(name, email, password) {
    return fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
    })
    .then(async (response) => {
        const data = await response.json();
        if (response.ok && data.token) {
            return { success: true, token: data.token };
        } else {
            return { success: false, error: data.error || 'Sign up failed.' };
        }
    })
    .catch(() => ({ success: false, error: 'Network error.' }));
}

// Export functions for use in other scripts
/**
 * Get user info using token
 * @param {string} token
 * @returns {Promise<{ success: boolean, user?: object, error?: string }>}
 */
function getUser(token) {
    return fetch(`${API_BASE_URL}/api/auth/user`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.data) {
            return { success: true, user: result.data };
        } else {
            return { success: false, error: result.error || 'Failed to fetch user.' };
        }
    })
    .catch(() => ({ success: false, error: 'Network error.' }));
}

/**
 * Get all orders for a user
 * @param {string} token - User's auth token
 * @param {string} [siteId] - Site ID (optional, defaults to test value)
 * @returns {Promise<{ success: boolean, orders?: object[], error?: string }>}
 */
function getOrders(token, siteId = '6800c2ed66405717f648db3a') {
    const url = `${API_BASE_URL}/api/orders?siteId=${encodeURIComponent(siteId)}`;
    return fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(async (response) => {
        const result = await response.json();
        // Expecting { status, code, data: { orders: [...] } }
        if (response.ok && result.data && Array.isArray(result.data.orders)) {
            return { success: true, orders: result.data.orders };
        } else {
            return { success: false, error: result.error || 'Failed to fetch orders.' };
        }
    })
    .catch(() => ({ success: false, error: 'Network error.' }));
}

window.altonautApi = {
    login,
    signUp,
    getUser,
    getOrders
};
