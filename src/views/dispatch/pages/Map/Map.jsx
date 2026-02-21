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
import { renderToString } from "react-dom/server";
import RedCarIcon from "../../../../components/svg/RedCarIcon";
import GreenCarIcon from "../../../../components/svg/GreenCarIcon";

const GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
const BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

const svgToDataUrl = (SvgComponent, width = 40, height = 40) => {
  const svgString = renderToString(<SvgComponent width={width} height={height} />);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
};

const getMapType = () => {
  try {
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let parsed;
      try { parsed = JSON.parse(raw); } catch { continue; }
      if (!parsed || typeof parsed !== "object") continue;

      const mapsApi =
        parsed?.data?.maps_api ||
        parsed?.maps_api ||
        parsed?.tenant?.maps_api ||
        parsed?.data?.tenant?.maps_api ||
        null;

      if (mapsApi && typeof mapsApi === "string") {
        const type = mapsApi.trim().toLowerCase() === "barikoi" ? "barikoi" : "google";
        console.log(`[Map] maps_api="${mapsApi}" → using ${type}`);
        return type;
      }
    }
    console.warn("[Map] maps_api not found → defaulting to google");
    return "google";
  } catch (e) {
    console.error("[Map] getMapType error:", e);
    return "google";
  }
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

const loadBarikoiMaps = () => {
  return new Promise((resolve, reject) => {
    if (window.maplibregl) return resolve();

    if (!document.getElementById("maplibre-css")) {
      const link = document.createElement("link");
      link.id = "maplibre-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById("maplibre-script");
    if (existingScript) {
      if (window.maplibregl) {
        resolve();
      } else {
        existingScript.addEventListener("load", resolve);
        existingScript.addEventListener("error", reject);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "maplibre-script";
    script.src = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js";
    script.async = true;
    script.onload = () => resolve();
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
    const ease =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    marker.setPosition({
      lat: startLat + (endLat - startLat) * ease,
      lng: startLng + (endLng - startLng) * ease,
    });
    if (progress < 1) requestAnimationFrame(animate);
  };
  animate();
};

const parseDriverData = (rawData) => {
  try {
    if (typeof rawData === "string") return JSON.parse(rawData);
    return rawData;
  } catch {
    return null;
  }
};

const GoogleMapView = ({
  mapRef, mapInstance, markers,
  driverData, setDriverData,
  selectedStatus, socket,
  trackingBooking, setTrackingBooking,
  location, navigate,
}) => {
  const fitMapToMarkers = () => {
    if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasVisible = false;
    Object.values(markers.current).forEach((marker) => {
      if (marker.getVisible()) { bounds.extend(marker.getPosition()); hasVisible = true; }
    });
    if (hasVisible) {
      mapInstance.current.fitBounds(bounds);
      if (mapInstance.current.getZoom() > 15) mapInstance.current.setZoom(15);
    }
  };

  const createOrUpdateDriverMarker = (data, isTracked = false, currentTracking = null) => {
    if (!mapInstance.current) return;

    const driverId = data.client_id || data.dispatcher_id || data.driver_id || data.id;
    const latitude = data.latitude;
    const longitude = data.longitude;
    const drivingStatus = data.driving_status || data.status || "idle";
    const name = data.name || data.driver_name || `Driver ${driverId}`;
    const phoneNo = data.phone_no || "";
    const vehiclePlateNo = data.plate_no || "";

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) return;

    const validStatus = drivingStatus === "busy" || drivingStatus === "idle" ? drivingStatus : "idle";
    const position = { lat: Number(latitude), lng: Number(longitude) };

    setDriverData((prev) => ({
      ...prev,
      [driverId]: { ...data, position, name, driving_status: validStatus },
    }));

    const markerIcon = {
      url: validStatus === "busy" ? svgToDataUrl(GreenCarIcon, 40, 40) : svgToDataUrl(RedCarIcon, 40, 40),
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20),
    };

    const isTrackedDriver = isTracked || (currentTracking && driverId == currentTracking.driverId);

    const infoContent = `
      <div style="padding:8px;">
        <strong style="font-size:14px;">${name}</strong>
        ${isTrackedDriver ? '<span style="background:#3B82F6;color:white;padding:2px 8px;border-radius:4px;font-size:10px;margin-left:5px;font-weight:bold;">TRACKING</span>' : ""}
        <br/>
        <span style="font-size:12px;">Phone: ${phoneNo}</span><br/>
        ${vehiclePlateNo ? `<span style="font-size:12px;">Vehicle: ${vehiclePlateNo}</span><br/>` : ""}
        <span style="font-size:12px;">Status:
          <span style="color:${validStatus === "busy" ? "green" : "red"};font-weight:bold;">
            ${validStatus.toUpperCase()}
          </span>
        </span>
      </div>`;

    if (markers.current[driverId]) {
      const marker = markers.current[driverId];
      const oldPos = marker.getPosition();
      const dist = Math.sqrt(
        Math.abs(oldPos.lat() - position.lat) ** 2 +
        Math.abs(oldPos.lng() - position.lng) ** 2
      );
      if (dist < 0.01) { animateMarker(marker, position, 1000); } else { marker.setPosition(position); }
      marker.setIcon(markerIcon);
      marker.infoWindow?.setContent(infoContent);
      if (isTrackedDriver) mapInstance.current.setCenter(position);
    } else {
      const marker = new window.google.maps.Marker({
        position, map: mapInstance.current, title: name,
        icon: markerIcon, animation: window.google.maps.Animation.DROP,
      });
      const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });
      marker.addListener("click", () => {
        Object.values(markers.current).forEach((m) => m.infoWindow?.close());
        infoWindow.open(mapInstance.current, marker);
      });
      marker.infoWindow = infoWindow;
      markers.current[driverId] = marker;
      if (isTrackedDriver) {
        infoWindow.open(mapInstance.current, marker);
        mapInstance.current.setCenter(position);
        mapInstance.current.setZoom(15);
      }
    }
  };

  // Init Google Map
  useEffect(() => {
    let isMounted = true;
    loadGoogleMaps()
      .then(() => {
        if (!isMounted || !mapRef.current || mapInstance.current) return;
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 23.0225, lng: 72.5714 },
          zoom: 13,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        });
      })
      .catch((err) => console.error("Google Maps load failed:", err));
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!location.state?.trackingBookingId) return;
    const { trackingBookingId, driverId, driverName, bookingReference } = location.state;
    const tracking = { id: trackingBookingId, driverId, driverName, bookingReference };
    setTrackingBooking(tracking);
    followDriverTracking(trackingBookingId)
      .then((response) => {
        if (response.data?.success) {
          const d = response.data.data.driver;
          if (d?.latitude && d?.longitude) {
            createOrUpdateDriverMarker(
              { id: d.id, name: d.name, latitude: d.latitude, longitude: d.longitude, driving_status: d.status, phone_no: d.phone_no, plate_no: "" },
              true, tracking
            );
          }
        }
      })
      .catch(() => toast.error("Failed to start driver tracking"));
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state]);

  // Socket
  useEffect(() => {
    if (!socket) return;
    const handleDriverUpdate = (rawData) => {
      if (!mapInstance.current) return;
      const data = parseDriverData(rawData);
      if (!data) return;
      createOrUpdateDriverMarker(data, false, trackingBooking);
      if (Object.keys(markers.current).length <= 1) setTimeout(() => fitMapToMarkers(), 100);
    };
    socket.on("driver-location-update", handleDriverUpdate);
    return () => socket.off("driver-location-update", handleDriverUpdate);
  }, [socket, trackingBooking]);

  // Filter
  useEffect(() => {
    Object.entries(markers.current).forEach(([id, marker]) => {
      const driver = driverData[id];
      if (!driver) return;
      marker.setVisible(selectedStatus.value === "all" || driver.driving_status === selectedStatus.value);
    });
    setTimeout(() => fitMapToMarkers(), 100);
  }, [selectedStatus, driverData]);

  return <div ref={mapRef} className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm" />;
};

