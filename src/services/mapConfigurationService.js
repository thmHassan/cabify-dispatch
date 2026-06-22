import { METHOD_GET } from "../constants/method.constant";
import {
    GET_COMPANY_API_KEYS,
    GET_MAP_INFORMATION,
    GET_MAPIFY_REVERSE_GEOCODING,
    GET_MAPIFY_SEARCH,
    GET_MAPIFY_GEOCODING,
    GET_MAPIFY_TILES_BRIGHT,
    GET_THIRD_PARTY_INFORMATION,
} from "../constants/api.route.constant";
import appConfig from "../components/configs/app.config";
import ApiService from "./ApiService";
import { configureMapifyEndpoints } from "./MapSearchService";
import { setCachedMapConfiguration } from "./mapConfigCache";
import { getTenantId, getTenantData } from "../utils/functions/tokenEncryption";

export const MAP_PROVIDER_GOOGLE = "google";
export const MAP_PROVIDER_DEFAULT = "default";
export const MAP_PROVIDER_BARIKOI = "barikoi";
export const MAP_STATUS_NO_PROVIDER = 503;
export const MAP_STATUS_SAVE_NO_PROVIDER = 422;

const ENV_GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const ENV_BARIKOI_KEY =
    import.meta.env.VITE_BARIKOI_API_KEY
    || import.meta.env.VITE_BARIKOI_KEY
    || "";

const isTruthyFlag = (value) =>
    value === true
    || value === 1
    || value === "1"
    || String(value ?? "").trim().toLowerCase() === "true";

const isSuccess = (data) =>
    data?.success === 1 || data?.success === true || data?.success === "1";

export const getMapErrorMessage = (error, fallback = "Unable to load map configuration") => {
    const status = error?.response?.status ?? error?.status;
    const message = extractErrorMessage(error?.response?.data?.message)
        ?? extractErrorMessage(error?.message);

    if (status === MAP_STATUS_NO_PROVIDER) {
        return message || "No map provider is configured. Add a Google Maps API key or configure Mapify on the server.";
    }
    if (status === MAP_STATUS_SAVE_NO_PROVIDER) {
        return message || "Settings saved, but no map provider is available. Add a Google Maps API key or configure Mapify on the server.";
    }
    if (message) return message;
    return fallback;
};

const hasMapFields = (value) =>
    Boolean(
        value
        && typeof value === "object"
        && (
            value.map_type != null
            || value.maps_api != null
            || value.uses_mapify != null
            || value.uses_google_map != null
            || value.mapify_tiles_endpoint != null
            || value.google_api_keys != null
            || value.barikoi_api_key != null
        )
    );

const extractMapInfo = (responseData) => {
    if (!responseData || typeof responseData !== "object") return null;

    if (hasMapFields(responseData)) return responseData;

    const queue = [responseData];
    const seen = new Set();

    while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== "object" || seen.has(node)) continue;
        seen.add(node);

        if (hasMapFields(node)) return node;

        ["data", "company", "company_data", "settings", "map"].forEach((key) => {
            const child = node[key];
            if (child && typeof child === "object") queue.push(child);
        });
    }

    return responseData.data && typeof responseData.data === "object"
        ? responseData.data
        : responseData;
};

const mergeMapInfo = (...sources) => {
    const merged = {};
    sources.filter(Boolean).forEach((source) => {
        const info = extractMapInfo(source);
        if (info && typeof info === "object") {
            Object.assign(merged, info);
        }
    });
    return merged;
};

