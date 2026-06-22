import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../store";
import { getTenantId, getTenantData } from "../utils/functions/tokenEncryption";
import {
    fetchMapConfiguration,
    MAP_PROVIDER_BARIKOI,
    MAP_PROVIDER_DEFAULT,
    MAP_PROVIDER_GOOGLE,
    buildBarikoiRasterStyle,
} from "../services/mapConfigurationService";
import {
    ensureMapConfigurationLoaded,
    invalidateMapConfigurationCache,
} from "../services/mapConfigCache";
import {
    apiGetMapSearchPreferences,
    apiSaveMapSearchPreferences,
    extractMapSearchPreferencesFromResponse,
    normalizeMapSearchPreferences,
} from "../services/MapSearchService";

const getInitialCountryOfUse = () => {
    const tenant = getTenantData();
    return tenant?.data?.country_of_use || tenant?.country_of_use || "IN";
};

const buildApiKeysFromConfig = (mapConfig, companyKeys) => {
    const barikoiKey = mapConfig.barikoiKey || companyKeys?.barikoi_api_key || null;

    return {
        googleKey: mapConfig.provider === MAP_PROVIDER_GOOGLE ? mapConfig.googleKey : null,
        mapifyStyle: mapConfig.provider === MAP_PROVIDER_DEFAULT ? mapConfig.mapifyStyle : null,
        barikoiStyle: mapConfig.provider === MAP_PROVIDER_BARIKOI
            ? (mapConfig.barikoiStyle || (barikoiKey ? buildBarikoiRasterStyle(barikoiKey) : null))
            : null,
        barikoiKey,
        searchApi: companyKeys?.search_api || "google",
        countryOfUse: companyKeys?.country_of_use || getInitialCountryOfUse(),
    };
};

const resolveMapSearchPreferences = (mapConfig, companyKeys) => {
    const fallbackCountry = companyKeys?.country_of_use || getInitialCountryOfUse();
    if (mapConfig?.mapSearchPreferences) {
        return mapConfig.mapSearchPreferences;
    }
    return normalizeMapSearchPreferences(
        mapConfig?.raw?.map_search_preferences,
        fallbackCountry
    );
};

export default function useMapConfiguration() {
    const signedIn = useAppSelector((state) => state.auth.session.signedIn);
    const tenantScope = signedIn ? getTenantId() : null;

    const [mapType, setMapType] = useState(null);
    const [mapError, setMapError] = useState(null);
    const [mapConfigLoading, setMapConfigLoading] = useState(Boolean(tenantScope));
    const [mapConfigRevision, setMapConfigRevision] = useState(0);
    const [apiKeys, setApiKeys] = useState({
        googleKey: null,
        mapifyStyle: null,
        barikoiStyle: null,
        barikoiKey: null,
        searchApi: "google",
        countryOfUse: getInitialCountryOfUse(),
    });
    const [mapSearchPreferences, setMapSearchPreferences] = useState({
        nearbySearch: false,
        boundaryCountry: null,
    });
    const [mapSearchPreferencesLoading, setMapSearchPreferencesLoading] = useState(Boolean(tenantScope));

    useEffect(() => {
        if (!tenantScope) {
            setMapError(null);
            setMapType(null);
            setMapConfigLoading(false);
            setMapSearchPreferencesLoading(false);
            return undefined;
        }

        let cancelled = false;
        const isRefresh = mapConfigRevision > 0;

        setMapConfigLoading(true);
        setMapSearchPreferencesLoading(true);
        if (isRefresh) {
            setMapType(null);
            setMapError(null);
            setApiKeys((prev) => ({
                ...prev,
                googleKey: null,
                mapifyStyle: null,
                barikoiStyle: null,
            }));
        }

        const loadMapConfig = async () => {
            try {
                const fallbackCountry = getInitialCountryOfUse();
                const [mapConfig, preferencesRes] = await Promise.all([
                    ensureMapConfigurationLoaded(fetchMapConfiguration, {
                        force: isRefresh,
                    }),
                    apiGetMapSearchPreferences().catch(() => null),
                ]);

                if (cancelled || !mapConfig) return;

                const companyKeys = mapConfig.companyKeys || null;
                const resolvedFallback = (
                    companyKeys?.country_of_use || fallbackCountry
                ).toUpperCase();

                if (!mapConfig.ok) {
                    setMapError(mapConfig.message || "Unable to load map configuration");
                    setMapType(null);
                    setMapSearchPreferences(
                        preferencesRes
                            ? extractMapSearchPreferencesFromResponse(
                                preferencesRes,
                                resolvedFallback
                            )
                            : resolveMapSearchPreferences(mapConfig, companyKeys)
                    );
                    return;
                }

                setMapError(null);
                setMapType(mapConfig.provider);
                setApiKeys(buildApiKeysFromConfig(mapConfig, companyKeys));
                setMapSearchPreferences(
                    preferencesRes
                        ? extractMapSearchPreferencesFromResponse(
                            preferencesRes,
                            resolvedFallback
                        )
                        : resolveMapSearchPreferences(mapConfig, companyKeys)
                );
            } catch (err) {
                if (cancelled) return;
                console.error("Fetch map configuration error:", err);
                setMapError(err?.message || "Unable to load map configuration");
                setMapType(null);
            } finally {
                if (!cancelled) {
                    setMapConfigLoading(false);
                    setMapSearchPreferencesLoading(false);
                }
            }
        };

        loadMapConfig();

        return () => {
            cancelled = true;
        };
    }, [tenantScope, mapConfigRevision]);

    useEffect(() => {
        if (!tenantScope) return undefined;

        const handleVisibility = () => {
            if (document.visibilityState !== "visible") return;
            invalidateMapConfigurationCache();
            setMapConfigRevision((revision) => revision + 1);
        };

        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [tenantScope]);

    const saveMapSearchPreferences = useCallback(async (nextNearbySearch, nextBoundaryCountry) => {
        const fallbackCountry = (
            apiKeys.countryOfUse || getInitialCountryOfUse()
        ).toUpperCase();
        const boundaryCountry = nextBoundaryCountry
            ?? (mapSearchPreferences.boundaryCountry || fallbackCountry);

        const nextPreferences = {
            nearbySearch: Boolean(nextNearbySearch),
            boundaryCountry: nextNearbySearch ? boundaryCountry : null,
        };

        setMapSearchPreferences(nextPreferences);

        try {
            const response = await apiSaveMapSearchPreferences({
                nearbySearch: nextPreferences.nearbySearch,
                boundaryCountry: nextPreferences.boundaryCountry,
            });
            const savedPreferences = extractMapSearchPreferencesFromResponse(
                response,
                fallbackCountry
            );
            setMapSearchPreferences(savedPreferences);
        } catch (error) {
            console.warn("Failed to save map search preferences:", error);
        }
    }, [apiKeys.countryOfUse, mapSearchPreferences.boundaryCountry]);

    const handleBoundaryCountryChange = useCallback((nextCountry) => {
        const normalizedCountry = String(nextCountry ?? "").trim().toUpperCase();
        if (!normalizedCountry) return;
        saveMapSearchPreferences(true, normalizedCountry);
    }, [saveMapSearchPreferences]);

    return {
        mapType,
        mapError,
        mapConfigLoading,
        apiKeys,
        tenantScope,
        mapSearchPreferences,
        mapSearchPreferencesLoading,
        saveMapSearchPreferences,
        handleBoundaryCountryChange,
    };
}
