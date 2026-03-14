import React, { useEffect, useRef, useState } from "react";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
import Button from "../../../../components/ui/Button/Button";
import PlusIcon from "../../../../components/svg/PlusIcon";
import { lockBodyScroll } from "../../../../utils/functions/common.function";
import Modal from "../../../../components/shared/Modal/Modal";
import OverViewDetails from "./components/OverviewDetails";
import AddBooking from "./components/AddBooking";
import { useSocket } from "../../../../components/routes/SocketProvider";
import TodayBookingIcon from "../../../../components/svg/TodayBookingIcon";
import PreBookingIcon from "../../../../components/svg/PreBookingIcon";
import NoShowIcon from "../../../../components/svg/NoShowIcon";
import CancelledIcon from "../../../../components/svg/CancelledIcon";
import { useAppSelector } from "../../../../store";
import { apiGetDispatchSystem } from "../../../../services/SettingsConfigurationServices";
import { getDashboardCards } from "../../../../services/AddBookingServices";
import CallQueueModel from "./components/CallQueueModel/CallQueueModel";
import RedCarIcon from "../../../../components/svg/RedCarIcon";
import GreenCarIcon from "../../../../components/svg/GreenCarIcon";
import { renderToString } from "react-dom/server";
import { getTenantData } from "../../../../utils/functions/tokenEncryption";

const GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
const BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

// ─── Global notification pub/sub (outside component — never re-creates) ───────
const notifListeners = new Set();
const showRideNotification = (data) => notifListeners.forEach((fn) => fn(data));

const formatCoord = (str) => {
  if (!str) return "—";
  const [lat, lng] = str.split(",").map((s) => parseFloat(s.trim()));
  if (isNaN(lat) || isNaN(lng)) return str;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

const formatAmount = (val) => {
  if (!val) return "—";
  const num = parseFloat(val);
  return isNaN(num) ? val : `৳${num.toLocaleString()}`;
};

const NotifRow = ({ icon, label, value, color, bold }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
    <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
    <div style={{ minWidth: 0 }}>
      <span style={{
        fontSize: "10px", color: "#6b7280", display: "block",
        textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1, marginBottom: "2px",
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "12px", color: color || "#111827",
        fontWeight: bold ? 700 : 500, wordBreak: "break-word", lineHeight: 1.4,
      }}>
        {value || "—"}
      </span>
    </div>
  </div>
);

const RideCard = ({ data, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => handleClose(), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(onClose, 350);
  };

  return (
    <>
      <style>{`
        @keyframes rideNotifShrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes rideNotifPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(31,65,187,0.25); }
          50%       { box-shadow: 0 0 0 6px rgba(31,65,187,0); }
        }
      `}</style>
      <div
        style={{
          transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(110%) scale(0.95)",
          opacity: visible && !leaving ? 1 : 0,
          transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.35s ease",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 12px 40px rgba(31,65,187,0.18), 0 2px 12px rgba(0,0,0,0.08)",
          border: "1.5px solid #e0e7ff",
          width: "320px",
          overflow: "hidden",
          marginBottom: "12px",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          animation: "rideNotifPulse 2s ease-in-out 3",
        }}
      >
        <div style={{
          background: "linear-gradient(135deg, #1F41BB 0%, #3a5fd9 100%)",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>
                New Ride Request
              </div>
              {data.booking_id && (
                <div style={{ color: "#c7d4ff", fontSize: "11px", marginTop: "2px", fontWeight: 500 }}>
                  #{data.booking_id}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "50%",
              width: "28px", height: "28px",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: "13px",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.32)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "14px 16px 10px" }}>
          <NotifRow label="Pickup" value={data.pickup_location || formatCoord(data.pickup_point)} color="#16a34a" />
          <NotifRow label="Destination" value={data.destination_location || formatCoord(data.destination_point)} color="#dc2626" />
          {data.offered_amount && (
            <NotifRow label="Offered Amount" value={formatAmount(data.offered_amount)} color="#1F41BB" bold />
          )}
        </div>

        <div style={{ padding: "0 16px 12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {data.payment_method && (
            <span style={{
              background: "#eff6ff", color: "#1F41BB",
              fontSize: "10px", fontWeight: 600,
              padding: "3px 8px", borderRadius: "20px",
              border: "1px solid #bfdbfe",
            }}>
              {data.payment_method}
            </span>
          )}
          {data.ride_type && (
            <span style={{
              background: "#f0fdf4", color: "#16a34a",
              fontSize: "10px", fontWeight: 600,
              padding: "3px 8px", borderRadius: "20px",
              border: "1px solid #bbf7d0",
            }}>
              {data.ride_type}
            </span>
          )}
        </div>

        <div style={{ height: "3px", background: "#e0e7ff", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: 0, left: 0, height: "100%",
            background: "linear-gradient(90deg, #1F41BB, #60a5fa)",
            animation: "rideNotifShrink 8s linear forwards",
          }} />
        </div>
      </div>
    </>
  );
};

const RideNotificationContainer = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handler = (data) => {
      const id = Date.now() + Math.random();
      setNotifications((prev) => [...prev, { id, data }]);
    };
    notifListeners.add(handler);
    return () => notifListeners.delete(handler);
  }, []); // ← empty deps: registers once, never re-registers

  const remove = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <div style={{
      position: "fixed",
      bottom: "80px",
      right: "20px",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column-reverse",
      alignItems: "flex-end",
      pointerEvents: "none",
    }}>
      {notifications.map(({ id, data }) => (
        <div key={id} style={{ pointerEvents: "auto" }}>
          <RideCard data={data} onClose={() => remove(id)} />
        </div>
      ))}
    </div>
  );
};

const svgToDataUrl = (SvgComponent, width = 40, height = 40) => {
  const svgString = renderToString(<SvgComponent width={width} height={height} />);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
};

const MARKER_ICONS = {
  idle: {
    url: svgToDataUrl(RedCarIcon, 40, 40),
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 },
  },
  busy: {
    url: svgToDataUrl(GreenCarIcon, 40, 40),
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 },
  },
};

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

const CARD_CONFIG = [
  { label: "TODAY'S BOOKING", filter: "todays_booking", countKey: "todaysBooking", icon: TodayBookingIcon },
  { label: "PRE BOOKINGS", filter: "pre_bookings", countKey: "preBookings", icon: PreBookingIcon },
  { label: "RECENT JOBS", filter: "recent_jobs", countKey: "recentJobs", icon: TodayBookingIcon },
  { label: "COMPLETED", filter: "completed", countKey: "completed", icon: TodayBookingIcon },
  { label: "NO SHOW", filter: "no_show", countKey: "noShow", icon: NoShowIcon },
  { label: "CANCELLED", filter: "cancelled", countKey: "cancelled", icon: CancelledIcon },
];

const getMapType = () => {
  const tenant = getTenantData();
  const data = tenant?.data || {};
  const mapsApi = data?.maps_api?.trim().toLowerCase();
  const countryOfUse = data?.country_of_use?.trim().toUpperCase();
  if (mapsApi === "barikoi") return "barikoi";
  if (mapsApi === "google") return "google";
  if (countryOfUse === "BD") return "barikoi";
  return "google";
};

const getApiKeys = () => {
  const tenant = getTenantData();
  const data = tenant?.data || {};
  return {
    googleKey: data?.google_api_key || GOOGLE_KEY,
    barikoiKey: data?.barikoi_api_key || BARIKOI_KEY,
  };
};

const getCountryCenter = () => {
  const tenant = getTenantData();
  const code = tenant?.data?.country_of_use?.trim().toUpperCase();
  return COUNTRY_CENTERS[code] || COUNTRY_CENTERS.DEFAULT;
};

const loadGoogleMaps = (apiKey) => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();
    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google Maps failed"));
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
    const existing = document.getElementById("maplibre-script");
    if (existing) {
      if (window.maplibregl) return resolve();
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "maplibre-script";
    script.src = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("MapLibre GL failed"));
    document.head.appendChild(script);
  });
};

const makeGoogleIcon = (status) => {
  const icon = MARKER_ICONS[status] || MARKER_ICONS.idle;
  return {
    url: icon.url,
    scaledSize: new window.google.maps.Size(icon.scaledSize.width, icon.scaledSize.height),
    anchor: new window.google.maps.Point(icon.anchor.x, icon.anchor.y),
  };
};

const createSvgMarkerEl = (status) => {
  const icon = MARKER_ICONS[status] || MARKER_ICONS.idle;
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: `${icon.scaledSize.width}px`,
    height: `${icon.scaledSize.height}px`,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
  const img = document.createElement("img");
  img.src = icon.url;
  Object.assign(img.style, {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
  });
  el.appendChild(img);
  return el;
};

