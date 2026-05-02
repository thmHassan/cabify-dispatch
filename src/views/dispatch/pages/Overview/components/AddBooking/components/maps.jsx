import { useEffect, useRef, useState } from "react";
import { getTenantData } from "../../../../../../../utils/functions/tokenEncryption";

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
    const tenant = getTenantData();
    const code = (tenant?.country_of_use || tenant?.data?.country_of_use)?.trim().toUpperCase();
    return COUNTRY_CENTERS[code] || COUNTRY_CENTERS.DEFAULT;
};

const getApiKeys = (apiKeys) => {
    return {
        googleKey: apiKeys?.googleKey || null,
        barikoiKey: apiKeys?.barikoiKey || null,
    };
};

let googleMapsPromise = null;
const loadGoogleMaps = (apiKey) => {
    if (window.google?.maps?.places) return Promise.resolve();
    if (googleMapsPromise) return googleMapsPromise;
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
        googleMapsPromise = new Promise((resolve) => {
            if (window.google?.maps) return resolve();
            existing.addEventListener("load", resolve);
            setTimeout(() => { if (window.google?.maps) resolve(); }, 3000);
        });
        return googleMapsPromise;
    }
    googleMapsPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        s.async = true;
        s.onload = resolve;
        s.onerror = () => { googleMapsPromise = null; reject(); };
        document.head.appendChild(s);
    });
    return googleMapsPromise;
};

