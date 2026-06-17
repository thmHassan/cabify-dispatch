import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSocket } from "../../../../components/routes/SocketProvider";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle";
import CardContainer from "../../../../components/shared/CardContainer";
import CustomSelect from "../../../../components/ui/CustomSelect";
import { MAP_STATUS_OPTIONS } from "../../../../constants/selectOptions";
import { renderToString } from "react-dom/server";
import RedCarIcon from "../../../../components/svg/RedCarIcon";
import GreenCarIcon from "../../../../components/svg/GreenCarIcon";
import AppLogoIcon from "../../../../components/svg/AppLogoIcon";
import { getTenantData } from "../../../../utils/functions/tokenEncryption";
import { apiGetCompanyApiKeys } from "../../../../services/SettingsConfigurationServices";
import { fetchMapConfiguration, MAP_PROVIDER_DEFAULT, MAP_PROVIDER_GOOGLE } from "../../../../services/mapConfigurationService";
import { apiGetPlot } from "../../../../services/PlotService";
import { apiMapifyGeocoding, normalizeMapifyFeatures } from "../../../../services/MapSearchService";
import MapSearchBox from "./components/MapSearchBox";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

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
  el.style.cssText = `width: ${iconData.scaledSize.width}px; height: ${iconData.scaledSize.height}px; cursor: pointer; display: flex; align-items: center; justify-content: center;`;
  const img = document.createElement("img");
  img.src = iconData.url;
  img.style.cssText = `width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));`;
  el.appendChild(img);
  return el;
};

const buildDriverPopupHTML = (data) => {
  const name = data.name || data.driver_name || data.driverName || "Unknown Driver";
  const phone = data.phone_no || data.phone || "N/A";
  const plate = data.plate_no || data.plate || "N/A";
  const status = (data.driving_status || data.status || "idle").toLowerCase();
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const statusColor = status === "busy" ? "#10b981" : "#ef4444";
  return `
    <div style="font-family: 'Inter', sans-serif; min-width: 150px; padding: 4px 6px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #4b5563;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span style="font-weight: 700; color: #111827; font-size: 15px;">${name}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #6b7280;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        <span style="color: #4b5563; font-size: 13px;">${phone}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #6b7280;"><rect x="1" y="3" width="22" height="18" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
        <span style="background: #f9fafb; color: #374151; font-weight: 600; font-size: 12px; padding: 1px 6px; border-radius: 4px; border: 1px solid #e5e7eb;">${plate}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px; border-top: 1px solid #f3f4f6; padding-top: 8px;">
        <span style="height: 7px; width: 7px; background-color: ${statusColor}; border-radius: 50%; display: inline-block;"></span>
        <span style="color: ${statusColor}; font-weight: 700; font-size: 12px; text-transform: capitalize; border: 1px solid ${statusColor}40; padding: 1px 8px; border-radius: 20px; background: ${statusColor}10;">${statusLabel}</span>
      </div>
    </div>
  `;
};

const COUNTRY_CENTERS = {
  IN: { lat: 20.5937, lng: 78.9629 }, AU: { lat: -25.2744, lng: 133.7751 },
  US: { lat: 37.0902, lng: -95.7129 }, GB: { lat: 55.3781, lng: -3.4360 },
  BD: { lat: 23.8103, lng: 90.4125 }, PK: { lat: 30.3753, lng: 69.3451 },
  AE: { lat: 23.4241, lng: 53.8478 }, SA: { lat: 23.8859, lng: 45.0792 },
  CA: { lat: 56.1304, lng: -106.3468 }, NG: { lat: 9.0820, lng: 8.6753 },
  KE: { lat: -1.2921, lng: 36.8219 }, ZA: { lat: -30.5595, lng: 22.9375 },
  SG: { lat: 1.3521, lng: 103.8198 }, MY: { lat: 4.2105, lng: 101.9758 },
  ID: { lat: -0.7893, lng: 113.9213 }, PH: { lat: 12.8797, lng: 121.7740 },
  NZ: { lat: -40.9006, lng: 174.8860 }, DEFAULT: { lat: 23.8103, lng: 90.4125 },
};

