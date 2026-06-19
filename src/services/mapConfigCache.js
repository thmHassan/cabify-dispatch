let cachedMapConfiguration = null;
let loadPromise = null;

export const setCachedMapConfiguration = (config) => {
    cachedMapConfiguration = config ?? null;
};

export const getCachedMapConfiguration = () => cachedMapConfiguration;

export const isMapifyEnabled = () =>
    cachedMapConfiguration?.raw?.uses_mapify === true ||
    cachedMapConfiguration?.provider === "default";

export const isGoogleMapEnabled = () =>
    cachedMapConfiguration?.raw?.uses_google_map === true ||
    cachedMapConfiguration?.provider === "google";

export const resetMapConfigurationCache = () => {
    cachedMapConfiguration = null;
    loadPromise = null;
};

export const ensureMapConfigurationLoaded = (loader) => {
    if (cachedMapConfiguration?.ok) {
        return Promise.resolve(cachedMapConfiguration);
    }
    if (!loadPromise) {
        loadPromise = loader()
            .then((config) => {
                cachedMapConfiguration = config;
                return config;
            })
            .catch((error) => {
                loadPromise = null;
                throw error;
            });
    }
    return loadPromise;
};