const animateMarker = (marker, newPosition, duration = 1000) => {
  const start = marker.getPosition();
  const startLat = start.lat(), startLng = start.lng();
  const endLat = newPosition.lat, endLng = newPosition.lng;
  const startTime = Date.now();
  const tick = () => {
    const progress = Math.min((Date.now() - startTime) / duration, 1);
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    marker.setPosition({
      lat: startLat + (endLat - startLat) * ease,
      lng: startLng + (endLng - startLng) * ease,
    });
    if (progress < 1) requestAnimationFrame(tick);
  };
  tick();
};

const parseDriverData = (rawData) => {
  try {
    if (typeof rawData === "string") return JSON.parse(rawData);
    return rawData;
  } catch {
    return null;
  }
};

const buildPopupHTML = (name) => `
  <div style="padding:6px 10px;font-weight:600;font-size:14px;">
    ${name}
  </div>`;

const GoogleMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter }) => {
  const { googleKey } = getApiKeys();

  const fitMapToMarkers = () => {
    if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasVisible = false;
    Object.values(markers.current).forEach((m) => {
      if (m.getVisible()) { bounds.extend(m.getPosition()); hasVisible = true; }
    });
    if (hasVisible) {
      mapInstance.current.fitBounds(bounds);
      if (mapInstance.current.getZoom() > 15) mapInstance.current.setZoom(15);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps(googleKey)
      .then(() => {
        if (!mounted || !mapRef.current || mapInstance.current) return;
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: countryCenter.lat, lng: countryCenter.lng },
          zoom: 5,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        });
      })
      .catch((err) => console.error("Google Map load failed:", err));
    return () => { mounted = false; };
  }, []);

  // ─── KEY FIX: socketRef keeps stable reference — never causes useEffect re-run ───
  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  useEffect(() => {
    // Use socketRef.current inside the handler so we always have latest socket
    // but the effect itself only runs ONCE (empty deps after mount)
    const handle = (rawData) => {
      if (!mapInstance.current) return;
      const data = parseDriverData(rawData);
      if (!data) return;
      const driverId = data?.id;
      const latitude = data?.latitude;
      const longitude = data?.longitude;
      const status = data?.driving_status || "idle";
      const validStatus = status === "busy" ? "busy" : "idle";
      const name = data?.name || `Driver ${driverId}`;
      if (!driverId && driverId !== 0) return;
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) return;
      const position = { lat: Number(latitude), lng: Number(longitude) };
      setDriverData((prev) => ({ ...prev, [driverId]: { ...data, position, name, status: validStatus } }));
      const infoContent = buildPopupHTML(name);
      if (markers.current[driverId]) {
        const marker = markers.current[driverId];
        const oldPos = marker.getPosition();
        const dist = Math.sqrt((oldPos.lat() - position.lat) ** 2 + (oldPos.lng() - position.lng) ** 2);
        dist < 0.01 ? animateMarker(marker, position, 1000) : marker.setPosition(position);
        marker.setIcon(makeGoogleIcon(validStatus));
        marker.infoWindow?.setContent(infoContent);
      } else {
        const marker = new window.google.maps.Marker({
          position,
          map: mapInstance.current,
          title: name,
          icon: makeGoogleIcon(validStatus),
          animation: window.google.maps.Animation.DROP,
        });
        const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });
        marker.addListener("click", () => {
          Object.values(markers.current).forEach((m) => m.infoWindow?.close());
          infoWindow.open(mapInstance.current, marker);
        });
        marker.infoWindow = infoWindow;
        markers.current[driverId] = marker;
      }
      Object.values(markers.current).forEach((m) => m.setVisible(true));
      if (Object.keys(markers.current).length <= 1) setTimeout(fitMapToMarkers, 100);
    };

    // Attach to socket only once
    const attachListener = () => {
      if (socketRef.current) {
        socketRef.current.on("driver-location-update", handle);
      }
    };

    attachListener();

    // Cleanup: remove listener from current socket
    return () => {
      if (socketRef.current) {
        socketRef.current.off("driver-location-update", handle);
      }
    };
  }, []); // ← EMPTY DEPS: registers once, never torn down by re-renders

  useEffect(() => {
    Object.values(markers.current).forEach((m) => m.setVisible(true));
    setTimeout(fitMapToMarkers, 100);
  }, [driverData]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />;
};

const BarikoiMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter }) => {
  const [mapReady, setMapReady] = useState(false);
  const { barikoiKey } = getApiKeys();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try { await loadBarikoiMaps(); }
      catch (err) { console.error("Barikoi load failed:", err); return; }
      if (!mounted || !mapRef.current || mapInstance.current) return;
      const center = getCountryCenter();
      mapRef.current.style.width = "100%";
      mapRef.current.style.height = "100%";
      mapRef.current.style.minHeight = "400px";
      const map = new window.maplibregl.Map({
        container: mapRef.current,
        style: `https://map.barikoi.com/styles/barikoi-light/style.json?key=${BARIKOI_KEY}`,
        center: [center.lng, center.lat],
        zoom: 5,
      });
      map.addControl(new window.maplibregl.NavigationControl(), "top-right");
      map.on("load", () => { map.resize(); setMapReady(true); });
      map.on("error", (e) => console.error("Barikoi map error:", e.error?.message || e));
      map.on("styledata", () => map.resize());
      mapInstance.current = map;
    };
    init();
    return () => {
      mounted = false;
      if (mapInstance.current) {
        Object.values(markers.current).forEach((m) => m.remove());
        markers.current = {};
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => { if (mapInstance.current) mapInstance.current.resize(); };
    window.addEventListener("resize", handleResize);
    const raf = requestAnimationFrame(() => { if (mapInstance.current) mapInstance.current.resize(); });
    return () => { window.removeEventListener("resize", handleResize); cancelAnimationFrame(raf); };
  }, [mapReady]);

  // ─── KEY FIX: same socketRef pattern ──────────────────────────────────────
  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  useEffect(() => {
    if (!mapReady) return;

    const handle = (rawData) => {
      if (!mapInstance.current) return;
      const data = parseDriverData(rawData);
      if (!data?.latitude || !data?.longitude) return;
      const driverId = data.id;
      if (!driverId && driverId !== 0) return;
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      const lngLat = [lng, lat];
      const status = data.driving_status || "idle";
      const validStatus = status === "busy" ? "busy" : "idle";
      const name = data.name || `Driver ${driverId}`;
      setDriverData((prev) => ({
        ...prev,
        [driverId]: { ...data, position: { lat, lng }, status: validStatus, name },
      }));
      const popupHTML = buildPopupHTML(name);
      if (markers.current[driverId]) {
        markers.current[driverId].setLngLat(lngLat);
        const img = markers.current[driverId].getElement().querySelector("img");
        if (img) img.src = (MARKER_ICONS[validStatus] || MARKER_ICONS.idle).url;
        markers.current[driverId].getPopup()?.setHTML(popupHTML);
      } else {
        const el = createSvgMarkerEl(validStatus);
        const popup = new window.maplibregl.Popup({
          offset: 25, closeButton: false, closeOnClick: false,
        }).setHTML(popupHTML);
        const marker = new window.maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(lngLat).setPopup(popup).addTo(mapInstance.current);
        marker._isOpen = false;
        el.addEventListener("click", () => {
          if (marker._isOpen) {
            popup.remove();
            marker._isOpen = false;
          } else {
            Object.values(markers.current).forEach((m) => { m.getPopup()?.remove(); m._isOpen = false; });
            popup.addTo(mapInstance.current);
            marker._isOpen = true;
          }
        });
        marker._visible = true;
        markers.current[driverId] = marker;
      }
      if (Object.keys(markers.current).length === 1) {
        mapInstance.current.flyTo({ center: lngLat, zoom: 14, speed: 0.8 });
      }
    };

    if (socketRef.current) socketRef.current.on("driver-location-update", handle);

    return () => {
      if (socketRef.current) socketRef.current.off("driver-location-update", handle);
    };
  }, [mapReady]); // ← only re-runs when map becomes ready, NOT on every socket change

  return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />;
};

