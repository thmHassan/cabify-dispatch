import { useEffect, useRef, useState } from "react";
import { getTenantCountryIso } from "../../../../../../../utils/functions/tenantSettings";
import {
    MAP_PROVIDER_BARIKOI,
    MAP_PROVIDER_DEFAULT,
    MAP_PROVIDER_GOOGLE,
    createMapifyTransformRequest,
} from "../../../../../../../services/mapConfigurationService";
import { buildOsmFallbackStyle, loadMapLibreGl } from "../../../../../../../utils/map/maplibreLoader";
import { fetchMapifyAddressFromCoords } from "../../../../../../../services/MapSearchService";
import {
    renderGoogleMapPlots,
    scheduleMapLibrePlotRender,
} from "../../../../../../../utils/functions/plotMapGeometry";
import AppLogoIcon from "../../../../../../../components/svg/AppLogoIcon";

const MAP_MIN_HEIGHT = "280px";

const COUNTRY_CENTERS = {
    GB: { lat: 51.5074, lng: -0.1278 },
    US: { lat: 37.0902, lng: -95.7129 },
    IN: { lat: 20.5937, lng: 78.9629 },
    AU: { lat: -25.2744, lng: 133.7751 },
    CA: { lat: 56.1304, lng: -106.3468 },
    AE: { lat: 23.4241, lng: 53.8478 },
    PK: { lat: 30.3753, lng: 69.3451 },
    BD: { lat: 23.8103, lng: 90.4125 },
    SA: { lat: 23.8859, lng: 45.0792 },
    NG: { lat: 9.082, lng: 8.6753 },
    ZA: { lat: -30.5595, lng: 22.9375 },
    DE: { lat: 51.1657, lng: 10.4515 },
    FR: { lat: 46.2276, lng: 2.2137 },
    IT: { lat: 41.8719, lng: 12.5674 },
    ES: { lat: 40.4637, lng: -3.7492 },
    NL: { lat: 52.1326, lng: 5.2913 },
    SG: { lat: 1.3521, lng: 103.8198 },
    MY: { lat: 4.2105, lng: 101.9758 },
    NZ: { lat: -40.9006, lng: 172.886 },
    KE: { lat: -1.2921, lng: 36.8219 },
    ID: { lat: -0.7893, lng: 113.9213 },
    PH: { lat: 12.8797, lng: 121.774 },
    DEFAULT: { lat: 20, lng: 0 },
};

const getCountryCenter = () => {
    const code = getTenantCountryIso();
    return COUNTRY_CENTERS[code] || COUNTRY_CENTERS.DEFAULT;
};

const getApiKeys = (apiKeys) => ({
    googleKey: apiKeys?.googleKey || null,
    mapifyStyle: apiKeys?.mapifyStyle || null,
    barikoiStyle: apiKeys?.barikoiStyle || null,
    barikoiKey: apiKeys?.barikoiKey || null,
});

const waitForGoogleMapsApi = (maxAttempts = 150) =>
    new Promise((resolve, reject) => {
        let attempts = 0;
        const check = async () => {
            if (typeof window.google?.maps?.Map === "function") {
                resolve();
                return;
            }
            if (window.google?.maps?.importLibrary) {
                try {
                    await window.google.maps.importLibrary("maps");
                    if (typeof window.google?.maps?.Map === "function") {
                        resolve();
                        return;
                    }
                } catch {
                    // keep polling
                }
            }
            if (++attempts >= maxAttempts) {
                reject(new Error("Google Maps API timed out"));
                return;
            }
            setTimeout(check, 50);
        };
        check();
    });

let googleMapsPromise = null;
const loadGoogleMaps = (apiKey) => {
    if (typeof window.google?.maps?.Map === "function") return waitForGoogleMapsApi();
    if (googleMapsPromise) return googleMapsPromise;
    const existing = document.getElementById("google-maps-script") || document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
        googleMapsPromise = waitForGoogleMapsApi().catch(() => {
            googleMapsPromise = null;
            throw new Error("Google Maps API timed out");
        });
        return googleMapsPromise;
    }
    googleMapsPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.id = "google-maps-script";
        s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        s.async = true;
        s.defer = true;
        s.onload = () => waitForGoogleMapsApi().then(resolve).catch(reject);
        s.onerror = () => { googleMapsPromise = null; reject(new Error("Google Maps script failed to load")); };
        document.head.appendChild(s);
    });
    return googleMapsPromise;
};

