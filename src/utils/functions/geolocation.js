const DEFAULT_GEOLOCATION_OPTIONS = {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 300000,
};

export const requestBrowserGeolocation = (options = {}) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
            }),
            () => resolve(null),
            { ...DEFAULT_GEOLOCATION_OPTIONS, ...options }
        );
    });
};
