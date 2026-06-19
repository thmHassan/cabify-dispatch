import { useEffect } from "react";
import { fetchMapConfiguration } from "../../services/mapConfigurationService";
import { ensureMapConfigurationLoaded } from "../../services/mapConfigCache";

export default function MapConfigurationBootstrap() {
    useEffect(() => {
        ensureMapConfigurationLoaded(fetchMapConfiguration).catch((error) => {
            console.warn("Failed to preload map configuration:", error?.message || error);
        });
    }, []);

    return null;
}
