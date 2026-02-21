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

const GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
const BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

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
  BD: { lat: 23.685, lng: 90.3563 },
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
};

const getMapType = () => {
  try {
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const mapsApi =
          parsed?.data?.maps_api ||
          parsed?.maps_api ||
          parsed?.company_data?.data?.maps_api ||
          parsed?.tenant?.maps_api ||
          null;
        if (mapsApi) {
          return mapsApi.trim().toLowerCase() === "barikoi" ? "barikoi" : "google";
        }
      } catch {
        continue;
      }
    }
    return "google";
  } catch {
    return "google";
  }
};

const getCountryCenter = () => {
  const defaultCenter = { lat: 23.8103, lng: 90.4125 };
  try {
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const countryCode =
          parsed?.data?.country_of_use ||
          parsed?.country_of_use ||
          parsed?.company_data?.data?.country_of_use ||
          parsed?.tenant?.country_of_use ||
          null;
        if (countryCode) {
          const code = countryCode.trim().toUpperCase();
          const center = COUNTRY_CENTERS[code];
          if (center) return center;
        }
      } catch {
        continue;
      }
    }
  } catch { }
  return defaultCenter;
};

const loadGoogleMaps = () => {
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
    script.onload = () => resolve();
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
      link.href = `https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css`;
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
    script.src = `https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("MapLibre GL failed"));
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

const GoogleMapSection = ({
  mapRef,
  mapInstance,
  markers,
  driverData,
  setDriverData,
  socket,
  countryCenter,
}) => {
  const fitMapToMarkers = () => {
    if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasVisible = false;
    Object.values(markers.current).forEach((marker) => {
      if (marker.getVisible()) {
        bounds.extend(marker.getPosition());
        hasVisible = true;
      }
    });
    if (hasVisible) {
      mapInstance.current.fitBounds(bounds);
      if (mapInstance.current.getZoom() > 15) mapInstance.current.setZoom(15);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadGoogleMaps()
      .then(() => {
        if (!isMounted || !mapRef.current || mapInstance.current) return;
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: countryCenter.lat, lng: countryCenter.lng },
          zoom: 13,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });
      })
      .catch((err) => console.error("❌ Google Map load failed:", err));
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleDriverUpdate = (rawData) => {
      if (!mapInstance.current) return;
      const data = parseDriverData(rawData);
      if (!data) return;

      const driverId = data?.id;
      const latitude = data?.latitude;
      const longitude = data?.longitude;
      const drivingStatus = data?.driving_status;
      const name = data?.name || `Driver ${driverId}`;
      const phoneNo = data?.phone_no || "";
      const vehiclePlateNo = data?.plate_no || "";

      if (!driverId && driverId !== 0) return;
      if (!latitude || !longitude) return;

      const validStatus =
        drivingStatus === "busy" || drivingStatus === "idle" ? drivingStatus : "idle";
      const position = { lat: Number(latitude), lng: Number(longitude) };

      setDriverData((prev) => ({
        ...prev,
        [driverId]: { ...data, position, name, status: validStatus },
      }));

      const icon = MARKER_ICONS[validStatus];
      const markerIcon = {
        url: icon.url,
        scaledSize: new window.google.maps.Size(icon.scaledSize.width, icon.scaledSize.height),
        anchor: new window.google.maps.Point(icon.anchor.x, icon.anchor.y),
      };

      const infoContent = `
        <div style="padding:5px;">
          <strong>${name}</strong><br/>
          Phone: ${phoneNo}<br/>
          Vehicle: ${vehiclePlateNo}
        </div>`;

      if (markers.current[driverId]) {
        const marker = markers.current[driverId];
        const oldPos = marker.getPosition();
        const dist = Math.sqrt(
          Math.abs(oldPos.lat() - position.lat) ** 2 +
          Math.abs(oldPos.lng() - position.lng) ** 2
        );
        if (dist < 0.01) animateMarker(marker, position, 1000);
        else marker.setPosition(position);
        marker.setIcon(markerIcon);
        marker.infoWindow?.setContent(infoContent);
      } else {
        const marker = new window.google.maps.Marker({
          position,
          map: mapInstance.current,
          title: name,
          icon: markerIcon,
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
      if (Object.keys(markers.current).length <= 1) {
        setTimeout(() => fitMapToMarkers(), 100);
      }
    };

    socket.on("driver-location-update", handleDriverUpdate);
    return () => socket.off("driver-location-update", handleDriverUpdate);
  }, [socket]);

  useEffect(() => {
    Object.values(markers.current).forEach((m) => m.setVisible(true));
    setTimeout(() => fitMapToMarkers(), 100);
  }, [driverData]);

  return (
    <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />
  );
};

const BarikoiMapSection = ({
  mapRef,
  mapInstance,
  markers,
  driverData,
  setDriverData,
  socket,
  countryCenter,
}) => {
  const containerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await loadBarikoiMaps();
      } catch (err) {
        console.error("❌ [BARIKOI] Failed to load MapLibre:", err);
        return;
      }

      if (!isMounted || !containerRef.current || mapInstance.current) return;

      const map = new window.maplibregl.Map({
        container: containerRef.current,
        style: `https://map.barikoi.com/styles/barikoi-light/style.json?key=${BARIKOI_KEY}`,
        attributionControl: true,
        fadeDuration: 0,
      });

      map.addControl(new window.maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        if (isMounted) {
          map.resize();
          setTimeout(() => { map.resize(); setMapReady(true); }, 200);
          setTimeout(() => { map.resize(); }, 500);
        }
      });

      map.on("error", (e) => {
        console.error("❌ [BARIKOI] Map error:", e.error?.message || e);
      });

      mapInstance.current = map;
    };

    init();

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (mapInstance.current) mapInstance.current.resize();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!socket || !mapReady) return;

    const handleDriverUpdate = (rawData) => {
      if (!mapInstance.current) return;

      const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      if (!data?.latitude || !data?.longitude) return;

      const driverId = data.id;
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      const position = [lng, lat]; 
      const isBusy = data.driving_status === "busy";
      const statusKey = isBusy ? "busy" : "idle";
      const icon = MARKER_ICONS[statusKey];

      setDriverData((prev) => ({
        ...prev,
        [driverId]: {
          ...data,
          position: { lat, lng },
          status: statusKey,
        },
      }));

      if (markers.current[driverId]) {
        markers.current[driverId].setLngLat(position);
        const el = markers.current[driverId].getElement();
        if (el) {
          el.style.backgroundImage = `url("${icon.url}")`;
        }
      } else {
        const el = document.createElement("div");
        Object.assign(el.style, {
          width: `${icon.scaledSize.width}px`,
          height: `${icon.scaledSize.height}px`,
          backgroundImage: `url("${icon.url}")`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          cursor: "pointer",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
        });

        const name = data.name || `Driver ${driverId}`;
        const phoneNo = data.phone_no || "N/A";
        const vehiclePlateNo = data.plate_no || "N/A";

        const popup = new window.maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding:6px 10px; min-width:140px; font-size:13px;">
            <strong>${name}</strong><br/>
            Phone: ${phoneNo}<br/>
            Vehicle: ${vehiclePlateNo}<br/>
            <span style="color:${isBusy ? "#16a34a" : "#dc2626"}">
              ${isBusy ? "● On Job" : "● Idle"}
            </span>
          </div>
        `);

        const marker = new window.maplibregl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat(position)
          .setPopup(popup)
          .addTo(mapInstance.current);

        markers.current[driverId] = marker;
      }

      if (Object.keys(markers.current).length === 1) {
        mapInstance.current.flyTo({ center: position, zoom: 14, speed: 0.8 });
      }
    };

    socket.on("driver-location-update", handleDriverUpdate);
    return () => socket.off("driver-location-update", handleDriverUpdate);
  }, [socket, mapReady]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "100%", minHeight: "400px", position: "relative" }}
    >
      {!mapReady && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 10,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(240,244,255,0.92)",
            borderRadius: "12px",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "38px", height: "38px",
              border: "4px solid #e2e8f0",
              borderTop: "4px solid #1f41bb",
              borderRadius: "50%",
              animation: "bk-spin 0.9s linear infinite",
              marginBottom: "10px",
            }}
          />
          <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 500 }}>
            Loading map...
          </span>
          <style>{`@keyframes bk-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
        </div>
      )}

      <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />
    </div>
  );
};

