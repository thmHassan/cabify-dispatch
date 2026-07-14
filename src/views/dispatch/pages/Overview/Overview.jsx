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
  apiGetDispatchSystem,
} from "../../../../services/SettingsConfigurationServices";
import { MAP_PROVIDER_BARIKOI, MAP_PROVIDER_DEFAULT, MAP_PROVIDER_GOOGLE, createMapifyTransformRequest } from "../../../../services/mapConfigurationService";
import useMapConfiguration from "../../../../hooks/useMapConfiguration";
import { buildOsmFallbackStyle, loadMapLibreGl } from "../../../../utils/map/maplibreLoader";
import { destroySharedMapInstance } from "../../../../utils/functions/mapInstanceCleanup";
import {
  parsePlotCoordinates,
  renderGoogleMapPlots,
  scheduleMapLibrePlotRender,
} from "../../../../utils/functions/plotMapGeometry";
import AppLogoLoader from "../../../../components/shared/AppLogoLoader/AppLogoLoader";
import CompanyTimezoneClock from "../../../../components/shared/CompanyTimezoneClock/CompanyTimezoneClock";
import { getBookings, getDashboardCards, apiGetAllPlot, apiUpdateDriverRank, getDriverStateSnapshot } from "../../../../services/AddBookingServices";
import { apiLogoutDriver, apiGetDriverManagement } from "../../../../services/DriverManagementService";
import toast from "react-hot-toast";
import { apiGetBackupPlot, apiGetPlot } from "../../../../services/PlotService";
import CallQueueModel from "./components/CallQueueModel/CallQueueModel";
import SendDriverMessageModal from "./components/SendDriverMessageModal";
import RedCarIcon from "../../../../components/svg/RedCarIcon";
import GreenCarIcon from "../../../../components/svg/GreenCarIcon";
import AppLogoIcon from "../../../../components/svg/AppLogoIcon";
import { renderToString } from "react-dom/server";
import { formatCurrency } from "../../../../utils/functions/formatters";
import { sanitizeNearestDispatchMessage } from "../../../../utils/notifications/nearestDispatchMessages";
import { sanitizePlotDispatchMessage } from "../../../../utils/notifications/plotDispatchMessages";
import {
    PLOT_DISPATCH_SOCKET_EVENTS,
    parsePlotDispatchPayload,
} from "../../../../utils/plotDispatch/plotDispatchStatus";
import { usePausableAutoDismiss } from "../../../../hooks/usePausableAutoDismiss";
import {
  dispatchSystemListHasNearestDriver,
  dispatchSystemListHasManualOnly,
  dispatchSystemListHasPlotBased,
} from "../../../../utils/functions/dispatchSystem";
import {
  clearLegacyOverviewDriverStorage,
  getTenantScopedStorageKey,
  getTenantId,
} from "../../../../utils/functions/tokenEncryption";

const ON_JOB_STORAGE_BASE = "onJobDrivers_persistent";
const DRIVER_DATA_STORAGE_BASE = "driverData_persistent";
const WAITING_DRIVERS_STORAGE_BASE = "waitingDrivers_persistent";
const ACTIVE_BOOKING_FILTER_STORAGE_BASE = "overviewActiveBookingFilter";

const getOnJobStorageKey = () => getTenantScopedStorageKey(ON_JOB_STORAGE_BASE);
const getDriverDataStorageKey = () => getTenantScopedStorageKey(DRIVER_DATA_STORAGE_BASE);
const getWaitingDriversStorageKey = () => getTenantScopedStorageKey(WAITING_DRIVERS_STORAGE_BASE);
const getActiveBookingFilterStorageKey = () => getTenantScopedStorageKey(ACTIVE_BOOKING_FILTER_STORAGE_BASE);

const getPayloadDatabase = (payload) => {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  return data?.database || data?.tenant || data?.tenant_id || data?.db || data?.client_id || null;
};

const normalizeTenantId = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized ? normalized.replace(/^tenant[-_]*/i, "") : null;
};

const isCurrentTenantPayload = (payload) => {
  const payloadDatabase = getPayloadDatabase(payload);
  const tenantId = normalizeTenantId(getTenantId());
  const payloadTenant = normalizeTenantId(payloadDatabase);
  return !payloadTenant || !tenantId || payloadTenant === tenantId;
};

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

const getDriverKey = (driver) =>
  String(driver?.id || driver?.driver_id || driver?.dispatcher_id || driver?.client_id || "");

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

const shouldHidePlotAndRank = (items) =>
  dispatchSystemListHasNearestDriver(items) || dispatchSystemListHasManualOnly(items);

const isPlotBasedDispatchEnabled = (items) => dispatchSystemListHasPlotBased(items);

const normalizePlotList = (response) => {
  const payload = response?.data;
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.data)) return payload.data.data;
  if (Array.isArray(payload.list)) return payload.list;
  if (Array.isArray(payload.list?.data)) return payload.list.data;
  return [];
};

const isPlotApiSuccess = (response) =>
  response?.data?.success === 1 || response?.data?.success === true;

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

const dedupeWaitingDrivers = (drivers) => {
  const byDriver = new Map();
  const withoutKey = [];

  (drivers || []).forEach((driver) => {
    const key = getDriverKey(driver);
    if (!key) {
      withoutKey.push(driver);
      return;
    }

    const existing = byDriver.get(key);
    if (!existing) {
      byDriver.set(key, driver);
      return;
    }

    const existingIsReconnect = existing.is_reconnecting === true;
    const nextIsReconnect = driver.is_reconnecting === true;
    const shouldPreferNext =
      (existingIsReconnect && !nextIsReconnect)
      || Number(driver.updatedAt || 0) >= Number(existing.updatedAt || 0);

    byDriver.set(key, shouldPreferNext
      ? { ...existing, ...driver }
      : { ...driver, ...existing }
    );
  });

  return [...byDriver.values(), ...withoutKey];
};