const getCountryCenter = (countryCode) => {
  const code = countryCode?.trim().toUpperCase();
  return COUNTRY_CENTERS[code] || COUNTRY_CENTERS.DEFAULT;
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
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

const loadMapLibre = () => {
  return new Promise((resolve, reject) => {
    if (window.maplibregl?.Map) return resolve();

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
        if (window.maplibregl?.Map) { clearInterval(check); resolve(); }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = "maplibre-script";
    script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
    script.async = true;
    script.onload = () => {
      setTimeout(() => {
        if (window.maplibregl?.Map) resolve();
        else reject(new Error("MapLibre not available after load"));
      }, 150);
    };
    script.onerror = () => reject(new Error("MapLibre script failed to load"));
    document.head.appendChild(script);
  });
};

const buildOsmFallbackStyle = () => ({
  version: 8,
  name: "OSM Fallback",
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

const animateMarker = (marker, newPosition, duration = 1000) => {
  if (!marker.getPosition) return;
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

const parseCoordinates = (plot) => {
  if (!plot) return [];
  try {
    if (plot.features) {
      const feature = typeof plot.features === "string" ? JSON.parse(plot.features) : plot.features;
      let geometry = feature.geometry;
      if (typeof geometry === "string") geometry = JSON.parse(geometry);
      let coords = geometry?.coordinates;
      if (typeof coords === "string") coords = JSON.parse(coords);
      if (Array.isArray(coords) && Array.isArray(coords[0])) {
        return coords[0].map((p) => ({ lat: Number(p[1]), lng: Number(p[0]) }));
      }
    }
    let coords = plot.coordinates;
    if (typeof coords === "string") coords = JSON.parse(coords);
    if (Array.isArray(coords)) {
      return coords.map((c) => ({ lat: Number(c.lat), lng: Number(c.lng) }));
    }
  } catch (error) {
    console.error("Parse coordinates error:", error);
  }
  return [];
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
      const idM = rawData.match(/"id":\s*(\d+)/);
      if (latM && lngM) return {
        latitude: parseFloat(latM[1]),
        longitude: parseFloat(lngM[1]),
        id: idM ? parseInt(idM[1]) : null,
        driving_status: "idle",
      };
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

const GoogleMapView = ({ mapRef, mapInstance, markers, driverData, setDriverData, selectedStatus, searchQuery, socket, apiKeys, plotsData }) => {
  const socketRef = useRef(socket);
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
  }, [plotsData, mapInstance.current]);

  useEffect(() => { socketRef.current = socket; }, [socket]);

  useEffect(() => {
    let mounted = true;
    if (!apiKeys.googleKey) return;
    loadGoogleMaps(apiKeys.googleKey).then(() => {
      if (!mounted || !mapRef.current || mapInstance.current) return;
      if (!window.google?.maps?.Map) return;
      const center = getCountryCenter(apiKeys.countryOfUse);
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 6,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      });
    });
    return () => { mounted = false; };
  }, [apiKeys.googleKey, apiKeys.countryOfUse]);

  const updateOrAddMarker = useCallback((data) => {
    if (!mapInstance.current) return;
    const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
    const latitude = data.latitude !== undefined ? data.latitude : data.lat;
    const longitude = data.longitude !== undefined ? data.longitude : data.lng;
    if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;
    const status = data.driving_status || data.status || "idle";
    const validStatus = status === "busy" ? "busy" : "idle";
    const position = { lat: Number(latitude), lng: Number(longitude) };

    if (markers.current[driverId]) {
      const marker = markers.current[driverId];
      animateMarker(marker, position, 1000);
      marker.setIcon(makeGoogleIcon(validStatus));
      marker.infoWindow?.setContent(buildDriverPopupHTML(data));
    } else {
      if (!window.google?.maps?.Marker) return;
      const marker = new window.google.maps.Marker({
        position, map: mapInstance.current, icon: makeGoogleIcon(validStatus),
      });
      const infoWindow = new window.google.maps.InfoWindow({ content: buildDriverPopupHTML(data) });
      marker.addListener("click", () => {
        Object.values(markers.current).forEach(m => m.infoWindow?.close());
        infoWindow.open(mapInstance.current, marker);
      });
      marker.infoWindow = infoWindow;
      markers.current[driverId] = marker;
    }
  }, []);

  useEffect(() => {
    if (mapInstance.current && driverData) {
      Object.values(driverData).forEach(updateOrAddMarker);
    }
  }, [mapInstance.current, driverData, updateOrAddMarker]);

  useEffect(() => {
    const handle = (rawData) => {
      const data = parseDriverData(rawData);
      if (data) {
        const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
        const latitude = data.latitude !== undefined ? data.latitude : data.lat;
        const longitude = data.longitude !== undefined ? data.longitude : data.lng;
        const position = { lat: Number(latitude), lng: Number(longitude) };
        setDriverData(prev => ({
          ...prev,
          [driverId]: { ...prev[driverId], ...data, position }
        }));
        updateOrAddMarker(data);
      }
    };
    if (socketRef.current) socketRef.current.on("driver-location-update", handle);
    return () => { if (socketRef.current) socketRef.current.off("driver-location-update", handle); };
  }, [mapInstance.current, updateOrAddMarker, setDriverData]);

  useEffect(() => {
    Object.entries(markers.current).forEach(([id, marker]) => {
      const driver = driverData[id];
      if (!driver) return;
      let visible = selectedStatus.value === "all" || (driver.driving_status || driver.status) === selectedStatus.value;
      if (searchQuery.trim()) {
        const nameMatch = driver.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const idMatch = id.toString().includes(searchQuery.toLowerCase());
        visible = visible && (nameMatch || idMatch);
      }
      marker.setVisible(visible);
    });
  }, [selectedStatus, searchQuery, driverData]);

  return <div ref={mapRef} className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm" />;
};

const DefaultMapView = ({ mapRef, mapInstance, markers, driverData, setDriverData, selectedStatus, searchQuery, socket, apiKeys, plotsData }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  useEffect(() => {
    if (!mapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapInstance.current?.resize) mapInstance.current.resize();
    });
    ro.observe(mapRef.current);
    return () => ro.disconnect();
  }, []);

  const plotsRendered = useRef(false);

  const renderPlots = (map) => {
    if (!map || !plotsData || plotsData.length === 0) return;
    const doRender = () => {
      try {
        ["plots-outline", "plots-fill"].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource("plots")) map.removeSource("plots");
        const features = plotsData.map(plot => {
          const coords = parseCoordinates(plot);
          if (coords.length === 0) return null;
          return {
            type: "Feature",
            properties: { name: plot.name || plot.plot_name || "Plot" },
            geometry: { type: "Polygon", coordinates: [coords.map(c => [c.lng, c.lat])] },
          };
        }).filter(Boolean);
        if (features.length === 0) return;
        map.addSource("plots", { type: "geojson", data: { type: "FeatureCollection", features } });
        map.addLayer({ id: "plots-fill", type: "fill", source: "plots", paint: { "fill-color": "#1F41BB", "fill-opacity": 0.15 } });
        map.addLayer({ id: "plots-outline", type: "line", source: "plots", paint: { "line-color": "#1F41BB", "line-width": 2.5, "line-opacity": 0.9 } });
        plotsRendered.current = true;
      } catch (err) { console.warn("Plot render error:", err); }
    };
    if (map.isStyleLoaded()) doRender();
    else map.once("idle", doRender);
  };

  useEffect(() => {
    if (isLoaded && mapInstance.current && plotsData?.length > 0) {
      renderPlots(mapInstance.current);
    }
  }, [isLoaded, plotsData]);

  useEffect(() => {
    if (!apiKeys.mapifyStyle) return;
    let mounted = true;

    const init = async () => {
      try {
        await loadMapLibre();
      } catch (err) {
        console.error("MapLibre load failed:", err);
        return;
      }

      if (!mounted || !mapRef.current || mapInstance.current) return;

      const container = mapRef.current;
      container.style.position = "relative";
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 50));
      if (!mounted || !mapRef.current) return;

      const center = getCountryCenter(apiKeys.countryOfUse);

      const tryInit = (style, isFallback = false) => {
        try {
          const map = new window.maplibregl.Map({
            container,
            style,
            center: [center.lng, center.lat],
            zoom: 8,
            fadeDuration: 0,
            attributionControl: true,
          });

          map.addControl(new window.maplibregl.NavigationControl(), "bottom-right");

          map.on("load", () => {
            if (!mounted) return;
            map.resize();
            setTimeout(() => {
              if (mounted) { map.resize(); setIsLoaded(true); }
            }, 150);
          });

          map.on("error", (e) => {
            const msg = e?.error?.message || String(e);
            const isAuthError = msg.includes("403") || msg.includes("401");
            const isNetworkError = msg.includes("Failed to fetch");
            const isTimeoutError = /timeout|timed out|cURL error 28|SSL connection timeout/i.test(msg);
            if (!isFallback && (isAuthError || isNetworkError || isTimeoutError)) {
              if (!map._usingFallback) {
                map._usingFallback = true;
                console.warn("Mapify tiles unavailable, switching to OSM fallback");
                map.setStyle(buildOsmFallbackStyle());
              }
            }
          });

          mapInstance.current = map;
        } catch (err) {
          console.error("Map init failed:", err);
          if (!isFallback) {
            console.warn("Retrying with OSM fallback...");
            tryInit(buildOsmFallbackStyle(), true);
          }
        }
      };

      tryInit(apiKeys.mapifyStyle);
    };

    init();

    return () => {
      mounted = false;
      if (mapInstance.current) {
        try {
          Object.values(markers.current).forEach(m => { try { m.remove(); } catch { } });
          markers.current = {};
          mapInstance.current.remove();
        } catch { }
        mapInstance.current = null;
        setIsLoaded(false);
      }
    };
  }, [apiKeys.mapifyStyle]);

  useEffect(() => {
    if (isLoaded && mapInstance.current) {
      const center = getCountryCenter(apiKeys.countryOfUse);
      mapInstance.current.jumpTo({ center: [center.lng, center.lat], zoom: 8 });
    }
  }, [apiKeys.countryOfUse, isLoaded]);

  const updateOrAddMarker = useCallback((data) => {
    if (!mapInstance.current || !isLoaded) return;
    const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
    if (driverId == null) return;
    const latitude = data.latitude !== undefined ? data.latitude : data.lat;
    const longitude = data.longitude !== undefined ? data.longitude : data.lng;
    if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;
    const status = data.driving_status || data.status || "idle";
    const validStatus = status === "busy" ? "busy" : "idle";
    const lngLat = [Number(longitude), Number(latitude)];
    const popupHTML = buildDriverPopupHTML(data);

    if (markers.current[driverId]) {
      const marker = markers.current[driverId];
      marker.setLngLat(lngLat);
      const img = marker.getElement()?.querySelector("img");
      if (img) img.src = (MARKER_ICONS[validStatus] || MARKER_ICONS.idle).url;
      marker.getPopup()?.setHTML(popupHTML);
    } else {
      try {
        const el = createSvgMarkerEl(validStatus);
        const popup = new window.maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: false })
          .setHTML(popupHTML);
        const marker = new window.maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(mapInstance.current);

        marker._isOpen = false;
        el.addEventListener("click", () => {
          if (marker._isOpen) {
            popup.remove();
            marker._isOpen = false;
          } else {
            Object.values(markers.current).forEach(m => { try { m.getPopup()?.remove(); m._isOpen = false; } catch { } });
            popup.setLngLat(lngLat).addTo(mapInstance.current);
            marker._isOpen = true;
          }
        });

        markers.current[driverId] = marker;
      } catch (err) {
        console.warn("Marker add error:", err);
      }
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && mapInstance.current && driverData) {
      Object.values(driverData).forEach(updateOrAddMarker);
    }
  }, [isLoaded, mapInstance.current, driverData, updateOrAddMarker]);

  useEffect(() => {
    const handle = (rawData) => {
      const data = parseDriverData(rawData);
      if (data) {
        const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
        const latitude = data.latitude !== undefined ? data.latitude : data.lat;
        const longitude = data.longitude !== undefined ? data.longitude : data.lng;
        const position = { lat: Number(latitude), lng: Number(longitude) };
        setDriverData(prev => ({
          ...prev,
          [driverId]: { ...prev[driverId], ...data, position }
        }));
        updateOrAddMarker(data);
      }
    };
    if (socketRef.current) socketRef.current.on("driver-location-update", handle);
    return () => { if (socketRef.current) socketRef.current.off("driver-location-update", handle); };
  }, [isLoaded, mapInstance.current, updateOrAddMarker, setDriverData]);

  useEffect(() => {
    if (!isLoaded) return;
    Object.entries(markers.current).forEach(([id, marker]) => {
      const driver = driverData[id];
      if (!driver) return;
      let visible = selectedStatus.value === "all" || (driver.driving_status || driver.status) === selectedStatus.value;
      if (searchQuery.trim()) {
        const nameMatch = driver.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const idMatch = id.toString().includes(searchQuery.toLowerCase());
        visible = visible && (nameMatch || idMatch);
      }
      try { marker.getElement().style.display = visible ? "flex" : "none"; } catch { }
    });
  }, [selectedStatus, searchQuery, driverData, isLoaded]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm"
      style={{ position: "relative" }}
    >
      {isLoaded && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-semibold text-[#1a73e8] shadow">
          <AppLogoIcon width={12} height={12} />
          <span>Mapifyit</span>
        </div>
      )}
    </div>
  );
};

