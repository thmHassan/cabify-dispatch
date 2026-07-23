import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useAppSelector } from "../store";
import { getTenantId, getTenantData } from "../utils/functions/tokenEncryption";
import {
    fetchMapConfiguration,
    buildConfigFromInfo,
    MAP_PROVIDER_BARIKOI,
    MAP_PROVIDER_DEFAULT,
    MAP_PROVIDER_GOOGLE,
    buildBarikoiRasterStyle,
} from "../services/mapConfigurationService";
import {
    ensureMapConfigurationLoaded,
    invalidateMapConfigurationCache,
    resetMapConfigurationCache,
    setCachedMapConfiguration,
} from "../services/mapConfigCache";
import {
    apiGetMapSearchPreferences,
    apiSaveMapSearchPreferences,
    extractMapSearchPreferencesFromResponse,
    normalizeMapSearchPreferences,
    toBoundaryCountryCode,
} from "../services/MapSearchService";
import { useLastCompanySettingsChange } from "../components/routes/SocketProvider";

const MapConfigurationContext = createContext(null);

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

const applyMapConfig = ({
    mapConfig,
    preferencesRes,
    fallbackCountry,
    currentMapType,
    setMapType,
    setApiKeys,
    setMapError,
    setMapSearchPreferences,
}) => {
    const companyKeys = mapConfig.companyKeys || null;
    const resolvedFallback = (
        companyKeys?.country_of_use || fallbackCountry
    ).toUpperCase();

    if (!mapConfig.ok) {
        if (currentMapType == null) {
            setMapError(mapConfig.message || "Unable to load map configuration");
            setMapType(null);
        }
        setMapSearchPreferences(
            preferencesRes
                ? extractMapSearchPreferencesFromResponse(preferencesRes, resolvedFallback)
                : resolveMapSearchPreferences(mapConfig, companyKeys)
        );
        return;
    }

    setMapError(null);
    const nextType = mapConfig.provider;
    if (currentMapType == null || currentMapType !== nextType) {
        setMapType(nextType);
        setApiKeys(buildApiKeysFromConfig(mapConfig, companyKeys));
    }
    setMapSearchPreferences(
        preferencesRes
            ? extractMapSearchPreferencesFromResponse(preferencesRes, resolvedFallback)
            : resolveMapSearchPreferences(mapConfig, companyKeys)
    );
    setCachedMapConfiguration(mapConfig);
};

