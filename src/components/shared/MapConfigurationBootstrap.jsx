import { useEffect } from "react";
import { useAppSelector } from "../../store";
import { fetchMapConfiguration } from "../../services/mapConfigurationService";
import {
    ensureMapConfigurationLoaded,
    resetMapConfigurationCache,
} from "../../services/mapConfigCache";
import { getTenantId } from "../../utils/functions/tokenEncryption";

export default function MapConfigurationBootstrap() {
    const signedIn = useAppSelector((state) => state.auth.session.signedIn);
    const tenantId = signedIn ? getTenantId() : null;

    useEffect(() => {
        if (!signedIn || !tenantId) {
            resetMapConfigurationCache();
            return undefined;
        }

        ensureMapConfigurationLoaded(fetchMapConfiguration).catch((error) => {
            console.warn("Failed to preload map configuration:", error?.message || error);
        });

        return undefined;
    }, [signedIn, tenantId]);

    return null;
}