const Map = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(MAP_STATUS_OPTIONS[0]);
  const [driverData, setDriverData] = useState(() => {
    try { const saved = localStorage.getItem("driverDataCache"); return saved ? JSON.parse(saved) : {}; }
    catch { return {}; }
  });


  const [mapType, setMapType] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [apiKeys, setApiKeys] = useState({
    googleKey: null,
    mapifyStyle: null,
    countryOfUse: getTenantData()?.data?.country_of_use || "IN",
  });
  const [plotsData, setPlotsData] = useState([]);
  const plotsDataRef = useRef(plotsData);
  useEffect(() => { plotsDataRef.current = plotsData; }, [plotsData]);

  useEffect(() => {
    const loadMapConfig = async () => {
      try {
        const [keysRes, mapConfig] = await Promise.all([
          apiGetCompanyApiKeys(),
          fetchMapConfiguration(),
        ]);

        if (keysRes.data?.success) {
          const data = keysRes.data.data;
          setApiKeys((prev) => ({ ...prev, countryOfUse: data.country_of_use || "IN" }));
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

    loadMapConfig();
  }, []);

  useEffect(() => {
    const fetchPlots = async () => {
      try {
        const res = await apiGetPlot({ page: 1, perPage: 1000 });
        if (res.data?.success) setPlotsData(res.data.list?.data || []);
      } catch (err) { console.error("Fetch plots error:", err); }
    };
    fetchPlots();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem("driverDataCache", JSON.stringify(driverData)), 2000);
    return () => clearTimeout(timer);
  }, [driverData]);

  const socket = useSocket();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});
  const searchMarkerRef = useRef(null);
  const searchPopupRef = useRef(null);
  const searchAbortRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = (rawData, status) => {
      let data;
      try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
      const driverId = data?.id || data?.driver_id || data?.dispatcher_id;
      if (driverId) {
      setDriverData(prev => {
          let lat = data.latitude || data.lat, lng = data.longitude || data.lng;
          if ((lat == null || lng == null) && (data.plot_id || data.plot)) {
            const pId = data.plot_id || data.plot;
            const plot = plotsDataRef.current.find(p => p.id == pId || p.plot_id == pId);
            if (plot) {
              const coords = parseCoordinates(plot);
              if (coords.length > 0) {
                lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
                lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
              }
            }
          }
          if (prev[driverId]) return { ...prev, [driverId]: { ...prev[driverId], ...data, status, driving_status: status, position: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : prev[driverId].position } };
          else if (lat && lng) return { ...prev, [driverId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } };
          return prev;
        });
      }
    };
    socket.on("waiting-driver-event", (d) => handleStatusUpdate(d, "idle"));
    socket.on("on-job-driver-event", (d) => handleStatusUpdate(d, "busy"));
    socket.on("job-accepted-by-driver", (d) => handleStatusUpdate(d, "busy"));
    socket.on("job-cancelled-by-driver", (d) => handleStatusUpdate(d, "idle"));
    return () => {
      socket.off("waiting-driver-event");
      socket.off("on-job-driver-event");
      socket.off("job-accepted-by-driver");
      socket.off("job-cancelled-by-driver");
    };
  }, [socket]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearSearchMarker = useCallback(() => {
    if (searchPopupRef.current) {
      try { searchPopupRef.current.remove(); } catch { }
      searchPopupRef.current = null;
    }
    if (searchMarkerRef.current) {
      try { searchMarkerRef.current.remove(); } catch { }
      searchMarkerRef.current = null;
    }
  }, []);

  const getMapSearchOrigin = useCallback(() => {
    if (mapType !== MAP_PROVIDER_DEFAULT || !mapInstance.current) {
      const fallback = getCountryCenter(apiKeys.countryOfUse);
      return { lat: fallback.lat, lon: fallback.lng };
    }
    const center = mapInstance.current.getCenter?.();
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      return { lat: center.lat, lon: center.lng };
    }
    const fallback = getCountryCenter(apiKeys.countryOfUse);
    return { lat: fallback.lat, lon: fallback.lng };
  }, [mapType, apiKeys.countryOfUse]);

  useEffect(() => {
    if (mapType !== MAP_PROVIDER_DEFAULT) return;
    if (!debouncedQuery) {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      setSearchLoading(false);
      setSearchError("");
      setSearchResults([]);
      return;
    }

    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const run = async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const origin = getMapSearchOrigin();
        const res = await apiMapifyGeocoding({
          query: debouncedQuery,
          lat: origin.lat,
          lon: origin.lon,
          boundaryCountry: apiKeys.countryOfUse,
          signal: controller.signal,
        });
        const results = normalizeMapifyFeatures(res?.data);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        if (error?.name === "AbortError" || error?.code === "ERR_CANCELED") return;
        setSearchResults([]);
        setSearchError(error?.response?.data?.message || "Failed to search locations");
        setShowSearchResults(true);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    };
    run();

    return () => controller.abort();
  }, [debouncedQuery, mapType, getMapSearchOrigin, apiKeys.countryOfUse]);

  const handleSelectSearchResult = useCallback((item) => {
    setSearchQuery(item.name || "");
    setShowSearchResults(false);
    clearSearchMarker();

    if (mapType !== MAP_PROVIDER_DEFAULT || !mapInstance.current || !window.maplibregl) return;

    const lngLat = [item.lon, item.lat];
    mapInstance.current.flyTo({
      center: lngLat,
      zoom: Math.max(mapInstance.current.getZoom?.() || 8, 14),
      speed: 1.2,
      curve: 1.25,
      essential: true,
    });

    const marker = new window.maplibregl.Marker({ color: "#2563eb" })
      .setLngLat(lngLat)
      .addTo(mapInstance.current);

    const popup = new window.maplibregl.Popup({ offset: 20, closeOnClick: false })
      .setLngLat(lngLat)
      .setHTML(`<div style="font-size:12px;"><strong>${item.name}</strong><br/>${item.label || ""}</div>`)
      .addTo(mapInstance.current);

    searchMarkerRef.current = marker;
    searchPopupRef.current = popup;
  }, [mapType, clearSearchMarker]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setSearchResults([]);
    setSearchError("");
    setSearchLoading(false);
    setShowSearchResults(false);
    if (searchAbortRef.current) searchAbortRef.current.abort();
    clearSearchMarker();
  }, [clearSearchMarker]);

  useEffect(() => {
    return () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      clearSearchMarker();
    };
  }, [clearSearchMarker]);

  const sharedProps = { mapRef, mapInstance, markers, driverData, setDriverData, selectedStatus, searchQuery, socket, apiKeys, plotsData };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <PageTitle title="Map" />
        <PageSubTitle title="Driver Location & Aerial View" />
      </div>
      <CardContainer className="p-4 bg-[#F5F5F5]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 justify-between mb-4 pb-4">
          {mapType === MAP_PROVIDER_DEFAULT && (
            <MapSearchBox
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setShowSearchResults(Boolean(value.trim()));
              }}
              results={searchResults}
              loading={searchLoading}
              error={searchError}
              showResults={showSearchResults && Boolean(searchQuery.trim())}
              onSelect={handleSelectSearchResult}
              onClear={handleClearSearch}
            />
          )}
          <CustomSelect
            variant={2}
            options={MAP_STATUS_OPTIONS}
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="Driver Status"
          />
        </div>

        {mapError ? (
          <div className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm flex items-center justify-center bg-gray-50 px-4 text-center">
            <p className="text-sm text-red-600">{mapError}</p>
          </div>
        ) : mapType === MAP_PROVIDER_DEFAULT ? (
          <DefaultMapView {...sharedProps} />
        ) : mapType === MAP_PROVIDER_GOOGLE ? (
          <GoogleMapView {...sharedProps} />
        ) : (
          <div className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm flex items-center justify-center bg-gray-50">
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        )}

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