const sortWaitingDrivers = (drivers) =>
  dedupeWaitingDrivers(drivers).sort((a, b) => {
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
  const onlineStatus = (driver?.online_status || "").toLowerCase();
  return (
    drivingStatus !== "busy"
    && status !== "busy"
    && status !== "active"
    && onlineStatus !== "offline"
    && onlineStatus !== "reconnecting"
    && driver?.is_reconnecting !== true
  );
};

const formatWaitingDriverFromSocket = (d) => {
  const formatted = {
    ...d,
    id: d.driver_id || d.id,
    name: d.driver_name || d.name || d.driverName,
    plot_id: d.plot_id ?? d.plot,
    plot: d.plot_name || d.plot || "N/A",
    rank: d.rank || d.ranking || 1,
    online_status: String(d?.online_status || "online").toLowerCase(),
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
  const incomingKeys = new Set((incomingDrivers || []).map(getDriverKey).filter(Boolean));
  const others = prev.filter((d) =>
    String(getDriverPlotId(d) ?? "") !== plotKey && !incomingKeys.has(getDriverKey(d))
  );
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

const ON_JOB_BOOKING_STATUSES = new Set(["started", "ongoing"]);

const isOnJobBookingStatus = (status) =>
  ON_JOB_BOOKING_STATUSES.has(String(status || "").toLowerCase());

const isNearestDispatchAcceptAction = (action) =>
  /nearest dispatch.*accepted by/i.test(String(action || ""));

const isPlotDispatchAcceptAction = (action) =>
  /plot[- ]based dispatch.*accepted by/i.test(String(action || ""));

const shouldRemoveDriverFromOnJob = (status) =>
  ["completed", "cancelled", "no_show"].includes(String(status || "").toLowerCase());

const buildOnJobDriverFromBooking = (booking) => {
  if (!booking) return null;

  const driverId = booking.driver || booking.driver_id || booking.driverDetail?.id;
  if (!driverId) return null;

  const name =
    booking.driverDetail?.name ||
    booking.driver_detail?.name ||
    booking.driver_name ||
    booking.driverName ||
    "Driver details loading";

  return {
    ...booking.driverDetail,
    id: driverId,
    driver_id: driverId,
    name,
    driver_name: name,
    driving_status: "busy",
    status: "busy",
    booking_id: booking.id,
    booking_status: booking.booking_status,
    updatedAt: Date.now(),
  };
};

const buildOnJobDriverFromPayload = (data) => {
  if (!data) return null;

  if (data.booking_status != null && (data.driver != null || data.driver_id != null)) {
    return buildOnJobDriverFromBooking(data);
  }

  const driverId =
    data.driver_id ||
    data.driverId ||
    data.dispatcher_id ||
    data.driver?.id ||
    data.driver?.driver_id ||
    data.id;

  if (!driverId) return null;

  const name =
    data.driver_name ||
    data.driverName ||
    data.name ||
    data.driver?.name ||
    "Driver details loading";

  return {
    ...data,
    id: driverId,
    driver_id: driverId,
    name,
    driver_name: name,
    driving_status: "busy",
    status: "busy",
    updatedAt: Date.now(),
  };
};

const upsertOnJobDriver = (prev, driver) => {
  const key = getDriverKey(driver);
  if (!key) return prev;
  const exists = prev.some((d) => getDriverKey(d) === key);
  if (exists) {
    return prev.map((d) => (getDriverKey(d) === key ? { ...d, ...driver, updatedAt: Date.now() } : d));
  }
  return [driver, ...prev];
};

const mergeOnJobDrivers = (prev, drivers) => {
  let next = [...prev];
  drivers.forEach((driver) => {
    next = upsertOnJobDriver(next, driver);
  });
  return next;
};

const applyOnJobDriverToMap = (prev, driver, plots) => {
  const driverKey = getDriverKey(driver);
  if (!driverKey) return prev;

  let lat = driver.latitude ?? driver.lat;
  let lng = driver.longitude ?? driver.lng;

  if ((lat == null || lng == null) && (driver.plot_id || driver.plot)) {
    const plot = plots.find(
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

  const updated = {
    ...prev,
    [driverKey]: {
      ...prev[driverKey],
      ...driver,
      ...(lat != null && lng != null ? { position: { lat: Number(lat), lng: Number(lng) } } : {}),
      status: "busy",
      driving_status: "busy",
      online_status: "online",
    },
  };
  saveToStorage(getDriverDataStorageKey(), updated);
  return updated;
};

const removeDriverFromDriverData = (prev, driverKey) => {
  if (!prev[driverKey]) return prev;
  const updated = { ...prev };
  delete updated[driverKey];
  saveToStorage(getDriverDataStorageKey(), updated);
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
  saveToStorage(getDriverDataStorageKey(), updated);
  return updated;
};

const notifListeners = new Set();
const showRideNotification = (data) => notifListeners.forEach((fn) => fn(data));

const normalizeRideNotificationData = (data = {}) => {
  const booking = data.booking && typeof data.booking === "object" ? data.booking : {};
  return {
    ...booking,
    ...data,
    booking,
    booking_id:
      data.booking_id ||
      data.bookingId ||
      data.booking_reference ||
      booking.booking_id ||
      booking.id ||
      data.id,
    pickup_location: data.pickup_location || booking.pickup_location || "",
    destination_location: data.destination_location || booking.destination_location || "",
    pickup_point: data.pickup_point || booking.pickup_point || "",
    destination_point: data.destination_point || booking.destination_point || "",
    offered_amount: data.offered_amount ?? booking.offered_amount ?? booking.booking_amount,
    payment_method: data.payment_method || booking.payment_method,
    ride_type: data.ride_type || booking.booking_type,
  };
};

const getRideNotificationKey = (data = {}) => {
  const normalized = normalizeRideNotificationData(data);
  const bookingId = normalized.booking_id || normalized.id;
  if (!bookingId) return null;

  const eventType = normalized.isFailedDispatch
    ? normalized.isPlotDispatchFailure
      ? "plot-dispatch-failed"
      : "dispatch-failed"
    : normalized.booking_status || normalized.status || "ride-request";

  return [
    normalized.database || normalized.booking?.database || getTenantId() || "tenant",
    eventType,
    bookingId,
  ].join(":");
};

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

const AUTO_DISMISS_MS = 8000;

const RideCard = ({ data, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const progressRef = useRef(null);
  const handleDismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(onClose, 350);
  }, [onClose]);
  const { pause, resume } = usePausableAutoDismiss(handleDismiss, AUTO_DISMISS_MS);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => handleDismiss();

  const handleMouseEnter = () => {
    pause();
    if (progressRef.current) progressRef.current.style.animationPlayState = "paused";
  };

  const handleMouseLeave = () => {
    resume();
    if (progressRef.current) progressRef.current.style.animationPlayState = "running";
  };

  return (
    <>
      <style>{`
        @keyframes rideNotifShrink { from { width: 100%; } to { width: 0%; } }
        @keyframes rideNotifPulse { 0%,100%{box-shadow:0 0 0 0 rgba(31,65,187,0.25);} 50%{box-shadow:0 0 0 6px rgba(31,65,187,0);} }
      `}</style>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(110%) scale(0.95)", opacity: visible && !leaving ? 1 : 0, transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.35s ease", background: "#ffffff", borderRadius: "16px", boxShadow: "0 12px 40px rgba(31,65,187,0.18), 0 2px 12px rgba(0,0,0,0.08)", border: "1.5px solid #e0e7ff", width: "320px", overflow: "hidden", marginBottom: "12px", fontFamily: "'Segoe UI', system-ui, sans-serif", animation: "rideNotifPulse 2s ease-in-out 3" }}
      >
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
          <div ref={progressRef} style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "linear-gradient(90deg, #1F41BB, #60a5fa)", animation: `rideNotifShrink ${AUTO_DISMISS_MS}ms linear forwards` }} />
        </div>
      </div>
    </>
  );
};

const DispatchFailedCard = ({ data, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const progressRef = useRef(null);
  const handleDismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(onClose, 350);
  }, [onClose]);
  const { pause, resume } = usePausableAutoDismiss(handleDismiss, AUTO_DISMISS_MS);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => handleDismiss();
  
  const pickup = data.pickup_location || (data.pickup_point ? formatCoord(data.pickup_point) : "");
  const destination = data.destination_location || (data.destination_point ? formatCoord(data.destination_point) : "");
  const isPlotFailure = data.isPlotDispatchFailure || /plot/i.test(data.message || data.reason || "");
  const reason = sanitizeNearestDispatchMessage(
    isPlotFailure
      ? sanitizePlotDispatchMessage(data.message || data.reason)
      : (data.message || data.reason || data.cancel_reason || "No driver accepted the request or no active drivers found.")
  );

  const handleMouseEnter = () => {
    pause();
    if (progressRef.current) progressRef.current.style.animationPlayState = "paused";
  };

  const handleMouseLeave = () => {
    resume();
    if (progressRef.current) progressRef.current.style.animationPlayState = "running";
  };

  return (
    <>
      <style>{`
        @keyframes dispatchNotifShrink { from { width: 100%; } to { width: 0%; } }
        @keyframes dispatchNotifPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.25);} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0);} }
      `}</style>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(110%) scale(0.95)", opacity: visible && !leaving ? 1 : 0, transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.35s ease", background: "#ffffff", borderRadius: "16px", boxShadow: "0 12px 40px rgba(239,68,68,0.18), 0 2px 12px rgba(0,0,0,0.08)", border: "1.5px solid #fee2e2", width: "320px", overflow: "hidden", marginBottom: "12px", fontFamily: "'Segoe UI', system-ui, sans-serif", animation: "dispatchNotifPulse 2s ease-in-out 3" }}
      >
        <div style={{ background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>
                {isPlotFailure ? "Plot Dispatch Failed" : "Nearest Dispatch Failed"}
              </div>
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
          <div ref={progressRef} style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "linear-gradient(90deg, #dc2626, #f87171)", animation: `dispatchNotifShrink ${AUTO_DISMISS_MS}ms linear forwards` }} />
        </div>
      </div>
    </>
  );
};

