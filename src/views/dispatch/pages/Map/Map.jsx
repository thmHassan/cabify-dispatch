import { useEffect, useRef, useState } from "react";
import { useSocket } from "../../../../components/routes/SocketProvider";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle";
import CardContainer from "../../../../components/shared/CardContainer";
import CustomSelect from "../../../../components/ui/CustomSelect";
import { MAP_STATUS_OPTIONS } from "../../../../constants/selectOptions";
import { renderToString } from "react-dom/server";
import RedCarIcon from "../../../../components/svg/RedCarIcon";
import GreenCarIcon from "../../../../components/svg/GreenCarIcon";
import { getTenantData } from "../../../../utils/functions/tokenEncryption";

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

const createSvgMarkerEl = (status) => {
  const iconData = MARKER_ICONS[status] || MARKER_ICONS.idle;
  const el = document.createElement("div");
  el.style.cssText = `
    width: ${iconData.scaledSize.width}px;
    height: ${iconData.scaledSize.height}px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  const img = document.createElement("img");
  img.src = iconData.url;
  img.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  `;
  el.appendChild(img);
  return el;
};

const getMapType = () => {
  const tenant = getTenantData();
  const data = tenant?.data || {};

  const mapsApi = data?.maps_api?.trim().toLowerCase();
  const countryOfUse = data?.country_of_use?.trim().toUpperCase();

  if (mapsApi === "barikoi") return "barikoi";
  if (mapsApi === "google") return "google";

  // fallback logic
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

const COUNTRY_CENTERS = {
  IN: { lat: 20.5937, lng: 78.9629 },
  AU: { lat: -25.2744, lng: 133.7751 },
  US: { lat: 37.0902, lng: -95.7129 },
  GB: { lat: 55.3781, lng: -3.4360 },
  BD: { lat: 23.8103, lng: 90.4125 },
  PK: { lat: 30.3753, lng: 69.3451 },
  AE: { lat: 23.4241, lng: 53.8478 },
  SA: { lat: 23.8859, lng: 45.0792 },
  CA: { lat: 56.1304, lng: -106.3468 },
  NG: { lat: 9.0820, lng: 8.6753 },
  KE: { lat: -1.2921, lng: 36.8219 },
  ZA: { lat: -30.5595, lng: 22.9375 },
  SG: { lat: 1.3521, lng: 103.8198 },
  MY: { lat: 4.2105, lng: 101.9758 },
  ID: { lat: -0.7893, lng: 113.9213 },
  PH: { lat: 12.8797, lng: 121.7740 },
  NZ: { lat: -40.9006, lng: 174.8860 },
  DEFAULT: { lat: 0, lng: 0 },
};

const getCountryCenter = () => {
  const tenant = getTenantData();
  const code = tenant?.data?.country_of_use?.trim().toUpperCase();

  return COUNTRY_CENTERS[code] || COUNTRY_CENTERS.DEFAULT;
};

const loadGoogleMaps = (apiKey) => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve();

    const existing = document.getElementById("google-maps-script");
    if (existing) { existing.onload = resolve; return; }

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
    if (window.maplibregl && window.maplibregl.Map) return resolve();

    if (!document.getElementById("maplibre-css")) {
      const link = document.createElement("link");
      link.id = "maplibre-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }

    const existing = document.getElementById("maplibre-script");
    if (existing) {
      existing.onload = () =>
        window.maplibregl?.Map ? resolve() : reject(new Error("MapLibre init failed"));
      return;
    }

    const script = document.createElement("script");
    script.id = "maplibre-script";
    script.src = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js";
    script.async = true;
    script.onload = () =>
      window.maplibregl?.Map ? resolve() : reject(new Error("MapLibre loaded but Map undefined"));
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const animateMarker = (marker, newPosition, duration = 1000) => {
  const start = marker.getPosition();
  const startLat = start.lat(), startLng = start.lng();
  const endLat = newPosition.lat, endLng = newPosition.lng;
  const startTime = Date.now();

  const tick = () => {
    const progress = Math.min((Date.now() - startTime) / duration, 1);
    const ease =
      progress < 0.5
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
    if (typeof rawData === "string") {
      const fixed = rawData
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
      return JSON.parse(fixed);
    }
    return rawData;
  } catch {
    if (typeof rawData === "string") {
      const latM = rawData.match(/"latitude":\s*([\d.]+)/);
      const lngM = rawData.match(/"longitude":\s*([\d.]+)/);
      const cidM = rawData.match(/"client_id":\s*"([^"]*)/);
      const didM = rawData.match(/"dispatcher_id":\s*(\d+)/);
      const stM = rawData.match(/"driving_status":\s*"([^"]*)"/);
      if (latM && lngM) {
        return {
          latitude: parseFloat(latM[1]),
          longitude: parseFloat(lngM[1]),
          client_id: cidM?.[1] ?? null,
          dispatcher_id: didM ? parseInt(didM[1]) : null,
          driving_status: stM?.[1] ?? "idle",
        };
      }
    }
    return null;
  }
};