// import { useEffect, useRef, useState, useCallback } from "react";
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
// import { apiGetCompanyApiKeys } from "../../../../services/SettingsConfigurationServices";

// const GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
// const BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

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
//   el.style.cssText = `width: ${iconData.scaledSize.width}px; height: ${iconData.scaledSize.height}px; cursor: pointer; display: flex; align-items: center; justify-content: center;`;
//   const img = document.createElement("img");
//   img.src = iconData.url;
//   img.style.cssText = `width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));`;
//   el.appendChild(img);
//   return el;
// };

// const buildDriverPopupHTML = (data) => {
//   const name = data.name || data.driver_name || data.driverName || "Unknown Driver";
//   const phone = data.phone_no || data.phone || "N/A";
//   const plate = data.plate_no || data.plate || "N/A";
//   const status = (data.driving_status || data.status || "idle").toLowerCase();
//   const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
//   const statusColor = status === "busy" ? "#10b981" : "#ef4444";
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
  
//   const googleKey = (stateApiKeys?.googleKey && stateApiKeys.googleKey.startsWith("AIza")) 
//     ? stateApiKeys.googleKey 
//     : (data?.google_api_key && data.google_api_key.startsWith("AIza"))
//     ? data.google_api_key
//     : GOOGLE_KEY;

