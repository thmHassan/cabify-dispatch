import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import {
    GET_MAPIFY_GEOCODING,
    GET_MAPIFY_REVERSE_GEOCODING,
    GET_MAPIFY_SEARCH,
    POST_MAP_SEARCH_PREFERENCES,
} from "../constants/api.route.constant";
import ApiService from "./ApiService";
import { getCachedMapConfiguration, isMapifyEnabled } from "./mapConfigCache";

let mapifyEndpoints = {
    searchEndpoint: GET_MAPIFY_SEARCH,
    geocodingEndpoint: GET_MAPIFY_GEOCODING,
    reverseGeocodingEndpoint: GET_MAPIFY_REVERSE_GEOCODING,
    preferencesEndpoint: POST_MAP_SEARCH_PREFERENCES,
};

export const configureMapifyEndpoints = (endpoints) => {
    if (!endpoints) {
        mapifyEndpoints = {
            searchEndpoint: GET_MAPIFY_SEARCH,
            geocodingEndpoint: GET_MAPIFY_GEOCODING,
            reverseGeocodingEndpoint: GET_MAPIFY_REVERSE_GEOCODING,
            preferencesEndpoint: POST_MAP_SEARCH_PREFERENCES,
        };
        return;
    }

    mapifyEndpoints = {
        searchEndpoint: endpoints.searchEndpoint || GET_MAPIFY_SEARCH,
        geocodingEndpoint: endpoints.geocodingEndpoint || GET_MAPIFY_GEOCODING,
        reverseGeocodingEndpoint:
            endpoints.reverseGeocodingEndpoint || GET_MAPIFY_REVERSE_GEOCODING,
        preferencesEndpoint:
            endpoints.preferencesEndpoint || POST_MAP_SEARCH_PREFERENCES,
    };
};

const getSearchEndpoint = () => mapifyEndpoints.searchEndpoint || GET_MAPIFY_SEARCH;
const getGeocodingEndpoint = () => mapifyEndpoints.geocodingEndpoint || GET_MAPIFY_GEOCODING;
const getReverseGeocodingEndpoint = () =>
    mapifyEndpoints.reverseGeocodingEndpoint || GET_MAPIFY_REVERSE_GEOCODING;
const getPreferencesEndpoint = () =>
    mapifyEndpoints.preferencesEndpoint || POST_MAP_SEARCH_PREFERENCES;

export const isReverseGeocodingAvailable = () => {
    const config = getCachedMapConfiguration();
    if (config?.ok) {
        return Boolean(config.usesMapify || config.provider === "default");
    }
    return isMapifyEnabled();
};

const normalizeBoundaryCountry = (code) => {
    const normalized = String(code ?? "").trim().toUpperCase();
    return normalized || undefined;
};

const parseNearbySearchFlag = (value) => {
    if (value === true || value === 1 || value === "1") return true;
    if (value === false || value === 0 || value === "0") return false;
    return Boolean(value);
};

export const normalizeMapSearchPreferences = (raw, fallbackCountry = null) => {
    const prefs = raw?.map_search_preferences ?? raw;
    if (!prefs || typeof prefs !== "object") {
        return {
            nearbySearch: false,
            boundaryCountry: null,
        };
    }

    const nearbySearch = parseNearbySearchFlag(
        prefs.nearby_search_enabled ?? prefs.nearby_search
    );
    const boundaryCountry = normalizeBoundaryCountry(
        prefs.search_boundary_country ?? prefs.boundary_country
    ) || (nearbySearch ? normalizeBoundaryCountry(fallbackCountry) : null);

    return {
        nearbySearch,
        boundaryCountry: nearbySearch ? boundaryCountry ?? null : null,
    };
};

export const getMapSearchPreferencesFromConfig = (fallbackCountry = null) => {
    const config = getCachedMapConfiguration();
    if (config?.mapSearchPreferences) {
        return config.mapSearchPreferences;
    }
    return normalizeMapSearchPreferences(
        config?.raw?.map_search_preferences ?? config?.raw,
        fallbackCountry
    );
};

