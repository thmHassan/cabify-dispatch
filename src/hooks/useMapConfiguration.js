import { useEffect, useState } from "react";
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

    useEffect(() => {
        if (!tenantScope) {
            setMapError(null);
            setMapType(null);
            setMapConfigLoading(false);
            return undefined;
        }

        let cancelled = false;
        const isRefresh = mapConfigRevision > 0;

        setMapConfigLoading(true);
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
                const mapConfig = await ensureMapConfigurationLoaded(fetchMapConfiguration, {
                    force: isRefresh,
                });

                if (cancelled || !mapConfig) return;

                const companyKeys = mapConfig.companyKeys || null;

                if (!mapConfig.ok) {
                    setMapError(mapConfig.message || "Unable to load map configuration");
                    setMapType(null);
                    return;
                }

                setMapError(null);
                setMapType(mapConfig.provider);
                setApiKeys(buildApiKeysFromConfig(mapConfig, companyKeys));
            } catch (err) {
                if (cancelled) return;
                console.error("Fetch map configuration error:", err);
                setMapError(err?.message || "Unable to load map configuration");
                setMapType(null);
            } finally {
                if (!cancelled) {
                    setMapConfigLoading(false);
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

    return {
        mapType,
        mapError,
        mapConfigLoading,
        apiKeys,
        tenantScope,
    };
}
