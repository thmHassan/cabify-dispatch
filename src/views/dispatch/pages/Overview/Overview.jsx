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
import {
  apiGetCompanyApiKeys,
  apiGetDispatchSystem,
} from "../../../../services/SettingsConfigurationServices";
import { fetchMapConfiguration, MAP_PROVIDER_DEFAULT, MAP_PROVIDER_GOOGLE } from "../../../../services/mapConfigurationService";
import { getDashboardCards, apiGetAllPlot, apiUpdateDriverRank } from "../../../../services/AddBookingServices";
import { apiLogoutDriver, apiGetDriverManagement } from "../../../../services/DriverManagementService";
import toast from "react-hot-toast";
import { apiGetPlot } from "../../../../services/PlotService";
import CallQueueModel from "./components/CallQueueModel/CallQueueModel";
import SendDriverMessageModal from "./components/SendDriverMessageModal";
import RedCarIcon from "../../../../components/svg/RedCarIcon";
import GreenCarIcon from "../../../../components/svg/GreenCarIcon";
import AppLogoIcon from "../../../../components/svg/AppLogoIcon";
import { renderToString } from "react-dom/server";
import { formatCurrency } from "../../../../utils/functions/formatters";

const GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";

const ON_JOB_STORAGE_KEY = "onJobDrivers_persistent";
const DRIVER_DATA_STORAGE_KEY = "driverData_persistent";
const WAITING_DRIVERS_STORAGE_KEY = "waitingDrivers_persistent";

const loadFromStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
};

const saveToStorage = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
};

const getDriverKey = (driver) => String(driver?.id || driver?.driver_id || "");

const getDriverPlotId = (driver) => {
  const plotId = driver?.plot_id ?? driver?.assigned_plot_id ?? driver?.default_plot_id;
  if (plotId == null || plotId === "" || plotId === "Unassigned" || plotId === "N/A") return null;
  if (Number.isNaN(Number(plotId))) return null;
  return plotId;
};

const normalizeDispatchSystemList = (response) => {
  let data = response?.data?.data || response?.data || response;
  if (!Array.isArray(data)) {
    if (data && typeof data === "object") {
      const keys = ["items", "results", "dispatches", "systems", "list"];
      for (const key of keys) {
        if (Array.isArray(data[key])) {
          data = data[key];
          break;
        }
      }
    }
    if (!Array.isArray(data)) {
      data = data && typeof data === "object" && Object.keys(data).length > 0 ? [data] : [];
    }
  }
  return data;
};

const isDispatchSystemEnabled = (item) =>
  item?.status === "enable" || item?.status === "enabled" || item?.status === 1 || item?.status === true;

const isNearestDriverDispatchEnabled = (items) =>
  items.some(
    (item) => item.dispatch_system === "auto_dispatch_nearest-driver" && isDispatchSystemEnabled(item)
  );

const assignDefaultRanks = (drivers) => {
  const byPlot = new Map();
  drivers.forEach((driver) => {
    const plotKey = String(getDriverPlotId(driver) ?? "__all__");
    if (!byPlot.has(plotKey)) byPlot.set(plotKey, []);
    byPlot.get(plotKey).push(driver);
  });

  const ranked = [];
  byPlot.forEach((plotDrivers) => {
    plotDrivers.forEach((driver, index) => {
      ranked.push({
        ...driver,
        rank: driver.rank || driver.ranking || index + 1,
        ranking: driver.rank || driver.ranking || index + 1,
      });
    });
  });
  return sortWaitingDrivers(ranked);
};

const sortWaitingDrivers = (drivers) =>
  [...drivers].sort((a, b) => {
    const plotA = String(getDriverPlotId(a) ?? "");
    const plotB = String(getDriverPlotId(b) ?? "");
    if (plotA !== plotB) return plotA.localeCompare(plotB, undefined, { numeric: true });
    return (a.rank || a.ranking || 0) - (b.rank || b.ranking || 0);
  });

const reorderDriversByRank = (drivers, driverKey, newRank) => {
  const target = drivers.find((d) => getDriverKey(d) === driverKey);
  if (!target) return drivers;

  const plotId = String(getDriverPlotId(target));
  const samePlot = drivers.filter((d) => String(getDriverPlotId(d)) === plotId);
  const others = drivers.filter((d) => String(getDriverPlotId(d)) !== plotId);

  const moving = samePlot.find((d) => getDriverKey(d) === driverKey);
  const rest = samePlot.filter((d) => getDriverKey(d) !== driverKey);
  const clampedRank = Math.max(1, Math.min(newRank, samePlot.length));

  const reordered = [...rest];
  reordered.splice(clampedRank - 1, 0, moving);

  const updatedPlotDrivers = reordered.map((d, i) => ({
    ...d,
    rank: i + 1,
    ranking: i + 1,
    updatedAt: Date.now(),
  }));

  return sortWaitingDrivers([...others, ...updatedPlotDrivers]);
};

// API only — socket waiting-queue payloads do not include online_status
const isDriverOnlineFromApi = (driver) =>
  (driver?.online_status || "").toLowerCase() === "online";

// Waiting list = online + idle only (not busy/active on-job)
const isWaitingListDriver = (driver) => {
  const drivingStatus = (driver?.driving_status || "idle").toLowerCase();
  const status = (driver?.status || "").toLowerCase();
  return drivingStatus !== "busy" && status !== "busy" && status !== "active";
};

const formatWaitingDriverFromSocket = (d) => {
  const formatted = {
    ...d,
    id: d.driver_id || d.id,
    name: d.driver_name || d.name || d.driverName,
    plot_id: d.plot_id ?? d.plot,
    plot: d.plot_name || d.plot || "N/A",
    rank: d.rank || d.ranking || 1,
    online_status: "online",
    updatedAt: Date.now(),
    is_reconnecting: d.is_reconnecting === true,
    display_name: d.is_reconnecting === true
      ? `Reconnecting... ${d.driver_name || d.name || d.driverName || "Driver"} - Rank ${d.rank || 1}`
      : (d.display_name || d.driver_name || d.name || d.driverName || "Driver"),
  };
  formatted.plot_id = getDriverPlotId(formatted) ?? formatted.plot_id;
  return formatted;
};

const mergeWaitingDriversByPlot = (prev, plotId, incomingDrivers) => {
  if (plotId == null || plotId === "") {
    return sortWaitingDrivers(incomingDrivers);
  }
  const plotKey = String(plotId);
  const others = prev.filter((d) => String(getDriverPlotId(d) ?? "") !== plotKey);
  return sortWaitingDrivers([...others, ...incomingDrivers]);
};

const upsertWaitingDriver = (prev, driver) => {
  const key = getDriverKey(driver);
  if (!key) return prev;
  const exists = prev.some((d) => getDriverKey(d) === key);
  const next = exists
    ? prev.map((d) => (getDriverKey(d) === key ? { ...d, ...driver, updatedAt: Date.now() } : d))
    : [...prev, driver];
  return sortWaitingDrivers(next);
};

const removeDriverFromDriverData = (prev, driverKey) => {
  if (!prev[driverKey]) return prev;
  const updated = { ...prev };
  delete updated[driverKey];
  saveToStorage(DRIVER_DATA_STORAGE_KEY, updated);
  return updated;
};

const getOfflineDriverIdFromPayload = (data) =>
  data?.driver_id
  ?? data?.driverId
  ?? data?.id
  ?? data?.client_id
  ?? data?.dispatcher_id
  ?? data?.driver?.driver_id
  ?? data?.driver?.id
  ?? null;

const applyWaitingDriversToDriverData = (prev, formattedDrivers, plots) => {
  const updated = { ...prev };
  formattedDrivers.forEach((d) => {
    const sId = String(d.id);
    if (!sId) return;

    let lat = d.latitude || d.lat;
    let lng = d.longitude || d.lng;

    if ((lat == null || lng == null) && (d.plot_id || d.plot)) {
      const plot = plots.find(
        (p) => p.id == (d.plot_id || d.plot) || p.plot_id == (d.plot_id || d.plot)
      );
      if (plot) {
        const coords = parseCoordinates(plot);
        if (coords.length > 0) {
          lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
          lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
        }
      }
    }

    updated[sId] = {
      ...updated[sId],
      ...d,
      position: lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : updated[sId]?.position,
      status: "idle",
      driving_status: "idle",
      online_status: "online",
    };
  });
  saveToStorage(DRIVER_DATA_STORAGE_KEY, updated);
  return updated;
};

const notifListeners = new Set();
const showRideNotification = (data) => notifListeners.forEach((fn) => fn(data));