export const extractMapSearchPreferencesFromResponse = (response, fallbackCountry = null) => {
    const payload = response?.data;
    const root = payload?.data ?? payload;
    const nested = root?.map_search_preferences;
    const merged = {
        ...(nested && typeof nested === "object" ? nested : {}),
        nearby_search_enabled:
            root?.nearby_search_enabled
            ?? nested?.nearby_search_enabled
            ?? nested?.nearby_search,
        search_boundary_country:
            root?.search_boundary_country
            ?? nested?.search_boundary_country
            ?? nested?.boundary_country,
    };

    return normalizeMapSearchPreferences(merged, fallbackCountry);
};

export async function apiGetMapSearchPreferences() {
    return ApiService.fetchData({
        url: getPreferencesEndpoint(),
        method: METHOD_GET,
        headers: {
            Accept: "application/json",
        },
    });
}

const buildNearbySearchParams = ({ nearbySearch, boundaryCountry }) => {
    if (nearbySearch) {
        const params = { nearby_search: 1 };
        const country = normalizeBoundaryCountry(boundaryCountry);
        if (country) {
            params.boundary_country = country;
        }
        return params;
    }

    return { nearby_search: 0 };
};

const unwrapMapifyPayload = (payload) => {
    if (payload?.success === 1 || payload?.success === true || payload?.success === "1") {
        return payload.data ?? payload;
    }
    return payload?.data ?? payload;
};

export const mapifyFeatureToAddress = (item) => {
    if (!item) return null;

    const label = item.label?.trim();
    const name = item.name?.trim();

    if (label && name && label !== name) {
        return label.includes(name) ? label : `${name}, ${label}`;
    }

    return label || name || null;
};

export const normalizeMapifyFeatures = (payload) => {
    const root = unwrapMapifyPayload(payload);
    const features = Array.isArray(root?.features)
        ? root.features
        : Array.isArray(root?.results)
            ? root.results
            : Array.isArray(root)
                ? root
                : [];

    return features
        .map((feature) => {
            const props = feature?.properties || feature || {};
            let lon;
            let lat;

            const coords = feature?.geometry?.coordinates;
            if (Array.isArray(coords) && coords.length >= 2) {
                lon = Number(coords[0]);
                lat = Number(coords[1]);
            } else if (feature?.lon != null && feature?.lat != null) {
                lon = Number(feature.lon);
                lat = Number(feature.lat);
            } else if (props?.lon != null && props?.lat != null) {
                lon = Number(props.lon);
                lat = Number(props.lat);
            } else {
                return null;
            }

            if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

            return {
                id: feature?.id ?? `${lat}-${lon}-${props.name || "location"}`,
                lat,
                lon,
                name: props.name || props.label || feature?.name || "Unknown location",
                label: props.label || props.address || feature?.label || feature?.address || "",
                layer: props.layer || feature?.layer || "",
                country: props.country || feature?.country || "",
                distance: props.distance ?? feature?.distance,
                raw: feature,
            };
        })
        .filter(Boolean);
};

export const extractReverseGeocodeLabel = (payload) => {
    const root = unwrapMapifyPayload(payload);

    if (typeof root?.label === "string" && root.label.trim()) {
        return root.label.trim();
    }

    const results = root?.results ?? root?.data?.results;
    if (Array.isArray(results) && results.length > 0) {
        const first = results[0];
        if (typeof first?.label === "string" && first.label.trim()) {
            return first.label.trim();
        }
        if (typeof first?.name === "string" && first.name.trim()) {
            return first.name.trim();
        }
        const fromFlat = mapifyFeatureToAddress({
            name: first?.name,
            label: first?.label || first?.address,
        });
        if (fromFlat) return fromFlat;
    }

    const features = normalizeMapifyFeatures(payload);
    if (features.length > 0) {
        return mapifyFeatureToAddress(features[0]);
    }

    return null;
};

export async function apiMapifySearch({
    query,
    lat,
    lon,
    size = 8,
    nearbySearch = false,
    boundaryCountry,
    signal,
}) {
    const cleanedQuery = query?.trim();
    if (!cleanedQuery) {
        throw new Error("Search query is required.");
    }

    const params = {
        q: cleanedQuery,
        ...buildNearbySearchParams({ nearbySearch, boundaryCountry }),
    };

    if (size != null) params.size = size;
    if (lat != null && lon != null) {
        params.lat = lat;
        params.lon = lon;
    }

    return ApiService.fetchData({
        url: getSearchEndpoint(),
        method: METHOD_GET,
        params,
        signal,
        headers: {
            Accept: "application/json",
        },
    });
}

