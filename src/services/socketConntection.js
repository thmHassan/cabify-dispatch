// import { io } from "socket.io-client";
// import { getDecryptedToken, getTenantId } from "../utils/functions/tokenEncryption";
// import { getDispatcherId } from "../utils/auth";

// let socket = null;

// const initSocket = () => {
//     if (socket) return socket;

//     const tenantId = getTenantId();
//     const token = getDecryptedToken();
//     const dispatcher_id = getDispatcherId()

//     console.log("Socket database:", tenantId);
//     console.log("Socket dispatcher_id:", dispatcher_id);
//     console.log("token===", token);


//     if (!tenantId) {
//         console.warn("❌Tenant ID not found, socket not connected");
//         return null;
//     }

//     socket = io("https://backend.cabifyit.com", {
//         path: "/socket.io",
//         transports: ["polling", "websocket",],
//         reconnection: true,
//         reconnectionAttempts: 5,
//         reconnectionDelay: 2000,
//         query: {
//             role: "dispatcher",
//             dispatcher_id: dispatcher_id,
//             database: tenantId,
//         },
//         extraHeaders: {
//             Authorization: `Bearer ${token}`
//         }
//     });


//     socket.on("connect", () => {
//         console.log("Socket connected:", socket.id);
//     });

//     socket.on("disconnect", (reason) => {
//         console.log("Socket disconnected:", reason);
//     });

//     socket.on("connect_error", (error) => {
//         console.error("⚠️ Socket connection error:", error.message);
//     });

//     return socket;
// };

// export default initSocket;

import { io } from "socket.io-client";
import { getDecryptedToken, getTenantId } from "../utils/functions/tokenEncryption";

let socket = null;

const initSocket = () => {
    if (socket) return socket;

    const tenantId = getTenantId();
    // const companyId = getCompanyId()
    const token = getDecryptedToken();

    console.log("tenantId:", tenantId);
    console.log("companyId:", tenantId);
    console.log("token===", token);

    if (!tenantId) {
        console.warn("❌Tenant ID not found, socket not connected");
        return null;
    }

    socket = io("https://backend.cabifyit.com", {
        path: "/socket.io",
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        query: {
            role: "client",
            client_id: tenantId,
            database: tenantId,
        },
        extraHeaders: {
            Authorization: `Bearer ${token}`
        }
    });

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
        console.error("⚠️ Socket connection error:", error.message);
    });

    return socket;
};

export default initSocket;