const AUTH_TYPES = {
    NO_AUTH: 0,
    SIMPLE_PASSWORD: 1,
    EXTERNAL_RADIUS: 2,
    HOTSPOT: 11,
    EXTERNAL_LDAP: 15,
    VOUCHER_ACCESS_TYPE: 3,
    LOCAL_USER_ACCESS_TYPE: 5,
    SMS_ACCESS_TYPE: 6,
    RADIUS_ACCESS_TYPE: 8,
    FORM_AUTH_ACCESS_TYPE: 12
};

const MAX_INPUT_LEN = 2000;

const errorHintMap = {
    "0": "ok",
    "-1": "General error.",
    "-41500": "Invalid authentication type.",
    "-41501": "Failed to authenticate.",
    "-41502": "Voucher code is incorrect.",
    "-41503": "Voucher is expired.",
    "-41504": "Voucher traffic has exceeded the limit.",
    "-41505": "The number of users has reached the limit.",
    "-41506": "Invalid authorization information.",
    "-41507": "Your authentication times out. You can get authenticated again until the next day.",
    "-41508": "Local User traffic has exceeded the limit.",
    "-41512": "Local User is expired.",
    "-41513": "Local User is disabled.",
    "-41514": "MAC address is incorrect.",
    "-41515": "Local User Quota has exceeded the limit.",
    "-41516": "The number of users has reached the limit.",
    "-41517": "Incorrect password.",
    "-41518": "This SSID does not exist.",
    "-41519": "Invalid code.",
    "-41520": "The code is expired.",
    "-41521": "The number of users has reached the limit.",
    "-41522": "Failed to validate the code.",
    "-41523": "Failed to send verification code.",
    "-41524": "Authentication failed because the username does not exist.",
    "-41525": "Authentication failed because of wrong password.",
    "-41526": "Authentication failed because the client is invalid.",
    "-41527": "Authentication failed because the local user is invalid.",
    "-41528": "Failed to decrypt data.",
    "-41529": "Incorrect username or password.",
    "-41530": "Connecting to the RADIUS server times out.",
    "-41531": "Your code has reached your Wi-Fi data limit.",
    "-41532": "Your account has reached your Wi-Fi data limit.",
    "-41533": "Form authentication request is invalid.",
    "-43408": "Invalid LDAP configuration.",
    "-43409": "Invalid LDAP credentials.",
    "-41538": "Voucher is not effective."
};

const Ajax = {
    post: (url, data, callback) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.timeout = 15000;
        const finish = (statusOk) => {
            let parsed;
            let raw = xhr.responseText;
            try {
                parsed = typeof raw === 'string' && raw.length ? JSON.parse(raw) : (raw || {});
            } catch (e) {
                parsed = { error: 'parse_error', message: 'Non-JSON response', rawText: raw };
            }
            callback({
                ok: statusOk,
                httpStatus: xhr.status,
                statusText: xhr.statusText,
                result: parsed,
                rawText: raw
            });
        };
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 304) finish(true);
                else finish(false);
            }
        };
        xhr.onerror = () => {
            callback({ ok: false, httpStatus: xhr.status, statusText: xhr.statusText, result: { error: 'network_error' } });
        };
        xhr.ontimeout = () => {
            callback({ ok: false, httpStatus: xhr.status, statusText: 'Timeout', result: { error: 'timeout' } });
        };
        xhr.send(data);
    }
};

// Hotspot type labels expected by UI population
const hotspotMap = {
    [AUTH_TYPES.VOUCHER_ACCESS_TYPE]: "Voucher Access",
    [AUTH_TYPES.LOCAL_USER_ACCESS_TYPE]: "Local User Access",
    [AUTH_TYPES.SMS_ACCESS_TYPE]: "SMS Access",
    [AUTH_TYPES.RADIUS_ACCESS_TYPE]: "RADIUS Access",
    [AUTH_TYPES.FORM_AUTH_ACCESS_TYPE]: "Form Auth Access"
};

// Safe DOM utils to avoid null reference errors in customized templates
function safeById(id) {
    return document.getElementById(id) || null;
}
function safeShow(id, display = 'block') {
    const el = safeById(id);
    if (el && el.style) el.style.display = display;
}
function safeHide(id) {
    const el = safeById(id);
    if (el && el.style) el.style.display = 'none';
}

const getQueryStringKey = (key) => getQueryStringAsObject()[key];

const getQueryStringAsObject = () => {
    const params = {};
    try {
        const usp = new URLSearchParams(window.location.search);
        for (const [k, v] of usp.entries()) {
            if (params[k]) {
                if (!Array.isArray(params[k])) params[k] = [params[k]];
                params[k].push(v);
            } else {
                params[k] = v;
            }
        }
    } catch (_) {
        // Fallback parser without decoding entire string first
        const raw = (window.location.search || '').replace(/^\?/, '');
        raw.split('&').forEach(pair => {
            if (!pair) return;
            const [k, v] = pair.split('=');
            const key = decodeURIComponent(k || '');
            const val = decodeURIComponent(v || '');
            if (params[key]) {
                if (!Array.isArray(params[key])) params[key] = [params[key]];
                params[key].push(val);
            } else {
                params[key] = val;
            }
        });
    }
    return params;
};