export async function apiMapifyGeocoding({
    query,
    lat,
    lon,
    nearbySearch = false,
    boundaryCountry,
    signal,
}) {
    const cleanedQuery = query?.trim();
    if (!cleanedQuery) {
        throw new Error("Search query is required.");
    }

    const params = {
        q: cleanedQuery,
        ...buildNearbySearchParams({ nearbySearch, boundaryCountry }),
    };

    if (lat != null && lon != null) {
        params.lat = lat;
        params.lon = lon;
    }

    return ApiService.fetchData({
        url: getGeocodingEndpoint(),
        method: METHOD_GET,
        params,
        signal,
        headers: {
            Accept: "application/json",
        },
    });
}

export async function apiMapifyReverseGeocoding({ lat, lon, size = 1, signal }) {
    return ApiService.fetchData({
        url: getReverseGeocodingEndpoint(),
        method: METHOD_GET,
        params: {
            lat,
            lon,
            size,
        },
        signal,
        headers: {
            Accept: "application/json",
        },
    });
}

export async function apiSaveMapSearchPreferences({ nearbySearch, boundaryCountry }) {
    const payload = {
        nearby_search: Boolean(nearbySearch),
    };

    if (nearbySearch) {
        const country = normalizeBoundaryCountry(boundaryCountry);
        if (country) {
            payload.boundary_country = country;
        }
    }

    return ApiService.fetchData({
        url: getPreferencesEndpoint(),
        method: METHOD_POST,
        data: payload,
        headers: {
            Accept: "application/json",
        },
    });
}

const reverseGeocodeCache = new Map();

export async function fetchMapifyAddressFromCoords({
    lat,
    lon,
    signal,
    size = 1,
}) {
    if (!isReverseGeocodingAvailable()) return null;

    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    if (reverseGeocodeCache.has(cacheKey)) {
        return reverseGeocodeCache.get(cacheKey);
    }

    let address = null;

    try {
        const reverseRes = await apiMapifyReverseGeocoding({
            lat: latitude,
            lon: longitude,
            size,
            signal,
        });
        address = extractReverseGeocodeLabel(reverseRes?.data);
    } catch (error) {
        if (error?.name === "AbortError" || error?.code === "ERR_CANCELED") {
            throw error;
        }
    }

    if (address) {
        reverseGeocodeCache.set(cacheKey, address);
    }

    return address;
}

export const mapifyFeatureToSuggestion = (item) => ({
    id: item.id,
    label: item.name,
    subtitle: item.label || item.layer || item.country || "",
    inputValue: item.label || item.name,
    lat: item.lat,
    lng: item.lon,
    source: "mapify",
});

export const mapifyFeaturesToSuggestions = (features) =>
    (features || []).map(mapifyFeatureToSuggestion);

export async function fetchMapifyPlaceSearch({
    query,
    lat,
    lon,
    nearbySearch = false,
    boundaryCountry,
    signal,
    size = 8,
}) {
    const cleanedQuery = query?.trim();
    if (!cleanedQuery) return [];

    try {
        const searchRes = await apiMapifySearch({
            query: cleanedQuery,
            lat,
            lon,
            size,
            nearbySearch,
            boundaryCountry,
            signal,
        });
        const searchItems = normalizeMapifyFeatures(searchRes?.data);
        if (searchItems.length > 0) {
            return searchItems;
        }
    } catch (err) {
        if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") {
            throw err;
        }
    }

    const geoRes = await apiMapifyGeocoding({
        query: cleanedQuery,
        lat,
        lon,
        nearbySearch,
        boundaryCountry,
        signal,
    });
    return normalizeMapifyFeatures(geoRes?.data);
}

export async function fetchMapifyLocationSuggestions({
    query,
    lat,
    lon,
    nearbySearch = false,
    boundaryCountry,
    signal,
    size = 8,
}) {
    const items = await fetchMapifyPlaceSearch({
        query,
        lat,
        lon,
        nearbySearch,
        boundaryCountry,
        signal,
        size,
    });
    return mapifyFeaturesToSuggestions(items);
}
