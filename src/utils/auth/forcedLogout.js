import toast from "react-hot-toast";
import appConfig from "../../components/configs/app.config";
import store, { clearUser, signOutSuccess } from "../../store";
import { apiGetCompanyProfile } from "../../services/SettingsConfigurationServices";
import { resetMapConfigurationCache } from "../../services/mapConfigCache";
import { disconnectSocket } from "../../services/socketConntection";
import {
    canAccessTenantApi,
    clearAllAuthData,
    getTenantData,
    storeTenantData,
} from "../functions/tokenEncryption";
import { clearCachedTenantCurrency } from "../functions/formatters";
import { clearCachedDistanceUnit } from "../functions/tenantSettings";
import { clearCompanyTimezoneCache } from "../functions/appDateTime";
import { clearCompanyCurrencyCache } from "../functions/appCurrency";
import { parseSocketPayload } from "../notifications/buildNotificationFromSocket";

export const FORCED_LOGOUT_MESSAGE_KEY = "forced_logout_message";

export const COMPANY_STATUS_POLL_MS = 30000;

const IMMEDIATE_LOGOUT_SOCKET_EVENTS = new Set([
    "company-inactive-logout",
    "dispatcher-forced-logout",
    "company_inactive_logout",
]);

export const DEFAULT_COMPANY_INACTIVE_MESSAGE =
    "Your company has been deactivated. You have been logged out.";

export const INACTIVE_COMPANY_LOGIN_MESSAGE =
    "Your company account is inactive. Please contact support.";

export const isInactiveCompanyStatus = (status) => {
    const normalized = String(status ?? "").trim().toLowerCase();
    return normalized === "inactive" || normalized === "0" || normalized === "disabled";
};

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

export const extractCompanyStatusFromProfileResponse = (response) =>
    response?.data?.data?.status
    ?? response?.data?.status
    ?? response?.data?.data?.company?.status
    ?? response?.data?.company?.status
    ?? null;

export const getStoredCompanyStatus = () =>
    getCompanyStatusFromTenantData(getTenantData());

const syncStoredCompanyStatus = (status) => {
    if (status == null) return;

    const tenantData = getTenantData();
    if (!tenantData || typeof tenantData !== "object") return;

    if (tenantData.data && typeof tenantData.data === "object") {
        storeTenantData({
            ...tenantData,
            data: { ...tenantData.data, status },
        });
        return;
    }

    storeTenantData({ ...tenantData, status });
};

const resolveInactiveStatusFromPayload = (payload) => {
    if (!payload || typeof payload !== "object") return null;

    return (
        payload.status
        ?? payload.company_status
        ?? payload.company_data?.data?.status
        ?? payload.company_data?.status
        ?? payload.data?.status
        ?? payload.data?.company_status
        ?? null
    );
};

export const normalizeSocketEventPayload = (rawPayload) => {
    let payload = rawPayload;

    if (Array.isArray(payload)) {
        payload = payload.length === 1 ? payload[0] : { data: payload };
    }

    payload = parseSocketPayload(payload);

    if (!payload || typeof payload !== "object") {
        return payload;
    }

    if (payload.data && typeof payload.data === "object") {
        const inner = parseSocketPayload(payload.data);
        if (inner && typeof inner === "object") {
            const innerStatus = resolveInactiveStatusFromPayload(inner);
            const outerStatus = resolveInactiveStatusFromPayload(payload);
            if (innerStatus != null || inner.action || inner.reason) {
                return inner;
            }
            if (outerStatus == null) {
                return inner;
            }
        }
    }

    return payload;
};

export const isForcedLogoutPayload = (payload) => {
    if (!payload || typeof payload !== "object") return false;

    const action = String(payload.action ?? "").trim().toLowerCase();
    const reason = String(payload.reason ?? "").trim().toLowerCase();

    if (
        action === "force_logout"
        || reason === "company_inactive"
        || payload.force_logout === true
    ) {
        return true;
    }

    return isInactiveCompanyStatus(resolveInactiveStatusFromPayload(payload));
};

const isImmediateLogoutSocketEvent = (eventName) => {
    const event = String(eventName ?? "").trim().toLowerCase();
    if (!event) return false;

    if (IMMEDIATE_LOGOUT_SOCKET_EVENTS.has(event)) return true;

    return (
        event.includes("company-inactive")
        || event.includes("company_inactive")
        || (event.includes("forced") && event.includes("logout"))
        || (event.includes("inactive") && event.includes("logout"))
    );
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
        window.location.replace(loginPath);
    }

    forcedLogoutInProgress = false;
};

export const handleForcedLogoutFromSocketEvent = (eventName, rawPayload) => {
    const payload = normalizeSocketEventPayload(rawPayload);
    const immediateEvent = isImmediateLogoutSocketEvent(eventName);
    const payloadRequestsLogout = isForcedLogoutPayload(payload);

    if (!immediateEvent && !payloadRequestsLogout) return;

    performForcedLogout({
        message: payload?.message || DEFAULT_COMPANY_INACTIVE_MESSAGE,
    });
};

export const registerForcedLogoutSocketListeners = (socket) => {
    if (!socket) return () => {};

    const onAnyHandler = (event, ...args) => {
        handleForcedLogoutFromSocketEvent(event, args[0]);
    };

    socket.onAny(onAnyHandler);

    return () => {
        socket.offAny(onAnyHandler);
    };
};

export const checkCompanyStatusFromApi = async () => {
    if (!canAccessTenantApi()) return true;

    try {
        const response = await apiGetCompanyProfile();
        const status = extractCompanyStatusFromProfileResponse(response);
        syncStoredCompanyStatus(status);

        if (isInactiveCompanyStatus(status)) {
            performForcedLogout({
                message: DEFAULT_COMPANY_INACTIVE_MESSAGE,
            });
            return false;
        }

        return true;
    } catch (error) {
        const responseMessage = String(error?.response?.data?.message ?? "");
        const responseStatus = error?.response?.status;

        if (
            responseStatus === 403
            && /inactive|disabled|deactivat/i.test(responseMessage)
        ) {
            performForcedLogout({
                message: responseMessage || DEFAULT_COMPANY_INACTIVE_MESSAGE,
            });
            return false;
        }

        return true;
    }
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