const makeGoogleIcon = (status) => {
  const icon = MARKER_ICONS[status] || MARKER_ICONS.idle;
  return {
    url: icon.url,
    scaledSize: new window.google.maps.Size(icon.scaledSize.width, icon.scaledSize.height),
    anchor: new window.google.maps.Point(icon.anchor.x, icon.anchor.y),
  };
};

const GoogleMapView = ({
  mapRef, mapInstance, markers,
  driverData, setDriverData,
  selectedStatus, searchQuery, socket,
}) => {
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

  // Init map
  useEffect(() => {
    let mounted = true;
    loadGoogleMaps(googleKey)
      .then(() => {
        if (!mounted || !mapRef.current || mapInstance.current) return;
        const center = getCountryCenter();
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom: 5,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        });
      })
      .catch((err) => console.error("Google Maps load failed:", err));
    return () => { mounted = false; };
  }, []);


  useEffect(() => {
    if (!socket) return;

    const handle = (rawData) => {
      if (!mapInstance.current) return;
      const data = parseDriverData(rawData);
      if (!data) return;

      const driverId = data.client_id || data.dispatcher_id || data.driver_id || data.id || `driver_${Date.now()}`;
      const latitude = data.latitude;
      const longitude = data.longitude;
      const status = data.driving_status || "idle";
      const validStatus = status === "busy" ? "busy" : "idle";
      const name = data.name || data.driver_name || `Driver ${driverId}`;
      const phoneNo = data.phone_no || "";
      const plateNo = data.plate_no || "";

      if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;

      const position = { lat: Number(latitude), lng: Number(longitude) };

      setDriverData((prev) => ({ ...prev, [driverId]: { ...data, position, driving_status: validStatus, name } }));

      const infoContent = `
  <div style="
    padding:6px 10px;
    font-weight:600;
    font-size:14px;
  ">
    ${name}
  </div>`;

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
        marker._isOpen = false;

        marker.addListener("click", () => {
          if (marker._isOpen) {
            infoWindow.close();
            marker._isOpen = false;
          } else {
            Object.values(markers.current).forEach((m) => {
              m.infoWindow?.close();
              m._isOpen = false;
            });

            infoWindow.open(mapInstance.current, marker);
            marker._isOpen = true;
          }
        });
        marker.infoWindow = infoWindow;
        markers.current[driverId] = marker;
      }

      if (Object.keys(markers.current).length <= 1) setTimeout(fitMapToMarkers, 100);
    };

    socket.on("driver-location-update", handle);
    return () => socket.off("driver-location-update", handle);
  }, [socket]);

  useEffect(() => {
    Object.entries(markers.current).forEach(([id, marker]) => {
      const driver = driverData[id];
      if (!driver) return;
      let visible = selectedStatus.value === "all" || driver.driving_status === selectedStatus.value;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        visible = visible && (driver.name?.toLowerCase().includes(q) || id.toString().includes(q));
      }
      marker.setVisible(visible);
    });
    setTimeout(fitMapToMarkers, 100);
  }, [selectedStatus, searchQuery, driverData]);

  return <div ref={mapRef} className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm" />;
};