const clientMac = getQueryStringKey("clientMac");
const apMac = getQueryStringKey("apMac");
const gatewayMac = getQueryStringKey("gatewayMac") || undefined;
const ssidName = getQueryStringKey("ssidName") || undefined;
const radioId = getQueryStringKey("radioId") ? Number(getQueryStringKey("radioId")) : undefined;
const vid = getQueryStringKey("vid") ? Number(getQueryStringKey("vid")) : undefined;
const originUrl = getQueryStringKey("originUrl");
const previewSite = getQueryStringKey("previewSite");

let isCommitted = false;
let globalConfig = {};
let submitUrl;

const handleAjaxResponse = (response) => {
    const data = response?.result || {};
    submitUrl = "/portal/auth";
    const landingUrl = data.landingUrl;

    globalConfig = {
        authType: AUTH_TYPES.VOUCHER_ACCESS_TYPE,
        hotspotTypes: [AUTH_TYPES.VOUCHER_ACCESS_TYPE],
        buttonText: data.portalCustomize?.buttonText || 'Log In',
        formAuthButtonText: data.portalCustomize?.formAuthButtonText || 'Take the Survey',
        formAuth: data.formAuth || {},
        error: data.error || 'ok',
        countryCode: `+${data.sms?.countryCode || 1}`,
        landingUrl
    };

    configurePage(globalConfig);
};

const configurePage = (config) => {
    safeHide("oper-hint");
    safeHide("hotspot-section");
    safeHide("input-voucher");
    safeHide("input-user");
    safeHide("input-password");
    safeHide("input-simple");
    safeHide("input-phone-num");
    safeHide("input-verify-code");

    // Always enforce voucher as selected/only method
    window.authType = AUTH_TYPES.VOUCHER_ACCESS_TYPE;
};

// Expose a helper to submit voucher auth to Omada controller
window.submitVoucherAuth = function submitVoucherAuth(voucherCode, callbacks = {}) {
    const { onStart, onSuccess, onError, onDone } = callbacks;
    if (!voucherCode || typeof voucherCode !== 'string') {
        onError && onError('Invalid voucher code.');
        return;
    }
    if (onStart) onStart();

    const payload = JSON.stringify({
        clientMac,
        apMac,
        gatewayMac,
        ssidName,
        radioId,
        vid,
        originUrl,
        authType: AUTH_TYPES.VOUCHER_ACCESS_TYPE,
        voucherCode: voucherCode.trim().slice(0, MAX_INPUT_LEN)
    });

    Ajax.post(submitUrl || '/portal/auth', payload, (resp) => {
        try {
            const httpStatus = resp?.httpStatus;
            const statusText = resp?.statusText;
            const result = resp?.result || {};
            // Omada responses vary; treat 0 or 'ok' as success
            const code = result.errCode ?? result.errorCode ?? result.code;
            const primaryMsg = result.error || result.message || result.msg;
            const msgKey = String(code ?? (primaryMsg === 'ok' ? 0 : -1));
            const ok = (code === 0) || (primaryMsg === 'ok');
            if (ok) {
                onSuccess && onSuccess(result);
                // Try to redirect if a landing URL is provided
                const urlFromResult = typeof result.result === 'string' ? result.result : undefined;
                const url = urlFromResult || result.landingUrl || globalConfig.landingUrl || originUrl;
                if (url) {
                    try { window.location.replace(url); } catch (_) { window.location.href = url; }
                }
            } else {
        // Provide concise guidance when voucher auth is misconfigured on the controller
                const numeric = Number(code);
                const misconfigCodes = new Set([-41500, -41533, -41538]);
                const fallback = errorHintMap[msgKey] || primaryMsg || 'Failed to authenticate.';
                let human = misconfigCodes.has(numeric)
                    ? 'Voucher authentication failed on the controller. Please verify that Voucher is enabled and configured for this SSID/site.'
                    : fallback;
                // Additional environment-specific hints can be added here.
        onError && onError(human, result);
                const hint = safeById('oper-hint');
                if (hint) {
                    let full = human;
                    if (code !== undefined) full += ` (code ${code})`;
                    hint.textContent = full;
                    hint.style.display = 'block';
                }
                
            }
        } finally {
            onDone && onDone();
        }
    });
};

Ajax.post(
    '/portal/getPortalPageSetting',
    JSON.stringify({
        clientMac,
        apMac,
        gatewayMac,
        ssidName,
        radioId,
        vid,
        originUrl
    }),
    handleAjaxResponse
);