const resolveApiUrl = (endpoint) => {
    const value = String(endpoint || "").trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value.replace(/\/$/, "");

    const base = appConfig.apiPrefix.replace(/\/$/, "");
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${base}${path}`.replace(/\/$/, "");
};

const normalizeMapInfo = (info) => {
    const normalized = { ...(info || {}) };
    const mapType = String(normalized.maps_api || normalized.map_type || "").trim().toLowerCase();

    if (!isTruthyFlag(normalized.uses_mapify) && (mapType === MAP_PROVIDER_DEFAULT || mapType === "mapify")) {
        normalized.uses_mapify = true;
    }

    if (!isTruthyFlag(normalized.uses_google_map) && mapType === MAP_PROVIDER_GOOGLE && getGoogleKey(normalized)) {
        normalized.uses_google_map = true;
    }

    return normalized;
};

const getConfiguredMapType = (info) =>
    String(info?.maps_api || info?.map_type || "").trim().toLowerCase();

const getGoogleKey = (info) => {
    const companyKey = info?.google_api_keys ? String(info.google_api_keys).trim() : "";
    if (companyKey) return companyKey;

    const mapType = getConfiguredMapType(info);
    if (mapType === MAP_PROVIDER_DEFAULT || mapType === "mapify") {
        return null;
    }

    const tenantKey = info?.google_api_key ? String(info.google_api_key).trim() : "";
    return tenantKey || null;
};

const getBarikoiKey = (info) => {
    const key = info?.barikoi_api_key ? String(info.barikoi_api_key).trim() : "";
    return key || null;
};

const shouldUseGoogleMaps = (info) => {
    const googleKey = getGoogleKey(info) || ENV_GOOGLE_KEY || null;
    if (!googleKey) return false;
    if (isTruthyFlag(info?.uses_google_map)) return true;
    if (isTruthyFlag(info?.uses_mapify)) return false;

    const mapType = getConfiguredMapType(info);
    if (mapType === MAP_PROVIDER_GOOGLE) return true;

    return !isTruthyFlag(info?.uses_mapify) && mapType !== MAP_PROVIDER_DEFAULT && mapType !== MAP_PROVIDER_BARIKOI;
};

const shouldUseMapify = (info) => {
    if (isTruthyFlag(info?.uses_mapify)) {
        if (isTruthyFlag(info?.uses_google_map) && (getGoogleKey(info) || ENV_GOOGLE_KEY)) return false;
        return true;
    }

    const mapType = getConfiguredMapType(info);
    if (mapType === MAP_PROVIDER_DEFAULT || mapType === "mapify") {
        if (isTruthyFlag(info?.uses_google_map) && getGoogleKey(info)) return false;
        return true;
    }

    return false;
};

const shouldUseBarikoi = (info) => {
    if (isTruthyFlag(info?.uses_mapify) || isTruthyFlag(info?.uses_google_map)) return false;

    const mapType = getConfiguredMapType(info);
    if (mapType === MAP_PROVIDER_BARIKOI) return true;
    if (mapType === MAP_PROVIDER_DEFAULT) return false;

    const country = String(info?.country_of_use || "").trim().toUpperCase();
    return country === "BD";
};

const getMapifyTilesEndpoint = (info) =>
    resolveApiUrl(info?.mapify_tiles_endpoint || GET_MAPIFY_TILES_BRIGHT);

const getMapifySearchEndpoint = (info) =>
    resolveApiUrl(info?.mapify_search_endpoint || GET_MAPIFY_SEARCH);

const getMapifyGeocodingEndpoint = (info) =>
    resolveApiUrl(info?.mapify_geocoding_endpoint || GET_MAPIFY_GEOCODING);

const getMapifyReverseGeocodingEndpoint = (info) =>
    resolveApiUrl(info?.mapify_reverse_geocoding_endpoint || GET_MAPIFY_REVERSE_GEOCODING);

export const buildMapifyRasterStyle = (tilesEndpoint) => {
    const base = String(tilesEndpoint || "").replace(/\/$/, "");
    if (!base) return null;

    return {
        version: 8,
        name: "Mapify",
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
        sources: {
            mapify: {
                type: "raster",
                tiles: [`${base}/{z}/{x}/{y}.png`],
                tileSize: 256,
                attribution: "© Mapify",
                maxzoom: 19,
            },
        },
        layers: [
            {
                id: "mapify-tiles",
                type: "raster",
                source: "mapify",
                minzoom: 0,
                maxzoom: 22,
            },
        ],
    };
};

export const buildBarikoiRasterStyle = (barikoiKey) => {
    const key = String(barikoiKey || "").trim();
    if (!key) return null;

    return {
        version: 8,
        name: "Barikoi",
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
        sources: {
            "barikoi-tiles": {
                type: "raster",
                tiles: [`https://tile.barikoi.com/styles/barikoi/tiles/{z}/{x}/{y}.png?key=${key}`],
                tileSize: 256,
                attribution: "© Barikoi | © OpenStreetMap contributors",
                maxzoom: 19,
            },
        },
        layers: [
            {
                id: "barikoi-tiles",
                type: "raster",
                source: "barikoi-tiles",
                minzoom: 0,
                maxzoom: 22,
            },
        ],
    };
};