const BarikoiMapView = ({
  mapRef, mapInstance, markers,
  driverData, setDriverData,
  selectedStatus, socket,
  trackingBooking, setTrackingBooking,
  location, navigate,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const createMarkerEl = (status, isTracked = false) => {
    const color = status === "busy" ? "#22c55e" : "#ef4444";
    const el = document.createElement("div");
    el.style.cssText = `
      width:40px;height:40px;background-color:${color};border-radius:50%;
      border:${isTracked ? "3px solid #3B82F6" : "3px solid white"};
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:18px;cursor:pointer;
    `;
    el.innerHTML = "🚗";
    return el;
  };

  const fitMapToMarkers = () => {
    if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity, hasVisible = false;
    Object.values(markers.current).forEach((marker) => {
      if (marker._visible === false) return;
      const ll = marker.getLngLat();
      minLat = Math.min(minLat, ll.lat); maxLat = Math.max(maxLat, ll.lat);
      minLng = Math.min(minLng, ll.lng); maxLng = Math.max(maxLng, ll.lng);
      hasVisible = true;
    });
    if (hasVisible) {
      mapInstance.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 15 });
    }
  };

  const createOrUpdateDriverMarker = (data, isTracked = false, currentTracking = null) => {
    if (!mapInstance.current || !isLoaded) return;

    const driverId = data.client_id || data.dispatcher_id || data.driver_id || data.id;
    const latitude = data.latitude;
    const longitude = data.longitude;
    const drivingStatus = data.driving_status || data.status || "idle";
    const name = data.name || data.driver_name || `Driver ${driverId}`;
    const phoneNo = data.phone_no || "";
    const vehiclePlateNo = data.plate_no || "";

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) return;

    const validStatus = drivingStatus === "busy" || drivingStatus === "idle" ? drivingStatus : "idle";
    const position = [Number(longitude), Number(latitude)];

    setDriverData((prev) => ({
      ...prev,
      [driverId]: { ...data, position: { lat: Number(latitude), lng: Number(longitude) }, name, driving_status: validStatus },
    }));

    const isTrackedDriver = isTracked || (currentTracking && driverId == currentTracking.driverId);

    const popupHTML = `
      <div style="padding:8px;min-width:160px;">
        <strong style="font-size:14px;">${name}</strong>
        ${isTrackedDriver ? '<span style="background:#3B82F6;color:white;padding:2px 8px;border-radius:4px;font-size:10px;margin-left:5px;font-weight:bold;">TRACKING</span>' : ""}
        <br/>
        <span style="font-size:12px;">Phone: ${phoneNo}</span><br/>
        ${vehiclePlateNo ? `<span style="font-size:12px;">Vehicle: ${vehiclePlateNo}</span><br/>` : ""}
        <span style="font-size:12px;">Status:
          <span style="color:${validStatus === "busy" ? "green" : "red"};font-weight:bold;">
            ${validStatus.toUpperCase()}
          </span>
        </span>
      </div>`;

    if (markers.current[driverId]) {
      markers.current[driverId].setLngLat(position);
      const el = markers.current[driverId].getElement();
      el.style.backgroundColor = validStatus === "busy" ? "#22c55e" : "#ef4444";
      el.style.borderColor = isTrackedDriver ? "#3B82F6" : "white";
      markers.current[driverId].getPopup()?.setHTML(popupHTML);
      if (isTrackedDriver) mapInstance.current.setCenter({ lng: position[0], lat: position[1] });
    } else {
      const el = createMarkerEl(validStatus, isTrackedDriver);
      const popup = new window.maplibregl.Popup({ offset: 25 }).setHTML(popupHTML);
      const marker = new window.maplibregl.Marker({ element: el })
        .setLngLat(position)
        .setPopup(popup)
        .addTo(mapInstance.current);
      marker._visible = true;
      markers.current[driverId] = marker;
      if (isTrackedDriver) {
        popup.addTo(mapInstance.current);
        mapInstance.current.flyTo({ center: position, zoom: 15 });
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    loadBarikoiMaps()
      .then(() => {
        if (!isMounted || !mapRef.current || mapInstance.current) return;

        mapInstance.current = new window.maplibregl.Map({
          container: mapRef.current,
          style: `https://map.barikoi.com/styles/barikoi-light/style.json?key=${BARIKOI_KEY}`,
          // center: [72.5714, 23.0225],
          // zoom: 13,
        });

        mapInstance.current.addControl(new window.maplibregl.NavigationControl());

        mapInstance.current.on("load", () => {
          if (isMounted) {
            mapInstance.current.resize();
            setIsLoaded(true);
          }
        });
      })
      .catch((err) => console.error("Barikoi Maps load failed:", err));

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        Object.values(markers.current).forEach((m) => m.remove());
        markers.current = {};
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!location.state?.trackingBookingId || !isLoaded) return;
    const { trackingBookingId, driverId, driverName, bookingReference } = location.state;
    const tracking = { id: trackingBookingId, driverId, driverName, bookingReference };
    setTrackingBooking(tracking);
    followDriverTracking(trackingBookingId)
      .then((response) => {
        if (response.data?.success) {
          const d = response.data.data.driver;
          if (d?.latitude && d?.longitude) {
            createOrUpdateDriverMarker(
              { id: d.id, name: d.name, latitude: d.latitude, longitude: d.longitude, driving_status: d.status, phone_no: d.phone_no, plate_no: "" },
              true, tracking
            );
          }
        }
      })
      .catch(() => toast.error("Failed to start driver tracking"));
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, isLoaded]);

  // Socket
  useEffect(() => {
    if (!socket || !isLoaded) return;
    const handleDriverUpdate = (rawData) => {
      if (!mapInstance.current) return;
      const data = parseDriverData(rawData);
      if (!data) return;
      createOrUpdateDriverMarker(data, false, trackingBooking);
      if (Object.keys(markers.current).length <= 1) setTimeout(() => fitMapToMarkers(), 100);
    };
    socket.on("driver-location-update", handleDriverUpdate);
    return () => socket.off("driver-location-update", handleDriverUpdate);
  }, [socket, isLoaded, trackingBooking]);

  // Filter
  useEffect(() => {
    Object.entries(markers.current).forEach(([id, marker]) => {
      const driver = driverData[id];
      if (!driver) return;
      const visible = selectedStatus.value === "all" || driver.driving_status === selectedStatus.value;
      marker._visible = visible;
      marker.getElement().style.display = visible ? "flex" : "none";
    });
    setTimeout(() => fitMapToMarkers(), 100);
  }, [selectedStatus, driverData]);

  return <div ref={mapRef} className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm" />;
};

