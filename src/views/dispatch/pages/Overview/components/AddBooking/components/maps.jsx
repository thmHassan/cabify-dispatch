import { useEffect, useRef, useState } from "react";
import { getTenantData } from "../../../../../../../utils/functions/tokenEncryption";

const DEFAULT_GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
const DEFAULT_BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

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
    DEFAULT: { lat: 0, lng: 0 },
};

const getApiKeys = () => {
    const tenant = getTenantData();
    return {
        googleKey: tenant?.google_api_key || DEFAULT_GOOGLE_KEY,
        barikoiKey: tenant?.barikoi_api_key || DEFAULT_BARIKOI_KEY,
    };
};

const getCountryCenter = () => {
    const tenant = getTenantData();
    const code = (
        tenant?.country_of_use ||
        tenant?.data?.country_of_use
    )?.trim().toUpperCase();
    return COUNTRY_CENTERS[code] || COUNTRY_CENTERS.DEFAULT;
};

const GoogleMap = ({
    pickupCoords,
    destinationCoords,
    viaCoords,
    setFieldValue,
    fetchPlotName,
    setPickupPlotData,
    setDestinationPlotData,
    SEARCH_API,
}) => {
    const { googleKey } = getApiKeys();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const directionsRendererRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const clickCountRef = useRef(0);

    useEffect(() => {
        if (window.google?.maps) { setIsLoaded(true); return; }

        const existing = document.getElementById("google-maps-script");
        if (existing) {
            existing.addEventListener("load", () => setIsLoaded(true));
            return;
        }

        const script = document.createElement("script");
        script.id = "google-maps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleKey}&libraries=places`;
        script.async = true;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => console.error("Failed to load Google Maps");
        document.head.appendChild(script);
    }, []);

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
                } else if (clickCountRef.current === 2) {
                    setFieldValue("destination", address);
                    setFieldValue("destination_latitude", lat);
                    setFieldValue("destination_longitude", lng);
                    setFieldValue("destination_plot_id", plotData.id);
                    setDestinationPlotData(plotData);
                    clickCountRef.current = 0;
                }
            });
        } catch (err) {
            console.error("Google map init error:", err);
        }
    }, [isLoaded]);

    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return;

        const id = setTimeout(() => {
            const map = mapInstanceRef.current;

            markersRef.current.forEach((m) => m?.setMap?.(null));
            markersRef.current = [];

            const bounds = new window.google.maps.LatLngBounds();
            let hasCoords = false;

            const addMarker = (coords, color, label, title) => {
                if (!coords?.lat || !coords?.lng) return;
                const marker = new window.google.maps.Marker({
                    position: coords, map,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: color, fillOpacity: 1,
                        strokeColor: "#fff", strokeWeight: 2,
                    },
                    label: { text: label, color: "#fff", fontWeight: "bold" },
                    title,
                });
                markersRef.current.push(marker);
                bounds.extend(coords);
                hasCoords = true;
            };

            addMarker(pickupCoords, "#4CAF50", "P", "Pickup Point");
            (viaCoords || []).forEach((c, i) => addMarker(c, "#2196F3", `${i + 1}`, `Via ${i + 1}`));
            addMarker(destinationCoords, "#F44336", "D", "Destination");

            // Route
            if (pickupCoords?.lat && destinationCoords?.lat && directionsRendererRef.current) {
                const ds = new window.google.maps.DirectionsService();
                const waypoints = (viaCoords || [])
                    .filter((c) => c?.lat && c?.lng)
                    .map((c) => ({ location: new window.google.maps.LatLng(c.lat, c.lng), stopover: true }));

                ds.route(
                    { origin: pickupCoords, destination: destinationCoords, waypoints, travelMode: "DRIVING" },
                    (result, status) => {
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
        }, 500);

        return () => clearTimeout(id);
    }, [pickupCoords, destinationCoords, viaCoords, isLoaded]);

    // Cleanup
    useEffect(() => {
        return () => {
            markersRef.current.forEach((m) => m?.setMap?.(null));
            markersRef.current = [];
        };
    }, []);

    return (
        <div ref={mapRef} style={{ width: "100%", height: "400px", borderRadius: "8px" }}>
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
}) => {
    const { barikoiKey } = getApiKeys();
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const clickCountRef = useRef(0);

    // Load MapLibre GL
    useEffect(() => {
        if (window.maplibregl) { setIsLoaded(true); return; }

        if (!document.getElementById("maplibre-css")) {
            const link = document.createElement("link");
            link.id = "maplibre-css";
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css";
            document.head.appendChild(link);
        }

        const existing = document.getElementById("maplibre-script");
        if (existing) {
            existing.addEventListener("load", () => setIsLoaded(true));
            return;
        }

        const script = document.createElement("script");
        script.id = "maplibre-script";
        script.src = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js";
        script.async = true;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => console.error("Failed to load MapLibre GL");
        document.head.appendChild(script);
    }, []);

    useEffect(() => {
        if (!isLoaded || !containerRef.current || mapRef.current || !barikoiKey) return;

        try {
            const center = getCountryCenter(); // ✅ dynamic

            mapRef.current = new window.maplibregl.Map({
                container: containerRef.current,
                style: `https://map.barikoi.com/styles/barikoi-light/style.json?key=${barikoiKey}`,
                center: [center.lng, center.lat], // ✅ dynamic, not hardcoded BD
                zoom: 5,
            });

            mapRef.current.addControl(new window.maplibregl.NavigationControl());

            // Click to set pickup/destination
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
                } else if (clickCountRef.current === 2) {
                    setFieldValue("destination", address);
                    setFieldValue("destination_latitude", lat);
                    setFieldValue("destination_longitude", lng);
                    setFieldValue("destination_plot_id", plotData.id);
                    setDestinationPlotData(plotData);
                    clickCountRef.current = 0;
                }
            });
        } catch (err) {
            console.error("Barikoi map init error:", err);
        }

        return () => {
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
    }, [isLoaded]);

    useEffect(() => {
        if (!mapRef.current || !isLoaded) return;

        const id = setTimeout(() => {
            const map = mapRef.current;

            const updateMap = () => {
                // Clear markers
                markersRef.current.forEach((m) => m.remove());
                markersRef.current = [];

                const bounds = new window.maplibregl.LngLatBounds();
                let hasCoords = false;

                const addMarker = (coords, color, label) => {
                    if (!coords?.lat || !coords?.lng) return;
                    const el = document.createElement("div");
                    Object.assign(el.style, {
                        backgroundColor: color,
                        width: "30px", height: "30px",
                        borderRadius: "50%",
                        border: "3px solid white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontWeight: "bold", fontSize: "14px",
                    });
                    el.innerHTML = label;
                    const marker = new window.maplibregl.Marker({ element: el })
                        .setLngLat([coords.lng, coords.lat])
                        .addTo(map);
                    markersRef.current.push(marker);
                    bounds.extend([coords.lng, coords.lat]);
                    hasCoords = true;
                };

                addMarker(pickupCoords, "#4CAF50", "P");
                (viaCoords || []).forEach((c, i) => addMarker(c, "#2196F3", `${i + 1}`));
                addMarker(destinationCoords, "#F44336", "D");

                // Remove old route
                if (map.getLayer("route")) map.removeLayer("route");
                if (map.getSource("route")) map.removeSource("route");

                // Draw route
                if (pickupCoords?.lat && destinationCoords?.lat) {
                    const coords = [
                        [pickupCoords.lng, pickupCoords.lat],
                        ...(viaCoords || []).filter((c) => c?.lat && c?.lng).map((c) => [c.lng, c.lat]),
                        [destinationCoords.lng, destinationCoords.lat],
                    ];

                    map.addSource("route", {
                        type: "geojson",
                        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
                    });
                    map.addLayer({
                        id: "route", type: "line", source: "route",
                        layout: { "line-join": "round", "line-cap": "round" },
                        paint: { "line-color": "#4285F4", "line-width": 4 },
                    });
                }

                if (hasCoords) map.fitBounds(bounds, { padding: 50 });
            };

            map.isStyleLoaded() ? updateMap() : map.once("load", updateMap);
        }, 500);

        return () => clearTimeout(id);
    }, [pickupCoords, destinationCoords, viaCoords, isLoaded]);

    return (
        <div ref={containerRef} style={{ width: "100%", height: "400px", borderRadius: "8px" }}>
            {!isLoaded && <LoadingPlaceholder />}
        </div>
    );
};

const LoadingPlaceholder = () => (
    <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", backgroundColor: "#f3f4f6", borderRadius: "8px",
    }}>
        <p style={{ color: "#6b7280" }}>Loading map...</p>
    </div>
);

export default function Maps({
    mapsApi,
    pickupCoords,
    destinationCoords,
    viaCoords = [],
    setFieldValue,
    fetchPlotName,
    setPickupPlotData,
    setDestinationPlotData,
    SEARCH_API,
}) {
    const sharedProps = {
        pickupCoords, destinationCoords, viaCoords,
        setFieldValue, fetchPlotName,
        setPickupPlotData, setDestinationPlotData,
    };

    if (mapsApi === "barikoi") {
        return <BarikoiMap {...sharedProps} />;
    }

    return <GoogleMap {...sharedProps} SEARCH_API={SEARCH_API} />;
}