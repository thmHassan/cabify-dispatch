import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../../../../components/routes/SocketProvider";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle";
import SearchBar from "../../../../components/shared/SearchBar/SearchBar";
import CardContainer from "../../../../components/shared/CardContainer";
import CustomSelect from "../../../../components/ui/CustomSelect";
import { STATUS_OPTIONS } from "../../../../constants/selectOptions";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MARKER_ICONS = {
  online: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  offline: "https://maps.google.com/mapfiles/ms/icons/grey-dot.png",
  active: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  pending: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
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

const Map = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(
    STATUS_OPTIONS.find((o) => o.value === "all") ?? STATUS_OPTIONS[0]
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

    const handleDriverUpdate = (data) => {
      if (!mapInstance.current) {
        console.warn("Map not initialized yet");
        return;
      }

      console.log("Received driver-location-update:", data);

      let driver_id, latitude, longitude, status, name;

      if (typeof data === 'object' && !Array.isArray(data)) {
        // Your backend sends latitude/longitude swapped, so we need to swap them back
        driver_id = data.driver_id;
        // SWAPPING: Your backend's "latitude" is actually longitude and vice versa
        latitude = data.longitude;  // Backend's longitude is actual latitude
        longitude = data.latitude;  // Backend's latitude is actual longitude
        status = data.status || "online";
        name = data.name || `Driver ${driver_id}`;
      }

      if (!latitude || !longitude) {
        console.warn("❌ Could not extract location from data");
        return;
      }

      // Ensure driver_id exists
      if (!driver_id) {
        driver_id = `driver_${Date.now()}`;
      }

      console.log("✅ Corrected coordinates:", { driver_id, latitude, longitude, status });

      const position = {
        lat: Number(latitude),
        lng: Number(longitude),
      };

      // Store driver data for filtering
      setDriverData((prev) => ({
        ...prev,
        [driver_id]: { ...data, position },
      }));

      // Determine marker icon based on status
      let markerIcon = MARKER_ICONS.online;
      if (status === "offline") markerIcon = MARKER_ICONS.offline;
      else if (status === "active" || status === "on_ride") markerIcon = MARKER_ICONS.active;
      else if (status === "pending") markerIcon = MARKER_ICONS.pending;

      if (markers.current[driver_id]) {
        markers.current[driver_id].setPosition(position);
        markers.current[driver_id].setIcon(markerIcon);
        console.log(`Updated driver ${driver_id} to:`, position);
      } else {
        const marker = new window.google.maps.Marker({
          position,
          map: mapInstance.current,
          title: name || `Driver ${driver_id}`,
          icon: markerIcon,
          animation: window.google.maps.Animation.DROP,
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <strong>${name || `Driver ${driver_id}`}</strong><br/>
              Status: <span style="text-transform: capitalize;">${status || 'online'}</span><br/>
              Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
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
        markers.current[driver_id] = marker;
        console.log(`Created marker for driver ${driver_id} at:`, position);
      }

      // Apply filter based on selected status
      updateMarkerVisibility();

      // Auto-fit map to show all markers
      setTimeout(() => fitMapToMarkers(), 100);
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
          driver.driver_id?.toString().includes(query);
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
        <div className="flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 justify-between mb-4 sm:mb-0 pb-4">
          <div className="md:w-full w-[calc(100%-54px)] sm:flex-1">
            <SearchBar
              value={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search by driver name or ID..."
              className="max-w-[400px]"
            />
          </div>
          <div className="hidden md:flex flex-row gap-3 sm:gap-5 w-full sm:w-auto">
            <CustomSelect
              variant={2}
              options={STATUS_OPTIONS}
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
            <span className="w-4 h-4 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Online Drivers</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-gray-500" />
            <span className="text-sm font-medium">Offline Drivers</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-600" />
            <span className="text-sm font-medium">Active Ride</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-yellow-500" />
            <span className="text-sm font-medium">Ride Pending</span>
          </div>
        </div>
      </CardContainer>
    </div>
  );
};

export default Map;