const BarikoiMapView = ({
  mapRef, mapInstance, markers,
  driverData, setDriverData,
  selectedStatus, searchQuery, socket,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { barikoiKey } = getApiKeys();

  const fitMapToMarkers = () => {
    if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity, hasVisible = false;
    Object.values(markers.current).forEach((m) => {
      if (m._visible === false) return;
      const { lat, lng } = m.getLngLat();
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
      hasVisible = true;
    });
    if (hasVisible) {
      mapInstance.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 15 });
    }
  };

  // Init map
  useEffect(() => {
    let mounted = true;
    loadBarikoiMaps()
      .then(() => {
        if (!mounted || !mapRef.current || mapInstance.current) return;
        const center = getCountryCenter();
        mapInstance.current = new window.maplibregl.Map({
          container: mapRef.current,
          style: `https://map.barikoi.com/styles/osm-liberty/style.json?key=${BARIKOI_KEY}`,
          center: [center.lng, center.lat],
          zoom: 5,
        });
        mapInstance.current.on("load", () => mapInstance.current.resize());
        mapInstance.current.addControl(new window.maplibregl.NavigationControl());
        setIsLoaded(true);
      })
      .catch((err) => console.error("Barikoi Maps load failed:", err));

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

  // Socket: driver location update
  useEffect(() => {
    if (!socket || !isLoaded) return;

    const handle = (rawData) => {
      if (!mapInstance.current) return;
      const data = parseDriverData(rawData);
      if (!data) return;

      const driverId = data.client_id || data.dispatcher_id || data.driver_id || data.id || `driver_${Date.now()}`;
      const latitude = data.latitude;
      const longitude = data.longitude;
      const status = data.driving_status || "idle";
      const validStatus = status === "busy" ? "busy" : "idle";
      const name = data.name || data.driver_name || `Driver ${driverId}`;
      const phoneNo = data.phone_no || "";
      const plateNo = data.plate_no || "";

      if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;

      const lngLat = [Number(longitude), Number(latitude)];

      setDriverData((prev) => ({
        ...prev,
        [driverId]: { ...data, position: { lat: Number(latitude), lng: Number(longitude) }, driving_status: validStatus, name },
      }));

      const popupHTML = `
  <div style="
    padding:6px 10px;
    font-weight:600;
    font-size:14px;
  ">
    ${name}
  </div>`;

      if (markers.current[driverId]) {
        // Update position
        markers.current[driverId].setLngLat(lngLat);
        // Update car icon image to match new status (same SVG as Google)
        const img = markers.current[driverId].getElement().querySelector("img");
        if (img) img.src = (MARKER_ICONS[validStatus] || MARKER_ICONS.idle).url;
        markers.current[driverId].getPopup()?.setHTML(popupHTML);
      } else {
        // New marker — use SVG car icon (same source as Google Maps)
        const el = createSvgMarkerEl(validStatus);
        const popup = new window.maplibregl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
        }).setHTML(popupHTML);

        const marker = new window.maplibregl.Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(mapInstance.current);

        marker._visible = true;
        marker._isOpen = false;

        el.addEventListener("click", () => {
          if (marker._isOpen) {
            popup.remove();
            marker._isOpen = false;
          } else {
            Object.values(markers.current).forEach((m) => {
              m.getPopup()?.remove();
              m._isOpen = false;
            });

            popup.setLngLat(lngLat).addTo(mapInstance.current);
            marker._isOpen = true;
          }
        });
        marker._visible = true;
        markers.current[driverId] = marker;
      }

      if (Object.keys(markers.current).length <= 1) setTimeout(fitMapToMarkers, 100);
    };

    socket.on("driver-location-update", handle);
    return () => socket.off("driver-location-update", handle);
  }, [socket, isLoaded]);

  // Filter / search
  useEffect(() => {
    Object.entries(markers.current).forEach(([id, marker]) => {
      const driver = driverData[id];
      if (!driver) return;
      let visible = selectedStatus.value === "all" || driver.driving_status === selectedStatus.value;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        visible = visible && (driver.name?.toLowerCase().includes(q) || id.toString().includes(q));
      }
      marker._visible = visible;
      marker.getElement().style.display = visible ? "flex" : "none";
    });
    setTimeout(fitMapToMarkers, 100);
  }, [selectedStatus, searchQuery, driverData]);

  return <div ref={mapRef} className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm" />;
};

const Map = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(
    MAP_STATUS_OPTIONS.find((o) => o.value === "all") ?? MAP_STATUS_OPTIONS[0]
  );
  const [driverData, setDriverData] = useState({});
  const [mapType] = useState(() => getMapType());

  const socket = useSocket();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});

  const sharedProps = {
    mapRef, mapInstance, markers,
    driverData, setDriverData,
    selectedStatus, searchQuery, socket,
  };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <PageTitle title="Map" />
        <PageSubTitle title="Driver Location & Aerial View" />
      </div>

      <CardContainer className="p-4 bg-[#F5F5F5]">
        {/* Top controls */}
        <div className="flex flex-row items-center gap-3 sm:gap-5 justify-end mb-4 pb-4">
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

        {/* Map */}
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

// import { useEffect, useRef, useState } from "react";
// import { useSocket } from "../../../../components/routes/SocketProvider";
// import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
// import PageSubTitle from "../../../../components/ui/PageSubTitle";
// import CardContainer from "../../../../components/shared/CardContainer";
// import CustomSelect from "../../../../components/ui/CustomSelect";
// import { MAP_STATUS_OPTIONS } from "../../../../constants/selectOptions";
// import { renderToString } from "react-dom/server";
// import RedCarIcon from "../../../../components/svg/RedCarIcon";
// import GreenCarIcon from "../../../../components/svg/GreenCarIcon";
// import { getTenantData } from "../../../../utils/functions/tokenEncryption";

