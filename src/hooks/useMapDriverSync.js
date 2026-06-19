import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGetDriverManagement } from "../services/DriverManagementService";
import {
    buildOnJobDriverFromPayload,
    formatWaitingDriverFromSocket,
    getActiveDriverIds,
    getDriverKey,
    getOfflineDriverIdFromPayload,
    isDriverOnlineFromApi,
    isWaitingListDriver,
    loadDriverDataFromStorage,
    mergeWaitingDriversByPlot,
    removeDriverFromDriverData,
    saveDriverDataToStorage,
    sortWaitingDrivers,
    upsertOnJobDriver,
    upsertWaitingDriver,
} from "../utils/functions/driverMapSync";

const resolvePlotCentroid = (plot) => {
    if (!plot) return null;

    try {
        if (plot.features) {
            const feature = typeof plot.features === "string" ? JSON.parse(plot.features) : plot.features;
            let geometry = feature.geometry;
            if (typeof geometry === "string") geometry = JSON.parse(geometry);
            let coords = geometry?.coordinates;
            if (typeof coords === "string") coords = JSON.parse(coords);
            if (Array.isArray(coords) && Array.isArray(coords[0])) {
                const points = coords[0].map((p) => ({ lat: Number(p[1]), lng: Number(p[0]) }));
                if (points.length) {
                    return {
                        lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
                        lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
                    };
                }
            }
        }

        let coords = plot.coordinates;
        if (typeof coords === "string") coords = JSON.parse(coords);
        if (Array.isArray(coords) && coords.length) {
            return {
                lat: coords.reduce((sum, c) => sum + Number(c.lat), 0) / coords.length,
                lng: coords.reduce((sum, c) => sum + Number(c.lng), 0) / coords.length,
            };
        }
    } catch {
        return null;
    }

    return null;
};

const resolveDriverPosition = (driver, plots) => {
    let lat = driver.latitude ?? driver.lat;
    let lng = driver.longitude ?? driver.lng;

    if ((lat == null || lng == null) && (driver.plot_id || driver.plot)) {
        const plot = plots.find(
            (p) => p.id == (driver.plot_id || driver.plot) || p.plot_id == (driver.plot_id || driver.plot)
        );
        const centroid = resolvePlotCentroid(plot);
        if (centroid) {
            lat = centroid.lat;
            lng = centroid.lng;
        }
    }

    return (lat != null && lng != null) ? { lat: Number(lat), lng: Number(lng) } : null;
};

const applyDriverToMapData = (prev, driver, plots, status) => {
    const driverKey = getDriverKey(driver);
    if (!driverKey) return prev;

    const position = resolveDriverPosition(driver, plots);
    const updated = {
        ...prev,
        [driverKey]: {
            ...prev[driverKey],
            ...driver,
            ...(position ? { position, latitude: position.lat, longitude: position.lng, lat: position.lat, lng: position.lng } : {}),
            status,
            driving_status: status,
            online_status: "online",
        },
    };
    saveDriverDataToStorage(updated);
    return updated;
};

