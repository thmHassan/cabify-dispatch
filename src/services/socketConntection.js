import { io } from "socket.io-client";
import { resolveSocketIoOrigin } from "../utils/functions/backendUrls";
import { getDecryptedToken, getTenantId } from "../utils/functions/tokenEncryption";
import { getDispatcherId } from "../utils/auth";
import { handleCompanyInactiveSocketEvent } from "../utils/auth/forcedLogout";

let socket = null;
let unregisterCompanyInactiveListeners = null;

const attachCompanyInactiveListeners = (socketInstance) => {
    if (!socketInstance) return;

    unregisterCompanyInactiveListeners?.();
    socketInstance.off("company-inactive-logout", handleCompanyInactiveSocketEvent);
    socketInstance.off("dispatcher-forced-logout", handleCompanyInactiveSocketEvent);

    socketInstance.on("company-inactive-logout", handleCompanyInactiveSocketEvent);
    socketInstance.on("dispatcher-forced-logout", handleCompanyInactiveSocketEvent);

    unregisterCompanyInactiveListeners = () => {
        socketInstance.off("company-inactive-logout", handleCompanyInactiveSocketEvent);
        socketInstance.off("dispatcher-forced-logout", handleCompanyInactiveSocketEvent);
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

const buildSocketQuery = (tenantId) => {
    const dispatcherId = getDispatcherId();

    // Dispatch app: role=dispatcher + dispatcher_id (company admin would use role=client + client_id)
    return {
        role: "dispatcher",
        dispatcher_id: String(dispatcherId),
        database: tenantId,
    };
};

const initSocket = () => {
    const tenantId = getTenantId();
    const token = getDecryptedToken();
    const dispatcherId = getDispatcherId();

    if (!tenantId || !token || !dispatcherId) {
        console.warn("[Socket] Not connecting — missing database, token, or dispatcher_id", {
            database: tenantId,
            hasToken: Boolean(token),
            dispatcher_id: dispatcherId,
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
    const query = {
        ...buildSocketQuery(tenantId),
        token,
    };

    console.log("[Socket] Connecting", {
        url: socketBaseUrl,
        database: tenantId,
        role: query.role,
        dispatcher_id: query.dispatcher_id,
    });

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
        query,
        extraHeaders: {
            Authorization: bearerToken,
        },
    });

    socket.on("connect", () => {
        console.log("[Socket] Connected", {
            id: socket.id,
            database: tenantId,
            role: "dispatcher",
            dispatcher_id: dispatcherId,
        });
        attachCompanyInactiveListeners(socket);
    });

    socket.on("disconnect", (reason) => {
        console.log("[Socket] Disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
        console.error("[Socket] Connection error:", error.message);
    });

    socket.onAny((event, ...args) => {
        console.log(`[Socket] ${event}`, args);
    });

    attachCompanyInactiveListeners(socket);

    return socket;
};

export default initSocket;
