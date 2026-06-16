export const resolveSocketApiBaseUrl = () =>
    import.meta.env.VITE_BACKEND_SOCKET_URL || "https://backend.cabifyit.com/socket-api";

export const resolveSocketIoOrigin = () => {
    const configured = import.meta.env.VITE_BACKEND_SOCKET_URL;

    if (configured) {
        return configured.replace(/\/socket-api\/?$/, "");
    }

    return "https://backend.cabifyit.com";
};
