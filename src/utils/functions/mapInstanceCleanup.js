export const destroySharedMapInstance = (mapInstance, markers, mapRef, { isGoogle = false } = {}) => {
    if (markers?.current) {
        Object.values(markers.current).forEach((marker) => {
            try {
                if (isGoogle) {
                    marker.setMap?.(null);
                } else {
                    marker.remove?.();
                }
            } catch {
                // ignore marker cleanup errors
            }
        });
        markers.current = {};
    }

    const instance = mapInstance?.current;
    if (instance) {
        try {
            if (typeof instance.remove === "function") {
                instance.remove();
            }
        } catch {
            // ignore map teardown errors
        }
        mapInstance.current = null;
    }

    if (mapRef?.current) {
        mapRef.current.innerHTML = "";
    }
};