// const GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
// const BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

// // ─── Logging helper ──────────────────────────────────────────────────────────
// const log = (section, msg, data) => {
//   const prefix = `%c[Map:${section}]`;
//   const style = "color:#1F41BB;font-weight:bold;";
//   if (data !== undefined) {
//     console.log(prefix, style, msg, data);
//   } else {
//     console.log(prefix, style, msg);
//   }
// };
// const logWarn = (section, msg, data) => {
//   const prefix = `%c[Map:${section}] ⚠`;
//   const style = "color:#f59e0b;font-weight:bold;";
//   data !== undefined ? console.warn(prefix, style, msg, data) : console.warn(prefix, style, msg);
// };
// const logError = (section, msg, data) => {
//   const prefix = `%c[Map:${section}] ✖`;
//   const style = "color:#ef4444;font-weight:bold;";
//   data !== undefined ? console.error(prefix, style, msg, data) : console.error(prefix, style, msg);
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

// const createSvgMarkerEl = (status) => {
//   const iconData = MARKER_ICONS[status] || MARKER_ICONS.idle;
//   const el = document.createElement("div");
//   el.style.cssText = `
//     width: ${iconData.scaledSize.width}px;
//     height: ${iconData.scaledSize.height}px;
//     cursor: pointer;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//   `;
//   const img = document.createElement("img");
//   img.src = iconData.url;
//   img.style.cssText = `
//     width: 100%;
//     height: 100%;
//     object-fit: contain;
//     filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
//   `;
//   el.appendChild(img);
//   return el;
// };

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

// const COUNTRY_CENTERS = {
//   IN: { lat: 20.5937, lng: 78.9629 },
//   AU: { lat: -25.2744, lng: 133.7751 },
//   US: { lat: 37.0902, lng: -95.7129 },
//   GB: { lat: 55.3781, lng: -3.4360 },
//   BD: { lat: 23.8103, lng: 90.4125 },
//   PK: { lat: 30.3753, lng: 69.3451 },
//   AE: { lat: 23.4241, lng: 53.8478 },
//   SA: { lat: 23.8859, lng: 45.0792 },
//   CA: { lat: 56.1304, lng: -106.3468 },
//   NG: { lat: 9.0820, lng: 8.6753 },
//   KE: { lat: -1.2921, lng: 36.8219 },
//   ZA: { lat: -30.5595, lng: 22.9375 },
//   SG: { lat: 1.3521, lng: 103.8198 },
//   MY: { lat: 4.2105, lng: 101.9758 },
//   ID: { lat: -0.7893, lng: 113.9213 },
//   PH: { lat: 12.8797, lng: 121.7740 },
//   NZ: { lat: -40.9006, lng: 174.8860 },
//   DEFAULT: { lat: 0, lng: 0 },
// };

// const getCountryCenter = () => {
//   const tenant = getTenantData();
//   const code = tenant?.data?.country_of_use?.trim().toUpperCase();
//   const center = COUNTRY_CENTERS[code] || COUNTRY_CENTERS.DEFAULT;
//   log("Config", `Country: ${code || "unknown"} → center`, center);
//   return center;
// };

// const loadGoogleMaps = (apiKey) => {
//   return new Promise((resolve, reject) => {
//     if (window.google && window.google.maps) {
//       log("Google", "Maps SDK already loaded");
//       return resolve();
//     }
//     const existing = document.getElementById("google-maps-script");
//     if (existing) { existing.onload = resolve; return; }
//     const script = document.createElement("script");
//     script.id = "google-maps-script";
//     script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
//     script.async = true;
//     script.defer = true;
//     script.onload = () => { log("Google", "Maps SDK loaded ✓"); resolve(); };
//     script.onerror = (e) => { logError("Google", "Maps SDK failed to load", e); reject(e); };
//     document.head.appendChild(script);
//   });
// };