export function useMapDriverSync({ socket, plotsData = [] }) {
    const [driverData, setDriverData] = useState(loadDriverDataFromStorage);
    const [waitingDrivers, setWaitingDrivers] = useState([]);
    const [onJobDrivers, setOnJobDrivers] = useState([]);

    const waitingDriversRef = useRef(waitingDrivers);
    const onJobDriversRef = useRef(onJobDrivers);
    const plotsDataRef = useRef(plotsData);

    useEffect(() => { waitingDriversRef.current = waitingDrivers; }, [waitingDrivers]);
    useEffect(() => { onJobDriversRef.current = onJobDrivers; }, [onJobDrivers]);
    useEffect(() => { plotsDataRef.current = plotsData; }, [plotsData]);

    const activeDriverIds = useMemo(
        () => getActiveDriverIds(waitingDrivers, onJobDrivers),
        [waitingDrivers, onJobDrivers]
    );

    const pruneDriverDataForActiveDrivers = useCallback((waitingList, onJobList) => {
        const waitingIds = new Set(waitingList.map((d) => getDriverKey(d)).filter(Boolean));
        const onJobIds = new Set(onJobList.map((d) => getDriverKey(d)).filter(Boolean));

        setDriverData((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((id) => {
                if (!waitingIds.has(id) && !onJobIds.has(id)) delete updated[id];
            });
            saveDriverDataToStorage(updated);
            return updated;
        });
    }, []);

    const syncWaitingListAndMap = useCallback((nextList, updatePositions = true) => {
        const sorted = sortWaitingDrivers(nextList);
        setWaitingDrivers(sorted);

        const onJobIds = new Set(
            (onJobDriversRef.current || []).map((d) => getDriverKey(d)).filter(Boolean)
        );

        setDriverData((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((id) => {
                if (!sorted.some((d) => getDriverKey(d) === id) && !onJobIds.has(id)) {
                    delete updated[id];
                }
            });

            if (updatePositions) {
                sorted.forEach((driver) => {
                    const driverKey = getDriverKey(driver);
                    if (!driverKey) return;
                    updated[driverKey] = applyDriverToMapData(
                        { [driverKey]: updated[driverKey] },
                        driver,
                        plotsDataRef.current,
                        "idle"
                    )[driverKey];
                });
            }

            saveDriverDataToStorage(updated);
            return updated;
        });
    }, []);

    const removeDriverFromActiveMap = useCallback((driverId) => {
        const driverKey = String(driverId);
        if (!driverKey) return;

        setWaitingDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
        setOnJobDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
        setDriverData((prev) => removeDriverFromDriverData(prev, driverKey));
    }, []);

    const promoteDriverToOnJob = useCallback((rawDriver) => {
        let driver = buildOnJobDriverFromPayload(rawDriver);
        if (!driver) return;

        const driverKey = getDriverKey(driver);
        const waitingMatch = (waitingDriversRef.current || []).find(
            (d) => getDriverKey(d) === driverKey
        );

        if (waitingMatch) {
            driver = {
                ...waitingMatch,
                ...driver,
                driving_status: "busy",
                status: "busy",
                updatedAt: Date.now(),
            };
        }

        setWaitingDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
        setOnJobDrivers((prev) => upsertOnJobDriver(prev, driver));
        setDriverData((prev) => applyDriverToMapData(prev, driver, plotsDataRef.current, "busy"));
    }, []);

    const syncWaitingDriversFromApi = useCallback(async () => {
        try {
            const response = await apiGetDriverManagement({ page: 1, perPage: 500 });
            if (response?.data?.success !== 1) return;

            const driversList = (response.data.list?.data || []).filter(isDriverOnlineFromApi);
            const idle = [];
            const busy = [];

            driversList.forEach((driver) => {
                const formatted = {
                    ...driver,
                    id: driver.id || driver.driver_id,
                    name: driver.name || driver.driver_name || driver.driverName,
                    plot_id: driver.plot_id ?? driver.assigned_plot_id ?? driver.default_plot_id,
                    plot: driver.plot_name || driver.plot || "N/A",
                    rank: driver.rank || driver.ranking || 1,
                    updatedAt: Date.now(),
                };

                const position = resolveDriverPosition(formatted, plotsDataRef.current);
                const withPosition = position
                    ? { ...formatted, position, latitude: position.lat, longitude: position.lng, lat: position.lat, lng: position.lng }
                    : formatted;

                if ((driver.driving_status || "").toLowerCase() === "busy") {
                    busy.push(withPosition);
                } else if (isWaitingListDriver(driver)) {
                    idle.push(withPosition);
                }
            });

            const rankedIdle = sortWaitingDrivers(idle);
            setWaitingDrivers(rankedIdle);

            const idleIds = new Set(rankedIdle.map((d) => getDriverKey(d)).filter(Boolean));
            setOnJobDrivers((prev) => {
                const merged = busy.length
                    ? [...busy, ...prev.filter((d) => !idleIds.has(getDriverKey(d)))]
                    : prev.filter((d) => !idleIds.has(getDriverKey(d)));
                const deduped = [];
                const seen = new Set();
                merged.forEach((driver) => {
                    const key = getDriverKey(driver);
                    if (!key || seen.has(key)) return;
                    seen.add(key);
                    deduped.push(driver);
                });
                return deduped;
            });

            pruneDriverDataForActiveDrivers(rankedIdle, busy);
            setDriverData((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach((id) => {
                    const isIdle = rankedIdle.some((d) => getDriverKey(d) === id);
                    const isBusy = busy.some((d) => getDriverKey(d) === id);
                    if (!isIdle && !isBusy) delete updated[id];
                });

                [...rankedIdle, ...busy].forEach((driver) => {
                    const driverKey = getDriverKey(driver);
                    if (!driverKey) return;
                    const status = (driver.driving_status || "").toLowerCase() === "busy" ? "busy" : "idle";
                    updated[driverKey] = applyDriverToMapData(
                        { [driverKey]: updated[driverKey] },
                        driver,
                        plotsDataRef.current,
                        status
                    )[driverKey];
                });

                saveDriverDataToStorage(updated);
                return updated;
            });
        } catch (err) {
            console.error("Sync map drivers error:", err);
        }
    }, [pruneDriverDataForActiveDrivers]);

    useEffect(() => {
        syncWaitingDriversFromApi();
    }, [syncWaitingDriversFromApi]);

    useEffect(() => {
        const interval = setInterval(() => {
            syncWaitingDriversFromApi();
        }, 120000);
        return () => clearInterval(interval);
    }, [syncWaitingDriversFromApi]);

    useEffect(() => {
        if (!socket) return;

        const handleMyRankUpdate = (rawData) => {
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }

            const driversList = data?.drivers;
            if (!Array.isArray(driversList)) return;

            const plotId = data?.plot_id;
            const offlineDriverId = getOfflineDriverIdFromPayload(data);

            if (driversList.length === 0) {
                if (offlineDriverId) {
                    removeDriverFromActiveMap(offlineDriverId);
                    return;
                }
                if (plotId != null) {
                    syncWaitingListAndMap(mergeWaitingDriversByPlot(waitingDriversRef.current, plotId, []), false);
                    return;
                }
                syncWaitingListAndMap([], false);
                return;
            }

            const onJobIds = new Set(
                (onJobDriversRef.current || []).map((d) => getDriverKey(d)).filter(Boolean)
            );

            const formattedDrivers = driversList
                .map(formatWaitingDriverFromSocket)
                .filter(isWaitingListDriver)
                .filter((d) => !onJobIds.has(getDriverKey(d)));

            syncWaitingListAndMap(formattedDrivers);
        };

        const handleWaitingDriverOnline = (rawData) => {
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }

            if (!isWaitingListDriver(data)) return;

            const formatted = formatWaitingDriverFromSocket(data);
            const driverKey = getDriverKey(formatted);
            const isOnJob = (onJobDriversRef.current || []).some(
                (d) => getDriverKey(d) === driverKey
            );
            if (isOnJob) return;

            const next = upsertWaitingDriver(waitingDriversRef.current, formatted);
            syncWaitingListAndMap(next, true);
        };

        const handleOnJobDriver = (rawData) => {
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }

            if (Array.isArray(data)) {
                setOnJobDrivers(data);
                pruneDriverDataForActiveDrivers(waitingDriversRef.current, data);
                return;
            }

            const driver = buildOnJobDriverFromPayload(data);
            if (driver) promoteDriverToOnJob(driver);
        };

        const handleJobAccepted = (rawData) => {
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }

            const driver = buildOnJobDriverFromPayload(data);
            if (driver) promoteDriverToOnJob(driver);
        };

        const handleJobCancelled = (rawData) => {
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }

            const driverId =
                data?.driver_id
                ?? data?.driverId
                ?? data?.id
                ?? data?.driver?.id;

            if (driverId) {
                setOnJobDrivers((prev) => prev.filter((d) => getDriverKey(d) !== String(driverId)));
            }

            syncWaitingDriversFromApi();
        };

        const handleDriverLocationUpdate = (rawData) => {
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }
            if (Array.isArray(data)) data = data[0];
            if (!data) return;

            const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
            if (!driverId) return;
            const driverKey = String(driverId);

            if ((data.online_status || "").toLowerCase() === "offline") {
                removeDriverFromActiveMap(driverKey);
                return;
            }

            const drivingStatus = (data.driving_status || data.status || "").toLowerCase();
            if (drivingStatus === "busy" || drivingStatus === "active") {
                promoteDriverToOnJob(data);
                return;
            }

            if (drivingStatus === "idle") {
                setOnJobDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
            }

            const activeIds = getActiveDriverIds(
                waitingDriversRef.current,
                onJobDriversRef.current.filter((d) => getDriverKey(d) !== driverKey)
            );
            if (!activeIds.has(driverKey)) return;

            setDriverData((prev) => applyDriverToMapData(prev, data, plotsDataRef.current, drivingStatus || "idle"));
        };

        const handleDriverOffline = (rawData) => {
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }

            const driverId = getOfflineDriverIdFromPayload(data);
            if (driverId) removeDriverFromActiveMap(driverId);
        };

        socket.on("my-rank-update", handleMyRankUpdate);
        socket.on("waiting-driver-event", handleWaitingDriverOnline);
        socket.on("on-job-driver-event", handleOnJobDriver);
        socket.on("job-accepted-by-driver", handleJobAccepted);
        socket.on("job-cancelled-by-driver", handleJobCancelled);
        socket.on("driver-location-update", handleDriverLocationUpdate);
        socket.on("driver-offline-event", handleDriverOffline);
        socket.on("driver-offline", handleDriverOffline);

        return () => {
            socket.off("my-rank-update", handleMyRankUpdate);
            socket.off("waiting-driver-event", handleWaitingDriverOnline);
            socket.off("on-job-driver-event", handleOnJobDriver);
            socket.off("job-accepted-by-driver", handleJobAccepted);
            socket.off("job-cancelled-by-driver", handleJobCancelled);
            socket.off("driver-location-update", handleDriverLocationUpdate);
            socket.off("driver-offline-event", handleDriverOffline);
            socket.off("driver-offline", handleDriverOffline);
        };
    }, [
        socket,
        promoteDriverToOnJob,
        removeDriverFromActiveMap,
        syncWaitingDriversFromApi,
        syncWaitingListAndMap,
        pruneDriverDataForActiveDrivers,
    ]);

    return {
        driverData,
        setDriverData,
        waitingDrivers,
        onJobDrivers,
        activeDriverIds,
        removeDriverFromActiveMap,
        syncWaitingDriversFromApi,
    };
}