const Overview = () => {
  const [isBookingModelOpen, setIsBookingModelOpen] = useState({ type: "new", isOpen: false });
  const [isMessageModelOpen, setIsMessageModelOpen] = useState({ type: "new", isOpen: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAddBookingDisabled, setIsAddBookingDisabled] = useState(false);
  const [isLoadingDispatchSystem, setIsLoadingDispatchSystem] = useState(true);
  const [activeBookingFilter, setActiveBookingFilter] = useState("todays_booking");
  const [dashboardCounts, setDashboardCounts] = useState({
    todaysBooking: 0,
    preBookings: 0,
    recentJobs: 0,
    completed: 0,
    noShow: 0,
    cancelled: 0,
  });

  const [mapType] = useState(() => getMapType());
  const countryCenter = React.useMemo(() => getCountryCenter(), []);

  const socket = useSocket();

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

  useEffect(() => {
    if (!socket) return;
    const handleDashboardCardsUpdate = (data) => setDashboardCounts(data);
    socket.on("dashboard-cards-update", handleDashboardCardsUpdate);
    return () => socket.off("dashboard-cards-update", handleDashboardCardsUpdate);
  }, [socket]);

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
          if (data && typeof data === "object" && Object.keys(data).length > 0) data = [data];
          else { setIsAddBookingDisabled(true); return; }
        }
      }

      const hasManual = data.some(
        (item) =>
          item.dispatch_system === "manual_dispatch_only" &&
          (item.status === "enable" || item.status === "enabled" || item.status === 1 || item.status === true)
      );
      const hasAutoNearest = data.some(
        (item) =>
          item.dispatch_system === "auto_dispatch_nearest_driver" &&
          (item.status === "enable" || item.status === "enabled" || item.status === 1 || item.status === true)
      );
      setIsAddBookingDisabled(!(hasManual || hasAutoNearest));
    } catch (error) {
      console.error("Dispatch system error:", error);
      setIsAddBookingDisabled(true);
    } finally {
      setIsLoadingDispatchSystem(false);
    }
  };

  useEffect(() => { checkDispatchSystem(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleWaitingDrivers = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
      catch { data = rawData; }

      if (Array.isArray(data)) setWaitingDrivers(data);
      else if (data?.drivers && Array.isArray(data.drivers)) setWaitingDrivers(data.drivers);
      else if (data?.data && Array.isArray(data.data)) setWaitingDrivers(data.data);
      else if (data?.driverName || data?.driver_name) {
        const driverObj = {
          id: Date.now(),
          name: data.driverName || data.driver_name,
          plot: data.plot || data.plot_name || "N/A",
          vehicle: data.vehicle || data.vehicle_type || "N/A",
          rank: data.rank || 1,
          ...data,
        };
        setWaitingDrivers((prev) => {
          const exists = prev.some((d) => d.name === driverObj.name && d.plot === driverObj.plot);
          if (exists)
            return prev.map((d) =>
              d.name === driverObj.name && d.plot === driverObj.plot ? driverObj : d
            );
          return [...prev, driverObj];
        });
      } else if (typeof data === "object" && data !== null) {
        setWaitingDrivers([{ ...data, id: data.id || Date.now() }]);
      } else setWaitingDrivers([]);
    };

    socket.on("waiting-driver-event", handleWaitingDrivers);
    return () => socket.off("waiting-driver-event", handleWaitingDrivers);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleOnJobDrivers = (rawData) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; }
      catch { data = rawData; }

      if (Array.isArray(data)) setOnJobDrivers(data);
      else if (data?.drivers && Array.isArray(data.drivers)) setOnJobDrivers(data.drivers);
      else if (data?.data && Array.isArray(data.data)) setOnJobDrivers(data.data);
      else if (data?.driverName || data?.driver_name) {
        const driverObj = { id: Date.now(), name: data.driverName || data.driver_name, ...data };
        setOnJobDrivers((prev) => {
          const exists = prev.some((d) => d.name === driverObj.name);
          if (exists) return prev.map((d) => (d.name === driverObj.name ? driverObj : d));
          return [...prev, driverObj];
        });
      } else if (typeof data === "object" && data !== null) {
        setOnJobDrivers([{ ...data, id: data.id || Date.now() }]);
      } else setOnJobDrivers([]);
    };

    socket.on("on-job-driver-event", handleOnJobDrivers);
    return () => socket.off("on-job-driver-event", handleOnJobDrivers);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    socket.on("ride-accepted-by-driver", (data) => {
      console.log("Ride accepted:", data);
    });
    return () => socket.off("ride-accepted-by-driver");
  }, [socket]);

  const tabs = [
    { id: "today", label: "TODAY'S BOOKING", count: dashboardCounts.todaysBooking, icon: TodayBookingIcon },
    { id: "pre", label: "PRE BOOKINGS", count: dashboardCounts.preBookings, icon: PreBookingIcon },
    { id: "recent", label: "RECENT JOBS", count: dashboardCounts.recentJobs, icon: TodayBookingIcon },
    { id: "completed", label: "COMPLETED", count: dashboardCounts.completed, icon: TodayBookingIcon },
    { id: "noshow", label: "NO SHOW", count: dashboardCounts.noShow, icon: NoShowIcon },
    { id: "cancelled", label: "CANCELLED", count: dashboardCounts.cancelled, icon: CancelledIcon },
  ];

  const TAB_FILTER_MAP = {
    today: "todays_booking",
    pre: "pre_bookings",
    recent: "recent_jobs",
    completed: "completed",
    noshow: "no_show",
    cancelled: "cancelled",
  };

  const mapProps = { mapRef, mapInstance, markers, driverData, setDriverData, socket, countryCenter };

  return (
    <div className="h-full">
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
            onClick={() => {
              lockBodyScroll();
              setIsMessageModelOpen({ isOpen: true, type: "new" });
            }}
          >
            <div className="flex gap-1 items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block">
                <PlusIcon fill={"#1f41bb"} height={13} width={13} />
              </span>
              <span className="sm:hidden">
                <PlusIcon height={8} width={8} />
              </span>
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
            className={`w-full sm:w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3 ${isAddBookingDisabled || isLoadingDispatchSystem
              ? "!bg-gray-400 !cursor-not-allowed opacity-60 hover:!bg-gray-400"
              : ""
              }`}
            style={isAddBookingDisabled || isLoadingDispatchSystem ? { pointerEvents: "none" } : {}}
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
          <div
            className="w-full lg:w-[55%] bg-[#F4F7FF] rounded-2xl shadow p-2 flex flex-col"
            style={{ height: "100%" }}
          >
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

          {/* Waiting Drivers */}
          <div className="w-full lg:w-[20.5%] bg-orange-50 rounded-2xl shadow p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Drivers Waiting</h3>
              <span className="font-semibold">{waitingDrivers.length}</span>
            </div>
            <table className="w-full text-xs rounded-xl">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-left py-1 text-[11px]">Sr No</th>
                  <th className="text-left text-[11px]">Plot</th>
                  <th className="text-left text-[11px]">Driver</th>
                  <th className="text-right text-[11px]">Rank</th>
                </tr>
              </thead>
              <tbody>
                {waitingDrivers.length > 0 ? (
                  waitingDrivers.map((driver, i) => (
                    <tr key={driver.id || driver.driver_id || i} className="border-t">
                      <td className="py-1">{i + 1}</td>
                      <td>{driver.plot || driver.location || driver.plot_name || "N/A"}</td>
                      <td>{driver.name || driver.driver_name || `Driver ${i + 1}`}</td>
                      <td className="text-right">{driver.rank || driver.ranking || i + 1}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">No waiting drivers</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* On Jobs Panel */}
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
                  <tr>
                    <td colSpan="2" className="text-center py-4 text-gray-500">No active jobs</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="px-4 sm:p-6">
        <OverViewDetails filter={activeBookingFilter} />
      </div>

      {/* Bottom Tabs */}
      <div className="sticky bottom-0 left-0 right-0 z-30 bg-white shadow-lg">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-0.5 overflow-hidden">
          {tabs.map((tab) => {
            const backendFilter = TAB_FILTER_MAP[tab.id] || "";
            const isActive = activeBookingFilter === backendFilter;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveBookingFilter(backendFilter)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 font-semibold text-white text-[11px] transition-colors ${isActive ? "bg-[#1F41BB]" : "bg-blue-500"}`}
              >
                {tab.icon && <tab.icon className="w-4 h-4" />}
                <span>{tab.label}</span>
                {tab.count !== undefined && <span>({tab.count})</span>}
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