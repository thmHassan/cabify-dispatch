import { io } from "socket.io-client";
import { resolveSocketIoOrigin } from "../utils/functions/backendUrls";
import { getDecryptedToken, getTenantId } from "../utils/functions/tokenEncryption";
import { getDispatcherId } from "../utils/auth";
import {
    DEFAULT_COMPANY_INACTIVE_MESSAGE,
    normalizeSocketEventPayload,
    performForcedLogout,
} from "../utils/auth/forcedLogout";

let socket = null;
let unregisterCompanyInactiveListeners = null;

const handleCompanyInactiveLogout = (rawPayload) => {
    const payload = normalizeSocketEventPayload(rawPayload);
    console.log("[Socket] company-inactive-logout", payload);
    performForcedLogout({
        message: payload?.message || DEFAULT_COMPANY_INACTIVE_MESSAGE,
    });
};

const handleDispatcherForcedLogout = (rawPayload) => {
    const payload = normalizeSocketEventPayload(rawPayload);
    console.log("[Socket] dispatcher-forced-logout", payload);

    const reason = String(payload?.reason ?? "").toLowerCase();
    if (
        reason === "company_inactive"
        || payload?.action === "force_logout"
        || payload?.type === "force_logout"
        || payload?.token_revoked === true
    ) {
        performForcedLogout({
            message: payload?.message || DEFAULT_COMPANY_INACTIVE_MESSAGE,
        });
    }
};

const attachCompanyInactiveListeners = (socketInstance) => {
    if (!socketInstance) return;

    unregisterCompanyInactiveListeners?.();
    socketInstance.off("company-inactive-logout", handleCompanyInactiveLogout);
    socketInstance.off("dispatcher-forced-logout", handleDispatcherForcedLogout);

    socketInstance.on("company-inactive-logout", handleCompanyInactiveLogout);
    socketInstance.on("dispatcher-forced-logout", handleDispatcherForcedLogout);

    unregisterCompanyInactiveListeners = () => {
        socketInstance.off("company-inactive-logout", handleCompanyInactiveLogout);
        socketInstance.off("dispatcher-forced-logout", handleDispatcherForcedLogout);
    };
};

export const disconnectSocket = () => {
    if (!socket) return;
    unregisterCompanyInactiveListeners?.();
    unregisterCompanyInactiveListeners = null;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
};

const initSocket = () => {
    const tenantId = getTenantId();
    const token = getDecryptedToken();
    const dispatcherId = getDispatcherId();

    if (!tenantId || !token || !dispatcherId) {
        console.warn("Socket not connected: missing tenant, token, or dispatcher id", {
            tenantId,
            hasToken: Boolean(token),
            dispatcherId,
        });
        disconnectSocket();
        return null;
    }

    const connectedTenantId = socket?.io?.opts?.query?.database;
    const connectedDispatcherId = socket?.io?.opts?.query?.dispatcher_id;

    if (
        socket
        && (
            (connectedTenantId && connectedTenantId !== tenantId)
            || (connectedDispatcherId && String(connectedDispatcherId) !== String(dispatcherId))
        )
    ) {
        disconnectSocket();
    }

    if (socket) {
        attachCompanyInactiveListeners(socket);
        return socket;
    }

    const socketBaseUrl = resolveSocketIoOrigin();
    const bearerToken = `Bearer ${token}`;

    socket = io(socketBaseUrl, {
        path: "/socket.io",
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        auth: {
            authorization: bearerToken,
            token,
        },
        query: {
            role: "dispatcher",
            dispatcher_id: String(dispatcherId),
            database: tenantId,
            token,
        },
        extraHeaders: {
            Authorization: bearerToken,
        },
    });

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id, {
            database: tenantId,
            dispatcher_id: dispatcherId,
        });
        attachCompanyInactiveListeners(socket);
    });

    socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
    });

    socket.onAny((event, ...args) => {
        console.log(`[Socket] ${event}`, args);
    });

    attachCompanyInactiveListeners(socket);

    return socket;
};

export default initSocket;
