import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../../../../components/routes/SocketProvider";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle";
import CardContainer from "../../../../components/shared/CardContainer";
import CustomSelect from "../../../../components/ui/CustomSelect";
import { MAP_STATUS_OPTIONS } from "../../../../constants/selectOptions";
import toast from "react-hot-toast";
import { followDriverTracking } from "../../../../services/AddBookingServices";

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
  const [selectedStatus, setSelectedStatus] = useState(
    MAP_STATUS_OPTIONS.find((o) => o.value === "all") ?? MAP_STATUS_OPTIONS[0]
  );

  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});
  const [driverData, setDriverData] = useState({});
  const [trackingBooking, setTrackingBooking] = useState(null);

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

  useEffect(() => {
    if (location.state?.trackingBookingId) {
      const { trackingBookingId, driverId, driverName, bookingReference } = location.state;

      console.log("Starting driver tracking for booking:", trackingBookingId);

      setTrackingBooking({
        id: trackingBookingId,
        driverId,
        driverName,
        bookingReference
      });

      startDriverTracking(trackingBookingId);

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const startDriverTracking = async (bookingId) => {
    try {
      const response = await followDriverTracking(bookingId);

      if (response.data?.success) {
        console.log("Driver tracking started:", response.data);

        const driverData = response.data.data.driver;

        if (driverData.latitude && driverData.longitude && mapInstance.current) {
          const position = {
            lat: Number(driverData.latitude),
            lng: Number(driverData.longitude)
          };

          mapInstance.current.setCenter(position);
          mapInstance.current.setZoom(15);

          createOrUpdateDriverMarker({
            id: driverData.id,
            name: driverData.name,
            latitude: driverData.latitude,
            longitude: driverData.longitude,
            driving_status: driverData.status,
            phone_no: driverData.phone_no,
            plate_no: "",
          }, true);

          // toast.success(`Now tracking ${driverData.name}`);
        }
      }
    } catch (error) {
      console.error("Error starting driver tracking:", error);
      toast.error("Failed to start driver tracking");
    }
  };

  const createOrUpdateDriverMarker = (data, isTracked = false) => {
    if (!mapInstance.current) return;

    const driverId = data.id;
    const latitude = data.latitude;
    const longitude = data.longitude;
    const drivingStatus = data.driving_status || data.status || 'idle';
    const name = data.name || `Driver ${driverId}`;
    const phoneNo = data.phone_no || "";
    const vehiclePlateNo = data.plate_no || "";

    if (!latitude || !longitude) {
      console.warn("No location data");
      return;
    }

    const validStatus = (drivingStatus === 'busy' || drivingStatus === 'idle')
      ? drivingStatus
      : 'idle';

    const position = {
      lat: Number(latitude),
      lng: Number(longitude),
    };

    setDriverData((prev) => ({
      ...prev,
      [driverId]: { ...data, position, name, status: validStatus },
    }));

    const isTrackedDriver = trackingBooking && driverId === trackingBooking.driverId;

    let markerIcon;
    if (validStatus === 'busy') {
      markerIcon = MARKER_ICONS.busy;
    } else {
      markerIcon = MARKER_ICONS.idle;
    }

    if (isTrackedDriver || isTracked) {
      markerIcon = {
        url: validStatus === 'busy' ? MARKER_ICONS.busy : MARKER_ICONS.idle,
        scaledSize: new window.google.maps.Size(40, 40),
      };
    }

    if (markers.current[driverId]) {
      const marker = markers.current[driverId];
      const oldPosition = marker.getPosition();
      const oldLat = oldPosition.lat();
      const oldLng = oldPosition.lng();

      const latDiff = Math.abs(oldLat - position.lat);
      const lngDiff = Math.abs(oldLng - position.lng);
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      if (distance < 0.01) {
        animateMarker(marker, position, 1000);
      } else {
        marker.setPosition(position);
      }

      marker.setIcon(markerIcon);

      if (isTrackedDriver && mapInstance.current) {
        mapInstance.current.setCenter(position);
      }

      if (marker.infoWindow) {
        marker.infoWindow.setContent(`
          <div style="padding: 8px;">
            <strong style="font-size: 14px;">${name}</strong>
            <br/>
            <span style="font-size: 12px;">Phone: ${phoneNo}</span><br/>
          </div>
        `);
      }
    } else {
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstance.current,
        title: name,
        icon: markerIcon,
        animation: window.google.maps.Animation.DROP,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <strong style="font-size: 14px;">${name}</strong>
            ${isTrackedDriver || isTracked ? '<span style="background: #3B82F6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 5px; font-weight: bold;">TRACKING</span>' : ''}
            <br/>
            <span style="font-size: 12px;">Phone: ${phoneNo}</span><br/>
            ${vehiclePlateNo ? `<span style="font-size: 12px;">Vehicle: ${vehiclePlateNo}</span><br/>` : ''}
            <span style="font-size: 12px;">Status: 
              <span style="color: ${validStatus === 'busy' ? 'green' : 'red'}; font-weight: bold;">
                ${validStatus.toUpperCase()}
              </span>
            </span>
          </div>
        `,
      });

      marker.addListener("click", () => {
        Object.values(markers.current).forEach((m) => {
          if (m.infoWindow) m.infoWindow.close();
        });
        infoWindow.open(mapInstance.current, marker);
      });

      marker.infoWindow = infoWindow;
      markers.current[driverId] = marker;

      if (isTrackedDriver || isTracked) {
        infoWindow.open(mapInstance.current, marker);
      }
    }
  };

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

      let data;
      try {
        if (typeof rawData === 'string') {
          data = JSON.parse(rawData);
        } else {
          data = rawData;
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
        return;
      }

      createOrUpdateDriverMarker(data);
      updateMarkerVisibility();

      if (Object.keys(markers.current).length <= 1) {
        setTimeout(() => fitMapToMarkers(), 100);
      }
    };

    socket.on("driver-location-update", handleDriverUpdate);

    return () => {
      socket.off("driver-location-update", handleDriverUpdate);
    };
  }, [socket, selectedStatus, trackingBooking]);

  const updateMarkerVisibility = () => {
    Object.entries(markers.current).forEach(([driverId, marker]) => {
      const driver = driverData[driverId];
      if (!driver) return;

      let visible = true;

      if (selectedStatus.value !== "all") {
        visible = driver.status === selectedStatus.value;
      }

      marker.setVisible(visible);
    });
  };

  useEffect(() => {
    updateMarkerVisibility();
    setTimeout(() => fitMapToMarkers(), 100);
  }, [selectedStatus, driverData]);

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <PageTitle title="Map" />
        <PageSubTitle title="Driver Location & Aerial View" />
      </div>

      <CardContainer className="p-4 bg-[#F5F5F5]">
        <div className="flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 justify-end mb-4 sm:mb-0 pb-4">
          <div className="md:flex flex-row gap-3 sm:gap-5 w-full sm:w-auto">
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