const getTenantPayloadForMapConfig = () => {
    const tenantData = getTenantData();
    if (!tenantData || typeof tenantData !== "object") return null;

    const currentTenantId = String(getTenantId() || "").trim().toLowerCase();
    if (!currentTenantId) return null;

    const payloadTenantId = String(
        tenantData.tenant_id
        ?? tenantData.data?.tenant_id
        ?? tenantData.company_id
        ?? tenantData.data?.company_id
        ?? ""
    ).trim().toLowerCase();

    if (payloadTenantId && payloadTenantId !== currentTenantId) {
        return null;
    }

    return tenantData.data && typeof tenantData.data === "object"
        ? tenantData.data
        : tenantData;
};

const extractErrorMessage = (value) => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value)) {
        const joined = value.filter((item) => typeof item === "string" && item.trim()).join(" ");
        if (joined) return joined;
    }
    return null;
};

const fetchMapSource = async (url) => {
    try {
        return await ApiService.fetchData({
            url,
            method: METHOD_GET,
        });
    } catch (error) {
        return { error, data: error?.response?.data ?? null };
    }
};

const emptyMapConfig = (overrides = {}) => ({
    ok: false,
    provider: null,
    googleKey: null,
    barikoiKey: null,
    mapifyStyle: null,
    barikoiStyle: null,
    mapifyTilesEndpoint: null,
    mapifySearchEndpoint: null,
    mapifyGeocodingEndpoint: null,
    mapifyReverseGeocodingEndpoint: null,
    usesMapify: false,
    usesGoogleMap: false,
    raw: null,
    ...overrides,
});

const buildConfigFromInfo = (rawInfo) => {
    const info = normalizeMapInfo(rawInfo);

    if (shouldUseGoogleMaps(info)) {
        configureMapifyEndpoints(null);
        const googleKey = getGoogleKey(info) || ENV_GOOGLE_KEY || null;
        return {
            ok: true,
            provider: MAP_PROVIDER_GOOGLE,
            googleKey,
            barikoiKey: null,
            mapifyStyle: null,
            barikoiStyle: null,
            mapifyTilesEndpoint: null,
            mapifySearchEndpoint: null,
            mapifyGeocodingEndpoint: null,
            mapifyReverseGeocodingEndpoint: null,
            usesMapify: false,
            usesGoogleMap: true,
            raw: info,
        };
    }

    if (shouldUseMapify(info)) {
        const tilesEndpoint = getMapifyTilesEndpoint(info);
        const searchEndpoint = getMapifySearchEndpoint(info);
        const geocodingEndpoint = getMapifyGeocodingEndpoint(info);
        const reverseGeocodingEndpoint = getMapifyReverseGeocodingEndpoint(info);

        if (!tilesEndpoint) {
            throw new Error("Mapify tiles endpoint is not configured on the server.");
        }

        configureMapifyEndpoints({
            searchEndpoint,
            geocodingEndpoint,
            reverseGeocodingEndpoint,
        });

        const mapifyStyle = buildMapifyRasterStyle(tilesEndpoint);
        if (!mapifyStyle) {
            throw new Error("Unable to build Mapify map style.");
        }

        return {
            ok: true,
            provider: MAP_PROVIDER_DEFAULT,
            googleKey: null,
            barikoiKey: null,
            mapifyStyle,
            barikoiStyle: null,
            mapifyTilesEndpoint: tilesEndpoint,
            mapifySearchEndpoint: searchEndpoint,
            mapifyGeocodingEndpoint: geocodingEndpoint,
            mapifyReverseGeocodingEndpoint: reverseGeocodingEndpoint,
            usesMapify: true,
            usesGoogleMap: false,
            raw: info,
        };
    }

    if (shouldUseBarikoi(info)) {
        configureMapifyEndpoints(null);
        const barikoiKey = getBarikoiKey(info) || ENV_BARIKOI_KEY || null;
        const barikoiStyle = barikoiKey ? buildBarikoiRasterStyle(barikoiKey) : null;

        if (!barikoiKey || !barikoiStyle) {
            throw new Error("Barikoi API key is not configured.");
        }

        return {
            ok: true,
            provider: MAP_PROVIDER_BARIKOI,
            googleKey: null,
            barikoiKey,
            mapifyStyle: null,
            barikoiStyle,
            mapifyTilesEndpoint: null,
            mapifySearchEndpoint: null,
            mapifyGeocodingEndpoint: null,
            mapifyReverseGeocodingEndpoint: null,
            usesMapify: false,
            usesGoogleMap: false,
            raw: info,
        };
    }

    const configuredMapType = getConfiguredMapType(info);
    const prefersMapify = configuredMapType === MAP_PROVIDER_DEFAULT
        || configuredMapType === "mapify"
        || isTruthyFlag(info?.uses_mapify);

    if (ENV_GOOGLE_KEY && !prefersMapify) {
        configureMapifyEndpoints(null);
        return {
            ok: true,
            provider: MAP_PROVIDER_GOOGLE,
            googleKey: ENV_GOOGLE_KEY,
            barikoiKey: null,
            mapifyStyle: null,
            barikoiStyle: null,
            mapifyTilesEndpoint: null,
            mapifySearchEndpoint: null,
            mapifyGeocodingEndpoint: null,
            mapifyReverseGeocodingEndpoint: null,
            usesMapify: false,
            usesGoogleMap: true,
            raw: info,
        };
    }

    const error = new Error("No map provider is configured. Add a Google Maps API key or configure Mapify on the server.");
    error.response = {
        status: MAP_STATUS_NO_PROVIDER,
        data: { message: error.message },
    };
    throw error;
};