const formatCoord = (str) => {
  if (!str) return "—";
  const [lat, lng] = str.split(",").map((s) => parseFloat(s.trim()));
  if (isNaN(lat) || isNaN(lng)) return str;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

const formatAmount = (val) => formatCurrency(val, { fallback: "—" });

const NotifRow = ({ icon, label, value, color, bold }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
    <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
    <div style={{ minWidth: 0 }}>
      <span style={{ fontSize: "10px", color: "#6b7280", display: "block", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1, marginBottom: "2px" }}>{label}</span>
      <span style={{ fontSize: "12px", color: color || "#111827", fontWeight: bold ? 700 : 500, wordBreak: "break-word", lineHeight: 1.4 }}>{value || "—"}</span>
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
  const handleClose = () => { setLeaving(true); setTimeout(onClose, 350); };
  return (
    <>
      <style>{`
        @keyframes rideNotifShrink { from { width: 100%; } to { width: 0%; } }
        @keyframes rideNotifPulse { 0%,100%{box-shadow:0 0 0 0 rgba(31,65,187,0.25);} 50%{box-shadow:0 0 0 6px rgba(31,65,187,0);} }
      `}</style>
      <div style={{ transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(110%) scale(0.95)", opacity: visible && !leaving ? 1 : 0, transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.35s ease", background: "#ffffff", borderRadius: "16px", boxShadow: "0 12px 40px rgba(31,65,187,0.18), 0 2px 12px rgba(0,0,0,0.08)", border: "1.5px solid #e0e7ff", width: "320px", overflow: "hidden", marginBottom: "12px", fontFamily: "'Segoe UI', system-ui, sans-serif", animation: "rideNotifPulse 2s ease-in-out 3" }}>
        <div style={{ background: "linear-gradient(135deg, #1F41BB 0%, #3a5fd9 100%)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>New Ride Request</div>
              {data.booking_id && <div style={{ color: "#c7d4ff", fontSize: "11px", marginTop: "2px", fontWeight: 500 }}>#{data.booking_id}</div>}
            </div>
          </div>
          <button onClick={handleClose} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", transition: "background 0.2s", flexShrink: 0 }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.32)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"} aria-label="Close">✕</button>
        </div>
        <div style={{ padding: "14px 16px 10px" }}>
          <NotifRow label="Pickup" value={data.pickup_location || formatCoord(data.pickup_point)} color="#16a34a" />
          <NotifRow label="Destination" value={data.destination_location || formatCoord(data.destination_point)} color="#dc2626" />
          {data.offered_amount && <NotifRow label="Offered Amount" value={formatAmount(data.offered_amount)} color="#1F41BB" bold />}
        </div>
        <div style={{ padding: "0 16px 12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {data.payment_method && <span style={{ background: "#eff6ff", color: "#1F41BB", fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", border: "1px solid #bfdbfe" }}>{data.payment_method}</span>}
          {data.ride_type && <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", border: "1px solid #bbf7d0" }}>{data.ride_type}</span>}
        </div>
        <div style={{ height: "3px", background: "#e0e7ff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "linear-gradient(90deg, #1F41BB, #60a5fa)", animation: "rideNotifShrink 8s linear forwards" }} />
        </div>
      </div>
    </>
  );
};

const DispatchFailedCard = ({ data, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => handleClose(), 8000);
    return () => clearTimeout(timer);
  }, []);
  const handleClose = () => { setLeaving(true); setTimeout(onClose, 350); };
  
  const pickup = data.pickup_location || (data.pickup_point ? formatCoord(data.pickup_point) : "");
  const destination = data.destination_location || (data.destination_point ? formatCoord(data.destination_point) : "");
  const reason = data.message || data.reason || data.cancel_reason || "No driver accepted the request or no active drivers found.";

  return (
    <>
      <style>{`
        @keyframes dispatchNotifShrink { from { width: 100%; } to { width: 0%; } }
        @keyframes dispatchNotifPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.25);} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0);} }
      `}</style>
      <div style={{ transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(110%) scale(0.95)", opacity: visible && !leaving ? 1 : 0, transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.35s ease", background: "#ffffff", borderRadius: "16px", boxShadow: "0 12px 40px rgba(239,68,68,0.18), 0 2px 12px rgba(0,0,0,0.08)", border: "1.5px solid #fee2e2", width: "320px", overflow: "hidden", marginBottom: "12px", fontFamily: "'Segoe UI', system-ui, sans-serif", animation: "dispatchNotifPulse 2s ease-in-out 3" }}>
        <div style={{ background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>Nearest Dispatch Failed</div>
              {(data.booking_id || data.bookingId) && <div style={{ color: "#fee2e2", fontSize: "11px", marginTop: "2px", fontWeight: 500 }}>#{data.booking_id || data.bookingId}</div>}
            </div>
          </div>
          <button onClick={handleClose} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", transition: "background 0.2s", flexShrink: 0 }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.32)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"} aria-label="Close">✕</button>
        </div>
        <div style={{ padding: "14px 16px 10px" }}>
          {pickup && <NotifRow label="Pickup" value={pickup} color="#16a34a" />}
          {destination && <NotifRow label="Destination" value={destination} color="#dc2626" />}
          <NotifRow label="Failure Reason" value={reason} color="#b91c1c" bold />
        </div>
        <div style={{ height: "3px", background: "#fee2e2", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "linear-gradient(90deg, #dc2626, #f87171)", animation: "dispatchNotifShrink 8s linear forwards" }} />
        </div>
      </div>
    </>
  );
};

const RideNotificationContainer = () => {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    const handler = (data) => { const id = Date.now() + Math.random(); setNotifications((prev) => [...prev, { id, data }]); };
    notifListeners.add(handler);
    return () => notifListeners.delete(handler);
  }, []);
  const remove = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));
  return (
    <div style={{ position: "fixed", bottom: "80px", right: "20px", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px", pointerEvents: "none", maxHeight: "calc(100vh - 160px)", overflowY: "auto" }}>
      {notifications.map(({ id, data }) => (
        <div key={id} style={{ pointerEvents: "auto", flexShrink: 0 }}>
          {data.isFailedDispatch ? (
            <DispatchFailedCard data={data} onClose={() => remove(id)} />
          ) : (
            <RideCard data={data} onClose={() => remove(id)} />
          )}
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
  if (mapsApi === "default") return "default";
  if (mapsApi === "barikoi") return "default";
  if (mapsApi === "google") return "google";
  if (countryOfUse === "BD") return "default";
  return "google";
};

const getApiKeys = (stateApiKeys) => ({
  googleKey: stateApiKeys?.googleKey || null,
  mapifyStyle: stateApiKeys?.mapifyStyle || null,
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
      const check = setInterval(() => { if (window.google?.maps?.Map) { clearInterval(check); resolve(); } }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true; script.defer = true;
    script.onload = () => { const check = setInterval(() => { if (window.google?.maps?.Map) { clearInterval(check); resolve(); } }, 50); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const loadDefaultMapLibre = () => {
  return new Promise((resolve, reject) => {
    if (window.maplibregl) return resolve();
    if (!document.getElementById("maplibre-css")) {
      const link = document.createElement("link");
      link.id = "maplibre-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }
    const existing = document.getElementById("maplibre-script");
    if (existing) {
      const check = setInterval(() => { if (window.maplibregl) { clearInterval(check); resolve(); } }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = "maplibre-script";
    script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
    script.async = true;
    script.onload = () => { setTimeout(() => { if (window.maplibregl) resolve(); else reject(new Error("MapLibre GL not available after load")); }, 100); };
    script.onerror = () => reject(new Error("MapLibre GL script failed to load"));
    document.head.appendChild(script);
  });
};

const buildOsmFallbackStyle = () => ({
  version: 8, name: "OSM",
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: { "osm-tiles": { type: "raster", tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors", maxzoom: 19 } },
  layers: [{ id: "osm-tiles", type: "raster", source: "osm-tiles", minzoom: 0, maxzoom: 22 }],
});

const makeGoogleIcon = (status) => {
  const icon = MARKER_ICONS[status] || MARKER_ICONS.idle;
  return { url: icon.url, scaledSize: new window.google.maps.Size(icon.scaledSize.width, icon.scaledSize.height), anchor: new window.google.maps.Point(icon.anchor.x, icon.anchor.y) };
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
        return { latitude: parseFloat(latM[1]), longitude: parseFloat(lngM[1]), client_id: cidM?.[1] ?? null, dispatcher_id: didM ? parseInt(didM[1]) : null, id: idM ? parseInt(idM[1]) : null, driving_status: stM?.[1] ?? "idle", name: nameM?.[1] ?? null, phone_no: phoneM?.[1] ?? null, plate_no: plateM?.[1] ?? null };
      }
    }
    return null;
  }
};

const parseCoordinates = (plot) => {
  if (!plot) return [];
  try {
    if (plot.features) {
      const feature = typeof plot.features === "string" ? JSON.parse(plot.features) : plot.features;
      let geometry = feature.geometry;
      if (typeof geometry === "string") geometry = JSON.parse(geometry);
      let coords = geometry?.coordinates;
      if (typeof coords === "string") coords = JSON.parse(coords);
      if (Array.isArray(coords) && Array.isArray(coords[0])) return coords[0].map((p) => ({ lat: Number(p[1]), lng: Number(p[0]) }));
    }
    let coords = plot.coordinates;
    if (typeof coords === "string") coords = JSON.parse(coords);
    if (Array.isArray(coords)) return coords.map((c) => ({ lat: Number(c.lat), lng: Number(c.lng) }));
  } catch (error) { console.error("Parse coordinates error:", error); }
  return [];
};

const getDriverCoordinates = (driver, driverData = {}) => {
  const merged = { ...driverData[getDriverKey(driver)], ...driver };
  const lat = merged.position?.lat ?? merged.latitude ?? merged.lat;
  const lng = merged.position?.lng ?? merged.longitude ?? merged.lng;
  if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return null;
  return { lat: Number(lat), lng: Number(lng) };
};

const isPointInPolygon = (point, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i].lat;
    const xi = polygon[i].lng;
    const yj = polygon[j].lat;
    const xj = polygon[j].lng;
    const intersects = ((yi > point.lat) !== (yj > point.lat))
      && (point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};

const isDriverOutsideAssignedPlot = (driver, plots, driverData = {}) => {
  if (driver?.is_outside_plot === true || driver?.outside_plot === true || driver?.outside_the_plot === true) {
    return true;
  }
  if (driver?.is_outside_plot === false || driver?.outside_plot === false || driver?.is_inside_plot === true) {
    return false;
  }

  const plotId = getDriverPlotId(driver);
  if (plotId == null) return false;

  const position = getDriverCoordinates(driver, driverData);
  if (!position) return false;

  const plot = plots.find((p) => p.id == plotId || p.plot_id == plotId);
  if (!plot) return false;

  const coords = parseCoordinates(plot);
  if (coords.length < 3) return false;

  return !isPointInPolygon(position, coords);
};

const getDriverPlotLabel = (driver) =>
  driver.plot_name && driver.plot_id && driver.plot_name !== driver.plot_id.toString()
    ? `${driver.plot_name} (${driver.plot_id})`
    : (driver.plot_name || driver.plot || "N/A");

const buildPopupHTML = (data) => {
  const name = data.name || data.driver_name || data.driverName || "Unknown Driver";
  const phone = data.phone_no || data.phone || "N/A";
  const plate = data.plate_no || data.plate || "N/A";
  const status = (data.driving_status || data.status || "idle").toLowerCase();
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const statusColor = status === "busy" ? "#10b981" : "#ef4444";
  return `<div style="font-family:'Inter',sans-serif;min-width:150px;padding:4px 6px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#4b5563;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span style="font-weight:700;color:#111827;font-size:15px;">${name}</span></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#6b7280;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span style="color:#4b5563;font-size:13px;">${phone}</span></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#6b7280;"><rect x="1" y="3" width="22" height="18" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg><span style="background:#f9fafb;color:#374151;font-weight:600;font-size:12px;padding:1px 6px;border-radius:4px;border:1px solid #e5e7eb;">${plate}</span></div><div style="display:flex;align-items:center;gap:6px;border-top:1px solid #f3f4f6;padding-top:8px;"><span style="height:7px;width:7px;background-color:${statusColor};border-radius:50%;display:inline-block;"></span><span style="color:${statusColor};font-weight:700;font-size:12px;text-transform:capitalize;border:1px solid ${statusColor}40;padding:1px 8px;border-radius:20px;background:${statusColor}10;">${statusLabel}</span></div></div>`;
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
      const polygon = new window.google.maps.Polygon({ paths: coords, strokeColor: "#1F41BB", strokeOpacity: 0.8, strokeWeight: 2, fillColor: "#1F41BB", fillOpacity: 0.1, map: mapInstance.current });
      plotPolygons.current.push(polygon);
    });
  };

  useEffect(() => { if (mapInstance.current && plotsData) renderPlots(); }, [plotsData]);

  const fitMapToMarkers = () => {
    if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasVisible = false;
    Object.values(markers.current).forEach((m) => { if (m.getVisible()) { bounds.extend(m.getPosition()); hasVisible = true; } });
    if (hasVisible) { mapInstance.current.fitBounds(bounds); if (mapInstance.current.getZoom() > 15) mapInstance.current.setZoom(15); }
  };

  useEffect(() => {
    let mounted = true;
    if (!googleKey) return;
    loadGoogleMaps(googleKey).then(() => {
      if (!mounted || !mapRef.current || mapInstance.current) return;
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: countryCenter.lat, lng: countryCenter.lng }, zoom: 5,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      });
      setIsMapReady(true);
    }).catch((err) => console.error("Google Map load failed:", err));
    return () => { mounted = false; if (mapInstance.current) mapInstance.current = null; };
  }, [googleKey]);

  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  const driverDataRef = useRef(driverData);
  useEffect(() => { driverDataRef.current = driverData; }, [driverData]);

  useEffect(() => {
    if (!isMapReady) return;
    const getDriverId = (d) => String(d.id || d.driver_id || d.dispatcher_id || d.client_id || "");
    const onJobIds = new Set(onJobDrivers.map(getDriverId).filter(Boolean));
    const waitingIds = new Set(waitingDrivers.map(getDriverId).filter(Boolean));
    const activeIds = new Set([...onJobIds, ...waitingIds]);

    const renderMarker = (id, data) => {
      if (!mapInstance.current || !id) return;
      const latitude = data?.latitude !== undefined ? data?.latitude : data?.lat;
      const longitude = data?.longitude !== undefined ? data?.longitude : data?.lng;
      if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;
      const position = { lat: Number(latitude), lng: Number(longitude) };
      // ── on-job drivers always show as green (busy) ──
      const isOnJob = onJobIds.has(id);
      const validStatus = isOnJob ? "busy" : ((data?.driving_status || data?.status || "idle") === "busy" ? "busy" : "idle");
      const name = data?.name || data?.driverName || data?.driver_name || `Driver ${id}`;
      const infoContent = buildPopupHTML({ ...data, driving_status: validStatus });

      if (markers.current[id]) {
        const marker = markers.current[id];
        const oldPos = marker.getPosition();
        const dist = Math.sqrt((oldPos.lat() - position.lat) ** 2 + (oldPos.lng() - position.lng) ** 2);
        dist < 0.01 ? animateMarker(marker, position, 1000) : marker.setPosition(position);
        marker.setIcon(makeGoogleIcon(validStatus));
        marker.infoWindow?.setContent(infoContent);
      } else {
        const marker = new window.google.maps.Marker({ position, map: mapInstance.current, title: name, icon: makeGoogleIcon(validStatus), animation: window.google.maps.Animation.DROP });
        const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });
        marker.addListener("click", () => { Object.values(markers.current).forEach((m) => m.infoWindow?.close()); infoWindow.open(mapInstance.current, marker); });
        marker.infoWindow = infoWindow;
        markers.current[id] = marker;
      }
    };

    // Remove markers for drivers no longer active
    Object.keys(markers.current).forEach(id => {
      if (!activeIds.has(id)) { markers.current[id].setMap(null); delete markers.current[id]; }
    });

    // Render all active drivers from driverData (includes persisted data after refresh)
    Object.entries(driverDataRef.current).forEach(([id, data]) => {
      if (activeIds.has(id)) renderMarker(id, data);
    });

    // Also directly render on-job drivers (even if driverData entry has no coords yet,
    // skip — but ensure every on-job driver with coords gets a marker)
    onJobDrivers.forEach((driver) => {
      const id = getDriverId(driver);
      if (!id) return;
      const data = driverDataRef.current[id] || driver;
      const lat = data?.latitude ?? data?.lat ?? driver?.latitude ?? driver?.lat;
      const lng = data?.longitude ?? data?.lng ?? driver?.longitude ?? driver?.lng;
      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        renderMarker(id, { ...data, latitude: lat, longitude: lng, driving_status: "busy" });
      }
    });

    const handle = (rawData) => {
      const data = parseDriverData(rawData);
      if (!data) return;
      const id = getDriverId(data);
      if (!id) return;
      setDriverData(prev => {
        const updated = { ...prev, [id]: { ...prev[id], ...data } };
        saveToStorage(DRIVER_DATA_STORAGE_KEY, updated); // persist location update
        return updated;
      });
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

  return (
    <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px", position: "relative" }}>
      {isMapReady && (
        <div style={{
          position: "absolute",
          left: "8px",
          top: "8px",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "#fff",
          padding: "4px 8px",
          borderRadius: "4px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          color: "#1a73e8",
          fontSize: "11px",
          fontWeight: 600,
        }}>
          <AppLogoIcon width={12} height={12} />
      
        </div>
      )}
    </div>
  );
};

const DefaultMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers }) => {
  const [mapReady, setMapReady] = useState(false);
  const { mapifyStyle } = getApiKeys(apiKeys);
  const plotsRendered = useRef(false);

  const renderPlots = (map) => {
    if (!map || !plotsData || plotsData.length === 0) return;
    const doRender = () => {
      try {
        ["plots-labels", "plots-outline", "plots-fill"].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
        if (map.getSource("plots")) map.removeSource("plots");
        const features = plotsData.map(plot => {
          const coords = parseCoordinates(plot);
          if (coords.length === 0) return null;
          return { type: "Feature", properties: { name: plot.plot_name || "Plot" }, geometry: { type: "Polygon", coordinates: [coords.map(c => [c.lng, c.lat])] } };
        }).filter(Boolean);
        if (features.length === 0) return;
        map.addSource("plots", { type: "geojson", data: { type: "FeatureCollection", features } });
        map.addLayer({ id: "plots-fill", type: "fill", source: "plots", paint: { "fill-color": "#1F41BB", "fill-opacity": 0.15 } });
        map.addLayer({ id: "plots-outline", type: "line", source: "plots", paint: { "line-color": "#1F41BB", "line-width": 2.5, "line-opacity": 0.9 } });
        plotsRendered.current = true;
      } catch (err) { console.warn("Plot render error:", err); }
    };
    if (map.isStyleLoaded()) doRender(); else map.once("idle", doRender);
  };

  useEffect(() => { if (mapReady && mapInstance.current && plotsData?.length > 0) renderPlots(mapInstance.current); }, [mapReady, plotsData]);

  useEffect(() => {
    if (!mapifyStyle) return;
    let mounted = true;
    const init = async () => {
      try { await loadDefaultMapLibre(); } catch (err) { console.error("MapLibre load failed:", err); return; }
      if (!mounted || !mapRef.current || mapInstance.current) return;
      const container = mapRef.current;
      container.style.width = "100%"; container.style.height = "100%"; container.style.minHeight = "400px"; container.style.position = "relative";
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 50));
      if (!mounted || !mapRef.current) return;
      const initMap = (style) => {
        try {
          const map = new window.maplibregl.Map({ container, style, center: [countryCenter.lng, countryCenter.lat], zoom: 8, attributionControl: true, fadeDuration: 0 });
          map.addControl(new window.maplibregl.NavigationControl(), "top-right");
          map.on("load", () => { if (!mounted) return; map.resize(); setTimeout(() => { if (mounted && map) { map.resize(); setMapReady(true); } }, 150); });
          map.on("error", (e) => {
            const msg = e?.error?.message || String(e);
            const isAuthError = msg.includes("403") || msg.includes("401");
            const isNetworkError = msg.includes("Failed to fetch");
            const isTimeoutError = /timeout|timed out|cURL error 28|SSL connection timeout/i.test(msg);
            if ((isAuthError || isNetworkError || isTimeoutError) && !map._usedFallback) {
              map._usedFallback = true;
              try { map.setStyle(buildOsmFallbackStyle()); } catch { }
            }
          });
          mapInstance.current = map;
        } catch (err) {
          console.error("MapLibre Map instantiation failed:", err);
          try {
            const map = new window.maplibregl.Map({ container, style: buildOsmFallbackStyle(), center: [countryCenter.lng, countryCenter.lat], zoom: 8 });
            map.on("load", () => { map.resize(); setMapReady(true); });
            mapInstance.current = map;
          } catch { }
        }
      };
      initMap(mapifyStyle);
    };
    init();
    return () => {
      mounted = false;
      if (mapInstance.current) {
        try { Object.values(markers.current).forEach((m) => { try { m.remove(); } catch { } }); markers.current = {}; mapInstance.current.remove(); } catch { }
        mapInstance.current = null;
      }
    };
  }, [mapifyStyle]);

  useEffect(() => {
    if (!mapRef.current) return;
    const ro = new ResizeObserver(() => { if (mapInstance.current && typeof mapInstance.current.resize === "function") mapInstance.current.resize(); });
    ro.observe(mapRef.current);
    return () => ro.disconnect();
  }, []);

  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  useEffect(() => {
    if (!mapReady) return;
    const getDriverId = (d) => String(d.id || d.driver_id || d.dispatcher_id || d.client_id || "");
    const onJobIds = new Set(onJobDrivers.map(getDriverId).filter(Boolean));
    const waitingIds = new Set(waitingDrivers.map(getDriverId).filter(Boolean));
    const activeIds = new Set([...onJobIds, ...waitingIds]);

    const updateOrAddMarker = (data) => {
      if (!mapInstance.current) return;
      const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
      if (driverId == null) return;
      const lat = Number(data.latitude !== undefined ? data.latitude : data.lat);
      const lng = Number(data.longitude !== undefined ? data.longitude : data.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const lngLat = [lng, lat];
      const isOnJob = onJobIds.has(String(driverId));
      const validStatus = isOnJob ? "busy" : ((data.driving_status || "idle") === "busy" ? "busy" : "idle");
      const name = data.name || data.driverName || data.driver_name || `Driver ${driverId}`;
      const popupHTML = buildPopupHTML({ ...data, driving_status: validStatus });

      setDriverData((prev) => {
        const updated = { ...prev, [driverId]: { ...data, position: { lat, lng }, status: validStatus, driving_status: validStatus, name } };
        saveToStorage(DRIVER_DATA_STORAGE_KEY, updated); // persist
        return updated;
      });

      if (markers.current[driverId]) {
        markers.current[driverId].setLngLat(lngLat);
        const img = markers.current[driverId].getElement()?.querySelector("img");
        if (img) img.src = (MARKER_ICONS[validStatus] || MARKER_ICONS.idle).url;
        markers.current[driverId].getPopup()?.setHTML(popupHTML);
      } else {
        try {
          const el = createSvgMarkerEl(validStatus);
          const popup = new window.maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: false }).setHTML(popupHTML);
          const marker = new window.maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(lngLat).setPopup(popup).addTo(mapInstance.current);
          marker._isOpen = false;
          el.addEventListener("click", () => {
            if (marker._isOpen) { popup.remove(); marker._isOpen = false; }
            else { Object.values(markers.current).forEach((m) => { try { m.getPopup()?.remove(); m._isOpen = false; } catch { } }); popup.setLngLat(lngLat).addTo(mapInstance.current); marker._isOpen = true; }
          });
          markers.current[driverId] = marker;
        } catch (err) { console.warn("Marker add error:", err); }
      }
    };

    // Remove stale markers
    Object.keys(markers.current).forEach(id => {
      if (!activeIds.has(String(id))) { try { markers.current[id].remove(); } catch { } delete markers.current[id]; }
    });

    // Render all drivers with known location
    Object.values(driverData).forEach(data => {
      const id = String(data.id || data.driver_id || data.dispatcher_id || data.client_id || "");
      if (id && activeIds.has(id)) {
        const lat = data.latitude !== undefined ? data.latitude : data.lat;
        const lng = data.longitude !== undefined ? data.longitude : data.lng;
        if (lat != null && lng != null) updateOrAddMarker(data);
      }
    });

    // Ensure on-job drivers from the list also render (uses persisted data)
    onJobDrivers.forEach((driver) => {
      const id = getDriverId(driver);
      if (!id) return;
      const merged = { ...driver, ...driverData[id] };
      const lat = merged?.latitude ?? merged?.lat;
      const lng = merged?.longitude ?? merged?.lng;
      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        updateOrAddMarker({ ...merged, latitude: lat, longitude: lng, driving_status: "busy" });
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
          try { const { lat, lng } = m.getLngLat(); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng); hasVisible = true; } catch { }
        });
        if (hasVisible) mapInstance.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50, maxZoom: 15 });
      };
      setTimeout(fit, 600);
      mapInstance.current._hasFittedOnce = true;
    }
  }, [mapReady, driverData]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px", position: "relative" }} />;
};

const usePersistedOnJobDrivers = () => {
  const [onJobDrivers, setRaw] = useState(() => loadFromStorage(ON_JOB_STORAGE_KEY, []));
  const setOnJobDrivers = useCallback((updater) => {
    setRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveToStorage(ON_JOB_STORAGE_KEY, next);
      return next;
    });
  }, []);
  return [onJobDrivers, setOnJobDrivers];
};