const useMapResizeObserver = (containerRef, onResize) => {
    const onResizeRef = useRef(onResize);
    useEffect(() => { onResizeRef.current = onResize; }, [onResize]);

    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(() => onResizeRef.current?.());
        ro.observe(containerRef.current);
        onResizeRef.current?.();
        return () => ro.disconnect();
    }, [containerRef]);
};

const formatCoordinateFallback = (lat, lng) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

const formatCoordPair = (coords) => (
    coords?.lat != null && coords?.lng != null
        ? `${Number(coords.lat).toFixed(6)},${Number(coords.lng).toFixed(6)}`
        : ""
);

const buildRouteCoordsKey = (pickupCoords, destinationCoords, viaCoords = []) => {
    const viaPart = (viaCoords || [])
        .filter((coords) => coords?.lat != null && coords?.lng != null)
        .map(formatCoordPair)
        .join("|");
    return `${formatCoordPair(pickupCoords)}>${formatCoordPair(destinationCoords)}>${viaPart}`;
};

const applyRouteLocationSelection = ({
    type,
    label,
    lat,
    lng,
    plotData,
    setFieldValue,
    setPickupPlotData,
    setDestinationPlotData,
    onPickupConfirmed,
    onDestinationConfirmed,
}) => {
    if (type === "pickup") {
        setFieldValue("pickup_location", label);
        setFieldValue("pickup_latitude", lat);
        setFieldValue("pickup_longitude", lng);
        setFieldValue("pickup_plot_id", plotData?.id ?? null);
        setPickupPlotData?.(plotData);
        onPickupConfirmed?.({ lat, lng });
        return;
    }

    setFieldValue("destination_location", label);
    setFieldValue("destination_latitude", lat);
    setFieldValue("destination_longitude", lng);
    setFieldValue("destination_plot_id", plotData?.id ?? null);
    setDestinationPlotData?.(plotData);
    onDestinationConfirmed?.({ lat, lng });
};

const createMapifyAddressResolver = () => async (lat, lng) => {
    try {
        const address = await fetchMapifyAddressFromCoords({ lat, lon: lng });
        if (address) return address;
    } catch (error) {
        console.warn("Mapify reverse geocoding failed:", error);
    }
    return formatCoordinateFallback(lat, lng);
};

const MapConfigError = ({ message }) => (
    <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", minHeight: MAP_MIN_HEIGHT, background: "#fef2f2",
        borderRadius: "8px", padding: "16px", textAlign: "center",
    }}>
        <p style={{ color: "#dc2626", fontSize: "14px" }}>{message}</p>
    </div>
);

const LoadingPlaceholder = () => (
    <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "#f3f4f6", borderRadius: "8px",
    }}>
        <p style={{ color: "#6b7280", fontFamily: "Roboto,Arial,sans-serif" }}>Loading map...</p>
    </div>
);