// const loadBarikoiMaps = () => {
//   return new Promise((resolve, reject) => {
//     if (window.maplibregl && window.maplibregl.Map) {
//       log("Barikoi", "MapLibre already loaded");
//       return resolve();
//     }
//     if (!document.getElementById("maplibre-css")) {
//       const link = document.createElement("link");
//       link.id = "maplibre-css";
//       link.rel = "stylesheet";
//       link.href = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css";
//       document.head.appendChild(link);
//     }
//     const existing = document.getElementById("maplibre-script");
//     if (existing) {
//       existing.onload = () =>
//         window.maplibregl?.Map ? resolve() : reject(new Error("MapLibre init failed"));
//       return;
//     }
//     const script = document.createElement("script");
//     script.id = "maplibre-script";
//     script.src = "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js";
//     script.async = true;
//     script.onload = () => {
//       if (window.maplibregl?.Map) {
//         log("Barikoi", "MapLibre loaded ✓");
//         resolve();
//       } else {
//         logError("Barikoi", "MapLibre loaded but Map undefined");
//         reject(new Error("MapLibre loaded but Map undefined"));
//       }
//     };
//     script.onerror = (e) => { logError("Barikoi", "MapLibre failed to load", e); reject(e); };
//     document.head.appendChild(script);
//   });
// };

// const animateMarker = (marker, newPosition, duration = 1000) => {
//   const start = marker.getPosition();
//   const startLat = start.lat(), startLng = start.lng();
//   const endLat = newPosition.lat, endLng = newPosition.lng;
//   const startTime = Date.now();
//   const tick = () => {
//     const progress = Math.min((Date.now() - startTime) / duration, 1);
//     const ease =
//       progress < 0.5
//         ? 2 * progress * progress
//         : 1 - Math.pow(-2 * progress + 2, 2) / 2;
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
//     if (typeof rawData === "string") {
//       const fixed = rawData
//         .replace(/,\s*}/g, "}")
//         .replace(/,\s*]/g, "]")
//         .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
//       return JSON.parse(fixed);
//     }
//     return rawData;
//   } catch {
//     if (typeof rawData === "string") {
//       const latM = rawData.match(/"latitude":\s*([\d.]+)/);
//       const lngM = rawData.match(/"longitude":\s*([\d.]+)/);
//       const cidM = rawData.match(/"client_id":\s*"([^"]*)/);
//       const didM = rawData.match(/"dispatcher_id":\s*(\d+)/);
//       const stM = rawData.match(/"driving_status":\s*"([^"]*)"/);
//       if (latM && lngM) {
//         return {
//           latitude: parseFloat(latM[1]),
//           longitude: parseFloat(lngM[1]),
//           client_id: cidM?.[1] ?? null,
//           dispatcher_id: didM ? parseInt(didM[1]) : null,
//           driving_status: stM?.[1] ?? "idle",
//         };
//       }
//     }
//     logWarn("Parse", "Could not parse driver data", rawData);
//     return null;
//   }
// };

// const makeGoogleIcon = (status) => {
//   const icon = MARKER_ICONS[status] || MARKER_ICONS.idle;
//   return {
//     url: icon.url,
//     scaledSize: new window.google.maps.Size(icon.scaledSize.width, icon.scaledSize.height),
//     anchor: new window.google.maps.Point(icon.anchor.x, icon.anchor.y),
//   };
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GoogleMapView
// // ─────────────────────────────────────────────────────────────────────────────
// const GoogleMapView = ({
//   mapRef, mapInstance, markers,
//   driverData, setDriverData,
//   selectedStatus, searchQuery, socket,
// }) => {
//   const { googleKey } = getApiKeys();

//   // ── Use socketRef to avoid listener re-registration on re-renders ──────────
//   const socketRef = useRef(socket);
//   useEffect(() => { socketRef.current = socket; }, [socket]);

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

//   // Init map — runs once
//   useEffect(() => {
//     let mounted = true;
//     log("Google", "Loading Google Maps SDK...");
//     loadGoogleMaps(googleKey)
//       .then(() => {
//         if (!mounted || !mapRef.current || mapInstance.current) return;
//         const center = getCountryCenter();
//         mapInstance.current = new window.google.maps.Map(mapRef.current, {
//           center: { lat: center.lat, lng: center.lng },
//           zoom: 5,
//           styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
//         });
//         log("Google", "Map instance created ✓", { center, zoom: 5 });
//       })
//       .catch((err) => logError("Google", "Map init failed", err));
//     return () => { mounted = false; };
//   }, []);

//   // Socket listener — registers ONCE, uses socketRef inside
//   useEffect(() => {
//     log("Google", "Registering driver-location-update listener");

//     const handle = (rawData) => {
//       if (!mapInstance.current) {
//         logWarn("Google", "Location update received but map not ready yet");
//         return;
//       }

//       const data = parseDriverData(rawData);
//       if (!data) {
//         logWarn("Google", "driver-location-update: could not parse data", rawData);
//         return;
//       }