const usePersistedDriverData = () => {
  // ── load from storage; set driving_status=busy for any on-job driver ────────
  const [driverData, setRaw] = useState(() => {
    const storedDrivers = loadFromStorage(DRIVER_DATA_STORAGE_KEY, {});
    const onJobDrivers = loadFromStorage(ON_JOB_STORAGE_KEY, []);
    const onJobIds = new Set(onJobDrivers.map(d => String(d.id || d.driver_id || d.dispatcher_id || "")));
    const merged = { ...storedDrivers };
    Object.keys(merged).forEach(id => {
      if (onJobIds.has(id)) merged[id] = { ...merged[id], driving_status: "busy", status: "busy" };
    });
    return merged;
  });
  const setDriverData = useCallback((updater) => {
    setRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveToStorage(DRIVER_DATA_STORAGE_KEY, next);
      return next;
    });
  }, []);
  return [driverData, setDriverData];
};

const usePersistedWaitingDrivers = () => {
  const [waitingDrivers, setRaw] = useState(() => {
    const stored = loadFromStorage(WAITING_DRIVERS_STORAGE_KEY, []);
    const now = Date.now();
    return stored.filter((d) => !d.updatedAt || now - d.updatedAt < 15 * 60 * 1000);
  });
  const setWaitingDrivers = useCallback((updater) => {
    setRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveToStorage(WAITING_DRIVERS_STORAGE_KEY, next);
      return next;
    });
  }, []);
  return [waitingDrivers, setWaitingDrivers];
};

