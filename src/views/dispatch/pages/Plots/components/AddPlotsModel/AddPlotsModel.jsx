import { ErrorMessage, Field, Form, Formik } from "formik";
import React, { useRef, useState, useEffect, useCallback } from "react";
import FormLabel from "../../../../../../components/ui/FormLabel/FormLabel";
import { unlockBodyScroll } from "../../../../../../utils/functions/common.function";
import Button from "../../../../../../components/ui/Button/Button";
import { apiCreatePlot, apiEditPlot, apiGetPlot } from "../../../../../../services/PlotService";
import { PLOT_VALIDATION_SCHEMA } from "../../../../validators/pages/plot.validation";
import toast from "react-hot-toast";

const AddPlotsModel = ({ initialValue = {}, existingPlots = [], setIsOpen, onPlotsCreated }) => {
  const [submitError, setSubmitError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [allPlots, setAllPlots] = useState(() => {
    return initialValue?.id
      ? existingPlots.filter(p => p.id !== initialValue.id)
      : existingPlots;
  });
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [coordinates, setCoordinates] = useState(
    Array.isArray(initialValue?.coordinates) ? initialValue.coordinates : []
  );

  const mapWrapperRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonRef = useRef(null);
  const markersRef = useRef([]);
  const coordinatesRef = useRef(coordinates);
  const existingPolygonsRef = useRef([]);
  const formikSetFieldRef = useRef(null);

  useEffect(() => { coordinatesRef.current = coordinates; }, [coordinates]);
  useEffect(() => { setIsEditMode(!!initialValue?.id); }, [initialValue]);

  useEffect(() => {
    if (!mapWrapperRef.current) return;

    if (!mapContainerRef.current) {
      const div = document.createElement("div");
      div.style.cssText = "width:100%;height:100%;";
      mapContainerRef.current = div;
    }
    mapWrapperRef.current.appendChild(mapContainerRef.current);

    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch { }
        mapInstanceRef.current = null;
      }
      try {
        if (mapContainerRef.current?.parentNode) {
          mapContainerRef.current.parentNode.removeChild(mapContainerRef.current);
        }
      } catch { }
    };
  }, []);

  useEffect(() => {
    const fetchAllPlots = async () => {
      setLoadingPlots(true);
      try {
        const res = await apiGetPlot({ page: 1, perPage: 100 });
        if (res?.data?.success === 1) {
          const plots = res?.data?.list?.data || [];
          setAllPlots(initialValue?.id ? plots.filter(p => p.id !== initialValue.id) : plots);
        }
      } catch (e) { console.error(e); }
      finally { setLoadingPlots(false); }
    };
    fetchAllPlots();
  }, [initialValue?.id]);

  useEffect(() => {
    if (window.L) { setMapLoaded(true); return; }
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
      document.head.appendChild(l);
    }
    if (!document.querySelector('script[src*="leaflet.js"]')) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
      s.onload = () => setMapLoaded(true);
      s.onerror = () => console.error("Leaflet load failed");
      document.body.appendChild(s);
    } else if (window.L) setMapLoaded(true);
  }, []);

  const parseCoordinates = useCallback((plot) => {
    if (!plot) return [];
    try {
      const features = typeof plot.features === "string" ? JSON.parse(plot.features) : plot.features;
      let coordData = features?.geometry?.coordinates;
      if (typeof coordData === "string") coordData = JSON.parse(coordData);
      const coords = Array.isArray(coordData) ? coordData[0] : coordData;
      if (Array.isArray(coords) && coords.length) {
        return coords.map(pair =>
          Array.isArray(pair) && pair.length >= 2
            ? { lat: Number(pair[1]), lng: Number(pair[0]) }
            : null
        ).filter(Boolean);
      }
      if (Array.isArray(plot.coordinates) && plot.coordinates.length) {
        return plot.coordinates.map(pair => {
          if (!Array.isArray(pair) || pair.length < 2) return null;
          const [a, b] = pair;
          return Math.abs(Number(a)) <= 90
            ? { lat: Number(a), lng: Number(b) }
            : { lat: Number(b), lng: Number(a) };
        }).filter(Boolean);
      }
      if (plot.lat && plot.lng) return [{ lat: Number(plot.lat), lng: Number(plot.lng) }];
    } catch (e) { console.error(e); }
    return [];
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current || !window.L) return;

    const map = window.L.map(mapContainerRef.current).setView([20, 0], 2);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(map);

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      const newCoords = [...coordinatesRef.current, [lng, lat]];
      coordinatesRef.current = newCoords;
      setCoordinates(newCoords);
      if (formikSetFieldRef.current) formikSetFieldRef.current("coordinates", newCoords);

      const m = window.L.circleMarker([lat, lng], {
        radius: 6, fillColor: "#3B82F6", color: "#fff", weight: 2, fillOpacity: 0.8,
      }).addTo(map);
      m.bindTooltip(`${newCoords.length}`, { permanent: true, direction: "center", className: "coordinate-label" });
      markersRef.current.push(m);

      if (newCoords.length >= 3) {
        if (polygonRef.current) map.removeLayer(polygonRef.current);
        polygonRef.current = window.L.polygon(newCoords.map(c => [c[1], c[0]]), {
          color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.2, weight: 2,
        }).addTo(map);
      }
    });

    const initCoords = coordinatesRef.current;
    if (initCoords.length >= 3) {
      initCoords.forEach((c, idx) => {
        const m = window.L.circleMarker([c[1], c[0]], {
          radius: 6, fillColor: "#3B82F6", color: "#fff", weight: 2, fillOpacity: 0.8,
        }).addTo(map);
        m.bindTooltip(`${idx + 1}`, { permanent: true, direction: "center", className: "coordinate-label" });
        markersRef.current.push(m);
      });
      polygonRef.current = window.L.polygon(initCoords.map(c => [c[1], c[0]]), {
        color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.2, weight: 2,
      }).addTo(map);
      map.fitBounds(polygonRef.current.getBounds());
    }

    mapInstanceRef.current = map;
    setMapReady(true);
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapReady || !mapInstanceRef.current || !window.L) return;

    existingPolygonsRef.current.forEach(p => {
      try { mapInstanceRef.current.removeLayer(p); } catch { }
    });
    existingPolygonsRef.current = [];

    if (!allPlots.length) return;

    const colors = ["#9CA3AF", "#6B7280", "#4B5563", "#374151"];

    allPlots.forEach((plot, i) => {
      const coords = parseCoordinates(plot);
      if (coords.length < 3) return;
      const color = colors[i % 4];

      const p = window.L.polygon(coords.map(c => [c.lat, c.lng]), {
        color, fillOpacity: 0.1, weight: 2, dashArray: "5,5",
      }).addTo(mapInstanceRef.current);
      p.bindPopup(`<div style="padding:8px;font-weight:600">${plot.name}</div>`);
      existingPolygonsRef.current.push(p);
    });
  }, [allPlots, mapLoaded, mapReady, parseCoordinates]);

  const handleClearCoordinates = useCallback((setFieldValue) => {
    setCoordinates([]); coordinatesRef.current = [];
    setFieldValue("coordinates", []);
    if (mapInstanceRef.current) {
      markersRef.current.forEach(m => { try { mapInstanceRef.current.removeLayer(m); } catch { } });
      if (polygonRef.current) { try { mapInstanceRef.current.removeLayer(polygonRef.current); } catch { } polygonRef.current = null; }
    }
    markersRef.current = [];
  }, []);

  const handleRemoveLastPoint = useCallback((currentCoords, setFieldValue) => {
    if (!currentCoords.length) return;
    const newCoords = currentCoords.slice(0, -1);
    setCoordinates(newCoords); coordinatesRef.current = newCoords;
    setFieldValue("coordinates", newCoords);
    if (mapInstanceRef.current) {
      const last = markersRef.current.pop();
      if (last) { try { mapInstanceRef.current.removeLayer(last); } catch { } }
      if (polygonRef.current) { try { mapInstanceRef.current.removeLayer(polygonRef.current); } catch { } polygonRef.current = null; }
      if (newCoords.length >= 3) {
        polygonRef.current = window.L.polygon(newCoords.map(c => [c[1], c[0]]), {
          color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.2, weight: 2,
        }).addTo(mapInstanceRef.current);
      }
    }
  }, []);

  const handleSubmit = async (values) => {
    setIsLoading(true); setSubmitError(null);
    try {
      const fd = new FormData();
      if (isEditMode) fd.append("id", initialValue.id);
      fd.append("name", values.name || "");
      fd.append("features[type]", "Feature");
      fd.append("features[properties][name]", values.name);
      fd.append("features[geometry][type]", "Polygon");
      const closed = [...coordinates, coordinates[0]];
      fd.append("features[geometry][coordinates]", JSON.stringify([closed]));
      const res = isEditMode ? await apiEditPlot(fd) : await apiCreatePlot(fd);
      if (res?.data?.success === 1 || res?.status === 200) {
        toast.success(isEditMode ? "Plot updated successfully" : "Plot created successfully");
        if (onPlotsCreated) onPlotsCreated();
        unlockBodyScroll();
        setIsOpen({ type: "new", isOpen: false });
      } else {
        setSubmitError(res?.data?.message || `Failed to ${isEditMode ? "update" : "create"} plot`);
      }
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "An error occurred");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="w-full">
      <Formik
        initialValues={{ name: initialValue?.name || "", coordinates }}
        validationSchema={PLOT_VALIDATION_SCHEMA}
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue }) => {
          formikSetFieldRef.current = setFieldValue;

          return (
            <Form>
              <div className="text-xl sm:text-2xl lg:text-[26px] font-semibold text-[#252525] mb-4 sm:mb-6 lg:mb-7 text-center">
                <span className="block">{isEditMode ? "Edit Plot" : "Add New Plot"}</span>
              </div>

              {submitError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{submitError}</div>
              )}

              <div className="w-full mb-4">
                <FormLabel htmlFor="name">Plot Name</FormLabel>
                <div className="sm:h-16 h-10">
                  <Field
                    type="text" name="name"
                    className="sm:px-5 px-4 sm:py-[21px] py-3 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                    placeholder="Enter Plot Name"
                  />
                </div>
                <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              <div className="mb-3 flex justify-between items-center">
                <div />
                {coordinates.length > 0 && (
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => handleRemoveLastPoint(coordinates, setFieldValue)}
                      className="text-orange-600 hover:text-orange-800 font-medium text-xs bg-white px-2 py-1 rounded border border-orange-200">
                      Remove Last
                    </button>
                    <button type="button"
                      onClick={() => handleClearCoordinates(setFieldValue)}
                      className="text-red-600 hover:text-red-800 font-medium text-xs bg-white px-2 py-1 rounded border border-red-200">
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-gray-200 mb-3">
                <div ref={mapWrapperRef} className="w-full h-full">
                  {!mapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                        <p className="text-gray-600 text-sm">Loading map...</p>
                      </div>
                    </div>
                  )}
                </div>
                {loadingPlots && (
                  <div className="absolute top-4 right-4 bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200 z-10">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                      <span className="text-sm text-gray-600">Loading plots...</span>
                    </div>
                  </div>
                )}
                {allPlots.length > 0 && mapLoaded && (
                  <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200 z-10">
                    <div className="text-xs text-gray-600">
                      Showing {allPlots.length} existing plot{allPlots.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-white px-2 py-1 rounded shadow text-xs text-gray-500 border border-gray-200 z-10">
                  🗺 OpenStreetMap
                </div>
              </div>

              <ErrorMessage name="coordinates" component="div" className="text-red-500 text-sm mb-3" />

              <style>{`
                .coordinate-label {
                  background: transparent !important;
                  border: none !important;
                  box-shadow: none !important;
                  font-weight: bold;
                  color: #1e40af;
                  font-size: 12px;
                }
                .coordinate-label::before { display: none; }
              `}</style>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-end mt-3">
                <Button btnSize="md" type="filledGray"
                  className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
                  onClick={() => { unlockBodyScroll(); setIsOpen({ type: "new", isOpen: false }); }}>
                  <span>Cancel</span>
                </Button>
                <Button btnType="submit" btnSize="md" type="filled"
                  className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
                  disabled={isLoading || coordinates.length < 3}>
                  <span>
                    {isLoading
                      ? (isEditMode ? "Updating..." : "Creating...")
                      : (isEditMode ? "Update" : "Create")}
                  </span>
                </Button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default AddPlotsModel;

// import { ErrorMessage, Field, Form, Formik } from "formik";
// import React, { useRef, useState, useEffect, useCallback } from "react";
// import FormLabel from "../../../../../../components/ui/FormLabel/FormLabel";
// import { unlockBodyScroll } from "../../../../../../utils/functions/common.function";
// import Button from "../../../../../../components/ui/Button/Button";
// import { apiCreatePlot, apiEditPlot, apiGetPlot } from "../../../../../../services/PlotService";
// import { PLOT_VALIDATION_SCHEMA } from "../../../../validators/pages/plot.validation";
// import toast from "react-hot-toast";
// import { getTenantData } from "../../../../../../utils/functions/tokenEncryption";

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
//   DEFAULT: { lat: 0, lng: 20 },
// };

// const getCountryCenter = () => {
//   const tenant = getTenantData();
//   const code = tenant?.country_of_use?.trim().toUpperCase();
//   return COUNTRY_CENTERS[code] || COUNTRY_CENTERS.DEFAULT;
// };

// const getMapType = () => {
//   try {
//     const tenant = getTenantData();
//     const mapsApi = tenant?.maps_api?.trim().toLowerCase();
//     const country = tenant?.country_of_use?.trim().toUpperCase();
//     if (country === "IN") return mapsApi === "google" ? "google" : "barikoi";
//     return mapsApi === "barikoi" ? "barikoi" : "google";
//   } catch {
//     return "google";
//   }
// };

// const BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";
// const MAP_TYPE = getMapType();

// const AddPlotsModel = ({ initialValue = {}, existingPlots = [], setIsOpen, onPlotsCreated }) => {
//   const [submitError, setSubmitError] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [mapLoaded, setMapLoaded] = useState(false);
//   const [allPlots, setAllPlots] = useState(() => {
//     return initialValue?.id
//       ? existingPlots.filter(p => p.id !== initialValue.id)
//       : existingPlots;
//   });
//   const [loadingPlots, setLoadingPlots] = useState(false);
//   const [mapReady, setMapReady] = useState(false);
//   const [coordinates, setCoordinates] = useState(
//     Array.isArray(initialValue?.coordinates) ? initialValue.coordinates : []
//   );

//   const mapWrapperRef = useRef(null);
//   const mapContainerRef = useRef(null);
//   const mapInstanceRef = useRef(null);
//   const polygonRef = useRef(null);
//   const markersRef = useRef([]);
//   const coordinatesRef = useRef(coordinates);
//   const existingPolygonsRef = useRef([]);
//   const formikSetFieldRef = useRef(null);

//   useEffect(() => { coordinatesRef.current = coordinates; }, [coordinates]);
//   useEffect(() => { setIsEditMode(!!initialValue?.id); }, [initialValue]);

//   useEffect(() => {
//     if (!mapWrapperRef.current) return;

//     if (!mapContainerRef.current) {
//       const div = document.createElement("div");
//       div.style.cssText = "width:100%;height:100%;";
//       mapContainerRef.current = div;
//     }
//     mapWrapperRef.current.appendChild(mapContainerRef.current);

//     return () => {
//       if (mapInstanceRef.current) {
//         if (MAP_TYPE === "barikoi") {
//           try { mapInstanceRef.current.remove(); } catch { }
//         } else {
//           try { markersRef.current.forEach(m => m.setMap(null)); } catch { }
//           try { if (polygonRef.current) polygonRef.current.setMap(null); } catch { }
//           try { existingPolygonsRef.current.forEach(p => p.setMap(null)); } catch { }
//         }
//         mapInstanceRef.current = null;
//       }
//       try {
//         if (mapContainerRef.current?.parentNode) {
//           mapContainerRef.current.parentNode.removeChild(mapContainerRef.current);
//         }
//       } catch { }
//     };
//   }, []);

//   useEffect(() => {
//     const fetchAllPlots = async () => {
//       setLoadingPlots(true);
//       try {
//         const res = await apiGetPlot({ page: 1, perPage: 100 });
//         if (res?.data?.success === 1) {
//           const plots = res?.data?.list?.data || [];
//           setAllPlots(initialValue?.id ? plots.filter(p => p.id !== initialValue.id) : plots);
//         }
//       } catch (e) { console.error(e); }
//       finally { setLoadingPlots(false); }
//     };
//     fetchAllPlots();
//   }, [initialValue?.id]);

//   useEffect(() => {
//     if (MAP_TYPE === "barikoi") {
//       if (window.L) { setMapLoaded(true); return; }
//       if (!document.querySelector('link[href*="leaflet.css"]')) {
//         const l = document.createElement("link");
//         l.rel = "stylesheet";
//         l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
//         document.head.appendChild(l);
//       }
//       if (!document.querySelector('script[src*="leaflet.js"]')) {
//         const s = document.createElement("script");
//         s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
//         s.onload = () => setMapLoaded(true);
//         s.onerror = () => console.error("Leaflet load failed");
//         document.body.appendChild(s);
//       } else if (window.L) setMapLoaded(true);
//     } else {
//       if (window.google?.maps) { setMapLoaded(true); return; }
//       const existing = document.getElementById("google-maps-script");
//       if (existing) { existing.addEventListener("load", () => setMapLoaded(true)); return; }
//       const s = document.createElement("script");
//       s.id = "google-maps-script";
//       s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places,geometry`;
//       s.async = true; s.defer = true;
//       s.onload = () => setMapLoaded(true);
//       s.onerror = () => console.error("Google Maps load failed");
//       document.head.appendChild(s);
//     }
//   }, []);

//   const parseCoordinates = useCallback((plot) => {
//     if (!plot) return [];
//     try {
//       const features = typeof plot.features === "string" ? JSON.parse(plot.features) : plot.features;
//       let coordData = features?.geometry?.coordinates;
//       if (typeof coordData === "string") coordData = JSON.parse(coordData);
//       const coords = Array.isArray(coordData) ? coordData[0] : coordData;
//       if (Array.isArray(coords) && coords.length) {
//         return coords.map(pair =>
//           Array.isArray(pair) && pair.length >= 2
//             ? { lat: Number(pair[1]), lng: Number(pair[0]) }
//             : null
//         ).filter(Boolean);
//       }
//       if (Array.isArray(plot.coordinates) && plot.coordinates.length) {
//         return plot.coordinates.map(pair => {
//           if (!Array.isArray(pair) || pair.length < 2) return null;
//           const [a, b] = pair;
//           return Math.abs(Number(a)) <= 90
//             ? { lat: Number(a), lng: Number(b) }
//             : { lat: Number(b), lng: Number(a) };
//         }).filter(Boolean);
//       }
//       if (plot.lat && plot.lng) return [{ lat: Number(plot.lat), lng: Number(plot.lng) }];
//     } catch (e) { console.error(e); }
//     return [];
//   }, []);

//   useEffect(() => {
//     if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

//     const center = getCountryCenter();

//     if (MAP_TYPE === "barikoi" && window.L) {
//       const map = window.L.map(mapContainerRef.current).setView([center.lat, center.lng], 5);

//       const tile = window.L.tileLayer(
//         `https://map.barikoi.com/styles/osm-bright/{z}/{x}/{y}.png?key=${BARIKOI_KEY}`,
//         { attribution: "© Barikoi", maxZoom: 19 }
//       );
//       tile.on("tileerror", () => {
//         tile.off("tileerror"); map.removeLayer(tile);
//         window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//           attribution: "© OpenStreetMap", maxZoom: 19,
//         }).addTo(map);
//       });
//       tile.addTo(map);

//       map.on("click", (e) => {
//         const { lat, lng } = e.latlng;
//         const newCoords = [...coordinatesRef.current, [lng, lat]];
//         coordinatesRef.current = newCoords;
//         setCoordinates(newCoords);
//         if (formikSetFieldRef.current) formikSetFieldRef.current("coordinates", newCoords);

//         const m = window.L.circleMarker([lat, lng], {
//           radius: 6, fillColor: "#3B82F6", color: "#fff", weight: 2, fillOpacity: 0.8,
//         }).addTo(map);
//         m.bindTooltip(`${newCoords.length}`, { permanent: true, direction: "center", className: "coordinate-label" });
//         markersRef.current.push(m);

//         if (newCoords.length >= 3) {
//           if (polygonRef.current) map.removeLayer(polygonRef.current);
//           polygonRef.current = window.L.polygon(newCoords.map(c => [c[1], c[0]]), {
//             color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.2, weight: 2,
//           }).addTo(map);
//         }
//       });

//       const initCoords = coordinatesRef.current;
//       if (initCoords.length >= 3) {
//         initCoords.forEach((c, idx) => {
//           const m = window.L.circleMarker([c[1], c[0]], {
//             radius: 6, fillColor: "#3B82F6", color: "#fff", weight: 2, fillOpacity: 0.8,
//           }).addTo(map);
//           m.bindTooltip(`${idx + 1}`, { permanent: true, direction: "center", className: "coordinate-label" });
//           markersRef.current.push(m);
//         });
//         polygonRef.current = window.L.polygon(initCoords.map(c => [c[1], c[0]]), {
//           color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.2, weight: 2,
//         }).addTo(map);
//         map.fitBounds(polygonRef.current.getBounds());
//       }

//       mapInstanceRef.current = map;
//       setMapReady(true);
//     } else if (MAP_TYPE === "google" && window.google?.maps) {
//       const map = new window.google.maps.Map(mapContainerRef.current, {
//         center: { lat: center.lat, lng: center.lng }, zoom: 5,
//         styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
//       });

//       map.addListener("click", (e) => {
//         const lat = e.latLng.lat(), lng = e.latLng.lng();
//         const newCoords = [...coordinatesRef.current, [lng, lat]];
//         coordinatesRef.current = newCoords;
//         setCoordinates(newCoords);
//         if (formikSetFieldRef.current) formikSetFieldRef.current("coordinates", newCoords);

//         const m = new window.google.maps.Marker({
//           position: { lat, lng }, map,
//           label: { text: `${newCoords.length}`, color: "#1e40af", fontWeight: "bold", fontSize: "12px" },
//           icon: {
//             path: window.google.maps.SymbolPath.CIRCLE,
//             scale: 8, fillColor: "#3B82F6", fillOpacity: 0.8, strokeColor: "#fff", strokeWeight: 2,
//           },
//         });
//         markersRef.current.push(m);

//         if (newCoords.length >= 3) {
//           if (polygonRef.current) polygonRef.current.setMap(null);
//           polygonRef.current = new window.google.maps.Polygon({
//             paths: newCoords.map(c => ({ lat: c[1], lng: c[0] })),
//             strokeColor: "#3B82F6", strokeOpacity: 0.9, strokeWeight: 2,
//             fillColor: "#3B82F6", fillOpacity: 0.2, map,
//           });
//         }
//       });

//       const initCoords = coordinatesRef.current;
//       if (initCoords.length >= 3) {
//         initCoords.forEach((c, idx) => {
//           markersRef.current.push(new window.google.maps.Marker({
//             position: { lat: c[1], lng: c[0] }, map,
//             label: { text: `${idx + 1}`, color: "#1e40af", fontWeight: "bold", fontSize: "12px" },
//             icon: {
//               path: window.google.maps.SymbolPath.CIRCLE,
//               scale: 8, fillColor: "#3B82F6", fillOpacity: 0.8, strokeColor: "#fff", strokeWeight: 2,
//             },
//           }));
//         });
//         polygonRef.current = new window.google.maps.Polygon({
//           paths: initCoords.map(c => ({ lat: c[1], lng: c[0] })),
//           strokeColor: "#3B82F6", strokeOpacity: 0.9, strokeWeight: 2,
//           fillColor: "#3B82F6", fillOpacity: 0.2, map,
//         });
//         const bounds = new window.google.maps.LatLngBounds();
//         initCoords.forEach(c => bounds.extend({ lat: c[1], lng: c[0] }));
//         map.fitBounds(bounds);
//       }

//       mapInstanceRef.current = map;
//       setMapReady(true);
//     }
//   }, [mapLoaded]);

//   useEffect(() => {
//     if (!mapLoaded || !mapReady || !mapInstanceRef.current) return;

//     if (MAP_TYPE === "barikoi") {
//       existingPolygonsRef.current.forEach(p => {
//         try { mapInstanceRef.current.removeLayer(p); } catch { }
//       });
//     } else {
//       existingPolygonsRef.current.forEach(p => {
//         try { p.setMap(null); } catch { }
//       });
//     }
//     existingPolygonsRef.current = [];

//     if (!allPlots.length) return;

//     const colors = ["#9CA3AF", "#6B7280", "#4B5563", "#374151"];

//     allPlots.forEach((plot, i) => {
//       const coords = parseCoordinates(plot);
//       if (coords.length < 3) return;
//       const color = colors[i % 4];

//       if (MAP_TYPE === "barikoi" && window.L) {
//         const p = window.L.polygon(coords.map(c => [c.lat, c.lng]), {
//           color, fillOpacity: 0.1, weight: 2, dashArray: "5,5",
//         }).addTo(mapInstanceRef.current);
//         p.bindPopup(`<div style="padding:8px;font-weight:600">${plot.name}</div>`);
//         existingPolygonsRef.current.push(p);
//       } else if (MAP_TYPE === "google" && window.google?.maps) {
//         const p = new window.google.maps.Polygon({
//           paths: coords, strokeColor: color, strokeOpacity: 0.8,
//           strokeWeight: 2, fillColor: color, fillOpacity: 0.1,
//           map: mapInstanceRef.current, clickable: true,
//         });
//         const iw = new window.google.maps.InfoWindow({
//           content: `<div style="padding:8px;font-weight:600">${plot.name}</div>`,
//         });
//         p.addListener("click", (e) => { iw.setPosition(e.latLng); iw.open(mapInstanceRef.current); });
//         existingPolygonsRef.current.push(p);
//       }
//     });
//   }, [allPlots, mapLoaded, mapReady, parseCoordinates]);

//   const handleClearCoordinates = useCallback((setFieldValue) => {
//     setCoordinates([]); coordinatesRef.current = [];
//     setFieldValue("coordinates", []);
//     if (MAP_TYPE === "barikoi" && mapInstanceRef.current) {
//       markersRef.current.forEach(m => { try { mapInstanceRef.current.removeLayer(m); } catch { } });
//       if (polygonRef.current) { try { mapInstanceRef.current.removeLayer(polygonRef.current); } catch { } polygonRef.current = null; }
//     } else {
//       markersRef.current.forEach(m => { try { m.setMap(null); } catch { } });
//       if (polygonRef.current) { try { polygonRef.current.setMap(null); } catch { } polygonRef.current = null; }
//     }
//     markersRef.current = [];
//   }, []);

//   const handleRemoveLastPoint = useCallback((currentCoords, setFieldValue) => {
//     if (!currentCoords.length) return;
//     const newCoords = currentCoords.slice(0, -1);
//     setCoordinates(newCoords); coordinatesRef.current = newCoords;
//     setFieldValue("coordinates", newCoords);
//     if (MAP_TYPE === "barikoi" && mapInstanceRef.current) {
//       const last = markersRef.current.pop();
//       if (last) { try { mapInstanceRef.current.removeLayer(last); } catch { } }
//       if (polygonRef.current) { try { mapInstanceRef.current.removeLayer(polygonRef.current); } catch { } polygonRef.current = null; }
//       if (newCoords.length >= 3) {
//         polygonRef.current = window.L.polygon(newCoords.map(c => [c[1], c[0]]), {
//           color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.2, weight: 2,
//         }).addTo(mapInstanceRef.current);
//       }
//     } else {
//       const last = markersRef.current.pop();
//       if (last) { try { last.setMap(null); } catch { } }
//       if (polygonRef.current) { try { polygonRef.current.setMap(null); } catch { } polygonRef.current = null; }
//       if (newCoords.length >= 3 && mapInstanceRef.current) {
//         polygonRef.current = new window.google.maps.Polygon({
//           paths: newCoords.map(c => ({ lat: c[1], lng: c[0] })),
//           strokeColor: "#3B82F6", strokeOpacity: 0.9, strokeWeight: 2,
//           fillColor: "#3B82F6", fillOpacity: 0.2, map: mapInstanceRef.current,
//         });
//       }
//     }
//   }, []);

//   const handleSubmit = async (values) => {
//     setIsLoading(true); setSubmitError(null);
//     try {
//       const fd = new FormData();
//       if (isEditMode) fd.append("id", initialValue.id);
//       fd.append("name", values.name || "");
//       fd.append("features[type]", "Feature");
//       fd.append("features[properties][name]", values.name);
//       fd.append("features[geometry][type]", "Polygon");
//       const closed = [...coordinates, coordinates[0]];
//       fd.append("features[geometry][coordinates]", JSON.stringify([closed]));
//       const res = isEditMode ? await apiEditPlot(fd) : await apiCreatePlot(fd);
//       if (res?.data?.success === 1 || res?.status === 200) {
//         toast.success(isEditMode ? "Plot updated successfully" : "Plot created successfully");
//         if (onPlotsCreated) onPlotsCreated();
//         unlockBodyScroll();
//         setIsOpen({ type: "new", isOpen: false });
//       } else {
//         setSubmitError(res?.data?.message || `Failed to ${isEditMode ? "update" : "create"} plot`);
//       }
//     } catch (err) {
//       setSubmitError(err?.response?.data?.message || err?.message || "An error occurred");
//     } finally { setIsLoading(false); }
//   };

//   return (
//     <div className="w-full">
//       <Formik
//         initialValues={{ name: initialValue?.name || "", coordinates }}
//         validationSchema={PLOT_VALIDATION_SCHEMA}
//         onSubmit={handleSubmit}
//       >
//         {({ values, setFieldValue }) => {
//           formikSetFieldRef.current = setFieldValue;

//           return (
//             <Form>
//               <div className="text-xl sm:text-2xl lg:text-[26px] font-semibold text-[#252525] mb-4 sm:mb-6 lg:mb-7 text-center">
//                 <span className="block">{isEditMode ? "Edit Plot" : "Add New Plot"}</span>
//               </div>

//               {submitError && (
//                 <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{submitError}</div>
//               )}

//               <div className="w-full mb-4">
//                 <FormLabel htmlFor="name">Plot Name</FormLabel>
//                 <div className="sm:h-16 h-10">
//                   <Field
//                     type="text" name="name"
//                     className="sm:px-5 px-4 sm:py-[21px] py-3 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
//                     placeholder="Enter Plot Name"
//                   />
//                 </div>
//                 <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
//               </div>

//               <div className="mb-3 flex justify-between items-center">
//                 <div />
//                 {coordinates.length > 0 && (
//                   <div className="flex gap-2">
//                     <button type="button"
//                       onClick={() => handleRemoveLastPoint(coordinates, setFieldValue)}
//                       className="text-orange-600 hover:text-orange-800 font-medium text-xs bg-white px-2 py-1 rounded border border-orange-200">
//                       Remove Last
//                     </button>
//                     <button type="button"
//                       onClick={() => handleClearCoordinates(setFieldValue)}
//                       className="text-red-600 hover:text-red-800 font-medium text-xs bg-white px-2 py-1 rounded border border-red-200">
//                       Clear All
//                     </button>
//                   </div>
//                 )}
//               </div>

//               <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-gray-200 mb-3">
//                 <div ref={mapWrapperRef} className="w-full h-full">
//                   {!mapLoaded && (
//                     <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
//                       <div className="text-center">
//                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
//                         <p className="text-gray-600 text-sm">Loading map...</p>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//                 {loadingPlots && (
//                   <div className="absolute top-4 right-4 bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200 z-10">
//                     <div className="flex items-center gap-2">
//                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
//                       <span className="text-sm text-gray-600">Loading plots...</span>
//                     </div>
//                   </div>
//                 )}
//                 {allPlots.length > 0 && mapLoaded && (
//                   <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200 z-10">
//                     <div className="text-xs text-gray-600">
//                       Showing {allPlots.length} existing plot{allPlots.length !== 1 ? "s" : ""}
//                     </div>
//                   </div>
//                 )}
//                 <div className="absolute top-4 left-4 bg-white px-2 py-1 rounded shadow text-xs text-gray-500 border border-gray-200 z-10">
//                   {MAP_TYPE === "barikoi" ? "🗺 Barikoi Map" : "🗺 Google Map"}
//                 </div>
//               </div>

//               <ErrorMessage name="coordinates" component="div" className="text-red-500 text-sm mb-3" />

//               <style>{`
//                 .coordinate-label {
//                   background: transparent !important;
//                   border: none !important;
//                   box-shadow: none !important;
//                   font-weight: bold;
//                   color: #1e40af;
//                   font-size: 12px;
//                 }
//                 .coordinate-label::before { display: none; }
//               `}</style>

//               <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-end mt-3">
//                 <Button btnSize="md" type="filledGray"
//                   className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
//                   onClick={() => { unlockBodyScroll(); setIsOpen({ type: "new", isOpen: false }); }}>
//                   <span>Cancel</span>
//                 </Button>
//                 <Button btnType="submit" btnSize="md" type="filled"
//                   className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
//                   disabled={isLoading || coordinates.length < 3}>
//                   <span>
//                     {isLoading
//                       ? (isEditMode ? "Updating..." : "Creating...")
//                       : (isEditMode ? "Update" : "Create")}
//                   </span>
//                 </Button>
//               </div>
//             </Form>
//           );
//         }}
//       </Formik>
//     </div>
//   );
// };

// export default AddPlotsModel;