//       const driverId = data.client_id || data.dispatcher_id || data.driver_id || data.id || `driver_${Date.now()}`;
//       const latitude = data.latitude;
//       const longitude = data.longitude;
//       const status = data.driving_status || "idle";
//       const validStatus = status === "busy" ? "busy" : "idle";
//       const name = data.name || data.driver_name || `Driver ${driverId}`;

//       if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
//         logWarn("Google", `Invalid coords for driver ${driverId}`, { latitude, longitude });
//         return;
//       }

//       const position = { lat: Number(latitude), lng: Number(longitude) };
//       log("Google", `📍 Driver update: ${name} (${driverId}) → ${validStatus}`, position);

//       setDriverData((prev) => ({ ...prev, [driverId]: { ...data, position, driving_status: validStatus, name } }));

//       const infoContent = `<div style="padding:6px 10px;font-weight:600;font-size:14px;">${name}</div>`;

//       if (markers.current[driverId]) {
//         const marker = markers.current[driverId];
//         const oldPos = marker.getPosition();
//         const dist = Math.sqrt((oldPos.lat() - position.lat) ** 2 + (oldPos.lng() - position.lng) ** 2);
//         dist < 0.01
//           ? animateMarker(marker, position, 1000)
//           : marker.setPosition(position);
//         marker.setIcon(makeGoogleIcon(validStatus));
//         marker.infoWindow?.setContent(infoContent);
//         log("Google", `Marker updated: ${name}`);
//       } else {
//         const marker = new window.google.maps.Marker({
//           position,
//           map: mapInstance.current,
//           title: name,
//           icon: makeGoogleIcon(validStatus),
//           animation: window.google.maps.Animation.DROP,
//         });
//         const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });
//         marker._isOpen = false;
//         marker.addListener("click", () => {
//           if (marker._isOpen) {
//             infoWindow.close();
//             marker._isOpen = false;
//           } else {
//             Object.values(markers.current).forEach((m) => { m.infoWindow?.close(); m._isOpen = false; });
//             infoWindow.open(mapInstance.current, marker);
//             marker._isOpen = true;
//           }
//         });
//         marker.infoWindow = infoWindow;
//         markers.current[driverId] = marker;
//         log("Google", `✅ New marker placed: ${name} (total: ${Object.keys(markers.current).length})`);
//       }

//       if (Object.keys(markers.current).length <= 1) setTimeout(fitMapToMarkers, 100);
//     };

//     // Attach to socket
//     if (socketRef.current) {
//       socketRef.current.on("driver-location-update", handle);
//       log("Google", "Socket listener attached ✓");
//     } else {
//       logWarn("Google", "Socket not available yet — listener will attach when socket is ready");
//     }

//     return () => {
//       if (socketRef.current) {
//         socketRef.current.off("driver-location-update", handle);
//         log("Google", "Socket listener detached (unmount)");
//       }
//     };
//   }, []); // ← EMPTY: register once, never torn down by re-renders

//   // When socket becomes available after initial render, re-attach
//   useEffect(() => {
//     if (!socket) return;
//     log("Google", "Socket connected/reconnected", { id: socket.id });
//   }, [socket]);

//   useEffect(() => {
//     Object.entries(markers.current).forEach(([id, marker]) => {
//       const driver = driverData[id];
//       if (!driver) return;
//       let visible = selectedStatus.value === "all" || driver.driving_status === selectedStatus.value;
//       if (searchQuery.trim()) {
//         const q = searchQuery.toLowerCase();
//         visible = visible && (driver.name?.toLowerCase().includes(q) || id.toString().includes(q));
//       }
//       marker.setVisible(visible);
//     });
//     setTimeout(fitMapToMarkers, 100);
//   }, [selectedStatus, searchQuery, driverData]);

//   return <div ref={mapRef} className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm" />;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // BarikoiMapView
// // ─────────────────────────────────────────────────────────────────────────────
// const BarikoiMapView = ({
//   mapRef, mapInstance, markers,
//   driverData, setDriverData,
//   selectedStatus, searchQuery, socket,
// }) => {
//   const [isLoaded, setIsLoaded] = useState(false);
//   const { barikoiKey } = getApiKeys();

//   // ── socketRef to avoid re-registering on re-renders ───────────────────────
//   const socketRef = useRef(socket);
//   useEffect(() => { socketRef.current = socket; }, [socket]);