const RideNotificationContainer = () => {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    const handler = (data) => {
      const normalizedData = normalizeRideNotificationData(data);
      const id = getRideNotificationKey(normalizedData) || `${Date.now()}-${Math.random()}`;
      setNotifications((prev) => {
        const existingIndex = prev.findIndex((notification) => notification.id === id);
        if (existingIndex === -1) {
          return [...prev, { id, data: normalizedData, createdAt: Date.now() }];
        }
        const next = [...prev];
        next[existingIndex] = {
          id,
          createdAt: next[existingIndex].createdAt || Date.now(),
          data: {
            ...next[existingIndex].data,
            ...normalizedData,
          },
        };
        return next;
      });
    };
    notifListeners.add(handler);
    return () => notifListeners.delete(handler);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      const expiryCutoff = Date.now() - (AUTO_DISMISS_MS + 1200);
      setNotifications((prev) => prev.filter((notification) => (
        (notification.createdAt || Date.now()) > expiryCutoff
      )));
    }, 1000);
    return () => clearInterval(interval);
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
  { label: "PENDING", filter: "pending", countKey: "pending", icon: TodayBookingIcon },
  { label: "ONGOING", filter: "ongoing", countKey: "ongoing", icon: TodayBookingIcon },
  { label: "RECENT JOBS", filter: "recent_jobs", countKey: "recentJobs", icon: TodayBookingIcon },
  { label: "COMPLETED", filter: "completed", countKey: "completed", icon: TodayBookingIcon },
  { label: "NO SHOW", filter: "no_show", countKey: "noShow", icon: NoShowIcon },
  { label: "CANCELLED", filter: "cancelled", countKey: "cancelled", icon: CancelledIcon },
];

const OVERVIEW_BOOKING_FILTERS = new Set(CARD_CONFIG.map((card) => card.filter));

const loadActiveBookingFilter = () => {
  try {
    const stored = localStorage.getItem(getActiveBookingFilterStorageKey());
    return OVERVIEW_BOOKING_FILTERS.has(stored) ? stored : "todays_booking";
  } catch {
    return "todays_booking";
  }
};

const getMapType = (data) => {
  if (!data) return "google";
  const mapsApi = data?.maps_api?.trim().toLowerCase();
  const countryOfUse = data?.country_of_use?.trim().toUpperCase();
  if (mapsApi === "default") return "default";
  if (mapsApi === "barikoi") return "barikoi";
  if (mapsApi === "google") return "google";
  if (countryOfUse === "BD") return "barikoi";
  return "google";
};

const getApiKeys = (stateApiKeys) => ({
  googleKey: stateApiKeys?.googleKey || null,
  mapifyStyle: stateApiKeys?.mapifyStyle || null,
  barikoiStyle: stateApiKeys?.barikoiStyle || null,
  barikoiKey: stateApiKeys?.barikoiKey || null,
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

const parseCoordinates = parsePlotCoordinates;

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

const buildPopupHTML = (data, { hidePlotAndRank = false } = {}) => {
  const name = data.name || data.driver_name || data.driverName || "Driver details loading";
  const phone = data.phone_no || data.driver_phone || data.phone || "N/A";
  const plate = data.plate_no || data.plate || "N/A";
  const vehicleName = data.vehicle_name || data.vehicleTypeName || data.vehicle_type_name || "No vehicle details";
  const vehicleType = data.vehicle_type || data.vehicle_service || data.vehicle_type_service || data.assigned_vehicle || "";
  const plotLabel = getDriverPlotLabel(data);
  const rank = data.rank || data.ranking || "-";
  const status = (data.driving_status || data.status || "idle").toLowerCase();
  const statusLabel = data.is_reconnecting ? "Reconnecting" : status.charAt(0).toUpperCase() + status.slice(1);
  const statusColor = status === "busy" ? "#10b981" : "#ef4444";
  const plotRankLine = hidePlotAndRank
    ? ""
    : `<div style="color:#4b5563;font-size:12px;margin-bottom:6px;"><strong>Plot:</strong> ${plotLabel} &nbsp; <strong>Rank:</strong> ${rank}</div>`;
  return `<div style="font-family:'Inter',sans-serif;min-width:190px;padding:4px 6px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#4b5563;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span style="font-weight:700;color:#111827;font-size:15px;">${name}</span></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="color:#4b5563;font-size:13px;">${phone}</span></div>${plotRankLine}<div style="color:#4b5563;font-size:12px;margin-bottom:6px;"><strong>Vehicle:</strong> ${vehicleName}${vehicleType ? ` (${vehicleType})` : ""}</div><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><span style="background:#f9fafb;color:#374151;font-weight:600;font-size:12px;padding:1px 6px;border-radius:4px;border:1px solid #e5e7eb;">${plate}</span></div><div style="display:flex;align-items:center;gap:6px;border-top:1px solid #f3f4f6;padding-top:8px;"><span style="height:7px;width:7px;background-color:${statusColor};border-radius:50%;display:inline-block;"></span><span style="color:${statusColor};font-weight:700;font-size:12px;text-transform:capitalize;border:1px solid ${statusColor}40;padding:1px 8px;border-radius:20px;background:${statusColor}10;">${statusLabel}</span></div></div>`;
};

const GoogleMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers, mapType, hidePlotAndRank }) => {
  const { googleKey } = getApiKeys(apiKeys);
  const [isMapReady, setIsMapReady] = useState(false);
  const plotPolygons = useRef([]);
  const plotsDataRef = useRef(plotsData);

  useEffect(() => {
    plotsDataRef.current = plotsData;
  }, [plotsData]);

  const renderPlots = () => {
    if (!mapInstance.current) return;
    plotPolygons.current = renderGoogleMapPlots(
      mapInstance.current,
      plotsDataRef.current,
      plotPolygons.current
    );
  };

  useEffect(() => {
    if (isMapReady) renderPlots();
  }, [isMapReady, plotsData]);

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
      plotPolygons.current = renderGoogleMapPlots(
        mapInstance.current,
        plotsDataRef.current,
        plotPolygons.current
      );
    }).catch((err) => console.error("Google Map load failed:", err));
    return () => {
      mounted = false;
      setIsMapReady(false);
      destroySharedMapInstance(mapInstance, markers, mapRef, { isGoogle: true });
    };
  }, [mapType]);

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
      const name = data?.name || data?.driverName || data?.driver_name || "Driver details loading";
      const infoContent = buildPopupHTML({ ...data, driving_status: validStatus }, { hidePlotAndRank });

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
        saveToStorage(getDriverDataStorageKey(), updated); // persist location update
        return updated;
      });
      if (activeIds.has(id)) renderMarker(id, data);
    };

    if (socketRef.current) socketRef.current.on("driver-location-update", handle);
    return () => { if (socketRef.current) socketRef.current.off("driver-location-update", handle); };
  }, [isMapReady, waitingDrivers, onJobDrivers, hidePlotAndRank]);

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

