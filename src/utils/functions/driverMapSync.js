import { getTenantScopedStorageKey } from "./tokenEncryption";

export const DRIVER_DATA_STORAGE_BASE = "driverData_persistent";

export const getDriverDataStorageKey = () =>
    getTenantScopedStorageKey(DRIVER_DATA_STORAGE_BASE);

export const getDriverKey = (driver) =>
    String(driver?.id || driver?.driver_id || driver?.dispatcher_id || driver?.client_id || "");

export const getOfflineDriverIdFromPayload = (data) =>
    data?.driver_id
    ?? data?.driverId
    ?? data?.id
    ?? data?.client_id
    ?? data?.dispatcher_id
    ?? data?.driver?.driver_id
    ?? data?.driver?.id
    ?? null;

export const isDriverOnlineFromApi = (driver) =>
    (driver?.online_status || "").toLowerCase() === "online";

export const isWaitingListDriver = (driver) => {
    const drivingStatus = (driver?.driving_status || "idle").toLowerCase();
    const status = (driver?.status || "").toLowerCase();
    return drivingStatus !== "busy" && status !== "busy" && status !== "active";
};

export const formatWaitingDriverFromSocket = (driver) => ({
    ...driver,
    id: driver.driver_id || driver.id,
    name: driver.driver_name || driver.name || driver.driverName,
    plot_id: driver.plot_id ?? driver.plot,
    plot: driver.plot_name || driver.plot || "N/A",
    rank: driver.rank || driver.ranking || 1,
    online_status: "online",
    updatedAt: Date.now(),
    is_reconnecting: driver.is_reconnecting === true,
    display_name: driver.is_reconnecting === true
        ? `Reconnecting... ${driver.driver_name || driver.name || driver.driverName || "Driver"} - Rank ${driver.rank || 1}`
        : (driver.display_name || driver.driver_name || driver.name || driver.driverName || "Driver"),
});

export const sortWaitingDrivers = (drivers) =>
    [...drivers].sort((a, b) => {
        const plotA = String(a?.plot_id ?? "");
        const plotB = String(b?.plot_id ?? "");
        if (plotA !== plotB) return plotA.localeCompare(plotB, undefined, { numeric: true });
        return (a.rank || a.ranking || 0) - (b.rank || b.ranking || 0);
    });

export const mergeWaitingDriversByPlot = (prev, plotId, incomingDrivers) => {
    if (plotId == null || plotId === "") {
        return sortWaitingDrivers(incomingDrivers);
    }
    const plotKey = String(plotId);
    const others = prev.filter((d) => String(d?.plot_id ?? "") !== plotKey);
    return sortWaitingDrivers([...others, ...incomingDrivers]);
};

export const upsertWaitingDriver = (prev, driver) => {
    const key = getDriverKey(driver);
    if (!key) return prev;
    const exists = prev.some((d) => getDriverKey(d) === key);
    const next = exists
        ? prev.map((d) => (getDriverKey(d) === key ? { ...d, ...driver, updatedAt: Date.now() } : d))
        : [...prev, driver];
    return sortWaitingDrivers(next);
};

export const upsertOnJobDriver = (prev, driver) => {
    const key = getDriverKey(driver);
    if (!key) return prev;
    const exists = prev.some((d) => getDriverKey(d) === key);
    if (exists) {
        return prev.map((d) => (getDriverKey(d) === key ? { ...d, ...driver, updatedAt: Date.now() } : d));
    }
    return [driver, ...prev];
};

export const buildOnJobDriverFromPayload = (data) => {
    if (!data) return null;

    const driverId =
        data.driver_id
        ?? data.driverId
        ?? data.dispatcher_id
        ?? data.driver?.id
        ?? data.driver?.driver_id
        ?? data.id;

    if (!driverId) return null;

    const name =
        data.driver_name
        ?? data.driverName
        ?? data.name
        ?? data.driver?.name
        ?? `Driver ${driverId}`;

    return {
        ...data,
        id: driverId,
        driver_id: driverId,
        name,
        driver_name: name,
        driving_status: "busy",
        status: "busy",
        updatedAt: Date.now(),
    };
};

export const loadDriverDataFromStorage = () => {
    try {
        const raw = localStorage.getItem(getDriverDataStorageKey());
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

export const saveDriverDataToStorage = (driverData) => {
    try {
        localStorage.setItem(getDriverDataStorageKey(), JSON.stringify(driverData));
    } catch {
        // ignore storage errors
    }
};

export const removeDriverFromDriverData = (prev, driverKey) => {
    if (!prev[driverKey]) return prev;
    const updated = { ...prev };
    delete updated[driverKey];
    saveDriverDataToStorage(updated);
    return updated;
};

export const getActiveDriverIds = (waitingDrivers, onJobDrivers) => {
    const ids = new Set();
    waitingDrivers.forEach((driver) => {
        const key = getDriverKey(driver);
        if (key) ids.add(key);
    });
    onJobDrivers.forEach((driver) => {
        const key = getDriverKey(driver);
        if (key) ids.add(key);
    });
    return ids;
};

export const removeDriverMarker = (markersRef, driverKey, { isGoogle = false } = {}) => {
    const marker = markersRef.current?.[driverKey];
    if (!marker) return;

    try {
        if (isGoogle) {
            marker.setMap(null);
        } else {
            marker.remove();
        }
    } catch {
        // marker may already be detached
    }

    delete markersRef.current[driverKey];
};

export const pruneDriverMarkers = (markersRef, activeIds, { isGoogle = false } = {}) => {
    Object.keys(markersRef.current || {}).forEach((id) => {
        if (!activeIds.has(String(id))) {
            removeDriverMarker(markersRef, id, { isGoogle });
        }
    });
};
