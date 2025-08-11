let isSignUpMode = false;
const MAX_WAIT_MS = 15000; // hard cap to avoid indefinite loading
function showLoading() { document.getElementById("loading-overlay").classList.remove("hidden"); }
function hideLoading() { document.getElementById("loading-overlay").classList.add("hidden"); }
function showAuthError(message) {
    const el = document.getElementById("auth-error-message");
    el.textContent = message;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 5000);
}
function showAndroidBanner() {
    // No-op: banner removed
}
function showCaptiveError(message) {
    const el = document.getElementById("oper-hint");
    el.textContent = message;
    el.classList.remove("hidden");
}

// Resolve siteId from path (/portal/entry/{controllerId}/{siteId}/{portalId}) or from query (?siteId=... or ?previewSite=...)
function resolveSiteId() {
    try {
        const usp = new URLSearchParams(window.location.search);
        const qpSite = usp.get('siteId') || usp.get('previewSite');
        if (qpSite) return qpSite;
    } catch (_) { /* ignore */ }
    try {
        const segments = (window.location.pathname || '').split('?')[0].split('/').filter(Boolean);
        let idx = -1;
        for (let i = 1; i < segments.length; i++) {
            if (segments[i] === 'entry' && segments[i - 1] === 'portal') { idx = i; break; }
        }
        if (idx === -1) idx = segments.indexOf('entry');
        if (idx !== -1) {
            const siteId = segments[idx + 2];
            if (siteId) return siteId;
        }
    } catch (_) { /* ignore */ }
    return null;
}
function showCaptiveSection(user) {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("captive-section").style.display = "block";
    document.getElementById("logged-user-email").textContent = user.email;
    const step1 = document.getElementById("step1-indicator");
    const step2 = document.getElementById("step2-indicator");
    step1.classList.remove("bg-primary", "text-white");
    step1.classList.add("bg-gray-200", "text-gray-600");
    step2.classList.remove("bg-gray-200", "text-gray-600");
    step2.classList.add("bg-primary", "text-white");
    renderOrderListEmbedded();
}
function showAuthSection() {
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("captive-section").style.display = "none";
    const step1 = document.getElementById("step1-indicator");
    const step2 = document.getElementById("step2-indicator");
    step1.classList.remove("bg-gray-200", "text-gray-600");
    step1.classList.add("bg-primary", "text-white");
    step2.classList.remove("bg-primary", "text-white");
    step2.classList.add("bg-gray-200", "text-gray-600");
}
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    const nameContainer = document.getElementById("auth-name-container");
    const authTitle = document.getElementById("auth-title");
    const authSubtitle = document.getElementById("auth-subtitle");
    const authButton = document.getElementById("auth-button");
    const toggleLink = document.getElementById("toggle-auth-mode");
    const toggleText = document.getElementById("auth-toggle-text");
    if (isSignUpMode) {
        nameContainer.classList.remove("hidden");
        authTitle.textContent = "Create Account";
        authSubtitle.textContent = "Sign up to access the network";
        authButton.textContent = "Sign Up";
        toggleText.textContent = "Already have an account?";
        toggleLink.textContent = "Sign in instead";
    } else {
        nameContainer.classList.add("hidden");
        authTitle.textContent = "Welcome Back";
        authSubtitle.textContent = "Please sign in with your account to continue";
        authButton.textContent = "Sign In";
        toggleText.textContent = "Don't have an account?";
        toggleLink.textContent = "Sign up here";
    }
    document.getElementById("auth-error-message").classList.add("hidden");
}
function handleSignUp(name, email, password) {
    showLoading();
    // Safety timer to ensure we never spin forever
    const timer = setTimeout(() => {
        hideLoading();
        showAuthError('Request is taking too long. Please check your connection and try again.');
    }, MAX_WAIT_MS);
    try {
        Promise.resolve(window.altonautApi.signUp(name, email, password))
        .then((result) => {
            clearTimeout(timer);
            if (result.success && result.token) {
                sessionStorage.setItem('authToken', result.token);
                return window.altonautApi.getUser(result.token);
            }
            hideLoading();
            let msg = result.error || "Registration failed. Please try again.";
            if (result.error === "Email already registered.") msg = "This email is already registered. Please sign in instead.";
            else if (result.error === "Invalid email format.") msg = "Invalid email address format.";
            else if (result.error === "Password too weak.") msg = "Password is too weak. Please use at least 6 characters.";
            showAuthError(msg);
            return null;
        })
        .then((userResult) => {
            if (!userResult) return; // prior step already handled error UI
            hideLoading();
            if (userResult.success) {
                showCaptiveSection(userResult.user);
            } else {
                // Proceed with login despite user info fetch failure
                showCaptiveSection({ email });
                showCaptiveError(userResult.error || 'Could not fetch user info.');
            }
        })
        .catch((error) => {
            clearTimeout(timer);
            hideLoading();
            // Network failure on the sign-up request itself still blocks login
            showAuthError("Registration failed. Please try again.");
            if (error?.meta?.errorName === 'TypeError') showAndroidBanner();
        });
    } catch (err) {
        clearTimeout(timer);
        hideLoading();
        showAuthError('Unexpected error starting request. Please try again.');
        console.error('SignUp error:', err);
    }
}
function handleSignIn(email, password) {
    showLoading();
    // Safety timer to ensure we never spin forever
    const timer = setTimeout(() => {
        hideLoading();
        showAuthError('Request is taking too long. Please check your connection and try again.');
    }, MAX_WAIT_MS);
    try {
        Promise.resolve(window.altonautApi.login(email, password))
        .then((result) => {
            clearTimeout(timer);
            if (result.success && result.token) {
                sessionStorage.setItem('authToken', result.token);
                return window.altonautApi.getUser(result.token);
            }
            hideLoading();
            let msg = result.error || "Authentication failed. Please try again.";
            if (result.error === "Invalid email or password.") msg = "Invalid email or password. Please try again.";
            showAuthError(msg);
            return null;
        })
        .then((userResult) => {
            if (!userResult) return; // prior step already handled error UI
            hideLoading();
            if (userResult.success) {
                showCaptiveSection(userResult.user);
            } else {
                // Proceed with login despite user info fetch failure
                showCaptiveSection({ email });
                showCaptiveError(userResult.error || 'Could not fetch user info.');
            }
        })
        .catch((error) => {
            clearTimeout(timer);
            hideLoading();
            showAuthError("Authentication failed. Please try again.");
            if (error?.meta?.errorName === 'TypeError') showAndroidBanner();
        });
    } catch (err) {
        clearTimeout(timer);
        hideLoading();
        showAuthError('Unexpected error starting request. Please try again.');
        console.error('SignIn error:', err);
    }
}
function handleLogout() {
    sessionStorage.removeItem('authToken');
    document.getElementById("auth-form").reset();
    document.getElementById("auth-error-message").classList.add("hidden");
    showAuthSection();
}
function showOrderList() {
    document.getElementById("order-list-section").classList.remove("hidden");
    const orderList = document.getElementById("order-list");
    orderList.innerHTML = "<div class='text-gray-500 text-center'>Loading...</div>";
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        orderList.innerHTML = "<div class='text-red-500 text-center'>Not authenticated.</div>";
        return;
    }
    const siteId = resolveSiteId();
    if (!siteId) {
        orderList.innerHTML = "<div class='text-red-500 text-center'>Site not found. Please contact technical support.</div>";
        return;
    }
    window.altonautApi.getOrders(token, siteId)
        .then(result => {
            if (result.success && Array.isArray(result.orders)) {
                if (result.orders.length === 0) {
                    orderList.innerHTML = "<div class='text-gray-500 text-center'>No orders found.</div>";
                } else {
                    orderList.innerHTML = "";
                    result.orders.forEach(order => {
                        const validUntil = order.validUntil ? new Date(order.validUntil) : null;
                        const validText = validUntil ? validUntil.toLocaleString() : (order.validUntil || 'N/A');
            const voucherDisplay = '';
                        const card = document.createElement("div");
                        card.className = "border rounded-lg p-4 shadow hover:bg-blue-100 cursor-pointer transition";
                        card.innerHTML = `
                            <div class=\"font-bold text-lg text-primary mb-1\">${order.packageName}</div>
                            <div class=\"text-gray-700 mb-2\">${order.description || ''}</div>
                            <div class=\"text-xs text-gray-500\">Valid Until (info): ${validText}</div>
                            ${voucherDisplay ? `<div class=\"text-xs text-gray-400 mt-1\">Code: <span class=\"font-mono\">${voucherDisplay}</span></div>` : ''}
                        `;
                        card.onclick = () => { alert(`Selected: ${order.packageName}`); };
                        orderList.appendChild(card);
                    });
                }
            } else {
                const msg = result?.error === 'Site not found. Please contact technical support.'
                    ? 'Site not found. Please contact technical support.'
                    : 'Error loading orders. Please try again later.';
        orderList.innerHTML = `<div class='text-red-500 text-center'>${msg}</div>`;
            }
        })
        .catch(error => {
            orderList.innerHTML = "<div class='text-red-500 text-center'>Error loading orders. Please try again later.</div>";
        });
}
function renderOrderListEmbedded() {
    const orderList = document.getElementById("order-list-embedded");
    orderList.innerHTML = "<div class='text-gray-500 text-center'>Loading...</div>";
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        orderList.innerHTML = "<div class='text-red-500 text-center'>Not authenticated.</div>";
        return;
    }
    const siteId = resolveSiteId();
    if (!siteId) {
        orderList.innerHTML = "<div class='text-red-500 text-center'>Site not found. Please contact technical support.</div>";
        return;
    }
    window.altonautApi.getOrders(token, siteId)
        .then(result => {
            if (result.success && Array.isArray(result.orders)) {
                if (result.orders.length === 0) {
                    orderList.innerHTML = "<div class='text-gray-500 text-center'>No orders found.</div>";
                } else {
                    orderList.innerHTML = "";
                    result.orders.forEach(order => {
                        const validUntil = order.validUntil ? new Date(order.validUntil) : null;
                        const validText = validUntil ? validUntil.toLocaleString() : (order.validUntil || 'N/A');
            const voucherDisplay = '';
                        const card = document.createElement("div");
                        card.className = `border rounded-lg p-3 shadow-sm bg-white transition flex flex-col gap-1`;
                        card.innerHTML = `
                            <div class=\"font-semibold text-primary text-sm mb-0.5\">${order.packageName}</div>
                            <div class=\"text-gray-700 text-xs\">${order.description || ''}</div>
                            <div class=\"text-xs text-gray-400\">Valid Until (info): ${validText}</div>
                            ${voucherDisplay ? `<div class=\"text-xs text-gray-400\">Code: <span class=\"font-mono\">${voucherDisplay}</span></div>` : ''}
                            <button class=\"mt-1 w-full bg-primary hover:bg-primary-dark text-white rounded-md py-1.5 text-sm font-medium transition\">Use this package</button>
                        `;
                        card.querySelector('button').onclick = (e) => {
                            e.stopPropagation();
                            useOrderForVoucher(order);
                        };
                        orderList.appendChild(card);
                    });
                }
            } else {
                const msg = result?.error === 'Site not found. Please contact technical support.'
                    ? 'Site not found. Please contact technical support.'
                    : 'Error loading orders. Please try again later.';
        orderList.innerHTML = `<div class='text-red-500 text-center'>${msg}</div>`;
            }
        })
        .catch(error => {
            orderList.innerHTML = "<div class='text-red-500 text-center'>Error loading orders. Please try again later.</div>";
        });
}
function useOrderForVoucher(order) {
    const voucher = order?.voucherCode || order?.voucher || order?.code;
    if (!voucher) {
        showCaptiveError('Selected order has no voucher code. Please contact support.');
        return;
    }
    if (typeof window.submitVoucherAuth !== 'function') {
        showCaptiveError('Voucher authentication is not available. Please contact support.');
        return;
    }
    const onStart = () => {
        showLoading();
        const success = document.getElementById('captive-success-message');
        if (success) success.classList.add('hidden');
    };
    const onSuccess = () => {
        const success = document.getElementById('captive-success-message');
        if (success) {
            success.textContent = 'Authentication successful! Redirecting...';
            success.classList.remove('hidden');
        }
    };
    const onError = (message, raw) => {
    showCaptiveError(message || 'Failed to authenticate with voucher.');
    };
    const onDone = () => hideLoading();
    window.submitVoucherAuth(voucher, { onStart, onSuccess, onError, onDone });
}
function setupEventListeners() {
    document.getElementById("toggle-auth-mode").addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthMode();
    });
    document.getElementById("auth-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("auth-email").value;
        const password = document.getElementById("auth-password").value;
        if (!email || !password) {
            showAuthError("Please enter both email and password");
            return;
        }
        if (isSignUpMode) {
            const name = document.getElementById("auth-name").value;
            if (!name) {
                showAuthError("Please enter your name");
                return;
            }
            handleSignUp(name, email, password);
        } else {
            handleSignIn(email, password);
        }
    });
    document.getElementById("logout-link").addEventListener("click", (e) => {
        e.preventDefault();
        handleLogout();
    });
    ["auth-name", "auth-email", "auth-password"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", () => document.getElementById("auth-error-message").classList.add("hidden"));
    });
    document.getElementById("close-order-list").addEventListener("click", () => {
        document.getElementById("order-list-section").classList.add("hidden");
    });
    document.getElementById("form-auth-close").addEventListener("click", () => {
        document.getElementById("form-auth-msg").classList.add("hidden");
    });
}
function initializeOrderListModal() {
    const orderListModal = document.createElement('div');
    orderListModal.id = "order-list-section";
    orderListModal.className = "hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
    orderListModal.setAttribute('role', 'dialog');
    orderListModal.setAttribute('aria-modal', 'true');
    orderListModal.setAttribute('aria-labelledby', 'order-list-title');
    orderListModal.innerHTML = `
        <div class=\"bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6\">
            <h2 id=\"order-list-title\" class=\"text-xl font-bold mb-4 text-gray-900\">Your Orders</h2>
            <div id=\"order-list\" class=\"space-y-4\"></div>
            <button id=\"close-order-list\" class=\"mt-6 w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-lg\">Close</button>
        </div>
    `;
    document.body.appendChild(orderListModal);
}
function initializeApp() {
    initializeOrderListModal();
    setupEventListeners();
    showAuthSection();
    const api = window.altonautApi;
}
document.addEventListener('DOMContentLoaded', initializeApp);
window.showCaptiveError = showCaptiveError;
window.useOrderForVoucher = useOrderForVoucher;
