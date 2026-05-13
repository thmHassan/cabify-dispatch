import React, { useState, useCallback, useEffect, useRef } from "react";
import { lockBodyScroll } from "../../../../utils/functions/common.function";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
import PlusIcon from "../../../../components/svg/PlusIcon";
import Button from "../../../../components/ui/Button/Button";
import Modal from "../../../../components/shared/Modal/Modal";
import { useAppSelector } from "../../../../store";
import CardContainer from "../../../../components/shared/CardContainer";
import SearchBar from "../../../../components/shared/SearchBar/SearchBar";
import { PAGE_SIZE_OPTIONS, STATUS_OPTIONS } from "../../../../constants/selectOptions";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import PlotsCard from "./components/PlotsCard/PlotsCard";
// import AddPlotsModel from "./components/AddPlotsModel/AddPlotsModel";
import { apiDeletePlot, apiGetPlot } from "../../../../services/PlotService";
import _ from "lodash";
import AppLogoLoader from "../../../../components/shared/AppLogoLoader";

const Plots = () => {
  const [isPlotsModelOpen, setIsPlotsModelOpen] = useState({ type: "new", isOpen: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [tableLoading, setTableLoading] = useState(false);
  const [plotsData, setPlotsData] = useState([]);
  const [_selectedStatus, setSelectedStatus] = useState(
    STATUS_OPTIONS.find((o) => o.value === "all") ?? STATUS_OPTIONS[0]
  );
  const savedPagination = useAppSelector((state) => state?.app?.app?.pagination?.companies);
  const [currentPage, setCurrentPage] = useState(Number(savedPagination?.currentPage) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(Number(savedPagination?.itemsPerPage) || 10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [plotToDelete, setPlotToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonsMapRef = useRef(new Map()); // Store polygon references by ID for direct style updates
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const parseCoordinates = useCallback((plot) => {
    if (!plot) return [];
    try {
      const features = typeof plot.features === "string" ? JSON.parse(plot.features) : plot.features;
      let coordinatesData = features?.geometry?.coordinates;
      if (typeof coordinatesData === "string") coordinatesData = JSON.parse(coordinatesData);
      const coords = Array.isArray(coordinatesData) ? coordinatesData[0] : coordinatesData;
      if (Array.isArray(coords) && coords.length) {
        return coords.map((pair) => {
          if (Array.isArray(pair) && pair.length >= 2) {
            const [lng, lat] = pair;
            return { lat: Number(lat), lng: Number(lng) };
          }
          return null;
        }).filter(Boolean);
      }
      if (Array.isArray(plot.coordinates) && plot.coordinates.length) {
        return plot.coordinates.map((pair) => {
          if (!Array.isArray(pair) || pair.length < 2) return null;
          const [first, second] = pair;
          const latFirstLooksLikeLat = Math.abs(Number(first)) <= 90;
          const lngSecondLooksLikeLng = Math.abs(Number(second)) <= 180;
          return latFirstLooksLikeLat && lngSecondLooksLikeLng
            ? { lat: Number(first), lng: Number(second) }
            : { lat: Number(second), lng: Number(first) };
        }).filter(Boolean);
      }
      if (plot.lat && plot.lng) return [{ lat: Number(plot.lat), lng: Number(plot.lng) }];
    } catch (error) {
      console.error("Error parsing plot features:", error);
    }
    return [];
  }, []);

  const flyToPlot = useCallback((plot) => {
    if (!plot || !mapInstanceRef.current || !mapReady) return;
    const coords = parseCoordinates(plot);
    if (!coords || coords.length < 1) return;

    const latLngs = coords.map((c) => [c.lat, c.lng]);
    const bounds = window.L.latLngBounds(latLngs);
    mapInstanceRef.current.flyToBounds(bounds, {
      padding: [80, 80],
      maxZoom: 17,
      duration: 1.2, // Slightly slower for more cinematic feel
      easeLinearity: 0.2,
    });
  }, [mapReady, parseCoordinates]);

  useEffect(() => {
    if (selectedPlot) {
      flyToPlot(selectedPlot);
    }
  }, [selectedPlot, flyToPlot]);

  const showAllPlots = useCallback(() => {
    setSelectedPlot(null);

    if (mapInstanceRef.current && mapReady && polygonsMapRef.current.size > 0) {
      const allBounds = [];
      polygonsMapRef.current.forEach((polygon) => {
        allBounds.push(polygon.getBounds());
      });

      if (allBounds.length > 0) {
        const combined = allBounds[0];
        allBounds.forEach((b) => combined.extend(b));
        mapInstanceRef.current.flyToBounds(combined, {
          padding: [80, 80],
          maxZoom: 16,
          duration: 1.2
        });
      }
    }
  }, [mapReady]);

  useEffect(() => {
    // Smoothly update styles without re-rendering map layers
    polygonsMapRef.current.forEach((polygon, plotId) => {
      const isSelected = selectedPlot?.id === plotId;
      polygon.setStyle({
        color: isSelected ? "#EF4444" : "#4285F4",
        fillColor: isSelected ? "#EF4444" : "#4285F4",
        fillOpacity: isSelected ? 0.45 : 0.18,
        weight: isSelected ? 3.5 : 2,
      });
      if (isSelected) polygon.bringToFront();
    });
  }, [selectedPlot]);


  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);


  const fetchPlots = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = { page: currentPage, perPage: itemsPerPage };
      if (debouncedSearchQuery?.trim()) params.search = debouncedSearchQuery.trim();
      const response = await apiGetPlot(params);
      if (response?.data?.success === 1) {
        const listData = response?.data?.list;
        setPlotsData(listData?.data || []);
        setTotalItems(listData?.total || 0);
        setTotalPages(listData?.last_page || 1);
      }
    } catch (error) {
      console.error("Error fetching plots:", error);
      setPlotsData([]);
    } finally {
      setTableLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchQuery]);

  useEffect(() => { fetchPlots(); }, [currentPage, itemsPerPage, debouncedSearchQuery, fetchPlots, refreshTrigger]);

  const handleDeletePlot = async () => {
    if (!plotToDelete?.id) return;
    setIsDeleting(true);
    try {
      const response = await apiDeletePlot(plotToDelete.id);
      if (response?.data?.success === 1 || response?.status === 200) {
        setDeleteModalOpen(false);
        setPlotToDelete(null);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error deleting plot:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  const handleItemsPerPageChange = (newItemsPerPage) => { setItemsPerPage(newItemsPerPage); setCurrentPage(1); };
  const handleOnPlotsCreated = () => setRefreshTrigger(prev => prev + 1);

  const loadLeaflet = useCallback(() => {
    if (window.L) { setMapReady(true); setMapError(false); return; }
    const existingScript = document.querySelector('script[src*="leaflet.js"]');
    if (existingScript) {
      if (window.L) { setMapReady(true); setMapError(false); }
      else {
        existingScript.addEventListener("load", () => { setMapReady(true); setMapError(false); });
        existingScript.addEventListener("error", () => setMapError(true));
      }
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
    script.async = true; script.defer = true;
    script.onload = () => { setMapReady(true); setMapError(false); };
    script.onerror = () => setMapError(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    loadLeaflet();
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      polygonsMapRef.current.clear();
    };
  }, [loadLeaflet]);

  const generatePlotColor = () => "#4285F4";

  const renderAllPolygons = useCallback(() => {
    if (!plotsData || plotsData.length === 0 || !mapReady || !mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current).setView([20, 0], 2);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    // Clear old polygons
    polygonsMapRef.current.forEach(p => {
      if (p && mapInstanceRef.current) mapInstanceRef.current.removeLayer(p);
    });
    polygonsMapRef.current.clear();

    const allBounds = [];
    plotsData.forEach((plot) => {
      const coords = parseCoordinates(plot);
      if (coords && coords.length >= 3) {
        const latLngs = coords.map(c => [c.lat, c.lng]);
        const isSelected = selectedPlot?.id === plot.id;
        const color = isSelected ? "#EF4444" : generatePlotColor();

        const polygon = window.L.polygon(latLngs, {
          color: color,
          fillColor: color,
          fillOpacity: isSelected ? 0.45 : 0.18,
          weight: isSelected ? 3.5 : 2,
        }).addTo(mapInstanceRef.current);

        polygon.bindPopup(`<div style="padding:8px;font-weight:600;color:#333;">${plot.name}</div>`);
        polygon.on('click', () => setSelectedPlot(plot));

        polygonsMapRef.current.set(plot.id, polygon);
        allBounds.push(polygon.getBounds());
      }
    });

    if (allBounds.length > 0 && !selectedPlot) {
      const combinedBounds = allBounds[0];
      allBounds.forEach(b => combinedBounds.extend(b));
      mapInstanceRef.current.fitBounds(combinedBounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [mapReady, plotsData, parseCoordinates]);

  const handleDeleteClick = (plot) => { setPlotToDelete(plot); setDeleteModalOpen(true); };

  useEffect(() => { renderAllPolygons(); }, [renderAllPolygons]);

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-7 2xl:p-10 min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-85px)]">
      <div className="flex justify-between sm:flex-row flex-col items-start sm:items-center gap-3 sm:gap-0">
        <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-1 sm:w-[calc(100%-240px)] w-full">
          <PageTitle title="Plots" />
          <PageSubTitle title="These plots will be pushed to all customer panels for their help or they can choose their own plots by creating in their own panels" />
        </div>
        {/* <div className="sm:w-auto xs:w-auto w-full sm:mb-[50px] mb-8">
          <Button
            type="filled" btnSize="2xl"
            onClick={() => { lockBodyScroll(); setIsPlotsModelOpen({ isOpen: true, type: "new" }); }}
            className="w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3"
          >
            <div className="flex gap-2 sm:gap-[15px] items-center whitespace-nowrap">
              <span className="hidden sm:inline-block"><PlusIcon /></span>
              <span className="sm:hidden"><PlusIcon height={16} width={16} /></span>
              <span>Add New Plots</span>
            </div>
          </Button>
        </div> */}
      </div>

      <div>
        <CardContainer className="p-3 sm:p-4 lg:p-5 bg-[#F5F5F5]">
          <div className="flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 justify-between mb-4 sm:mb-0">
            <div className="md:w-full w-[calc(100%-54px)] sm:flex-1">
              <SearchBar
                value={searchQuery} onSearchChange={setSearchQuery}
                className="w-full md:max-w-[400px] max-w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
            <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
              {tableLoading ? (
                <div className="flex items-center justify-center py-20"><AppLogoLoader /></div>
              ) : plotsData && plotsData.length > 0 ? (
                plotsData.map((plot) => (
                  <PlotsCard
                    key={plot.id || plot.name}
                    plot={plot}
                    onSelect={(p) => setSelectedPlot(p)}
                    onEdit={(plotToEdit) => {
                      lockBodyScroll();
                      setIsPlotsModelOpen({ isOpen: true, type: "edit", data: plotToEdit });
                    }}
                    onDelete={handleDeleteClick}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center py-20 text-gray-500">No plots found</div>
              )}
            </div>

            <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-gray-200">
              <div ref={mapRef} className="w-full h-full" />

              {!plotsData || plotsData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-gray-600">
                  No plots to display
                </div>
              ) : !mapReady ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 text-gray-600">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
                  <p>Loading map...</p>
                </div>
              ) : null}

              {mapReady && (
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  {selectedPlot && (
                    <div className="bg-white px-3 py-1.5 rounded-lg shadow-md border border-gray-200 flex items-center gap-2 pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span className="font-semibold text-gray-800 text-xs">{selectedPlot.name}</span>
                    </div>
                  )}
                  {selectedPlot && (
                    <button
                      onClick={showAllPlots}
                      className="bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md border border-gray-200 flex items-center gap-1.5 transition-all"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l7 7m0 0l7-7M10 10v10m4-10l7 7m-7-7l-7 7" />
                      </svg>
                      Show All
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {Array.isArray(plotsData) && plotsData.length > 0 ? (
            <div className="mt-4 sm:mt-4 border-t border-[#E9E9E9] pt-3 sm:pt-4">
              <Pagination
                currentPage={currentPage} totalPages={totalPages}
                itemsPerPage={itemsPerPage} onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={PAGE_SIZE_OPTIONS} pageKey="companies"
              />
            </div>
          ) : null}
        </CardContainer>
      </div>

      {/* <Modal isOpen={isPlotsModelOpen.isOpen} className="p-4 sm:p-6 lg:p-10 w-full max-w-2xl">
        <AddPlotsModel
          existingPlots={plotsData}
          initialValue={isPlotsModelOpen.type === "edit" ? {
            id: isPlotsModelOpen.data?.id,
            name: isPlotsModelOpen.data?.name,
            coordinates: isPlotsModelOpen.data?.features ? (() => {
              try {
                const features = typeof isPlotsModelOpen.data.features === 'string'
                  ? JSON.parse(isPlotsModelOpen.data.features) : isPlotsModelOpen.data.features;
                let coordinatesData = features?.geometry?.coordinates;
                if (typeof coordinatesData === "string") coordinatesData = JSON.parse(coordinatesData);
                const coords = Array.isArray(coordinatesData) ? coordinatesData[0] : coordinatesData;
                return coords || [];
              } catch (e) { console.error('Error parsing features:', e); return []; }
            })() : [],
          } : {}}
          setIsOpen={setIsPlotsModelOpen}
          onPlotsCreated={handleOnPlotsCreated}
        />
      </Modal> */}

      <Modal isOpen={deleteModalOpen} className="p-10">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-3">Delete Plot?</h2>
          <p className="text-gray-600 mb-6">Are you sure you want to delete <strong>{plotToDelete?.name}</strong>?</p>
          <div className="flex justify-center gap-4">
            <Button type="filledGray" onClick={() => { setDeleteModalOpen(false); setPlotToDelete(null); }} className="px-6 py-2 rounded-md">Cancel</Button>
            <Button type="filledRed" onClick={handleDeletePlot} disabled={isDeleting} className="px-6 py-2 rounded-md">
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Plots;

// import React, { useState, useCallback, useEffect, useRef } from "react";
// import { lockBodyScroll } from "../../../../utils/functions/common.function";
// import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
// import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
// import PlusIcon from "../../../../components/svg/PlusIcon";
// import Button from "../../../../components/ui/Button/Button";
// import Modal from "../../../../components/shared/Modal/Modal";
// import { useAppSelector } from "../../../../store";
// import CardContainer from "../../../../components/shared/CardContainer";
// import SearchBar from "../../../../components/shared/SearchBar/SearchBar";
// import { PAGE_SIZE_OPTIONS, STATUS_OPTIONS } from "../../../../constants/selectOptions";
// import Pagination from "../../../../components/ui/Pagination/Pagination";
// import PlotsCard from "./components/PlotsCard/PlotsCard";
// import AddPlotsModel from "./components/AddPlotsModel";
// import { apiDeletePlot, apiGetPlot } from "../../../../services/PlotService";
// import _ from "lodash";
// import { getTenantData } from "../../../../utils/functions/tokenEncryption";
// import AppLogoLoader from "../../../../components/shared/AppLogoLoader";

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
//   const countryCode = tenant?.country_of_use?.trim().toUpperCase();
//   return COUNTRY_CENTERS[countryCode] || COUNTRY_CENTERS.DEFAULT;
// };

// const getMapType = () => {
//   try {
//     const tenant = getTenantData();
//     const mapsApi = tenant?.maps_api?.trim().toLowerCase();
//     const countryOfUse = tenant?.country_of_use?.trim().toUpperCase();
//     if (countryOfUse === "IN") return mapsApi === "google" ? "google" : "barikoi";
//     return mapsApi === "barikoi" ? "barikoi" : "google";
//   } catch { return "google"; }
// };

// const Plots = () => {
//   const [isPlotsModelOpen, setIsPlotsModelOpen] = useState({ type: "new", isOpen: false });
//   const [searchQuery, setSearchQuery] = useState("");
//   const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
//   const [tableLoading, setTableLoading] = useState(false);
//   const [plotsData, setPlotsData] = useState([]);
//   const [_selectedStatus, setSelectedStatus] = useState(
//     STATUS_OPTIONS.find((o) => o.value === "all") ?? STATUS_OPTIONS[0]
//   );
//   const savedPagination = useAppSelector((state) => state?.app?.app?.pagination?.companies);
//   const [currentPage, setCurrentPage] = useState(Number(savedPagination?.currentPage) || 1);
//   const [itemsPerPage, setItemsPerPage] = useState(Number(savedPagination?.itemsPerPage) || 10);
//   const [totalItems, setTotalItems] = useState(0);
//   const [totalPages, setTotalPages] = useState(1);
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [plotToDelete, setPlotToDelete] = useState(null);
//   const [deleteModalOpen, setDeleteModalOpen] = useState(false);
//   const [isDeleting, setIsDeleting] = useState(false);
//   const [selectedPlot, setSelectedPlot] = useState(null);

//   const mapRef = useRef(null);
//   const googleMapRef = useRef(null);
//   const googlePolygonsRef = useRef([]);
//   const leafletMapRef = useRef(null);
//   const leafletPolygonsRef = useRef([]);
//   const [mapsReady, setMapsReady] = useState(false);
//   const [leafletReady, setLeafletReady] = useState(false);
//   const [mapProvider] = useState(() => getMapType());
//   const [mapError, setMapError] = useState(false);

//   const googleApiKey = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
//   const barikoiApiKey = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

//   const parseCoordinates = useCallback((plot) => {
//     if (!plot) return [];
//     try {
//       const features = typeof plot.features === "string" ? JSON.parse(plot.features) : plot.features;
//       let coordinatesData = features?.geometry?.coordinates;
//       if (typeof coordinatesData === "string") coordinatesData = JSON.parse(coordinatesData);
//       const coords = Array.isArray(coordinatesData) ? coordinatesData[0] : coordinatesData;
//       if (Array.isArray(coords) && coords.length) {
//         return coords.map((pair) => {
//           if (Array.isArray(pair) && pair.length >= 2) {
//             const [lng, lat] = pair;
//             return { lat: Number(lat), lng: Number(lng) };
//           }
//           return null;
//         }).filter(Boolean);
//       }
//       if (Array.isArray(plot.coordinates) && plot.coordinates.length) {
//         return plot.coordinates.map((pair) => {
//           if (!Array.isArray(pair) || pair.length < 2) return null;
//           const [first, second] = pair;
//           const latFirstLooksLikeLat = Math.abs(Number(first)) <= 90;
//           const lngSecondLooksLikeLng = Math.abs(Number(second)) <= 180;
//           return latFirstLooksLikeLat && lngSecondLooksLikeLng
//             ? { lat: Number(first), lng: Number(second) }
//             : { lat: Number(second), lng: Number(first) };
//         }).filter(Boolean);
//       }
//       if (plot.lat && plot.lng) return [{ lat: Number(plot.lat), lng: Number(plot.lng) }];
//     } catch (error) {
//       console.error("Error parsing plot features:", error);
//     }
//     return [];
//   }, []);

//   const flyToPlot = useCallback((plot) => {
//     if (!plot) return;
//     const coords = parseCoordinates(plot);
//     if (!coords || coords.length < 1) return;

//     if (mapProvider === "google" && googleMapRef.current && mapsReady) {
//       const bounds = new window.google.maps.LatLngBounds();
//       coords.forEach((c) => bounds.extend(c));

//       googleMapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
//     }

//     if (mapProvider === "barikoi" && leafletMapRef.current && leafletReady) {
//       const latLngs = coords.map((c) => [c.lat, c.lng]);
//       const bounds = window.L.latLngBounds(latLngs);
//       leafletMapRef.current.flyToBounds(bounds, {
//         padding: [60, 60],
//         maxZoom: 17,
//         duration: 0.8,
//         easeLinearity: 0.3,
//       });
//     }
//   }, [mapProvider, mapsReady, leafletReady, parseCoordinates]);

//   useEffect(() => {
//     if (selectedPlot) {
//       flyToPlot(selectedPlot);
//     }
//   }, [selectedPlot, flyToPlot]);

//   const showAllPlots = useCallback(() => {
//     setSelectedPlot(null);

//     if (mapProvider === "google" && googleMapRef.current && mapsReady) {
//       const bounds = new window.google.maps.LatLngBounds();
//       let hasCoords = false;
//       plotsData.forEach((plot) => {
//         const coords = parseCoordinates(plot);
//         coords.forEach((c) => { bounds.extend(c); hasCoords = true; });
//       });
//       if (hasCoords) {
//         googleMapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
//       }
//     }

//     if (mapProvider === "barikoi" && leafletMapRef.current && leafletReady) {
//       const allBounds = leafletPolygonsRef.current
//         .filter(Boolean)
//         .map((p) => p.getBounds());
//       if (allBounds.length > 0) {
//         const combined = allBounds[0];
//         allBounds.forEach((b) => combined.extend(b));
//         leafletMapRef.current.flyToBounds(combined, { padding: [60, 60], maxZoom: 16, duration: 0.8 });
//       }
//     }
//   }, [mapProvider, mapsReady, leafletReady, plotsData, parseCoordinates]);

//   useEffect(() => {
//     if (mapProvider === "google" && googlePolygonsRef.current.length > 0) {
//       plotsData.forEach((plot, index) => {
//         const polygon = googlePolygonsRef.current[index];
//         if (polygon) {
//           const isSelected = selectedPlot?.id === plot.id;
//           polygon.setOptions({
//             strokeColor: isSelected ? "#EF4444" : "#4285F4",
//             fillColor: isSelected ? "#EF4444" : "#4285F4",
//             fillOpacity: isSelected ? 0.35 : 0.15,
//             strokeWeight: isSelected ? 3 : 2,
//             zIndex: isSelected ? 10 : 1,
//           });
//         }
//       });
//     } else if (mapProvider === "barikoi" && leafletPolygonsRef.current.length > 0) {
//       plotsData.forEach((plot, index) => {
//         const polygon = leafletPolygonsRef.current[index];
//         if (polygon) {
//           const isSelected = selectedPlot?.id === plot.id;
//           polygon.setStyle({
//             color: isSelected ? "#EF4444" : "#4285F4",
//             fillColor: isSelected ? "#EF4444" : "#4285F4",
//             fillOpacity: isSelected ? 0.35 : 0.15,
//             weight: isSelected ? 3 : 2,
//           });
//           if (isSelected) polygon.bringToFront();
//         }
//       });
//     }
//   }, [selectedPlot, mapProvider, plotsData]);


//   useEffect(() => {
//     const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
//     return () => clearTimeout(timer);
//   }, [searchQuery]);


//   const fetchPlots = useCallback(async () => {
//     setTableLoading(true);
//     try {
//       const params = { page: currentPage, perPage: itemsPerPage };
//       if (debouncedSearchQuery?.trim()) params.search = debouncedSearchQuery.trim();
//       const response = await apiGetPlot(params);
//       if (response?.data?.success === 1) {
//         const listData = response?.data?.list;
//         setPlotsData(listData?.data || []);
//         setTotalItems(listData?.total || 0);
//         setTotalPages(listData?.last_page || 1);
//       }
//     } catch (error) {
//       console.error("Error fetching plots:", error);
//       setPlotsData([]);
//     } finally {
//       setTableLoading(false);
//     }
//   }, [currentPage, itemsPerPage, debouncedSearchQuery]);

//   useEffect(() => { fetchPlots(); }, [currentPage, itemsPerPage, debouncedSearchQuery, fetchPlots, refreshTrigger]);

//   const handleDeletePlot = async () => {
//     if (!plotToDelete?.id) return;
//     setIsDeleting(true);
//     try {
//       const response = await apiDeletePlot(plotToDelete.id);
//       if (response?.data?.success === 1 || response?.status === 200) {
//         setDeleteModalOpen(false);
//         setPlotToDelete(null);
//         setRefreshTrigger(prev => prev + 1);
//       }
//     } catch (error) {
//       console.error("Error deleting plot:", error);
//     } finally {
//       setIsDeleting(false);
//     }
//   };

//   const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
//   const handleItemsPerPageChange = (newItemsPerPage) => { setItemsPerPage(newItemsPerPage); setCurrentPage(1); };
//   const handleOnPlotsCreated = () => setRefreshTrigger(prev => prev + 1);

//   const loadGoogleMaps = useCallback((apiKey) => {
//     if (!apiKey) { setMapError(false); return; }
//     if (window.google && window.google.maps) { setMapsReady(true); setMapError(false); return; }
//     const existing = document.querySelector('script[src*="maps.googleapis.com"]');
//     if (existing) {
//       if (window.google && window.google.maps) { setMapsReady(true); setMapError(false); }
//       else {
//         existing.addEventListener('load', () => { setMapsReady(true); setMapError(false); });
//         existing.addEventListener('error', () => setMapError(true));
//       }
//       return;
//     }
//     const script = document.createElement('script');
//     script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
//     script.async = true; script.defer = true;
//     script.onload = () => { setMapsReady(true); setMapError(false); };
//     script.onerror = () => setMapError(true);
//     window.gm_authFailure = () => setMapError(true);
//     document.body.appendChild(script);
//   }, []);

//   const loadLeaflet = useCallback(() => {
//     if (window.L) { setLeafletReady(true); setMapError(false); return; }
//     const existingScript = document.querySelector('script[src*="leaflet.js"]');
//     if (existingScript) {
//       if (window.L) { setLeafletReady(true); setMapError(false); }
//       else {
//         existingScript.addEventListener("load", () => { setLeafletReady(true); setMapError(false); });
//         existingScript.addEventListener("error", () => setMapError(true));
//       }
//       return;
//     }
//     const link = document.createElement("link");
//     link.rel = "stylesheet";
//     link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
//     document.head.appendChild(link);
//     const script = document.createElement("script");
//     script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
//     script.async = true; script.defer = true;
//     script.onload = () => { setLeafletReady(true); setMapError(false); };
//     script.onerror = () => setMapError(true);
//     document.body.appendChild(script);
//   }, []);

//   useEffect(() => {
//     if (mapProvider === "google") { setLeafletReady(false); loadGoogleMaps(googleApiKey); }
//     else if (mapProvider === "barikoi") { setMapsReady(false); loadLeaflet(); }
//     return () => {
//       if (googleMapRef.current) googleMapRef.current = null;
//       googlePolygonsRef.current.forEach(p => { if (p) p.setMap(null); });
//       googlePolygonsRef.current = [];
//       if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
//       leafletPolygonsRef.current = [];
//     };
//   }, [mapProvider, googleApiKey, loadGoogleMaps, loadLeaflet]);

//   const generatePlotColor = () => "#4285F4";

//   const renderAllPolygons = useCallback(() => {
//     if (!plotsData || plotsData.length === 0) return;
//     const center = getCountryCenter();
//     const defaultCenter = { lat: center.lat, lng: center.lng };

//     if (mapProvider === "google") {
//       if (!mapsReady || !mapRef.current) return;
//       if (!googleMapRef.current) {
//         googleMapRef.current = new window.google.maps.Map(mapRef.current, {
//           center: defaultCenter, zoom: 5,
//         });
//       }
//       googlePolygonsRef.current.forEach(p => { if (p) p.setMap(null); });
//       googlePolygonsRef.current = [];

//       const bounds = new window.google.maps.LatLngBounds();
//       let hasValidCoords = false;

//       plotsData.forEach((plot) => {
//         const coords = parseCoordinates(plot);
//         if (coords && coords.length >= 3) {
//           hasValidCoords = true;
//           const color = generatePlotColor();

//           const isSelected = selectedPlot?.id === plot.id;
//           const polygon = new window.google.maps.Polygon({
//             paths: coords,
//             strokeColor: color, strokeOpacity: 0.9, strokeWeight: 2,
//             fillColor: color, fillOpacity: 0.18,
//             map: googleMapRef.current, clickable: true,
//             zIndex: isSelected ? 10 : 1,
//           });

//           polygon.addListener('click', () => setSelectedPlot(plot));

//           const infoWindow = new window.google.maps.InfoWindow({
//             content: `<div style="padding:8px;font-weight:600;color:#333;">${plot.name}</div>`,
//           });
//           polygon.addListener('mouseover', () => {
//             const c = coords.reduce((acc, coord) => ({
//               lat: acc.lat + coord.lat / coords.length,
//               lng: acc.lng + coord.lng / coords.length,
//             }), { lat: 0, lng: 0 });
//             infoWindow.setPosition(c);
//             infoWindow.open(googleMapRef.current);
//           });
//           polygon.addListener('mouseout', () => infoWindow.close());
//           googlePolygonsRef.current.push(polygon);
//           coords.forEach(coord => bounds.extend(coord));
//         }
//       });

//       if (hasValidCoords) {
//         googleMapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
//         window.google.maps.event.addListenerOnce(googleMapRef.current, 'bounds_changed', () => {
//           const zoom = googleMapRef.current.getZoom();
//           if (zoom > 16) googleMapRef.current.setZoom(16);
//           else if (zoom < 5) googleMapRef.current.setZoom(5);
//         });
//       } else {
//         googleMapRef.current.setCenter(defaultCenter);
//         googleMapRef.current.setZoom(5);
//       }
//       return;
//     }

//     if (mapProvider === "barikoi") {
//       if (!leafletReady || !mapRef.current) return;
//       if (!leafletMapRef.current) {
//         leafletMapRef.current = window.L.map(mapRef.current).setView([defaultCenter.lat, defaultCenter.lng], 5);
//         const tileUrl = barikoiApiKey
//           ? `https://map.barikoi.com/styles/osm-bright/{z}/{x}/{y}.png?key=${barikoiApiKey}`
//           : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
//         const tileLayer = window.L.tileLayer(tileUrl, { attribution: "© OpenStreetMap contributors", maxZoom: 19 });
//         tileLayer.on("tileerror", () => {
//           if (!leafletMapRef.current) return;
//           tileLayer.off("tileerror");
//           leafletMapRef.current.removeLayer(tileLayer);
//           window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//             attribution: "© OpenStreetMap contributors", maxZoom: 19,
//           }).addTo(leafletMapRef.current);
//         });
//         tileLayer.addTo(leafletMapRef.current);
//       }

//       leafletPolygonsRef.current.forEach(p => {
//         if (p && leafletMapRef.current) leafletMapRef.current.removeLayer(p);
//       });
//       leafletPolygonsRef.current = [];

//       const allBounds = [];
//       plotsData.forEach((plot) => {
//         const coords = parseCoordinates(plot);
//         if (coords && coords.length >= 3) {
//           const latLngs = coords.map(c => [c.lat, c.lng]);
//           const color = generatePlotColor();

//           const polygon = window.L.polygon(latLngs, {
//             color, fillColor: color,
//             fillOpacity: 0.18,
//             weight: 2,
//           }).addTo(leafletMapRef.current);

//           polygon.bindPopup(`<div style="padding:8px;font-weight:600;color:#333;">${plot.name}</div>`);
//           polygon.on('click', () => setSelectedPlot(plot));
//           leafletPolygonsRef.current.push(polygon);
//           allBounds.push(polygon.getBounds());
//         }
//       });

//       if (allBounds.length > 0) {
//         const combinedBounds = allBounds[0];
//         allBounds.forEach(b => combinedBounds.extend(b));
//         leafletMapRef.current.fitBounds(combinedBounds, { padding: [50, 50], maxZoom: 16 });
//       } else {
//         leafletMapRef.current.setView([defaultCenter.lat, defaultCenter.lng], 5);
//       }
//     }
//   }, [mapProvider, mapsReady, leafletReady, plotsData, parseCoordinates, barikoiApiKey, selectedPlot]);

//   const handleDeleteClick = (plot) => { setPlotToDelete(plot); setDeleteModalOpen(true); };

//   useEffect(() => { renderAllPolygons(); }, [renderAllPolygons]);

//   return (
//     <div className="px-4 py-5 sm:p-6 lg:p-7 2xl:p-10 min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-85px)]">
//       <div className="flex justify-between sm:flex-row flex-col items-start sm:items-center gap-3 sm:gap-0">
//         <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-1 sm:w-[calc(100%-240px)] w-full">
//           <PageTitle title="Plots" />
//           <PageSubTitle title="These plots will be pushed to all customer panels for their help or they can choose their own plots by creating in their own panels" />
//         </div>
//         <div className="sm:w-auto xs:w-auto w-full sm:mb-[50px] mb-8">
//           <Button
//             type="filled" btnSize="2xl"
//             onClick={() => { lockBodyScroll(); setIsPlotsModelOpen({ isOpen: true, type: "new" }); }}
//             className="w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3"
//           >
//             <div className="flex gap-2 sm:gap-[15px] items-center whitespace-nowrap">
//               <span className="hidden sm:inline-block"><PlusIcon /></span>
//               <span className="sm:hidden"><PlusIcon height={16} width={16} /></span>
//               <span>Add New Plots</span>
//             </div>
//           </Button>
//         </div>
//       </div>

//       <div>
//         <CardContainer className="p-3 sm:p-4 lg:p-5 bg-[#F5F5F5]">
//           <div className="flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 justify-between mb-4 sm:mb-0">
//             <div className="md:w-full w-[calc(100%-54px)] sm:flex-1">
//               <SearchBar
//                 value={searchQuery} onSearchChange={setSearchQuery}
//                 className="w-full md:max-w-[400px] max-w-full"
//               />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
//             <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
//               {tableLoading ? (
//                 <div className="flex items-center justify-center py-20"><AppLogoLoader /></div>
//               ) : plotsData && plotsData.length > 0 ? (
//                 plotsData.map((plot) => (
//                   <PlotsCard
//                     key={plot.id || plot.name}
//                     plot={plot}
//                     onSelect={(p) => setSelectedPlot(p)}
//                     onEdit={(plotToEdit) => {
//                       lockBodyScroll();
//                       setIsPlotsModelOpen({ isOpen: true, type: "edit", data: plotToEdit });
//                     }}
//                     onDelete={handleDeleteClick}
//                   />
//                 ))
//               ) : (
//                 <div className="flex items-center justify-center py-20 text-gray-500">No plots found</div>
//               )}
//             </div>

//             <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-gray-200">
//               <div ref={mapRef} className="w-full h-full" />

//               {!plotsData || plotsData.length === 0 ? (
//                 <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-gray-600">
//                   No plots to display
//                 </div>
//               ) : (!mapsReady && !leafletReady) ? (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 text-gray-600">
//                   <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
//                   <p>Loading map...</p>
//                 </div>
//               ) : null}

//               {(mapsReady || leafletReady) && (
//                 <div className="absolute top-3 left-3 flex items-center gap-2">
//                   {selectedPlot && (
//                     <div className="bg-white px-3 py-1.5 rounded-lg shadow-md border border-gray-200 flex items-center gap-2 pointer-events-none">
//                       <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
//                       <span className="font-semibold text-gray-800 text-xs">{selectedPlot.name}</span>
//                     </div>
//                   )}
//                   {selectedPlot && (
//                     <button
//                       onClick={showAllPlots}
//                       className="bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md border border-gray-200 flex items-center gap-1.5 transition-all"
//                     >
//                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//                         <path d="M3 3l7 7m0 0l7-7M10 10v10m4-10l7 7m-7-7l-7 7" />
//                       </svg>
//                       Show All
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>

//           {Array.isArray(plotsData) && plotsData.length > 0 ? (
//             <div className="mt-4 sm:mt-4 border-t border-[#E9E9E9] pt-3 sm:pt-4">
//               <Pagination
//                 currentPage={currentPage} totalPages={totalPages}
//                 itemsPerPage={itemsPerPage} onPageChange={handlePageChange}
//                 onItemsPerPageChange={handleItemsPerPageChange}
//                 itemsPerPageOptions={PAGE_SIZE_OPTIONS} pageKey="companies"
//               />
//             </div>
//           ) : null}
//         </CardContainer>
//       </div>

//       <Modal isOpen={isPlotsModelOpen.isOpen} className="p-4 sm:p-6 lg:p-10 w-full max-w-2xl">
//         <AddPlotsModel
//           existingPlots={plotsData}
//           initialValue={isPlotsModelOpen.type === "edit" ? {
//             id: isPlotsModelOpen.data?.id,
//             name: isPlotsModelOpen.data?.name,
//             coordinates: isPlotsModelOpen.data?.features ? (() => {
//               try {
//                 const features = typeof isPlotsModelOpen.data.features === 'string'
//                   ? JSON.parse(isPlotsModelOpen.data.features) : isPlotsModelOpen.data.features;
//                 let coordinatesData = features?.geometry?.coordinates;
//                 if (typeof coordinatesData === "string") coordinatesData = JSON.parse(coordinatesData);
//                 const coords = Array.isArray(coordinatesData) ? coordinatesData[0] : coordinatesData;
//                 return coords || [];
//               } catch (e) { console.error('Error parsing features:', e); return []; }
//             })() : [],
//           } : {}}
//           setIsOpen={setIsPlotsModelOpen}
//           onPlotsCreated={handleOnPlotsCreated}
//         />
//       </Modal>

//       <Modal isOpen={deleteModalOpen} className="p-10">
//         <div className="text-center">
//           <h2 className="text-xl font-semibold mb-3">Delete Plot?</h2>
//           <p className="text-gray-600 mb-6">Are you sure you want to delete <strong>{plotToDelete?.name}</strong>?</p>
//           <div className="flex justify-center gap-4">
//             <Button type="filledGray" onClick={() => { setDeleteModalOpen(false); setPlotToDelete(null); }} className="px-6 py-2 rounded-md">Cancel</Button>
//             <Button type="filledRed" onClick={handleDeletePlot} disabled={isDeleting} className="px-6 py-2 rounded-md">
//               {isDeleting ? "Deleting..." : "Delete"}
//             </Button>
//           </div>
//         </div>
//       </Modal>
//     </div>
//   );
// };

// export default Plots;