const GoogleMap = ({
    mapsApi,
    pickupCoords,
    destinationCoords,
    viaCoords,
    setFieldValue,
    fetchPlotName,
    setPickupPlotData,
    setDestinationPlotData,
    onPickupConfirmed,
    onDestinationConfirmed,
    SEARCH_API,
    apiKeys,
    plotsData,
}) => {
    const { googleKey } = getApiKeys(apiKeys);
    const wrapperRef = useRef(null);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const plotPolygons = useRef([]);
    const plotsDataRef = useRef(plotsData);
    const directionsRendererRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const clickCountRef = useRef(0);
    const mountedRef = useRef(true);
    const lastRouteCoordsKeyRef = useRef("");
    const routeCoordsKey = buildRouteCoordsKey(pickupCoords, destinationCoords, viaCoords);

    const resizeGoogleMap = () => {
        if (mapInstanceRef.current && window.google?.maps) {
            window.google.maps.event.trigger(mapInstanceRef.current, "resize");
        }
    };

    useMapResizeObserver(wrapperRef, resizeGoogleMap);

    useEffect(() => {
        mountedRef.current = true;
        if (!googleKey) return;
        setLoadError(false);
        loadGoogleMaps(googleKey)
            .then(() => { if (mountedRef.current) setIsLoaded(true); })
            .catch((e) => {
                console.error("Google Maps load error:", e);
                if (mountedRef.current) setLoadError(true);
            });
        return () => { mountedRef.current = false; };
    }, [mapsApi]);

    const getAddressFromCoords = async (lat, lng) => {
        if ((SEARCH_API === "google" || SEARCH_API === "both") && window.google?.maps) {
            const geocoder = new window.google.maps.Geocoder();
            return new Promise((resolve) => {
                geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                    resolve(status === "OK" && results[0]
                        ? results[0].formatted_address
                        : formatCoordinateFallback(lat, lng));
                });
            });
        }
        return formatCoordinateFallback(lat, lng);
    };

    useEffect(() => {
        plotsDataRef.current = plotsData;
    }, [plotsData]);

    const renderPlots = () => {
        if (!mapInstanceRef.current) return;
        plotPolygons.current = renderGoogleMapPlots(
            mapInstanceRef.current,
            plotsDataRef.current,
            plotPolygons.current
        );
    };

    useEffect(() => {
        if (mapReady) renderPlots();
    }, [mapReady, plotsData]);

    useEffect(() => {
        if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

        let cancelled = false;
        const initMap = async () => {
            await new Promise((resolve) => requestAnimationFrame(resolve));
            await new Promise((resolve) => setTimeout(resolve, 150));
            if (cancelled || !mapRef.current || mapInstanceRef.current) return;

            try {
                if (typeof window.google?.maps?.Map !== "function" && window.google?.maps?.importLibrary) {
                    await window.google.maps.importLibrary("maps");
                    await window.google.maps.importLibrary("routes");
                }
                if (typeof window.google?.maps?.Map !== "function") {
                    throw new Error("Google Maps Map constructor unavailable");
                }

                const center = getCountryCenter();
                mapRef.current.style.minHeight = MAP_MIN_HEIGHT;
                mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                    zoom: 5,
                    center: { lat: center.lat, lng: center.lng },
                    mapTypeControl: true,
                    streetViewControl: false,
                    fullscreenControl: true,
                    styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
                });
                directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                    map: mapInstanceRef.current,
                    suppressMarkers: true,
                    polylineOptions: { strokeColor: "#4285F4", strokeWeight: 4 },
                });
                mapInstanceRef.current.addListener("click", async (event) => {
                    const lat = event.latLng.lat();
                    const lng = event.latLng.lng();
                    clickCountRef.current += 1;
                    const address = await getAddressFromCoords(lat, lng);
                    const plotData = await fetchPlotName(lat, lng);
                    if (clickCountRef.current === 1) {
                        applyRouteLocationSelection({
                            type: "pickup",
                            label: address,
                            lat,
                            lng,
                            plotData,
                            setFieldValue,
                            setPickupPlotData,
                            setDestinationPlotData,
                            onPickupConfirmed,
                            onDestinationConfirmed,
                        });
                    } else if (clickCountRef.current === 2) {
                        applyRouteLocationSelection({
                            type: "destination",
                            label: address,
                            lat,
                            lng,
                            plotData,
                            setFieldValue,
                            setPickupPlotData,
                            setDestinationPlotData,
                            onPickupConfirmed,
                            onDestinationConfirmed,
                        });
                        clickCountRef.current = 0;
                    }
                });
                setTimeout(() => {
                    if (!cancelled) {
                        resizeGoogleMap();
                        setMapReady(true);
                        renderPlots();
                    }
                }, 200);
            } catch (err) {
                console.error("Google map init error:", err);
                if (!cancelled) setLoadError(true);
            }
        };

        initMap();
        return () => {
            cancelled = true;
            markersRef.current.forEach((m) => { try { m?.setMap(null); } catch (e) { } });
            markersRef.current = [];
            plotPolygons.current.forEach(p => p.setMap(null));
            plotPolygons.current = [];
            mapInstanceRef.current = null;
            directionsRendererRef.current = null;
            setMapReady(false);
        };
    }, [isLoaded]);

    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return;
        if (routeCoordsKey === lastRouteCoordsKeyRef.current) return;
        lastRouteCoordsKeyRef.current = routeCoordsKey;

        const id = setTimeout(() => {
            if (!mapInstanceRef.current) return;
            const map = mapInstanceRef.current;
            markersRef.current.forEach((m) => { try { m?.setMap(null); } catch (e) { } });
            markersRef.current = [];
            const bounds = new window.google.maps.LatLngBounds();
            let hasCoords = false;

            const addMarker = (coords, color, label, title) => {
                if (!coords?.lat || !coords?.lng) return;
                try {
                    const m = new window.google.maps.Marker({
                        position: coords, map,
                        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
                        label: { text: label, color: "#fff", fontWeight: "bold" },
                        title,
                    });
                    markersRef.current.push(m);
                    bounds.extend(coords);
                    hasCoords = true;
                } catch (e) { }
            };

            addMarker(pickupCoords, "#4CAF50", "P", "Pickup");
            (viaCoords || []).forEach((c, i) => addMarker(c, "#2196F3", `${i + 1}`, `Via ${i + 1}`));
            addMarker(destinationCoords, "#F44336", "D", "Destination");

            if (pickupCoords?.lat && destinationCoords?.lat && directionsRendererRef.current) {
                const ds = new window.google.maps.DirectionsService();
                const waypoints = (viaCoords || [])
                    .filter((c) => c?.lat && c?.lng)
                    .map((c) => ({ location: new window.google.maps.LatLng(c.lat, c.lng), stopover: true }));
                ds.route(
                    { origin: pickupCoords, destination: destinationCoords, waypoints, travelMode: "DRIVING" },
                    (result, status) => {
                        if (!directionsRendererRef.current) return;
                        if (status === "OK") directionsRendererRef.current.setDirections(result);
                        else directionsRendererRef.current.setDirections({ routes: [] });
                    }
                );
            } else {
                directionsRendererRef.current?.setDirections({ routes: [] });
            }

            if (hasCoords) {
                map.fitBounds(bounds);
                window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
                    if (map.getZoom() > 15) map.setZoom(15);
                });
            }
        }, 300);
        return () => clearTimeout(id);
    }, [routeCoordsKey, isLoaded]);

    if (!googleKey || loadError) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: MAP_MIN_HEIGHT, background: "#fef2f2", borderRadius: "8px" }}>
                <p style={{ color: "#dc2626", fontSize: "14px" }}>
                    {!googleKey ? "Google Maps API key is not configured." : "Google Maps failed to load. Please check your API key."}
                </p>
            </div>
        );
    }

    return (
        <div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "100%", minHeight: MAP_MIN_HEIGHT, borderRadius: "8px", overflow: "hidden" }}>
            <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: MAP_MIN_HEIGHT }} />
            {!isLoaded && <LoadingPlaceholder />}
        </div>
    );
};