const Overview = () => {
  const [isBookingModelOpen, setIsBookingModelOpen] = useState({ type: "new", isOpen: false });
  const [isMessageModelOpen, setIsMessageModelOpen] = useState({ type: "new", isOpen: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isAddBookingDisabled, setIsAddBookingDisabled] = useState(true);
  const [isLoadingDispatchSystem, setIsLoadingDispatchSystem] = useState(true);

  const [activeBookingFilter, setActiveBookingFilter] = useState("todays_booking");
  const [dashboardCounts, setDashboardCounts] = useState({
    todaysBooking: 0, preBookings: 0, recentJobs: 0,
    completed: 0, noShow: 0, cancelled: 0,
  });

  const [mapType] = useState(() => getMapType());
  const countryCenter = React.useMemo(() => getCountryCenter(), []);

  const socket = useSocket();
  // ─── socketRef: stable reference that never causes useEffect re-runs ───────
  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});
  const [driverData, setDriverData] = useState({});
  const [waitingDrivers, setWaitingDrivers] = useState([]);
  const [onJobDrivers, setOnJobDrivers] = useState([]);

  const driverCounts = React.useMemo(() => {
    const counts = { busy: 0, idle: 0, total: 0 };
    Object.values(driverData).forEach((driver) => {
      counts.total++;
      if (driver.status === "busy") counts.busy++;
      else if (driver.status === "idle") counts.idle++;
    });
    return counts;
  }, [driverData]);

  const user = useAppSelector((state) => state.auth.user);
  const displayName = user?.name
    ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
    : "Admin";

  useEffect(() => {
    const fetchDashboardCards = async () => {
      try {
        const res = await getDashboardCards();
        if (res.data?.success) setDashboardCounts(res.data.data);
      } catch (err) {
        console.error("Dashboard cards error:", err);
      }
    };
    fetchDashboardCards();
  }, []);

  // ─── ALL SOCKET LISTENERS in ONE single useEffect with empty deps ──────────
  // This means: register once on mount, never re-register on re-renders.
  // We use socketRef.current inside handlers so we always have the latest socket.
  useEffect(() => {
    const handleDashboardUpdate = (data) => setDashboardCounts(data);

    const handleWaitingDriver = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
      catch { data = rawData; }

      if (Array.isArray(data)) setWaitingDrivers(data);
      else if (data?.drivers && Array.isArray(data.drivers)) setWaitingDrivers(data.drivers);
      else if (data?.data && Array.isArray(data.data)) setWaitingDrivers(data.data);
      else if (data?.driverName || data?.driver_name) {
        const obj = {
          id: Date.now(),
          name: data.driverName || data.driver_name,
          plot: data.plot || "N/A",
          rank: data.rank || 1,
          ...data
        };
        setWaitingDrivers((prev) => {
          const exists = prev.some((d) => d.name === obj.name && d.plot === obj.plot);
          return exists
            ? prev.map((d) => d.name === obj.name && d.plot === obj.plot ? obj : d)
            : [...prev, obj];
        });
      }
      else if (typeof data === "object" && data !== null) {
        setWaitingDrivers([{ ...data, id: data.id || Date.now() }]);
      }
      else setWaitingDrivers([]);
    };

    const handleOnJobDriver = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
      catch { data = rawData; }

      if (Array.isArray(data)) setOnJobDrivers(data);
      else if (data?.drivers && Array.isArray(data.drivers)) setOnJobDrivers(data.drivers);
      else if (data?.data && Array.isArray(data.data)) setOnJobDrivers(data.data);
      else if (data?.driverName || data?.driver_name) {
        const obj = { id: Date.now(), name: data.driverName || data.driver_name, ...data };
        setOnJobDrivers((prev) => {
          const exists = prev.some((d) => d.name === obj.name);
          return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [...prev, obj];
        });
      }
      else if (typeof data === "object" && data !== null) {
        setOnJobDrivers([{ ...data, id: data.id || Date.now() }]);
      }
      else setOnJobDrivers([]);
    };

    const handleNotificationRide = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
      catch { data = rawData; }
      showRideNotification(data);
    };

    const attachAll = () => {
      const s = socketRef.current;
      if (!s) return;
      s.on("dashboard-cards-update", handleDashboardUpdate);
      s.on("waiting-driver-event", handleWaitingDriver);
      s.on("on-job-driver-event", handleOnJobDriver);
      s.on("notification-ride", handleNotificationRide);
    };

    const detachAll = () => {
      const s = socketRef.current;
      if (!s) return;
      s.off("dashboard-cards-update", handleDashboardUpdate);
      s.off("waiting-driver-event", handleWaitingDriver);
      s.off("on-job-driver-event", handleOnJobDriver);
      s.off("notification-ride", handleNotificationRide);
    };

    attachAll();
    return () => detachAll();
  }, []); // ← EMPTY DEPS: runs once, stays stable forever

  // ─── When socket first becomes available, attach listeners ────────────────
  // (handles the case where socket is null on first render)
  useEffect(() => {
    if (!socket) return;

    const handleDashboardUpdate = (data) => setDashboardCounts(data);
    const handleNotificationRide = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
      catch { data = rawData; }
      showRideNotification(data);
    };
    const handleWaitingDriver = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
      catch { data = rawData; }
      if (Array.isArray(data)) { setWaitingDrivers(data); return; }
      if (data?.driverName || data?.driver_name) {
        const obj = { id: Date.now(), name: data.driverName || data.driver_name, plot: data.plot || "N/A", rank: data.rank || 1, ...data };
        setWaitingDrivers((prev) => {
          const exists = prev.some((d) => d.name === obj.name && d.plot === obj.plot);
          return exists ? prev.map((d) => d.name === obj.name && d.plot === obj.plot ? obj : d) : [...prev, obj];
        });
      }
    };
    const handleOnJobDriver = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
      catch { data = rawData; }
      if (Array.isArray(data)) { setOnJobDrivers(data); return; }
      if (data?.driverName || data?.driver_name) {
        const obj = { id: Date.now(), name: data.driverName || data.driver_name, ...data };
        setOnJobDrivers((prev) => {
          const exists = prev.some((d) => d.name === obj.name);
          return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [...prev, obj];
        });
      }
    };

    socket.on("dashboard-cards-update", handleDashboardUpdate);
    socket.on("waiting-driver-event", handleWaitingDriver);
    socket.on("on-job-driver-event", handleOnJobDriver);
    socket.on("notification-ride", handleNotificationRide);

    return () => {
      socket.off("dashboard-cards-update", handleDashboardUpdate);
      socket.off("waiting-driver-event", handleWaitingDriver);
      socket.off("on-job-driver-event", handleOnJobDriver);
      socket.off("notification-ride", handleNotificationRide);
    };
  }, [socket]); // ← runs when socket is first ready, then stays stable

  useEffect(() => {
    const handleOpenModal = () => {
      lockBodyScroll();
      setIsBookingModelOpen({ isOpen: true, type: "new" });
    };
    window.addEventListener("openAddBookingModal", handleOpenModal);
    return () => window.removeEventListener("openAddBookingModal", handleOpenModal);
  }, []);

  const checkDispatchSystem = async () => {
    try {
      setIsLoadingDispatchSystem(true);
      const response = await apiGetDispatchSystem();
      let data = response?.data?.data || response?.data || response;

      if (!Array.isArray(data)) {
        if (data && typeof data === "object") {
          const possibleArrayKeys = ["items", "results", "dispatches", "systems", "list"];
          for (const key of possibleArrayKeys) {
            if (Array.isArray(data[key])) { data = data[key]; break; }
          }
        }
        if (!Array.isArray(data)) {
          data = (data && typeof data === "object" && Object.keys(data).length > 0) ? [data] : [];
        }
      }

      const manualDispatchItem = data.find(
        (item) => item.dispatch_system === "manual_dispatch_only"
      );

      const isManualEnabled =
        manualDispatchItem?.status === "enable" ||
        manualDispatchItem?.status === "enabled" ||
        manualDispatchItem?.status === 1 ||
        manualDispatchItem?.status === true;

      setIsAddBookingDisabled(!isManualEnabled);
    } catch (error) {
      console.error("Dispatch system error:", error);
      setIsAddBookingDisabled(true);
    } finally {
      setIsLoadingDispatchSystem(false);
    }
  };

  useEffect(() => { checkDispatchSystem(); }, []);

  const mapProps = { mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter };

  return (
    <div className="h-full">
      <RideNotificationContainer />
      <div className="px-5 pt-10 flex flex-col sm:flex-row sm:justify-between items-center sm:items-start gap-4 sm:gap-02 xl:mb-6 1.5xl:mb-10">
        <div className="w-full sm:w-[calc(100%-240px)] flex justify-center sm:justify-start">
          <div className="flex flex-col gap-2.5 text-center sm:text-left">
            <PageTitle title="Dashboard overview" />
            <PageSubTitle
              title={`Welcome back! ${displayName}, Here's what's happening with your transportation business today.`}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full sm:w-auto">
          <Button
            className="w-full sm:w-auto px-3 py-1.5 border border-[#1f41bb] rounded-full"
            onClick={() => { lockBodyScroll(); setIsMessageModelOpen({ isOpen: true, type: "new" }); }}
          >
            <div className="flex gap-1 items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block"><PlusIcon fill={"#1f41bb"} height={13} width={13} /></span>
              <span className="sm:hidden"><PlusIcon height={8} width={8} /></span>
              <span>Call Queue</span>
            </div>
          </Button>

          <Button
            type="filled"
            btnSize="md"
            onClick={() => {
              if (!isAddBookingDisabled && !isLoadingDispatchSystem) {
                lockBodyScroll();
                setIsBookingModelOpen({ isOpen: true, type: "new" });
              }
            }}
            disabled={isAddBookingDisabled || isLoadingDispatchSystem}
            title={
              isLoadingDispatchSystem
                ? "Checking dispatch settings..."
                : isAddBookingDisabled
                  ? "Booking creation is disabled. Enable Manual Dispatch in Settings."
                  : ""
            }
            className={`w-full sm:w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3 ${isAddBookingDisabled || isLoadingDispatchSystem
                ? "!bg-gray-400 !cursor-not-allowed opacity-60 hover:!bg-gray-400"
                : ""
              }`}
            style={isAddBookingDisabled || isLoadingDispatchSystem ? { pointerEvents: "none" } : {}}
          >
            <div className="flex gap-2 sm:gap-[15px] items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block"><PlusIcon /></span>
              <span className="sm:hidden"><PlusIcon height={16} width={16} /></span>
              <span>{isLoadingDispatchSystem ? "Loading..." : "Create Booking"}</span>
            </div>
          </Button>
        </div>
      </div>

      <div className="px-5 pt-5" style={{ height: "500px" }}>
        <div className="flex flex-col md:flex-row gap-4 h-full">
          <div className="w-full lg:w-[55%] bg-[#F4F7FF] rounded-2xl shadow p-2 flex flex-col" style={{ height: "100%" }}>
            <div className="flex flex-wrap items-center justify-between mb-3 border-b gap-2 max-sm:flex-col">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-600"></span>
                  {driverCounts.busy} Active Drivers
                </div>
                <div className="flex items-center gap-1 text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  {driverCounts.idle} Idle Drivers
                </div>
              </div>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden" style={{ minHeight: 0 }}>
              {mapType === "barikoi" ? (
                <BarikoiMapSection {...mapProps} />
              ) : (
                <GoogleMapSection {...mapProps} />
              )}
            </div>
          </div>

          <div className="w-full lg:w-[20.5%] bg-orange-50 rounded-2xl shadow p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Drivers Waiting</h3>
              <span className="font-semibold">{waitingDrivers.length}</span>
            </div>
            <table className="w-full text-xs rounded-xl">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-left py-1 text-[11px]">Sr No</th>
                  <th className="text-left text-[11px]">PLOT BAHRIA PHASE</th>
                  <th className="text-right text-[11px]">Rank</th>
                </tr>
              </thead>
              <tbody>
                {waitingDrivers.length > 0 ? (
                  waitingDrivers.map((driver, i) => (
                    <tr key={driver.id || driver.driver_id || i} className="border-t">
                      <td className="py-1">{i + 1}</td>
                      <td>{driver.plot || driver.location || driver.plot_name || "N/A"}</td>
                      <td className="text-right">{driver.rank || driver.ranking || i + 1}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" className="text-center py-4 text-gray-500">No waiting drivers</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="w-full lg:w-[20.5%] bg-green-50 rounded-2xl shadow p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">On Jobs</h3>
              <span className="font-semibold">{onJobDrivers.length}</span>
            </div>
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-left py-1">Sr</th>
                  <th className="text-left">Driver</th>
                </tr>
              </thead>
              <tbody>
                {onJobDrivers.length > 0 ? (
                  onJobDrivers.map((driver, i) => (
                    <tr key={driver.id || driver.driver_id || i} className="border-t">
                      <td className="py-1">{i + 1}</td>
                      <td>{driver.name || driver.driver_name || `Driver ${i + 1}`}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="2" className="text-center py-4 text-gray-500">No active jobs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="px-4 sm:p-6">
        <OverViewDetails filter={activeBookingFilter} />
      </div>

      <div className="sticky bottom-0 left-0 right-0 z-30 bg-white shadow-lg">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0.5 overflow-hidden rounded-lg shadow">
          {CARD_CONFIG.map((card) => {
            const isActive = activeBookingFilter === card.filter;
            const Icon = card.icon;
            return (
              <button
                key={card.filter}
                onClick={() => setActiveBookingFilter(card.filter)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 font-semibold text-white text-[11px] transition-colors ${isActive ? "bg-[#1F41BB]" : "bg-blue-500 hover:bg-blue-600"
                  }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{card.label}</span>
                <span>({dashboardCounts[card.countKey] ?? 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      <Modal isOpen={isBookingModelOpen.isOpen} className="p-4 sm:p-6 lg:p-10">
        <AddBooking setIsOpen={setIsBookingModelOpen} />
      </Modal>

      <Modal isOpen={isMessageModelOpen.isOpen}>
        <CallQueueModel
          setIsOpen={setIsMessageModelOpen}
          onClose={() => setIsMessageModelOpen({ isOpen: false })}
          refreshList={() => setRefreshTrigger((prev) => prev + 1)}
        />
      </Modal>
    </div>
  );
};

export default Overview;

// import React, { useEffect, useRef, useState } from "react";
// import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
// import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
// import Button from "../../../../components/ui/Button/Button";
// import PlusIcon from "../../../../components/svg/PlusIcon";
// import { lockBodyScroll } from "../../../../utils/functions/common.function";
// import Modal from "../../../../components/shared/Modal/Modal";
// import OverViewDetails from "./components/OverviewDetails";
// import AddBooking from "./components/AddBooking";
// import { useSocket } from "../../../../components/routes/SocketProvider";
// import TodayBookingIcon from "../../../../components/svg/TodayBookingIcon";
// import PreBookingIcon from "../../../../components/svg/PreBookingIcon";
// import NoShowIcon from "../../../../components/svg/NoShowIcon";
// import CancelledIcon from "../../../../components/svg/CancelledIcon";
// import { useAppSelector } from "../../../../store";
// import { apiGetDispatchSystem } from "../../../../services/SettingsConfigurationServices";
// import { getDashboardCards } from "../../../../services/AddBookingServices";
// import CallQueueModel from "./components/CallQueueModel/CallQueueModel";
// import RedCarIcon from "../../../../components/svg/RedCarIcon";
// import GreenCarIcon from "../../../../components/svg/GreenCarIcon";
// import { renderToString } from "react-dom/server";
// import { getTenantData } from "../../../../utils/functions/tokenEncryption";

// const GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
// const BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

// const notifListeners = new Set();
// const showRideNotification = (data) => notifListeners.forEach((fn) => fn(data));

// const formatCoord = (str) => {
//   if (!str) return "—";
//   const [lat, lng] = str.split(",").map((s) => parseFloat(s.trim()));
//   if (isNaN(lat) || isNaN(lng)) return str;
//   return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
// };

// const formatAmount = (val) => {
//   if (!val) return "—";
//   const num = parseFloat(val);
//   return isNaN(num) ? val : `৳${num.toLocaleString()}`;
// };

// const NotifRow = ({ icon, label, value, color, bold }) => (
//   <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
//     <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
//     <div style={{ minWidth: 0 }}>
//       <span style={{
//         fontSize: "10px", color: "#6b7280", display: "block",
//         textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1, marginBottom: "2px",
//       }}>
//         {label}
//       </span>
//       <span style={{
//         fontSize: "12px", color: color || "#111827",
//         fontWeight: bold ? 700 : 500, wordBreak: "break-word", lineHeight: 1.4,
//       }}>
//         {value || "—"}
//       </span>
//     </div>
//   </div>
// );

// const RideCard = ({ data, onClose }) => {
//   const [visible, setVisible] = useState(false);
//   const [leaving, setLeaving] = useState(false);

//   useEffect(() => {
//     requestAnimationFrame(() => setVisible(true));
//     const timer = setTimeout(() => handleClose(), 8000);
//     return () => clearTimeout(timer);
//   }, []);

//   const handleClose = () => {
//     setLeaving(true);
//     setTimeout(onClose, 350);
//   };

//   return (
//     <>
//       <style>{`
//         @keyframes rideNotifShrink {
//           from { width: 100%; }
//           to   { width: 0%; }
//         }
//         @keyframes rideNotifPulse {
//           0%, 100% { box-shadow: 0 0 0 0 rgba(31,65,187,0.25); }
//           50%       { box-shadow: 0 0 0 6px rgba(31,65,187,0); }
//         }
//       `}</style>
//       <div
//         style={{
//           transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(110%) scale(0.95)",
//           opacity: visible && !leaving ? 1 : 0,
//           transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.35s ease",
//           background: "#ffffff",
//           borderRadius: "16px",
//           boxShadow: "0 12px 40px rgba(31,65,187,0.18), 0 2px 12px rgba(0,0,0,0.08)",
//           border: "1.5px solid #e0e7ff",
//           width: "320px",
//           overflow: "hidden",
//           marginBottom: "12px",
//           fontFamily: "'Segoe UI', system-ui, sans-serif",
//           animation: "rideNotifPulse 2s ease-in-out 3",
//         }}
//       >
//         <div style={{
//           background: "linear-gradient(135deg, #1F41BB 0%, #3a5fd9 100%)",
//           padding: "12px 14px",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//         }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <div>
//               <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>
//                 New Ride Request
//               </div>
//               {data.booking_id && (
//                 <div style={{ color: "#c7d4ff", fontSize: "11px", marginTop: "2px", fontWeight: 500 }}>
//                   #{data.booking_id}
//                 </div>
//               )}
//             </div>
//           </div>
//           <button
//             onClick={handleClose}
//             style={{
//               background: "rgba(255,255,255,0.18)",
//               border: "1px solid rgba(255,255,255,0.3)",
//               borderRadius: "50%",
//               width: "28px", height: "28px",
//               cursor: "pointer",
//               display: "flex", alignItems: "center", justifyContent: "center",
//               color: "#fff", fontSize: "13px",
//               transition: "background 0.2s",
//               flexShrink: 0,
//             }}
//             onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.32)"}
//             onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
//             aria-label="Close"
//           >
//             ✕
//           </button>
//         </div>

//         <div style={{ padding: "14px 16px 10px" }}>
//           <NotifRow label="Pickup" value={data.pickup_location || formatCoord(data.pickup_point)} color="#16a34a" />
//           <NotifRow label="Destination" value={data.destination_location || formatCoord(data.destination_point)} color="#dc2626" />
//           {data.offered_amount && (
//             <NotifRow label="Offered Amount" value={formatAmount(data.offered_amount)} color="#1F41BB" bold />
//           )}
//         </div>

//         <div style={{ padding: "0 16px 12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
//           {data.payment_method && (
//             <span style={{
//               background: "#eff6ff", color: "#1F41BB",
//               fontSize: "10px", fontWeight: 600,
//               padding: "3px 8px", borderRadius: "20px",
//               border: "1px solid #bfdbfe",
//             }}>
//               {data.payment_method}
//             </span>
//           )}
//           {data.ride_type && (
//             <span style={{
//               background: "#f0fdf4", color: "#16a34a",
//               fontSize: "10px", fontWeight: 600,
//               padding: "3px 8px", borderRadius: "20px",
//               border: "1px solid #bbf7d0",
//             }}>
//               {data.ride_type}
//             </span>
//           )}
//         </div>

//         <div style={{ height: "3px", background: "#e0e7ff", position: "relative", overflow: "hidden" }}>
//           <div style={{
//             position: "absolute", top: 0, left: 0, height: "100%",
//             background: "linear-gradient(90deg, #1F41BB, #60a5fa)",
//             animation: "rideNotifShrink 8s linear forwards",
//           }} />
//         </div>
//       </div>
//     </>
//   );
// };

// const RideNotificationContainer = () => {
//   const [notifications, setNotifications] = useState([]);

//   useEffect(() => {
//     const handler = (data) => {
//       const id = Date.now() + Math.random();
//       setNotifications((prev) => [...prev, { id, data }]);
//     };
//     notifListeners.add(handler);
//     return () => notifListeners.delete(handler);
//   }, []);

//   const remove = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));

//   return (
//     <div style={{
//       position: "fixed",
//       bottom: "80px",
//       right: "20px",
//       zIndex: 9999,
//       display: "flex",
//       flexDirection: "column-reverse",
//       alignItems: "flex-end",
//       pointerEvents: "none",
//     }}>
//       {notifications.map(({ id, data }) => (
//         <div key={id} style={{ pointerEvents: "auto" }}>
//           <RideCard data={data} onClose={() => remove(id)} />
//         </div>
//       ))}
//     </div>
//   );
// };

// const svgToDataUrl = (SvgComponent, width = 40, height = 40) => {
//   const svgString = renderToString(<SvgComponent width={width} height={height} />);
//   return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
// };

// const MARKER_ICONS = {
//   idle: {
//     url: svgToDataUrl(RedCarIcon, 40, 40),
//     scaledSize: { width: 40, height: 40 },
//     anchor: { x: 20, y: 20 },
//   },
//   busy: {
//     url: svgToDataUrl(GreenCarIcon, 40, 40),
//     scaledSize: { width: 40, height: 40 },
//     anchor: { x: 20, y: 20 },
//   },
// };

// const COUNTRY_CENTERS = {
//   GB: { lat: 51.5074, lng: -0.1278 },
//   US: { lat: 37.0902, lng: -95.7129 },
//   IN: { lat: 20.5937, lng: 78.9629 },
//   AU: { lat: -25.2744, lng: 133.7751 },
//   CA: { lat: 56.1304, lng: -106.3468 },
//   AE: { lat: 23.4241, lng: 53.8478 },
//   PK: { lat: 30.3753, lng: 69.3451 },
//   BD: { lat: 23.8103, lng: 90.4125 },
//   SA: { lat: 23.8859, lng: 45.0792 },
//   NG: { lat: 9.082, lng: 8.6753 },
//   ZA: { lat: -30.5595, lng: 22.9375 },
//   DE: { lat: 51.1657, lng: 10.4515 },
//   FR: { lat: 46.2276, lng: 2.2137 },
//   IT: { lat: 41.8719, lng: 12.5674 },
//   ES: { lat: 40.4637, lng: -3.7492 },
//   NL: { lat: 52.1326, lng: 5.2913 },
//   SG: { lat: 1.3521, lng: 103.8198 },
//   MY: { lat: 4.2105, lng: 101.9758 },
//   NZ: { lat: -40.9006, lng: 172.886 },
//   DEFAULT: { lat: 0, lng: 0 },
// };

// const CARD_CONFIG = [
//   { label: "TODAY'S BOOKING", filter: "todays_booking", countKey: "todaysBooking", icon: TodayBookingIcon },
//   { label: "PRE BOOKINGS", filter: "pre_bookings", countKey: "preBookings", icon: PreBookingIcon },
//   { label: "RECENT JOBS", filter: "recent_jobs", countKey: "recentJobs", icon: TodayBookingIcon },
//   { label: "COMPLETED", filter: "completed", countKey: "completed", icon: TodayBookingIcon },
//   { label: "NO SHOW", filter: "no_show", countKey: "noShow", icon: NoShowIcon },
//   { label: "CANCELLED", filter: "cancelled", countKey: "cancelled", icon: CancelledIcon },
// ];

// const getMapType = () => {
//   const tenant = getTenantData();
//   const data = tenant?.data || {};
//   const mapsApi = data?.maps_api?.trim().toLowerCase();
//   const countryOfUse = data?.country_of_use?.trim().toUpperCase();
//   if (mapsApi === "barikoi") return "barikoi";
//   if (mapsApi === "google") return "google";
//   if (countryOfUse === "BD") return "barikoi";
//   return "google";
// };

// const getApiKeys = () => {
//   const tenant = getTenantData();
//   const data = tenant?.data || {};
//   return {
//     googleKey: data?.google_api_key || GOOGLE_KEY,
//     barikoiKey: data?.barikoi_api_key || BARIKOI_KEY,
//   };
// };

// const getCountryCenter = () => {
//   const tenant = getTenantData();
//   const code = tenant?.data?.country_of_use?.trim().toUpperCase();
//   return COUNTRY_CENTERS[code] || COUNTRY_CENTERS.DEFAULT;
// };

// const loadGoogleMaps = (apiKey) => {
//   return new Promise((resolve, reject) => {
//     if (window.google?.maps) return resolve();
//     const existing = document.getElementById("google-maps-script");
//     if (existing) {
//       existing.addEventListener("load", resolve);
//       existing.addEventListener("error", reject);
//       return;
//     }
//     const script = document.createElement("script");
//     script.id = "google-maps-script";
//     script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
//     script.async = true;
//     script.defer = true;
//     script.onload = resolve;
//     script.onerror = () => reject(new Error("Google Maps failed"));
//     document.head.appendChild(script);
//   });
// };

// const loadBarikoiMaps = () => {
//   return new Promise((resolve, reject) => {
//     if (window.maplibregl) return resolve();
//     if (!document.getElementById("maplibre-css")) {
//       const link = document.createElement("link");
//       link.id = "maplibre-css";
//       link.rel = "stylesheet";
//       link.href = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css";
//       document.head.appendChild(link);
//     }
//     const existing = document.getElementById("maplibre-script");
//     if (existing) {
//       if (window.maplibregl) return resolve();
//       existing.addEventListener("load", resolve);
//       existing.addEventListener("error", reject);
//       return;
//     }
//     const script = document.createElement("script");
//     script.id = "maplibre-script";
//     script.src = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js";
//     script.async = true;
//     script.onload = resolve;
//     script.onerror = () => reject(new Error("MapLibre GL failed"));
//     document.head.appendChild(script);
//   });
// };

// const makeGoogleIcon = (status) => {
//   const icon = MARKER_ICONS[status] || MARKER_ICONS.idle;
//   return {
//     url: icon.url,
//     scaledSize: new window.google.maps.Size(icon.scaledSize.width, icon.scaledSize.height),
//     anchor: new window.google.maps.Point(icon.anchor.x, icon.anchor.y),
//   };
// };

// const createSvgMarkerEl = (status) => {
//   const icon = MARKER_ICONS[status] || MARKER_ICONS.idle;
//   const el = document.createElement("div");
//   Object.assign(el.style, {
//     width: `${icon.scaledSize.width}px`,
//     height: `${icon.scaledSize.height}px`,
//     cursor: "pointer",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//   });
//   const img = document.createElement("img");
//   img.src = icon.url;
//   Object.assign(img.style, {
//     width: "100%",
//     height: "100%",
//     objectFit: "contain",
//     filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
//   });
//   el.appendChild(img);
//   return el;
// };

// const animateMarker = (marker, newPosition, duration = 1000) => {
//   const start = marker.getPosition();
//   const startLat = start.lat(), startLng = start.lng();
//   const endLat = newPosition.lat, endLng = newPosition.lng;
//   const startTime = Date.now();
//   const tick = () => {
//     const progress = Math.min((Date.now() - startTime) / duration, 1);
//     const ease = progress < 0.5
//       ? 2 * progress * progress
//       : 1 - Math.pow(-2 * progress + 2, 2) / 2;
//     marker.setPosition({
//       lat: startLat + (endLat - startLat) * ease,
//       lng: startLng + (endLng - startLng) * ease,
//     });
//     if (progress < 1) requestAnimationFrame(tick);
//   };
//   tick();
// };

// const parseDriverData = (rawData) => {
//   try {
//     if (typeof rawData === "string") return JSON.parse(rawData);
//     return rawData;
//   } catch {
//     return null;
//   }
// };

// const buildPopupHTML = (name) => `
//   <div style="padding:6px 10px;font-weight:600;font-size:14px;">
//     ${name}
//   </div>`;

// const GoogleMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter }) => {
//   const { googleKey } = getApiKeys();

//   const fitMapToMarkers = () => {
//     if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
//     const bounds = new window.google.maps.LatLngBounds();
//     let hasVisible = false;
//     Object.values(markers.current).forEach((m) => {
//       if (m.getVisible()) { bounds.extend(m.getPosition()); hasVisible = true; }
//     });
//     if (hasVisible) {
//       mapInstance.current.fitBounds(bounds);
//       if (mapInstance.current.getZoom() > 15) mapInstance.current.setZoom(15);
//     }
//   };

//   useEffect(() => {
//     let mounted = true;
//     loadGoogleMaps(googleKey)
//       .then(() => {
//         if (!mounted || !mapRef.current || mapInstance.current) return;
//         mapInstance.current = new window.google.maps.Map(mapRef.current, {
//           center: { lat: countryCenter.lat, lng: countryCenter.lng },
//           zoom: 5,
//           styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
//         });
//       })
//       .catch((err) => console.error("Google Map load failed:", err));
//     return () => { mounted = false; };
//   }, []);

//   useEffect(() => {
//     if (!socket) return;
//     const handle = (rawData) => {
//       if (!mapInstance.current) return;
//       const data = parseDriverData(rawData);
//       if (!data) return;
//       const driverId = data?.id;
//       const latitude = data?.latitude;
//       const longitude = data?.longitude;
//       const status = data?.driving_status || "idle";
//       const validStatus = status === "busy" ? "busy" : "idle";
//       const name = data?.name || `Driver ${driverId}`;
//       if (!driverId && driverId !== 0) return;
//       if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) return;
//       const position = { lat: Number(latitude), lng: Number(longitude) };
//       setDriverData((prev) => ({ ...prev, [driverId]: { ...data, position, name, status: validStatus } }));
//       const infoContent = buildPopupHTML(name);
//       if (markers.current[driverId]) {
//         const marker = markers.current[driverId];
//         const oldPos = marker.getPosition();
//         const dist = Math.sqrt((oldPos.lat() - position.lat) ** 2 + (oldPos.lng() - position.lng) ** 2);
//         dist < 0.01 ? animateMarker(marker, position, 1000) : marker.setPosition(position);
//         marker.setIcon(makeGoogleIcon(validStatus));
//         marker.infoWindow?.setContent(infoContent);
//       } else {
//         const marker = new window.google.maps.Marker({
//           position,
//           map: mapInstance.current,
//           title: name,
//           icon: makeGoogleIcon(validStatus),
//           animation: window.google.maps.Animation.DROP,
//         });
//         const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });
//         marker.addListener("click", () => {
//           Object.values(markers.current).forEach((m) => m.infoWindow?.close());
//           infoWindow.open(mapInstance.current, marker);
//         });
//         marker.infoWindow = infoWindow;
//         markers.current[driverId] = marker;
//       }
//       Object.values(markers.current).forEach((m) => m.setVisible(true));
//       if (Object.keys(markers.current).length <= 1) setTimeout(fitMapToMarkers, 100);
//     };
//     socket.on("driver-location-update", handle);
//     return () => socket.off("driver-location-update", handle);
//   }, [socket]);

//   useEffect(() => {
//     Object.values(markers.current).forEach((m) => m.setVisible(true));
//     setTimeout(fitMapToMarkers, 100);
//   }, [driverData]);

//   return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />;
// };

// const BarikoiMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter }) => {
//   const [mapReady, setMapReady] = useState(false);
//   const { barikoiKey } = getApiKeys();

//   useEffect(() => {
//     let mounted = true;
//     const init = async () => {
//       try { await loadBarikoiMaps(); }
//       catch (err) { console.error("Barikoi load failed:", err); return; }
//       if (!mounted || !mapRef.current || mapInstance.current) return;
//       const center = getCountryCenter();
//       mapRef.current.style.width = "100%";
//       mapRef.current.style.height = "100%";
//       mapRef.current.style.minHeight = "400px";
//       const map = new window.maplibregl.Map({
//         container: mapRef.current,
//         style: `https://map.barikoi.com/styles/osm-liberty/style.json?key=${BARIKOI_KEY}`,
//         center: [center.lng, center.lat],
//         zoom: 5,
//       });
//       map.addControl(new window.maplibregl.NavigationControl(), "top-right");
//       map.on("load", () => { map.resize(); setMapReady(true); });
//       map.on("error", (e) => console.error("Barikoi map error:", e.error?.message || e));
//       map.on("styledata", () => map.resize());
//       mapInstance.current = map;
//     };
//     init();
//     return () => {
//       mounted = false;
//       if (mapInstance.current) {
//         Object.values(markers.current).forEach((m) => m.remove());
//         markers.current = {};
//         mapInstance.current.remove();
//         mapInstance.current = null;
//       }
//     };
//   }, []);

//   useEffect(() => {
//     const handleResize = () => { if (mapInstance.current) mapInstance.current.resize(); };
//     window.addEventListener("resize", handleResize);
//     const raf = requestAnimationFrame(() => { if (mapInstance.current) mapInstance.current.resize(); });
//     return () => { window.removeEventListener("resize", handleResize); cancelAnimationFrame(raf); };
//   }, [mapReady]);

//   useEffect(() => {
//     if (!socket || !mapReady) return;
//     const handle = (rawData) => {
//       if (!mapInstance.current) return;
//       const data = parseDriverData(rawData);
//       if (!data?.latitude || !data?.longitude) return;
//       const driverId = data.id;
//       if (!driverId && driverId !== 0) return;
//       const lat = Number(data.latitude);
//       const lng = Number(data.longitude);
//       const lngLat = [lng, lat];
//       const status = data.driving_status || "idle";
//       const validStatus = status === "busy" ? "busy" : "idle";
//       const name = data.name || `Driver ${driverId}`;
//       setDriverData((prev) => ({
//         ...prev,
//         [driverId]: { ...data, position: { lat, lng }, status: validStatus, name },
//       }));
//       const popupHTML = buildPopupHTML(name);
//       if (markers.current[driverId]) {
//         markers.current[driverId].setLngLat(lngLat);
//         const img = markers.current[driverId].getElement().querySelector("img");
//         if (img) img.src = (MARKER_ICONS[validStatus] || MARKER_ICONS.idle).url;
//         markers.current[driverId].getPopup()?.setHTML(popupHTML);
//       } else {
//         const el = createSvgMarkerEl(validStatus);
//         const popup = new window.maplibregl.Popup({
//           offset: 25, closeButton: false, closeOnClick: false,
//         }).setHTML(popupHTML);
//         const marker = new window.maplibregl.Marker({ element: el, anchor: "center" })
//           .setLngLat(lngLat).setPopup(popup).addTo(mapInstance.current);
//         marker._isOpen = false;
//         el.addEventListener("click", () => {
//           if (marker._isOpen) {
//             popup.remove();
//             marker._isOpen = false;
//           } else {
//             Object.values(markers.current).forEach((m) => { m.getPopup()?.remove(); m._isOpen = false; });
//             popup.addTo(mapInstance.current);
//             marker._isOpen = true;
//           }
//         });
//         marker._visible = true;
//         markers.current[driverId] = marker;
//       }
//       if (Object.keys(markers.current).length === 1) {
//         mapInstance.current.flyTo({ center: lngLat, zoom: 14, speed: 0.8 });
//       }
//     };
//     socket.on("driver-location-update", handle);
//     return () => socket.off("driver-location-update", handle);
//   }, [socket, mapReady]);

//   return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />;
// };

// const Overview = () => {
//   const [isBookingModelOpen, setIsBookingModelOpen] = useState({ type: "new", isOpen: false });
//   const [isMessageModelOpen, setIsMessageModelOpen] = useState({ type: "new", isOpen: false });
//   const [refreshTrigger, setRefreshTrigger] = useState(0);

//   // ✅ FIX: Create Booking button disabled when manual_dispatch_only is NOT enabled
//   const [isAddBookingDisabled, setIsAddBookingDisabled] = useState(true);
//   const [isLoadingDispatchSystem, setIsLoadingDispatchSystem] = useState(true);

//   const [activeBookingFilter, setActiveBookingFilter] = useState("todays_booking");
//   const [dashboardCounts, setDashboardCounts] = useState({
//     todaysBooking: 0, preBookings: 0, recentJobs: 0,
//     completed: 0, noShow: 0, cancelled: 0,
//   });

//   const [mapType] = useState(() => getMapType());
//   const countryCenter = React.useMemo(() => getCountryCenter(), []);

//   const socket = useSocket();
//   const mapRef = useRef(null);
//   const mapInstance = useRef(null);
//   const markers = useRef({});
//   const [driverData, setDriverData] = useState({});
//   const [waitingDrivers, setWaitingDrivers] = useState([]);
//   const [onJobDrivers, setOnJobDrivers] = useState([]);

//   const driverCounts = React.useMemo(() => {
//     const counts = { busy: 0, idle: 0, total: 0 };
//     Object.values(driverData).forEach((driver) => {
//       counts.total++;
//       if (driver.status === "busy") counts.busy++;
//       else if (driver.status === "idle") counts.idle++;
//     });
//     return counts;
//   }, [driverData]);

//   const user = useAppSelector((state) => state.auth.user);
//   const displayName = user?.name
//     ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
//     : "Admin";

//   useEffect(() => {
//     const fetchDashboardCards = async () => {
//       try {
//         const res = await getDashboardCards();
//         if (res.data?.success) setDashboardCounts(res.data.data);
//       } catch (err) {
//         console.error("Dashboard cards error:", err);
//       }
//     };
//     fetchDashboardCards();
//   }, []);

//   useEffect(() => {
//     if (!socket) return;
//     const handle = (data) => setDashboardCounts(data);
//     socket.on("dashboard-cards-update", handle);
//     return () => socket.off("dashboard-cards-update", handle);
//   }, [socket]);

//   useEffect(() => {
//     const handleOpenModal = () => {
//       lockBodyScroll();
//       setIsBookingModelOpen({ isOpen: true, type: "new" });
//     };
//     window.addEventListener("openAddBookingModal", handleOpenModal);
//     return () => window.removeEventListener("openAddBookingModal", handleOpenModal);
//   }, []);

//   // ✅ FIX: Create Booking button enabled ONLY when manual_dispatch_only status === "enable"
//   const checkDispatchSystem = async () => {
//     try {
//       setIsLoadingDispatchSystem(true);
//       const response = await apiGetDispatchSystem();
//       let data = response?.data?.data || response?.data || response;

//       if (!Array.isArray(data)) {
//         if (data && typeof data === "object") {
//           const possibleArrayKeys = ["items", "results", "dispatches", "systems", "list"];
//           for (const key of possibleArrayKeys) {
//             if (Array.isArray(data[key])) { data = data[key]; break; }
//           }
//         }
//         if (!Array.isArray(data)) {
//           data = (data && typeof data === "object" && Object.keys(data).length > 0) ? [data] : [];
//         }
//       }

//       // Find the manual_dispatch_only record specifically
//       const manualDispatchItem = data.find(
//         (item) => item.dispatch_system === "manual_dispatch_only"
//       );

//       // Button is ENABLED only when manual_dispatch_only is "enable"
//       const isManualEnabled =
//         manualDispatchItem?.status === "enable" ||
//         manualDispatchItem?.status === "enabled" ||
//         manualDispatchItem?.status === 1 ||
//         manualDispatchItem?.status === true;

//       // disabled = true means button is greyed out (manual not enabled)
//       setIsAddBookingDisabled(!isManualEnabled);

//     } catch (error) {
//       console.error("Dispatch system error:", error);
//       setIsAddBookingDisabled(true); // safe default — disable on error
//     } finally {
//       setIsLoadingDispatchSystem(false);
//     }
//   };

//   useEffect(() => { checkDispatchSystem(); }, []);

//   useEffect(() => {
//     if (!socket) return;
//     const handle = (rawData) => {
//       console.log("waiting-driver-event raw response:", rawData);
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("waiting-driver-event parsed response:", data);

//       if (Array.isArray(data)) setWaitingDrivers(data);
//       else if (data?.drivers && Array.isArray(data.drivers)) setWaitingDrivers(data.drivers);
//       else if (data?.data && Array.isArray(data.data)) setWaitingDrivers(data.data);
//       else if (data?.driverName || data?.driver_name) {
//         const obj = { id: Date.now(), name: data.driverName || data.driver_name, plot: data.plot || "N/A", rank: data.rank || 1, ...data };
//         setWaitingDrivers((prev) => {
//           const exists = prev.some((d) => d.name === obj.name && d.plot === obj.plot);
//           return exists ? prev.map((d) => d.name === obj.name && d.plot === obj.plot ? obj : d) : [...prev, obj];
//         });
//       }
//       else if (typeof data === "object" && data !== null) setWaitingDrivers([{ ...data, id: data.id || Date.now() }]);
//       else setWaitingDrivers([]);
//     };
//     socket.on("waiting-driver-event", handle);
//     return () => socket.off("waiting-driver-event", handle);
//   }, [socket]);

//   useEffect(() => {
//     if (!socket) return;
//     const handle = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       if (Array.isArray(data)) setOnJobDrivers(data);
//       else if (data?.drivers && Array.isArray(data.drivers)) setOnJobDrivers(data.drivers);
//       else if (data?.data && Array.isArray(data.data)) setOnJobDrivers(data.data);
//       else if (data?.driverName || data?.driver_name) {
//         const obj = { id: Date.now(), name: data.driverName || data.driver_name, ...data };
//         setOnJobDrivers((prev) => {
//           const exists = prev.some((d) => d.name === obj.name);
//           return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [...prev, obj];
//         });
//       }
//       else if (typeof data === "object" && data !== null) setOnJobDrivers([{ ...data, id: data.id || Date.now() }]);
//       else setOnJobDrivers([]);
//     };
//     socket.on("on-job-driver-event", handle);
//     return () => socket.off("on-job-driver-event", handle);
//   }, [socket]);

//   useEffect(() => {
//     if (!socket) return;
//     socket.on("ride-accepted-by-driver", (data) => { console.log("Ride accepted:", data); });
//     return () => socket.off("ride-accepted-by-driver");
//   }, [socket]);

//   useEffect(() => {
//     if (!socket) return;
//     const handle = (rawData) => {
//       console.log("notification-ride RAW:", rawData);
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch (error) { console.error("JSON Parse Error:", error); data = rawData; }
//       console.log("Parsed notification-ride DATA:", data);
//       showRideNotification(data);
//     };
//     socket.on("notification-ride", handle);
//     return () => {
//       socket.off("notification-ride", handle);
//       console.log("notification-ride listener removed");
//     };
//   }, [socket]);

//   const mapProps = { mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter };

//   return (
//     <div className="h-full">
//       <RideNotificationContainer />
//       <div className="px-5 pt-10 flex flex-col sm:flex-row sm:justify-between items-center sm:items-start gap-4 sm:gap-02 xl:mb-6 1.5xl:mb-10">
//         <div className="w-full sm:w-[calc(100%-240px)] flex justify-center sm:justify-start">
//           <div className="flex flex-col gap-2.5 text-center sm:text-left">
//             <PageTitle title="Dashboard overview" />
//             <PageSubTitle
//               title={`Welcome back! ${displayName}, Here's what's happening with your transportation business today.`}
//             />
//           </div>
//         </div>

//         <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full sm:w-auto">
//           <Button
//             className="w-full sm:w-auto px-3 py-1.5 border border-[#1f41bb] rounded-full"
//             onClick={() => { lockBodyScroll(); setIsMessageModelOpen({ isOpen: true, type: "new" }); }}
//           >
//             <div className="flex gap-1 items-center justify-center whitespace-nowrap">
//               <span className="hidden sm:inline-block"><PlusIcon fill={"#1f41bb"} height={13} width={13} /></span>
//               <span className="sm:hidden"><PlusIcon height={8} width={8} /></span>
//               <span>Call Queue</span>
//             </div>
//           </Button>

//           {/* ✅ FIX: Disabled when manual_dispatch_only is NOT "enable" */}
//           <Button
//             type="filled"
//             btnSize="md"
//             onClick={() => {
//               if (!isAddBookingDisabled && !isLoadingDispatchSystem) {
//                 lockBodyScroll();
//                 setIsBookingModelOpen({ isOpen: true, type: "new" });
//               }
//             }}
//             disabled={isAddBookingDisabled || isLoadingDispatchSystem}
//             title={
//               isLoadingDispatchSystem
//                 ? "Checking dispatch settings..."
//                 : isAddBookingDisabled
//                   ? "Booking creation is disabled. Enable Manual Dispatch in Settings."
//                   : ""
//             }
//             className={`w-full sm:w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3 ${isAddBookingDisabled || isLoadingDispatchSystem
//                 ? "!bg-gray-400 !cursor-not-allowed opacity-60 hover:!bg-gray-400"
//                 : ""
//               }`}
//             style={isAddBookingDisabled || isLoadingDispatchSystem ? { pointerEvents: "none" } : {}}
//           >
//             <div className="flex gap-2 sm:gap-[15px] items-center justify-center whitespace-nowrap">
//               <span className="hidden sm:inline-block"><PlusIcon /></span>
//               <span className="sm:hidden"><PlusIcon height={16} width={16} /></span>
//               <span>
//                 {isLoadingDispatchSystem ? "Loading..." : "Create Booking"}
//               </span>
//             </div>
//           </Button>
//         </div>
//       </div>

//       <div className="px-5 pt-5" style={{ height: "500px" }}>
//         <div className="flex flex-col md:flex-row gap-4 h-full">
//           <div className="w-full lg:w-[55%] bg-[#F4F7FF] rounded-2xl shadow p-2 flex flex-col" style={{ height: "100%" }}>
//             <div className="flex flex-wrap items-center justify-between mb-3 border-b gap-2 max-sm:flex-col">
//               <div className="flex flex-wrap gap-4 text-sm">
//                 <div className="flex items-center gap-1 text-green-600">
//                   <span className="w-2 h-2 rounded-full bg-green-600"></span>
//                   {driverCounts.busy} Active Drivers
//                 </div>
//                 <div className="flex items-center gap-1 text-red-500">
//                   <span className="w-2 h-2 rounded-full bg-red-500"></span>
//                   {driverCounts.idle} Idle Drivers
//                 </div>
//               </div>
//             </div>
//             <div className="flex-1 rounded-xl overflow-hidden" style={{ minHeight: 0 }}>
//               {mapType === "barikoi" ? (
//                 <BarikoiMapSection {...mapProps} />
//               ) : (
//                 <GoogleMapSection {...mapProps} />
//               )}
//             </div>
//           </div>

//           <div className="w-full lg:w-[20.5%] bg-orange-50 rounded-2xl shadow p-3 overflow-y-auto">
//             <div className="flex items-center justify-between mb-2">
//               <h3 className="font-semibold">Drivers Waiting</h3>
//               <span className="font-semibold">{waitingDrivers.length}</span>
//             </div>
//             <table className="w-full text-xs rounded-xl">
//               <thead className="text-gray-500">
//                 <tr>
//                   <th className="text-left py-1 text-[11px]">Sr No</th>
//                   <th className="text-left text-[11px]">PLOT BAHRIA PHASE</th>
//                   {/* <th className="text-left text-[11px]">Driver</th> */}
//                   <th className="text-right text-[11px]">Rank</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {waitingDrivers.length > 0 ? (
//                   waitingDrivers.map((driver, i) => (
//                     <tr key={driver.id || driver.driver_id || i} className="border-t">
//                       <td className="py-1">{i + 1}</td>
//                       <td>{driver.plot || driver.location || driver.plot_name || "N/A"}</td>
//                       {/* <td>{driver.name || driver.driver_name || `Driver ${i + 1}`}</td> */}
//                       <td className="text-right">{driver.rank || driver.ranking || i + 1}</td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr><td colSpan="4" className="text-center py-4 text-gray-500">No waiting drivers</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           <div className="w-full lg:w-[20.5%] bg-green-50 rounded-2xl shadow p-3 overflow-y-auto">
//             <div className="flex items-center justify-between mb-2">
//               <h3 className="font-semibold">On Jobs</h3>
//               <span className="font-semibold">{onJobDrivers.length}</span>
//             </div>
//             <table className="w-full text-xs">
//               <thead className="text-gray-500">
//                 <tr>
//                   <th className="text-left py-1">Sr</th>
//                   <th className="text-left">Driver</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {onJobDrivers.length > 0 ? (
//                   onJobDrivers.map((driver, i) => (
//                     <tr key={driver.id || driver.driver_id || i} className="border-t">
//                       <td className="py-1">{i + 1}</td>
//                       <td>{driver.name || driver.driver_name || `Driver ${i + 1}`}</td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr><td colSpan="2" className="text-center py-4 text-gray-500">No active jobs</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       <div className="px-4 sm:p-6">
//         <OverViewDetails filter={activeBookingFilter} />
//       </div>

//       <div className="sticky bottom-0 left-0 right-0 z-30 bg-white shadow-lg">
//         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0.5 overflow-hidden rounded-lg shadow">
//           {CARD_CONFIG.map((card) => {
//             const isActive = activeBookingFilter === card.filter;
//             const Icon = card.icon;
//             return (
//               <button
//                 key={card.filter}
//                 onClick={() => setActiveBookingFilter(card.filter)}
//                 className={`flex items-center justify-center gap-2 px-3 py-2.5 font-semibold text-white text-[11px] transition-colors ${isActive ? "bg-[#1F41BB]" : "bg-blue-500 hover:bg-blue-600"
//                   }`}
//               >
//                 {Icon && <Icon className="w-4 h-4" />}
//                 <span>{card.label}</span>
//                 <span>({dashboardCounts[card.countKey] ?? 0})</span>
//               </button>
//             );
//           })}
//         </div>
//       </div>

//       <Modal isOpen={isBookingModelOpen.isOpen} className="p-4 sm:p-6 lg:p-10">
//         <AddBooking setIsOpen={setIsBookingModelOpen} />
//       </Modal>

//       <Modal isOpen={isMessageModelOpen.isOpen}>
//         <CallQueueModel
//           setIsOpen={setIsMessageModelOpen}
//           onClose={() => setIsMessageModelOpen({ isOpen: false })}
//           refreshList={() => setRefreshTrigger((prev) => prev + 1)}
//         />
//       </Modal>
//     </div>
//   );
// };

// export default Overview;