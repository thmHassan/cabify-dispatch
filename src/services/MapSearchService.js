import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import {
    GET_MAP_SEARCH_PREFERENCES,
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
    preferencesGetEndpoint: GET_MAP_SEARCH_PREFERENCES,
    preferencesPostEndpoint: POST_MAP_SEARCH_PREFERENCES,
};

export const configureMapifyEndpoints = (endpoints) => {
    if (!endpoints) {
        mapifyEndpoints = {
            searchEndpoint: GET_MAPIFY_SEARCH,
            geocodingEndpoint: GET_MAPIFY_GEOCODING,
            reverseGeocodingEndpoint: GET_MAPIFY_REVERSE_GEOCODING,
            preferencesGetEndpoint: GET_MAP_SEARCH_PREFERENCES,
            preferencesPostEndpoint: POST_MAP_SEARCH_PREFERENCES,
        };
        return;
    }

    mapifyEndpoints = {
        searchEndpoint: endpoints.searchEndpoint || GET_MAPIFY_SEARCH,
        geocodingEndpoint: endpoints.geocodingEndpoint || GET_MAPIFY_GEOCODING,
        reverseGeocodingEndpoint:
            endpoints.reverseGeocodingEndpoint || GET_MAPIFY_REVERSE_GEOCODING,
        preferencesGetEndpoint:
            endpoints.preferencesGetEndpoint
            || endpoints.preferencesEndpoint
            || GET_MAP_SEARCH_PREFERENCES,
        preferencesPostEndpoint:
            endpoints.preferencesPostEndpoint
            || endpoints.preferencesEndpoint
            || POST_MAP_SEARCH_PREFERENCES,
    };
};

const getSearchEndpoint = () => mapifyEndpoints.searchEndpoint || GET_MAPIFY_SEARCH;
const getGeocodingEndpoint = () => mapifyEndpoints.geocodingEndpoint || GET_MAPIFY_GEOCODING;
const getReverseGeocodingEndpoint = () =>
    mapifyEndpoints.reverseGeocodingEndpoint || GET_MAPIFY_REVERSE_GEOCODING;
const getPreferencesGetEndpoint = () =>
    mapifyEndpoints.preferencesGetEndpoint || GET_MAP_SEARCH_PREFERENCES;
const getPreferencesPostEndpoint = () =>
    mapifyEndpoints.preferencesPostEndpoint || POST_MAP_SEARCH_PREFERENCES;

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

export const toBoundaryCountryCode = (code) =>
    normalizeBoundaryCountry(code) || null;

const BOUNDARY_COUNTRY_ALIASES = {
    PK: "PAK",
    PAK: "PAK",
    PAKISTAN: "PAK",
    AE: "ARE",
    UAE: "ARE",
    ARE: "ARE",
    "UNITED ARAB EMIRATES": "ARE",
    BD: "BGD",
    BGD: "BGD",
    BANGLADESH: "BGD",
    IN: "IND",
    IND: "IND",
    INDIA: "IND",
    GB: "GBR",
    GBR: "GBR",
    UK: "GBR",
    "UNITED KINGDOM": "GBR",
    SA: "SAU",
    SAU: "SAU",
    QA: "QAT",
    QAT: "QAT",
    OM: "OMN",
    OMN: "OMN",
    KW: "KWT",
    KWT: "KWT",
    BH: "BHR",
    BHR: "BHR",
    US: "USA",
    USA: "USA",
    CA: "CAN",
    CAN: "CAN",
    AU: "AUS",
    AUS: "AUS",
    MY: "MYS",
    MYS: "MYS",
    SG: "SGP",
    SGP: "SGP",
};

export const toMapifyBoundaryCountryCode = (code) => {
    const normalized = normalizeBoundaryCountry(code);
    if (!normalized) return null;
    return BOUNDARY_COUNTRY_ALIASES[normalized] || normalized;
};

export const MAPIFY_AUTOCOMPLETE_SIZE = 8;
export const MAPIFY_FULL_SEARCH_SIZE = 20;

const parseNearbySearchFlag = (value) => {
    if (value === true || value === 1 || value === "1") return true;
    if (value === false || value === 0 || value === "0") return false;
    return Boolean(value);
};