export function MapConfigurationProvider({ children }) {
    const signedIn = useAppSelector((state) => state.auth.session.signedIn);
    const tenantScope = signedIn ? getTenantId() : null;
    const lastCompanySettingsChange = useLastCompanySettingsChange();

    const [mapType, setMapType] = useState(null);
    const [mapError, setMapError] = useState(null);
    const [mapConfigLoading, setMapConfigLoading] = useState(Boolean(tenantScope));
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
    const mapTypeRef = useRef(mapType);
    mapTypeRef.current = mapType;

    useEffect(() => {
        if (!tenantScope) {
            setMapError(null);
            setMapType(null);
            setMapConfigLoading(false);
            setMapSearchPreferencesLoading(false);
            resetMapConfigurationCache();
            return undefined;
        }

        let cancelled = false;
        const hasExistingMap = mapTypeRef.current != null;

        if (!hasExistingMap) {
            setMapConfigLoading(true);
            setMapSearchPreferencesLoading(true);
        }

        const loadMapConfig = async () => {
            try {
                const fallbackCountry = getInitialCountryOfUse();
                const [mapConfig, preferencesRes] = await Promise.all([
                    ensureMapConfigurationLoaded(fetchMapConfiguration),
                    apiGetMapSearchPreferences().catch(() => null),
                ]);

                if (cancelled || !mapConfig) return;

                applyMapConfig({
                    mapConfig,
                    preferencesRes,
                    fallbackCountry,
                    currentMapType: mapTypeRef.current,
                    setMapType,
                    setApiKeys,
                    setMapError,
                    setMapSearchPreferences,
                });
            } catch (err) {
                if (cancelled) return;
                console.error("Fetch map configuration error:", err);
                if (mapTypeRef.current == null) {
                    setMapError(err?.message || "Unable to load map configuration");
                    setMapType(null);
                }
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
    }, [tenantScope]);

    useEffect(() => {
        if (!tenantScope || lastCompanySettingsChange?.section !== "integrations") return;

        try {
            const mapConfig = buildConfigFromInfo(lastCompanySettingsChange?.data || {});
            applyMapConfig({
                mapConfig,
                preferencesRes: null,
                fallbackCountry: getInitialCountryOfUse(),
                currentMapType: mapTypeRef.current,
                setMapType,
                setApiKeys,
                setMapError,
                setMapSearchPreferences,
            });
        } catch (error) {
            setMapError(error?.message || "Unable to apply updated map configuration");
        }
    }, [lastCompanySettingsChange, tenantScope]);

    useEffect(() => {
        if (!tenantScope) return undefined;

        const handleVisibility = async () => {
            if (document.visibilityState !== "visible") return;

            try {
                invalidateMapConfigurationCache();
                const fallbackCountry = getInitialCountryOfUse();
                const [mapConfig, preferencesRes] = await Promise.all([
                    fetchMapConfiguration(),
                    apiGetMapSearchPreferences().catch(() => null),
                ]);

                if (!mapConfig) return;

                const nextType = mapConfig.ok ? mapConfig.provider : null;
                const currentType = mapTypeRef.current;

                if (currentType != null && nextType === currentType) {
                    setCachedMapConfiguration(mapConfig);
                    if (preferencesRes) {
                        const resolvedFallback = (
                            mapConfig.companyKeys?.country_of_use || fallbackCountry
                        ).toUpperCase();
                        setMapSearchPreferences(
                            extractMapSearchPreferencesFromResponse(preferencesRes, resolvedFallback)
                        );
                    }
                    return;
                }

                applyMapConfig({
                    mapConfig,
                    preferencesRes,
                    fallbackCountry,
                    currentMapType: currentType,
                    setMapType,
                    setApiKeys,
                    setMapError,
                    setMapSearchPreferences,
                });
            } catch (error) {
                console.warn("Background map configuration refresh failed:", error?.message || error);
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [tenantScope]);

    const saveMapSearchPreferences = useCallback(async (nextNearbySearch, nextBoundaryCountry) => {
        const fallbackCountry = (
            apiKeys.countryOfUse || getInitialCountryOfUse()
        ).toUpperCase();

        const nearbySearch = Boolean(nextNearbySearch);
        const boundaryCountry = nearbySearch
            ? null
            : (
                nextBoundaryCountry !== undefined
                    ? toBoundaryCountryCode(nextBoundaryCountry)
                    : (mapSearchPreferences.boundaryCountry || null)
            );

        const nextPreferences = {
            nearbySearch,
            boundaryCountry,
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
            return savedPreferences;
        } catch (error) {
            console.warn("Failed to save map search preferences:", error);
            return nextPreferences;
        }
    }, [apiKeys.countryOfUse, mapSearchPreferences.boundaryCountry]);

    const applyMapSearchPreferences = useCallback((nextNearbySearch, nextBoundaryCountry) => {
        const nearbySearch = Boolean(nextNearbySearch);
        const boundaryCountry = nearbySearch
            ? null
            : toBoundaryCountryCode(nextBoundaryCountry);

        setMapSearchPreferences({
            nearbySearch,
            boundaryCountry,
        });

        return { nearbySearch, boundaryCountry };
    }, []);

    const handleBoundaryCountryChange = useCallback((nextCountry) => {
        const normalizedCountry = String(nextCountry ?? "").trim().toUpperCase();
        saveMapSearchPreferences(false, normalizedCountry || null);
    }, [saveMapSearchPreferences]);

    const value = useMemo(() => ({
        mapType,
        mapError,
        mapConfigLoading,
        apiKeys,
        tenantScope,
        mapSearchPreferences,
        mapSearchPreferencesLoading,
        saveMapSearchPreferences,
        applyMapSearchPreferences,
        handleBoundaryCountryChange,
    }), [
        mapType,
        mapError,
        mapConfigLoading,
        apiKeys,
        tenantScope,
        mapSearchPreferences,
        mapSearchPreferencesLoading,
        saveMapSearchPreferences,
        applyMapSearchPreferences,
        handleBoundaryCountryChange,
    ]);

    return (
        <MapConfigurationContext.Provider value={value}>
            {children}
        </MapConfigurationContext.Provider>
    );
}

export default function useMapConfiguration() {
    const context = useContext(MapConfigurationContext);
    if (!context) {
        throw new Error("useMapConfiguration must be used within MapConfigurationProvider");
    }
    return context;
}
