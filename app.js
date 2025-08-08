/**
 * Wi-Fi Login Portal Application
 * Main application logic for authentication and captive portal functionality
 */

// Application state
let isSignUpMode = false;

// Utility functions
function showLoading() {
    document.getElementById("loading-overlay").classList.remove("hidden");
}

function hideLoading() {
    document.getElementById("loading-overlay").classList.add("hidden");
}

function showAuthError(message) {
    const errorElement = document.getElementById("auth-error-message");
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
    
    setTimeout(() => {
        errorElement.classList.add("hidden");
    }, 5000);
}

function showCaptiveError(message) {
    const errorElement = document.getElementById("oper-hint");
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
}

// Section management functions
function showCaptiveSection(user) {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("captive-section").style.display = "block";
    document.getElementById("logged-user-email").textContent = user.email;
    
    // Update step indicators
    const step1 = document.getElementById("step1-indicator");
    const step2 = document.getElementById("step2-indicator");
    
    step1.classList.remove("bg-primary", "text-white");
    step1.classList.add("bg-gray-200", "text-gray-600");
    step2.classList.remove("bg-gray-200", "text-gray-600");
    step2.classList.add("bg-primary", "text-white");
    
    // Render order list
    renderOrderListEmbedded();
}

function showAuthSection() {
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("captive-section").style.display = "none";
    
    // Reset step indicators
    const step1 = document.getElementById("step1-indicator");
    const step2 = document.getElementById("step2-indicator");
    
    step1.classList.remove("bg-gray-200", "text-gray-600");
    step1.classList.add("bg-primary", "text-white");
    step2.classList.remove("bg-primary", "text-white");
    step2.classList.add("bg-gray-200", "text-gray-600");
}

// Authentication mode toggle
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    
    // Update UI elements
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
    
    // Clear any error messages
    document.getElementById("auth-error-message").classList.add("hidden");
}

// Authentication functions
function handleSignUp(name, email, password) {
    showLoading();
    window.altonautApi.signUp(name, email, password)
        .then((result) => {
            if (result.success && result.token) {
                sessionStorage.setItem('authToken', result.token);
                return window.altonautApi.getUser(result.token);
            } else {
                hideLoading();
                let errorMessage = "Registration failed. Please try again.";
                if (result.error === "Email already registered.") {
                    errorMessage = "This email is already registered. Please sign in instead.";
                } else if (result.error === "Invalid email format.") {
                    errorMessage = "Invalid email address format.";
                } else if (result.error === "Password too weak.") {
                    errorMessage = "Password is too weak. Please use at least 6 characters.";
                }
                showAuthError(errorMessage);
                return null;
            }
        })
        .then((userResult) => {
            if (userResult) {
                hideLoading();
                if (userResult.success) {
                    showCaptiveSection(userResult.user);
                } else {
                    showAuthError(userResult.error || "Could not fetch user info.");
                }
            }
        })
        .catch((error) => {
            hideLoading();
            console.error("Sign up error:", error);
            showAuthError("Registration failed. Please try again.");
        });
}

function handleSignIn(email, password) {
    showLoading();
    window.altonautApi.login(email, password)
        .then((result) => {
            if (result.success && result.token) {
                sessionStorage.setItem('authToken', result.token);
                return window.altonautApi.getUser(result.token);
            } else {
                hideLoading();
                let errorMessage = "Authentication failed. Please try again.";
                if (result.error === "Invalid email or password.") {
                    errorMessage = "Invalid email or password. Please try again.";
                }
                showAuthError(errorMessage);
                return null;
            }
        })
        .then((userResult) => {
            if (userResult) {
                hideLoading();
                if (userResult.success) {
                    showCaptiveSection(userResult.user);
                } else {
                    showAuthError(userResult.error || "Could not fetch user info.");
                }
            }
        })
        .catch((error) => {
            hideLoading();
            console.error("Sign in error:", error);
            showAuthError("Authentication failed. Please try again.");
        });
}

function handleLogout() {
    sessionStorage.removeItem('authToken');
    document.getElementById("auth-form").reset();
    document.getElementById("auth-error-message").classList.add("hidden");
    showAuthSection();
}