export const normalizeMapSearchPreferences = (raw) => {
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
    const boundaryCountry = nearbySearch
        ? null
        : normalizeBoundaryCountry(
            prefs.search_boundary_country ?? prefs.boundary_country
        ) || null;

    return {
        nearbySearch,
        boundaryCountry,
    };
};

export const getMapSearchPreferencesFromConfig = (fallbackCountry = null) => {
    const config = getCachedMapConfiguration();
    if (config?.mapSearchPreferences) {
        return config.mapSearchPreferences;
    }
    return normalizeMapSearchPreferences(
        config?.raw?.map_search_preferences ?? config?.raw
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

    return normalizeMapSearchPreferences(merged);
};

export const extractSyncedMapSearchPreferencesFromResponse = (response) => {
    const payload = response?.data;
    if (!payload) return null;

    const root = payload?.data ?? payload;
    if (!root || typeof root !== "object") return null;

    const hasPreferenceFields = (
        root.map_search_preferences != null
        || root.nearby_search !== undefined
        || root.nearby_search_enabled !== undefined
        || root.search_boundary_country !== undefined
        || root.boundary_country !== undefined
    );

    if (!hasPreferenceFields) return null;

    return normalizeMapSearchPreferences(root);
};

export async function apiGetMapSearchPreferences() {
    return ApiService.fetchData({
        url: getPreferencesGetEndpoint(),
        method: METHOD_GET,
        headers: {
            Accept: "application/json",
        },
    });
}

const buildMapifySearchParams = ({ nearbySearch, boundaryCountry }) => {
    const params = { nearby_search: nearbySearch ? 1 : 0 };

    if (!boundaryCountry) return params;

    const country = nearbySearch
        ? toMapifyBoundaryCountryCode(boundaryCountry)
        : (toMapifyBoundaryCountryCode(boundaryCountry) || normalizeBoundaryCountry(boundaryCountry));

    if (country) {
        params.boundary_country = country;
    }

    return params;
};

const attachMapifyCoordinates = ({ params, nearbySearch, lat, lon }) => {
    const latitude = coerceCoordinate(lat);
    const longitude = coerceCoordinate(lon);

    if (nearbySearch) {
        assertNearbySearchCoordinates(nearbySearch, latitude, longitude);
        params.lat = latitude;
        params.lon = longitude;
        return params;
    }

    if (latitude != null && longitude != null) {
        params.lat = latitude;
        params.lon = longitude;
    }

    return params;
};

const coerceCoordinate = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
};

const assertNearbySearchCoordinates = (nearbySearch, lat, lon) => {
    if (!nearbySearch) return;
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Map position (lat and lon) is required for nearby search.");
    }
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

const extractCountryCodeFromFeature = (feature) => {
    if (!feature || typeof feature !== "object") return null;

    const props = feature?.properties || feature;
    const candidates = [
        props?.boundary_country,
        props?.search_boundary_country,
        props?.country_a3,
        props?.country_code,
        props?.countrycode,
        props?.country,
        props?.iso3166_1_alpha3,
        props?.iso3166_1_alpha2,
        props?.iso3166_1,
        feature?.boundary_country,
        feature?.country_a3,
        feature?.country_code,
        feature?.country,
    ];

    for (const candidate of candidates) {
        const mapped = toMapifyBoundaryCountryCode(candidate);
        if (mapped) return mapped;
    }

    return null;
};

export const extractReverseGeocodeCountryCode = (payload) => {
    const root = unwrapMapifyPayload(payload);

    const rootCandidates = [
        root?.boundary_country,
        root?.search_boundary_country,
        root?.country_a3,
        root?.country_code,
        root?.country,
    ];
    for (const candidate of rootCandidates) {
        const mapped = toMapifyBoundaryCountryCode(candidate);
        if (mapped) return mapped;
    }

    const results = root?.results ?? root?.data?.results;
    if (Array.isArray(results)) {
        for (const result of results) {
            const mapped = extractCountryCodeFromFeature(result);
            if (mapped) return mapped;
        }
    }

    const features = normalizeMapifyFeatures(payload);
    for (const feature of features) {
        const mapped = extractCountryCodeFromFeature(feature.raw || feature);
        if (mapped) return mapped;
        if (feature.country) {
            const fromCountry = toMapifyBoundaryCountryCode(feature.country);
            if (fromCountry) return fromCountry;
        }
    }

    return null;
};