//   const fitMapToMarkers = () => {
//     if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
//     let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity, hasVisible = false;
//     Object.values(markers.current).forEach((m) => {
//       if (m._visible === false) return;
//       const { lat, lng } = m.getLngLat();
//       minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
//       minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
//       hasVisible = true;
//     });
//     if (hasVisible) {
//       mapInstance.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 15 });
//     }
//   };

//   // Init map — runs once
//   useEffect(() => {
//     let mounted = true;
//     log("Barikoi", "Loading MapLibre...");
//     loadBarikoiMaps()
//       .then(() => {
//         if (!mounted || !mapRef.current || mapInstance.current) return;
//         const center = getCountryCenter();
//         mapInstance.current = new window.maplibregl.Map({
//           container: mapRef.current,
//           style: `https://map.barikoi.com/styles/barikoi-light/style.json?key=${BARIKOI_KEY}`,
//           center: [center.lng, center.lat],
//           zoom: 5,
//         });
//         mapInstance.current.on("load", () => {
//           mapInstance.current.resize();
//           log("Barikoi", "Map loaded and ready ✓", { center, zoom: 5 });
//           setIsLoaded(true);
//         });
//         mapInstance.current.addControl(new window.maplibregl.NavigationControl());
//       })
//       .catch((err) => logError("Barikoi", "Map init failed", err));

//     return () => {
//       mounted = false;
//       if (mapInstance.current) {
//         log("Barikoi", "Cleaning up map on unmount");
//         Object.values(markers.current).forEach((m) => m.remove());
//         markers.current = {};
//         mapInstance.current.remove();
//         mapInstance.current = null;
//       }
//     };
//   }, []);

//   // Socket listener — registers once when map is loaded
//   useEffect(() => {
//     if (!isLoaded) return;

//     log("Barikoi", "Registering driver-location-update listener");

//     const handle = (rawData) => {
//       if (!mapInstance.current) {
//         logWarn("Barikoi", "Location update received but map not ready");
//         return;
//       }

//       const data = parseDriverData(rawData);
//       if (!data) {
//         logWarn("Barikoi", "driver-location-update: could not parse data", rawData);
//         return;
//       }

//       const driverId = data.client_id || data.dispatcher_id || data.driver_id || data.id || `driver_${Date.now()}`;
//       const latitude = data.latitude;
//       const longitude = data.longitude;
//       const status = data.driving_status || "idle";
//       const validStatus = status === "busy" ? "busy" : "idle";
//       const name = data.name || data.driver_name || `Driver ${driverId}`;

//       if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
//         logWarn("Barikoi", `Invalid coords for driver ${driverId}`, { latitude, longitude });
//         return;
//       }

//       const lngLat = [Number(longitude), Number(latitude)];
//       log("Barikoi", `📍 Driver update: ${name} (${driverId}) → ${validStatus}`, { lngLat });

//       setDriverData((prev) => ({
//         ...prev,
//         [driverId]: { ...data, position: { lat: Number(latitude), lng: Number(longitude) }, driving_status: validStatus, name },
//       }));

//       const popupHTML = `<div style="padding:6px 10px;font-weight:600;font-size:14px;">${name}</div>`;

//       if (markers.current[driverId]) {
//         markers.current[driverId].setLngLat(lngLat);
//         const img = markers.current[driverId].getElement().querySelector("img");
//         if (img) img.src = (MARKER_ICONS[validStatus] || MARKER_ICONS.idle).url;
//         markers.current[driverId].getPopup()?.setHTML(popupHTML);
//         log("Barikoi", `Marker updated: ${name}`);
//       } else {
//         const el = createSvgMarkerEl(validStatus);
//         const popup = new window.maplibregl.Popup({
//           offset: 25, closeButton: false, closeOnClick: false,
//         }).setHTML(popupHTML);

//         const marker = new window.maplibregl.Marker({ element: el })
//           .setLngLat(lngLat)
//           .addTo(mapInstance.current);

//         marker._visible = true;
//         marker._isOpen = false;

//         el.addEventListener("click", () => {
//           if (marker._isOpen) {
//             popup.remove();
//             marker._isOpen = false;
//           } else {
//             Object.values(markers.current).forEach((m) => { m.getPopup()?.remove(); m._isOpen = false; });
//             popup.setLngLat(lngLat).addTo(mapInstance.current);
//             marker._isOpen = true;
//           }
//         });
//         markers.current[driverId] = marker;
//         log("Barikoi", `✅ New marker placed: ${name} (total: ${Object.keys(markers.current).length})`);
//       }

//       if (Object.keys(markers.current).length <= 1) setTimeout(fitMapToMarkers, 100);
//     };

