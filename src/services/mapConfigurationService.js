import { METHOD_GET } from "../constants/method.constant";
import {
    GET_COMPANY_API_KEYS,
    GET_MAP_INFORMATION,
    GET_MAP_SEARCH_PREFERENCES,
    GET_MAPIFY_REVERSE_GEOCODING,
    GET_MAPIFY_SEARCH,
    GET_MAPIFY_GEOCODING,
    GET_MAPIFY_TILES_BRIGHT,
    GET_THIRD_PARTY_INFORMATION,
    POST_MAP_SEARCH_PREFERENCES,
} from "../constants/api.route.constant";
import appConfig from "../components/configs/app.config";
import ApiService from "./ApiService";
import { configureMapifyEndpoints, normalizeMapSearchPreferences } from "./MapSearchService";
import { setCachedMapConfiguration } from "./mapConfigCache";
import { getTenantId, getTenantData, getDecryptedToken } from "../utils/functions/tokenEncryption";

export const MAP_PROVIDER_GOOGLE = "google";
export const MAP_PROVIDER_DEFAULT = "default";
export const MAP_PROVIDER_BARIKOI = "barikoi";
export const MAP_STATUS_NO_PROVIDER = 503;
export const MAP_STATUS_SAVE_NO_PROVIDER = 422;

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
            || value.mapify_tiles_url_template != null
            || value.central_map_enabled != null
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
    let path = value.startsWith("/") ? value : `/${value}`;

    if (path.startsWith("/api/") && base.endsWith("/api")) {
        path = path.slice(4);
    }

    return `${base}${path}`.replace(/\/$/, "");
};

export const buildMapifyTileTokenQuery = () => {
    const token = getDecryptedToken();
    return token ? { token } : {};
};

/** @deprecated Use buildMapifyTileTokenQuery — tiles only carry token, not database. */
export const buildMapifyTilesAuthQuery = buildMapifyTileTokenQuery;

export const isMapifyTileUrl = (url = "") => /mapify-tiles/i.test(String(url));

export const buildMapifyTilesPathTemplate = (info = {}) => {
    const rawTemplate = info?.mapify_tiles_url_template;
    const endpoint = info?.mapify_tiles_endpoint;

    if (rawTemplate) {
        return resolveApiUrl(rawTemplate);
    }

    const base = resolveApiUrl(endpoint || GET_MAPIFY_TILES_BRIGHT);
    if (!base) return null;
    return base.includes("{z}") ? base : `${base}/{z}/{x}/{y}.png`;
};

export const appendMapifyTileAuth = (url) => {
    const value = String(url || "").trim();
    if (!value || !isMapifyTileUrl(value)) return value;

    const token = getDecryptedToken();
    if (!token) return value;

    try {
        const parsed = new URL(value, resolveApiUrl("/") || undefined);
        parsed.searchParams.delete("database");
        parsed.searchParams.set("token", token);
        return parsed.toString();
    } catch {
        const withoutQuery = value.split("?")[0];
        return `${withoutQuery}?token=${encodeURIComponent(token)}`;
    }
};

export const createMapifyTransformRequest = () => (url, resourceType) => {
    if (resourceType === "Tile" && isMapifyTileUrl(url)) {
        return { url: appendMapifyTileAuth(url) };
    }
    return { url };
};

export const buildMapifyTilesUrlTemplate = (info = {}) => buildMapifyTilesPathTemplate(info);