let maplibrePromise = null;
const loadMaplibre = () => {
    if (window.maplibregl) return Promise.resolve();
    if (maplibrePromise) return maplibrePromise;
    maplibrePromise = new Promise((resolve, reject) => {
        if (!document.getElementById("maplibre-css")) {
            const link = document.createElement("link");
            link.id = "maplibre-css";
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css";
            document.head.appendChild(link);
        }
        const s = document.createElement("script");
        s.id = "maplibre-script";
        s.src = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js";
        s.async = true;
        s.onload = () => {
            if (window.maplibregl) resolve();
            else reject(new Error("MapLibre failed to initialize"));
        };
        s.onerror = () => { maplibrePromise = null; reject(); };
        document.head.appendChild(s);
    });
    return maplibrePromise;
};

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
}) => {
    const { googleKey } = getApiKeys(apiKeys);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const directionsRendererRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const clickCountRef = useRef(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        if (!googleKey) return;
        loadGoogleMaps(googleKey)
            .then(() => { if (mountedRef.current) setIsLoaded(true); })
            .catch((e) => console.error("Google Maps load error:", e));
        return () => { mountedRef.current = false; };
    }, [googleKey]);

    const getAddressFromCoords = async (lat, lng) => {
        if ((SEARCH_API === "google" || SEARCH_API === "both") && window.google?.maps) {
            const geocoder = new window.google.maps.Geocoder();
            return new Promise((resolve) => {
                geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                    resolve(status === "OK" && results[0]
                        ? results[0].formatted_address
                        : `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                });
            });
        }
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    };

    useEffect(() => {
        if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;
        try {
            const center = getCountryCenter();
            mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                zoom: 5,
                center: { lat: center.lat, lng: center.lng },
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
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
                    setFieldValue("pickup_point", address);
                    setFieldValue("pickup_latitude", lat);
                    setFieldValue("pickup_longitude", lng);
                    setFieldValue("pickup_plot_id", plotData.id);
                    setPickupPlotData(plotData);
                    onPickupConfirmed?.({ lat, lng });
                } else if (clickCountRef.current === 2) {
                    setFieldValue("destination", address);
                    setFieldValue("destination_latitude", lat);
                    setFieldValue("destination_longitude", lng);
                    setFieldValue("destination_plot_id", plotData.id);
                    setDestinationPlotData(plotData);
                    onDestinationConfirmed?.({ lat, lng });
                    clickCountRef.current = 0;
                }
            });
        } catch (err) {
            console.error("Google map init error:", err);
        }
        return () => {
            markersRef.current.forEach((m) => { try { m?.setMap(null); } catch (e) { } });
            markersRef.current = [];
            mapInstanceRef.current = null;
            directionsRendererRef.current = null;
        };
    }, [isLoaded]);

    // ✅ Only runs when CONFIRMED coords change — never on keystroke
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return;
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
    }, [pickupCoords, destinationCoords, viaCoords, isLoaded]);

    if (!googleKey) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", background: "#fef2f2", borderRadius: "8px" }}>
                <p style={{ color: "#dc2626", fontSize: "14px" }}>Google Maps API key is not configured.</p>
            </div>
        );
    }

    return (
        <div style={{ position: "relative", width: "100%", height: "400px", borderRadius: "8px", overflow: "hidden" }}>
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
            {!isLoaded && <LoadingPlaceholder />}
        </div>
    );
};

const BarikoiMap = ({
    pickupCoords,
    destinationCoords,
    viaCoords,
    setFieldValue,
    fetchPlotName,
    setPickupPlotData,
    setDestinationPlotData,
    onPickupConfirmed,
    onDestinationConfirmed,
    apiKeys,
}) => {
    const { barikoiKey } = getApiKeys(apiKeys);
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [mapType, setMapType] = useState("map");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const clickCountRef = useRef(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        if (!barikoiKey) { return; }
        loadMaplibre()
            .then(() => { if (mountedRef.current) setIsLoaded(true); })
            .catch(() => { if (mountedRef.current) setLoadError(true); });
        return () => { mountedRef.current = false; };
    }, [barikoiKey]);

    useEffect(() => {
        if (!mapRef.current || !isLoaded || !barikoiKey) return;
        const style = mapType === "satellite"
            ? `https://map.barikoi.com/styles/satellite/style.json?key=${barikoiKey}`
            : `https://map.barikoi.com/styles/osm-liberty/style.json?key=${barikoiKey}`;
        try { mapRef.current.setStyle(style); } catch (e) { }
    }, [mapType, isLoaded, barikoiKey]);

    const toggleFullscreen = () => {
        if (!wrapperRef.current) return;
        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        if (!isLoaded || !containerRef.current || mapRef.current || !barikoiKey) return;
        try {
            const center = getCountryCenter();
            mapRef.current = new window.maplibregl.Map({
                container: containerRef.current,
                style: `https://map.barikoi.com/styles/osm-liberty/style.json?key=${barikoiKey}`,
                center: [center.lng, center.lat],
                zoom: 12, // Closer zoom for city/plot selection
                attributionControl: false,
            });
            mapRef.current.on('load', () => {
                if (mapRef.current) mapRef.current.resize();
            });
            mapRef.current.addControl(
                new window.maplibregl.NavigationControl({ showCompass: true }),
                "bottom-right"
            );
            mapRef.current.on("error", (e) => {
                // Only log — don't block the map for tile/style errors
                console.warn("Barikoi map error:", e?.error?.message || e);
            });
            mapRef.current.on("click", async (e) => {
                const lat = e.lngLat.lat;
                const lng = e.lngLat.lng;
                clickCountRef.current += 1;
                const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                const plotData = await fetchPlotName(lat, lng);
                if (clickCountRef.current === 1) {
                    setFieldValue("pickup_point", address);
                    setFieldValue("pickup_latitude", lat);
                    setFieldValue("pickup_longitude", lng);
                    setFieldValue("pickup_plot_id", plotData.id);
                    setPickupPlotData(plotData);
                    onPickupConfirmed?.({ lat, lng });
                } else if (clickCountRef.current === 2) {
                    setFieldValue("destination", address);
                    setFieldValue("destination_latitude", lat);
                    setFieldValue("destination_longitude", lng);
                    setFieldValue("destination_plot_id", plotData.id);
                    setDestinationPlotData(plotData);
                    onDestinationConfirmed?.({ lat, lng });
                    clickCountRef.current = 0;
                }
            });
        } catch (err) {
            console.error("Barikoi map init error:", err);
            setLoadError(true);
        }
        return () => {
            if (mapRef.current) {
                try { mapRef.current.remove(); } catch (e) { }
                mapRef.current = null;
            }
        };
    }, [isLoaded, barikoiKey]);

    // Google-style circle marker element
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

    // Draw road route via OSRM, fallback to straight line
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

    // ✅ Only runs when CONFIRMED coords change — never on keystroke
    useEffect(() => {
        if (!mapRef.current || !isLoaded) return;
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
    }, [pickupCoords, destinationCoords, viaCoords, isLoaded]);

    const btnBase = {
        background: "#fff", border: "none", cursor: "pointer",
        fontSize: "11px", fontFamily: "Roboto,Arial,sans-serif",
        fontWeight: "500", color: "#666", padding: "6px 12px", lineHeight: "1", outline: "none",
    };

    if (loadError) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", background: "#fef2f2", borderRadius: "8px" }}>
                <p style={{ color: "#dc2626", fontSize: "14px" }}>Barikoi map failed to load. Please check your API key.</p>
            </div>
        );
    }

    return (
        <div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "400px", borderRadius: "8px", overflow: "hidden", fontFamily: "Roboto,Arial,sans-serif" }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
            {!isLoaded && <LoadingPlaceholder />}

            {/* Map / Satellite toggle — top left, identical to Google */}
            {isLoaded && (
                <div style={{
                    position: "absolute", top: "10px", left: "10px", zIndex: 10,
                    display: "flex", background: "#fff",
                    borderRadius: "2px", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", overflow: "hidden",
                }}>
                    <button style={{ ...btnBase, color: mapType === "map" ? "#1a73e8" : "#666", borderBottom: mapType === "map" ? "2px solid #1a73e8" : "2px solid transparent" }} onClick={() => setMapType("map")}>Map</button>
                    <div style={{ width: "1px", background: "#e0e0e0" }} />
                    <button style={{ ...btnBase, color: mapType === "satellite" ? "#1a73e8" : "#666", borderBottom: mapType === "satellite" ? "2px solid #1a73e8" : "2px solid transparent" }} onClick={() => setMapType("satellite")}>Satellite</button>
                </div>
            )}

            {/* Fullscreen button — top right, identical to Google */}
            {isLoaded && (
                <button onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
                    style={{
                        position: "absolute", top: "10px", right: "10px", zIndex: 10,
                        width: "32px", height: "32px", background: "#fff",
                        border: "none", borderRadius: "2px", cursor: "pointer",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                    }}>
                    {isFullscreen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#666">
                            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#666">
                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
};

export default function Maps({
    mapsApi,
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
}) {
    const sharedProps = {
        pickupCoords, destinationCoords, viaCoords,
        setFieldValue, fetchPlotName,
        setPickupPlotData, setDestinationPlotData,
        onPickupConfirmed, onDestinationConfirmed,
        apiKeys,
    };
    if (mapsApi === "barikoi") return <BarikoiMap {...sharedProps} />;
    return <GoogleMap {...sharedProps} SEARCH_API={SEARCH_API} />;
}