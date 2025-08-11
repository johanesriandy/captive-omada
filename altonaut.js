// altonaut.js
// API client for login, sign up, and orders

const API_BASE_URL = 'https://quota.altonaut.id';
const CLIENT_OPTS = {
    // Enable robust XHR fallback by default to ensure requests fire in constrained environments
    enableFormFallback: true,
    apiBaseUrlOverride: ''
};

function buildAuthHeader(token) {
    const t = (token || '').toString().trim();
    if (!t) return '';
    // Avoid double Bearer prefix
    const lower = t.slice(0, 6).toLowerCase();
    return lower === 'bearer' ? t : `Bearer ${t}`;
}

function getQueryParams() {
    const params = {};
    const q = window.location.search.replace(/^\?/, '');
    q.split('&').forEach(p => {
        if (!p) return;
        const [k, v] = p.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return params;
}

function getOmadaPathInfo() {
    try {
        const path = (window.location.pathname || '').split('?')[0];
        const segments = path.split('/').filter(Boolean);
        let idx = -1;
        for (let i = 1; i < segments.length; i++) {
            if (segments[i] === 'entry' && segments[i - 1] === 'portal') {
                idx = i;
                break;
            }
        }
        if (idx === -1) {
            idx = segments.indexOf('entry');
        }
        if (idx === -1) return null;
        const controllerId = segments[idx + 1];
        const siteId = segments[idx + 2];
        const portalId = segments[idx + 3];
        if (!siteId) return null;
        return { controllerId, siteId, portalId };
    } catch (_) {
        return null;
    }
}

// Resolve API base URL from query param or runtime option, fallback to default
function resolveApiBaseUrl() {
    try {
        const qp = getQueryParams();
        const overrideFromQuery = (qp.apiBaseUrl || '').trim();
        const overrideFromWindow = ((window.altonautClientOptions && window.altonautClientOptions.apiBaseUrlOverride) || CLIENT_OPTS.apiBaseUrlOverride || '').trim();
        return overrideFromQuery || overrideFromWindow || API_BASE_URL;
    } catch (_) {
        return API_BASE_URL;
    }
}

// Removed redundant fetch helper; use native fetch directly

function getTokenFromResult(result) {
    // Support { token }, { data: { token } }, or { data: { token: '...' } }
    if (!result || typeof result !== 'object') return undefined;
    if (result.token) return result.token;
    if (result.data && typeof result.data === 'object') return result.data.token;
    return undefined;
}

function getErrorFromResult(result, fallback) {
    if (!result || typeof result !== 'object') return fallback;
    return result.error || result.message || result.msg || fallback;
}

// Fallback: simple POST without custom headers to avoid CORS preflight
function simpleFormBody(obj) {
    const usp = new URLSearchParams();
    Object.keys(obj || {}).forEach(k => {
        if (obj[k] !== undefined && obj[k] !== null) usp.append(k, String(obj[k]));
    });
    return usp.toString();
}

function trySimplePost(url, dataObj, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            try { xhr.abort(); } catch (_) {}
            reject(new Error('timeout'));
        }, timeoutMs);
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                clearTimeout(timer);
                if (timedOut) return;
                let result = {};
                try { result = xhr.responseText ? JSON.parse(xhr.responseText) : {}; } catch (_) {}
                resolve({ response: { ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status }, result });
            }
        };
        xhr.onerror = () => {
            clearTimeout(timer);
            reject(new Error('network_error'));
        };
        xhr.send(simpleFormBody(dataObj));
    });
}

/**
 * Login function (real API)
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success: boolean, token?: string, error?: string }>}
 */
function login(email, password) {
    const url = `${resolveApiBaseUrl()}/api/auth/login`;
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(async (response) => {
        let result;
        try { result = await response.json(); } catch (_) { result = {}; }
        const token = getTokenFromResult(result);
        if (response.ok && token) {
            return { success: true, token, meta: { status: response.status, url} };
        } else {
            const baseErr = getErrorFromResult(result, 'Login failed.');
            return { success: false, error: baseErr, meta: { status: response.status, url, body: result } };
        }
    })
    .catch((e) => {
        const timeout = e?.name === 'AbortError';
        const base = timeout ? 'Network timeout.' : 'Network error.';
        if (CLIENT_OPTS.enableFormFallback && e?.name === 'TypeError') {
            return trySimplePost(url, { email, password }).then(({ response, result }) => {
                const token = getTokenFromResult(result);
                if (response.ok && token) {
                    return { success: true, token, meta: { status: response.status, url, note: 'simple-form-fallback' } };
                }
                return { success: false, error: getErrorFromResult(result, 'Login failed.'), meta: { status: response.status, url, body: result, note: 'simple-form-fallback' } };
            }).catch(err => ({ success: false, error: 'Network error (fallback).', meta: { errorName: err?.name, message: err?.message, url, note: 'simple-form-fallback' } }));
        }
        return { success: false, error: base, meta: { errorName: e?.name, message: e?.message, url } };
    });
}

/**
 * Sign up function (real API)
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success: boolean, token?: string, error?: string }>}
 */