//   const barikoiKey = (stateApiKeys?.barikoiKey && stateApiKeys.barikoiKey.startsWith("bkoi_"))
//     ? stateApiKeys.barikoiKey
//     : (data?.barikoi_api_key && data.barikoi_api_key.startsWith("bkoi_"))
//     ? data.barikoi_api_key
//     : BARIKOI_KEY;

//   return { googleKey, barikoiKey };
// };

// const COUNTRY_CENTERS = {
//   IN: { lat: 20.5937, lng: 78.9629 }, AU: { lat: -25.2744, lng: 133.7751 },
//   US: { lat: 37.0902, lng: -95.7129 }, GB: { lat: 55.3781, lng: -3.4360 },
//   BD: { lat: 23.8103, lng: 90.4125 }, PK: { lat: 30.3753, lng: 69.3451 },
//   AE: { lat: 23.4241, lng: 53.8478 }, SA: { lat: 23.8859, lng: 45.0792 },
//   CA: { lat: 56.1304, lng: -106.3468 }, NG: { lat: 9.0820, lng: 8.6753 },
//   KE: { lat: -1.2921, lng: 36.8219 }, ZA: { lat: -30.5595, lng: 22.9375 },
//   SG: { lat: 1.3521, lng: 103.8198 }, MY: { lat: 4.2105, lng: 101.9758 },
//   ID: { lat: -0.7893, lng: 113.9213 }, PH: { lat: 12.8797, lng: 121.7740 },
//   NZ: { lat: -40.9006, lng: 174.8860 }, DEFAULT: { lat: 0, lng: 0 },
// };

