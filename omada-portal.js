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
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 304) {
                    callback(JSON.parse(xhr.responseText));
                } else {
                    console.error(`Error: ${xhr.status} - ${xhr.statusText}`);
                }
            }
        };
        xhr.send(data);
    }
};

const getQueryStringKey = (key) => getQueryStringAsObject()[key];

const getQueryStringAsObject = () => {
    const query = decodeURIComponent(window.location.search.substring(1));
    const params = {};
    const regex = /([^&;=]+)=?([^&;]*)/g;
    let match;

    while ((match = regex.exec(query)) !== null) {
        const key = match[1];
        const value = match[2];
        if (params[key]) {
            if (!Array.isArray(params[key])) {
                params[key] = [params[key]];
            }
            params[key].push(value);
        } else {
            params[key] = value;
        }
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
    const data = response.result;
    submitUrl = "/portal/auth";
    const landingUrl = data.landingUrl;
    globalConfig = {
        authType: data.authType,
        hotspotTypes: data.hotspot?.enabledTypes || [],
        buttonText: data.portalCustomize?.buttonText || 'Log In',
        formAuthButtonText: data.portalCustomize?.formAuthButtonText || 'Take the Survey',
        formAuth: data.formAuth || {},
        error: data.error || 'ok',
        countryCode: `+${data.sms?.countryCode || 1}`
    };

    // Update UI based on authType
    configurePage(globalConfig);
};

const configurePage = (config) => {
    const authType = config.authType;
    document.getElementById("oper-hint").style.display = "none";
    document.getElementById("hotspot-section").style.display = "none";
    document.getElementById("input-voucher").style.display = "none";
    document.getElementById("input-user").style.display = "none";
    document.getElementById("input-password").style.display = "none";
    document.getElementById("input-simple").style.display = "none";
    document.getElementById("input-phone-num").style.display = "none";
    document.getElementById("input-verify-code").style.display = "none";

    switch (authType) {
        case AUTH_TYPES.NO_AUTH:
            window.authType = AUTH_TYPES.NO_AUTH;
            break;
        case AUTH_TYPES.SIMPLE_PASSWORD:
            document.getElementById("input-simple").style.display = "block";
            window.authType = AUTH_TYPES.SIMPLE_PASSWORD;
            break;
        case AUTH_TYPES.EXTERNAL_RADIUS:
            hotspotChange(AUTH_TYPES.EXTERNAL_RADIUS);
            window.authType = AUTH_TYPES.EXTERNAL_RADIUS;
            break;
        case AUTH_TYPES.EXTERNAL_LDAP:
            hotspotChange(AUTH_TYPES.EXTERNAL_LDAP);
            window.authType = AUTH_TYPES.EXTERNAL_LDAP;
            break;
        case AUTH_TYPES.HOTSPOT:
            document.getElementById("hotspot-section").style.display = "block";
            const options = config.hotspotTypes.map(type => `<option value="${type}">${hotspotMap[type]}</option>`).join('');
            document.getElementById("hotspot-selector").innerHTML = options;
            hotspotChange(config.hotspotTypes[0]);
            window.authType = config.hotspotTypes[0];
            break;
        default:
            console.warn("Unknown auth type");
    }
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