// Order list functions
function showOrderList() {
    document.getElementById("order-list-section").classList.remove("hidden");
    const orderList = document.getElementById("order-list");
    orderList.innerHTML = "<div class='text-gray-500 text-center'>Loading...</div>";
    
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        orderList.innerHTML = "<div class='text-red-500 text-center'>Not authenticated.</div>";
        return;
    }
    
    window.altonautApi.getOrders(token)
        .then(result => {
            if (result.success && Array.isArray(result.orders)) {
                if (result.orders.length === 0) {
                    orderList.innerHTML = "<div class='text-gray-500 text-center'>No orders found.</div>";
                } else {
                    orderList.innerHTML = "";
                    result.orders.forEach(order => {
                        const card = document.createElement("div");
                        card.className = "border rounded-lg p-4 shadow hover:bg-blue-100 cursor-pointer transition";
                        card.innerHTML = `
                            <div class="font-bold text-lg text-primary mb-1">${order.packageName}</div>
                            <div class="text-gray-700 mb-2">${order.description}</div>
                            <div class="text-xs text-gray-500">Valid Until: ${order.validUntil}</div>
                        `;
                        card.onclick = () => {
                            alert(`Selected: ${order.packageName}`);
                        };
                        orderList.appendChild(card);
                    });
                }
            } else {
                orderList.innerHTML = "<div class='text-red-500 text-center'>Error loading orders. Please try again later.</div>";
            }
        })
        .catch(error => {
            console.error("Error fetching orders:", error);
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
    
    window.altonautApi.getOrders(token)
        .then(result => {
            if (result.success && Array.isArray(result.orders)) {
                if (result.orders.length === 0) {
                    orderList.innerHTML = "<div class='text-gray-500 text-center'>No orders found.</div>";
                } else {
                    orderList.innerHTML = "";
                    result.orders.forEach(order => {
                        const card = document.createElement("div");
                        card.className = "border rounded-lg p-3 shadow-sm bg-white transition flex flex-col gap-1";
                        card.innerHTML = `
                            <div class="font-semibold text-primary text-sm mb-0.5">${order.packageName}</div>
                            <div class="text-gray-700 text-xs">${order.description}</div>
                            <div class="text-xs text-gray-400">Valid Until: ${order.validUntil}</div>
                            <button class="mt-1 w-full bg-primary text-white rounded-md py-1.5 text-sm font-medium hover:bg-primary-dark transition">Use this package</button>
                        `;
                        card.querySelector('button').onclick = (e) => {
                            e.stopPropagation();
                            // Handle button action
                        };
                        orderList.appendChild(card);
                    });
                }
            } else {
                orderList.innerHTML = "<div class='text-red-500 text-center'>Error loading orders. Please try again later.</div>";
            }
        })
        .catch(error => {
            console.error("Error fetching orders:", error);
            orderList.innerHTML = "<div class='text-red-500 text-center'>Error loading orders. Please try again later.</div>";
        });
}

// Event listeners setup
function setupEventListeners() {
    // Auth mode toggle
    document.getElementById("toggle-auth-mode").addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthMode();
    });

    // Auth form submission
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

    // Logout functionality
    document.getElementById("logout-link").addEventListener("click", (e) => {
        e.preventDefault();
        handleLogout();
    });

    // Clear error messages on input
    ["auth-name", "auth-email", "auth-password"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("input", () => {
                document.getElementById("auth-error-message").classList.add("hidden");
            });
        }
    });

    // Close order list modal
    document.getElementById("close-order-list").addEventListener("click", () => {
        document.getElementById("order-list-section").classList.add("hidden");
    });

    // Form auth modal close
    document.getElementById("form-auth-close").addEventListener("click", () => {
        document.getElementById("form-auth-msg").classList.add("hidden");
    });
}

// Initialize order list modal
function initializeOrderListModal() {
    const orderListModal = document.createElement('div');
    orderListModal.id = "order-list-section";
    orderListModal.className = "hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
    orderListModal.setAttribute('role', 'dialog');
    orderListModal.setAttribute('aria-modal', 'true');
    orderListModal.setAttribute('aria-labelledby', 'order-list-title');
    
    orderListModal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 id="order-list-title" class="text-xl font-bold mb-4 text-gray-900">Your Orders</h2>
            <div id="order-list" class="space-y-4"></div>
            <button id="close-order-list" class="mt-6 w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-lg">Close</button>
        </div>
    `;
    document.body.appendChild(orderListModal);
}

// Application initialization
function initializeApp() {
    initializeOrderListModal();
    setupEventListeners();
    showAuthSection();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
