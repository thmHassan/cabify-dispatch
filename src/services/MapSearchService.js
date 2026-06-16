import { METHOD_GET } from "../constants/method.constant";
import { GET_MAPIFY_SEARCH } from "../constants/api.route.constant";
import ApiService from "./ApiService";

export async function apiMapifySearch({ query, lat, lon, size = 8, signal }) {
    return ApiService.fetchData({
        url: GET_MAPIFY_SEARCH,
        method: METHOD_GET,
        params: {
            q: query,
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

export const normalizeMapifyFeatures = (payload) => {
    const data = payload?.data ?? payload;
    const features = Array.isArray(data?.features) ? data.features : [];

    return features
        .map((feature) => {
            const coords = feature?.geometry?.coordinates;
            if (!Array.isArray(coords) || coords.length < 2) return null;

            const lon = Number(coords[0]);
            const lat = Number(coords[1]);
            if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

            return {
                id: feature?.id ?? `${lat}-${lon}-${feature?.properties?.name || "location"}`,
                lat,
                lon,
                name: feature?.properties?.name || "Unknown location",
                label: feature?.properties?.label || "",
                layer: feature?.properties?.layer || "",
                country: feature?.properties?.country || "",
                distance: feature?.properties?.distance,
                raw: feature,
            };
        })
        .filter(Boolean);
};
