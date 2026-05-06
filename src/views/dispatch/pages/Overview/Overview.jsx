import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { apiGetCompanyApiKeys } from "../../../../services/SettingsConfigurationServices";
import { getDashboardCards, apiGetAllPlot } from "../../../../services/AddBookingServices";
import CallQueueModel from "./components/CallQueueModel/CallQueueModel";
import RedCarIcon from "../../../../components/svg/RedCarIcon";
import GreenCarIcon from "../../../../components/svg/GreenCarIcon";
import { renderToString } from "react-dom/server";

const GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
const BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

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
        @keyframes rideNotifShrink { from { width: 100%; } to { width: 0%; } }
        @keyframes rideNotifPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(31,65,187,0.25); }
          50%       { box-shadow: 0 0 0 6px rgba(31,65,187,0); }
        }
      `}</style>
      <div style={{
        transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(110%) scale(0.95)",
        opacity: visible && !leaving ? 1 : 0,
        transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.35s ease",
        background: "#ffffff", borderRadius: "16px",
        boxShadow: "0 12px 40px rgba(31,65,187,0.18), 0 2px 12px rgba(0,0,0,0.08)",
        border: "1.5px solid #e0e7ff", width: "320px", overflow: "hidden",
        marginBottom: "12px", fontFamily: "'Segoe UI', system-ui, sans-serif",
        animation: "rideNotifPulse 2s ease-in-out 3",
      }}>
        <div style={{
          background: "linear-gradient(135deg, #1F41BB 0%, #3a5fd9 100%)",
          padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>New Ride Request</div>
              {data.booking_id && (
                <div style={{ color: "#c7d4ff", fontSize: "11px", marginTop: "2px", fontWeight: 500 }}>#{data.booking_id}</div>
              )}
            </div>
          </div>
          <button onClick={handleClose} style={{
            background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: "13px", transition: "background 0.2s", flexShrink: 0,
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.32)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
            aria-label="Close">✕</button>
        </div>
        <div style={{ padding: "14px 16px 10px" }}>
          <NotifRow label="Pickup" value={data.pickup_location || formatCoord(data.pickup_point)} color="#16a34a" />
          <NotifRow label="Destination" value={data.destination_location || formatCoord(data.destination_point)} color="#dc2626" />
          {data.offered_amount && <NotifRow label="Offered Amount" value={formatAmount(data.offered_amount)} color="#1F41BB" bold />}
        </div>
        <div style={{ padding: "0 16px 12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {data.payment_method && (
            <span style={{ background: "#eff6ff", color: "#1F41BB", fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", border: "1px solid #bfdbfe" }}>
              {data.payment_method}
            </span>
          )}
          {data.ride_type && (
            <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", border: "1px solid #bbf7d0" }}>
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
  }, []);
  const remove = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));
  return (
    <div style={{ position: "fixed", bottom: "80px", right: "20px", zIndex: 9999, display: "flex", flexDirection: "column-reverse", alignItems: "flex-end", pointerEvents: "none" }}>
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
  idle: { url: svgToDataUrl(RedCarIcon, 40, 40), scaledSize: { width: 40, height: 40 }, anchor: { x: 20, y: 20 } },
  busy: { url: svgToDataUrl(GreenCarIcon, 40, 40), scaledSize: { width: 40, height: 40 }, anchor: { x: 20, y: 20 } },
};

const COUNTRY_CENTERS = {
  GB: { lat: 51.5074, lng: -0.1278 }, US: { lat: 37.0902, lng: -95.7129 },
  IN: { lat: 20.5937, lng: 78.9629 }, AU: { lat: -25.2744, lng: 133.7751 },
  CA: { lat: 56.1304, lng: -106.3468 }, AE: { lat: 23.4241, lng: 53.8478 },
  PK: { lat: 30.3753, lng: 69.3451 }, BD: { lat: 23.8103, lng: 90.4125 },
  SA: { lat: 23.8859, lng: 45.0792 }, NG: { lat: 9.082, lng: 8.6753 },
  ZA: { lat: -30.5595, lng: 22.9375 }, DE: { lat: 51.1657, lng: 10.4515 },
  FR: { lat: 46.2276, lng: 2.2137 }, IT: { lat: 41.8719, lng: 12.5674 },
  ES: { lat: 40.4637, lng: -3.7492 }, NL: { lat: 52.1326, lng: 5.2913 },
  SG: { lat: 1.3521, lng: 103.8198 }, MY: { lat: 4.2105, lng: 101.9758 },
  NZ: { lat: -40.9006, lng: 172.886 }, KE: { lat: -1.2921, lng: 36.8219 },
  ID: { lat: -0.7893, lng: 113.9213 }, PH: { lat: 12.8797, lng: 121.774 },
  DEFAULT: { lat: 20, lng: 0 },
};

const CARD_CONFIG = [
  { label: "TODAY'S BOOKING", filter: "todays_booking", countKey: "todaysBooking", icon: TodayBookingIcon },
  { label: "PRE BOOKINGS", filter: "pre_bookings", countKey: "preBookings", icon: PreBookingIcon },
  { label: "RECENT JOBS", filter: "recent_jobs", countKey: "recentJobs", icon: TodayBookingIcon },
  { label: "COMPLETED", filter: "completed", countKey: "completed", icon: TodayBookingIcon },
  { label: "NO SHOW", filter: "no_show", countKey: "noShow", icon: NoShowIcon },
  { label: "CANCELLED", filter: "cancelled", countKey: "cancelled", icon: CancelledIcon },
];

const getMapType = (data) => {
  if (!data) return "google";
  const mapsApi = data?.maps_api?.trim().toLowerCase();
  const countryOfUse = data?.country_of_use?.trim().toUpperCase();
  if (mapsApi === "barikoi") return "barikoi";
  if (mapsApi === "google") return "google";
  if (countryOfUse === "BD") return "barikoi";
  return "google";
};

const getApiKeys = (stateApiKeys) => ({
  googleKey: stateApiKeys?.googleKey || GOOGLE_KEY,
  barikoiKey: stateApiKeys?.barikoiKey || BARIKOI_KEY,
});

const getCountryCenter = (code) => {
  if (code) return COUNTRY_CENTERS[code.trim().toUpperCase()] || COUNTRY_CENTERS.DEFAULT;
  return COUNTRY_CENTERS.DEFAULT;
};

const loadGoogleMaps = (apiKey) => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.Map) return resolve();
    const existing = document.getElementById("google-maps-script");
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.maps?.Map) { clearInterval(check); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey || GOOGLE_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (window.google?.maps?.Map) { clearInterval(check); resolve(); }
      }, 50);
    };
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
      link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }

    const existing = document.getElementById("maplibre-script");
    if (existing) {
      const check = setInterval(() => {
        if (window.maplibregl) { clearInterval(check); resolve(); }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = "maplibre-script";
    script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
    script.async = true;
    script.onload = () => {
      setTimeout(() => {
        if (window.maplibregl) resolve();
        else reject(new Error("MapLibre GL not available after load"));
      }, 100);
    };
    script.onerror = () => reject(new Error("MapLibre GL script failed to load"));
    document.head.appendChild(script);
  });
};

const buildBarikoiStyle = (barikoiKey) => ({
  version: 8,
  name: "Barikoi",
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: [
        `https://tile.barikoi.com/styles/barikoi/tiles/{z}/{x}/{y}.png?key=${barikoiKey}`,
      ],
      tileSize: 256,
      attribution: "© Barikoi | © OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
});

const buildOsmFallbackStyle = () => ({
  version: 8,
  name: "OSM",
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "osm-tiles", type: "raster", source: "osm-tiles", minzoom: 0, maxzoom: 22 },
  ],
});

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
  Object.assign(el.style, { width: `${icon.scaledSize.width}px`, height: `${icon.scaledSize.height}px`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" });
  const img = document.createElement("img");
  img.src = icon.url;
  Object.assign(img.style, { width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" });
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
    const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    marker.setPosition({ lat: startLat + (endLat - startLat) * ease, lng: startLng + (endLng - startLng) * ease });
    if (progress < 1) requestAnimationFrame(tick);
  };
  tick();
};

const parseDriverData = (rawData) => {
  try {
    let data = rawData;
    if (typeof data === "string") {
      const fixed = data.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
      data = JSON.parse(fixed);
    }
    if (Array.isArray(data)) return data[0];
    return data;
  } catch {
    if (typeof rawData === "string") {
      const latM = rawData.match(/"lat(?:itude)?":\s*(-?[\d.]+)/);
      const lngM = rawData.match(/"lng(?:itude)?":\s*(-?[\d.]+)/);
      const cidM = rawData.match(/"client_id":\s*"([^"]*)/);
      const didM = rawData.match(/"dispatcher_id":\s*(\d+)/);
      const stM = rawData.match(/"driving_status":\s*"([^"]*)"/);
      const nameM = rawData.match(/"name":\s*"([^"]*)"/);
      const phoneM = rawData.match(/"phone_no":\s*"([^"]*)"/);
      const plateM = rawData.match(/"plate_no":\s*"([^"]*)"/);
      const idM = rawData.match(/"id":\s*(\d+)/);
      if (latM && lngM) {
        return {
          latitude: parseFloat(latM[1]), longitude: parseFloat(lngM[1]),
          client_id: cidM?.[1] ?? null, dispatcher_id: didM ? parseInt(didM[1]) : null,
          id: idM ? parseInt(idM[1]) : null, driving_status: stM?.[1] ?? "idle",
          name: nameM?.[1] ?? null, phone_no: phoneM?.[1] ?? null, plate_no: plateM?.[1] ?? null,
        };
      }
    }
    return null;
  }
};

const parseCoordinates = (plot) => {
  if (!plot) return [];
  try {
    let coords = plot.coordinates;
    if (typeof coords === "string") coords = JSON.parse(coords);
    if (!Array.isArray(coords)) return [];
    return coords.map((c) => ({ lat: Number(c.lat), lng: Number(c.lng) }));
  } catch { return []; }
};

const buildPopupHTML = (data) => {
  const name = data.name || data.driver_name || data.driverName || "Unknown Driver";
  const phone = data.phone_no || data.phone || "N/A";
  const plate = data.plate_no || data.plate || "N/A";
  const status = (data.driving_status || data.status || "idle").toLowerCase();
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const statusColor = status === "busy" ? "#10b981" : "#ef4444";
  return `
    <div style="font-family:'Inter',sans-serif;min-width:150px;padding:4px 6px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#4b5563;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span style="font-weight:700;color:#111827;font-size:15px;">${name}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#6b7280;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        <span style="color:#4b5563;font-size:13px;">${phone}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#6b7280;"><rect x="1" y="3" width="22" height="18" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        <span style="background:#f9fafb;color:#374151;font-weight:600;font-size:12px;padding:1px 6px;border-radius:4px;border:1px solid #e5e7eb;">${plate}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;border-top:1px solid #f3f4f6;padding-top:8px;">
        <span style="height:7px;width:7px;background-color:${statusColor};border-radius:50%;display:inline-block;"></span>
        <span style="color:${statusColor};font-weight:700;font-size:12px;text-transform:capitalize;border:1px solid ${statusColor}40;padding:1px 8px;border-radius:20px;background:${statusColor}10;">${statusLabel}</span>
      </div>
    </div>
  `;
};

const GoogleMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers }) => {
  const { googleKey } = getApiKeys(apiKeys);
  const [isMapReady, setIsMapReady] = useState(false);
  const plotPolygons = useRef([]);

  const renderPlots = () => {
    if (!mapInstance.current || !plotsData) return;
    plotPolygons.current.forEach(p => p.setMap(null));
    plotPolygons.current = [];
    plotsData.forEach(plot => {
      const coords = parseCoordinates(plot);
      if (coords.length === 0) return;
      const polygon = new window.google.maps.Polygon({
        paths: coords, strokeColor: "#1F41BB", strokeOpacity: 0.8, strokeWeight: 2,
        fillColor: "#1F41BB", fillOpacity: 0.1, map: mapInstance.current,
      });
      plotPolygons.current.push(polygon);
    });
  };

  useEffect(() => {
    if (mapInstance.current && plotsData) renderPlots();
  }, [plotsData]);

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
    if (!googleKey) return;
    loadGoogleMaps(googleKey).then(() => {
      if (!mounted || !mapRef.current || mapInstance.current) return;
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: countryCenter.lat, lng: countryCenter.lng },
        zoom: 5,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      });
      setIsMapReady(true);
    }).catch((err) => console.error("Google Map load failed:", err));
    return () => {
      mounted = false;
      if (mapInstance.current) mapInstance.current = null;
    };
  }, [googleKey]);

  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  const driverDataRef = useRef(driverData);
  useEffect(() => { driverDataRef.current = driverData; }, [driverData]);

  useEffect(() => {
    const getDriverId = (d) => String(d.id || d.driver_id || d.dispatcher_id || d.client_id || "");
    const activeIds = new Set([...waitingDrivers.map(getDriverId), ...onJobDrivers.map(getDriverId)].filter(id => id !== ""));

    const renderMarker = (id, data) => {
      if (!mapInstance.current || !id) return;
      const latitude = data?.latitude !== undefined ? data?.latitude : data?.lat;
      const longitude = data?.longitude !== undefined ? data?.longitude : data?.lng;
      if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;
      const position = { lat: Number(latitude), lng: Number(longitude) };
      const status = data?.driving_status || data?.status || "idle";
      const validStatus = status === "busy" ? "busy" : "idle";
      const name = data?.name || data?.driverName || data?.driver_name || `Driver ${id}`;
      const infoContent = buildPopupHTML(data);
      if (markers.current[id]) {
        const marker = markers.current[id];
        const oldPos = marker.getPosition();
        const dist = Math.sqrt((oldPos.lat() - position.lat) ** 2 + (oldPos.lng() - position.lng) ** 2);
        dist < 0.01 ? animateMarker(marker, position, 1000) : marker.setPosition(position);
        marker.setIcon(makeGoogleIcon(validStatus));
        marker.infoWindow?.setContent(infoContent);
      } else {
        const marker = new window.google.maps.Marker({
          position, map: mapInstance.current, title: name,
          icon: makeGoogleIcon(validStatus), animation: window.google.maps.Animation.DROP,
        });
        const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });
        marker.addListener("click", () => {
          Object.values(markers.current).forEach((m) => m.infoWindow?.close());
          infoWindow.open(mapInstance.current, marker);
        });
        marker.infoWindow = infoWindow;
        markers.current[id] = marker;
      }
    };

    if (isMapReady && mapInstance.current) {
      Object.keys(markers.current).forEach(id => {
        if (!activeIds.has(id)) { markers.current[id].setMap(null); delete markers.current[id]; }
      });
      Object.entries(driverDataRef.current).forEach(([id, data]) => {
        if (activeIds.has(id)) renderMarker(id, data);
      });
    }

    const handle = (rawData) => {
      const data = parseDriverData(rawData);
      if (!data) return;
      const id = getDriverId(data);
      if (!id) return;
      setDriverData(prev => ({ ...prev, [id]: { ...prev[id], ...data } }));
      if (activeIds.has(id)) renderMarker(id, data);
    };

    if (socketRef.current) socketRef.current.on("driver-location-update", handle);
    return () => { if (socketRef.current) socketRef.current.off("driver-location-update", handle); };
  }, [isMapReady, waitingDrivers, onJobDrivers]);

  useEffect(() => {
    Object.values(markers.current).forEach((m) => m.setVisible(true));
    if (mapInstance.current && !mapInstance.current._hasFittedOnce && Object.keys(markers.current).length > 0) {
      setTimeout(fitMapToMarkers, 500);
      mapInstance.current._hasFittedOnce = true;
    }
  }, [driverData]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />;
};

const BarikoiMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers }) => {
  const [mapReady, setMapReady] = useState(false);
  const { barikoiKey } = getApiKeys(apiKeys);
  const plotsRendered = useRef(false);

  const renderPlots = (map) => {
    if (!map || !plotsData || plotsData.length === 0) return;
    const doRender = () => {
      try {
        ["plots-labels", "plots-outline", "plots-fill"].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource("plots")) map.removeSource("plots");

        const features = plotsData.map(plot => {
          const coords = parseCoordinates(plot);
          if (coords.length === 0) return null;
          return {
            type: "Feature",
            properties: { name: plot.plot_name || "Plot" },
            geometry: { type: "Polygon", coordinates: [coords.map(c => [c.lng, c.lat])] },
          };
        }).filter(Boolean);

        if (features.length === 0) return;

        map.addSource("plots", { type: "geojson", data: { type: "FeatureCollection", features } });
        map.addLayer({ id: "plots-fill", type: "fill", source: "plots", paint: { "fill-color": "#1F41BB", "fill-opacity": 0.15 } });
        map.addLayer({ id: "plots-outline", type: "line", source: "plots", paint: { "line-color": "#1F41BB", "line-width": 2.5, "line-opacity": 0.9 } });
        plotsRendered.current = true;
      } catch (err) {
        console.warn("Plot render error:", err);
      }
    };

    if (map.isStyleLoaded()) {
      doRender();
    } else {
      map.once("idle", doRender);
    }
  };

  useEffect(() => {
    if (mapReady && mapInstance.current && plotsData?.length > 0) {
      renderPlots(mapInstance.current);
    }
  }, [mapReady, plotsData]);

  useEffect(() => {
    if (!barikoiKey) return;
    let mounted = true;

    const init = async () => {
      try {
        await loadBarikoiMaps();
      } catch (err) {
        console.error("Barikoi/MapLibre load failed:", err);
        return;
      }

      if (!mounted || !mapRef.current || mapInstance.current) return;

      const container = mapRef.current;
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.minHeight = "400px";
      container.style.position = "relative"; 
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      if (!mounted || !mapRef.current) return;

      const initMap = (style) => {
        try {
          const map = new window.maplibregl.Map({
            container,
            style,
            center: [countryCenter.lng, countryCenter.lat],
            zoom: 8,
            attributionControl: true,
            fadeDuration: 0,
          });

          map.addControl(new window.maplibregl.NavigationControl(), "top-right");

          map.on("load", () => {
            if (!mounted) return;
            map.resize();
            setTimeout(() => {
              if (mounted && map) { map.resize(); setMapReady(true); }
            }, 150);
          });

          map.on("error", (e) => {
            const msg = e?.error?.message || String(e);
            if (msg.includes("403") || msg.includes("401") || (msg.includes("Failed to fetch") && !map._usedFallback)) {
              console.warn("Barikoi tiles unavailable, switching to OSM fallback");
              map._usedFallback = true;
              try { map.setStyle(buildOsmFallbackStyle()); } catch { }
            }
          });

          mapInstance.current = map;
        } catch (err) {
          console.error("MapLibre Map instantiation failed:", err);
          try {
            const map = new window.maplibregl.Map({
              container, style: buildOsmFallbackStyle(),
              center: [countryCenter.lng, countryCenter.lat], zoom: 8,
            });
            map.on("load", () => { map.resize(); setMapReady(true); });
            mapInstance.current = map;
          } catch { }
        }
      };

      const barikoiRasterStyle = buildBarikoiStyle(barikoiKey);
      initMap(barikoiRasterStyle);
    };

    init();

    return () => {
      mounted = false;
      if (mapInstance.current) {
        try {
          Object.values(markers.current).forEach((m) => { try { m.remove(); } catch { } });
          markers.current = {};
          mapInstance.current.remove();
        } catch { }
        mapInstance.current = null;
      }
    };
  }, [barikoiKey]);

  useEffect(() => {
    if (!mapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapInstance.current && typeof mapInstance.current.resize === "function") {
        mapInstance.current.resize();
      }
    });
    ro.observe(mapRef.current);
    return () => ro.disconnect();
  }, []);

  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  useEffect(() => {
    if (!mapReady) return;

    const updateOrAddMarker = (data) => {
      if (!mapInstance.current) return;
      const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
      if (driverId == null) return;
      const lat = Number(data.latitude !== undefined ? data.latitude : data.lat);
      const lng = Number(data.longitude !== undefined ? data.longitude : data.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const lngLat = [lng, lat];
      const status = data.driving_status || "idle";
      const validStatus = status === "busy" ? "busy" : "idle";
      const name = data.name || data.driverName || data.driver_name || `Driver ${driverId}`;
      const popupHTML = buildPopupHTML(data);

      setDriverData((prev) => ({
        ...prev,
        [driverId]: { ...data, position: { lat, lng }, status: validStatus, driving_status: validStatus, name },
      }));

      if (markers.current[driverId]) {
        markers.current[driverId].setLngLat(lngLat);
        const img = markers.current[driverId].getElement()?.querySelector("img");
        if (img) img.src = (MARKER_ICONS[validStatus] || MARKER_ICONS.idle).url;
        markers.current[driverId].getPopup()?.setHTML(popupHTML);
      } else {
        try {
          const el = createSvgMarkerEl(validStatus);
          const popup = new window.maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: false }).setHTML(popupHTML);
          const marker = new window.maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat(lngLat).setPopup(popup).addTo(mapInstance.current);
          marker._isOpen = false;
          el.addEventListener("click", () => {
            if (marker._isOpen) { popup.remove(); marker._isOpen = false; }
            else {
              Object.values(markers.current).forEach((m) => { try { m.getPopup()?.remove(); m._isOpen = false; } catch { } });
              popup.setLngLat(lngLat).addTo(mapInstance.current);
              marker._isOpen = true;
            }
          });
          markers.current[driverId] = marker;
        } catch (err) {
          console.warn("Marker add error:", err);
        }
      }
    };

    const activeIds = new Set([
      ...waitingDrivers.map(d => String(d.id || d.driver_id || d.dispatcher_id || "")),
      ...onJobDrivers.map(d => String(d.id || d.driver_id || d.dispatcher_id || "")),
    ].filter(Boolean));

    Object.keys(markers.current).forEach(id => {
      if (!activeIds.has(String(id))) {
        try { markers.current[id].remove(); } catch { }
        delete markers.current[id];
      }
    });

    Object.values(driverData).forEach(data => {
      const id = String(data.id || data.driver_id || data.dispatcher_id || data.client_id || "");
      if (id && activeIds.has(id)) {
        const lat = data.latitude !== undefined ? data.latitude : data.lat;
        const lng = data.longitude !== undefined ? data.longitude : data.lng;
        if (lat != null && lng != null) updateOrAddMarker(data);
      }
    });

    const handle = (rawData) => {
      const data = parseDriverData(rawData);
      if (data) updateOrAddMarker(data);
    };

    if (socketRef.current) socketRef.current.on("driver-location-update", handle);
    return () => { if (socketRef.current) socketRef.current.off("driver-location-update", handle); };
  }, [mapReady, waitingDrivers, onJobDrivers]);

  useEffect(() => {
    if (mapReady && mapInstance.current && !mapInstance.current._hasFittedOnce && Object.keys(markers.current).length > 0) {
      const fit = () => {
        if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity, hasVisible = false;
        Object.values(markers.current).forEach((m) => {
          try {
            const { lat, lng } = m.getLngLat();
            minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
            hasVisible = true;
          } catch { }
        });
        if (hasVisible) mapInstance.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50, maxZoom: 15 });
      };
      setTimeout(fit, 600);
      mapInstance.current._hasFittedOnce = true;
    }
  }, [mapReady, driverData]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "100%", minHeight: "400px", position: "relative" }}
    />
  );
};