// const getCountryCenter = () => {
//   const tenant = getTenantData();
//   const code = tenant?.data?.country_of_use?.trim().toUpperCase();
//   return COUNTRY_CENTERS[code] || COUNTRY_CENTERS.DEFAULT;
// };

// const loadGoogleMaps = (apiKey) => {
//   return new Promise((resolve, reject) => {
//     if (window.google && window.google.maps) return resolve();
//     const existing = document.getElementById("google-maps-script");
//     if (existing) {
//       if (window.google?.maps) return resolve();
//       existing.onload = resolve;
//       return;
//     }
//     const script = document.createElement("script");
//     script.id = "google-maps-script";
//     script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey || GOOGLE_KEY}&libraries=places`;
//     script.async = true;
//     script.defer = true;
//     script.onload = resolve;
//     script.onerror = reject;
//     document.head.appendChild(script);
//   });
// };

// const loadBarikoiMaps = () => {
//   return new Promise((resolve, reject) => {
//     if (window.maplibregl && window.maplibregl.Map) return resolve();
//     if (!document.getElementById("maplibre-css")) {
//       const link = document.createElement("link");
//       link.id = "maplibre-css";
//       link.rel = "stylesheet";
//       link.href = "https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css";
//       document.head.appendChild(link);
//     }
//     const existing = document.getElementById("maplibre-script");
//     if (existing) {
//       existing.onload = () => window.maplibregl?.Map ? resolve() : reject(new Error("MapLibre init failed"));
//       return;
//     }
//     const script = document.createElement("script");
//     script.id = "maplibre-script";
//     script.src = "https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.js";
//     script.async = true;
//     script.onload = () => window.maplibregl?.Map ? resolve() : reject(new Error("MapLibre loaded but Map undefined"));
//     script.onerror = reject;
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
//       if (latM && lngM) return {
//         latitude: parseFloat(latM[1]),
//         longitude: parseFloat(lngM[1]),
//         client_id: cidM?.[1] ?? null,
//         dispatcher_id: didM ? parseInt(didM[1]) : null,
//         id: idM ? parseInt(idM[1]) : null,
//         name: nameM?.[1] ?? null,
//         phone_no: phoneM?.[1] ?? null,
//         plate_no: plateM?.[1] ?? null,
//         driving_status: stM?.[1] ?? "idle"
//       };
//     }
//     return null;
//   }
// };

// const makeGoogleIcon = (status) => {
//   const icon = MARKER_ICONS[status] || MARKER_ICONS.idle;
//   return { url: icon.url, scaledSize: new window.google.maps.Size(icon.scaledSize.width, icon.scaledSize.height), anchor: new window.google.maps.Point(icon.anchor.x, icon.anchor.y) };
// };

// const GoogleMapView = ({ mapRef, mapInstance, markers, driverData, setDriverData, selectedStatus, searchQuery, socket, apiKeys }) => {
//   const { googleKey } = getApiKeys(apiKeys);
//   const socketRef = useRef(socket);
//   useEffect(() => { socketRef.current = socket; }, [socket]);
//   const fitMapToMarkers = () => {
//     if (!mapInstance.current || Object.keys(markers.current).length === 0) return;
//     const bounds = new window.google.maps.LatLngBounds();
//     let hasVisible = false;
//     Object.values(markers.current).forEach((m) => { if (m.getVisible()) { bounds.extend(m.getPosition()); hasVisible = true; } });
//     if (hasVisible) {
//       mapInstance.current.fitBounds(bounds);
//       if (mapInstance.current.getZoom() > 15) mapInstance.current.setZoom(15);
//     }
//   };

//   useEffect(() => {
//     let mounted = true;
//     if (!googleKey) return;
//     loadGoogleMaps(googleKey).then(() => {
//       if (!mounted || !mapRef.current || mapInstance.current) return;
//       const center = getCountryCenter();
//       mapInstance.current = new window.google.maps.Map(mapRef.current, { center: { lat: center.lat, lng: center.lng }, zoom: 5, styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }] });
//     }).catch(err => console.error("Google Maps load failed:", err));
//     return () => { mounted = false; };
//   }, [googleKey]);

//   useEffect(() => {
//     const updateOrAddMarker = (data) => {
//       if (!mapInstance.current) return;
//       const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
//       const latitude = data.latitude !== undefined ? data.latitude : data.lat;
//       const longitude = data.longitude !== undefined ? data.longitude : data.lng;
//       const status = data.driving_status || data.status || "idle";
//       const validStatus = status === "busy" ? "busy" : "idle";
//       if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;
//       const position = { lat: Number(latitude), lng: Number(longitude) };
      