function signUp(name, email, password) {
    const url = `${resolveApiBaseUrl()}/api/auth/signup`;
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
    })
    .then(async (response) => {
        let data;
        try { data = await response.json(); } catch (_) { data = {}; }
        const token = getTokenFromResult(data);
        if (response.ok && token) {
            return { success: true, token, meta: { status: response.status, url } };
        } else {
            return { success: false, error: getErrorFromResult(data, 'Sign up failed.'), meta: { status: response.status, url, body: data } };
        }
    })
    .catch((e) => {
        if (CLIENT_OPTS.enableFormFallback && e?.name === 'TypeError') {
            return trySimplePost(url, { name, email, password }).then(({ response, result }) => {
                const token = getTokenFromResult(result);
                if (response.ok && token) {
                    return { success: true, token, meta: { status: response.status, url, note: 'simple-form-fallback' } };
                }
                return { success: false, error: getErrorFromResult(result, 'Sign up failed.'), meta: { status: response.status, url, body: result, note: 'simple-form-fallback' } };
            }).catch(err => ({ success: false, error: 'Network error (fallback).', meta: { errorName: err?.name, message: err?.message, url, note: 'simple-form-fallback' } }));
        }
        return { success: false, error: e?.name === 'AbortError' ? 'Network timeout.' : 'Network error.', meta: { errorName: e?.name, message: e?.message, url } };
    });
}

/**
 * Get user info using token
 * @param {string} token
 * @returns {Promise<{ success: boolean, user?: object, error?: string }>}
 */
function getUser(token) {
    const url = `${resolveApiBaseUrl()}/api/auth/user`;
    return fetch(url, {
        method: 'GET',
        // Prevent caches and enforce JSON response
        cache: 'no-store',
        headers: {
            'Authorization': buildAuthHeader(token),
            'Accept': 'application/json'
        }
    })
    .then(async (response) => {
        let result;
        try { result = await response.json(); } catch (_) { result = {}; }
        // Consider 204 No Content or empty payload as failure for getUser
        if (!response.ok || response.status === 204) {
            return { success: false, error: getErrorFromResult(result, 'Failed to fetch user.'), meta: { status: response.status, url, body: result } };
        }

        // Be tolerant to different shapes: {data}, {user}, or full object as user
        const user = (result && (result.data || result.user)) || result;
        const isObject = user && typeof user === 'object' && !Array.isArray(user);
        const hasFields = isObject && Object.keys(user).length > 0;
        if (!hasFields) {
            return { success: false, error: 'No user info returned from server.', meta: { status: response.status, url, body: result } };
        }
        return { success: true, user, meta: { status: response.status, url } };
    })
    .catch((e) => ({ success: false, error: e?.name === 'AbortError' ? 'Network timeout.' : 'Network error.', meta: { errorName: e?.name, message: e?.message, url } }));
}

/**
 * Get all orders for a user
 * @param {string} token - User's auth token
 * @param {string} [siteId] - Site ID (optional, defaults to test value)
 * @returns {Promise<{ success: boolean, orders?: object[], error?: string }>}
 */
function getOrders(token, siteId) {
    const base = resolveApiBaseUrl();
    const pathInfo = getOmadaPathInfo();
    // Resolve siteId from explicit arg, Omada path, or query string
    const qp = getQueryParams();
    const effectiveSiteId = siteId || pathInfo?.siteId || qp.siteId || qp.previewSite;

    // Require siteId since we only support site-orders endpoint
    if (!effectiveSiteId) {
        return Promise.resolve({ success: false, error: 'Missing siteId for site-orders endpoint.' });
    }

    const siteOrdersUrl = `${base}/api/site-orders?siteId=${encodeURIComponent(effectiveSiteId)}`;
    const commonHeaders = {
        'Authorization': buildAuthHeader(token),
        'Accept': 'application/json'
        // Remove Content-Type on GET to reduce preflight
    };

    return fetch(siteOrdersUrl, { method: 'GET', headers: commonHeaders, cache: 'no-store' })
        .then(async (response) => {
            let result;
            try { result = await response.json(); } catch (_) { result = {}; }

            if (!response.ok) {
                return { success: false, error: getErrorFromResult(result, 'Failed to fetch orders.'), meta: { status: response.status, url: siteOrdersUrl, body: result } };
            }

            const orders = (result?.data?.orders) || [];
            if (!Array.isArray(orders)) {
                return { success: false, error: 'Invalid orders payload.', meta: { status: response.status, url: siteOrdersUrl, body: result } };
            }

            return { success: true, orders, meta: { status: response.status, url: siteOrdersUrl } };
        })
        .catch((e) => ({ success: false, error: e?.name === 'AbortError' ? 'Network timeout.' : 'Network error.', meta: { errorName: e?.name, message: e?.message, url: siteOrdersUrl } }));
}

window.altonautApi = {
    login,
    signUp,
    getUser,
    getOrders
};

// Expose client options for quick toggling during diagnostics
window.altonautClientOptions = CLIENT_OPTS;

