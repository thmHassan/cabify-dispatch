import { METHOD_GET } from "../constants/method.constant";
import {
    GET_MAP_INFORMATION,
    GET_MAPIFY_REVERSE_GEOCODING,
    GET_THIRD_PARTY_INFORMATION,
} from "../constants/api.route.constant";
import ApiService from "./ApiService";
import { configureMapifyEndpoints } from "./MapSearchService";
import { setCachedMapConfiguration } from "./mapConfigCache";

export const MAP_PROVIDER_GOOGLE = "google";
export const MAP_PROVIDER_DEFAULT = "default";
export const MAP_PROVIDER_BARIKOI = "barikoi";
export const MAP_STATUS_NO_PROVIDER = 503;
export const MAP_STATUS_SAVE_NO_PROVIDER = 422;

const isSuccess = (data) =>
    data?.success === 1 || data?.success === true || data?.success === "1";

export const getMapErrorMessage = (error, fallback = "Unable to load map configuration") => {
    const status = error?.response?.status ?? error?.status;
    const message = error?.response?.data?.message ?? error?.message;

    if (status === MAP_STATUS_NO_PROVIDER) {
        return message || "No map provider is configured. Add a Google Maps API key or configure Mapify on the server.";
    }
    if (status === MAP_STATUS_SAVE_NO_PROVIDER) {
        return message || "Settings saved, but no map provider is available. Add a Google Maps API key or configure Mapify on the server.";
    }
    if (typeof message === "string" && message.trim()) return message;
    return fallback;
};

const extractMapInfo = (responseData) => {
    if (!responseData || typeof responseData !== "object") return null;
    if (
        responseData.map_type != null ||
        responseData.uses_mapify != null ||
        responseData.uses_google_map != null ||
        responseData.mapify_tiles_endpoint != null
    ) {
        return responseData;
    }
    if (responseData.data && typeof responseData.data === "object") {
        return responseData.data;
    }
    return responseData;
};

const getConfiguredMapType = (info) =>
    String(info?.maps_api || info?.map_type || "").trim().toLowerCase();

const getGoogleKey = (info) => {
    const key = info?.google_api_keys ? String(info.google_api_keys).trim() : "";
    return key || null;
};

const shouldUseGoogleMaps = (info) => {
    const googleKey = getGoogleKey(info);
    if (!googleKey) return false;
    if (info?.uses_google_map === true) return true;
    if (info?.uses_mapify === true) return false;
    return true;
};

const shouldUseMapify = (info) => {
    if (info?.uses_mapify !== true) return false;
    if (info?.uses_google_map === true && getGoogleKey(info)) return false;
    return true;
};

const shouldUseBarikoi = (info) => {
    if (info?.uses_mapify === true || info?.uses_google_map === true) return false;
    const mapType = getConfiguredMapType(info);
    if (mapType === MAP_PROVIDER_BARIKOI) return true;
    if (mapType === MAP_PROVIDER_DEFAULT) return false;
    const country = String(info?.country_of_use || "").trim().toUpperCase();
    return country === "BD";
};

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

const fetchMapInformation = async () => {
    try {
        return await ApiService.fetchData({
            url: GET_MAP_INFORMATION,
            method: METHOD_GET,
        });
    } catch (error) {
        if (error?.response?.status === MAP_STATUS_NO_PROVIDER) {
            throw error;
        }
        return ApiService.fetchData({
            url: GET_THIRD_PARTY_INFORMATION,
            method: METHOD_GET,
        });
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

export async function fetchMapConfiguration() {
    try {
        const res = await fetchMapInformation();
        const info = extractMapInfo(res?.data);

        if (!isSuccess(res?.data) && !info?.map_type && info?.uses_mapify == null && info?.uses_google_map == null) {
            const error = new Error(res?.data?.message || "Map configuration unavailable");
            error.response = { status: res?.status, data: res?.data };
            throw error;
        }

        if (shouldUseGoogleMaps(info)) {
            configureMapifyEndpoints(null);
            const config = {
                ok: true,
                provider: MAP_PROVIDER_GOOGLE,
                googleKey: getGoogleKey(info),
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
            setCachedMapConfiguration(config);
            return config;
        }

        if (shouldUseMapify(info)) {
            const tilesEndpoint = info?.mapify_tiles_endpoint || null;
            const searchEndpoint = info?.mapify_search_endpoint || null;
            const geocodingEndpoint = info?.mapify_geocoding_endpoint || null;
            const reverseGeocodingEndpoint =
                info?.mapify_reverse_geocoding_endpoint || GET_MAPIFY_REVERSE_GEOCODING;

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

            const config = {
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
            setCachedMapConfiguration(config);
            return config;
        }

        if (shouldUseBarikoi(info)) {
            configureMapifyEndpoints(null);
            const barikoiKey = info?.barikoi_api_key
                ? String(info.barikoi_api_key).trim()
                : null;
            const barikoiStyle = barikoiKey ? buildBarikoiRasterStyle(barikoiKey) : null;

            const config = {
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
            setCachedMapConfiguration(config);
            return config;
        }

        const error = new Error("No map provider is configured. Add a Google Maps API key or configure Mapify on the server.");
        error.response = {
            status: MAP_STATUS_NO_PROVIDER,
            data: { message: error.message },
        };
        throw error;
    } catch (error) {
        configureMapifyEndpoints(null);
        const config = emptyMapConfig({
            status: error?.response?.status,
            message: getMapErrorMessage(error),
            error,
        });
        setCachedMapConfiguration(config);
        return config;
    }
}