const Map = () => {
  const [selectedStatus, setSelectedStatus] = useState(
    MAP_STATUS_OPTIONS.find((o) => o.value === "all") ?? MAP_STATUS_OPTIONS[0]
  );
  const [driverData, setDriverData] = useState({});
  const [trackingBooking, setTrackingBooking] = useState(null);
  const [mapType] = useState(() => getMapType());

  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});

  const sharedProps = {
    mapRef, mapInstance, markers,
    driverData, setDriverData,
    selectedStatus, socket,
    trackingBooking, setTrackingBooking,
    location, navigate,
  };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <PageTitle title="Map" />
        <PageSubTitle title="Driver Location & Aerial View" />
      </div>

      <CardContainer className="p-4 bg-[#F5F5F5]">
        {/* Top bar */}
        <div className="flex flex-row items-center gap-3 sm:gap-5 justify-between mb-4 pb-4">
          {trackingBooking && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-blue-700 font-medium">
                Tracking: {trackingBooking.driverName || `Driver #${trackingBooking.driverId}`}
              </span>
              <button
                onClick={() => setTrackingBooking(null)}
                className="text-blue-400 hover:text-blue-600 ml-1 text-lg leading-none"
              >
                ×
              </button>
            </div>
          )}
          <div className="md:flex flex-row gap-3 sm:gap-5 w-full sm:w-auto justify-end">
            <CustomSelect
              variant={2}
              options={MAP_STATUS_OPTIONS}
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder="Driver Status"
            />
          </div>
        </div>

        {mapType === "barikoi" ? (
          <BarikoiMapView {...sharedProps} />
        ) : (
          <GoogleMapView {...sharedProps} />
        )}

        {/* Legend */}
        <div className="flex justify-center gap-10 flex-wrap py-4 mt-3 border-t">
          <div className="flex items-center gap-2">
            <RedCarIcon width={30} height={30} />
            <span className="text-sm font-medium">Idle Drivers</span>
          </div>
          <div className="flex items-center gap-2">
            <GreenCarIcon width={30} height={30} />
            <span className="text-sm font-medium">Active Drivers</span>
          </div>
        </div>
      </CardContainer>
    </div>
  );
};

export default Map;