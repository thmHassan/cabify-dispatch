export const NEAREST_DISPATCH_FAILURE_FALLBACK =
    "No nearby drivers available within the specified radius.";

export const sanitizeNearestDispatchMessage = (message) => {
    if (!message || typeof message !== "string") {
        return NEAREST_DISPATCH_FAILURE_FALLBACK;
    }

    const sanitized = message
        .replace(/\d+(\.\d+)?\s*km\b/gi, "specified radius")
        .replace(/\bwithin\s+the\s+specified radius\s+radius\b/gi, "within the specified radius")
        .replace(/\bwithin\s+specified radius\s+radius\b/gi, "within the specified radius")
        .trim();

    return sanitized || NEAREST_DISPATCH_FAILURE_FALLBACK;
};