const Overview = () => {
  const [isBookingModelOpen, setIsBookingModelOpen] = useState({ type: "new", isOpen: false });
  const [isMessageModelOpen, setIsMessageModelOpen] = useState({ type: "new", isOpen: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeBookingFilter, setActiveBookingFilter] = useState("todays_booking");
  const [mapType, setMapType] = useState(null);
  const [apiKeys, setApiKeys] = useState({ googleKey: GOOGLE_KEY, barikoiKey: BARIKOI_KEY, searchApi: "google", countryOfUse: null });
  const countryCenter = React.useMemo(() => getCountryCenter(apiKeys.countryOfUse), [apiKeys.countryOfUse]);
  const [plotsData, setPlotsData] = useState([]);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});
  const socket = useSocket();
  const socketRef = useRef(socket);
  const plotsDataRef = useRef(plotsData);
  useEffect(() => { plotsDataRef.current = plotsData; }, [plotsData]);

  const [dashboardCounts, setDashboardCounts] = useState({ todaysBooking: 0, preBookings: 0, recentJobs: 0, completed: 0, noShow: 0, cancelled: 0 });
  const [driverData, setDriverData] = useState({});
  const [waitingDrivers, setWaitingDrivers] = useState([]);
  const [onJobDrivers, setOnJobDrivers] = useState([]);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const res = await apiGetCompanyApiKeys();
        if (res.data?.success) {
          const data = res.data.data;
          const googleKey = data.google_api_key?.startsWith("AIza") ? data.google_api_key : GOOGLE_KEY;
          const barikoiKey = data.barikoi_api_key?.startsWith("bkoi_") ? data.barikoi_api_key : BARIKOI_KEY;
          setApiKeys({ googleKey, barikoiKey, searchApi: data.search_api || "google", countryOfUse: data.country_of_use || null });
          const newType = data.maps_api ? data.maps_api.toLowerCase() : getMapType(data);
          setMapType(newType);
        }
      } catch (err) {
        console.error("Fetch API keys error:", err);
        setMapType("google"); // fallback
      }
    };
    fetchApiKeys();
  }, []);

  useEffect(() => {
    const fetchPlots = async () => {
      try {
        const res = await apiGetAllPlot({ page: 1, limit: 100 });
        if (res.data?.success) setPlotsData(res.data.data?.data || res.data.data || []);
      } catch (err) { console.error("Fetch plots error:", err); }
    };
    fetchPlots();
  }, []);

  useEffect(() => { socketRef.current = socket; }, [socket]);

  const driverCounts = React.useMemo(() => ({
    busy: onJobDrivers.length, idle: waitingDrivers.length, total: onJobDrivers.length + waitingDrivers.length,
  }), [onJobDrivers, waitingDrivers]);

  // Prune stale idle drivers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setWaitingDrivers((prev) => {
        const filtered = prev.filter((d) => !d.updatedAt || now - d.updatedAt < 5000);
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const user = useAppSelector((state) => state.auth.user);
  const displayName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : "Admin";

  const fetchDashboardCards = useCallback(async () => {
    try {
      const res = await getDashboardCards();
      if (res.data?.success) setDashboardCounts(res.data.data);
    } catch (err) { console.error("Dashboard cards error:", err); }
  }, []);

  useEffect(() => { fetchDashboardCards(); }, [fetchDashboardCards]);

  useEffect(() => {
    if (!socket) return;

    const handleDashboardUpdate = (data) => setDashboardCounts(data);

    const handleNotificationRide = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      showRideNotification(data);
    };

    const handleWaitingDriver = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      if (Array.isArray(data)) { setWaitingDrivers(data.map(d => ({ ...d, updatedAt: Date.now() }))); return; }
      if (data?.driverName || data?.driver_name) {
        const name = data.driverName || data.driver_name;
        const driverId = data.id || data.driver_id || data.dispatcher_id;
        const sId = String(driverId);
        if (sId) {
          setDriverData(prev => {
            let lat = data.latitude || data.lat;
            let lng = data.longitude || data.lng;
            if ((lat == null || lng == null) && (data.plot_id || data.plot)) {
              const plotId = data.plot_id || data.plot;
              const plot = plotsDataRef.current.find(p => p.id == plotId || p.plot_id == plotId);
              if (plot) {
                const coords = parseCoordinates(plot);
                if (coords.length > 0) {
                  lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
                  lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
                }
              }
            }
            const status = "idle";
            if (prev[sId]) return { ...prev, [sId]: { ...prev[sId], ...data, position: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : prev[sId].position, status, driving_status: status } };
            else if (lat && lng) return { ...prev, [sId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } };
            return prev;
          });
        }
        setOnJobDrivers((prev) => prev.filter((d) => d.name !== name));
        const obj = { id: driverId || Date.now(), name, plot: data.plot_name || data.plot || "N/A", rank: data.rank || 1, ...data };
        setWaitingDrivers((prev) => {
          const exists = prev.some((d) => d.name === obj.name);
          const updatedObj = { ...obj, updatedAt: Date.now() };
          return exists ? prev.map((d) => d.name === obj.name ? updatedObj : d) : [updatedObj, ...prev];
        });
      }
    };

    const handleOnJobDriver = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      if (Array.isArray(data)) { setOnJobDrivers(data); return; }
      if (data?.driverName || data?.driver_name) {
        const name = data.driverName || data.driver_name;
        const driverId = data.id || data.driver_id || data.dispatcher_id;
        const sId = String(driverId);
        if (sId) {
          setDriverData(prev => {
            let lat = data.latitude || data.lat;
            let lng = data.longitude || data.lng;
            if ((lat == null || lng == null) && (data.plot_id || data.plot)) {
              const plotId = data.plot_id || data.plot;
              const plot = plotsDataRef.current.find(p => p.id == plotId || p.plot_id == plotId);
              if (plot) {
                const coords = parseCoordinates(plot);
                if (coords.length > 0) {
                  lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
                  lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
                }
              }
            }
            const status = "busy";
            if (prev[sId]) return { ...prev, [sId]: { ...prev[sId], ...data, position: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : prev[sId].position, status, driving_status: status } };
            else if (lat && lng) return { ...prev, [sId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } };
            return prev;
          });
        }
        setWaitingDrivers((prev) => prev.filter((d) => d.name !== name));
        const obj = { id: driverId || Date.now(), name, ...data };
        setOnJobDrivers((prev) => {
          const exists = prev.some((d) => d.name === obj.name);
          return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev];
        });
      }
    };

    const handleJobAccepted = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      const driverName = data?.driver_name || data?.driverName;
      if (driverName) {
        setWaitingDrivers((prev) => prev.filter((d) => d.name !== driverName));
        const obj = { id: Date.now(), name: driverName, ...data };
        setOnJobDrivers((prev) => {
          const exists = prev.some((d) => d.name === obj.name);
          return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev];
        });
      }
    };

    const handleJobCancelled = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      const driverName = data?.driver_name || data?.driverName;
      if (driverName) setOnJobDrivers((prev) => prev.filter((d) => d.name !== driverName));
      fetchDashboardCards();
    };

    const handleBookingCancelled = () => fetchDashboardCards();

    const handleDriverLocationUpdate = (rawData) => {
      const data = parseDriverData(rawData);
      if (!data) return;
      const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
      if (!driverId) return;
      const sId = String(driverId);
      const now = Date.now();
      setWaitingDrivers((prev) => {
        const exists = prev.some((d) => String(d.id || d.driver_id || d.dispatcher_id) === sId);
        if (exists) return prev.map((d) => String(d.id || d.driver_id || d.dispatcher_id) === sId ? { ...d, ...data, updatedAt: now } : d);
        return prev;
      });
    };

    socket.on("dashboard-cards-update", handleDashboardUpdate);
    socket.on("waiting-driver-event", handleWaitingDriver);
    socket.on("on-job-driver-event", handleOnJobDriver);
    socket.on("notification-ride", handleNotificationRide);
    socket.on("job-accepted-by-driver", handleJobAccepted);
    socket.on("job-cancelled-by-driver", handleJobCancelled);
    socket.on("driver-location-update", handleDriverLocationUpdate);
    socket.on("booking-cancelled-event", handleBookingCancelled);
    socket.on("booking-cancelled", handleBookingCancelled);
    socket.on("cancel-booking-event", handleBookingCancelled);

    return () => {
      socket.off("dashboard-cards-update", handleDashboardUpdate);
      socket.off("waiting-driver-event", handleWaitingDriver);
      socket.off("on-job-driver-event", handleOnJobDriver);
      socket.off("notification-ride", handleNotificationRide);
      socket.off("job-accepted-by-driver", handleJobAccepted);
      socket.off("job-cancelled-by-driver", handleJobCancelled);
      socket.off("driver-location-update", handleDriverLocationUpdate);
      socket.off("booking-cancelled-event", handleBookingCancelled);
      socket.off("booking-cancelled", handleBookingCancelled);
      socket.off("cancel-booking-event", handleBookingCancelled);
    };
  }, [socket, fetchDashboardCards]);

  useEffect(() => {
    const handleOpenModal = () => { lockBodyScroll(); setIsBookingModelOpen({ isOpen: true, type: "new" }); };
    window.addEventListener("openAddBookingModal", handleOpenModal);
    return () => window.removeEventListener("openAddBookingModal", handleOpenModal);
  }, []);

  const mapProps = { mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers };

  return (
    <div className="h-full">
      <RideNotificationContainer />
      <div className="px-5 pt-10 flex flex-col sm:flex-row sm:justify-between items-center sm:items-start gap-4 sm:gap-02 xl:mb-6 1.5xl:mb-10">
        <div className="w-full sm:w-[calc(100%-240px)] flex justify-center sm:justify-start">
          <div className="flex flex-col gap-2.5 text-center sm:text-left">
            <PageTitle title="Dashboard overview" />
            <PageSubTitle title={`Welcome back! ${displayName}, Here's what's happening with your transportation business today.`} />
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
          <Button type="filled" btnSize="md"
            onClick={() => { lockBodyScroll(); setIsBookingModelOpen({ isOpen: true, type: "new" }); }}
            className="w-full sm:w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3"
          >
            <div className="flex gap-2 sm:gap-[15px] items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block"><PlusIcon /></span>
              <span className="sm:hidden"><PlusIcon height={16} width={16} /></span>
              <span>Create Booking</span>
            </div>
          </Button>
        </div>
      </div>

      <div className="px-5 pt-5" style={{ height: "500px" }}>
        <div className="flex flex-col md:flex-row gap-4 h-full">
          {/* Map Panel */}
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
            {/* ── FIXED: explicit flex-1 + overflow-hidden so map fills remaining space ── */}
            <div className="flex-1 rounded-xl overflow-hidden" style={{ minHeight: 0, position: "relative" }}>
              {mapType === "barikoi" && apiKeys.barikoiKey && (
                <BarikoiMapSection
                  key={`barikoi-${apiKeys.barikoiKey}-${apiKeys.countryOfUse}`}
                  {...mapProps}
                />
              )}
              {mapType === "google" && apiKeys.googleKey && (
                <GoogleMapSection
                  key={`google-${apiKeys.googleKey}-${apiKeys.countryOfUse}`}
                  {...mapProps}
                />
              )}
              {!mapType && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
                  <div className="text-gray-400 text-sm">Loading map…</div>
                </div>
              )}
            </div>
          </div>

          {/* Waiting Drivers */}
          <div className="w-full lg:w-[20.5%] bg-orange-50 rounded-2xl shadow p-3 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Drivers Waiting</h3>
              <span className="font-semibold">{waitingDrivers.length}</span>
            </div>
            <table className="w-full text-xs rounded-xl">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-left py-1 text-[11px]">Sr No</th>
                  <th className="text-left text-[11px]">Driver</th>
                  <th className="text-left text-[11px]">Plot</th>
                  <th className="text-right text-[11px]">Rank</th>
                </tr>
              </thead>
              <tbody>
                {waitingDrivers.length > 0 ? (
                  waitingDrivers.map((driver, i) => (
                    <tr key={driver.id || driver.driver_id || i} className="border-t">
                      <td className="py-1">{i + 1}</td>
                      <td>{driver.name || driver.driver_name || "Unknown"}</td>
                      <td>{driver.plot_name && driver.plot && driver.plot_name !== driver.plot.toString() ? `${driver.plot_name} (${driver.plot})` : (driver.plot_name || driver.plot || "N/A")}</td>
                      <td className="text-right">{driver.rank || driver.ranking || i + 1}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="text-center py-4 text-gray-500">No waiting drivers</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* On Jobs */}
          <div className="w-full lg:w-[20.5%] bg-green-50 rounded-2xl shadow p-3 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200">
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
              <button key={card.filter} onClick={() => setActiveBookingFilter(card.filter)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 font-semibold text-white text-[11px] transition-colors ${isActive ? "bg-[#1F41BB]" : "bg-blue-500 hover:bg-blue-600"}`}
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

// import React, { useCallback, useEffect, useRef, useState } from "react";
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
// import { apiGetDispatchSystem, apiGetCompanyApiKeys } from "../../../../services/SettingsConfigurationServices";
// import { getDashboardCards, apiGetAllPlot } from "../../../../services/AddBookingServices";
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
//   KE: { lat: -1.2921, lng: 36.8219 },
//   ID: { lat: -0.7893, lng: 113.9213 },
//   PH: { lat: 12.8797, lng: 121.774 },
//   DEFAULT: { lat: 20, lng: 0 },
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

// const getApiKeys = (stateApiKeys) => {
//   const tenant = getTenantData();
//   const data = tenant?.data || {};
//   return {
//     googleKey: stateApiKeys?.googleKey || data?.google_api_key || GOOGLE_KEY,
//     barikoiKey: stateApiKeys?.barikoiKey || data?.barikoi_api_key || BARIKOI_KEY,
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
//     script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey || GOOGLE_KEY}&libraries=places`;
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
//     let data = rawData;
//     if (typeof data === "string") {
//       const fixed = data
//         .replace(/,\s*}/g, "}")
//         .replace(/,\s*]/g, "]")
//         .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
//       data = JSON.parse(fixed);
//     }
//     if (Array.isArray(data)) return data[0];
//     return data;
//   } catch {
//     if (typeof rawData === "string") {
//       const latM = rawData.match(/"lat(?:itude)?":\s*(-?[\d.]+)/);
//       const lngM = rawData.match(/"lng(?:itude)?":\s*(-?[\d.]+)/);
//       const cidM = rawData.match(/"client_id":\s*"([^"]*)/);
//       const didM = rawData.match(/"dispatcher_id":\s*(\d+)/);
//       const stM = rawData.match(/"driving_status":\s*"([^"]*)"/);
//       const nameM = rawData.match(/"name":\s*"([^"]*)"/);
//       const phoneM = rawData.match(/"phone_no":\s*"([^"]*)"/);
//       const plateM = rawData.match(/"plate_no":\s*"([^"]*)"/);
//       const idM = rawData.match(/"id":\s*(\d+)/);

//       if (latM && lngM) {
//         return {
//           latitude: parseFloat(latM[1]),
//           longitude: parseFloat(lngM[1]),
//           client_id: cidM?.[1] ?? null,
//           dispatcher_id: didM ? parseInt(didM[1]) : null,
//           id: idM ? parseInt(idM[1]) : null,
//           driving_status: stM?.[1] ?? "idle",
//           name: nameM?.[1] ?? null,
//           phone_no: phoneM?.[1] ?? null,
//           plate_no: plateM?.[1] ?? null,
//         };
//       }
//     }
//     return null;
//   }
// };

// const parseCoordinates = (plot) => {
//   if (!plot) return [];
//   try {
//     let coords = plot.coordinates;
//     if (typeof coords === "string") coords = JSON.parse(coords);
//     if (!Array.isArray(coords)) return [];
//     return coords.map((c) => ({ lat: Number(c.lat), lng: Number(c.lng) }));
//   } catch (err) {
//     return [];
//   }
// };

// const buildPopupHTML = (data) => {
//   const name = data.name || data.driver_name || data.driverName || "Unknown Driver";
//   const phone = data.phone_no || data.phone || "N/A";
//   const plate = data.plate_no || data.plate || "N/A";
//   const status = (data.driving_status || data.status || "idle").toLowerCase();

//   const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
//   const statusColor = status === "busy" ? "#10b981" : "#ef4444"; // Green for Busy, Red for Idle (matches marker icons)

//   return `
//     <div style="font-family: 'Inter', sans-serif; min-width: 150px; padding: 4px 6px;">
//       <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
//         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #4b5563;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
//         <span style="font-weight: 700; color: #111827; font-size: 15px;">${name}</span>
//       </div>
//       <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
//         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #6b7280;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
//         <span style="color: #4b5563; font-size: 13px;">${phone}</span>
//       </div>
//       <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
//         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #6b7280;"><rect x="1" y="3" width="22" height="18" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
//         <span style="background: #f9fafb; color: #374151; font-weight: 600; font-size: 12px; padding: 1px 6px; border-radius: 4px; border: 1px solid #e5e7eb;">${plate}</span>
//       </div>
//       <div style="display: flex; align-items: center; gap: 6px; border-top: 1px solid #f3f4f6; padding-top: 8px;">
//         <span style="height: 7px; width: 7px; background-color: ${statusColor}; border-radius: 50%; display: inline-block;"></span>
//         <span style="color: ${statusColor}; font-weight: 700; font-size: 12px; text-transform: capitalize; border: 1px solid ${statusColor}40; padding: 1px 8px; border-radius: 20px; background: ${statusColor}10;">${statusLabel}</span>
//       </div>
//     </div>
//   `;
// };

// const GoogleMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers }) => {
//   const { googleKey } = getApiKeys(apiKeys);
//   const [isMapReady, setIsMapReady] = useState(false);
//   const plotPolygons = useRef([]);

//   const renderPlots = () => {
//     if (!mapInstance.current || !plotsData) return;
//     plotPolygons.current.forEach(p => p.setMap(null));
//     plotPolygons.current = [];

//     plotsData.forEach(plot => {
//       const coords = parseCoordinates(plot);
//       if (coords.length === 0) return;
//       const polygon = new window.google.maps.Polygon({
//         paths: coords,
//         strokeColor: "#1F41BB",
//         strokeOpacity: 0.8,
//         strokeWeight: 2,
//         fillColor: "#1F41BB",
//         fillOpacity: 0.1,
//         map: mapInstance.current
//       });
//       plotPolygons.current.push(polygon);
//     });
//   };

//   useEffect(() => {
//     if (mapInstance.current && plotsData) renderPlots();
//   }, [plotsData]);

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
//     if (!googleKey) return;
//     loadGoogleMaps(googleKey)
//       .then(() => {
//         if (!mounted || !mapRef.current || mapInstance.current) return;
//         mapInstance.current = new window.google.maps.Map(mapRef.current, {
//           center: { lat: countryCenter.lat, lng: countryCenter.lng },
//           zoom: 5,
//           styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
//         });
//         setIsMapReady(true);
//       })
//       .catch((err) => console.error("Google Map load failed:", err));
//     return () => { mounted = false; };
//   }, [googleKey]);

//   // ─── KEY FIX: socketRef keeps stable reference — never causes useEffect re-run ───
//   const socketRef = useRef(socket);
//   useEffect(() => { socketRef.current = socket; }, [socket]);

//   const driverDataRef = useRef(driverData);
//   useEffect(() => { driverDataRef.current = driverData; }, [driverData]);

//   useEffect(() => {
//     const getDriverId = (d) => String(d.id || d.driver_id || d.dispatcher_id || d.client_id || "");

//     const activeIds = new Set([
//       ...waitingDrivers.map(getDriverId),
//       ...onJobDrivers.map(getDriverId)
//     ].filter(id => id !== ""));

//     // Function to render/update a single marker
//     const renderMarker = (id, data) => {
//       if (!mapInstance.current || !id) return;
      
//       const latitude = data?.latitude !== undefined ? data?.latitude : data?.lat;
//       const longitude = data?.longitude !== undefined ? data?.longitude : data?.lng;
//       if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;
//       const position = { lat: Number(latitude), lng: Number(longitude) };
      
//       const status = data?.driving_status || data?.status || "idle";
//       const validStatus = status === "busy" ? "busy" : "idle";
//       const name = data?.name || data?.driverName || data?.driver_name || `Driver ${id}`;
//       const infoContent = buildPopupHTML(data);

//       if (markers.current[id]) {
//         const marker = markers.current[id];
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
//         markers.current[id] = marker;
//       }
//     };

//     // Synchronize markers with active lists
//     if (isMapReady && mapInstance.current) {
//       // 1. Remove markers not in active lists
//       Object.keys(markers.current).forEach(id => {
//         if (!activeIds.has(id)) {
//           markers.current[id].setMap(null);
//           delete markers.current[id];
//         }
//       });

//       // 2. Add/Update markers for active drivers
//       Object.entries(driverDataRef.current).forEach(([id, data]) => {
//         if (activeIds.has(id)) renderMarker(id, data);
//       });
//     }

//     const handle = (rawData) => {
//       const data = parseDriverData(rawData);
//       if (!data) return;
//       const id = getDriverId(data);
//       if (!id) return;

//       // Update global driverData so it's preserved
//       setDriverData(prev => ({ ...prev, [id]: { ...prev[id], ...data } }));
      
//       // If active, update map immediately
//       if (activeIds.has(id)) renderMarker(id, data);
//     };

//     if (socketRef.current) socketRef.current.on("driver-location-update", handle);
//     return () => {
//       if (socketRef.current) socketRef.current.off("driver-location-update", handle);
//     };
//   }, [isMapReady, waitingDrivers, onJobDrivers]); // ← EMPTY DEPS: registers once, never torn down by re-renders

//   useEffect(() => {
//     Object.values(markers.current).forEach((m) => m.setVisible(true));
//     // ONLY fit bounds once on initial load to avoid constant map jumping/lag
//     if (mapInstance.current && !mapInstance.current._hasFittedOnce && Object.keys(markers.current).length > 0) {
//       setTimeout(fitMapToMarkers, 500);
//       mapInstance.current._hasFittedOnce = true;
//     }
//   }, [driverData]);

//   return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />;
// };

// const BarikoiMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers }) => {
//   const [mapReady, setMapReady] = useState(false);
//   const { barikoiKey } = getApiKeys(apiKeys);

//   const renderPlots = () => {
//     if (!mapInstance.current || !plotsData) return;
//     const map = mapInstance.current;
//     if (map.getSource("plots")) {
//       map.removeLayer("plots-fill");
//       map.removeLayer("plots-outline");
//       map.removeLayer("plots-labels");
//       map.removeSource("plots");
//     }

//     const features = plotsData.map(plot => {
//       const coords = parseCoordinates(plot);
//       if (coords.length === 0) return null;
//       return {
//         type: "Feature",
//         properties: { name: plot.plot_name || "Plot" },
//         geometry: {
//           type: "Polygon",
//           coordinates: [coords.map(c => [c.lng, c.lat])]
//         }
//       };
//     }).filter(Boolean);

//     map.addSource("plots", {
//       type: "geojson",
//       data: { type: "FeatureCollection", features }
//     });

//     map.addLayer({
//       id: "plots-fill",
//       type: "fill",
//       source: "plots",
//       paint: { "fill-color": "#1F41BB", "fill-opacity": 0.1 }
//     });

//     map.addLayer({
//       id: "plots-outline",
//       type: "line",
//       source: "plots",
//       paint: { "line-color": "#1F41BB", "line-width": 2, "line-opacity": 0.8 }
//     });

//     map.addLayer({
//       id: "plots-labels",
//       type: "symbol",
//       source: "plots",
//       layout: {
//         "text-field": ["get", "name"],
//         "text-size": 12,
//         "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"]
//       },
//       paint: { "text-color": "#1F41BB" }
//     });
//   };

//   useEffect(() => {
//     if (mapReady && plotsData) renderPlots();
//   }, [mapReady, plotsData]);

//   useEffect(() => {
//     let mounted = true;
//     const init = async () => {
//       if (!barikoiKey) return;
//       try { await loadBarikoiMaps(); }
//       catch (err) { console.error("Barikoi load failed:", err); return; }
//       if (!mounted || !mapRef.current || mapInstance.current) return;
//       const center = getCountryCenter();
//       mapRef.current.style.width = "100%";
//       mapRef.current.style.height = "100%";
//       mapRef.current.style.minHeight = "400px";
//       const map = new window.maplibregl.Map({
//         container: mapRef.current,
//         style: `https://map.barikoi.com/styles/osm-liberty/style.json?key=${barikoiKey}`,
//         center: [center.lng, center.lat],
//         zoom: 6,
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
//         if (typeof mapInstance.current.remove === "function") {
//           mapInstance.current.remove();
//         }
//         mapInstance.current = null;
//       }
//     };
//   }, [barikoiKey]);

//   useEffect(() => {
//     const handleResize = () => {
//       if (mapInstance.current && typeof mapInstance.current.resize === "function") {
//         mapInstance.current.resize();
//       }
//     };
//     window.addEventListener("resize", handleResize);
//     const raf = requestAnimationFrame(() => {
//       if (mapInstance.current && typeof mapInstance.current.resize === "function") {
//         mapInstance.current.resize();
//       }
//     });
//     return () => { window.removeEventListener("resize", handleResize); cancelAnimationFrame(raf); };
//   }, [mapReady]);

//   // ─── KEY FIX: same socketRef pattern ──────────────────────────────────────
//   const socketRef = useRef(socket);
//   useEffect(() => { socketRef.current = socket; }, [socket]);

//   useEffect(() => {
//     if (!mapReady) return;

//     const updateOrAddMarker = (data) => {
//       if (!mapInstance.current) return;
//       const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
//       if (!driverId && driverId !== 0) return;
//       const lat = Number(data.latitude !== undefined ? data.latitude : data.lat);
//       const lng = Number(data.longitude !== undefined ? data.longitude : data.lng);
//       if (isNaN(lat) || isNaN(lng)) return;
//       const lngLat = [lng, lat];
//       const status = data.driving_status || "idle";
//       const validStatus = status === "busy" ? "busy" : "idle";
//       const name = data.name || data.driverName || data.driver_name || `Driver ${driverId}`;

//       setDriverData((prev) => ({
//         ...prev,
//         [driverId]: { ...data, position: { lat, lng }, status: validStatus, driving_status: validStatus, name },
//       }));

//       const popupHTML = buildPopupHTML(data);

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
//           if (marker._isOpen) { popup.remove(); marker._isOpen = false; }
//           else {
//             Object.values(markers.current).forEach((m) => { m.getPopup()?.remove(); m._isOpen = false; });
//             popup.setLngLat(lngLat).addTo(mapInstance.current);
//             marker._isOpen = true;
//           }
//         });
//         marker._visible = true;
//         markers.current[driverId] = marker;
//       }
//     };

//     // Initialize from cache/lists - only show drivers who are in the active lists
//     if (mapInstance.current && driverData) {
//       const activeIds = new Set([
//         ...waitingDrivers.map(d => d.id || d.driver_id || d.dispatcher_id),
//         ...onJobDrivers.map(d => d.id || d.driver_id || d.dispatcher_id)
//       ]);

//       // Remove markers for drivers no longer in active lists
//       Object.keys(markers.current).forEach(id => {
//         if (!activeIds.has(id)) {
//           markers.current[id].remove();
//           delete markers.current[id];
//         }
//       });

//       Object.values(driverData).forEach(data => {
//         const id = data.id || data.driver_id || data.dispatcher_id || data.client_id;
//         if (activeIds.has(id)) {
//           const lat = data.latitude !== undefined ? data.latitude : data.lat;
//           const lng = data.longitude !== undefined ? data.longitude : data.lng;
//           if (lat != null && lng != null) updateOrAddMarker(data);
//         }
//       });
//     }

//     const handle = (rawData) => {
//       const data = parseDriverData(rawData);
//       if (data) updateOrAddMarker(data);
//     };

//     if (socketRef.current) socketRef.current.on("driver-location-update", handle);
//     return () => {
//       if (socketRef.current) socketRef.current.off("driver-location-update", handle);
//     };
//   }, [mapReady, waitingDrivers, onJobDrivers]);

//   useEffect(() => {
//     // ONLY fit bounds once on initial load to avoid constant map jumping/lag
//     if (mapReady && mapInstance.current && !mapInstance.current._hasFittedOnce && Object.keys(markers.current).length > 0) {
//       const fitMapToMarkers = () => {
//         if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
//         let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity, hasVisible = false;
//         Object.values(markers.current).forEach((m) => {
//           const { lat, lng } = m.getLngLat();
//           minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
//           minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
//           hasVisible = true;
//         });
//         if (hasVisible) mapInstance.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50, maxZoom: 15 });
//       };
//       setTimeout(fitMapToMarkers, 500);
//       mapInstance.current._hasFittedOnce = true;
//     }
//   }, [mapReady, driverData]);

//   return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />;
// };

// const Overview = () => {
//   const [isBookingModelOpen, setIsBookingModelOpen] = useState({ type: "new", isOpen: false });
//   const [isMessageModelOpen, setIsMessageModelOpen] = useState({ type: "new", isOpen: false });
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [isAddBookingDisabled, setIsAddBookingDisabled] = useState(true);
//   const [isLoadingDispatchSystem, setIsLoadingDispatchSystem] = useState(true);
//   const [activeBookingFilter, setActiveBookingFilter] = useState("todays_booking");
//   const [mapType, setMapType] = useState(() => getMapType());
//   const countryCenter = React.useMemo(() => getCountryCenter(), []);
//   const [plotsData, setPlotsData] = useState([]);

//   const mapRef = useRef(null);
//   const mapInstance = useRef(null);
//   const markers = useRef({});
//   const socket = useSocket();
//   const socketRef = useRef(socket);
//   const plotsDataRef = useRef(plotsData);
//   useEffect(() => { plotsDataRef.current = plotsData; }, [plotsData]);

//   const [apiKeys, setApiKeys] = useState({
//     googleKey: GOOGLE_KEY,
//     barikoiKey: BARIKOI_KEY,
//     searchApi: "google"
//   });

//   const [dashboardCounts, setDashboardCounts] = useState({
//     todaysBooking: 0, preBookings: 0, recentJobs: 0,
//     completed: 0, noShow: 0, cancelled: 0,
//   });

//   const [driverData, setDriverData] = useState(() => {
//     try {
//       const saved = localStorage.getItem("driverDataCache");
//       if (!saved) return {};
//       const parsed = JSON.parse(saved);
//       const normalized = {};
//       Object.entries(parsed).forEach(([id, data]) => {
//         normalized[String(id)] = data;
//       });
//       return normalized;
//     } catch {
//       return {};
//     }
//   });

//   const [waitingDrivers, setWaitingDrivers] = useState(() => {
//     try {
//       const saved = localStorage.getItem("waitingDriversCache");
//       return saved ? JSON.parse(saved) : [];
//     } catch { return []; }
//   });

//   const [onJobDrivers, setOnJobDrivers] = useState(() => {
//     try {
//       const saved = localStorage.getItem("onJobDriversCache");
//       return saved ? JSON.parse(saved) : [];
//     } catch { return []; }
//   });

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       localStorage.setItem("driverDataCache", JSON.stringify(driverData));
//     }, 2000); // Debounce localStorage updates
//     return () => clearTimeout(timer);
//   }, [driverData]);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       localStorage.setItem("waitingDriversCache", JSON.stringify(waitingDrivers));
//     }, 2000);
//     return () => clearTimeout(timer);
//   }, [waitingDrivers]);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       localStorage.setItem("onJobDriversCache", JSON.stringify(onJobDrivers));
//     }, 2000);
//     return () => clearTimeout(timer);
//   }, [onJobDrivers]);

//   useEffect(() => {
//     const fetchApiKeys = async () => {
//       try {
//         const res = await apiGetCompanyApiKeys();
//         if (res.data?.success) {
//           const data = res.data.data;
//           const googleKey = data.google_api_key && data.google_api_key.startsWith("AIza") ? data.google_api_key : GOOGLE_KEY;
//           const barikoiKey = data.barikoi_api_key && data.barikoi_api_key.startsWith("bkoi_") ? data.barikoi_api_key : BARIKOI_KEY;
//           setApiKeys({
//             googleKey,
//             barikoiKey,
//             searchApi: data.search_api || "google"
//           });
//           if (data.maps_api) {
//             setMapType(data.maps_api.toLowerCase());
//           }
//         }
//       } catch (err) {
//         console.error("Fetch API keys error:", err);
//       }
//     };
//     fetchApiKeys();
//   }, []);

//   useEffect(() => {
//     const fetchPlots = async () => {
//       try {
//         const res = await apiGetAllPlot({ page: 1, limit: 100 });
//         if (res.data?.success) {
//           setPlotsData(res.data.data?.data || res.data.data || []);
//         }
//       } catch (err) {
//         console.error("Fetch plots error:", err);
//       }
//     };
//     fetchPlots();
//   }, []);

//   useEffect(() => {
//     socketRef.current = socket;
//   }, [socket]);

//   const driverCounts = React.useMemo(() => {
//     return {
//       busy: onJobDrivers.length,
//       idle: waitingDrivers.length,
//       total: onJobDrivers.length + waitingDrivers.length
//     };
//   }, [onJobDrivers, waitingDrivers]);

//   // Prune idle drivers that haven't been updated in 5 seconds
//   useEffect(() => {
//     const interval = setInterval(() => {
//       const now = Date.now();
//       setWaitingDrivers((prev) => {
//         const filtered = prev.filter((driver) => {
//           if (!driver.updatedAt) return true;
//           return now - driver.updatedAt < 5000;
//         });
//         return filtered.length === prev.length ? prev : filtered;
//       });
//     }, 1000);
//     return () => clearInterval(interval);
//   }, []);
  


//   const user = useAppSelector((state) => state.auth.user);
//   const displayName = user?.name
//     ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
//     : "Admin";

//   const fetchDashboardCards = useCallback(async () => {
//     try {
//       const res = await getDashboardCards();
//       if (res.data?.success) setDashboardCounts(res.data.data);
//     } catch (err) {
//       console.error("Dashboard cards error:", err);
//     }
//   }, []);

//   useEffect(() => {
//     fetchDashboardCards();
//   }, [fetchDashboardCards]);

//   useEffect(() => {
//     if (!socket) return;

//     const handleDashboardUpdate = (data) => {
//       console.log("📊 [Socket] dashboard-cards-update:", data);
//       setDashboardCounts(data);
//     };

//     const handleNotificationRide = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("🔔 [Socket] notification-ride:", data);
//       showRideNotification(data);
//     };

//     const handleWaitingDriver = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("🕒 [Socket] waiting-driver-event:", data);

//       if (Array.isArray(data)) {
//         setWaitingDrivers(data.map(d => ({ ...d, updatedAt: Date.now() })));
//         return;
//       }

//       if (data?.driverName || data?.driver_name) {
//         const name = data.driverName || data.driver_name;
//         const driverId = data.id || data.driver_id || data.dispatcher_id;

//         const sId = String(driverId);
//         // Update marker status on map if we have driverId
//         if (sId) {
//           setDriverData(prev => {
//             let lat = data.latitude || data.lat;
//             let lng = data.longitude || data.lng;
//             const status = "idle";
            
//             // Fallback to plot coordinates if GPS is missing
//             if ((lat == null || lng == null) && (data.plot_id || data.plot)) {
//               const plotId = data.plot_id || data.plot;
//               const plot = plotsDataRef.current.find(p => p.id == plotId || p.plot_id == plotId);
//               if (plot) {
//                 const coords = parseCoordinates(plot);
//                 if (coords.length > 0) {
//                   lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
//                   lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
//                 }
//               }
//             }

//             if (prev[sId]) {
//               return { ...prev, [sId]: { ...prev[sId], ...data, position: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : prev[sId].position, status, driving_status: status } };
//             } else if (lat && lng) {
//               // Add new driver to map if coordinates are present (or fallback found)
//               return { ...prev, [sId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } };
//             }
//             return prev;
//           });
//         }

//         // Remove from on-job list if they were there
//         setOnJobDrivers((prev) => prev.filter((d) => d.name !== name));

//         const obj = {
//           id: driverId || Date.now(),
//           name: name,
//           plot: data.plot_name || data.plot || "N/A",
//           rank: data.rank || 1,
//           ...data
//         };

//         setWaitingDrivers((prev) => {
//           const exists = prev.some((d) => d.name === obj.name);
//           const updatedObj = { ...obj, updatedAt: Date.now() };
//           return exists ? prev.map((d) => d.name === obj.name ? updatedObj : d) : [updatedObj, ...prev];
//         });
//       }
//     };

//     const handleOnJobDriver = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("🚕 [Socket] on-job-driver-event:", data);

//       if (Array.isArray(data)) {
//         setOnJobDrivers(data);
//         return;
//       }

//       if (data?.driverName || data?.driver_name) {
//         const name = data.driverName || data.driver_name;
//         const driverId = data.id || data.driver_id || data.dispatcher_id;

//         const sId = String(driverId);
//         // Update marker status on map if we have driverId
//         if (sId) {
//           setDriverData(prev => {
//             let lat = data.latitude || data.lat;
//             let lng = data.longitude || data.lng;
//             const status = "busy";

//             // Fallback to plot coordinates if GPS is missing
//             if ((lat == null || lng == null) && (data.plot_id || data.plot)) {
//               const plotId = data.plot_id || data.plot;
//               const plot = plotsDataRef.current.find(p => p.id == plotId || p.plot_id == plotId);
//               if (plot) {
//                 const coords = parseCoordinates(plot);
//                 if (coords.length > 0) {
//                   lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
//                   lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
//                 }
//               }
//             }

//             if (prev[sId]) {
//               return { ...prev, [sId]: { ...prev[sId], ...data, position: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : prev[sId].position, status, driving_status: status } };
//             } else if (lat && lng) {
//               // Add new driver to map if coordinates are present (or fallback found)
//               return { ...prev, [sId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } };
//             }
//             return prev;
//           });
//         }

//         // Remove from waiting list if they were there
//         setWaitingDrivers((prev) => prev.filter((d) => d.name !== name));

//         const obj = { id: driverId || Date.now(), name: name, ...data };
//         setOnJobDrivers((prev) => {
//           const exists = prev.some((d) => d.name === obj.name);
//           return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev];
//         });
//       }
//     };

//     const handleJobAccepted = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("✅ [Socket] job-accepted-by-driver:", data);

//       const driverName = data?.driver_name || data?.driverName;
//       if (driverName) {
//         // Remove from waiting list
//         setWaitingDrivers((prev) => prev.filter((d) => d.name !== driverName));
//         // Add to on-job list
//         const obj = { id: Date.now(), name: driverName, ...data };
//         setOnJobDrivers((prev) => {
//           const exists = prev.some((d) => d.name === obj.name);
//           return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev];
//         });
//       }
//     };

//     const handleJobCancelled = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("❌ [Socket] job-cancelled-by-driver:", data);

//       const driverName = data?.driver_name || data?.driverName;
//       if (driverName) {
//         // Remove from on-job list
//         setOnJobDrivers((prev) => prev.filter((d) => d.name !== driverName));
//         // Note: they will be added back to waiting list via the waiting-driver-event
//       }
//       fetchDashboardCards();
//     };

//     const handleBookingCancelled = (event, data) => {
//       console.log(`❌ [Socket] ${event}:`, data);
//       fetchDashboardCards();
//     };

//     // Global listener for all events
//     socket.onAny((event, ...args) => {
//       console.log(`🌐 [Socket Event] ${event}:`, args);
//     });

//     const handleDriverLocationUpdate = (rawData) => {
//       const data = parseDriverData(rawData);
//       if (!data) return;
//       const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
//       if (!driverId) return;
//       const sId = String(driverId);
//       const now = Date.now();

//       setWaitingDrivers((prev) => {
//         const exists = prev.some((d) => String(d.id || d.driver_id || d.dispatcher_id) === sId);
//         if (exists) {
//           return prev.map((d) =>
//             String(d.id || d.driver_id || d.dispatcher_id) === sId
//               ? { ...d, ...data, updatedAt: now }
//               : d
//           );
//         }
//         return prev;
//       });
//     };

//     socket.on("dashboard-cards-update", handleDashboardUpdate);
//     socket.on("waiting-driver-event", handleWaitingDriver);
//     socket.on("on-job-driver-event", handleOnJobDriver);
//     socket.on("notification-ride", handleNotificationRide);
//     socket.on("job-accepted-by-driver", handleJobAccepted);
//     socket.on("job-cancelled-by-driver", handleJobCancelled);
//     socket.on("driver-location-update", handleDriverLocationUpdate);
//     socket.on("booking-cancelled-event", (data) => handleBookingCancelled("booking-cancelled-event", data));
//     socket.on("booking-cancelled", (data) => handleBookingCancelled("booking-cancelled", data));
//     socket.on("cancel-booking-event", (data) => handleBookingCancelled("cancel-booking-event", data));

//     return () => {
//       socket.offAny();
//       socket.off("dashboard-cards-update", handleDashboardUpdate);
//       socket.off("waiting-driver-event", handleWaitingDriver);
//       socket.off("on-job-driver-event", handleOnJobDriver);
//       socket.off("notification-ride", handleNotificationRide);
//       socket.off("job-accepted-by-driver", handleJobAccepted);
//       socket.off("job-cancelled-by-driver", handleJobCancelled);
//       socket.off("driver-location-update", handleDriverLocationUpdate);
//       socket.off("booking-cancelled-event");
//       socket.off("booking-cancelled");
//       socket.off("cancel-booking-event");
//     };
//   }, [socket, fetchDashboardCards]);

//   useEffect(() => {
//     const handleOpenModal = () => {
//       lockBodyScroll();
//       setIsBookingModelOpen({ isOpen: true, type: "new" });
//     };
//     window.addEventListener("openAddBookingModal", handleOpenModal);
//     return () => window.removeEventListener("openAddBookingModal", handleOpenModal);
//   }, []);

//   // const checkDispatchSystem = async () => {
//   //   try {
//   //     setIsLoadingDispatchSystem(true);
//   //     const response = await apiGetDispatchSystem();
//   //     let data = response?.data?.data || response?.data || response;

//   //     if (!Array.isArray(data)) {
//   //       if (data && typeof data === "object") {
//   //         const possibleArrayKeys = ["items", "results", "dispatches", "systems", "list"];
//   //         for (const key of possibleArrayKeys) {
//   //           if (Array.isArray(data[key])) { data = data[key]; break; }
//   //         }
//   //       }
//   //       if (!Array.isArray(data)) {
//   //         data = (data && typeof data === "object" && Object.keys(data).length > 0) ? [data] : [];
//   //       }
//   //     }

//   //     const manualDispatchItem = data.find(
//   //       (item) => item.dispatch_system === "manual_dispatch_only"
//   //     );

//   //     const isManualEnabled =
//   //       manualDispatchItem?.status === "enable" ||
//   //       manualDispatchItem?.status === "enabled" ||
//   //       manualDispatchItem?.status === 1 ||
//   //       manualDispatchItem?.status === true;

//   //     setIsAddBookingDisabled(!isManualEnabled);
//   //   } catch (error) {
//   //     console.error("Dispatch system error:", error);
//   //     setIsAddBookingDisabled(true);
//   //   } finally {
//   //     setIsLoadingDispatchSystem(false);
//   //   }
//   // };

//   // useEffect(() => { checkDispatchSystem(); }, []);

//   const mapProps = { mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers };

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

//           {/* <Button
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
//               ? "!bg-gray-400 !cursor-not-allowed opacity-60 hover:!bg-gray-400"
//               : ""
//               }`}
//             style={isAddBookingDisabled || isLoadingDispatchSystem ? { pointerEvents: "none" } : {}}
//           >
//             <div className="flex gap-2 sm:gap-[15px] items-center justify-center whitespace-nowrap">
//               <span className="hidden sm:inline-block"><PlusIcon /></span>
//               <span className="sm:hidden"><PlusIcon height={16} width={16} /></span>
//               <span>{isLoadingDispatchSystem ? "Loading..." : "Create Booking"}</span>
//             </div>
//           </Button> */}
//           <Button
//             type="filled"
//             btnSize="md"
//             onClick={() => {
//               lockBodyScroll();
//               setIsBookingModelOpen({ isOpen: true, type: "new" });
//             }}
//             className={`w-full sm:w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3`}
//           >
//             <div className="flex gap-2 sm:gap-[15px] items-center justify-center whitespace-nowrap">
//               <span className="hidden sm:inline-block"><PlusIcon /></span>
//               <span className="sm:hidden"><PlusIcon height={16} width={16} /></span>
//               <span>Create Booking</span>
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

//           <div className="w-full lg:w-[20.5%] bg-orange-50 rounded-2xl shadow p-3  max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-200">
//             <div className="flex items-center justify-between mb-2">
//               <h3 className="font-semibold">Drivers Waiting</h3>
//               <span className="font-semibold">{waitingDrivers.length}</span>
//             </div>
//             <table className="w-full text-xs rounded-xl">
//               <thead className="text-gray-500">
//                 <tr>
//                   <th className="text-left py-1 text-[11px]">Sr No</th>
//                   <th className="text-left text-[11px]">Driver</th>
//                   <th className="text-left text-[11px]">Plot</th>
//                   {/* <th className="text-center text-[11px]">Drivers</th> */}
//                   <th className="text-right text-[11px]">Rank</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {waitingDrivers.length > 0 ? (
//                   waitingDrivers.map((driver, i) => (
//                     <tr key={driver.id || driver.driver_id || i} className="border-t">
//                       <td className="py-1">{i + 1}</td>
//                       <td>
//                         {driver.name || driver.driver_name || "Unknown"}
//                       </td>
//                       <td>
//                         {driver.plot_name && driver.plot && driver.plot_name !== driver.plot.toString()
//                           ? `${driver.plot_name} (${driver.plot})`
//                           : (driver.plot_name || driver.plot || "N/A")}
//                       </td>
//                       {/* <td className="text-center">
//                         {driver.total_drivers || driver.drivers_count || "0"}
//                       </td> */}
//                       <td className="text-right">
//                         {driver.rank || driver.ranking || i + 1}
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan="5" className="text-center py-4 text-gray-500">
//                       No waiting drivers
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           <div className="w-full lg:w-[20.5%] bg-green-50 rounded-2xl shadow p-3 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-200">
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

// import React, { useCallback, useEffect, useRef, useState } from "react";
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
// import { apiGetDispatchSystem, apiGetCompanyApiKeys } from "../../../../services/SettingsConfigurationServices";
// import { getDashboardCards, apiGetAllPlot } from "../../../../services/AddBookingServices";
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
//   KE: { lat: -1.2921, lng: 36.8219 },
//   ID: { lat: -0.7893, lng: 113.9213 },
//   PH: { lat: 12.8797, lng: 121.774 },
//   DEFAULT: { lat: 20, lng: 0 },
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

// const getApiKeys = (stateApiKeys) => {
//   const tenant = getTenantData();
//   const data = tenant?.data || {};
//   return {
//     googleKey: stateApiKeys?.googleKey || data?.google_api_key || GOOGLE_KEY,
//     barikoiKey: stateApiKeys?.barikoiKey || data?.barikoi_api_key || BARIKOI_KEY,
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
//     script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey || GOOGLE_KEY}&libraries=places`;
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
//     let data = rawData;
//     if (typeof data === "string") {
//       const fixed = data
//         .replace(/,\s*}/g, "}")
//         .replace(/,\s*]/g, "]")
//         .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
//       data = JSON.parse(fixed);
//     }
//     if (Array.isArray(data)) return data[0];
//     return data;
//   } catch {
//     if (typeof rawData === "string") {
//       const latM = rawData.match(/"lat(?:itude)?":\s*(-?[\d.]+)/);
//       const lngM = rawData.match(/"lng(?:itude)?":\s*(-?[\d.]+)/);
//       const cidM = rawData.match(/"client_id":\s*"([^"]*)/);
//       const didM = rawData.match(/"dispatcher_id":\s*(\d+)/);
//       const stM = rawData.match(/"driving_status":\s*"([^"]*)"/);
//       const nameM = rawData.match(/"name":\s*"([^"]*)"/);
//       const phoneM = rawData.match(/"phone_no":\s*"([^"]*)"/);
//       const plateM = rawData.match(/"plate_no":\s*"([^"]*)"/);
//       const idM = rawData.match(/"id":\s*(\d+)/);

//       if (latM && lngM) {
//         return {
//           latitude: parseFloat(latM[1]),
//           longitude: parseFloat(lngM[1]),
//           client_id: cidM?.[1] ?? null,
//           dispatcher_id: didM ? parseInt(didM[1]) : null,
//           id: idM ? parseInt(idM[1]) : null,
//           driving_status: stM?.[1] ?? "idle",
//           name: nameM?.[1] ?? null,
//           phone_no: phoneM?.[1] ?? null,
//           plate_no: plateM?.[1] ?? null,
//         };
//       }
//     }
//     return null;
//   }
// };

// const parseCoordinates = (plot) => {
//   if (!plot) return [];
//   try {
//     let coords = plot.coordinates;
//     if (typeof coords === "string") coords = JSON.parse(coords);
//     if (!Array.isArray(coords)) return [];
//     return coords.map((c) => ({ lat: Number(c.lat), lng: Number(c.lng) }));
//   } catch (err) {
//     return [];
//   }
// };

// const buildPopupHTML = (data) => {
//   const name = data.name || data.driver_name || data.driverName || "Unknown Driver";
//   const phone = data.phone_no || data.phone || "N/A";
//   const plate = data.plate_no || data.plate || "N/A";
//   const status = (data.driving_status || data.status || "idle").toLowerCase();

//   const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
//   const statusColor = status === "busy" ? "#10b981" : "#ef4444"; // Green for Busy, Red for Idle (matches marker icons)

//   return `
//     <div style="font-family: 'Inter', sans-serif; min-width: 150px; padding: 4px 6px;">
//       <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
//         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #4b5563;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
//         <span style="font-weight: 700; color: #111827; font-size: 15px;">${name}</span>
//       </div>
//       <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
//         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #6b7280;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
//         <span style="color: #4b5563; font-size: 13px;">${phone}</span>
//       </div>
//       <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
//         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #6b7280;"><rect x="1" y="3" width="22" height="18" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
//         <span style="background: #f9fafb; color: #374151; font-weight: 600; font-size: 12px; padding: 1px 6px; border-radius: 4px; border: 1px solid #e5e7eb;">${plate}</span>
//       </div>
//       <div style="display: flex; align-items: center; gap: 6px; border-top: 1px solid #f3f4f6; padding-top: 8px;">
//         <span style="height: 7px; width: 7px; background-color: ${statusColor}; border-radius: 50%; display: inline-block;"></span>
//         <span style="color: ${statusColor}; font-weight: 700; font-size: 12px; text-transform: capitalize; border: 1px solid ${statusColor}40; padding: 1px 8px; border-radius: 20px; background: ${statusColor}10;">${statusLabel}</span>
//       </div>
//     </div>
//   `;
// };

// const GoogleMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers }) => {
//   const { googleKey } = getApiKeys(apiKeys);
//   const [isMapReady, setIsMapReady] = useState(false);
//   const plotPolygons = useRef([]);

//   const renderPlots = () => {
//     if (!mapInstance.current || !plotsData) return;
//     plotPolygons.current.forEach(p => p.setMap(null));
//     plotPolygons.current = [];

//     plotsData.forEach(plot => {
//       const coords = parseCoordinates(plot);
//       if (coords.length === 0) return;
//       const polygon = new window.google.maps.Polygon({
//         paths: coords,
//         strokeColor: "#1F41BB",
//         strokeOpacity: 0.8,
//         strokeWeight: 2,
//         fillColor: "#1F41BB",
//         fillOpacity: 0.1,
//         map: mapInstance.current
//       });
//       plotPolygons.current.push(polygon);
//     });
//   };

//   useEffect(() => {
//     if (mapInstance.current && plotsData) renderPlots();
//   }, [plotsData]);

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
//     if (!googleKey) return;
//     loadGoogleMaps(googleKey)
//       .then(() => {
//         if (!mounted || !mapRef.current || mapInstance.current) return;
//         mapInstance.current = new window.google.maps.Map(mapRef.current, {
//           center: { lat: countryCenter.lat, lng: countryCenter.lng },
//           zoom: 5,
//           styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
//         });
//         setIsMapReady(true);
//       })
//       .catch((err) => console.error("Google Map load failed:", err));
//     return () => { mounted = false; };
//   }, [googleKey]);

//   // ─── KEY FIX: socketRef keeps stable reference — never causes useEffect re-run ───
//   const socketRef = useRef(socket);
//   useEffect(() => { socketRef.current = socket; }, [socket]);

//   const driverDataRef = useRef(driverData);
//   useEffect(() => { driverDataRef.current = driverData; }, [driverData]);

//   useEffect(() => {
//     const getDriverId = (d) => String(d.id || d.driver_id || d.dispatcher_id || d.client_id || "");

//     const activeIds = new Set([
//       ...waitingDrivers.map(getDriverId),
//       ...onJobDrivers.map(getDriverId)
//     ].filter(id => id !== ""));

//     // Function to render/update a single marker
//     const renderMarker = (id, data) => {
//       if (!mapInstance.current || !id) return;
      
//       const latitude = data?.latitude !== undefined ? data?.latitude : data?.lat;
//       const longitude = data?.longitude !== undefined ? data?.longitude : data?.lng;
//       if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;
//       const position = { lat: Number(latitude), lng: Number(longitude) };
      
//       const status = data?.driving_status || data?.status || "idle";
//       const validStatus = status === "busy" ? "busy" : "idle";
//       const name = data?.name || data?.driverName || data?.driver_name || `Driver ${id}`;
//       const infoContent = buildPopupHTML(data);

//       if (markers.current[id]) {
//         const marker = markers.current[id];
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
//         markers.current[id] = marker;
//       }
//     };

//     // Synchronize markers with active lists
//     if (isMapReady && mapInstance.current) {
//       // 1. Remove markers not in active lists
//       Object.keys(markers.current).forEach(id => {
//         if (!activeIds.has(id)) {
//           markers.current[id].setMap(null);
//           delete markers.current[id];
//         }
//       });

//       // 2. Add/Update markers for active drivers
//       Object.entries(driverDataRef.current).forEach(([id, data]) => {
//         if (activeIds.has(id)) renderMarker(id, data);
//       });
//     }

//     const handle = (rawData) => {
//       const data = parseDriverData(rawData);
//       if (!data) return;
//       const id = getDriverId(data);
//       if (!id) return;

//       // Update global driverData so it's preserved
//       setDriverData(prev => ({ ...prev, [id]: { ...prev[id], ...data } }));
      
//       // If active, update map immediately
//       if (activeIds.has(id)) renderMarker(id, data);
//     };

//     if (socketRef.current) socketRef.current.on("driver-location-update", handle);
//     return () => {
//       if (socketRef.current) socketRef.current.off("driver-location-update", handle);
//     };
//   }, [isMapReady, waitingDrivers, onJobDrivers]); // ← EMPTY DEPS: registers once, never torn down by re-renders

//   useEffect(() => {
//     Object.values(markers.current).forEach((m) => m.setVisible(true));
//     // ONLY fit bounds once on initial load to avoid constant map jumping/lag
//     if (mapInstance.current && !mapInstance.current._hasFittedOnce && Object.keys(markers.current).length > 0) {
//       setTimeout(fitMapToMarkers, 500);
//       mapInstance.current._hasFittedOnce = true;
//     }
//   }, [driverData]);

//   return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />;
// };

// const BarikoiMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers }) => {
//   const [mapReady, setMapReady] = useState(false);
//   const { barikoiKey } = getApiKeys(apiKeys);

//   const renderPlots = () => {
//     if (!mapInstance.current || !plotsData) return;
//     const map = mapInstance.current;
//     if (map.getSource("plots")) {
//       map.removeLayer("plots-fill");
//       map.removeLayer("plots-outline");
//       map.removeLayer("plots-labels");
//       map.removeSource("plots");
//     }

//     const features = plotsData.map(plot => {
//       const coords = parseCoordinates(plot);
//       if (coords.length === 0) return null;
//       return {
//         type: "Feature",
//         properties: { name: plot.plot_name || "Plot" },
//         geometry: {
//           type: "Polygon",
//           coordinates: [coords.map(c => [c.lng, c.lat])]
//         }
//       };
//     }).filter(Boolean);

//     map.addSource("plots", {
//       type: "geojson",
//       data: { type: "FeatureCollection", features }
//     });

//     map.addLayer({
//       id: "plots-fill",
//       type: "fill",
//       source: "plots",
//       paint: { "fill-color": "#1F41BB", "fill-opacity": 0.1 }
//     });

//     map.addLayer({
//       id: "plots-outline",
//       type: "line",
//       source: "plots",
//       paint: { "line-color": "#1F41BB", "line-width": 2, "line-opacity": 0.8 }
//     });

//     map.addLayer({
//       id: "plots-labels",
//       type: "symbol",
//       source: "plots",
//       layout: {
//         "text-field": ["get", "name"],
//         "text-size": 12,
//         "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"]
//       },
//       paint: { "text-color": "#1F41BB" }
//     });
//   };

//   useEffect(() => {
//     if (mapReady && plotsData) renderPlots();
//   }, [mapReady, plotsData]);

//   useEffect(() => {
//     let mounted = true;
//     const init = async () => {
//       if (!barikoiKey) return;
//       try { await loadBarikoiMaps(); }
//       catch (err) { console.error("Barikoi load failed:", err); return; }
//       if (!mounted || !mapRef.current || mapInstance.current) return;
//       const center = getCountryCenter();
//       mapRef.current.style.width = "100%";
//       mapRef.current.style.height = "100%";
//       mapRef.current.style.minHeight = "400px";
//       const map = new window.maplibregl.Map({
//         container: mapRef.current,
//         style: `https://map.barikoi.com/styles/osm-liberty/style.json?key=${barikoiKey}`,
//         center: [center.lng, center.lat],
//         zoom: 6,
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
//         if (typeof mapInstance.current.remove === "function") {
//           mapInstance.current.remove();
//         }
//         mapInstance.current = null;
//       }
//     };
//   }, [barikoiKey]);

//   useEffect(() => {
//     const handleResize = () => {
//       if (mapInstance.current && typeof mapInstance.current.resize === "function") {
//         mapInstance.current.resize();
//       }
//     };
//     window.addEventListener("resize", handleResize);
//     const raf = requestAnimationFrame(() => {
//       if (mapInstance.current && typeof mapInstance.current.resize === "function") {
//         mapInstance.current.resize();
//       }
//     });
//     return () => { window.removeEventListener("resize", handleResize); cancelAnimationFrame(raf); };
//   }, [mapReady]);

//   // ─── KEY FIX: same socketRef pattern ──────────────────────────────────────
//   const socketRef = useRef(socket);
//   useEffect(() => { socketRef.current = socket; }, [socket]);

//   useEffect(() => {
//     if (!mapReady) return;

//     const updateOrAddMarker = (data) => {
//       if (!mapInstance.current) return;
//       const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
//       if (!driverId && driverId !== 0) return;
//       const lat = Number(data.latitude !== undefined ? data.latitude : data.lat);
//       const lng = Number(data.longitude !== undefined ? data.longitude : data.lng);
//       if (isNaN(lat) || isNaN(lng)) return;
//       const lngLat = [lng, lat];
//       const status = data.driving_status || "idle";
//       const validStatus = status === "busy" ? "busy" : "idle";
//       const name = data.name || data.driverName || data.driver_name || `Driver ${driverId}`;

//       setDriverData((prev) => ({
//         ...prev,
//         [driverId]: { ...data, position: { lat, lng }, status: validStatus, driving_status: validStatus, name },
//       }));

//       const popupHTML = buildPopupHTML(data);

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
//           if (marker._isOpen) { popup.remove(); marker._isOpen = false; }
//           else {
//             Object.values(markers.current).forEach((m) => { m.getPopup()?.remove(); m._isOpen = false; });
//             popup.setLngLat(lngLat).addTo(mapInstance.current);
//             marker._isOpen = true;
//           }
//         });
//         marker._visible = true;
//         markers.current[driverId] = marker;
//       }
//     };

//     // Initialize from cache/lists - only show drivers who are in the active lists
//     if (mapInstance.current && driverData) {
//       const activeIds = new Set([
//         ...waitingDrivers.map(d => d.id || d.driver_id || d.dispatcher_id),
//         ...onJobDrivers.map(d => d.id || d.driver_id || d.dispatcher_id)
//       ]);

//       // Remove markers for drivers no longer in active lists
//       Object.keys(markers.current).forEach(id => {
//         if (!activeIds.has(id)) {
//           markers.current[id].remove();
//           delete markers.current[id];
//         }
//       });

//       Object.values(driverData).forEach(data => {
//         const id = data.id || data.driver_id || data.dispatcher_id || data.client_id;
//         if (activeIds.has(id)) {
//           const lat = data.latitude !== undefined ? data.latitude : data.lat;
//           const lng = data.longitude !== undefined ? data.longitude : data.lng;
//           if (lat != null && lng != null) updateOrAddMarker(data);
//         }
//       });
//     }

//     const handle = (rawData) => {
//       const data = parseDriverData(rawData);
//       if (data) updateOrAddMarker(data);
//     };

//     if (socketRef.current) socketRef.current.on("driver-location-update", handle);
//     return () => {
//       if (socketRef.current) socketRef.current.off("driver-location-update", handle);
//     };
//   }, [mapReady, waitingDrivers, onJobDrivers]);

//   useEffect(() => {
//     // ONLY fit bounds once on initial load to avoid constant map jumping/lag
//     if (mapReady && mapInstance.current && !mapInstance.current._hasFittedOnce && Object.keys(markers.current).length > 0) {
//       const fitMapToMarkers = () => {
//         if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
//         let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity, hasVisible = false;
//         Object.values(markers.current).forEach((m) => {
//           const { lat, lng } = m.getLngLat();
//           minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
//           minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
//           hasVisible = true;
//         });
//         if (hasVisible) mapInstance.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50, maxZoom: 15 });
//       };
//       setTimeout(fitMapToMarkers, 500);
//       mapInstance.current._hasFittedOnce = true;
//     }
//   }, [mapReady, driverData]);

//   return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />;
// };

// const Overview = () => {
//   const [isBookingModelOpen, setIsBookingModelOpen] = useState({ type: "new", isOpen: false });
//   const [isMessageModelOpen, setIsMessageModelOpen] = useState({ type: "new", isOpen: false });
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [isAddBookingDisabled, setIsAddBookingDisabled] = useState(true);
//   const [isLoadingDispatchSystem, setIsLoadingDispatchSystem] = useState(true);
//   const [activeBookingFilter, setActiveBookingFilter] = useState("todays_booking");
//   const [mapType, setMapType] = useState(() => getMapType());
//   const countryCenter = React.useMemo(() => getCountryCenter(), []);
//   const [plotsData, setPlotsData] = useState([]);

//   const mapRef = useRef(null);
//   const mapInstance = useRef(null);
//   const markers = useRef({});
//   const socket = useSocket();
//   const socketRef = useRef(socket);
//   const plotsDataRef = useRef(plotsData);
//   useEffect(() => { plotsDataRef.current = plotsData; }, [plotsData]);

//   const [apiKeys, setApiKeys] = useState({
//     googleKey: GOOGLE_KEY,
//     barikoiKey: BARIKOI_KEY,
//     searchApi: "google"
//   });

//   const [dashboardCounts, setDashboardCounts] = useState({
//     todaysBooking: 0, preBookings: 0, recentJobs: 0,
//     completed: 0, noShow: 0, cancelled: 0,
//   });

//   const [driverData, setDriverData] = useState(() => {
//     try {
//       const saved = localStorage.getItem("driverDataCache");
//       if (!saved) return {};
//       const parsed = JSON.parse(saved);
//       const normalized = {};
//       Object.entries(parsed).forEach(([id, data]) => {
//         normalized[String(id)] = data;
//       });
//       return normalized;
//     } catch {
//       return {};
//     }
//   });

//   const [waitingDrivers, setWaitingDrivers] = useState(() => {
//     try {
//       const saved = localStorage.getItem("waitingDriversCache");
//       return saved ? JSON.parse(saved) : [];
//     } catch { return []; }
//   });

//   const [onJobDrivers, setOnJobDrivers] = useState(() => {
//     try {
//       const saved = localStorage.getItem("onJobDriversCache");
//       return saved ? JSON.parse(saved) : [];
//     } catch { return []; }
//   });

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       localStorage.setItem("driverDataCache", JSON.stringify(driverData));
//     }, 2000); // Debounce localStorage updates
//     return () => clearTimeout(timer);
//   }, [driverData]);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       localStorage.setItem("waitingDriversCache", JSON.stringify(waitingDrivers));
//     }, 2000);
//     return () => clearTimeout(timer);
//   }, [waitingDrivers]);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       localStorage.setItem("onJobDriversCache", JSON.stringify(onJobDrivers));
//     }, 2000);
//     return () => clearTimeout(timer);
//   }, [onJobDrivers]);

//   useEffect(() => {
//     const fetchApiKeys = async () => {
//       try {
//         const res = await apiGetCompanyApiKeys();
//         if (res.data?.success) {
//           const data = res.data.data;
//           const googleKey = data.google_api_key && data.google_api_key.startsWith("AIza") ? data.google_api_key : GOOGLE_KEY;
//           const barikoiKey = data.barikoi_api_key && data.barikoi_api_key.startsWith("bkoi_") ? data.barikoi_api_key : BARIKOI_KEY;
//           setApiKeys({
//             googleKey,
//             barikoiKey,
//             searchApi: data.search_api || "google"
//           });
//           if (data.maps_api) {
//             setMapType(data.maps_api.toLowerCase());
//           }
//         }
//       } catch (err) {
//         console.error("Fetch API keys error:", err);
//       }
//     };
//     fetchApiKeys();
//   }, []);

//   useEffect(() => {
//     const fetchPlots = async () => {
//       try {
//         const res = await apiGetAllPlot({ page: 1, limit: 100 });
//         if (res.data?.success) {
//           setPlotsData(res.data.data?.data || res.data.data || []);
//         }
//       } catch (err) {
//         console.error("Fetch plots error:", err);
//       }
//     };
//     fetchPlots();
//   }, []);

//   useEffect(() => {
//     socketRef.current = socket;
//   }, [socket]);

//   const driverCounts = React.useMemo(() => {
//     return {
//       busy: onJobDrivers.length,
//       idle: waitingDrivers.length,
//       total: onJobDrivers.length + waitingDrivers.length
//     };
//   }, [onJobDrivers, waitingDrivers]);
  


//   const user = useAppSelector((state) => state.auth.user);
//   const displayName = user?.name
//     ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
//     : "Admin";

//   const fetchDashboardCards = useCallback(async () => {
//     try {
//       const res = await getDashboardCards();
//       if (res.data?.success) setDashboardCounts(res.data.data);
//     } catch (err) {
//       console.error("Dashboard cards error:", err);
//     }
//   }, []);

//   useEffect(() => {
//     fetchDashboardCards();
//   }, [fetchDashboardCards]);

//   useEffect(() => {
//     if (!socket) return;

//     const handleDashboardUpdate = (data) => {
//       console.log("📊 [Socket] dashboard-cards-update:", data);
//       setDashboardCounts(data);
//     };

//     const handleNotificationRide = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("🔔 [Socket] notification-ride:", data);
//       showRideNotification(data);
//     };

//     const handleWaitingDriver = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("🕒 [Socket] waiting-driver-event:", data);

//       if (Array.isArray(data)) {
//         setWaitingDrivers(data);
//         return;
//       }

//       if (data?.driverName || data?.driver_name) {
//         const name = data.driverName || data.driver_name;
//         const driverId = data.id || data.driver_id || data.dispatcher_id;

//         const sId = String(driverId);
//         // Update marker status on map if we have driverId
//         if (sId) {
//           setDriverData(prev => {
//             let lat = data.latitude || data.lat;
//             let lng = data.longitude || data.lng;
//             const status = "idle";
            
//             // Fallback to plot coordinates if GPS is missing
//             if ((lat == null || lng == null) && (data.plot_id || data.plot)) {
//               const plotId = data.plot_id || data.plot;
//               const plot = plotsDataRef.current.find(p => p.id == plotId || p.plot_id == plotId);
//               if (plot) {
//                 const coords = parseCoordinates(plot);
//                 if (coords.length > 0) {
//                   lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
//                   lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
//                 }
//               }
//             }

//             if (prev[sId]) {
//               return { ...prev, [sId]: { ...prev[sId], ...data, position: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : prev[sId].position, status, driving_status: status } };
//             } else if (lat && lng) {
//               // Add new driver to map if coordinates are present (or fallback found)
//               return { ...prev, [sId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } };
//             }
//             return prev;
//           });
//         }

//         // Remove from on-job list if they were there
//         setOnJobDrivers((prev) => prev.filter((d) => d.name !== name));

//         const obj = {
//           id: driverId || Date.now(),
//           name: name,
//           plot: data.plot_name || data.plot || "N/A",
//           rank: data.rank || 1,
//           ...data
//         };

//         setWaitingDrivers((prev) => {
//           const exists = prev.some((d) => d.name === obj.name);
//           return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev];
//         });
//       }
//     };

//     const handleOnJobDriver = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("🚕 [Socket] on-job-driver-event:", data);

//       if (Array.isArray(data)) {
//         setOnJobDrivers(data);
//         return;
//       }

//       if (data?.driverName || data?.driver_name) {
//         const name = data.driverName || data.driver_name;
//         const driverId = data.id || data.driver_id || data.dispatcher_id;

//         const sId = String(driverId);
//         // Update marker status on map if we have driverId
//         if (sId) {
//           setDriverData(prev => {
//             let lat = data.latitude || data.lat;
//             let lng = data.longitude || data.lng;
//             const status = "busy";

//             // Fallback to plot coordinates if GPS is missing
//             if ((lat == null || lng == null) && (data.plot_id || data.plot)) {
//               const plotId = data.plot_id || data.plot;
//               const plot = plotsDataRef.current.find(p => p.id == plotId || p.plot_id == plotId);
//               if (plot) {
//                 const coords = parseCoordinates(plot);
//                 if (coords.length > 0) {
//                   lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
//                   lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
//                 }
//               }
//             }

//             if (prev[sId]) {
//               return { ...prev, [sId]: { ...prev[sId], ...data, position: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : prev[sId].position, status, driving_status: status } };
//             } else if (lat && lng) {
//               // Add new driver to map if coordinates are present (or fallback found)
//               return { ...prev, [sId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } };
//             }
//             return prev;
//           });
//         }

//         // Remove from waiting list if they were there
//         setWaitingDrivers((prev) => prev.filter((d) => d.name !== name));

//         const obj = { id: driverId || Date.now(), name: name, ...data };
//         setOnJobDrivers((prev) => {
//           const exists = prev.some((d) => d.name === obj.name);
//           return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev];
//         });
//       }
//     };

//     const handleJobAccepted = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("✅ [Socket] job-accepted-by-driver:", data);

//       const driverName = data?.driver_name || data?.driverName;
//       if (driverName) {
//         // Remove from waiting list
//         setWaitingDrivers((prev) => prev.filter((d) => d.name !== driverName));
//         // Add to on-job list
//         const obj = { id: Date.now(), name: driverName, ...data };
//         setOnJobDrivers((prev) => {
//           const exists = prev.some((d) => d.name === obj.name);
//           return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev];
//         });
//       }
//     };

//     const handleJobCancelled = (rawData) => {
//       let data;
//       try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
//       catch { data = rawData; }
//       console.log("❌ [Socket] job-cancelled-by-driver:", data);

//       const driverName = data?.driver_name || data?.driverName;
//       if (driverName) {
//         // Remove from on-job list
//         setOnJobDrivers((prev) => prev.filter((d) => d.name !== driverName));
//         // Note: they will be added back to waiting list via the waiting-driver-event
//       }
//       fetchDashboardCards();
//     };

//     const handleBookingCancelled = (event, data) => {
//       console.log(`❌ [Socket] ${event}:`, data);
//       fetchDashboardCards();
//     };

//     // Global listener for all events
//     socket.onAny((event, ...args) => {
//       console.log(`🌐 [Socket Event] ${event}:`, args);
//     });

//     socket.on("dashboard-cards-update", handleDashboardUpdate);
//     socket.on("waiting-driver-event", handleWaitingDriver);
//     socket.on("on-job-driver-event", handleOnJobDriver);
//     socket.on("notification-ride", handleNotificationRide);
//     socket.on("job-accepted-by-driver", handleJobAccepted);
//     socket.on("job-cancelled-by-driver", handleJobCancelled);
//     socket.on("booking-cancelled-event", (data) => handleBookingCancelled("booking-cancelled-event", data));
//     socket.on("booking-cancelled", (data) => handleBookingCancelled("booking-cancelled", data));
//     socket.on("cancel-booking-event", (data) => handleBookingCancelled("cancel-booking-event", data));

//     return () => {
//       socket.offAny();
//       socket.off("dashboard-cards-update", handleDashboardUpdate);
//       socket.off("waiting-driver-event", handleWaitingDriver);
//       socket.off("on-job-driver-event", handleOnJobDriver);
//       socket.off("notification-ride", handleNotificationRide);
//       socket.off("job-accepted-by-driver", handleJobAccepted);
//       socket.off("job-cancelled-by-driver", handleJobCancelled);
//       socket.off("booking-cancelled-event");
//       socket.off("booking-cancelled");
//       socket.off("cancel-booking-event");
//     };
//   }, [socket, fetchDashboardCards]);

//   useEffect(() => {
//     const handleOpenModal = () => {
//       lockBodyScroll();
//       setIsBookingModelOpen({ isOpen: true, type: "new" });
//     };
//     window.addEventListener("openAddBookingModal", handleOpenModal);
//     return () => window.removeEventListener("openAddBookingModal", handleOpenModal);
//   }, []);

//   // const checkDispatchSystem = async () => {
//   //   try {
//   //     setIsLoadingDispatchSystem(true);
//   //     const response = await apiGetDispatchSystem();
//   //     let data = response?.data?.data || response?.data || response;

//   //     if (!Array.isArray(data)) {
//   //       if (data && typeof data === "object") {
//   //         const possibleArrayKeys = ["items", "results", "dispatches", "systems", "list"];
//   //         for (const key of possibleArrayKeys) {
//   //           if (Array.isArray(data[key])) { data = data[key]; break; }
//   //         }
//   //       }
//   //       if (!Array.isArray(data)) {
//   //         data = (data && typeof data === "object" && Object.keys(data).length > 0) ? [data] : [];
//   //       }
//   //     }

//   //     const manualDispatchItem = data.find(
//   //       (item) => item.dispatch_system === "manual_dispatch_only"
//   //     );

//   //     const isManualEnabled =
//   //       manualDispatchItem?.status === "enable" ||
//   //       manualDispatchItem?.status === "enabled" ||
//   //       manualDispatchItem?.status === 1 ||
//   //       manualDispatchItem?.status === true;

//   //     setIsAddBookingDisabled(!isManualEnabled);
//   //   } catch (error) {
//   //     console.error("Dispatch system error:", error);
//   //     setIsAddBookingDisabled(true);
//   //   } finally {
//   //     setIsLoadingDispatchSystem(false);
//   //   }
//   // };

//   // useEffect(() => { checkDispatchSystem(); }, []);

//   const mapProps = { mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers };

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

//           {/* <Button
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
//               ? "!bg-gray-400 !cursor-not-allowed opacity-60 hover:!bg-gray-400"
//               : ""
//               }`}
//             style={isAddBookingDisabled || isLoadingDispatchSystem ? { pointerEvents: "none" } : {}}
//           >
//             <div className="flex gap-2 sm:gap-[15px] items-center justify-center whitespace-nowrap">
//               <span className="hidden sm:inline-block"><PlusIcon /></span>
//               <span className="sm:hidden"><PlusIcon height={16} width={16} /></span>
//               <span>{isLoadingDispatchSystem ? "Loading..." : "Create Booking"}</span>
//             </div>
//           </Button> */}
//           <Button
//             type="filled"
//             btnSize="md"
//             onClick={() => {
//               lockBodyScroll();
//               setIsBookingModelOpen({ isOpen: true, type: "new" });
//             }}
//             className={`w-full sm:w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3`}
//           >
//             <div className="flex gap-2 sm:gap-[15px] items-center justify-center whitespace-nowrap">
//               <span className="hidden sm:inline-block"><PlusIcon /></span>
//               <span className="sm:hidden"><PlusIcon height={16} width={16} /></span>
//               <span>Create Booking</span>
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

//           <div className="w-full lg:w-[20.5%] bg-orange-50 rounded-2xl shadow p-3  max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-200">
//             <div className="flex items-center justify-between mb-2">
//               <h3 className="font-semibold">Drivers Waiting</h3>
//               <span className="font-semibold">{waitingDrivers.length}</span>
//             </div>
//             <table className="w-full text-xs rounded-xl">
//               <thead className="text-gray-500">
//                 <tr>
//                   <th className="text-left py-1 text-[11px]">Sr No</th>
//                   <th className="text-left text-[11px]">Driver</th>
//                   <th className="text-left text-[11px]">Plot</th>
//                   {/* <th className="text-center text-[11px]">Drivers</th> */}
//                   <th className="text-right text-[11px]">Rank</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {waitingDrivers.length > 0 ? (
//                   waitingDrivers.map((driver, i) => (
//                     <tr key={driver.id || driver.driver_id || i} className="border-t">
//                       <td className="py-1">{i + 1}</td>
//                       <td>
//                         {driver.name || driver.driver_name || "Unknown"}
//                       </td>
//                       <td>
//                         {driver.plot_name && driver.plot && driver.plot_name !== driver.plot.toString()
//                           ? `${driver.plot_name} (${driver.plot})`
//                           : (driver.plot_name || driver.plot || "N/A")}
//                       </td>
//                       {/* <td className="text-center">
//                         {driver.total_drivers || driver.drivers_count || "0"}
//                       </td> */}
//                       <td className="text-right">
//                         {driver.rank || driver.ranking || i + 1}
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan="5" className="text-center py-4 text-gray-500">
//                       No waiting drivers
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           <div className="w-full lg:w-[20.5%] bg-green-50 rounded-2xl shadow p-3 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-200">
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