const Overview = () => {
  const [isBookingModelOpen, setIsBookingModelOpen] = useState({ type: "new", isOpen: false, booking: null });
  const [isMessageModelOpen, setIsMessageModelOpen] = useState({ type: "new", isOpen: false });
  const [selectedMessageDriver, setSelectedMessageDriver] = useState(null);
  const [isDriverMessageOpen, setIsDriverMessageOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeBookingFilter, setActiveBookingFilter] = useState("todays_booking");
  const [seedBookings, setSeedBookings] = useState([]);
  const [mapType, setMapType] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [apiKeys, setApiKeys] = useState({ googleKey: null, mapifyStyle: null, searchApi: "google", countryOfUse: null });
  const countryCenter = React.useMemo(() => getCountryCenter(apiKeys.countryOfUse), [apiKeys.countryOfUse]);
  const [plotsData, setPlotsData] = useState([]);
  const [listPlots, setListPlots] = useState([]);
  const allPlots = React.useMemo(() => [...plotsData, ...listPlots], [plotsData, listPlots]);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});
  const socket = useSocket();
  const socketRef = useRef(socket);
  const plotsDataRef = useRef(allPlots);
  useEffect(() => { plotsDataRef.current = allPlots; }, [allPlots]);

  const [dashboardCounts, setDashboardCounts] = useState({ todaysBooking: 0, preBookings: 0, recentJobs: 0, completed: 0, noShow: 0, cancelled: 0 });

  const [driverData, setDriverData] = usePersistedDriverData();
  const [onJobDrivers, setOnJobDrivers] = usePersistedOnJobDrivers();
  const onJobDriversRef = useRef(onJobDrivers);
  useEffect(() => { onJobDriversRef.current = onJobDrivers; }, [onJobDrivers]);
  const [waitingDrivers, setWaitingDrivers] = usePersistedWaitingDrivers();
  const [editingRanks, setEditingRanks] = useState({});
  const [updatingRankId, setUpdatingRankId] = useState(null);
  const [loggingOutDriverId, setLoggingOutDriverId] = useState(null);
  const [hidePlotAndRank, setHidePlotAndRank] = useState(false);

  useEffect(() => {
    const fetchDispatchSystem = async () => {
      try {
        const response = await apiGetDispatchSystem();
        const data = normalizeDispatchSystemList(response);
        setHidePlotAndRank(isNearestDriverDispatchEnabled(data));
      } catch {
        setHidePlotAndRank(false);
      }
    };
    fetchDispatchSystem();
  }, []);

  useEffect(() => {
    const fetchMapConfig = async () => {
      try {
        const [keysRes, mapConfig] = await Promise.all([
          apiGetCompanyApiKeys(),
          fetchMapConfiguration(),
        ]);

        if (keysRes.data?.success) {
          const data = keysRes.data.data;
          setApiKeys((prev) => ({
            ...prev,
            searchApi: data.search_api || "google",
            countryOfUse: data.country_of_use || null,
          }));
        }

        if (!mapConfig.ok) {
          setMapError(mapConfig.message);
          setMapType(null);
          return;
        }

        setMapError(null);
        setMapType(mapConfig.provider);
        setApiKeys((prev) => ({
          ...prev,
          googleKey: mapConfig.provider === MAP_PROVIDER_GOOGLE ? mapConfig.googleKey : null,
          mapifyStyle: mapConfig.provider === MAP_PROVIDER_DEFAULT ? mapConfig.mapifyStyle : null,
        }));
      } catch (err) {
        console.error("Fetch map configuration error:", err);
        setMapError("Unable to load map configuration");
        setMapType(null);
      }
    };
    fetchMapConfig();
  }, []);

  useEffect(() => {
    const fetchPlots = async () => {
      try { const res = await apiGetAllPlot({ page: 1, limit: 100 }); if (res.data?.success) setPlotsData(res.data.data?.data || res.data.data || []); } catch (err) { console.error("Fetch plotsData error:", err); }
    };
    const fetchListPlots = async () => {
      try { const res = await apiGetPlot({ page: 1, perPage: 1000 }); if (res.data?.success) setListPlots(res.data.list?.data || []); } catch (err) { console.error("Fetch listPlots error:", err); }
    };
    fetchPlots(); fetchListPlots();
  }, []);

  useEffect(() => { socketRef.current = socket; }, [socket]);

  // Plot-queue backend: not needed for online drivers waiting list
  // useEffect(() => {
  //   if (!socket || !isSocketConnected) return;
  //   const tenantId = getTenantId();
  //   if (!tenantId) return;
  //   socket.emit("get-my-rank", { database: tenantId });
  // }, [socket, isSocketConnected]);

  const driverCounts = React.useMemo(() => ({
    busy: onJobDrivers.length, idle: waitingDrivers.length, total: onJobDrivers.length + waitingDrivers.length,
  }), [onJobDrivers, waitingDrivers]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setWaitingDrivers((prev) => {
        const filtered = prev.filter((d) => !d.updatedAt || now - d.updatedAt < 15 * 60 * 1000);
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [setWaitingDrivers]);

  const user = useAppSelector((state) => state.auth.user);
  const displayName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : "Admin";

  const fetchDashboardCards = useCallback(async () => {
    try { const res = await getDashboardCards(); if (res.data?.success) setDashboardCounts(res.data.data); } catch (err) { console.error("Dashboard cards error:", err); }
  }, []);

  useEffect(() => { fetchDashboardCards(); }, [fetchDashboardCards]);

  const handleBookingCreated = useCallback((meta) => {
    setRefreshTrigger((prev) => prev + 1);
    fetchDashboardCards();

    if (meta?.isEdit) {
      return;
    }

    if (meta?.createdBookings?.length) {
      setSeedBookings(meta.createdBookings);
    }

    if (meta?.isScheduled || meta?.pickupTimeType === "time") {
      setActiveBookingFilter("pre_bookings");
    } else if (meta?.isMultiBooking) {
      setActiveBookingFilter(meta.includesToday ? "todays_booking" : "pre_bookings");
    } else {
      setActiveBookingFilter("todays_booking");
    }
  }, [fetchDashboardCards]);

  const handleOpenEditBooking = useCallback((booking) => {
    lockBodyScroll();
    setIsBookingModelOpen({ isOpen: true, type: "edit", booking });
  }, []);

  const handleSeedConsumed = useCallback(() => {
    setSeedBookings([]);
  }, []);

  const syncWaitingDriversFromApi = useCallback(async () => {
    try {
      const response = await apiGetDriverManagement({ page: 1, perPage: 500 });
      if (response?.data?.success !== 1) return;

      const driversList = (response.data.list?.data || []).filter((driver) => isDriverOnlineFromApi(driver));
      const idle = [];
      const busy = [];

      driversList.forEach((driver) => {
        const formatted = {
          ...driver,
          id: driver.id || driver.driver_id,
          name: driver.name || driver.driver_name || driver.driverName,
          plot_id: getDriverPlotId(driver),
          plot: driver.plot_name || driver.plot || "N/A",
          rank: driver.rank || driver.ranking || 1,
          updatedAt: Date.now(),
        };

        let lat = driver.latitude ?? driver.lat;
        let lng = driver.longitude ?? driver.lng;
        if ((lat == null || lng == null) && formatted.plot_id) {
          const plot = plotsDataRef.current.find(
            (p) => p.id == formatted.plot_id || p.plot_id == formatted.plot_id
          );
          if (plot) {
            const coords = parseCoordinates(plot);
            if (coords.length > 0) {
              lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
              lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
            }
          }
        }
        const withPosition = lat != null && lng != null
          ? { ...formatted, position: { lat: Number(lat), lng: Number(lng) } }
          : formatted;

        if ((driver.driving_status || "").toLowerCase() === "busy") {
          busy.push(withPosition);
        } else if (isWaitingListDriver(driver)) {
          idle.push(withPosition);
        }
      });

      const rankedIdle = assignDefaultRanks(idle);
      setWaitingDrivers(rankedIdle);

      const waitingIds = new Set(rankedIdle.map((d) => getDriverKey(d)).filter(Boolean));
      const onJobIds = new Set(
        (onJobDriversRef.current || []).map((d) => getDriverKey(d)).filter(Boolean)
      );

      setDriverData((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          if (!waitingIds.has(id) && !onJobIds.has(id)) delete updated[id];
        });
        [...rankedIdle, ...busy].forEach((driver) => {
          const driverId = String(driver.id || driver.driver_id || "");
          if (!driverId) return;
          const isBusy = (driver.driving_status || "").toLowerCase() === "busy";
          updated[driverId] = {
            ...updated[driverId],
            ...driver,
            ...(driver.position ? { position: driver.position } : {}),
            status: isBusy ? "busy" : "idle",
            driving_status: isBusy ? "busy" : "idle",
            online_status: "online",
          };
        });
        saveToStorage(DRIVER_DATA_STORAGE_KEY, updated);
        return updated;
      });
    } catch (err) {
      console.error("Sync waiting drivers error:", err);
    }
  }, [setWaitingDrivers, setDriverData]);

  useEffect(() => {
    let cancelled = false;

    const resolveDriverPosition = (driver) => {
      let lat = driver.latitude ?? driver.lat;
      let lng = driver.longitude ?? driver.lng;

      if ((lat == null || lng == null) && (driver.plot_id || driver.plot)) {
        const plot = plotsDataRef.current.find(
          (p) => p.id == (driver.plot_id || driver.plot) || p.plot_id == (driver.plot_id || driver.plot)
        );
        if (plot) {
          const coords = parseCoordinates(plot);
          if (coords.length > 0) {
            lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
            lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
          }
        }
      }

      return (lat != null && lng != null) ? { lat: Number(lat), lng: Number(lng) } : null;
    };

    const formatDriver = (driver) => ({
      ...driver,
      id: driver.id || driver.driver_id,
      name: driver.name || driver.driver_name || driver.driverName,
      plot_id: getDriverPlotId(driver),
      plot: driver.plot_name || driver.plot || "N/A",
      rank: driver.rank || driver.ranking || 1,
      updatedAt: Date.now(),
    });

    const fetchInitialDrivers = async () => {
      try {
        const response = await apiGetDriverManagement({ page: 1, perPage: 500 });
        if (cancelled || response?.data?.success !== 1) return;

        const driversList = (response.data.list?.data || []).filter((driver) => isDriverOnlineFromApi(driver));

        const idle = [];
        const busy = [];

        driversList.forEach((driver) => {
          const formatted = formatDriver(driver);
          const position = resolveDriverPosition(formatted);
          const withPosition = position ? { ...formatted, position } : formatted;
          if ((driver.driving_status || "").toLowerCase() === "busy") {
            busy.push(withPosition);
          } else if (isWaitingListDriver(driver)) {
            idle.push(withPosition);
          }
        });

        const rankedIdle = assignDefaultRanks(idle);
        setWaitingDrivers(rankedIdle);

        if (busy.length) {
          setOnJobDrivers((prev) => (prev.length ? prev : busy));
        }

        const waitingIds = new Set(rankedIdle.map((d) => getDriverKey(d)).filter(Boolean));
        const onJobIds = new Set(busy.map((d) => getDriverKey(d)).filter(Boolean));

        setDriverData((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((id) => {
            if (!waitingIds.has(id) && !onJobIds.has(id)) delete updated[id];
          });
          [...rankedIdle, ...busy].forEach((driver) => {
            const driverId = String(driver.id || driver.driver_id || "");
            if (!driverId) return;
            const isBusy = (driver.driving_status || "").toLowerCase() === "busy";
            updated[driverId] = {
              ...updated[driverId],
              ...driver,
              ...(driver.position ? { position: driver.position } : {}),
              status: isBusy ? "busy" : "idle",
              driving_status: isBusy ? "busy" : "idle",
              online_status: "online",
            };
          });
          saveToStorage(DRIVER_DATA_STORAGE_KEY, updated);
          return updated;
        });
      } catch (err) {
        console.error("Initial drivers fetch error:", err);
      }
    };

    fetchInitialDrivers();
    return () => { cancelled = true; };
  }, [allPlots, setWaitingDrivers, setOnJobDrivers, setDriverData]);

  useEffect(() => {
    if (!socket) return;

    const pruneMapForWaitingList = (waitingList, updatePositions = false) => {
      const waitingIds = new Set(waitingList.map((d) => getDriverKey(d)).filter(Boolean));
      const onJobIds = new Set(
        (onJobDriversRef.current || []).map((d) => getDriverKey(d)).filter(Boolean)
      );

      setDriverData((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          if (!waitingIds.has(id) && !onJobIds.has(id)) delete updated[id];
        });
        if (updatePositions && waitingList.length) {
          return applyWaitingDriversToDriverData(updated, waitingList, plotsDataRef.current);
        }
        saveToStorage(DRIVER_DATA_STORAGE_KEY, updated);
        return updated;
      });
    };

    const syncWaitingListAndMap = (nextList, updatePositions = true) => {
      const sorted = sortWaitingDrivers(nextList);
      setWaitingDrivers(sorted);
      pruneMapForWaitingList(sorted, updatePositions);
    };

    const removeDriverFromWaitingAndMap = (driverId) => {
      const driverKey = String(driverId);
      if (!driverKey) return;

      setWaitingDrivers((prev) => {
        const next = prev.filter((d) => getDriverKey(d) !== driverKey);
        pruneMapForWaitingList(next, false);
        return next;
      });
    };

    const handleDashboardUpdate = (data) => setDashboardCounts(data);
    const handleNotificationRide = (rawData) => {
      let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      showRideNotification(data);
    };

    const handleMyRankUpdate = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }

      const driversList = data?.drivers;
      if (!Array.isArray(driversList)) return;

      const plotId = data?.plot_id;
      const offlineDriverId = getOfflineDriverIdFromPayload(data);

      if (driversList.length === 0) {
        if (offlineDriverId) {
          removeDriverFromWaitingAndMap(offlineDriverId);
          return;
        }
        if (plotId != null) {
          setWaitingDrivers((prev) => {
            const next = mergeWaitingDriversByPlot(prev, plotId, []);
            pruneMapForWaitingList(next, false);
            return next;
          });
          return;
        }
        // Authoritative empty queue from socket — clear waiting list and map markers
        syncWaitingListAndMap([], false);
        return;
      }

      const formattedDrivers = driversList
        .map(formatWaitingDriverFromSocket)
        .filter(isWaitingListDriver);

      // Socket drivers[] is authoritative for who is online + waiting
      syncWaitingListAndMap(formattedDrivers);
    };

    const handleWaitingDriverOnline = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }

      if (!isWaitingListDriver(data)) return;

      const formatted = formatWaitingDriverFromSocket(data);
      setWaitingDrivers((prev) => {
        const next = upsertWaitingDriver(prev, formatted);
        pruneMapForWaitingList(next, true);
        return next;
      });
    };

    const handleOnJobDriver = (rawData) => {
      let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      if (Array.isArray(data)) { setOnJobDrivers(data); return; }
      if (data?.driverName || data?.driver_name) {
        const name = data.driverName || data.driver_name;
        const driverId = data.id || data.driver_id || data.dispatcher_id;
        const sId = String(driverId);
        if (sId) {
          setDriverData(prev => {
            let lat = data.latitude || data.lat, lng = data.longitude || data.lng;
            if ((lat == null || lng == null) && (data.plot_id || data.plot)) {
              const plot = plotsDataRef.current.find(p => p.id == (data.plot_id || data.plot) || p.plot_id == (data.plot_id || data.plot));
              if (plot) { const coords = parseCoordinates(plot); if (coords.length > 0) { lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length; lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length; } }
            }
            const status = "busy";
            const updated = prev[sId]
              ? { ...prev, [sId]: { ...prev[sId], ...data, position: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : prev[sId].position, status, driving_status: status } }
              : (lat && lng ? { ...prev, [sId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } } : prev);
            saveToStorage(DRIVER_DATA_STORAGE_KEY, updated);
            return updated;
          });
        }
        setWaitingDrivers((prev) => prev.filter((d) => d.name !== name));
        const obj = { id: driverId || Date.now(), name, ...data };
        setOnJobDrivers((prev) => { const exists = prev.some((d) => d.name === obj.name); return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev]; });
      }
    };

    const handleJobAccepted = (rawData) => {
      let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      const driverName = data?.driver_name || data?.driverName;
      if (driverName) {
        setWaitingDrivers((prev) => prev.filter((d) => d.name !== driverName));
        const obj = { id: Date.now(), name: driverName, ...data };
        setOnJobDrivers((prev) => { const exists = prev.some((d) => d.name === obj.name); return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev]; });
      }
    };

    const handleJobCancelled = (rawData) => {
      let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
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

      if ((data.online_status || "").toLowerCase() === "offline") {
        removeDriverFromWaitingAndMap(sId);
        return;
      }

      // If socket explicitly says idle, remove from on-job + localStorage
      if (data.driving_status === "idle") {
        setOnJobDrivers((prev) => prev.filter(d => String(d.id || d.driver_id || d.dispatcher_id) !== sId));
      }

      setWaitingDrivers((prev) => {
        const exists = prev.some((d) => String(d.id || d.driver_id || d.dispatcher_id) === sId);
        if (exists) return prev.map((d) => String(d.id || d.driver_id || d.dispatcher_id) === sId ? { ...d, ...data, updatedAt: now } : d);
        return prev;
      });
    };

    const handleNearestDispatchFailed = (rawData) => {
      let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      showRideNotification({ ...data, isFailedDispatch: true });
      fetchDashboardCards();
    };

    const handleDriverOffline = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }

      const driverId = getOfflineDriverIdFromPayload(data);
      if (!driverId) return;

      removeDriverFromWaitingAndMap(driverId);
    };

    socket.on("dashboard-cards-update", handleDashboardUpdate);
    socket.on("my-rank-update", handleMyRankUpdate);
    socket.on("waiting-driver-event", handleWaitingDriverOnline);
    socket.on("on-job-driver-event", handleOnJobDriver);
    socket.on("notification-ride", handleNotificationRide);
    socket.on("nearest-dispatch-failed", handleNearestDispatchFailed);
    socket.on("job-accepted-by-driver", handleJobAccepted);
    socket.on("job-cancelled-by-driver", handleJobCancelled);
    socket.on("driver-location-update", handleDriverLocationUpdate);
    socket.on("booking-cancelled-event", handleBookingCancelled);
    socket.on("booking-cancelled", handleBookingCancelled);
    socket.on("cancel-booking-event", handleBookingCancelled);
    socket.on("driver-offline-event", handleDriverOffline);
    socket.on("driver-offline", handleDriverOffline);

    return () => {
      socket.off("dashboard-cards-update", handleDashboardUpdate);
      socket.off("my-rank-update", handleMyRankUpdate);
      socket.off("waiting-driver-event", handleWaitingDriverOnline);
      socket.off("on-job-driver-event", handleOnJobDriver);
      socket.off("notification-ride", handleNotificationRide);
      socket.off("nearest-dispatch-failed", handleNearestDispatchFailed);
      socket.off("job-accepted-by-driver", handleJobAccepted);
      socket.off("job-cancelled-by-driver", handleJobCancelled);
      socket.off("driver-location-update", handleDriverLocationUpdate);
      socket.off("booking-cancelled-event", handleBookingCancelled);
      socket.off("booking-cancelled", handleBookingCancelled);
      socket.off("cancel-booking-event", handleBookingCancelled);
      socket.off("driver-offline-event", handleDriverOffline);
      socket.off("driver-offline", handleDriverOffline);
    };
  }, [socket, fetchDashboardCards, syncWaitingDriversFromApi]);

  useEffect(() => {
    const interval = setInterval(() => {
      syncWaitingDriversFromApi();
    }, 120000);
    return () => clearInterval(interval);
  }, [syncWaitingDriversFromApi]);

  useEffect(() => {
    const handleOpenModal = () => { lockBodyScroll(); setIsBookingModelOpen({ isOpen: true, type: "new", booking: null }); };
    window.addEventListener("openAddBookingModal", handleOpenModal);
    return () => window.removeEventListener("openAddBookingModal", handleOpenModal);
  }, []);

  const clearEditingRank = (driverId) => {
    setEditingRanks((prev) => {
      const next = { ...prev };
      delete next[String(driverId)];
      return next;
    });
  };

  const handleMessageDriver = (driver) => {
    setSelectedMessageDriver(driver);
    setIsDriverMessageOpen(true);
  };

  const handleLogoutDriver = async (driver) => {
    const driverId = driver?.id || driver?.driver_id;
    const driverName = driver?.name || driver?.driver_name || "this driver";
    const driverKey = String(driverId);

    if (!driverId) {
      toast.error("Driver information is missing.");
      return;
    }

    if (!window.confirm(`Log out ${driverName}?`)) {
      return;
    }

    setLoggingOutDriverId(driverKey);

    try {
      const response = await apiLogoutDriver({ driver_id: driverId });

      if (response?.data?.success === 1) {
        setWaitingDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
        setDriverData((prev) => removeDriverFromDriverData(prev, driverKey));
        toast.success(`${driverName} logged out.`);
      } else {
        toast.error(response?.data?.message || "Failed to logout driver.");
      }
    } catch (err) {
      console.error("Logout driver error:", err);
      toast.error(err?.response?.data?.message || "Failed to logout driver.");
    } finally {
      setLoggingOutDriverId(null);
    }
  };

  const handleRankChange = async (driver, rawRank) => {
    const driverId = driver.id || driver.driver_id;
    const plotId = getDriverPlotId(driver);
    const newRank = parseInt(rawRank, 10);
    const driverKey = getDriverKey(driver);

    const finishEditing = () => {
      setUpdatingRankId(null);
      clearEditingRank(driverId);
    };

    if (!driverId) {
      toast.error("Cannot update rank: driver is missing.");
      finishEditing();
      return;
    }

    if (Number.isNaN(newRank) || newRank < 1) {
      toast.error("Enter a valid rank (1 or higher).");
      finishEditing();
      return;
    }

    const sameGroup = plotId != null
      ? waitingDrivers.filter((d) => String(getDriverPlotId(d)) === String(plotId))
      : waitingDrivers;
    const sameGroupCount = sameGroup.length;

    if (newRank > sameGroupCount) {
      toast.error(
        plotId != null
          ? `Rank cannot be higher than ${sameGroupCount} for this plot.`
          : `Rank cannot be higher than ${sameGroupCount}.`
      );
      finishEditing();
      return;
    }

    const currentRank = Number(driver.rank || driver.ranking);
    if (newRank === currentRank) {
      finishEditing();
      return;
    }

    setUpdatingRankId(driverKey);

    try {
      const payload = { driver_id: driverId, rank: newRank };
      if (plotId != null) payload.plot_id = plotId;

      const response = await apiUpdateDriverRank(payload, socket);
      const responseData = response?.data ?? response;
      const isSuccess =
        responseData?.success === 1 ||
        responseData?.success === true;

      if (isSuccess) {
        setWaitingDrivers((prev) => reorderDriversByRank(prev, driverKey, newRank));
        toast.success("Driver rank updated.");
      } else {
        toast.error(responseData?.message || "Failed to update driver rank.");
      }
    } catch (err) {
      console.error("Error updating driver rank:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to update driver rank.");
    } finally {
      finishEditing();
    }
  };

  const mapProps = { mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData: allPlots, apiKeys, waitingDrivers, onJobDrivers };

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
          <Button className="w-full sm:w-auto px-3 py-1.5 border border-[#1f41bb] rounded-full" onClick={() => { lockBodyScroll(); setIsMessageModelOpen({ isOpen: true, type: "new" }); }}>
            <div className="flex gap-1 items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block"><PlusIcon fill={"#1f41bb"} height={13} width={13} /></span>
              <span className="sm:hidden"><PlusIcon height={8} width={8} /></span>
              <span>Call Queue</span>
            </div>
          </Button>
          <Button type="filled" btnSize="md" onClick={() => { lockBodyScroll(); setIsBookingModelOpen({ isOpen: true, type: "new", booking: null }); }} className="w-full sm:w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3">
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
            <div className="flex-1 rounded-xl overflow-hidden" style={{ minHeight: 0, position: "relative" }}>
              {mapError && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl px-4 text-center">
                  <p className="text-sm text-red-600">{mapError}</p>
                </div>
              )}
              {!mapError && mapType === MAP_PROVIDER_DEFAULT && apiKeys.mapifyStyle && (
                <DefaultMapSection key={`default-${apiKeys.countryOfUse || "na"}`} {...mapProps} />
              )}
              {!mapError && mapType === MAP_PROVIDER_GOOGLE && apiKeys.googleKey && (
                <GoogleMapSection key={`google-${apiKeys.googleKey}-${apiKeys.countryOfUse}`} {...mapProps} />
              )}
              {!mapError && !mapType && (
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
                  {!hidePlotAndRank && <th className="text-left text-[11px]">Plot</th>}
                  {!hidePlotAndRank && <th className="text-right text-[11px]">Rank</th>}
                  <th className="text-right text-[11px]">Msg</th>
                  <th className="text-right text-[11px]">Out</th>
                </tr>
              </thead>
              <tbody>
                {waitingDrivers.length > 0 ? waitingDrivers.map((driver, i) => {
                  const driverKey = getDriverKey(driver);
                  const plotId = getDriverPlotId(driver);
                  const maxRank = (plotId != null
                    ? waitingDrivers.filter((d) => String(getDriverPlotId(d)) === String(plotId))
                    : waitingDrivers
                  ).length;
                  const isOutsidePlot = isDriverOutsideAssignedPlot(driver, allPlots, driverData);

                  return (
                  <tr key={driver.id || driver.driver_id || i} className="border-t">
                    <td className="py-1">{i + 1}</td>
                    <td>
                      {driver.is_reconnecting ? (
                        <span className="text-orange-500 font-medium animate-pulse">
                          Reconnecting... {driver.name || driver.driver_name || "Unknown"}
                        </span>
                      ) : (
                        driver.display_name || driver.name || driver.driver_name || "Unknown"
                      )}
                    </td>
                    {!hidePlotAndRank && (
                      <td>
                        {isOutsidePlot ? (
                          <span className="text-red-600 font-medium">Outside the plot</span>
                        ) : (
                          getDriverPlotLabel(driver)
                        )}
                      </td>
                    )}
                    {!hidePlotAndRank && (
                      <td className="text-right">
                        <input
                          type="number"
                          min={1}
                          max={maxRank || undefined}
                          title="Click to edit driver rank"
                          disabled={driver.is_reconnecting || updatingRankId === driverKey}
                          className="w-12 text-right border border-gray-300 rounded px-1 py-0.5 text-xs bg-white cursor-text focus:outline-none focus:border-[#1F41BB] focus:ring-1 focus:ring-[#1F41BB] disabled:opacity-50 disabled:cursor-not-allowed"
                          value={editingRanks[driverKey] ?? (driver.rank || driver.ranking || i + 1)}
                          onChange={(e) => {
                            setEditingRanks((prev) => ({ ...prev, [driverKey]: e.target.value }));
                          }}
                          onBlur={(e) => handleRankChange(driver, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                            if (e.key === "Escape") {
                              clearEditingRank(driver.id || driver.driver_id);
                              e.target.blur();
                            }
                          }}
                        />
                      </td>
                    )}
                    <td className="text-right py-1">
                      <button
                        type="button"
                        onClick={() => handleMessageDriver(driver)}
                        className="px-2 py-1 rounded-full border border-[#1F41BB] text-[#1F41BB] text-[10px] hover:bg-[#EEF2FF]"
                        title="Message driver"
                      >
                        Msg
                      </button>
                    </td>
                    <td className="text-right py-1">
                      <button
                        type="button"
                        onClick={() => handleLogoutDriver(driver)}
                        disabled={driver.is_reconnecting || loggingOutDriverId === driverKey}
                        className="px-2 py-1 rounded-full border border-[#FF4747] text-[#FF4747] text-[10px] hover:bg-[#FFF1F1] disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Logout driver"
                      >
                        {loggingOutDriverId === driverKey ? "..." : "Out"}
                      </button>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr><td colSpan={hidePlotAndRank ? 4 : 6} className="text-center py-4 text-gray-500">No waiting drivers</td></tr>
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
                  <th className="text-right">Msg</th>
                </tr>
              </thead>
              <tbody>
                {onJobDrivers.length > 0 ? onJobDrivers.map((driver, i) => (
                  <tr key={driver.id || driver.driver_id || i} className="border-t">
                    <td className="py-1">{i + 1}</td>
                    <td>{driver.name || driver.driver_name || `Driver ${i + 1}`}</td>
                    <td className="text-right py-1">
                      <button
                        type="button"
                        onClick={() => handleMessageDriver(driver)}
                        className="px-2 py-1 rounded-full border border-[#1F41BB] text-[#1F41BB] text-[10px] hover:bg-[#EEF2FF]"
                        title="Message driver"
                      >
                        Msg
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="text-center py-4 text-gray-500">No active jobs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="px-4 sm:p-6">
        <OverViewDetails
          filter={activeBookingFilter}
          externalRefreshTrigger={refreshTrigger}
          seedBookings={seedBookings}
          onSeedConsumed={handleSeedConsumed}
          onOpenEditBooking={handleOpenEditBooking}
        />
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

      <Modal isOpen={isBookingModelOpen.isOpen} size="3xl" className="p-1 sm:p-2 lg:p-3 max-h-[98vh] overflow-y-auto overflow-x-hidden">
        <AddBooking
          key={
            isBookingModelOpen.type === "edit" && isBookingModelOpen.booking?.id
              ? `edit-${isBookingModelOpen.booking.id}`
              : "new"
          }
          setIsOpen={setIsBookingModelOpen}
          onBookingCreated={handleBookingCreated}
          editBooking={isBookingModelOpen.type === "edit" ? isBookingModelOpen.booking : null}
        />
      </Modal>

      <Modal isOpen={isMessageModelOpen.isOpen}>
        <CallQueueModel
          setIsOpen={setIsMessageModelOpen}
          onClose={() => setIsMessageModelOpen({ isOpen: false })}
          refreshList={() => setRefreshTrigger((prev) => prev + 1)}
        />
      </Modal>

      <Modal isOpen={isDriverMessageOpen} size="sm">
        <SendDriverMessageModal
          driver={selectedMessageDriver}
          onClose={() => {
            setIsDriverMessageOpen(false);
            setSelectedMessageDriver(null);
          }}
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
// import { apiGetCompanyApiKeys } from "../../../../services/SettingsConfigurationServices";
// import { getDashboardCards, apiGetAllPlot } from "../../../../services/AddBookingServices";
// import { apiGetPlot } from "../../../../services/PlotService";
// import CallQueueModel from "./components/CallQueueModel/CallQueueModel";
// import RedCarIcon from "../../../../components/svg/RedCarIcon";
// import GreenCarIcon from "../../../../components/svg/GreenCarIcon";
// import { renderToString } from "react-dom/server";

// const GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
// const BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

// const ON_JOB_STORAGE_KEY = "onJobDrivers_persistent";
// const DRIVER_DATA_STORAGE_KEY = "driverData_persistent";
// const WAITING_DRIVERS_STORAGE_KEY = "waitingDrivers_persistent";

// const loadFromStorage = (key, fallback) => {
//   try {
//     const raw = localStorage.getItem(key);
//     if (!raw) return fallback;
//     return JSON.parse(raw);
//   } catch { return fallback; }
// };

// const saveToStorage = (key, value) => {
//   try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
// };

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
//       <span style={{ fontSize: "10px", color: "#6b7280", display: "block", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1, marginBottom: "2px" }}>{label}</span>
//       <span style={{ fontSize: "12px", color: color || "#111827", fontWeight: bold ? 700 : 500, wordBreak: "break-word", lineHeight: 1.4 }}>{value || "—"}</span>
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
//   const handleClose = () => { setLeaving(true); setTimeout(onClose, 350); };
//   return (
//     <>
//       <style>{`
//         @keyframes rideNotifShrink { from { width: 100%; } to { width: 0%; } }
//         @keyframes rideNotifPulse { 0%,100%{box-shadow:0 0 0 0 rgba(31,65,187,0.25);} 50%{box-shadow:0 0 0 6px rgba(31,65,187,0);} }
//       `}</style>
//       <div style={{ transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(110%) scale(0.95)", opacity: visible && !leaving ? 1 : 0, transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.35s ease", background: "#ffffff", borderRadius: "16px", boxShadow: "0 12px 40px rgba(31,65,187,0.18), 0 2px 12px rgba(0,0,0,0.08)", border: "1.5px solid #e0e7ff", width: "320px", overflow: "hidden", marginBottom: "12px", fontFamily: "'Segoe UI', system-ui, sans-serif", animation: "rideNotifPulse 2s ease-in-out 3" }}>
//         <div style={{ background: "linear-gradient(135deg, #1F41BB 0%, #3a5fd9 100%)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <div>
//               <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>New Ride Request</div>
//               {data.booking_id && <div style={{ color: "#c7d4ff", fontSize: "11px", marginTop: "2px", fontWeight: 500 }}>#{data.booking_id}</div>}
//             </div>
//           </div>
//           <button onClick={handleClose} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", transition: "background 0.2s", flexShrink: 0 }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.32)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"} aria-label="Close">✕</button>
//         </div>
//         <div style={{ padding: "14px 16px 10px" }}>
//           <NotifRow label="Pickup" value={data.pickup_location || formatCoord(data.pickup_point)} color="#16a34a" />
//           <NotifRow label="Destination" value={data.destination_location || formatCoord(data.destination_point)} color="#dc2626" />
//           {data.offered_amount && <NotifRow label="Offered Amount" value={formatAmount(data.offered_amount)} color="#1F41BB" bold />}
//         </div>
//         <div style={{ padding: "0 16px 12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
//           {data.payment_method && <span style={{ background: "#eff6ff", color: "#1F41BB", fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", border: "1px solid #bfdbfe" }}>{data.payment_method}</span>}
//           {data.ride_type && <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", border: "1px solid #bbf7d0" }}>{data.ride_type}</span>}
//         </div>
//         <div style={{ height: "3px", background: "#e0e7ff", position: "relative", overflow: "hidden" }}>
//           <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "linear-gradient(90deg, #1F41BB, #60a5fa)", animation: "rideNotifShrink 8s linear forwards" }} />
//         </div>
//       </div>
//     </>
//   );
// };

// const DispatchFailedCard = ({ data, onClose }) => {
//   const [visible, setVisible] = useState(false);
//   const [leaving, setLeaving] = useState(false);
//   useEffect(() => {
//     requestAnimationFrame(() => setVisible(true));
//     const timer = setTimeout(() => handleClose(), 8000);
//     return () => clearTimeout(timer);
//   }, []);
//   const handleClose = () => { setLeaving(true); setTimeout(onClose, 350); };
  
//   const pickup = data.pickup_location || (data.pickup_point ? formatCoord(data.pickup_point) : "");
//   const destination = data.destination_location || (data.destination_point ? formatCoord(data.destination_point) : "");
//   const reason = data.message || data.reason || data.cancel_reason || "No driver accepted the request or no active drivers found.";

//   return (
//     <>
//       <style>{`
//         @keyframes dispatchNotifShrink { from { width: 100%; } to { width: 0%; } }
//         @keyframes dispatchNotifPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.25);} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0);} }
//       `}</style>
//       <div style={{ transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(110%) scale(0.95)", opacity: visible && !leaving ? 1 : 0, transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.35s ease", background: "#ffffff", borderRadius: "16px", boxShadow: "0 12px 40px rgba(239,68,68,0.18), 0 2px 12px rgba(0,0,0,0.08)", border: "1.5px solid #fee2e2", width: "320px", overflow: "hidden", marginBottom: "12px", fontFamily: "'Segoe UI', system-ui, sans-serif", animation: "dispatchNotifPulse 2s ease-in-out 3" }}>
//         <div style={{ background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <div>
//               <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>Nearest Dispatch Failed</div>
//               {(data.booking_id || data.bookingId) && <div style={{ color: "#fee2e2", fontSize: "11px", marginTop: "2px", fontWeight: 500 }}>#{data.booking_id || data.bookingId}</div>}
//             </div>
//           </div>
//           <button onClick={handleClose} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", transition: "background 0.2s", flexShrink: 0 }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.32)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"} aria-label="Close">✕</button>
//         </div>
//         <div style={{ padding: "14px 16px 10px" }}>
//           {pickup && <NotifRow label="Pickup" value={pickup} color="#16a34a" />}
//           {destination && <NotifRow label="Destination" value={destination} color="#dc2626" />}
//           <NotifRow label="Failure Reason" value={reason} color="#b91c1c" bold />
//         </div>
//         <div style={{ height: "3px", background: "#fee2e2", position: "relative", overflow: "hidden" }}>
//           <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "linear-gradient(90deg, #dc2626, #f87171)", animation: "dispatchNotifShrink 8s linear forwards" }} />
//         </div>
//       </div>
//     </>
//   );
// };

// const RideNotificationContainer = () => {
//   const [notifications, setNotifications] = useState([]);
//   useEffect(() => {
//     const handler = (data) => { const id = Date.now() + Math.random(); setNotifications((prev) => [...prev, { id, data }]); };
//     notifListeners.add(handler);
//     return () => notifListeners.delete(handler);
//   }, []);
//   const remove = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));
//   return (
//     <div style={{ position: "fixed", bottom: "80px", right: "20px", zIndex: 9999, display: "flex", flexDirection: "column-reverse", alignItems: "flex-end", pointerEvents: "none" }}>
//       {notifications.map(({ id, data }) => (
//         <div key={id} style={{ pointerEvents: "auto" }}>
//           {data.isFailedDispatch ? (
//             <DispatchFailedCard data={data} onClose={() => remove(id)} />
//           ) : (
//             <RideCard data={data} onClose={() => remove(id)} />
//           )}
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
//   idle: { url: svgToDataUrl(RedCarIcon, 40, 40), scaledSize: { width: 40, height: 40 }, anchor: { x: 20, y: 20 } },
//   busy: { url: svgToDataUrl(GreenCarIcon, 40, 40), scaledSize: { width: 40, height: 40 }, anchor: { x: 20, y: 20 } },
// };

// const COUNTRY_CENTERS = {
//   GB: { lat: 51.5074, lng: -0.1278 }, US: { lat: 37.0902, lng: -95.7129 },
//   IN: { lat: 20.5937, lng: 78.9629 }, AU: { lat: -25.2744, lng: 133.7751 },
//   CA: { lat: 56.1304, lng: -106.3468 }, AE: { lat: 23.4241, lng: 53.8478 },
//   PK: { lat: 30.3753, lng: 69.3451 }, BD: { lat: 23.8103, lng: 90.4125 },
//   SA: { lat: 23.8859, lng: 45.0792 }, NG: { lat: 9.082, lng: 8.6753 },
//   ZA: { lat: -30.5595, lng: 22.9375 }, DE: { lat: 51.1657, lng: 10.4515 },
//   FR: { lat: 46.2276, lng: 2.2137 }, IT: { lat: 41.8719, lng: 12.5674 },
//   ES: { lat: 40.4637, lng: -3.7492 }, NL: { lat: 52.1326, lng: 5.2913 },
//   SG: { lat: 1.3521, lng: 103.8198 }, MY: { lat: 4.2105, lng: 101.9758 },
//   NZ: { lat: -40.9006, lng: 172.886 }, KE: { lat: -1.2921, lng: 36.8219 },
//   ID: { lat: -0.7893, lng: 113.9213 }, PH: { lat: 12.8797, lng: 121.774 },
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

// const getMapType = (data) => {
//   if (!data) return "google";
//   const mapsApi = data?.maps_api?.trim().toLowerCase();
//   const countryOfUse = data?.country_of_use?.trim().toUpperCase();
//   if (mapsApi === "barikoi") return "barikoi";
//   if (mapsApi === "google") return "google";
//   if (countryOfUse === "BD") return "barikoi";
//   return "google";
// };

// const getApiKeys = (stateApiKeys) => ({
//   googleKey: stateApiKeys?.googleKey || GOOGLE_KEY,
//   barikoiKey: stateApiKeys?.barikoiKey || BARIKOI_KEY,
// });

// const getCountryCenter = (code) => {
//   if (code) return COUNTRY_CENTERS[code.trim().toUpperCase()] || COUNTRY_CENTERS.DEFAULT;
//   return COUNTRY_CENTERS.DEFAULT;
// };

// const loadGoogleMaps = (apiKey) => {
//   return new Promise((resolve, reject) => {
//     if (window.google?.maps?.Map) return resolve();
//     const existing = document.getElementById("google-maps-script");
//     if (existing) {
//       const check = setInterval(() => { if (window.google?.maps?.Map) { clearInterval(check); resolve(); } }, 100);
//       return;
//     }
//     const script = document.createElement("script");
//     script.id = "google-maps-script";
//     script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey || GOOGLE_KEY}&libraries=places&loading=async`;
//     script.async = true; script.defer = true;
//     script.onload = () => { const check = setInterval(() => { if (window.google?.maps?.Map) { clearInterval(check); resolve(); } }, 50); };
//     script.onerror = reject;
//     document.head.appendChild(script);
//   });
// };

// const loadBarikoiMaps = () => {
//   return new Promise((resolve, reject) => {
//     if (window.maplibregl) return resolve();
//     if (!document.getElementById("maplibre-css")) {
//       const link = document.createElement("link");
//       link.id = "maplibre-css"; link.rel = "stylesheet";
//       link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
//       document.head.appendChild(link);
//     }
//     const existing = document.getElementById("maplibre-script");
//     if (existing) {
//       const check = setInterval(() => { if (window.maplibregl) { clearInterval(check); resolve(); } }, 100);
//       return;
//     }
//     const script = document.createElement("script");
//     script.id = "maplibre-script";
//     script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
//     script.async = true;
//     script.onload = () => { setTimeout(() => { if (window.maplibregl) resolve(); else reject(new Error("MapLibre GL not available after load")); }, 100); };
//     script.onerror = () => reject(new Error("MapLibre GL script failed to load"));
//     document.head.appendChild(script);
//   });
// };

// const buildBarikoiStyle = (barikoiKey) => ({
//   version: 8, name: "Barikoi",
//   glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
//   sources: { "osm-tiles": { type: "raster", tiles: [`https://tile.barikoi.com/styles/barikoi/tiles/{z}/{x}/{y}.png?key=${barikoiKey}`], tileSize: 256, attribution: "© Barikoi | © OpenStreetMap contributors", maxzoom: 19 } },
//   layers: [{ id: "osm-tiles", type: "raster", source: "osm-tiles", minzoom: 0, maxzoom: 22 }],
// });

// const buildOsmFallbackStyle = () => ({
//   version: 8, name: "OSM",
//   glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
//   sources: { "osm-tiles": { type: "raster", tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors", maxzoom: 19 } },
//   layers: [{ id: "osm-tiles", type: "raster", source: "osm-tiles", minzoom: 0, maxzoom: 22 }],
// });

// const makeGoogleIcon = (status) => {
//   const icon = MARKER_ICONS[status] || MARKER_ICONS.idle;
//   return { url: icon.url, scaledSize: new window.google.maps.Size(icon.scaledSize.width, icon.scaledSize.height), anchor: new window.google.maps.Point(icon.anchor.x, icon.anchor.y) };
// };

// const createSvgMarkerEl = (status) => {
//   const icon = MARKER_ICONS[status] || MARKER_ICONS.idle;
//   const el = document.createElement("div");
//   Object.assign(el.style, { width: `${icon.scaledSize.width}px`, height: `${icon.scaledSize.height}px`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" });
//   const img = document.createElement("img");
//   img.src = icon.url;
//   Object.assign(img.style, { width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" });
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
//     const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
//     marker.setPosition({ lat: startLat + (endLat - startLat) * ease, lng: startLng + (endLng - startLng) * ease });
//     if (progress < 1) requestAnimationFrame(tick);
//   };
//   tick();
// };

// const parseDriverData = (rawData) => {
//   try {
//     let data = rawData;
//     if (typeof data === "string") {
//       const fixed = data.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
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
//         return { latitude: parseFloat(latM[1]), longitude: parseFloat(lngM[1]), client_id: cidM?.[1] ?? null, dispatcher_id: didM ? parseInt(didM[1]) : null, id: idM ? parseInt(idM[1]) : null, driving_status: stM?.[1] ?? "idle", name: nameM?.[1] ?? null, phone_no: phoneM?.[1] ?? null, plate_no: plateM?.[1] ?? null };
//       }
//     }
//     return null;
//   }
// };

// const parseCoordinates = (plot) => {
//   if (!plot) return [];
//   try {
//     if (plot.features) {
//       const feature = typeof plot.features === "string" ? JSON.parse(plot.features) : plot.features;
//       let geometry = feature.geometry;
//       if (typeof geometry === "string") geometry = JSON.parse(geometry);
//       let coords = geometry?.coordinates;
//       if (typeof coords === "string") coords = JSON.parse(coords);
//       if (Array.isArray(coords) && Array.isArray(coords[0])) return coords[0].map((p) => ({ lat: Number(p[1]), lng: Number(p[0]) }));
//     }
//     let coords = plot.coordinates;
//     if (typeof coords === "string") coords = JSON.parse(coords);
//     if (Array.isArray(coords)) return coords.map((c) => ({ lat: Number(c.lat), lng: Number(c.lng) }));
//   } catch (error) { console.error("Parse coordinates error:", error); }
//   return [];
// };

// const buildPopupHTML = (data) => {
//   const name = data.name || data.driver_name || data.driverName || "Unknown Driver";
//   const phone = data.phone_no || data.phone || "N/A";
//   const plate = data.plate_no || data.plate || "N/A";
//   const status = (data.driving_status || data.status || "idle").toLowerCase();
//   const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
//   const statusColor = status === "busy" ? "#10b981" : "#ef4444";
//   return `<div style="font-family:'Inter',sans-serif;min-width:150px;padding:4px 6px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#4b5563;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span style="font-weight:700;color:#111827;font-size:15px;">${name}</span></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#6b7280;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span style="color:#4b5563;font-size:13px;">${phone}</span></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#6b7280;"><rect x="1" y="3" width="22" height="18" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg><span style="background:#f9fafb;color:#374151;font-weight:600;font-size:12px;padding:1px 6px;border-radius:4px;border:1px solid #e5e7eb;">${plate}</span></div><div style="display:flex;align-items:center;gap:6px;border-top:1px solid #f3f4f6;padding-top:8px;"><span style="height:7px;width:7px;background-color:${statusColor};border-radius:50%;display:inline-block;"></span><span style="color:${statusColor};font-weight:700;font-size:12px;text-transform:capitalize;border:1px solid ${statusColor}40;padding:1px 8px;border-radius:20px;background:${statusColor}10;">${statusLabel}</span></div></div>`;
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
//       const polygon = new window.google.maps.Polygon({ paths: coords, strokeColor: "#1F41BB", strokeOpacity: 0.8, strokeWeight: 2, fillColor: "#1F41BB", fillOpacity: 0.1, map: mapInstance.current });
//       plotPolygons.current.push(polygon);
//     });
//   };

//   useEffect(() => { if (mapInstance.current && plotsData) renderPlots(); }, [plotsData]);

//   const fitMapToMarkers = () => {
//     if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
//     const bounds = new window.google.maps.LatLngBounds();
//     let hasVisible = false;
//     Object.values(markers.current).forEach((m) => { if (m.getVisible()) { bounds.extend(m.getPosition()); hasVisible = true; } });
//     if (hasVisible) { mapInstance.current.fitBounds(bounds); if (mapInstance.current.getZoom() > 15) mapInstance.current.setZoom(15); }
//   };

//   useEffect(() => {
//     let mounted = true;
//     if (!googleKey) return;
//     loadGoogleMaps(googleKey).then(() => {
//       if (!mounted || !mapRef.current || mapInstance.current) return;
//       mapInstance.current = new window.google.maps.Map(mapRef.current, {
//         center: { lat: countryCenter.lat, lng: countryCenter.lng }, zoom: 5,
//         styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
//       });
//       setIsMapReady(true);
//     }).catch((err) => console.error("Google Map load failed:", err));
//     return () => { mounted = false; if (mapInstance.current) mapInstance.current = null; };
//   }, [googleKey]);

//   const socketRef = useRef(socket);
//   useEffect(() => { socketRef.current = socket; }, [socket]);
//   const driverDataRef = useRef(driverData);
//   useEffect(() => { driverDataRef.current = driverData; }, [driverData]);

//   useEffect(() => {
//     if (!isMapReady) return;
//     const getDriverId = (d) => String(d.id || d.driver_id || d.dispatcher_id || d.client_id || "");
//     const onJobIds = new Set(onJobDrivers.map(getDriverId).filter(Boolean));
//     const waitingIds = new Set(waitingDrivers.map(getDriverId).filter(Boolean));
//     const activeIds = new Set([...onJobIds, ...waitingIds]);

//     const renderMarker = (id, data) => {
//       if (!mapInstance.current || !id) return;
//       const latitude = data?.latitude !== undefined ? data?.latitude : data?.lat;
//       const longitude = data?.longitude !== undefined ? data?.longitude : data?.lng;
//       if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;
//       const position = { lat: Number(latitude), lng: Number(longitude) };
//       // ── on-job drivers always show as green (busy) ──
//       const isOnJob = onJobIds.has(id);
//       const validStatus = isOnJob ? "busy" : ((data?.driving_status || data?.status || "idle") === "busy" ? "busy" : "idle");
//       const name = data?.name || data?.driverName || data?.driver_name || `Driver ${id}`;
//       const infoContent = buildPopupHTML({ ...data, driving_status: validStatus });

//       if (markers.current[id]) {
//         const marker = markers.current[id];
//         const oldPos = marker.getPosition();
//         const dist = Math.sqrt((oldPos.lat() - position.lat) ** 2 + (oldPos.lng() - position.lng) ** 2);
//         dist < 0.01 ? animateMarker(marker, position, 1000) : marker.setPosition(position);
//         marker.setIcon(makeGoogleIcon(validStatus));
//         marker.infoWindow?.setContent(infoContent);
//       } else {
//         const marker = new window.google.maps.Marker({ position, map: mapInstance.current, title: name, icon: makeGoogleIcon(validStatus), animation: window.google.maps.Animation.DROP });
//         const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });
//         marker.addListener("click", () => { Object.values(markers.current).forEach((m) => m.infoWindow?.close()); infoWindow.open(mapInstance.current, marker); });
//         marker.infoWindow = infoWindow;
//         markers.current[id] = marker;
//       }
//     };

//     // Remove markers for drivers no longer active
//     Object.keys(markers.current).forEach(id => {
//       if (!activeIds.has(id)) { markers.current[id].setMap(null); delete markers.current[id]; }
//     });

//     // Render all active drivers from driverData (includes persisted data after refresh)
//     Object.entries(driverDataRef.current).forEach(([id, data]) => {
//       if (activeIds.has(id)) renderMarker(id, data);
//     });

//     // Also directly render on-job drivers (even if driverData entry has no coords yet,
//     // skip — but ensure every on-job driver with coords gets a marker)
//     onJobDrivers.forEach((driver) => {
//       const id = getDriverId(driver);
//       if (!id) return;
//       const data = driverDataRef.current[id] || driver;
//       const lat = data?.latitude ?? data?.lat ?? driver?.latitude ?? driver?.lat;
//       const lng = data?.longitude ?? data?.lng ?? driver?.longitude ?? driver?.lng;
//       if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
//         renderMarker(id, { ...data, latitude: lat, longitude: lng, driving_status: "busy" });
//       }
//     });

//     const handle = (rawData) => {
//       const data = parseDriverData(rawData);
//       if (!data) return;
//       const id = getDriverId(data);
//       if (!id) return;
//       setDriverData(prev => {
//         const updated = { ...prev, [id]: { ...prev[id], ...data } };
//         saveToStorage(DRIVER_DATA_STORAGE_KEY, updated); // persist location update
//         return updated;
//       });
//       if (activeIds.has(id)) renderMarker(id, data);
//     };

//     if (socketRef.current) socketRef.current.on("driver-location-update", handle);
//     return () => { if (socketRef.current) socketRef.current.off("driver-location-update", handle); };
//   }, [isMapReady, waitingDrivers, onJobDrivers]);

//   useEffect(() => {
//     Object.values(markers.current).forEach((m) => m.setVisible(true));
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
//   const plotsRendered = useRef(false);

//   const renderPlots = (map) => {
//     if (!map || !plotsData || plotsData.length === 0) return;
//     const doRender = () => {
//       try {
//         ["plots-labels", "plots-outline", "plots-fill"].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
//         if (map.getSource("plots")) map.removeSource("plots");
//         const features = plotsData.map(plot => {
//           const coords = parseCoordinates(plot);
//           if (coords.length === 0) return null;
//           return { type: "Feature", properties: { name: plot.plot_name || "Plot" }, geometry: { type: "Polygon", coordinates: [coords.map(c => [c.lng, c.lat])] } };
//         }).filter(Boolean);
//         if (features.length === 0) return;
//         map.addSource("plots", { type: "geojson", data: { type: "FeatureCollection", features } });
//         map.addLayer({ id: "plots-fill", type: "fill", source: "plots", paint: { "fill-color": "#1F41BB", "fill-opacity": 0.15 } });
//         map.addLayer({ id: "plots-outline", type: "line", source: "plots", paint: { "line-color": "#1F41BB", "line-width": 2.5, "line-opacity": 0.9 } });
//         plotsRendered.current = true;
//       } catch (err) { console.warn("Plot render error:", err); }
//     };
//     if (map.isStyleLoaded()) doRender(); else map.once("idle", doRender);
//   };

//   useEffect(() => { if (mapReady && mapInstance.current && plotsData?.length > 0) renderPlots(mapInstance.current); }, [mapReady, plotsData]);

//   useEffect(() => {
//     if (!barikoiKey) return;
//     let mounted = true;
//     const init = async () => {
//       try { await loadBarikoiMaps(); } catch (err) { console.error("Barikoi/MapLibre load failed:", err); return; }
//       if (!mounted || !mapRef.current || mapInstance.current) return;
//       const container = mapRef.current;
//       container.style.width = "100%"; container.style.height = "100%"; container.style.minHeight = "400px"; container.style.position = "relative";
//       await new Promise(resolve => requestAnimationFrame(resolve));
//       await new Promise(resolve => setTimeout(resolve, 50));
//       if (!mounted || !mapRef.current) return;
//       const initMap = (style) => {
//         try {
//           const map = new window.maplibregl.Map({ container, style, center: [countryCenter.lng, countryCenter.lat], zoom: 8, attributionControl: true, fadeDuration: 0 });
//           map.addControl(new window.maplibregl.NavigationControl(), "top-right");
//           map.on("load", () => { if (!mounted) return; map.resize(); setTimeout(() => { if (mounted && map) { map.resize(); setMapReady(true); } }, 150); });
//           map.on("error", (e) => {
//             const msg = e?.error?.message || String(e);
//             if (msg.includes("403") || msg.includes("401") || (msg.includes("Failed to fetch") && !map._usedFallback)) {
//               map._usedFallback = true;
//               try { map.setStyle(buildOsmFallbackStyle()); } catch { }
//             }
//           });
//           mapInstance.current = map;
//         } catch (err) {
//           console.error("MapLibre Map instantiation failed:", err);
//           try {
//             const map = new window.maplibregl.Map({ container, style: buildOsmFallbackStyle(), center: [countryCenter.lng, countryCenter.lat], zoom: 8 });
//             map.on("load", () => { map.resize(); setMapReady(true); });
//             mapInstance.current = map;
//           } catch { }
//         }
//       };
//       initMap(buildBarikoiStyle(barikoiKey));
//     };
//     init();
//     return () => {
//       mounted = false;
//       if (mapInstance.current) {
//         try { Object.values(markers.current).forEach((m) => { try { m.remove(); } catch { } }); markers.current = {}; mapInstance.current.remove(); } catch { }
//         mapInstance.current = null;
//       }
//     };
//   }, [barikoiKey]);

//   useEffect(() => {
//     if (!mapRef.current) return;
//     const ro = new ResizeObserver(() => { if (mapInstance.current && typeof mapInstance.current.resize === "function") mapInstance.current.resize(); });
//     ro.observe(mapRef.current);
//     return () => ro.disconnect();
//   }, []);

//   const socketRef = useRef(socket);
//   useEffect(() => { socketRef.current = socket; }, [socket]);

//   useEffect(() => {
//     if (!mapReady) return;
//     const getDriverId = (d) => String(d.id || d.driver_id || d.dispatcher_id || d.client_id || "");
//     const onJobIds = new Set(onJobDrivers.map(getDriverId).filter(Boolean));
//     const waitingIds = new Set(waitingDrivers.map(getDriverId).filter(Boolean));
//     const activeIds = new Set([...onJobIds, ...waitingIds]);

//     const updateOrAddMarker = (data) => {
//       if (!mapInstance.current) return;
//       const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
//       if (driverId == null) return;
//       const lat = Number(data.latitude !== undefined ? data.latitude : data.lat);
//       const lng = Number(data.longitude !== undefined ? data.longitude : data.lng);
//       if (isNaN(lat) || isNaN(lng)) return;
//       const lngLat = [lng, lat];
//       const isOnJob = onJobIds.has(String(driverId));
//       const validStatus = isOnJob ? "busy" : ((data.driving_status || "idle") === "busy" ? "busy" : "idle");
//       const name = data.name || data.driverName || data.driver_name || `Driver ${driverId}`;
//       const popupHTML = buildPopupHTML({ ...data, driving_status: validStatus });

//       setDriverData((prev) => {
//         const updated = { ...prev, [driverId]: { ...data, position: { lat, lng }, status: validStatus, driving_status: validStatus, name } };
//         saveToStorage(DRIVER_DATA_STORAGE_KEY, updated); // persist
//         return updated;
//       });

//       if (markers.current[driverId]) {
//         markers.current[driverId].setLngLat(lngLat);
//         const img = markers.current[driverId].getElement()?.querySelector("img");
//         if (img) img.src = (MARKER_ICONS[validStatus] || MARKER_ICONS.idle).url;
//         markers.current[driverId].getPopup()?.setHTML(popupHTML);
//       } else {
//         try {
//           const el = createSvgMarkerEl(validStatus);
//           const popup = new window.maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: false }).setHTML(popupHTML);
//           const marker = new window.maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(lngLat).setPopup(popup).addTo(mapInstance.current);
//           marker._isOpen = false;
//           el.addEventListener("click", () => {
//             if (marker._isOpen) { popup.remove(); marker._isOpen = false; }
//             else { Object.values(markers.current).forEach((m) => { try { m.getPopup()?.remove(); m._isOpen = false; } catch { } }); popup.setLngLat(lngLat).addTo(mapInstance.current); marker._isOpen = true; }
//           });
//           markers.current[driverId] = marker;
//         } catch (err) { console.warn("Marker add error:", err); }
//       }
//     };

//     // Remove stale markers
//     Object.keys(markers.current).forEach(id => {
//       if (!activeIds.has(String(id))) { try { markers.current[id].remove(); } catch { } delete markers.current[id]; }
//     });

//     // Render all drivers with known location
//     Object.values(driverData).forEach(data => {
//       const id = String(data.id || data.driver_id || data.dispatcher_id || data.client_id || "");
//       if (id && activeIds.has(id)) {
//         const lat = data.latitude !== undefined ? data.latitude : data.lat;
//         const lng = data.longitude !== undefined ? data.longitude : data.lng;
//         if (lat != null && lng != null) updateOrAddMarker(data);
//       }
//     });

//     // Ensure on-job drivers from the list also render (uses persisted data)
//     onJobDrivers.forEach((driver) => {
//       const id = getDriverId(driver);
//       if (!id) return;
//       const merged = { ...driver, ...driverData[id] };
//       const lat = merged?.latitude ?? merged?.lat;
//       const lng = merged?.longitude ?? merged?.lng;
//       if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
//         updateOrAddMarker({ ...merged, latitude: lat, longitude: lng, driving_status: "busy" });
//       }
//     });

//     const handle = (rawData) => {
//       const data = parseDriverData(rawData);
//       if (data) updateOrAddMarker(data);
//     };

//     if (socketRef.current) socketRef.current.on("driver-location-update", handle);
//     return () => { if (socketRef.current) socketRef.current.off("driver-location-update", handle); };
//   }, [mapReady, waitingDrivers, onJobDrivers]);

//   useEffect(() => {
//     if (mapReady && mapInstance.current && !mapInstance.current._hasFittedOnce && Object.keys(markers.current).length > 0) {
//       const fit = () => {
//         if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
//         let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity, hasVisible = false;
//         Object.values(markers.current).forEach((m) => {
//           try { const { lat, lng } = m.getLngLat(); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng); hasVisible = true; } catch { }
//         });
//         if (hasVisible) mapInstance.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50, maxZoom: 15 });
//       };
//       setTimeout(fit, 600);
//       mapInstance.current._hasFittedOnce = true;
//     }
//   }, [mapReady, driverData]);

//   return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px", position: "relative" }} />;
// };

// const usePersistedOnJobDrivers = () => {
//   const [onJobDrivers, setRaw] = useState(() => loadFromStorage(ON_JOB_STORAGE_KEY, []));
//   const setOnJobDrivers = useCallback((updater) => {
//     setRaw((prev) => {
//       const next = typeof updater === "function" ? updater(prev) : updater;
//       saveToStorage(ON_JOB_STORAGE_KEY, next);
//       return next;
//     });
//   }, []);
//   return [onJobDrivers, setOnJobDrivers];
// };

// const usePersistedDriverData = () => {
//   // ── load from storage; set driving_status=busy for any on-job driver ────────
//   const [driverData, setRaw] = useState(() => {
//     const storedDrivers = loadFromStorage(DRIVER_DATA_STORAGE_KEY, {});
//     const onJobDrivers = loadFromStorage(ON_JOB_STORAGE_KEY, []);
//     const onJobIds = new Set(onJobDrivers.map(d => String(d.id || d.driver_id || d.dispatcher_id || "")));
//     const merged = { ...storedDrivers };
//     Object.keys(merged).forEach(id => {
//       if (onJobIds.has(id)) merged[id] = { ...merged[id], driving_status: "busy", status: "busy" };
//     });
//     return merged;
//   });
//   const setDriverData = useCallback((updater) => {
//     setRaw((prev) => {
//       const next = typeof updater === "function" ? updater(prev) : updater;
//       saveToStorage(DRIVER_DATA_STORAGE_KEY, next);
//       return next;
//     });
//   }, []);
//   return [driverData, setDriverData];
// };

// const usePersistedWaitingDrivers = () => {
//   const [waitingDrivers, setRaw] = useState(() => {
//     const stored = loadFromStorage(WAITING_DRIVERS_STORAGE_KEY, []);
//     const now = Date.now();
//     return stored.filter((d) => !d.updatedAt || now - d.updatedAt < 5 * 60 * 1000);
//   });
//   const setWaitingDrivers = useCallback((updater) => {
//     setRaw((prev) => {
//       const next = typeof updater === "function" ? updater(prev) : updater;
//       saveToStorage(WAITING_DRIVERS_STORAGE_KEY, next);
//       return next;
//     });
//   }, []);
//   return [waitingDrivers, setWaitingDrivers];
// };

// const Overview = () => {
//   const [isBookingModelOpen, setIsBookingModelOpen] = useState({ type: "new", isOpen: false });
//   const [isMessageModelOpen, setIsMessageModelOpen] = useState({ type: "new", isOpen: false });
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [activeBookingFilter, setActiveBookingFilter] = useState("todays_booking");
//   const [mapType, setMapType] = useState(null);
//   const [apiKeys, setApiKeys] = useState({ googleKey: GOOGLE_KEY, barikoiKey: BARIKOI_KEY, searchApi: "google", countryOfUse: null });
//   const countryCenter = React.useMemo(() => getCountryCenter(apiKeys.countryOfUse), [apiKeys.countryOfUse]);
//   const [plotsData, setPlotsData] = useState([]);
//   const [listPlots, setListPlots] = useState([]);
//   const allPlots = React.useMemo(() => [...plotsData, ...listPlots], [plotsData, listPlots]);

//   const mapRef = useRef(null);
//   const mapInstance = useRef(null);
//   const markers = useRef({});
//   const socket = useSocket();
//   const socketRef = useRef(socket);
//   const plotsDataRef = useRef(allPlots);
//   useEffect(() => { plotsDataRef.current = allPlots; }, [allPlots]);

//   const [dashboardCounts, setDashboardCounts] = useState({ todaysBooking: 0, preBookings: 0, recentJobs: 0, completed: 0, noShow: 0, cancelled: 0 });

//   const [driverData, setDriverData] = usePersistedDriverData();
//   const [onJobDrivers, setOnJobDrivers] = usePersistedOnJobDrivers();
//   const [waitingDrivers, setWaitingDrivers] = usePersistedWaitingDrivers();

//   useEffect(() => {
//     const fetchApiKeys = async () => {
//       try {
//         const res = await apiGetCompanyApiKeys();
//         if (res.data?.success) {
//           const data = res.data.data;
//           const googleKey = data.google_api_key?.startsWith("AIza") ? data.google_api_key : GOOGLE_KEY;
//           const barikoiKey = data.barikoi_api_key?.startsWith("bkoi_") ? data.barikoi_api_key : BARIKOI_KEY;
//           setApiKeys({ googleKey, barikoiKey, searchApi: data.search_api || "google", countryOfUse: data.country_of_use || null });
//           setMapType(data.maps_api ? data.maps_api.toLowerCase() : getMapType(data));
//         }
//       } catch (err) { console.error("Fetch API keys error:", err); setMapType("google"); }
//     };
//     fetchApiKeys();
//   }, []);

//   useEffect(() => {
//     const fetchPlots = async () => {
//       try { const res = await apiGetAllPlot({ page: 1, limit: 100 }); if (res.data?.success) setPlotsData(res.data.data?.data || res.data.data || []); } catch (err) { console.error("Fetch plotsData error:", err); }
//     };
//     const fetchListPlots = async () => {
//       try { const res = await apiGetPlot({ page: 1, perPage: 1000 }); if (res.data?.success) setListPlots(res.data.list?.data || []); } catch (err) { console.error("Fetch listPlots error:", err); }
//     };
//     fetchPlots(); fetchListPlots();
//   }, []);

//   useEffect(() => { socketRef.current = socket; }, [socket]);

//   const driverCounts = React.useMemo(() => ({
//     busy: onJobDrivers.length, idle: waitingDrivers.length, total: onJobDrivers.length + waitingDrivers.length,
//   }), [onJobDrivers, waitingDrivers]);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       const now = Date.now();
//       setWaitingDrivers((prev) => {
//         const filtered = prev.filter((d) => !d.updatedAt || now - d.updatedAt < 5 * 60 * 1000);
//         return filtered.length === prev.length ? prev : filtered;
//       });
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [setWaitingDrivers]);

//   const user = useAppSelector((state) => state.auth.user);
//   const displayName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : "Admin";

//   const fetchDashboardCards = useCallback(async () => {
//     try { const res = await getDashboardCards(); if (res.data?.success) setDashboardCounts(res.data.data); } catch (err) { console.error("Dashboard cards error:", err); }
//   }, []);

//   useEffect(() => { fetchDashboardCards(); }, [fetchDashboardCards]);

//   useEffect(() => {
//     if (!socket) return;

//     const handleDashboardUpdate = (data) => setDashboardCounts(data);
//     const handleNotificationRide = (rawData) => {
//       let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
//       showRideNotification(data);
//     };

//     const handleWaitingDriver = (rawData) => {
//       let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
//       if (Array.isArray(data)) { setWaitingDrivers(data.map(d => ({ ...d, updatedAt: Date.now() }))); return; }
//       if (data?.driverName || data?.driver_name) {
//         const name = data.driverName || data.driver_name;
//         const driverId = data.id || data.driver_id || data.dispatcher_id;
//         const sId = String(driverId);
//         if (sId) {
//           setDriverData(prev => {
//             let lat = data.latitude || data.lat, lng = data.longitude || data.lng;
//             if ((lat == null || lng == null) && (data.plot_id || data.plot)) {
//               const plot = plotsDataRef.current.find(p => p.id == (data.plot_id || data.plot) || p.plot_id == (data.plot_id || data.plot));
//               if (plot) { const coords = parseCoordinates(plot); if (coords.length > 0) { lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length; lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length; } }
//             }
//             const status = "idle";
//             const updated = prev[sId]
//               ? { ...prev, [sId]: { ...prev[sId], ...data, position: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : prev[sId].position, status, driving_status: status } }
//               : (lat && lng ? { ...prev, [sId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } } : prev);
//             saveToStorage(DRIVER_DATA_STORAGE_KEY, updated);
//             return updated;
//           });
//         }
//         // Driver back to idle → remove from on-job (also removes from localStorage via setOnJobDrivers)
//         setOnJobDrivers((prev) => prev.filter((d) => d.name !== name));
//         const obj = { id: driverId || Date.now(), name, plot: data.plot_name || data.plot || "N/A", rank: data.rank || 1, ...data };
//         setWaitingDrivers((prev) => {
//           const exists = prev.some((d) => d.name === obj.name);
//           const updatedObj = { ...obj, updatedAt: Date.now() };
//           return exists ? prev.map((d) => d.name === obj.name ? updatedObj : d) : [updatedObj, ...prev];
//         });
//       }
//     };

//     const handleOnJobDriver = (rawData) => {
//       let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
//       if (Array.isArray(data)) { setOnJobDrivers(data); return; }
//       if (data?.driverName || data?.driver_name) {
//         const name = data.driverName || data.driver_name;
//         const driverId = data.id || data.driver_id || data.dispatcher_id;
//         const sId = String(driverId);
//         if (sId) {
//           setDriverData(prev => {
//             let lat = data.latitude || data.lat, lng = data.longitude || data.lng;
//             if ((lat == null || lng == null) && (data.plot_id || data.plot)) {
//               const plot = plotsDataRef.current.find(p => p.id == (data.plot_id || data.plot) || p.plot_id == (data.plot_id || data.plot));
//               if (plot) { const coords = parseCoordinates(plot); if (coords.length > 0) { lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length; lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length; } }
//             }
//             const status = "busy";
//             const updated = prev[sId]
//               ? { ...prev, [sId]: { ...prev[sId], ...data, position: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : prev[sId].position, status, driving_status: status } }
//               : (lat && lng ? { ...prev, [sId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } } : prev);
//             saveToStorage(DRIVER_DATA_STORAGE_KEY, updated);
//             return updated;
//           });
//         }
//         setWaitingDrivers((prev) => prev.filter((d) => d.name !== name));
//         const obj = { id: driverId || Date.now(), name, ...data };
//         setOnJobDrivers((prev) => { const exists = prev.some((d) => d.name === obj.name); return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev]; });
//       }
//     };

//     const handleJobAccepted = (rawData) => {
//       let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
//       const driverName = data?.driver_name || data?.driverName;
//       if (driverName) {
//         setWaitingDrivers((prev) => prev.filter((d) => d.name !== driverName));
//         const obj = { id: Date.now(), name: driverName, ...data };
//         setOnJobDrivers((prev) => { const exists = prev.some((d) => d.name === obj.name); return exists ? prev.map((d) => d.name === obj.name ? obj : d) : [obj, ...prev]; });
//       }
//     };

//     const handleJobCancelled = (rawData) => {
//       let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
//       const driverName = data?.driver_name || data?.driverName;
//       if (driverName) setOnJobDrivers((prev) => prev.filter((d) => d.name !== driverName));
//       fetchDashboardCards();
//     };

//     const handleBookingCancelled = () => fetchDashboardCards();

//     const handleDriverLocationUpdate = (rawData) => {
//       const data = parseDriverData(rawData);
//       if (!data) return;
//       const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
//       if (!driverId) return;
//       const sId = String(driverId);
//       const now = Date.now();

//       // If socket explicitly says idle, remove from on-job + localStorage
//       if (data.driving_status === "idle") {
//         setOnJobDrivers((prev) => prev.filter(d => String(d.id || d.driver_id || d.dispatcher_id) !== sId));
//       }

//       setWaitingDrivers((prev) => {
//         const exists = prev.some((d) => String(d.id || d.driver_id || d.dispatcher_id) === sId);
//         if (exists) return prev.map((d) => String(d.id || d.driver_id || d.dispatcher_id) === sId ? { ...d, ...data, updatedAt: now } : d);
//         return prev;
//       });
//     };

//     const handleNearestDispatchFailed = (rawData) => {
//       let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
//       showRideNotification({ ...data, isFailedDispatch: true });
//     };

//     socket.on("dashboard-cards-update", handleDashboardUpdate);
//     socket.on("waiting-driver-event", handleWaitingDriver);
//     socket.on("on-job-driver-event", handleOnJobDriver);
//     socket.on("notification-ride", handleNotificationRide);
//     socket.on("nearest-dispatch-failed", handleNearestDispatchFailed);
//     socket.on("job-accepted-by-driver", handleJobAccepted);
//     socket.on("job-cancelled-by-driver", handleJobCancelled);
//     socket.on("driver-location-update", handleDriverLocationUpdate);
//     socket.on("booking-cancelled-event", handleBookingCancelled);
//     socket.on("booking-cancelled", handleBookingCancelled);
//     socket.on("cancel-booking-event", handleBookingCancelled);

//     return () => {
//       socket.off("dashboard-cards-update", handleDashboardUpdate);
//       socket.off("waiting-driver-event", handleWaitingDriver);
//       socket.off("on-job-driver-event", handleOnJobDriver);
//       socket.off("notification-ride", handleNotificationRide);
//       socket.off("nearest-dispatch-failed", handleNearestDispatchFailed);
//       socket.off("job-accepted-by-driver", handleJobAccepted);
//       socket.off("job-cancelled-by-driver", handleJobCancelled);
//       socket.off("driver-location-update", handleDriverLocationUpdate);
//       socket.off("booking-cancelled-event", handleBookingCancelled);
//       socket.off("booking-cancelled", handleBookingCancelled);
//       socket.off("cancel-booking-event", handleBookingCancelled);
//     };
//   }, [socket, fetchDashboardCards]);

//   useEffect(() => {
//     const handleOpenModal = () => { lockBodyScroll(); setIsBookingModelOpen({ isOpen: true, type: "new" }); };
//     window.addEventListener("openAddBookingModal", handleOpenModal);
//     return () => window.removeEventListener("openAddBookingModal", handleOpenModal);
//   }, []);

//   const mapProps = { mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData: allPlots, apiKeys, waitingDrivers, onJobDrivers };

//   return (
//     <div className="h-full">
//       <RideNotificationContainer />
//       <div className="px-5 pt-10 flex flex-col sm:flex-row sm:justify-between items-center sm:items-start gap-4 sm:gap-02 xl:mb-6 1.5xl:mb-10">
//         <div className="w-full sm:w-[calc(100%-240px)] flex justify-center sm:justify-start">
//           <div className="flex flex-col gap-2.5 text-center sm:text-left">
//             <PageTitle title="Dashboard overview" />
//             <PageSubTitle title={`Welcome back! ${displayName}, Here's what's happening with your transportation business today.`} />
//           </div>
//         </div>
//         <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full sm:w-auto">
//           <Button className="w-full sm:w-auto px-3 py-1.5 border border-[#1f41bb] rounded-full" onClick={() => { lockBodyScroll(); setIsMessageModelOpen({ isOpen: true, type: "new" }); }}>
//             <div className="flex gap-1 items-center justify-center whitespace-nowrap">
//               <span className="hidden sm:inline-block"><PlusIcon fill={"#1f41bb"} height={13} width={13} /></span>
//               <span className="sm:hidden"><PlusIcon height={8} width={8} /></span>
//               <span>Call Queue</span>
//             </div>
//           </Button>
//           <Button type="filled" btnSize="md" onClick={() => { lockBodyScroll(); setIsBookingModelOpen({ isOpen: true, type: "new" }); }} className="w-full sm:w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3">
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
//           {/* Map Panel */}
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
//             <div className="flex-1 rounded-xl overflow-hidden" style={{ minHeight: 0, position: "relative" }}>
//               {mapType === "barikoi" && apiKeys.barikoiKey && (
//                 <BarikoiMapSection key={`barikoi-${apiKeys.barikoiKey}-${apiKeys.countryOfUse}`} {...mapProps} />
//               )}
//               {mapType === "google" && apiKeys.googleKey && (
//                 <GoogleMapSection key={`google-${apiKeys.googleKey}-${apiKeys.countryOfUse}`} {...mapProps} />
//               )}
//               {!mapType && (
//                 <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
//                   <div className="text-gray-400 text-sm">Loading map…</div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Waiting Drivers */}
//           <div className="w-full lg:w-[20.5%] bg-orange-50 rounded-2xl shadow p-3 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200">
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
//                   <th className="text-right text-[11px]">Rank</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {waitingDrivers.length > 0 ? waitingDrivers.map((driver, i) => (
//                   <tr key={driver.id || driver.driver_id || i} className="border-t">
//                     <td className="py-1">{i + 1}</td>
//                     <td>{driver.name || driver.driver_name || "Unknown"}</td>
//                     <td>{driver.plot_name && driver.plot && driver.plot_name !== driver.plot.toString() ? `${driver.plot_name} (${driver.plot})` : (driver.plot_name || driver.plot || "N/A")}</td>
//                     <td className="text-right">{driver.rank || driver.ranking || i + 1}</td>
//                   </tr>
//                 )) : (
//                   <tr><td colSpan="4" className="text-center py-4 text-gray-500">No waiting drivers</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* On Jobs */}
//           <div className="w-full lg:w-[20.5%] bg-green-50 rounded-2xl shadow p-3 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200">
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
//                 {onJobDrivers.length > 0 ? onJobDrivers.map((driver, i) => (
//                   <tr key={driver.id || driver.driver_id || i} className="border-t">
//                     <td className="py-1">{i + 1}</td>
//                     <td>{driver.name || driver.driver_name || `Driver ${i + 1}`}</td>
//                   </tr>
//                 )) : (
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
//               <button key={card.filter} onClick={() => setActiveBookingFilter(card.filter)}
//                 className={`flex items-center justify-center gap-2 px-3 py-2.5 font-semibold text-white text-[11px] transition-colors ${isActive ? "bg-[#1F41BB]" : "bg-blue-500 hover:bg-blue-600"}`}
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