const MapLibreBookingMap = ({
    mapsApi,
    styleConfig,
    styleMissingMessage = "Map style is not configured.",
    styleErrorMessage = "Map failed to load.",
    mapLabel = "Map",
    showMapifyBranding = false,
    resolveAddressFromCoords,
    pickupCoords,
    destinationCoords,
    viaCoords,
    setFieldValue,
    fetchPlotName,
    setPickupPlotData,
    setDestinationPlotData,
    onPickupConfirmed,
    onDestinationConfirmed,
    plotsData,
}) => {
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const plotsDataRef = useRef(plotsData);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const clickCountRef = useRef(0);
    const mountedRef = useRef(true);
    const lastRouteCoordsKeyRef = useRef("");
    const routeCoordsKey = buildRouteCoordsKey(pickupCoords, destinationCoords, viaCoords);
    const hasStyleConfig = Boolean(styleConfig);
    const styleConfigRef = useRef(styleConfig);
    styleConfigRef.current = styleConfig;

    const resizeMap = () => {
        if (mapRef.current?.resize) mapRef.current.resize();
    };

    useMapResizeObserver(wrapperRef, resizeMap);

    useEffect(() => {
        mountedRef.current = true;
        if (!hasStyleConfig) {
            setLoadError(false);
            return undefined;
        }
        setLoadError(false);
        loadMapLibreGl()
            .then(() => { if (mountedRef.current) setIsLoaded(true); })
            .catch(() => { if (mountedRef.current) setLoadError(true); });
        return () => { mountedRef.current = false; };
    }, [mapsApi, hasStyleConfig]);

    useEffect(() => {
        plotsDataRef.current = plotsData;
        if (mapRef.current) {
            scheduleMapLibrePlotRender(mapRef.current, plotsDataRef.current);
        }
    }, [plotsData]);

    const attachPlotStyleHandlers = (map) => {
        if (!map || map._plotStyleHandlersAttached) return;
        map._plotStyleHandlersAttached = true;

        map.on("style.load", () => {
            scheduleMapLibrePlotRender(map, plotsDataRef.current);
        });
    };

    useEffect(() => {
        if (!isLoaded || !containerRef.current || mapRef.current || !hasStyleConfig) return;

        let cancelled = false;
        const initMap = async () => {
            await new Promise((resolve) => requestAnimationFrame(resolve));
            await new Promise((resolve) => setTimeout(resolve, 150));
            if (cancelled || !containerRef.current || mapRef.current) return;

            try {
                const center = getCountryCenter();
                containerRef.current.style.minHeight = MAP_MIN_HEIGHT;
                mapRef.current = new window.maplibregl.Map({
                    container: containerRef.current,
                    style: styleConfigRef.current,
                    center: [center.lng, center.lat],
                    zoom: 12,
                    attributionControl: false,
                    transformRequest: createMapifyTransformRequest(),
                });
                mapRef.current.on("error", (e) => {
                    const msg = e?.error?.message || String(e);
                    const isAuthError = msg.includes("403") || msg.includes("401");
                    const isNetworkError = msg.includes("Failed to fetch");
                    const isTimeoutError = /timeout|timed out|cURL error 28|SSL connection timeout/i.test(msg);
                    if ((isAuthError || isNetworkError || isTimeoutError) && !mapRef.current._usedFallback) {
                        console.warn("Mapify tiles unavailable, switching to OSM fallback");
                        mapRef.current._usedFallback = true;
                        try { mapRef.current.setStyle(buildOsmFallbackStyle()); } catch { }
                    }
                });
                attachPlotStyleHandlers(mapRef.current);
                mapRef.current.on("load", () => {
                    if (!mapRef.current) return;
                    mapRef.current.resize();
                    setTimeout(() => {
                        if (mapRef.current) {
                            mapRef.current.resize();
                            scheduleMapLibrePlotRender(mapRef.current, plotsDataRef.current);
                        }
                    }, 150);
                });
                mapRef.current.addControl(new window.maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
                mapRef.current.on("click", async (e) => {
                    const lat = e.lngLat.lat;
                    const lng = e.lngLat.lng;
                    clickCountRef.current += 1;
                    const address = await resolveAddressFromCoords(lat, lng);
                    const plotData = await fetchPlotName(lat, lng);
                    if (clickCountRef.current === 1) {
                        applyRouteLocationSelection({
                            type: "pickup",
                            label: address,
                            lat,
                            lng,
                            plotData,
                            setFieldValue,
                            setPickupPlotData,
                            setDestinationPlotData,
                            onPickupConfirmed,
                            onDestinationConfirmed,
                        });
                    } else if (clickCountRef.current === 2) {
                        applyRouteLocationSelection({
                            type: "destination",
                            label: address,
                            lat,
                            lng,
                            plotData,
                            setFieldValue,
                            setPickupPlotData,
                            setDestinationPlotData,
                            onPickupConfirmed,
                            onDestinationConfirmed,
                        });
                        clickCountRef.current = 0;
                    }
                });
            } catch (err) {
                console.error(`${mapLabel} init error:`, err);
                if (!cancelled) setLoadError(true);
            }
        };

        initMap();
        return () => {
            cancelled = true;
            if (mapRef.current) {
                try { mapRef.current.remove(); } catch (e) { }
                mapRef.current = null;
            }
            markersRef.current.forEach((m) => { try { m.remove(); } catch (e) { } });
            markersRef.current = [];
        };
    }, [isLoaded, mapsApi, hasStyleConfig]);

    useEffect(() => {
        if (!isLoaded || !mapRef.current) return;
        scheduleMapLibrePlotRender(mapRef.current, plotsDataRef.current);
    }, [isLoaded, plotsData]);

    const mkEl = (color, text) => {
        const el = document.createElement("div");
        el.style.cssText = [
            `background:${color}`, "width:26px", "height:26px",
            "border-radius:50%", "border:2.5px solid #fff",
            "display:flex", "align-items:center", "justify-content:center",
            "color:#fff", "font-weight:bold", "font-size:12px",
            "font-family:Roboto,Arial,sans-serif",
            "box-shadow:0 2px 6px rgba(0,0,0,0.35)", "cursor:pointer",
        ].join(";");
        el.textContent = text;
        return el;
    };

    const drawRoute = (map) => {
        const removeLayers = () => {
            ["route-outline", "route"].forEach((id) => {
                try { if (map.getLayer(id)) map.removeLayer(id); } catch (e) { }
            });
            try { if (map.getSource("route")) map.removeSource("route"); } catch (e) { }
        };
        removeLayers();
        if (!pickupCoords?.lat || !destinationCoords?.lat) return;

        const paint = (geometry) => {
            removeLayers();
            try {
                map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry } });
                map.addLayer({ id: "route-outline", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#fff", "line-width": 8 } });
                map.addLayer({ id: "route", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#4285F4", "line-width": 5 } });
            } catch (e) { }
        };

        const pts = [
            `${pickupCoords.lng},${pickupCoords.lat}`,
            ...(viaCoords || []).filter((c) => c?.lat && c?.lng).map((c) => `${c.lng},${c.lat}`),
            `${destinationCoords.lng},${destinationCoords.lat}`,
        ];

        fetch(`https://router.project-osrm.org/route/v1/driving/${pts.join(";")}?overview=full&geometries=geojson`)
            .then((r) => r.json())
            .then((data) => {
                if (!mapRef.current || !data?.routes?.[0]) throw new Error("no route");
                paint(data.routes[0].geometry);
            })
            .catch(() => {
                paint({
                    type: "LineString",
                    coordinates: [
                        [pickupCoords.lng, pickupCoords.lat],
                        ...(viaCoords || []).filter((c) => c?.lat && c?.lng).map((c) => [c.lng, c.lat]),
                        [destinationCoords.lng, destinationCoords.lat],
                    ],
                });
            });
    };

    useEffect(() => {
        if (!mapRef.current || !isLoaded) return;
        if (routeCoordsKey === lastRouteCoordsKeyRef.current) return;
        lastRouteCoordsKeyRef.current = routeCoordsKey;

        const id = setTimeout(() => {
            const doUpdate = () => {
                if (!mapRef.current) return;
                markersRef.current.forEach((m) => { try { m.remove(); } catch (e) { } });
                markersRef.current = [];
                const bounds = new window.maplibregl.LngLatBounds();
                let hasCoords = false;

                const addMarker = (coords, color, label) => {
                    if (!coords?.lat || !coords?.lng) return;
                    const m = new window.maplibregl.Marker({ element: mkEl(color, label) })
                        .setLngLat([coords.lng, coords.lat])
                        .addTo(mapRef.current);
                    markersRef.current.push(m);
                    bounds.extend([coords.lng, coords.lat]);
                    hasCoords = true;
                };

                addMarker(pickupCoords, "#4CAF50", "P");
                (viaCoords || []).forEach((c, i) => addMarker(c, "#2196F3", `${i + 1}`));
                addMarker(destinationCoords, "#F44336", "D");

                if (hasCoords) mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
                drawRoute(mapRef.current);
            };

            if (mapRef.current?.isStyleLoaded()) doUpdate();
            else mapRef.current?.once("load", doUpdate);
        }, 300);
        return () => clearTimeout(id);
    }, [routeCoordsKey, isLoaded]);

    const btnBase = {
        background: "#fff", border: "none", cursor: "pointer",
        fontSize: "11px", fontFamily: "Roboto,Arial,sans-serif",
        fontWeight: "500", color: "#666", padding: "6px 12px", lineHeight: "1", outline: "none",
    };

    if (!styleConfig || loadError) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: MAP_MIN_HEIGHT, background: "#fef2f2", borderRadius: "8px" }}>
                <p style={{ color: "#dc2626", fontSize: "14px" }}>
                    {!styleConfig ? styleMissingMessage : styleErrorMessage}
                </p>
            </div>
        );
    }

    return (
        <div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "100%", minHeight: MAP_MIN_HEIGHT, borderRadius: "8px", overflow: "hidden", fontFamily: "Roboto,Arial,sans-serif" }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: MAP_MIN_HEIGHT }} />
            {!isLoaded && <LoadingPlaceholder />}

            {isLoaded && showMapifyBranding && (
                <div style={{
                    position: "absolute", top: "10px", left: "10px", zIndex: 10,
                    display: "flex", background: "#fff",
                    borderRadius: "2px", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", overflow: "hidden",
                }}>
                    <div style={{ ...btnBase, color: "#1a73e8", borderBottom: "2px solid #1a73e8", display: "flex", alignItems: "center", gap: "6px" }}>
                        <AppLogoIcon width={14} height={14} />
                        Mapifyit
                    </div>
                </div>
            )}

            {isLoaded && !showMapifyBranding && mapLabel && (
                <div style={{
                    position: "absolute", top: "10px", left: "10px", zIndex: 10,
                    display: "flex", background: "#fff",
                    borderRadius: "2px", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", overflow: "hidden",
                }}>
                    <div style={{ ...btnBase, color: "#1a73e8", borderBottom: "2px solid #1a73e8" }}>
                        {mapLabel}
                    </div>
                </div>
            )}

            {/* Fullscreen map control removed — location search uses sidebar in Create Booking */}
        </div>
    );
};

