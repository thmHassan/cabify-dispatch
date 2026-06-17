import { METHOD_GET } from "../constants/method.constant";
import { GET_MAPIFY_GEOCODING, GET_MAPIFY_SEARCH } from "../constants/api.route.constant";
import ApiService from "./ApiService";

const normalizeBoundaryCountry = (code) => {
    const normalized = code?.trim().toUpperCase();
    return normalized || undefined;
};

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

export async function apiMapifyGeocoding({ query, lat, lon, boundaryCountry, signal }) {
    const params = {
        q: query,
        lat,
        lon,
    };
    const country = normalizeBoundaryCountry(boundaryCountry);
    if (country) params.boundary_country = country;

    return ApiService.fetchData({
        url: GET_MAPIFY_GEOCODING,
        method: METHOD_GET,
        params,
        signal,
        headers: {
            Accept: "application/json",
        },
    });
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

export async function fetchMapifyLocationSuggestions({
    query,
    lat,
    lon,
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
            signal,
        });
        const searchItems = normalizeMapifyFeatures(searchRes?.data);
        if (searchItems.length > 0) {
            return mapifyFeaturesToSuggestions(searchItems);
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
        boundaryCountry,
        signal,
    });
    return mapifyFeaturesToSuggestions(normalizeMapifyFeatures(geoRes?.data));
}

export const normalizeMapifyFeatures = (payload) => {
    const root = payload?.data ?? payload;
    const features = Array.isArray(root?.features)
        ? root.features
        : Array.isArray(root?.results)
            ? root.results
            : Array.isArray(root)
                ? root
                : [];

    return features
        .map((feature) => {
            const coords = feature?.geometry?.coordinates;
            if (!Array.isArray(coords) || coords.length < 2) return null;

            const lon = Number(coords[0]);
            const lat = Number(coords[1]);
            if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

            const props = feature?.properties || {};
            return {
                id: feature?.id ?? `${lat}-${lon}-${props.name || "location"}`,
                lat,
                lon,
                name: props.name || props.label || "Unknown location",
                label: props.label || props.address || "",
                layer: props.layer || "",
                country: props.country || "",
                distance: props.distance,
                raw: feature,
            };
        })
        .filter(Boolean);
};