//       setDriverData((prev) => {
//         if (prev[driverId]) {
//           const old = prev[driverId];
//           if (old.position?.lat === position.lat && old.position?.lng === position.lng && old.driving_status === validStatus) {
//             return prev;
//           }
//         }
//         return { ...prev, [driverId]: { ...prev[driverId], ...data, position, driving_status: validStatus } };
//       });
//       const infoContent = buildDriverPopupHTML(data);
//       if (markers.current[driverId]) {
//         const marker = markers.current[driverId];
//         const oldPos = marker.getPosition();
//         const dist = Math.sqrt((oldPos.lat() - position.lat) ** 2 + (oldPos.lng() - position.lng) ** 2);
//         dist < 0.01 ? animateMarker(marker, position, 1000) : marker.setPosition(position);
//         marker.setIcon(makeGoogleIcon(validStatus));
//         marker.infoWindow?.setContent(infoContent);
//       } else {
//         const marker = new window.google.maps.Marker({ position, map: mapInstance.current, icon: makeGoogleIcon(validStatus), animation: window.google.maps.Animation.DROP });
//         const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });

//         marker.addListener("click", () => {
//           Object.values(markers.current).forEach(m => m.infoWindow?.close());
//           infoWindow.open(mapInstance.current, marker);
//         });
//         marker.infoWindow = infoWindow;
//         markers.current[driverId] = marker;
//       }
//     };

//     if (mapInstance.current && driverData) { Object.values(driverData).forEach(data => updateOrAddMarker(data)); }
//     const handle = (rawData) => { const data = parseDriverData(rawData); if (data) updateOrAddMarker(data); };
//     if (socketRef.current) socketRef.current.on("driver-location-update", handle);
//     return () => { if (socketRef.current) socketRef.current.off("driver-location-update", handle); };
//   }, [mapInstance.current]);

//   useEffect(() => {
//     Object.entries(markers.current).forEach(([id, marker]) => {
//       const driver = driverData[id];
//       if (!driver) return;
//       let visible = selectedStatus.value === "all" || driver.driving_status === selectedStatus.value;
//       if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); visible = visible && (driver.name?.toLowerCase().includes(q) || id.toString().includes(q)); }
//       marker.setVisible(visible);
//     });
//     // ONLY fit bounds once on initial load to avoid constant map jumping/lag
//     if (mapInstance.current && !mapInstance.current._hasFittedOnce && Object.keys(markers.current).length > 0) {
//       setTimeout(fitMapToMarkers, 500);
//       mapInstance.current._hasFittedOnce = true;
//     }
//   }, [selectedStatus, searchQuery, driverData]);
//   return <div ref={mapRef} className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm" />;
// };

// const BarikoiMapView = ({ mapRef, mapInstance, markers, driverData, setDriverData, selectedStatus, searchQuery, socket, apiKeys }) => {
//   const [isLoaded, setIsLoaded] = useState(false);
//   const { barikoiKey } = getApiKeys(apiKeys);
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
//     if (hasVisible) mapInstance.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 15 });
//   };

//   useEffect(() => {
//     let mounted = true;
//     if (!barikoiKey) return;

//     loadBarikoiMaps().then(() => {
//       if (!mounted || !mapRef.current || mapInstance.current) return;
//       const center = getCountryCenter();
//       mapInstance.current = new window.maplibregl.Map({ container: mapRef.current, style: `https://map.barikoi.com/styles/osm-liberty/style.json?key=${barikoiKey}`, center: [center.lng, center.lat], zoom: 6 });
//       mapInstance.current.on("load", () => { mapInstance.current.resize(); setIsLoaded(true); });
//       mapInstance.current.addControl(new window.maplibregl.NavigationControl());
//     }).catch(err => console.error("Barikoi Maps load failed:", err));
//     return () => {
//       mounted = false;
//       if (mapInstance.current) {
//         Object.values(markers.current).forEach(m => m.remove());
//         markers.current = {};
//         if (typeof mapInstance.current.remove === "function") {
//           mapInstance.current.remove();
//         }
//         mapInstance.current = null;
//       }
//     };
//   }, [barikoiKey]);

//   useEffect(() => {
//     if (!isLoaded) return;
//     const updateOrAddMarker = (data) => {
//       if (!mapInstance.current) return;
//       const driverId = data.id || data.driver_id || data.dispatcher_id || data.client_id;
//       const latitude = data.latitude !== undefined ? data.latitude : data.lat;
//       const longitude = data.longitude !== undefined ? data.longitude : data.lng;
//       const status = data.driving_status || data.status || "idle";
//       const validStatus = status === "busy" ? "busy" : "idle";

//       if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;

//       const position = { lat: Number(latitude), lng: Number(longitude) };
//       setDriverData((prev) => {
//         if (prev[driverId]) {
//           const old = prev[driverId];
//           if (old.position?.lat === position.lat && old.position?.lng === position.lng && old.driving_status === validStatus) {
//             return prev;
//           }
//         }
//         return { ...prev, [driverId]: { ...prev[driverId], ...data, position, driving_status: validStatus } };
//       });
//       const lngLat = [position.lng, position.lat];
//       const popupHTML = buildDriverPopupHTML(data);

//       if (markers.current[driverId]) {
//         markers.current[driverId].setLngLat(lngLat);
//         const img = markers.current[driverId].getElement().querySelector("img");
//         if (img) img.src = (MARKER_ICONS[validStatus] || MARKER_ICONS.idle).url;
//         markers.current[driverId].getPopup()?.setHTML(popupHTML);
//       } else {
//         const el = createSvgMarkerEl(validStatus);
//         const popup = new window.maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: false }).setHTML(popupHTML);
//         const marker = new window.maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(lngLat).setPopup(popup).addTo(mapInstance.current);
//         marker._visible = true;
//         marker._isOpen = false;
//         el.addEventListener("click", () => {
//           if (marker._isOpen) {
//             popup.remove();
//             marker._isOpen = false;
//           } else {
//             Object.values(markers.current).forEach(m => {
//               m.getPopup()?.remove();
//               m._isOpen = false;
//             });
//             popup.setLngLat(lngLat).addTo(mapInstance.current);
//             marker._isOpen = true;
//           }
//         });
//         markers.current[driverId] = marker;
//       }
//     };