const MapifyMap = (props) => {
    const { mapifyStyle } = getApiKeys(props.apiKeys);
    return (
        <MapLibreBookingMap
            {...props}
            styleConfig={mapifyStyle}
            styleMissingMessage="Mapify tiles are not configured."
            styleErrorMessage="Mapify map failed to load."
            mapLabel="Mapifyit"
            showMapifyBranding
            resolveAddressFromCoords={createMapifyAddressResolver()}
        />
    );
};

const BarikoiMap = (props) => {
    const { barikoiStyle } = getApiKeys(props.apiKeys);
    return (
        <MapLibreBookingMap
            {...props}
            styleConfig={barikoiStyle}
            styleMissingMessage="Barikoi map is not configured."
            styleErrorMessage="Barikoi map failed to load."
            mapLabel="Barikoi Map"
            showMapifyBranding={false}
            resolveAddressFromCoords={async (lat, lng) => formatCoordinateFallback(lat, lng)}
        />
    );
};

export default function Maps({
    mapsApi,
    mapError = null,
    pickupCoords,
    destinationCoords,
    viaCoords = [],
    setFieldValue,
    fetchPlotName,
    setPickupPlotData,
    setDestinationPlotData,
    onPickupConfirmed,
    onDestinationConfirmed,
    SEARCH_API,
    apiKeys,
    plotsData,
}) {
    if (mapError) return <MapConfigError message={mapError} />;
    if (!mapsApi) {
        return (
            <div style={{ position: "relative", width: "100%", height: "100%", minHeight: MAP_MIN_HEIGHT }}>
                <LoadingPlaceholder />
            </div>
        );
    }

    const sharedProps = {
        mapsApi,
        pickupCoords, destinationCoords, viaCoords,
        setFieldValue, fetchPlotName,
        setPickupPlotData, setDestinationPlotData,
        onPickupConfirmed, onDestinationConfirmed,
        apiKeys, plotsData,
    };
    if (mapsApi === MAP_PROVIDER_DEFAULT) return <MapifyMap key={mapsApi} {...sharedProps} />;
    if (mapsApi === MAP_PROVIDER_BARIKOI || mapsApi === "barikoi") return <BarikoiMap key={mapsApi} {...sharedProps} />;
    return <GoogleMap key={mapsApi} {...sharedProps} SEARCH_API={SEARCH_API} />;
}