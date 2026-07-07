import { getTenantId } from "../utils/functions/tokenEncryption";

let cachedMapConfiguration = null;
let cachedTenantId = null;
let loadPromise = null;

export const setCachedMapConfiguration = (config) => {
    cachedMapConfiguration = config ?? null;
    cachedTenantId = getTenantId();
};

export const getCachedMapConfiguration = () => {
    const currentTenantId = getTenantId();
    if (cachedTenantId && currentTenantId && cachedTenantId !== currentTenantId) {
        return null;
    }
    return cachedMapConfiguration;
};

export const isMapifyEnabled = () => {
    const config = getCachedMapConfiguration();
    return Boolean(
        config?.usesMapify
        || config?.provider === "default"
        || config?.raw?.uses_mapify === true
        || config?.raw?.uses_mapify === 1
        || config?.raw?.uses_mapify === "1"
    );
};

export const isGoogleMapEnabled = () => {
    const config = getCachedMapConfiguration();
    return Boolean(config?.usesGoogleMap || config?.provider === "google");
};

export const resetMapConfigurationCache = () => {
    cachedMapConfiguration = null;
    cachedTenantId = null;
    loadPromise = null;
};

/** Clear cached config for the current tenant so the next load fetches fresh API data. */
export const invalidateMapConfigurationCache = () => {
    cachedMapConfiguration = null;
    loadPromise = null;
};

const shouldUseCachedConfig = () => {
    const currentTenantId = getTenantId();
    return Boolean(
        cachedMapConfiguration?.ok
        && cachedTenantId
        && currentTenantId
        && cachedTenantId === currentTenantId
    );
};

export const ensureMapConfigurationLoaded = (loader, { force = false } = {}) => {
    const currentTenantId = getTenantId();

    if (cachedTenantId && currentTenantId && cachedTenantId !== currentTenantId) {
        cachedMapConfiguration = null;
        loadPromise = null;
    }

    if (force) {
        cachedMapConfiguration = null;
        loadPromise = null;
    }

    if (shouldUseCachedConfig()) {
        return Promise.resolve(cachedMapConfiguration);
    }

    if (!loadPromise) {
        loadPromise = loader()
            .then((config) => {
                if (getTenantId() === currentTenantId) {
                    cachedMapConfiguration = config;
                    cachedTenantId = currentTenantId;
                }
                loadPromise = null;
                return config;
            })
            .catch((error) => {
                loadPromise = null;
                if (error?.code === "MAP_CONFIG_TENANT_CHANGED") {
                    return null;
                }
                throw error;
            });
    }

    return loadPromise;
};
