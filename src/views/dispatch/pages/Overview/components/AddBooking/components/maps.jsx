import { useEffect, useRef, useState } from "react";

const GoogleMap = ({ googleApiKey, pickupCoords, destinationCoords, viaCoords }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const directionsRendererRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (window.google?.maps) {
            setIsLoaded(true);
            return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places`;
        script.async = true;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => console.error("Failed to load Google Maps");
        document.head.appendChild(script);
    }, [googleApiKey]);

    // Initialize map once
    useEffect(() => {
        if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

        try {
            const center = { lat: 23.8103, lng: 90.4125 };

            mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                zoom: 12,
                center: center,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
            });

            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: mapInstanceRef.current,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: "#4285F4",
                    strokeWeight: 4,
                },
            });
        } catch (error) {
            console.error("Error initializing map:", error);
        }
    }, [isLoaded]);

    // Update markers and route
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return;

        const map = mapInstanceRef.current;

        // Clear existing markers
        markersRef.current.forEach(marker => {
            if (marker && marker.setMap) {
                marker.setMap(null);
            }
        });
        markersRef.current = [];

        const bounds = new window.google.maps.LatLngBounds();
        let hasCoordinates = false;

        // Add pickup marker
        if (pickupCoords?.lat && pickupCoords?.lng) {
            try {
                const marker = new window.google.maps.Marker({
                    position: pickupCoords,
                    map: map,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#4CAF50",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                    },
                    label: {
                        text: "P",
                        color: "#ffffff",
                        fontWeight: "bold",
                    },
                    title: "Pickup Point",
                });
                markersRef.current.push(marker);
                bounds.extend(pickupCoords);
                hasCoordinates = true;
            } catch (error) {
                console.error("Error creating pickup marker:", error);
            }
        }

        // Add via markers
        if (viaCoords && Array.isArray(viaCoords)) {
            viaCoords.forEach((coord, index) => {
                if (coord?.lat && coord?.lng) {
                    try {
                        const marker = new window.google.maps.Marker({
                            position: coord,
                            map: map,
                            icon: {
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 10,
                                fillColor: "#2196F3",
                                fillOpacity: 1,
                                strokeColor: "#ffffff",
                                strokeWeight: 2,
                            },
                            label: {
                                text: `${index + 1}`,
                                color: "#ffffff",
                                fontWeight: "bold",
                            },
                            title: `Via Point ${index + 1}`,
                        });
                        markersRef.current.push(marker);
                        bounds.extend(coord);
                        hasCoordinates = true;
                    } catch (error) {
                        console.error(`Error creating via marker ${index}:`, error);
                    }
                }
            });
        }

        // Add destination marker
        if (destinationCoords?.lat && destinationCoords?.lng) {
            try {
                const marker = new window.google.maps.Marker({
                    position: destinationCoords,
                    map: map,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#F44336",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                    },
                    label: {
                        text: "D",
                        color: "#ffffff",
                        fontWeight: "bold",
                    },
                    title: "Destination",
                });
                markersRef.current.push(marker);
                bounds.extend(destinationCoords);
                hasCoordinates = true;
            } catch (error) {
                console.error("Error creating destination marker:", error);
            }
        }

        // Draw route if we have pickup and destination
        if (pickupCoords?.lat && pickupCoords?.lng &&
            destinationCoords?.lat && destinationCoords?.lng &&
            directionsRendererRef.current) {

            const directionsService = new window.google.maps.DirectionsService();

            const waypoints = (viaCoords || [])
                .filter(coord => coord?.lat && coord?.lng)
                .map(coord => ({
                    location: new window.google.maps.LatLng(coord.lat, coord.lng),
                    stopover: true,
                }));

            directionsService.route(
                {
                    origin: pickupCoords,
                    destination: destinationCoords,
                    waypoints: waypoints,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === "OK" && directionsRendererRef.current) {
                        directionsRendererRef.current.setDirections(result);
                    } else {
                        console.error("Directions request failed:", status);
                        // Clear directions on error
                        if (directionsRendererRef.current) {
                            directionsRendererRef.current.setDirections({ routes: [] });
                        }
                    }
                }
            );
        } else {
            // Clear any existing directions
            if (directionsRendererRef.current) {
                directionsRendererRef.current.setDirections({ routes: [] });
            }
        }

        // Fit map to bounds
        if (hasCoordinates) {
            map.fitBounds(bounds);

            // Ensure minimum zoom level
            const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
                if (map.getZoom() > 15) {
                    map.setZoom(15);
                }
            });
        }
    }, [pickupCoords, destinationCoords, viaCoords, isLoaded]);

    // Cleanup
    useEffect(() => {
        return () => {
            markersRef.current.forEach(marker => {
                if (marker && marker.setMap) {
                    marker.setMap(null);
                }
            });
            markersRef.current = [];
        };
    }, []);

    return (
        <div
            ref={mapRef}
            style={{ width: "100%", height: "400px", borderRadius: "8px" }}
        >
            {!isLoaded && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px'
                }}>
                    <p style={{ color: '#6b7280' }}>Loading map...</p>
                </div>
            )}
        </div>
    );
};

const BarikoiMap = ({ apiKey, pickupCoords, destinationCoords, viaCoords }) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load MapLibre GL
    useEffect(() => {
        if (window.maplibregl) {
            setIsLoaded(true);
            return;
        }

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css";
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js";
        script.async = true;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => console.error("Failed to load MapLibre GL");
        document.head.appendChild(script);
    }, []);

    // Initialize map
    useEffect(() => {
        if (!isLoaded || !containerRef.current || mapRef.current || !apiKey) return;

        try {
            const center = [90.4125, 23.8103];

            mapRef.current = new window.maplibregl.Map({
                container: containerRef.current,
                style: `https://map.barikoi.com/styles/barikoi-light/style.json?key=${apiKey}`,
                center: center,
                zoom: 12,
            });

            mapRef.current.addControl(new window.maplibregl.NavigationControl());
        } catch (error) {
            console.error("Error initializing Barikoi map:", error);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [apiKey, isLoaded]);

    // Update markers and route
    useEffect(() => {
        if (!mapRef.current || !isLoaded) return;

        // Wait for style to load
        const updateMap = () => {
            // Clear existing markers
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];

            const bounds = new window.maplibregl.LngLatBounds();
            let hasCoordinates = false;

            // Add pickup marker
            if (pickupCoords?.lat && pickupCoords?.lng) {
                const el = document.createElement('div');
                el.style.backgroundColor = '#4CAF50';
                el.style.width = '30px';
                el.style.height = '30px';
                el.style.borderRadius = '50%';
                el.style.border = '3px solid white';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.color = 'white';
                el.style.fontWeight = 'bold';
                el.style.fontSize = '14px';
                el.innerHTML = 'P';

                const marker = new window.maplibregl.Marker({ element: el })
                    .setLngLat([pickupCoords.lng, pickupCoords.lat])
                    .addTo(mapRef.current);

                markersRef.current.push(marker);
                bounds.extend([pickupCoords.lng, pickupCoords.lat]);
                hasCoordinates = true;
            }

            // Add via markers
            if (viaCoords && Array.isArray(viaCoords)) {
                viaCoords.forEach((coord, index) => {
                    if (coord?.lat && coord?.lng) {
                        const el = document.createElement('div');
                        el.style.backgroundColor = '#2196F3';
                        el.style.width = '30px';
                        el.style.height = '30px';
                        el.style.borderRadius = '50%';
                        el.style.border = '3px solid white';
                        el.style.display = 'flex';
                        el.style.alignItems = 'center';
                        el.style.justifyContent = 'center';
                        el.style.color = 'white';
                        el.style.fontWeight = 'bold';
                        el.style.fontSize = '14px';
                        el.innerHTML = `${index + 1}`;

                        const marker = new window.maplibregl.Marker({ element: el })
                            .setLngLat([coord.lng, coord.lat])
                            .addTo(mapRef.current);

                        markersRef.current.push(marker);
                        bounds.extend([coord.lng, coord.lat]);
                        hasCoordinates = true;
                    }
                });
            }

            // Add destination marker
            if (destinationCoords?.lat && destinationCoords?.lng) {
                const el = document.createElement('div');
                el.style.backgroundColor = '#F44336';
                el.style.width = '30px';
                el.style.height = '30px';
                el.style.borderRadius = '50%';
                el.style.border = '3px solid white';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.color = 'white';
                el.style.fontWeight = 'bold';
                el.style.fontSize = '14px';
                el.innerHTML = 'D';

                const marker = new window.maplibregl.Marker({ element: el })
                    .setLngLat([destinationCoords.lng, destinationCoords.lat])
                    .addTo(mapRef.current);

                markersRef.current.push(marker);
                bounds.extend([destinationCoords.lng, destinationCoords.lat]);
                hasCoordinates = true;
            }

            // Remove existing route layer
            if (mapRef.current.getLayer('route')) {
                mapRef.current.removeLayer('route');
            }
            if (mapRef.current.getSource('route')) {
                mapRef.current.removeSource('route');
            }

            // Draw route
            if (pickupCoords?.lat && pickupCoords?.lng &&
                destinationCoords?.lat && destinationCoords?.lng) {

                const coordinates = [
                    [pickupCoords.lng, pickupCoords.lat],
                    ...(viaCoords || [])
                        .filter(c => c?.lat && c?.lng)
                        .map(c => [c.lng, c.lat]),
                    [destinationCoords.lng, destinationCoords.lat],
                ];

                mapRef.current.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: coordinates,
                        },
                    },
                });

                mapRef.current.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                    },
                    paint: {
                        'line-color': '#4285F4',
                        'line-width': 4,
                    },
                });
            }

            // Fit map to bounds
            if (hasCoordinates) {
                mapRef.current.fitBounds(bounds, { padding: 50 });
            }
        };

        if (mapRef.current.isStyleLoaded()) {
            updateMap();
        } else {
            mapRef.current.on('load', updateMap);
        }
    }, [pickupCoords, destinationCoords, viaCoords, isLoaded]);

    return (
        <div
            ref={containerRef}
            style={{ width: "100%", height: "400px", borderRadius: "8px" }}
        >
            {!isLoaded && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px'
                }}>
                    <p style={{ color: '#6b7280' }}>Loading map...</p>
                </div>
            )}
        </div>
    );
};

export default function Maps({ mapsApi, pickupCoords, destinationCoords, viaCoords = [] }) {
    const barikoiApiKey = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";
    const googleApiKey = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";

    if (mapsApi === "barikoi") {
        return (
            <BarikoiMap
                apiKey={barikoiApiKey}
                pickupCoords={pickupCoords}
                destinationCoords={destinationCoords}
                viaCoords={viaCoords}
            />
        );
    }

    return (
        <GoogleMap
            googleApiKey={googleApiKey}
            pickupCoords={pickupCoords}
            destinationCoords={destinationCoords}
            viaCoords={viaCoords}
        />
    );
}