const DefaultMapSection = ({ mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData, apiKeys, waitingDrivers, onJobDrivers, mapType, hidePlotAndRank }) => {
  const [mapReady, setMapReady] = useState(false);
  const { mapifyStyle, barikoiStyle } = getApiKeys(apiKeys);
  const mapStyle = mapifyStyle || barikoiStyle;
  const plotsDataRef = useRef(plotsData);

  useEffect(() => {
    plotsDataRef.current = plotsData;
    if (mapReady && mapInstance.current) {
      scheduleMapLibrePlotRender(mapInstance.current, plotsDataRef.current);
    }
  }, [plotsData, mapReady]);

  useEffect(() => {
    if (!mapStyle) return;
    let mounted = true;
    const init = async () => {
      try { await loadMapLibreGl(); } catch (err) { console.error("MapLibre load failed:", err); return; }
      if (!mounted || !mapRef.current || mapInstance.current) return;
      const container = mapRef.current;
      container.style.width = "100%"; container.style.height = "100%"; container.style.minHeight = "400px"; container.style.position = "relative";
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
            attributionControl: false,
            fadeDuration: 0,
            transformRequest: createMapifyTransformRequest(),
          });
          map.addControl(new window.maplibregl.NavigationControl(), "top-right");
          map.on("load", () => {
            if (!mounted) return;
            map.resize();
            scheduleMapLibrePlotRender(map, plotsDataRef.current);
            setTimeout(() => {
              if (mounted && map) {
                map.resize();
                setMapReady(true);
                scheduleMapLibrePlotRender(map, plotsDataRef.current);
              }
            }, 150);
          });
          map.on("style.load", () => {
            scheduleMapLibrePlotRender(map, plotsDataRef.current);
          });
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
            const map = new window.maplibregl.Map({ container, style: buildOsmFallbackStyle(), center: [countryCenter.lng, countryCenter.lat], zoom: 8, attributionControl: false });
            map.on("load", () => {
              map.resize();
              scheduleMapLibrePlotRender(map, plotsDataRef.current);
              setMapReady(true);
            });
            map.on("style.load", () => {
              scheduleMapLibrePlotRender(map, plotsDataRef.current);
            });
            mapInstance.current = map;
          } catch { }
        }
      };
      initMap(mapStyle);
    };
    init();
    return () => {
      mounted = false;
      if (mapInstance.current) {
        try { Object.values(markers.current).forEach((m) => { try { m.remove(); } catch { } }); markers.current = {}; mapInstance.current.remove(); } catch { }
        mapInstance.current = null;
      }
    };
  }, [mapType]);

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
      const name = data.name || data.driverName || data.driver_name || "Driver details loading";
      const popupHTML = buildPopupHTML({ ...data, driving_status: validStatus }, { hidePlotAndRank });

      setDriverData((prev) => {
        const updated = { ...prev, [driverId]: { ...data, position: { lat, lng }, status: validStatus, driving_status: validStatus, name } };
        saveToStorage(getDriverDataStorageKey(), updated); // persist
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
  }, [mapReady, waitingDrivers, onJobDrivers, hidePlotAndRank]);

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

  return (
    <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px", position: "relative" }}>
      {mapReady && (
        <div style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 10,
          display: "flex",
          background: "#fff",
          borderRadius: "2px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}>
          <div style={{
            background: "#fff",
            border: "none",
            fontSize: "11px",
            fontFamily: "Roboto,Arial,sans-serif",
            fontWeight: "500",
            color: "#1a73e8",
            borderBottom: "2px solid #1a73e8",
            padding: "6px 12px",
            lineHeight: "1",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            <AppLogoIcon width={14} height={14} />
            Mapifyit
          </div>
        </div>
      )}
    </div>
  );
};

const usePersistedOnJobDrivers = () => {
  const [onJobDrivers, setRaw] = useState(() => {
    try { localStorage.removeItem(getOnJobStorageKey()); } catch { }
    return [];
  });
  const setOnJobDrivers = useCallback((updater) => {
    setRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveToStorage(getOnJobStorageKey(), next);
      return next;
    });
  }, []);
  return [onJobDrivers, setOnJobDrivers];
};

const usePersistedDriverData = () => {
  const [driverData, setRaw] = useState(() => {
    try { localStorage.removeItem(getDriverDataStorageKey()); } catch { }
    return {};
  });
  const setDriverData = useCallback((updater) => {
    setRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  }, []);
  return [driverData, setDriverData];
};