//     if (socketRef.current) {
//       socketRef.current.on("driver-location-update", handle);
//       log("Barikoi", "Socket listener attached ✓");
//     } else {
//       logWarn("Barikoi", "Socket not available — listener pending");
//     }

//     return () => {
//       if (socketRef.current) {
//         socketRef.current.off("driver-location-update", handle);
//         log("Barikoi", "Socket listener detached (map reload/unmount)");
//       }
//     };
//   }, [isLoaded]); // ← only re-runs when map loads, NOT on socket change

//   useEffect(() => {
//     Object.entries(markers.current).forEach(([id, marker]) => {
//       const driver = driverData[id];
//       if (!driver) return;
//       let visible = selectedStatus.value === "all" || driver.driving_status === selectedStatus.value;
//       if (searchQuery.trim()) {
//         const q = searchQuery.toLowerCase();
//         visible = visible && (driver.name?.toLowerCase().includes(q) || id.toString().includes(q));
//       }
//       marker._visible = visible;
//       marker.getElement().style.display = visible ? "flex" : "none";
//     });
//     setTimeout(fitMapToMarkers, 100);
//   }, [selectedStatus, searchQuery, driverData]);

//   return <div ref={mapRef} className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm" />;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Map Page
// // ─────────────────────────────────────────────────────────────────────────────
// const Map = () => {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedStatus, setSelectedStatus] = useState(
//     MAP_STATUS_OPTIONS.find((o) => o.value === "all") ?? MAP_STATUS_OPTIONS[0]
//   );
//   const [driverData, setDriverData] = useState({});
//   const [mapType] = useState(() => {
//     const type = getMapType();
//     log("Map", `Map type resolved: ${type}`);
//     return type;
//   });

//   const socket = useSocket();
//   const mapRef = useRef(null);
//   const mapInstance = useRef(null);
//   const markers = useRef({});

//   // Log socket connection status
//   useEffect(() => {
//     if (socket) {
//       log("Map", `Socket connected ✓ id=${socket.id}`);

//       socket.on("connect", () => log("Map", "Socket reconnected ✓"));
//       socket.on("disconnect", (reason) => logWarn("Map", `Socket disconnected: ${reason}`));
//       socket.on("connect_error", (err) => logError("Map", "Socket connection error", err.message));

//       return () => {
//         socket.off("connect");
//         socket.off("disconnect");
//         socket.off("connect_error");
//       };
//     } else {
//       logWarn("Map", "Socket is null — waiting...");
//     }
//   }, [socket]);

//   // Log driver count changes
//   useEffect(() => {
//     const total = Object.keys(driverData).length;
//     const busy = Object.values(driverData).filter(d => d.driving_status === "busy").length;
//     const idle = total - busy;
//     if (total > 0) {
//       log("Map", `Driver count updated → Total: ${total} | Busy: ${busy} | Idle: ${idle}`);
//     }
//   }, [driverData]);

//   const sharedProps = {
//     mapRef, mapInstance, markers,
//     driverData, setDriverData,
//     selectedStatus, searchQuery, socket,
//   };

//   return (
//     <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
//       <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
//         <PageTitle title="Map" />
//         <PageSubTitle title="Driver Location & Aerial View" />
//       </div>

//       <CardContainer className="p-4 bg-[#F5F5F5]">
//         {/* Top controls */}
//         <div className="flex flex-row items-center gap-3 sm:gap-5 justify-end mb-4 pb-4">
//           <div className="md:flex flex-row gap-3 sm:gap-5 w-full sm:w-auto">
//             <CustomSelect
//               variant={2}
//               options={MAP_STATUS_OPTIONS}
//               value={selectedStatus}
//               onChange={(val) => {
//                 log("Map", `Filter changed → ${val.value}`);
//                 setSelectedStatus(val);
//               }}
//               placeholder="Driver Status"
//             />
//           </div>
//         </div>

//         {/* Map */}
//         {mapType === "barikoi" ? (
//           <BarikoiMapView {...sharedProps} />
//         ) : (
//           <GoogleMapView {...sharedProps} />
//         )}

//         {/* Legend */}
//         <div className="flex justify-center gap-10 flex-wrap py-4 mt-3 border-t">
//           <div className="flex items-center gap-2">
//             <RedCarIcon width={30} height={30} />
//             <span className="text-sm font-medium">Idle Drivers</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <GreenCarIcon width={30} height={30} />
//             <span className="text-sm font-medium">Active Drivers</span>
//           </div>
//         </div>
//       </CardContainer>
//     </div>
//   );
// };

// export default Map;