export async function fetchMapConfiguration() {
    const requestTenantId = getTenantId();

    try {
        const [mapRes, thirdPartyRes, keysRes] = await Promise.all([
            fetchMapSource(GET_MAP_INFORMATION),
            fetchMapSource(GET_THIRD_PARTY_INFORMATION),
            fetchMapSource(GET_COMPANY_API_KEYS),
        ]);

        if (requestTenantId && getTenantId() !== requestTenantId) {
            const error = new Error("Tenant changed while loading map configuration.");
            error.code = "MAP_CONFIG_TENANT_CHANGED";
            throw error;
        }

        const info = mergeMapInfo(
            getTenantPayloadForMapConfig(),
            keysRes?.data?.data,
            keysRes?.data,
            mapRes?.data,
            thirdPartyRes?.data,
        );

        const hasUsablePayload =
            hasMapFields(info)
            || isSuccess(mapRes?.data)
            || isSuccess(thirdPartyRes?.data)
            || isSuccess(keysRes?.data)
            || ENV_GOOGLE_KEY
            || ENV_BARIKOI_KEY;

        if (!hasUsablePayload) {
            const error = new Error(
                mapRes?.data?.message
                || thirdPartyRes?.data?.message
                || keysRes?.data?.message
                || "Map configuration unavailable"
            );
            error.response = {
                status: mapRes?.error?.response?.status
                    ?? thirdPartyRes?.error?.response?.status
                    ?? keysRes?.error?.response?.status,
                data: mapRes?.data ?? thirdPartyRes?.data ?? keysRes?.data,
            };
            throw error;
        }

        const config = buildConfigFromInfo(info);

        if (requestTenantId && getTenantId() !== requestTenantId) {
            const error = new Error("Tenant changed while loading map configuration.");
            error.code = "MAP_CONFIG_TENANT_CHANGED";
            throw error;
        }

        setCachedMapConfiguration(config);
        return config;
    } catch (error) {
        if (error?.code === "MAP_CONFIG_TENANT_CHANGED") {
            throw error;
        }

        configureMapifyEndpoints(null);
        const config = emptyMapConfig({
            status: error?.response?.status,
            message: getMapErrorMessage(error),
            error,
        });

        if (!requestTenantId || getTenantId() === requestTenantId) {
            setCachedMapConfiguration(config);
        }

        return config;
    }
}
