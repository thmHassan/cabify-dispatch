export const PLOT_DISPATCH_FAILURE_FALLBACK =
    "No driver accepted in primary or backup plots.";

export const sanitizePlotDispatchMessage = (message) => {
    if (!message || typeof message !== "string") {
        return PLOT_DISPATCH_FAILURE_FALLBACK;
    }

    const sanitized = message.trim();
    return sanitized || PLOT_DISPATCH_FAILURE_FALLBACK;
};