//     if (mapInstance.current && driverData) { Object.values(driverData).forEach(data => updateOrAddMarker(data)); }
//     const handle = (rawData) => { const data = parseDriverData(rawData); if (data) updateOrAddMarker(data); };
//     if (socketRef.current) socketRef.current.on("driver-location-update", handle);
//     return () => { if (socketRef.current) socketRef.current.off("driver-location-update", handle); };
//   }, [isLoaded]);

//   useEffect(() => {
//     Object.entries(markers.current).forEach(([id, marker]) => {
//       const driver = driverData[id];
//       if (!driver) return;
//       let visible = selectedStatus.value === "all" || driver.driving_status === selectedStatus.value;
//       if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); visible = visible && (driver.name?.toLowerCase().includes(q) || id.toString().includes(q)); }
//       marker._visible = visible;
//       marker.getElement().style.display = visible ? "flex" : "none";
//     });
//     // ONLY fit bounds once on initial load or when count changes significantly to avoid constant map jumping/lag
//     if (isLoaded && mapInstance.current && !mapInstance.current._hasFittedOnce && Object.keys(markers.current).length > 0) {
//       setTimeout(() => {
//         if (mapInstance.current) {
//           fitMapToMarkers();
//           mapInstance.current._hasFittedOnce = true;
//         }
//       }, 1000);
//     }
//   }, [selectedStatus, searchQuery, driverData, isLoaded]);
//   return <div ref={mapRef} className="w-full h-[550px] rounded-xl border border-gray-300 shadow-sm" />;
// };

// const Map = () => {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedStatus, setSelectedStatus] = useState(MAP_STATUS_OPTIONS.find(o => o.value === "all") ?? MAP_STATUS_OPTIONS[0]);
//   const [driverData, setDriverData] = useState(() => {
//     try { const saved = localStorage.getItem("driverDataCache"); return saved ? JSON.parse(saved) : {}; }
//     catch { return {}; }
//   });
//   const [mapType, setMapType] = useState(() => getMapType());
//   const [apiKeys, setApiKeys] = useState({ googleKey: GOOGLE_KEY, barikoiKey: BARIKOI_KEY, searchApi: "google" });

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       localStorage.setItem("driverDataCache", JSON.stringify(driverData));
//     }, 2000); // Debounce localStorage updates
//     return () => clearTimeout(timer);
//   }, [driverData]);

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
//           if (data.maps_api) setMapType(data.maps_api.toLowerCase());
//         }
//       } catch (err) { console.error("Fetch API keys error:", err); }
//     };
//     fetchApiKeys();
//   }, []);

//   const socket = useSocket();
//   const mapRef = useRef(null);
//   const mapInstance = useRef(null);
//   const markers = useRef({});

//   useEffect(() => {
//     if (!socket) return;
//     const handleStatusUpdate = (rawData, status) => {
//       let data; try { data = typeof rawData === "string" ? JSON.parse(rawData) : rawData; } catch { data = rawData; }
//       const driverId = data?.id || data?.driver_id || data?.dispatcher_id;
//       if (driverId) {
//         setDriverData(prev => {
//           const lat = data.latitude || data.lat;
//           const lng = data.longitude || data.lng;
          
//           if (prev[driverId]) {
//             return { ...prev, [driverId]: { ...prev[driverId], ...data, status, driving_status: status } };
//           } else if (lat && lng) {
//             // Add new driver if they have coordinates
//             return { ...prev, [driverId]: { ...data, position: { lat: Number(lat), lng: Number(lng) }, status, driving_status: status } };
//           }
//           return prev;
//         });
//       }
//     };

//     socket.on("waiting-driver-event", (data) => handleStatusUpdate(data, "idle"));
//     socket.on("on-job-driver-event", (data) => handleStatusUpdate(data, "busy"));
//     socket.on("job-accepted-by-driver", (data) => handleStatusUpdate(data, "busy"));
//     socket.on("job-cancelled-by-driver", (data) => handleStatusUpdate(data, "idle"));
//     return () => {
//       socket.off("waiting-driver-event"); socket.off("on-job-driver-event");
//       socket.off("job-accepted-by-driver"); socket.off("job-cancelled-by-driver");
//     };
//   }, [socket]);

//   const sharedProps = { mapRef, mapInstance, markers, driverData, setDriverData, selectedStatus, searchQuery, socket, apiKeys };

//   return (
//     <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
//       <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
//         <PageTitle title="Map" />
//         <PageSubTitle title="Driver Location & Aerial View" />
//       </div>
//       <CardContainer className="p-4 bg-[#F5F5F5]">
//         <div className="flex flex-row items-center gap-3 sm:gap-5 justify-end mb-4 pb-4">
//           <div className="md:flex flex-row gap-3 sm:gap-5 w-full sm:w-auto">
//             <CustomSelect variant={2} options={MAP_STATUS_OPTIONS} value={selectedStatus} onChange={setSelectedStatus} placeholder="Driver Status" />
//           </div>
//         </div>
//         {mapType === "barikoi" && apiKeys.barikoiKey ? (
//                 <BarikoiMapView {...sharedProps} />
//               ) : apiKeys.googleKey ? (
//                 <GoogleMapView {...sharedProps} />
//               ) : null}
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