const usePersistedWaitingDrivers = () => {
  const [waitingDrivers, setRaw] = useState(() => {
    try { localStorage.removeItem(getWaitingDriversStorageKey()); } catch { }
    return [];
  });
  const setWaitingDrivers = useCallback((updater) => {
    setRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return sortWaitingDrivers(Array.isArray(next) ? next : []);
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
  const [activeBookingFilter, setActiveBookingFilter] = useState(loadActiveBookingFilter);
  const [seedBookings, setSeedBookings] = useState([]);
  const {
    mapType,
    mapError,
    mapConfigLoading,
    apiKeys,
    tenantScope,
  } = useMapConfiguration();
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

  const [dashboardCounts, setDashboardCounts] = useState({
    todaysBooking: 0,
    preBookings: 0,
    pending: 0,
    ongoing: 0,
    recentJobs: 0,
    completed: 0,
    noShow: 0,
    cancelled: 0,
  });

  const [driverData, setDriverData] = usePersistedDriverData();
  const [onJobDrivers, setOnJobDrivers] = usePersistedOnJobDrivers();
  const onJobDriversRef = useRef(onJobDrivers);
  useEffect(() => { onJobDriversRef.current = onJobDrivers; }, [onJobDrivers]);
  const [waitingDrivers, setWaitingDrivers] = usePersistedWaitingDrivers();
  const visibleWaitingDrivers = React.useMemo(
    () => sortWaitingDrivers(waitingDrivers),
    [waitingDrivers]
  );
  const waitingDriversRef = useRef(waitingDrivers);
  useEffect(() => { waitingDriversRef.current = waitingDrivers; }, [waitingDrivers]);
  const activeDriverIdsRef = useRef(null);
  const removedDriverIdsRef = useRef(new Set());
  const [editingRanks, setEditingRanks] = useState({});
  const [updatingRankId, setUpdatingRankId] = useState(null);
  const [loggingOutDriverId, setLoggingOutDriverId] = useState(null);
  const [hidePlotAndRank, setHidePlotAndRank] = useState(false);
  const [plotBasedDispatchEnabled, setPlotBasedDispatchEnabled] = useState(false);
  const [dispatchSystemLoaded, setDispatchSystemLoaded] = useState(false);
  const nearestDriverDispatchEnabledRef = useRef(false);
  const plotBasedDispatchEnabledRef = useRef(false);
  useEffect(() => {
    clearLegacyOverviewDriverStorage();
  }, []);

  useEffect(() => {
    nearestDriverDispatchEnabledRef.current = hidePlotAndRank;
    plotBasedDispatchEnabledRef.current = plotBasedDispatchEnabled;
  }, [hidePlotAndRank, plotBasedDispatchEnabled]);

  const setAuthoritativeActiveDriverIds = useCallback((drivers) => {
    const next = new Set((drivers || []).map((driver) => getDriverKey(driver)).filter(Boolean));
    activeDriverIdsRef.current = next;
    next.forEach((id) => removedDriverIdsRef.current.delete(id));
    return next;
  }, []);

  const markDriverRemoved = useCallback((driverId) => {
    const key = String(driverId || "");
    if (!key) return;
    removedDriverIdsRef.current.add(key);
    if (activeDriverIdsRef.current) {
      activeDriverIdsRef.current.delete(key);
    }
  }, []);

  const shouldAcceptDriverSocketEvent = useCallback((driverId) => {
    const key = String(driverId || "");
    if (!key) return false;
    if (removedDriverIdsRef.current.has(key)) return false;
    if (!activeDriverIdsRef.current) return true;
    return activeDriverIdsRef.current.has(key);
  }, []);

  useEffect(() => {
    const fetchDispatchSystem = async () => {
      try {
        const response = await apiGetDispatchSystem();
        const data = normalizeDispatchSystemList(response);
        setHidePlotAndRank(shouldHidePlotAndRank(data));
        setPlotBasedDispatchEnabled(isPlotBasedDispatchEnabled(data));
      } catch {
        setHidePlotAndRank(false);
        setPlotBasedDispatchEnabled(false);
      } finally {
        setDispatchSystemLoaded(true);
      }
    };
    fetchDispatchSystem();
  }, []);

  useEffect(() => {
    if (!dispatchSystemLoaded) return;

    const fetchPlots = async () => {
      if (plotBasedDispatchEnabled) {
        try {
          const res = await apiGetBackupPlot({ page: 1, perPage: 1000 });
          if (isPlotApiSuccess(res)) {
            setPlotsData(normalizePlotList(res));
            setListPlots([]);
          }
        } catch (err) {
          console.error("Fetch backup plots error:", err);
        }
        return;
      }

      try {
        const res = await apiGetAllPlot({ page: 1, limit: 100 });
        if (isPlotApiSuccess(res)) setPlotsData(res.data.data?.data || res.data.data || []);
      } catch (err) {
        console.error("Fetch plotsData error:", err);
      }

      try {
        const res = await apiGetPlot({ page: 1, perPage: 1000 });
        if (isPlotApiSuccess(res)) setListPlots(res.data.list?.data || []);
      } catch (err) {
        console.error("Fetch listPlots error:", err);
      }
    };

    fetchPlots();
  }, [dispatchSystemLoaded, plotBasedDispatchEnabled]);

  useEffect(() => { socketRef.current = socket; }, [socket]);

  // Plot-queue backend: not needed for online drivers waiting list
  // useEffect(() => {
  //   if (!socket || !isSocketConnected) return;
  //   const tenantId = getTenantId();
  //   if (!tenantId) return;
  //   socket.emit("get-my-rank", { database: tenantId });
  // }, [socket, isSocketConnected]);

  const driverCounts = React.useMemo(() => ({
    busy: onJobDrivers.length,
    idle: visibleWaitingDrivers.length,
    total: onJobDrivers.length + visibleWaitingDrivers.length,
  }), [onJobDrivers, visibleWaitingDrivers]);

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
    try {
      const [cardsRes, todaysRes, preBookingsRes, pendingRes, ongoingRes] = await Promise.all([
        getDashboardCards(),
        getBookings({ filter: "todays_booking", page: 1, limit: 1 }),
        getBookings({ filter: "pre_bookings", page: 1, limit: 1 }),
        getBookings({ filter: "pending", page: 1, limit: 1 }),
        getBookings({ filter: "ongoing", page: 1, limit: 1 }),
      ]);

      if (cardsRes?.data?.success) {
        setDashboardCounts({
          ...cardsRes.data.data,
          todaysBooking: todaysRes?.data?.pagination?.total ?? cardsRes?.data?.data?.todaysBooking ?? 0,
          preBookings: preBookingsRes?.data?.pagination?.total ?? cardsRes?.data?.data?.preBookings ?? 0,
          pending: pendingRes?.data?.pagination?.total ?? cardsRes?.data?.data?.pending ?? 0,
          ongoing: ongoingRes?.data?.pagination?.total ?? cardsRes?.data?.data?.ongoing ?? 0,
        });
      }
    } catch (err) {
      console.error("Dashboard cards error:", err);
    }
  }, []);

  useEffect(() => { fetchDashboardCards(); }, [fetchDashboardCards]);

  useEffect(() => {
    fetchDashboardCards();
  }, [activeBookingFilter, fetchDashboardCards]);

  useEffect(() => {
    try {
      localStorage.setItem(getActiveBookingFilterStorageKey(), activeBookingFilter);
    } catch {
      // Tab persistence is best-effort only.
    }
  }, [activeBookingFilter]);

  const handleBookingCreated = useCallback((meta) => {
    const createdBookings = Array.isArray(meta?.createdBookings) ? meta.createdBookings.filter(Boolean) : [];
    const createdCount = createdBookings.length || (Number(meta?.createdCount) || 0);
    const isUnreleasedScheduledBooking = (booking) => {
      const isReleased =
        booking?.dispatch_released === true ||
        booking?.dispatch_released === 1 ||
        booking?.dispatch_released === "1";
      if (isReleased) return false;

      return (
        booking?.pickup_time_type === "time"
        || booking?.pre_booking === true
        || booking?.pre_booking === 1
        || booking?.pre_booking === "1"
        || booking?.is_scheduled === true
        || booking?.is_scheduled === 1
        || booking?.is_scheduled === "1"
      );
    };
    const scheduledCount = createdBookings.filter(isUnreleasedScheduledBooking).length;
    const todaysCount = Math.max(createdCount - scheduledCount, 0);

    setRefreshTrigger((prev) => prev + 1);
    if (createdCount > 0 && !meta?.isEdit) {
      setDashboardCounts((prev) => ({
        ...prev,
        todaysBooking: Math.max((prev?.todaysBooking ?? 0) + todaysCount, 0),
        preBookings: Math.max((prev?.preBookings ?? 0) + scheduledCount, 0),
        recentJobs: Math.max((prev?.recentJobs ?? 0) + createdCount, 0),
      }));
    }
    fetchDashboardCards();

    if (meta?.isEdit) {
      return;
    }

    if (createdBookings.length) {
      setSeedBookings(createdBookings);
    }

    const hasUnreleasedScheduledBooking = createdBookings.some(isUnreleasedScheduledBooking);

    if (hasUnreleasedScheduledBooking || ((meta?.isScheduled || meta?.pickupTimeType === "time") && !createdBookings.length)) {
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
      try {
        const snapshotResponse = await getDriverStateSnapshot();
        if (snapshotResponse?.data?.success) {
          const snapshot = snapshotResponse.data.data || {};
          const normalizeSnapshotDriver = (driver) => {
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

            return lat != null && lng != null
              ? { ...formatted, position: { lat: Number(lat), lng: Number(lng) } }
              : formatted;
          };

          const idle = (snapshot.waiting || []).map(normalizeSnapshotDriver).filter(isWaitingListDriver);
          const busy = (snapshot.onJob || []).map(normalizeSnapshotDriver);
          const rankedIdle = sortWaitingDrivers(idle);

          setWaitingDrivers(rankedIdle);
          setOnJobDrivers(busy);

          const activeIds = setAuthoritativeActiveDriverIds([...rankedIdle, ...busy]);
          setDriverData((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((id) => {
              if (!activeIds.has(id)) delete updated[id];
            });
            [...rankedIdle, ...busy].forEach((driver) => {
              const driverId = getDriverKey(driver);
              if (!driverId) return;
              const isBusy = (driver.driving_status || driver.status || "").toLowerCase() === "busy";
              updated[driverId] = {
                ...updated[driverId],
                ...driver,
                ...(driver.position ? { position: driver.position } : {}),
                status: isBusy ? "busy" : "idle",
                driving_status: isBusy ? "busy" : "idle",
                online_status: "online",
              };
            });
            saveToStorage(getDriverDataStorageKey(), updated);
            return updated;
          });
          return;
        }
      } catch (snapshotErr) {
        console.warn("Driver state snapshot failed, falling back to driver list:", snapshotErr.message);
      }

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

      setOnJobDrivers(busy);

      const authoritativeIds = setAuthoritativeActiveDriverIds([...rankedIdle, ...busy]);
      const waitingIds = new Set(rankedIdle.map((d) => getDriverKey(d)).filter(Boolean));
      const onJobIds = new Set(busy.map((d) => getDriverKey(d)).filter(Boolean));

      setDriverData((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          if (!authoritativeIds.has(id)) delete updated[id];
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
        saveToStorage(getDriverDataStorageKey(), updated);
        return updated;
      });
    } catch (err) {
      console.error("Sync waiting drivers error:", err);
    }
  }, [setWaitingDrivers, setOnJobDrivers, setDriverData, setAuthoritativeActiveDriverIds]);

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
        await syncWaitingDriversFromApi();
        return;

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

        const idleIds = new Set(rankedIdle.map((d) => getDriverKey(d)).filter(Boolean));
        if (busy.length || idleIds.size) {
          setOnJobDrivers((prev) =>
            mergeOnJobDrivers(
              prev.filter((d) => !idleIds.has(getDriverKey(d))),
              busy
            )
          );
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
          saveToStorage(getDriverDataStorageKey(), updated);
          return updated;
        });
      } catch (err) {
        console.error("Initial drivers fetch error:", err);
      }
    };

    fetchInitialDrivers();
    return () => { cancelled = true; };
  }, [allPlots, setWaitingDrivers, setOnJobDrivers, setDriverData, syncWaitingDriversFromApi]);

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
        saveToStorage(getDriverDataStorageKey(), updated);
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

    const removeDriverFromOnJob = (driverId) => {
      const driverKey = String(driverId);
      if (!driverKey) return;

      setOnJobDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
    };

    const promoteDriverToOnJob = (rawDriver) => {
      let driver = buildOnJobDriverFromPayload(rawDriver);
      if (!driver) return;

      const driverKey = getDriverKey(driver);
      const waitingMatch = (waitingDriversRef.current || []).find(
        (d) => getDriverKey(d) === driverKey
      );
      if (waitingMatch) {
        driver = {
          ...waitingMatch,
          ...driver,
          driving_status: "busy",
          status: "busy",
          updatedAt: Date.now(),
        };
      }

      removeDriverFromWaitingAndMap(driverKey);

      setOnJobDrivers((prev) => upsertOnJobDriver(prev, driver));
      setDriverData((prev) => applyOnJobDriverToMap(prev, driver, plotsDataRef.current));
    };

    const syncOnJobFromBooking = (booking) => {
      if (!booking) return;

      const status = booking.booking_status || booking.status;
      let driver = buildOnJobDriverFromBooking(booking);

      const isNearestAccept =
        nearestDriverDispatchEnabledRef.current &&
        isNearestDispatchAcceptAction(booking.dispatcher_action);

      const isPlotAccept =
        plotBasedDispatchEnabledRef.current &&
        isPlotDispatchAcceptAction(booking.dispatcher_action);

      if (
        (isOnJobBookingStatus(status) || ((isNearestAccept || isPlotAccept) && booking.driver)) &&
        driver
      ) {
        promoteDriverToOnJob({
          ...driver,
          booking_status: isOnJobBookingStatus(status) ? status : "started",
        });
        return;
      }

      if (isOnJobBookingStatus(status) || isNearestAccept || isPlotAccept) {
        syncWaitingDriversFromApi();
        return;
      }

      if (shouldRemoveDriverFromOnJob(status) && driver) {
        removeDriverFromOnJob(getDriverKey(driver));
      }
    };

    const handleDashboardUpdate = (data) => {
      if (!isCurrentTenantPayload(data)) return;
      fetchDashboardCards();
    };
    const handleNotificationRide = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;
      showRideNotification(data);

      const booking = data?.booking ?? (data?.booking_status ? data : null);
      if (booking?.id) {
        syncOnJobFromBooking(booking);
      }
    };

    const handleMyRankUpdate = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;

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

      const onJobIds = new Set(
        (onJobDriversRef.current || []).map((d) => getDriverKey(d)).filter(Boolean)
      );

      const formattedDrivers = driversList
        .map(formatWaitingDriverFromSocket)
        .filter(isWaitingListDriver)
        .filter((d) => shouldAcceptDriverSocketEvent(getDriverKey(d)))
        .filter((d) => !onJobIds.has(getDriverKey(d)));

      const next = plotId != null
        ? mergeWaitingDriversByPlot(waitingDriversRef.current, plotId, formattedDrivers)
        : formattedDrivers;
      syncWaitingListAndMap(next);
    };

    const handleWaitingDriverOnline = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;

      const dataOnlineStatus = String(data?.online_status || "").toLowerCase();
      if (dataOnlineStatus === "offline") {
        const offlineDriverId = getOfflineDriverIdFromPayload(data);
        if (offlineDriverId) {
          markDriverRemoved(offlineDriverId);
          removeDriverFromWaitingAndMap(offlineDriverId);
        }
        return;
      }

      const driverId = getOfflineDriverIdFromPayload(data);
      if (!shouldAcceptDriverSocketEvent(driverId)) return;
      if (!isWaitingListDriver(data)) {
        if (driverId) {
          removeDriverFromWaitingAndMap(driverId);
        }
        return;
      }

      const formatted = formatWaitingDriverFromSocket(data);
      const driverKey = getDriverKey(formatted);
      const isOnJob = (onJobDriversRef.current || []).some(
        (d) => getDriverKey(d) === driverKey
      );
      if (isOnJob) return;

      setWaitingDrivers((prev) => {
        const next = upsertWaitingDriver(prev, formatted);
        pruneMapForWaitingList(next, true);
        return next;
      });
    };

    const handleOnJobDriver = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;

      if (Array.isArray(data)) {
        setOnJobDrivers(data);
        return;
      }

      const driver = buildOnJobDriverFromPayload(data);
      if (driver && shouldAcceptDriverSocketEvent(getDriverKey(driver))) {
        promoteDriverToOnJob(driver);
      }
    };

    const handleJobAccepted = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;

      const booking = data?.booking
        ? {
            ...data.booking,
            booking_status: data.booking.booking_status || data.booking_status || "started",
          }
        : data?.booking_id
          ? {
              id: data.booking_id,
              booking_status: data.booking_status || "started",
              driver: data.driver_id || data.driver,
              driver_name: data.driver_name || data.driverName,
              dispatcher_action: data.dispatcher_action,
            }
          : null;

      if (booking) {
        syncOnJobFromBooking(booking);
        return;
      }

      const driver = buildOnJobDriverFromPayload(data);
      if (driver) promoteDriverToOnJob(driver);
    };

    const handleJobCancelled = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;

      const driverId =
        data?.driver_id ||
        data?.driverId ||
        data?.id ||
        data?.driver?.id;

      if (driverId) {
        removeDriverFromOnJob(driverId);
      } else {
        const driverName = data?.driver_name || data?.driverName;
        if (driverName) {
          setOnJobDrivers((prev) => prev.filter((d) => (d.name || d.driver_name) !== driverName));
        }
      }

      fetchDashboardCards();
    };

    const handleBookingUpdated = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;

      const booking = data?.booking ?? data;
      if (!booking?.id) return;

      syncOnJobFromBooking(booking);
    };

    const handleBookingStatusUpdated = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;

      const status = data?.status || data?.booking_status;
      if (!status) return;

      const booking = data?.booking ?? {
        id: data.booking_id || data.id,
        booking_status: status,
        driver: data.driver_id || data.driver,
        driver_name: data.driver_name || data.driverName,
        driverDetail: data.driverDetail,
      };

      if (isOnJobBookingStatus(status) || shouldRemoveDriverFromOnJob(status)) {
        const driver = buildOnJobDriverFromBooking(booking);
        if (driver) {
          syncOnJobFromBooking(booking);
        } else {
          syncWaitingDriversFromApi();
        }
      }

      if (["no_show", "driver_no_show", "completed", "cancelled", "cancel_ride"].includes(String(status).toLowerCase())) {
        fetchDashboardCards();
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    const handleBookingCancelled = () => {
      fetchDashboardCards();
      setRefreshTrigger((prev) => prev + 1);
    };

    const handleDriverLocationUpdate = (rawData) => {
      const data = parseDriverData(rawData);
      if (!data) return;
      if (!isCurrentTenantPayload(data)) return;
      const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
      if (!driverId) return;
      const sId = String(driverId);
      const now = Date.now();

      if ((data.online_status || "").toLowerCase() === "offline") {
        markDriverRemoved(sId);
        removeDriverFromWaitingAndMap(sId);
        removeDriverFromOnJob(sId);
        return;
      }

      if (!shouldAcceptDriverSocketEvent(sId)) return;

      const drivingStatus = (data.driving_status || data.status || "").toLowerCase();
      if (drivingStatus === "busy" || drivingStatus === "active") {
        promoteDriverToOnJob(data);
        return;
      }

      // If socket explicitly says idle, remove from on-job + localStorage
      if (drivingStatus === "idle") {
        removeDriverFromOnJob(sId);
      }

      setWaitingDrivers((prev) => {
        const formatted = formatWaitingDriverFromSocket({
          ...data,
          updatedAt: now,
        });
        const next = upsertWaitingDriver(prev, formatted);
        pruneMapForWaitingList(next, true);
        return next;
      });
    };

    const handleNearestDispatchFailed = (rawData) => {
      let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      if (!isCurrentTenantPayload(data)) return;
      showRideNotification({
        ...data,
        isFailedDispatch: true,
        message: sanitizeNearestDispatchMessage(data?.message || data?.reason),
        reason: sanitizeNearestDispatchMessage(data?.message || data?.reason),
      });
      fetchDashboardCards();
    };

    const handlePlotDispatchFailed = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;
      showRideNotification({
        ...data,
        isFailedDispatch: true,
        isPlotDispatchFailure: true,
        message: sanitizePlotDispatchMessage(data?.message || data?.reason),
        reason: sanitizePlotDispatchMessage(data?.message || data?.reason),
      });
      fetchDashboardCards();
      setRefreshTrigger((prev) => prev + 1);
    };

    const handlePlotDispatchLifecycle = () => {
      fetchDashboardCards();
      setRefreshTrigger((prev) => prev + 1);
    };

    const handleManualDispatchRequired = (rawData) => {
      const payload = parsePlotDispatchPayload(rawData);
      showRideNotification({
        ...payload,
        isFailedDispatch: true,
        isPlotDispatchFailure: true,
        message:
          payload?.message ||
          "No driver accepted — available for manual dispatch",
        reason:
          payload?.message ||
          "No driver accepted — available for manual dispatch",
      });
      fetchDashboardCards();
      setRefreshTrigger((prev) => prev + 1);
    };

    const handleRefreshBookingsList = (rawData) => {
      parsePlotDispatchPayload(rawData);
      setRefreshTrigger((prev) => prev + 1);
      fetchDashboardCards();
    };

    const handleAutoDispatchFailed = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;
      showRideNotification({
        ...data,
        isFailedDispatch: true,
        message: data?.message || "Ride not selected during auto dispatch. Please book manually.",
        reason: data?.message || "Ride not selected during auto dispatch. Please book manually.",
      });
      fetchDashboardCards();
      setRefreshTrigger((prev) => prev + 1);
    };

    const handleDriverOffline = (rawData) => {
      let data;
      try {
        data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      } catch {
        data = rawData;
      }
      if (!isCurrentTenantPayload(data)) return;

      const driverId = getOfflineDriverIdFromPayload(data);
      if (!driverId) return;

      markDriverRemoved(driverId);
      removeDriverFromWaitingAndMap(driverId);
      removeDriverFromOnJob(driverId);
    };

    const handleSocketStateRefresh = () => {
      syncWaitingDriversFromApi();
      fetchDashboardCards();
    };

    socket.on("connect", handleSocketStateRefresh);
    socket.on("reconnect", handleSocketStateRefresh);
    socket.on("dashboard-cards-update", handleDashboardUpdate);
    socket.on("my-rank-update", handleMyRankUpdate);
    socket.on("waiting-driver-event", handleWaitingDriverOnline);
    socket.on("on-job-driver-event", handleOnJobDriver);
    socket.on("notification-ride", handleNotificationRide);
    socket.on("nearest-dispatch-failed", handleNearestDispatchFailed);
    socket.on("plot-dispatch-failed", handlePlotDispatchFailed);
    socket.on(PLOT_DISPATCH_SOCKET_EVENTS.STATUS, handlePlotDispatchLifecycle);
    socket.on(PLOT_DISPATCH_SOCKET_EVENTS.STARTED, handlePlotDispatchLifecycle);
    socket.on(PLOT_DISPATCH_SOCKET_EVENTS.BACKUP_ADVANCED, handlePlotDispatchLifecycle);
    socket.on(PLOT_DISPATCH_SOCKET_EVENTS.DRIVER_REJECTED, handlePlotDispatchLifecycle);
    socket.on(PLOT_DISPATCH_SOCKET_EVENTS.ACCEPTED, handlePlotDispatchLifecycle);
    socket.on(PLOT_DISPATCH_SOCKET_EVENTS.EXHAUSTED, handlePlotDispatchLifecycle);
    socket.on(PLOT_DISPATCH_SOCKET_EVENTS.MANUAL_REQUIRED, handleManualDispatchRequired);
    socket.on("auto-dispatch-failed", handleAutoDispatchFailed);
    socket.on("driver-assignment-pending", handleNotificationRide);
    socket.on("job-accepted-by-driver", handleJobAccepted);
    socket.on("job-cancelled-by-driver", handleJobCancelled);
    socket.on("driver-location-update", handleDriverLocationUpdate);
    socket.on("booking-cancelled-event", handleBookingCancelled);
    socket.on("booking-cancelled", handleBookingCancelled);
    socket.on("cancel-booking-event", handleBookingCancelled);
    socket.on("booking-updated-event", handleBookingUpdated);
    socket.on("refresh-bookings-list", handleRefreshBookingsList);
    socket.on("booking-status-updated", handleBookingStatusUpdated);
    socket.on("booking-no-show-event", handleBookingStatusUpdated);
    socket.on("driver-offline-event", handleDriverOffline);
    socket.on("driver-offline", handleDriverOffline);

    return () => {
      socket.off("dashboard-cards-update", handleDashboardUpdate);
      socket.off("my-rank-update", handleMyRankUpdate);
      socket.off("waiting-driver-event", handleWaitingDriverOnline);
      socket.off("on-job-driver-event", handleOnJobDriver);
      socket.off("notification-ride", handleNotificationRide);
      socket.off("nearest-dispatch-failed", handleNearestDispatchFailed);
      socket.off("plot-dispatch-failed", handlePlotDispatchFailed);
      socket.off(PLOT_DISPATCH_SOCKET_EVENTS.STATUS, handlePlotDispatchLifecycle);
      socket.off(PLOT_DISPATCH_SOCKET_EVENTS.STARTED, handlePlotDispatchLifecycle);
      socket.off(PLOT_DISPATCH_SOCKET_EVENTS.BACKUP_ADVANCED, handlePlotDispatchLifecycle);
      socket.off(PLOT_DISPATCH_SOCKET_EVENTS.DRIVER_REJECTED, handlePlotDispatchLifecycle);
      socket.off(PLOT_DISPATCH_SOCKET_EVENTS.ACCEPTED, handlePlotDispatchLifecycle);
      socket.off(PLOT_DISPATCH_SOCKET_EVENTS.EXHAUSTED, handlePlotDispatchLifecycle);
      socket.off(PLOT_DISPATCH_SOCKET_EVENTS.MANUAL_REQUIRED, handleManualDispatchRequired);
      socket.off("auto-dispatch-failed", handleAutoDispatchFailed);
      socket.off("driver-assignment-pending", handleNotificationRide);
      socket.off("job-accepted-by-driver", handleJobAccepted);
      socket.off("job-cancelled-by-driver", handleJobCancelled);
      socket.off("driver-location-update", handleDriverLocationUpdate);
      socket.off("booking-cancelled-event", handleBookingCancelled);
      socket.off("booking-cancelled", handleBookingCancelled);
      socket.off("cancel-booking-event", handleBookingCancelled);
      socket.off("booking-updated-event", handleBookingUpdated);
      socket.off("refresh-bookings-list", handleRefreshBookingsList);
      socket.off("booking-status-updated", handleBookingStatusUpdated);
      socket.off("booking-no-show-event", handleBookingStatusUpdated);
      socket.off("driver-offline-event", handleDriverOffline);
      socket.off("driver-offline", handleDriverOffline);
      socket.off("connect", handleSocketStateRefresh);
      socket.off("reconnect", handleSocketStateRefresh);
    };
  }, [socket, fetchDashboardCards, syncWaitingDriversFromApi, markDriverRemoved, shouldAcceptDriverSocketEvent]);

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
        markDriverRemoved(driverKey);
        setWaitingDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
        setOnJobDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
        setDriverData((prev) => removeDriverFromDriverData(prev, driverKey));
        toast.success(`${driverName} logged out.`);
      } else if ((response?.data?.message || "").toLowerCase().includes("driver not found")) {
        markDriverRemoved(driverKey);
        setWaitingDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
        setOnJobDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
        setDriverData((prev) => removeDriverFromDriverData(prev, driverKey));
        toast.success(`${driverName} removed from online list.`);
      } else {
        toast.error(response?.data?.message || "Failed to logout driver.");
      }
    } catch (err) {
      console.error("Logout driver error:", err);
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "";
      if (status === 404 || message.toLowerCase().includes("driver not found")) {
        markDriverRemoved(driverKey);
        setWaitingDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
        setOnJobDrivers((prev) => prev.filter((d) => getDriverKey(d) !== driverKey));
        setDriverData((prev) => removeDriverFromDriverData(prev, driverKey));
        toast.success(`${driverName} removed from online list.`);
      } else {
        toast.error(message || "Failed to logout driver.");
      }
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

  const mapProps = { mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter, plotsData: allPlots, apiKeys, waitingDrivers, onJobDrivers, mapType, hidePlotAndRank };

  return (
    <div className="h-full">
      <div className="px-5 pt-10 flex flex-col sm:flex-row sm:justify-between items-center sm:items-start gap-4 sm:gap-02 xl:mb-6 1.5xl:mb-10">
        <div className="w-full sm:w-[calc(100%-240px)] flex justify-center sm:justify-start">
          <div className="flex flex-col gap-2.5 text-center sm:text-left">
            <PageTitle title="Dashboard overview" />
            <PageSubTitle title={`Welcome back! ${displayName}, Here's what's happening with your transportation business today.`} />
            <CompanyTimezoneClock className="text-center sm:text-left" />
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
              {mapConfigLoading && !mapType && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
                  <AppLogoLoader />
                </div>
              )}
              {mapError && !mapType && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl px-4 text-center">
                  <p className="text-sm text-red-600">{mapError}</p>
                </div>
              )}
              {(mapType === MAP_PROVIDER_DEFAULT || mapType === MAP_PROVIDER_BARIKOI) && (
                <DefaultMapSection
                  key={mapType}
                  {...mapProps}
                />
              )}
              {mapType === MAP_PROVIDER_GOOGLE && (
                <GoogleMapSection
                  key={mapType}
                  {...mapProps}
                />
              )}
            </div>
          </div>

          {/* Waiting Drivers */}
          <div className="w-full lg:w-[20.5%] bg-orange-50 rounded-2xl shadow p-3 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Drivers Waiting</h3>
              <span className="font-semibold">{visibleWaitingDrivers.length}</span>
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
                {visibleWaitingDrivers.length > 0 ? visibleWaitingDrivers.map((driver, i) => {
                  const driverKey = getDriverKey(driver);
                  const plotId = getDriverPlotId(driver);
                  const maxRank = (plotId != null
                    ? visibleWaitingDrivers.filter((d) => String(getDriverPlotId(d)) === String(plotId))
                    : visibleWaitingDrivers
                  ).length;
                  const isOutsidePlot = isDriverOutsideAssignedPlot(driver, allPlots, driverData);
                  const rowKey = `${driverKey || "driver"}-${plotId ?? "no-plot"}-${i}`;

                  return (
                  <tr key={rowKey} className="border-t">
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
                    <td>{driver.name || driver.driver_name || driver.driverName || "Driver details loading"}</td>
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
          nearestDriverDispatchEnabled={hidePlotAndRank}
          plotBasedDispatchEnabled={plotBasedDispatchEnabled}
        />
      </div>

      <div className="sticky bottom-0 left-0 right-0 z-30 bg-white shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-0.5 lg:overflow-visible overflow-x-auto rounded-lg shadow">
          {CARD_CONFIG.map((card) => {
            const isActive = activeBookingFilter === card.filter;
            const Icon = card.icon;
            return (
              <button
                key={card.filter}
                onClick={() => setActiveBookingFilter(card.filter)}
                className={`min-w-0 w-full flex items-center justify-center gap-1 px-2 py-2 text-[10px] md:text-[11px] whitespace-nowrap font-semibold text-white transition-colors ${isActive ? "bg-[#1F41BB]" : "bg-blue-500 hover:bg-blue-600"}`}
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span>{card.label}</span>
                <span>({dashboardCounts[card.countKey] ?? 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      <Modal isOpen={isBookingModelOpen.isOpen} keepMounted className="p-4 sm:p-6 lg:p-10 max-h-[98vh] overflow-y-auto overflow-x-hidden">
        <AddBooking
          key={
            isBookingModelOpen.type === "edit" && isBookingModelOpen.booking?.id
              ? `edit-${isBookingModelOpen.booking.id}`
              : "new"
          }
          isModalOpen={isBookingModelOpen.isOpen}
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
