import { useEffect, useRef } from "react";

const GoogleMap = ({ googleApiKey, pickupCoords, destinationCoords, viaCoords }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const directionsRendererRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const initMap = () => {
            if (!window.google) return;

            const center = { lat: 23.8103, lng: 90.4125 };

            mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                zoom: 12,
                center: center,
            });

            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: mapInstanceRef.current,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: "#4285F4",
                    strokeWeight: 4,
                },
            });
        };

        if (!window.google) {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places`;
            script.async = true;
            script.onload = initMap;
            document.head.appendChild(script);
        } else {
            initMap();
        }
    }, [googleApiKey]);

    useEffect(() => {
        if (!mapInstanceRef.current) return;

        const map = mapInstanceRef.current;
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        const bounds = new window.google.maps.LatLngBounds();
        let hasCoordinates = false;

        if (pickupCoords) {
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
        }

        if (viaCoords && viaCoords.length > 0) {
            viaCoords.forEach((coord, index) => {
                if (coord) {
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
                }
            });
        }

        if (destinationCoords) {
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
        }

        if (pickupCoords && destinationCoords && directionsRendererRef.current) {
            const directionsService = new window.google.maps.DirectionsService();

            const waypoints = (viaCoords || [])
                .filter(coord => coord)
                .map(coord => ({
                    location: coord,
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
                    if (status === "OK") {
                        directionsRendererRef.current.setDirections(result);
                    }
                }
            );
        } else {
            if (directionsRendererRef.current) {
                directionsRendererRef.current.setDirections({ routes: [] });
            }
        }

        if (hasCoordinates) {
            map.fitBounds(bounds);
        }
    }, [pickupCoords, destinationCoords, viaCoords]);

    return (
        <div
            ref={mapRef}
            style={{ width: "100%", height: "400px" }}
        />
    );
};

const BarikoiMap = ({ apiKey, pickupCoords, destinationCoords, viaCoords }) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const routeLayerRef = useRef(false);

    useEffect(() => {
        if (!containerRef.current || !apiKey || mapRef.current) return;

        const script = document.createElement("script");
        script.src = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js";
        script.async = true;

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css";
        document.head.appendChild(link);

        script.onload = () => {
            if (window.maplibregl && containerRef.current) {
                const center = [90.4125, 23.8103];

                mapRef.current = new window.maplibregl.Map({
                    container: containerRef.current,
                    style: `https://map.barikoi.com/styles/barikoi-light/style.json?key=${apiKey}`,
                    center: center,
                    zoom: 12,
                });

                mapRef.current.addControl(new window.maplibregl.NavigationControl());
            }
        };

        document.head.appendChild(script);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [apiKey]);

    useEffect(() => {
        if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        const bounds = new window.maplibregl.LngLatBounds();
        let hasCoordinates = false;

        if (pickupCoords) {
            const el = document.createElement('div');
            el.className = 'marker';
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
            el.innerHTML = 'P';

            const marker = new window.maplibregl.Marker({ element: el })
                .setLngLat([pickupCoords.lng, pickupCoords.lat])
                .addTo(mapRef.current);

            markersRef.current.push(marker);
            bounds.extend([pickupCoords.lng, pickupCoords.lat]);
            hasCoordinates = true;
        }

        if (viaCoords && viaCoords.length > 0) {
            viaCoords.forEach((coord, index) => {
                if (coord) {
                    const el = document.createElement('div');
                    el.className = 'marker';
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

        if (destinationCoords) {
            const el = document.createElement('div');
            el.className = 'marker';
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
            el.innerHTML = 'D';

            const marker = new window.maplibregl.Marker({ element: el })
                .setLngLat([destinationCoords.lng, destinationCoords.lat])
                .addTo(mapRef.current);

            markersRef.current.push(marker);
            bounds.extend([destinationCoords.lng, destinationCoords.lat]);
            hasCoordinates = true;
        }

        if (routeLayerRef.current) {
            if (mapRef.current.getLayer('route')) {
                mapRef.current.removeLayer('route');
            }
            if (mapRef.current.getSource('route')) {
                mapRef.current.removeSource('route');
            }
            routeLayerRef.current = false;
        }

        if (pickupCoords && destinationCoords) {
            const coordinates = [
                [pickupCoords.lng, pickupCoords.lat],
                ...(viaCoords || []).filter(c => c).map(c => [c.lng, c.lat]),
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

            routeLayerRef.current = true;
        }

        if (hasCoordinates) {
            mapRef.current.fitBounds(bounds, { padding: 50 });
        }
    }, [pickupCoords, destinationCoords, viaCoords]);

    return (
        <div
            ref={containerRef}
            style={{ width: "100%", height: "400px" }}
        />
    );
};

export default function Maps({ mapsApi, pickupCoords, destinationCoords, viaCoords }) {
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