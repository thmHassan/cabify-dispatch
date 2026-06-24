import toast from "react-hot-toast";
import appConfig from "../../components/configs/app.config";
import store, { clearUser, signOutSuccess } from "../../store";
import { resetMapConfigurationCache } from "../../services/mapConfigCache";
import { disconnectSocket } from "../../services/socketConntection";
import { clearAllAuthData, getTenantData } from "../functions/tokenEncryption";
import { clearCachedTenantCurrency } from "../functions/formatters";
import { clearCachedDistanceUnit } from "../functions/tenantSettings";
import { clearCompanyTimezoneCache } from "../functions/appDateTime";
import { clearCompanyCurrencyCache } from "../functions/appCurrency";
import { parseSocketPayload } from "../notifications/buildNotificationFromSocket";

export const FORCED_LOGOUT_MESSAGE_KEY = "forced_logout_message";

export const COMPANY_INACTIVE_SOCKET_EVENTS = [
    "company-inactive-logout",
    "dispatcher-forced-logout",
    "company_inactive_logout",
    "company-status-changed",
];

export const DEFAULT_COMPANY_INACTIVE_MESSAGE =
    "Your company has been deactivated. You have been logged out.";

export const INACTIVE_COMPANY_LOGIN_MESSAGE =
    "Your company account is inactive. Please contact support.";

export const isInactiveCompanyStatus = (status) =>
    String(status ?? "").trim().toLowerCase() === "inactive";

/** Company admin login / stored tenant profile. */
export const getCompanyStatusFromTenantData = (tenantData) => {
    if (!tenantData || typeof tenantData !== "object") return null;
    if (tenantData.status != null) return tenantData.status;

    const nested = tenantData.data && typeof tenantData.data === "object"
        ? tenantData.data
        : null;
    return nested?.status ?? null;
};

/** Dispatcher login response (`company_data.data.status`). */
export const getCompanyStatusFromLoginResponse = (data) => {
    if (!data || typeof data !== "object") return null;

    const dispatcherStatus =
        data?.company_data?.data?.status ?? data?.company_data?.status;
    if (dispatcherStatus != null) return dispatcherStatus;

    return (
        data?.tenant_data?.status
        ?? data?.data?.tenant_data?.status
        ?? null
    );
};

export const getStoredCompanyStatus = () =>
    getCompanyStatusFromTenantData(getTenantData());

const resolveInactiveStatusFromPayload = (payload) => {
    if (!payload || typeof payload !== "object") return null;

    return (
        payload.status
        ?? payload.company_status
        ?? payload.company_data?.data?.status
        ?? payload.company_data?.status
        ?? payload.data?.status
        ?? null
    );
};

export const isForcedLogoutPayload = (payload) => {
    if (!payload || typeof payload !== "object") return false;

    if (
        payload.action === "force_logout"
        || payload.reason === "company_inactive"
        || payload.force_logout === true
    ) {
        return true;
    }

    return isInactiveCompanyStatus(resolveInactiveStatusFromPayload(payload));
};

export const storeForcedLogoutMessage = (message) => {
    try {
        sessionStorage.setItem(FORCED_LOGOUT_MESSAGE_KEY, message);
    } catch {
        // ignore storage errors
    }
};

export const consumeForcedLogoutMessage = () => {
    try {
        const message = sessionStorage.getItem(FORCED_LOGOUT_MESSAGE_KEY);
        if (message) {
            sessionStorage.removeItem(FORCED_LOGOUT_MESSAGE_KEY);
        }
        return message;
    } catch {
        return null;
    }
};

let forcedLogoutInProgress = false;

export const clearSessionState = () => {
    disconnectSocket();
    resetMapConfigurationCache();
    clearCompanyTimezoneCache();
    clearCompanyCurrencyCache();
    clearCachedTenantCurrency();
    clearCachedDistanceUnit();
    clearAllAuthData();
    store.dispatch(signOutSuccess());
    store.dispatch(clearUser());
};

export const performForcedLogout = ({
    message = DEFAULT_COMPANY_INACTIVE_MESSAGE,
    redirect = true,
} = {}) => {
    if (forcedLogoutInProgress) return;
    forcedLogoutInProgress = true;

    const displayMessage = message || DEFAULT_COMPANY_INACTIVE_MESSAGE;

    clearSessionState();
    storeForcedLogoutMessage(displayMessage);

    const loginPath = appConfig.unAuthenticatedEntryPath;
    const onLoginPage = window.location.pathname === loginPath;

    if (onLoginPage) {
        toast.error(displayMessage);
    } else if (redirect) {
        window.location.href = loginPath;
    }

    forcedLogoutInProgress = false;
};

export const handleForcedLogoutSocketEvent = (rawPayload) => {
    const payload = parseSocketPayload(rawPayload);
    if (!isForcedLogoutPayload(payload)) return;

    performForcedLogout({
        message: payload?.message || DEFAULT_COMPANY_INACTIVE_MESSAGE,
    });
};

export const registerForcedLogoutSocketListeners = (socket) => {
    if (!socket) return () => {};

    const handlers = COMPANY_INACTIVE_SOCKET_EVENTS.map((event) => {
        const handler = (payload) => handleForcedLogoutSocketEvent(payload);
        socket.on(event, handler);
        return { event, handler };
    });

    return () => {
        handlers.forEach(({ event, handler }) => {
            socket.off(event, handler);
        });
    };
};

export const ensureActiveCompanySession = () => {
    if (!getTenantData()) return true;

    const status = getStoredCompanyStatus();
    if (!isInactiveCompanyStatus(status)) return true;

    performForcedLogout({
        message: INACTIVE_COMPANY_LOGIN_MESSAGE,
    });
    return false;
};
