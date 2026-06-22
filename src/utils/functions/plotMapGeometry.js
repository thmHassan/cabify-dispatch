export const MAP_PLOT_LAYER_IDS = ["plots-labels", "plots-outline", "plots-fill"];

export const parsePlotCoordinates = (plot) => {
    if (!plot) return [];

    try {
        const features = typeof plot.features === "string"
            ? JSON.parse(plot.features)
            : plot.features;

        if (features) {
            let geometry = features.geometry;
            if (typeof geometry === "string") geometry = JSON.parse(geometry);

            let coordinatesData = geometry?.coordinates;
            if (typeof coordinatesData === "string") coordinatesData = JSON.parse(coordinatesData);

            const ring = Array.isArray(coordinatesData?.[0])
                ? coordinatesData[0]
                : coordinatesData;

            if (Array.isArray(ring) && ring.length) {
                return ring.map((pair) => {
                    if (Array.isArray(pair) && pair.length >= 2) {
                        const [lng, lat] = pair;
                        return { lat: Number(lat), lng: Number(lng) };
                    }
                    if (pair?.lat != null && pair?.lng != null) {
                        return { lat: Number(pair.lat), lng: Number(pair.lng) };
                    }
                    return null;
                }).filter((point) => (
                    point
                    && Number.isFinite(point.lat)
                    && Number.isFinite(point.lng)
                ));
            }
        }

        let coords = plot.coordinates;
        if (typeof coords === "string") coords = JSON.parse(coords);

        if (Array.isArray(coords) && coords.length) {
            return coords.map((pair) => {
                if (pair?.lat != null && pair?.lng != null) {
                    return { lat: Number(pair.lat), lng: Number(pair.lng) };
                }
                if (!Array.isArray(pair) || pair.length < 2) return null;

                const [first, second] = pair;
                const latFirstLooksLikeLat = Math.abs(Number(first)) <= 90;
                const lngSecondLooksLikeLng = Math.abs(Number(second)) <= 180;
                return latFirstLooksLikeLat && lngSecondLooksLikeLng
                    ? { lat: Number(first), lng: Number(second) }
                    : { lat: Number(second), lng: Number(first) };
            }).filter((point) => (
                point
                && Number.isFinite(point.lat)
                && Number.isFinite(point.lng)
            ));
        }
    } catch (error) {
        console.warn("Parse plot coordinates error:", error);
    }

    return [];
};

export const buildPlotGeoJsonFeatures = (plotsData = []) => (
    plotsData.map((plot) => {
        const coords = parsePlotCoordinates(plot);
        if (coords.length < 3) return null;

        return {
            type: "Feature",
            properties: {
                name: plot.plot_name || plot.name || "Plot",
            },
            geometry: {
                type: "Polygon",
                coordinates: [coords.map((point) => [point.lng, point.lat])],
            },
        };
    }).filter(Boolean)
);

export const clearMapPlotLayers = (map) => {
    if (!map?.getStyle?.()) return;

    MAP_PLOT_LAYER_IDS.forEach((id) => {
        try {
            if (map.getLayer(id)) map.removeLayer(id);
        } catch {
            // ignore stale layer references during style swaps
        }
    });

    try {
        if (map.getSource("plots")) map.removeSource("plots");
    } catch {
        // ignore stale source references during style swaps
    }
};

export const scheduleMapLibrePlotRender = (map, plotsData = []) => {
    if (!map) return;

    const doRender = () => {
        if (!map?.getStyle?.()) return;

        try {
            clearMapPlotLayers(map);
            const features = buildPlotGeoJsonFeatures(plotsData);
            if (!features.length) return;

            map.addSource("plots", {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features,
                },
            });
            map.addLayer({
                id: "plots-fill",
                type: "fill",
                source: "plots",
                paint: {
                    "fill-color": "#1F41BB",
                    "fill-opacity": 0.15,
                },
            });
            map.addLayer({
                id: "plots-outline",
                type: "line",
                source: "plots",
                paint: {
                    "line-color": "#1F41BB",
                    "line-width": 2.5,
                    "line-opacity": 0.9,
                },
            });
        } catch (error) {
            console.warn("Plot render error:", error);
        }
    };

    if (map.isStyleLoaded?.()) {
        doRender();
        return;
    }

    map.once("idle", doRender);
};

export const renderGoogleMapPlots = (map, plotsData = [], polygonStore = []) => {
    if (!map || !window.google?.maps) return polygonStore;

    polygonStore.forEach((polygon) => {
        try {
            polygon.setMap(null);
        } catch {
            // ignore cleanup errors
        }
    });

    const nextPolygons = [];

    buildPlotGeoJsonFeatures(plotsData).forEach((feature) => {
        const paths = feature.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
        if (paths.length < 3) return;

        nextPolygons.push(new window.google.maps.Polygon({
            paths,
            strokeColor: "#1F41BB",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#1F41BB",
            fillOpacity: 0.1,
            map,
            clickable: false,
        }));
    });

    return nextPolygons;
};

export const isPointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const yi = polygon[i].lat;
        const xi = polygon[i].lng;
        const yj = polygon[j].lat;
        const xj = polygon[j].lng;
        const intersects = ((yi > point.lat) !== (yj > point.lat))
            && (point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi);
        if (intersects) inside = !inside;
    }
    return inside;
};

export const getDriverPlotId = (driver) =>
    driver?.plot_id ?? driver?.assigned_plot_id ?? driver?.default_plot_id ?? driver?.plot ?? null;

export const findPlotContainingPoint = (lat, lng, plots = []) => {
    const point = { lat: Number(lat), lng: Number(lng) };
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;

    for (const plot of plots) {
        const coords = parsePlotCoordinates(plot);
        if (coords.length >= 3 && isPointInPolygon(point, coords)) {
            return {
                id: plot.id ?? plot.plot_id,
                name: plot.plot_name ?? plot.name ?? "Plot",
            };
        }
    }
    return null;
};

export const PLOT_BASED_PICKUP_BLOCKED_MESSAGE =
    "This pickup cannot be dispatched automatically. The location is outside a service plot, or no drivers are assigned to this plot.";

export const resolvePickupPlot = async ({ latitude, longitude, fetchPlotName, plotsData = [] }) => {
    const apiPlot = await fetchPlotName(latitude, longitude);
    if (apiPlot?.found && apiPlot.id) {
        return { id: apiPlot.id, name: apiPlot.name || "Plot" };
    }

    return findPlotContainingPoint(latitude, longitude, plotsData);
};

export const countDriversInPlot = (plotId, drivers = []) =>
    drivers.filter((driver) => {
        const driverPlotId = getDriverPlotId(driver);
        return driverPlotId != null && String(driverPlotId) === String(plotId);
    }).length;

export const validatePlotBasedPickup = async ({
    latitude,
    longitude,
    fetchPlotName,
    plotsData = [],
    drivers = [],
}) => {
    const plot = await resolvePickupPlot({
        latitude,
        longitude,
        fetchPlotName,
        plotsData,
    });

    if (!plot?.id || countDriversInPlot(plot.id, drivers) === 0) {
        return { ok: false, message: PLOT_BASED_PICKUP_BLOCKED_MESSAGE };
    }

    return { ok: true, plot };
};
