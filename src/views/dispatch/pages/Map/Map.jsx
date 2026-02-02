import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../../../../components/routes/SocketProvider";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle";
import SearchBar from "../../../../components/shared/SearchBar/SearchBar";
import CardContainer from "../../../../components/shared/CardContainer";
import CustomSelect from "../../../../components/ui/CustomSelect";
import { MAP_STATUS_OPTIONS } from "../../../../constants/selectOptions";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MARKER_ICONS = {
  idle: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  busy: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
};

const loadGoogleMaps = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve();

    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      existingScript.onload = resolve;
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
};

const animateMarker = (marker, newPosition, duration = 1000) => {
  const startPosition = marker.getPosition();
  const startLat = startPosition.lat();
  const startLng = startPosition.lng();
  const endLat = newPosition.lat;
  const endLng = newPosition.lng;

  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function for smooth animation (ease-in-out)
    const easeProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const currentLat = startLat + (endLat - startLat) * easeProgress;
    const currentLng = startLng + (endLng - startLng) * easeProgress;

    marker.setPosition({ lat: currentLat, lng: currentLng });

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  animate();
};

const Map = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(
    MAP_STATUS_OPTIONS.find((o) => o.value === "all") ?? MAP_STATUS_OPTIONS[0]
  );

  const socket = useSocket();

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});
  const [driverData, setDriverData] = useState({});

  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then(() => {
        if (!isMounted || !mapRef.current) return;

        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 23.0225, lng: 72.5714 },
          zoom: 13,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        console.log("Google Maps initialized");
      })
      .catch((err) => console.error("Google Maps load failed:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const fitMapToMarkers = () => {
    if (!mapInstance.current || Object.keys(markers.current).length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasVisibleMarkers = false;

    Object.values(markers.current).forEach((marker) => {
      if (marker.getVisible()) {
        bounds.extend(marker.getPosition());
        hasVisibleMarkers = true;
      }
    });

    if (hasVisibleMarkers) {
      mapInstance.current.fitBounds(bounds);

      // Prevent zooming in too much for single marker
      const zoom = mapInstance.current.getZoom();
      if (zoom > 15) {
        mapInstance.current.setZoom(15);
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleDriverUpdate = (rawData) => {
      if (!mapInstance.current) {
        console.warn("Map not initialized yet");
        return;
      }

      console.log("Received driver-location-update:", rawData);

      // Parse JSON string if needed
      let data;
      try {
        if (typeof rawData === 'string') {
          data = JSON.parse(rawData);
          console.log("✅ Parsed JSON data:", data);
        } else {
          data = rawData;
        }
      } catch (error) {
        console.error("❌ Failed to parse JSON:", error);
        return;
      }

      // Log the full data structure to debug
      console.log("Full data object:", JSON.stringify(data, null, 2));

      // Extract driver ID from the new data structure
      const driverId = data?.id;
      const latitude = data?.latitude;
      const longitude = data?.longitude;
      const drivingStatus = data?.driving_status; // This should be "busy" or "idle"
      const name = data?.name || `Driver ${driverId}`;
      const phoneNo = data?.phone_no || "";
      const vehiclePlateNo = data?.plate_no || "";

      console.log("Extracted values:", {
        driverId,
        latitude,
        longitude,
        drivingStatus,
        name,
        rawDrivingStatus: data?.driving_status,
        allKeys: Object.keys(data || {})
      });

      // Validate that we have the required data
      if (!driverId && driverId !== 0) {
        console.warn("❌ No driver ID found in data");
        return;
      }

      if (!latitude || !longitude) {
        console.warn("❌ Could not extract location from data");
        return;
      }

      // If driving_status is not present or not valid, use a default
      const validStatus = (drivingStatus === 'busy' || drivingStatus === 'idle')
        ? drivingStatus
        : 'idle'; // default to idle if status is missing or invalid

      if (!drivingStatus) {
        console.warn("⚠️ No driving_status found in data, using default 'idle'");
      } else if (drivingStatus !== 'busy' && drivingStatus !== 'idle') {
        console.warn(`⚠️ Invalid driving_status '${drivingStatus}', using default 'idle'`);
      }

      console.log("✅ Processing driver:", { driverId, latitude, longitude, drivingStatus: validStatus });

      const position = {
        lat: Number(latitude),
        lng: Number(longitude),
      };

      // Store driver data for filtering
      setDriverData((prev) => ({
        ...prev,
        [driverId]: { ...data, position, name, status: validStatus },
      }));

      // Determine marker icon based on driving_status
      const markerIcon = MARKER_ICONS[validStatus] || MARKER_ICONS.idle;

      if (markers.current[driverId]) {
        // Update existing marker with smooth animation
        const marker = markers.current[driverId];
        const oldPosition = marker.getPosition();
        const oldLat = oldPosition.lat();
        const oldLng = oldPosition.lng();

        // Calculate distance between old and new position
        const latDiff = Math.abs(oldLat - position.lat);
        const lngDiff = Math.abs(oldLng - position.lng);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        // Only animate if distance is small (to avoid long animations across the map)
        // 0.01 degrees is roughly 1 km
        if (distance < 0.01) {
          animateMarker(marker, position, 1000); // 1 second smooth animation
        } else {
          // For large jumps, just set position directly
          marker.setPosition(position);
        }

        marker.setIcon(markerIcon);

        // Update info window content
        if (marker.infoWindow) {
          marker.infoWindow.setContent(`
            <div style="padding: 5px;">
              <strong>${name}</strong><br/>
              Phone: ${phoneNo}<br/>
              Vehicle: ${vehiclePlateNo}<br/>
            </div>
          `);
        }

        console.log(`✅ Animated driver ${driverId} to:`, position);
      } else {
        // Create new marker
        const marker = new window.google.maps.Marker({
          position,
          map: mapInstance.current,
          title: name,
          icon: markerIcon,
          animation: window.google.maps.Animation.DROP,
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 5px;">
              <strong>${name}</strong><br/>
              Phone: ${phoneNo}<br/>
              Vehicle: ${vehiclePlateNo}<br/>
            </div>
          `,
        });

        marker.addListener("click", () => {
          // Close all other info windows
          Object.values(markers.current).forEach((m) => {
            if (m.infoWindow) m.infoWindow.close();
          });
          infoWindow.open(mapInstance.current, marker);
        });

        marker.infoWindow = infoWindow;
        markers.current[driverId] = marker;
        console.log(`✅ Created marker for driver ${driverId} at:`, position);
      }

      // Apply filter based on selected status
      updateMarkerVisibility();

      // Auto-fit map to show all markers (only on first marker)
      if (Object.keys(markers.current).length <= 1) {
        setTimeout(() => fitMapToMarkers(), 100);
      }
    };

    socket.on("driver-location-update", handleDriverUpdate);

    return () => {
      socket.off("driver-location-update", handleDriverUpdate);
    };
  }, [socket, selectedStatus, searchQuery]);

  const updateMarkerVisibility = () => {
    Object.entries(markers.current).forEach(([driverId, marker]) => {
      const driver = driverData[driverId];
      if (!driver) return;

      let visible = true;

      if (selectedStatus.value !== "all") {
        visible = driver.status === selectedStatus.value;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          driver.name?.toLowerCase().includes(query) ||
          driverId.toString().includes(query);
        visible = visible && matchesSearch;
      }

      marker.setVisible(visible);
    });
  };

  useEffect(() => {
    updateMarkerVisibility();
    setTimeout(() => fitMapToMarkers(), 100);
  }, [selectedStatus, searchQuery, driverData]);

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <PageTitle title="Map" />
        <PageSubTitle title="Driver Location & Aerial View" />
      </div>

      <CardContainer className="p-4 bg-[#F5F5F5]">
        <div className="flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 justify-end mb-4 sm:mb-0 pb-4">
          <div className=" md:flex flex-row gap-3 sm:gap-5 w-full sm:w-auto">
            <CustomSelect
              variant={2}
              options={MAP_STATUS_OPTIONS}
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder="Driver Status"
            />
          </div>
        </div>

        <div
          ref={mapRef}
          className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm"
        />

        <div className="flex justify-center gap-10 flex-wrap py-4 mt-3 border-t">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500" />
            <span className="text-sm font-medium">Idle Drivers</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Busy Drivers</span>
          </div>
        </div>
      </CardContainer>
    </div>
  );
};

export default Map;