const normalizeMapInfo = (info) => {
    const normalized = { ...(info || {}) };
    const mapType = String(normalized.maps_api || normalized.map_type || "").trim().toLowerCase();

    if (!isTruthyFlag(normalized.uses_mapify) && isMapifyMapsApiValue(mapType)) {
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
    const mapType = getConfiguredMapType(info);
    if (mapType === MAP_PROVIDER_DEFAULT || mapType === "mapify") {
        return null;
    }

    const companyKey = info?.google_api_keys ? String(info.google_api_keys).trim() : "";
    if (companyKey) return companyKey;

    const tenantKey = info?.google_api_key ? String(info.google_api_key).trim() : "";
    return tenantKey || null;
};

const getBarikoiKey = (info) => {
    const key = info?.barikoi_api_key ? String(info.barikoi_api_key).trim() : "";
    return key || null;
};

const shouldUseGoogleMaps = (info) => {
    const googleKey = getGoogleKey(info);
    if (!googleKey) return false;
    if (isTruthyFlag(info?.uses_google_map)) return true;
    if (isTruthyFlag(info?.uses_mapify)) return false;

    const mapType = getConfiguredMapType(info);
    return mapType === MAP_PROVIDER_GOOGLE;
};

const shouldUseMapify = (info) => {
    if (isTruthyFlag(info?.uses_mapify)) {
        if (isTruthyFlag(info?.uses_google_map) && getGoogleKey(info)) return false;
        return true;
    }

    const mapType = getConfiguredMapType(info);
    if (isMapifyMapsApiValue(mapType)) {
        if (isTruthyFlag(info?.uses_google_map) && getGoogleKey(info)) return false;
        return true;
    }

    return false;
};

const shouldUseBarikoi = (info) => {
    const mapType = getConfiguredMapType(info);
    if (isMapifyMapsApiValue(mapType)) return false;
    if (isTruthyFlag(info?.uses_mapify) || isTruthyFlag(info?.uses_google_map)) return false;

    if (mapType === MAP_PROVIDER_BARIKOI) return true;
    if (mapType === MAP_PROVIDER_DEFAULT) return false;

    const country = String(info?.country_of_use || "").trim().toUpperCase();
    return country === "BD";
};

const isMapifyMapsApiValue = (mapType) => {
    const normalized = String(mapType || "").trim().toLowerCase();
    return normalized === MAP_PROVIDER_DEFAULT
        || normalized === "mapify"
        || normalized === "barikoi";
};

export const extractMapifyStyleFromResponse = (response) => {
    const payload = response?.data ?? response;
    if (!payload || typeof payload !== "object") return null;

    const candidates = [
        payload,
        payload.data,
        payload.data?.data,
        payload.style,
        payload.data?.style,
    ];

    for (const candidate of candidates) {
        if (candidate?.version != null && candidate?.sources && candidate?.layers) {
            return candidate;
        }
    }

    return null;
};

export async function fetchMapifyBasemapStyle(styleUrl = GET_MAPIFY_TILES_BRIGHT) {
    const response = await ApiService.fetchData({
        url: styleUrl,
        method: METHOD_GET,
        headers: {
            Accept: "application/json",
        },
    });

    const style = extractMapifyStyleFromResponse(response);
    if (!style) {
        throw new Error("Mapify basemap style response is invalid.");
    }

    return style;
};

const getMapifyStyleEndpoint = (info) =>
    resolveApiUrl(
        info?.mapify_tiles_style_endpoint
        || info?.mapify_tiles_endpoint
        || GET_MAPIFY_TILES_BRIGHT
    );

const getMapifySearchEndpoint = (info) =>
    resolveApiUrl(info?.mapify_search_endpoint || GET_MAPIFY_SEARCH);

const getMapifyGeocodingEndpoint = (info) =>
    resolveApiUrl(info?.mapify_geocoding_endpoint || GET_MAPIFY_GEOCODING);

const getMapifyReverseGeocodingEndpoint = (info) =>
    resolveApiUrl(info?.mapify_reverse_geocoding_endpoint || GET_MAPIFY_REVERSE_GEOCODING);

const getMapifyPreferencesGetEndpoint = (info) =>
    resolveApiUrl(info?.map_search_preferences_endpoint || GET_MAP_SEARCH_PREFERENCES);

const getMapifyPreferencesPostEndpoint = (info) =>
    resolveApiUrl(info?.map_search_preferences_endpoint || POST_MAP_SEARCH_PREFERENCES);

export const buildMapifyRasterStyle = (tilesUrlTemplate) => {
    const template = String(tilesUrlTemplate || "").trim();
    if (!template) return null;

    return {
        version: 8,
        name: "Mapify",
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
        sources: {
            mapify: {
                type: "raster",
                tiles: [template],
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
    companyKeys: null,
    mapSearchPreferences: null,
    ...overrides,
});

const extractCompanyKeys = (keysRes) => {
    if (!isSuccess(keysRes?.data)) return null;

    const keysData = keysRes?.data?.data;
    if (!keysData || typeof keysData !== "object") return null;

    return {
        country_of_use: keysData.country_of_use || null,
        search_api: keysData.search_api || null,
        barikoi_api_key: keysData.barikoi_api_key || null,
        maps_api: keysData.maps_api || null,
        units: keysData.units || null,
    };
};

const hasThirdPartyMapConfig = (thirdPartyRes) => {
    if (!isSuccess(thirdPartyRes?.data)) return false;

    const info = extractMapInfo(thirdPartyRes?.data);
    if (!info) return false;

    return hasMapFields(info)
        || info.uses_mapify != null
        || info.uses_google_map != null
        || info.map_provider != null;
};

const attachCompanyKeys = (config, keysRes) => ({
    ...config,
    companyKeys: extractCompanyKeys(keysRes),
});

const attachMapSearchPreferences = (config, keysRes, ...preferenceSources) => {
    const fallbackCountry = extractCompanyKeys(keysRes)?.country_of_use || null;

    for (const source of preferenceSources) {
        if (source?.map_search_preferences) {
            return {
                ...config,
                mapSearchPreferences: normalizeMapSearchPreferences(
                    source.map_search_preferences,
                    fallbackCountry
                ),
            };
        }
    }

    return {
        ...config,
        mapSearchPreferences: normalizeMapSearchPreferences(null, fallbackCountry),
    };
};

const buildConfigFromInfo = (rawInfo) => {
    const info = normalizeMapInfo(rawInfo);

    if (shouldUseGoogleMaps(info)) {
        configureMapifyEndpoints(null);
        const googleKey = getGoogleKey(info);
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
        const styleEndpoint = getMapifyStyleEndpoint(info);
        const searchEndpoint = getMapifySearchEndpoint(info);
        const geocodingEndpoint = getMapifyGeocodingEndpoint(info);
        const reverseGeocodingEndpoint = getMapifyReverseGeocodingEndpoint(info);

        if (!styleEndpoint) {
            throw new Error("Mapify style endpoint is not configured on the server.");
        }

        configureMapifyEndpoints({
            searchEndpoint,
            geocodingEndpoint,
            reverseGeocodingEndpoint,
            preferencesGetEndpoint: getMapifyPreferencesGetEndpoint(info),
            preferencesPostEndpoint: getMapifyPreferencesPostEndpoint(info),
        });

        return {
            ok: true,
            provider: MAP_PROVIDER_DEFAULT,
            googleKey: null,
            barikoiKey: null,
            mapifyStyle: null,
            mapifyStyleEndpoint: styleEndpoint,
            barikoiStyle: null,
            mapifyTilesEndpoint: styleEndpoint,
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
        const [thirdPartyRes, keysRes] = await Promise.all([
            fetchMapSource(GET_THIRD_PARTY_INFORMATION),
            fetchMapSource(GET_COMPANY_API_KEYS),
        ]);

        let mapRes = { data: null, error: null };
        if (!hasThirdPartyMapConfig(thirdPartyRes)) {
            mapRes = await fetchMapSource(GET_MAP_INFORMATION);
        }

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

        const builtConfig = buildConfigFromInfo(info);

        if (builtConfig.ok && builtConfig.usesMapify) {
            try {
                builtConfig.mapifyStyle = await fetchMapifyBasemapStyle(
                    builtConfig.mapifyStyleEndpoint || GET_MAPIFY_TILES_BRIGHT
                );
            } catch (styleError) {
                const error = new Error(
                    extractErrorMessage(styleError?.response?.data?.message)
                    || styleError?.message
                    || "Unable to load Mapify basemap style."
                );
                error.response = styleError?.response;
                throw error;
            }
        }

        const config = attachMapSearchPreferences(
            attachCompanyKeys(builtConfig, keysRes),
            keysRes,
            thirdPartyRes?.data,
            mapRes?.data,
        );

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
        const config = attachMapSearchPreferences(
            attachCompanyKeys(emptyMapConfig({
                status: error?.response?.status,
                message: getMapErrorMessage(error),
                error,
            }), null),
            null,
        );

        if (!requestTenantId || getTenantId() === requestTenantId) {
            setCachedMapConfiguration(config);
        }

        return config;
    }
}
