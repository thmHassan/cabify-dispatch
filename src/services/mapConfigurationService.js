import { METHOD_GET } from "../constants/method.constant";
import {
    GET_MAP_INFORMATION,
    GET_MAPIFY_TILES_BRIGHT,
    GET_THIRD_PARTY_INFORMATION,
} from "../constants/api.route.constant";
import ApiService from "./ApiService";

export const MAP_PROVIDER_GOOGLE = "google";
export const MAP_PROVIDER_DEFAULT = "default";
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
    if (responseData.map_type != null || responseData.uses_mapify != null) {
        return responseData;
    }
    if (responseData.data && typeof responseData.data === "object") {
        return responseData.data;
    }
    return responseData;
};

const shouldUseGoogleMaps = (info) => {
    const mapType = String(info?.map_type || "").toLowerCase();
    const googleKey = info?.google_api_keys ? String(info.google_api_keys).trim() : "";
    return mapType === MAP_PROVIDER_GOOGLE && Boolean(googleKey);
};

const shouldUseMapify = (info) =>
    info?.uses_mapify === true ||
    String(info?.map_type || "").toLowerCase() === MAP_PROVIDER_DEFAULT;

const fetchThirdPartyOrMapInformation = async () => {
    try {
        const res = await ApiService.fetchData({
            url: GET_THIRD_PARTY_INFORMATION,
            method: METHOD_GET,
        });
        return res;
    } catch (error) {
        if (error?.response?.status === MAP_STATUS_NO_PROVIDER) {
            throw error;
        }
        return ApiService.fetchData({
            url: GET_MAP_INFORMATION,
            method: METHOD_GET,
        });
    }
};

const fetchMapifyStyle = async () => {
    const res = await ApiService.fetchData({
        url: GET_MAPIFY_TILES_BRIGHT,
        method: METHOD_GET,
    });
    const style = res?.data?.data ?? res?.data;
    if (!style || typeof style !== "object" || Array.isArray(style)) {
        throw new Error("Invalid Mapify style response");
    }
    return style;
};

export async function fetchMapConfiguration() {
    try {
        const res = await fetchThirdPartyOrMapInformation();
        const info = extractMapInfo(res?.data);

        if (!isSuccess(res?.data) && !info?.map_type) {
            const error = new Error(res?.data?.message || "Map configuration unavailable");
            error.response = { status: res?.status, data: res?.data };
            throw error;
        }

        if (shouldUseGoogleMaps(info)) {
            return {
                ok: true,
                provider: MAP_PROVIDER_GOOGLE,
                googleKey: String(info.google_api_keys).trim(),
                mapifyStyle: null,
                mapifyTilesEndpoint: null,
                raw: info,
            };
        }

        if (shouldUseMapify(info)) {
            const mapifyStyle = await fetchMapifyStyle();
            return {
                ok: true,
                provider: MAP_PROVIDER_DEFAULT,
                googleKey: null,
                mapifyStyle,
                mapifyTilesEndpoint: info?.mapify_tiles_endpoint || null,
                raw: info,
            };
        }

        const error = new Error("No map provider is configured. Add a Google Maps API key or configure Mapify on the server.");
        error.response = {
            status: MAP_STATUS_NO_PROVIDER,
            data: { message: error.message },
        };
        throw error;
    } catch (error) {
        return {
            ok: false,
            provider: null,
            googleKey: null,
            mapifyStyle: null,
            mapifyTilesEndpoint: null,
            raw: null,
            status: error?.response?.status,
            message: getMapErrorMessage(error),
            error,
        };
    }
}