export async function apiMapifySearch({
    query,
    lat,
    lon,
    size = MAPIFY_AUTOCOMPLETE_SIZE,
    nearbySearch = false,
    boundaryCountry,
    signal,
}) {
    const cleanedQuery = query?.trim();
    if (!cleanedQuery) {
        throw new Error("Search query is required.");
    }

    const params = attachMapifyCoordinates({
        params: {
            q: cleanedQuery,
            ...buildMapifySearchParams({ nearbySearch, boundaryCountry }),
        },
        nearbySearch,
        lat,
        lon,
    });

    if (size != null) params.size = size;

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
    size,
}) {
    const cleanedQuery = query?.trim();
    if (!cleanedQuery) {
        throw new Error("Search query is required.");
    }

    const params = attachMapifyCoordinates({
        params: {
            q: cleanedQuery,
            ...buildMapifySearchParams({ nearbySearch, boundaryCountry }),
        },
        nearbySearch,
        lat,
        lon,
    });

    if (size != null) params.size = size;

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

    if (!nearbySearch) {
        const country = toMapifyBoundaryCountryCode(boundaryCountry)
            || normalizeBoundaryCountry(boundaryCountry);
        if (country) {
            payload.boundary_country = country;
        }
    }

    return ApiService.fetchData({
        url: getPreferencesPostEndpoint(),
        method: METHOD_POST,
        data: payload,
        headers: {
            Accept: "application/json",
        },
    });
}

const reverseGeocodeCache = new Map();
const reverseGeocodeCountryCache = new Map();

export async function fetchMapifyBoundaryCountryFromCoords({
    lat,
    lon,
    signal,
    size = 1,
    fallbackCountry = null,
}) {
    if (!isReverseGeocodingAvailable()) {
        return toMapifyBoundaryCountryCode(fallbackCountry);
    }

    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return toMapifyBoundaryCountryCode(fallbackCountry);
    }

    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    if (reverseGeocodeCountryCache.has(cacheKey)) {
        return reverseGeocodeCountryCache.get(cacheKey);
    }

    let countryCode = null;

    try {
        const reverseRes = await apiMapifyReverseGeocoding({
            lat: latitude,
            lon: longitude,
            size,
            signal,
        });
        countryCode = extractReverseGeocodeCountryCode(reverseRes?.data);
    } catch (error) {
        if (error?.name === "AbortError" || error?.code === "ERR_CANCELED") {
            throw error;
        }
    }

    if (!countryCode) {
        countryCode = toMapifyBoundaryCountryCode(fallbackCountry);
    }

    if (countryCode) {
        reverseGeocodeCountryCache.set(cacheKey, countryCode);
    }

    return countryCode;
}

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
    size = MAPIFY_AUTOCOMPLETE_SIZE,
    onPreferencesSynced,
}) {
    const cleanedQuery = query?.trim();
    if (!cleanedQuery) return { items: [], syncedPreferences: null };

    if (nearbySearch) {
        const latitude = Number(lat);
        const longitude = Number(lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return { items: [], syncedPreferences: null };
        }
    }

    const syncPreferences = (response) => {
        const syncedPreferences = extractSyncedMapSearchPreferencesFromResponse(response);
        if (syncedPreferences) {
            onPreferencesSynced?.(syncedPreferences);
        }
        return syncedPreferences;
    };

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
        const syncedPreferences = syncPreferences(searchRes);
        const searchItems = normalizeMapifyFeatures(searchRes?.data);
        if (searchItems.length > 0) {
            return { items: searchItems, syncedPreferences };
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
        size,
    });
    const syncedPreferences = syncPreferences(geoRes);
    return {
        items: normalizeMapifyFeatures(geoRes?.data),
        syncedPreferences,
    };
}

export async function fetchMapifyLocationSuggestions({
    query,
    lat,
    lon,
    nearbySearch = false,
    boundaryCountry,
    signal,
    size = MAPIFY_AUTOCOMPLETE_SIZE,
    onPreferencesSynced,
}) {
    const { items } = await fetchMapifyPlaceSearch({
        query,
        lat,
        lon,
        nearbySearch,
        boundaryCountry,
        signal,
        size,
        onPreferencesSynced,
    });
    return mapifyFeaturesToSuggestions(items);
}
