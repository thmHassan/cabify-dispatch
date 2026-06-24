import { Form, Formik } from "formik";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Maps from "./components/maps";
import { getTenantData } from "../../../../../../utils/functions/tokenEncryption";
import {
    formatDistanceWithUnit,
    getTenantCountryIso,
    getTenantDialCode,
    kmValueToDisplayDistance,
    metersToDisplayDistance,
    resolveBookingDistanceMeters,
} from "../../../../../../utils/functions/tenantSettings";
import { apiGetSubCompany } from "../../../../../../services/SubCompanyServices";
import { apiGetAccount } from "../../../../../../services/AccountServices";
import { apiGetDriverManagement } from "../../../../../../services/DriverManagementService";
import { apiGetAllVehicleType } from "../../../../../../services/VehicleTypeServices";
import Button from "../../../../../../components/ui/Button/Button";
import {
    apiGetAllPlot,
    apiCreateCalculateFares,
    apiCreateBooking,
    apiGetEditBooking,
    apiUpdateBooking,
    getApiErrorMessage,
    isApiSuccess,
} from "../../../../../../services/AddBookingServices";
import {
    apiGetDispatchSystem,
} from "../../../../../../services/SettingsConfigurationServices";
import { ensureMapConfigurationLoaded, getCachedMapConfiguration } from "../../../../../../services/mapConfigCache";
import {
    fetchMapConfiguration,
    MAP_PROVIDER_BARIKOI,
    MAP_PROVIDER_DEFAULT,
} from "../../../../../../services/mapConfigurationService";
import useMapConfiguration from "../../../../../../hooks/useMapConfiguration";
import { apiGetBackupPlot } from "../../../../../../services/PlotService";
import { unlockBodyScroll } from "../../../../../../utils/functions/common.function";
import toast from 'react-hot-toast';
import { getDispatcherId, getDispatcherName } from "../../../../../../utils/auth";
import { apiGetRideHistory, apiGetUser } from "../../../../../../services/UserService";
import {
    fetchMapifyAddressFromCoords,
    fetchMapifyBoundaryCountryFromCoords,
    fetchMapifyLocationSuggestions,
    isReverseGeocodingAvailable,
    MAPIFY_AUTOCOMPLETE_SIZE,
    MAPIFY_FULL_SEARCH_SIZE,
    toMapifyBoundaryCountryCode,
} from "../../../../../../services/MapSearchService";
import MapNearbySearchControls, { toGoogleCountryCode } from "../../../../../../components/map/MapNearbySearchControls";
import { debounce } from "lodash";
import { isCoordinateString } from "../../../../../../utils/functions/locationDisplay";
import {
    extractCreatedBookings,
    extractUpdatedBookingFromResponse,
    formatDateForInput,
    getMultiBookingCreatedCount,
    getTodayWeekdayLabel,
    multiBookingIncludesToday,
    MULTI_BOOKING_WEEKDAYS,
    resolveMultiBookingSubmitDate,
    syncMultiBookingReferenceDate,
} from "../../../../../../utils/functions/bookingDateFilter";
import {
    formatCompanyTimeForApi,
    getCompanyTodayForInput,
    isCompanyFutureDateTime,
} from "../../../../../../utils/functions/appDateTime";
import { mapBookingToFormValues } from "../../../../../../utils/functions/bookingFormMapper";
import {
    dispatchSystemListHasPlotBased,
    isManualDispatchOnlySystem,
} from "../../../../../../utils/functions/dispatchSystem";
import { validatePlotBasedPickup, resolvePickupPlot } from "../../../../../../utils/functions/plotMapGeometry";
import { requestBrowserGeolocation } from "../../../../../../utils/functions/geolocation";
import History from "./components/History";
import LocationSearchSidebar from "./components/LocationSearchSidebar";
import successSound from "../../../../../../assets/audio/meldix-success-340660.mp3";

const LOCATION_SEARCH_DEBOUNCE_MS = 400;

const EMPTY_LOCATION_SIDEBAR = {
    open: false,
    field: null,
    query: "",
    results: [],
    loading: false,
    error: "",
};

const DEFAULT_GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
const DEFAULT_BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

const SEARCH_COUNTRY_CENTERS = {
    PK: { lat: 30.3753, lon: 69.3451 },
    BD: { lat: 23.8103, lon: 90.4125 },
    IN: { lat: 20.5937, lon: 78.9629 },
    GB: { lat: 51.5074, lon: -0.1278 },
    DEFAULT: { lat: 23.8103, lon: 90.4125 },
};

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || DEFAULT_GOOGLE_KEY;
const BARIKOI_KEY = import.meta.env.VITE_BARIKOI_API_KEY || DEFAULT_BARIKOI_KEY;

const loadGoogleScript = (apiKey) =>
    new Promise((resolve, reject) => {
        const isReady = () =>
            typeof window.google?.maps?.Map === "function"
            && window.google?.maps?.places?.AutocompleteService;

        if (isReady()) return resolve();

        const existing = document.getElementById("google-maps-script");
        if (existing) {
            const wait = (attempts = 0) => {
                if (isReady()) return resolve();
                if (attempts >= 150) return reject(new Error("Google Maps load failed"));
                setTimeout(() => wait(attempts + 1), 50);
            };
            existing.addEventListener("load", () => wait());
            wait();
            return;
        }
        const script = document.createElement("script");
        script.id = "google-maps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey || GOOGLE_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            const wait = (attempts = 0) => {
                if (isReady()) return resolve();
                if (attempts >= 150) return reject(new Error("Google Maps load failed"));
                setTimeout(() => wait(attempts + 1), 50);
            };
            wait();
        };
        script.onerror = () => reject(new Error("Google Maps load failed"));
        document.head.appendChild(script);
    });

const FieldError = ({ message }) => {
    if (!message) return null;
    return (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {message}
        </p>
    );
};

const formInputClass =
    "w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-2 lg:py-1.5 text-sm lg:text-xs text-[#111827] shadow-sm outline-none transition focus:border-[#1F41BB] focus:ring-2 focus:ring-[#1F41BB]/20 disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]";
const formSelectClass = formInputClass;
const formInputErrorClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";
const formLabelClass = "mb-1 lg:mb-0.5 block text-xs lg:text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]";

const REMINDER_TIME_OPTIONS = [
    { value: "5", label: "5 minutes" },
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "50", label: "50 minutes" },
];

const FormSection = ({ title, description, children, className = "", overflowVisible = false }) => (
    <section className={`rounded-xl border border-[#E5E7EB] bg-white p-2.5 lg:p-2 shadow-sm ${overflowVisible ? "overflow-visible" : "overflow-hidden"} ${className}`}>
        {title && (
            <div className="mb-2 lg:mb-1.5 border-b border-[#F3F4F6] pb-1.5">
                <h3 className="text-sm lg:text-xs font-semibold text-[#111827]">{title}</h3>
                {description && <p className="mt-0.5 text-xs text-[#6B7280] hidden sm:block lg:hidden">{description}</p>}
            </div>
        )}
        <div className="space-y-2 lg:space-y-1.5">{children}</div>
    </section>
);

const FormField = ({ label, children, className = "" }) => (
    <div className={className}>
        {label && <label className={formLabelClass}>{label}</label>}
        {children}
    </div>
);

const AlertModal = ({ isOpen, message, onClose }) => {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => { onClose(); }, 10000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl">
                <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold text-black mb-2 text-center">Alert</h3>
                        <p className="text-sm text-gray-600">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button btnSize="md" type="filled" className="px-4 py-3 text-xs text-white rounded" onClick={onClose}>
                        Ok
                    </Button>
                </div>
            </div>
        </div>
    );
};

const playSuccessSound = () => {
    try {
        const audio = new Audio(successSound);
        audio.play().catch(error => {
            console.log('Audio play failed:', error);
        });
    } catch (error) {
        console.log('Audio not supported:', error);
    }
};

const fetchOsrmRouteDistance = async (pickup, destination, viaCoords = []) => {
    const pts = [
        `${pickup.lng},${pickup.lat}`,
        ...(viaCoords || []).filter((c) => c?.lat && c?.lng).map((c) => `${c.lng},${c.lat}`),
        `${destination.lng},${destination.lat}`,
    ];
    try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pts.join(";")}?overview=false`);
        const data = await res.json();
        if (data?.routes?.[0]?.distance) {
            return (data.routes[0].distance / 1000).toFixed(2);
        }
    } catch (error) {
        console.error("OSRM distance error:", error);
    }
    return null;
};

const fetchGoogleRouteDistance = (pickup, destination, viaCoords = []) =>
    new Promise((resolve) => {
        if (!window.google?.maps) return resolve(null);
        const waypoints = (viaCoords || [])
            .filter((c) => c?.lat && c?.lng)
            .map((c) => ({ location: new window.google.maps.LatLng(c.lat, c.lng), stopover: true }));
        new window.google.maps.DirectionsService().route(
            {
                origin: { lat: pickup.lat, lng: pickup.lng },
                destination: { lat: destination.lat, lng: destination.lng },
                waypoints,
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status !== "OK" || !result?.routes?.[0]) return resolve(null);
                const meters = result.routes[0].legs.reduce(
                    (sum, leg) => sum + (leg.distance?.value || 0),
                    0
                );
                resolve(meters ? (meters / 1000).toFixed(2) : null);
            }
        );
    });

const fetchBarikoiRouteDistance = async (pickup, destination, barikoiKey) => {
    if (!barikoiKey) return null;
    try {
        const points = `${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}`;
        const res = await fetch(
            `https://barikoi.xyz/v2/api/route/${points}?api_key=${barikoiKey}&geometries=geojson&profile=car`
        );
        const data = await res.json();
        if (data?.routes?.[0]?.distance) {
            return (data.routes[0].distance / 1000).toFixed(2);
        }
    } catch (error) {
        console.error("Barikoi distance error:", error);
    }
    return null;
};

const fetchRouteDistance = async (pickup, destination, viaCoords, mapsApi, apiKeys) => {
    const hasVia = (viaCoords || []).some((c) => c?.lat && c?.lng);
    let distance = null;

    if (mapsApi === "google") {
        distance = await fetchGoogleRouteDistance(pickup, destination, viaCoords);
    } else if ((mapsApi === MAP_PROVIDER_BARIKOI || mapsApi === "barikoi") && !hasVia) {
        distance = await fetchBarikoiRouteDistance(pickup, destination, apiKeys?.barikoiKey);
    }

    if (!distance) {
        distance = await fetchOsrmRouteDistance(pickup, destination, viaCoords);
    }

    return distance;
};

const DEFAULT_FORM_VALUES = {
    pickup_location: "", destination_location: "", via_points: [],
    via_latitude: [], via_longitude: [],
    pickup_latitude: "", pickup_longitude: "",
    destination_latitude: "", destination_longitude: "",
    pickup_plot_id: null, destination_plot_id: null, via_plot_id: [],
    sub_company: "", account: "", vehicle: "", driver: "",
    journey_type: "one_way", booking_system: "auto_dispatch",
    auto_dispatch: true, bidding: false, request_for_vehicle: false,
    pickup_time_type: "asap", pickup_time: "", reminder_minutes: "",
    booking_date: "", booking_type: "outstation",
    name: "", email: "", phone_no: "", tel_no: "",
    passenger: 1, luggage: 0, hand_luggage: 0,
    special_request: "", payment_reference: "", payment_method: "cash",
    base_fare: "", fares: "", return_fares: "", parking_charges: "",
    booking_fee_charges: "", ac_fares: "", return_ac_fares: "",
    ac_parking_charges: "", waiting_charges: "", extra_charges: "",
    congestion_toll: "", ac_waiting_charges: "", total_charges: "",
    distance: "", user_id: "",
    multi_days: [], multi_start_at: "", multi_end_at: "", week_pattern: "",
};

const AddBooking = ({ setIsOpen, onBookingCreated, editBooking = null, isModalOpen = false }) => {
    const isEditMode = Boolean(editBooking?.id);
    const todayWeekday = getTodayWeekdayLabel();
    const rawTenant = getTenantData();
    const tenant = rawTenant?.data || rawTenant || {};
    const SEARCH_API = tenant?.search_api || rawTenant?.search_api;
    const tenantCountryIso = getTenantCountryIso();
    const {
        mapType: mapsApi,
        mapError,
        apiKeys,
        mapSearchPreferences,
        mapSearchPreferencesLoading,
        saveMapSearchPreferences,
        applyMapSearchPreferences,
    } = useMapConfiguration();

    const [countryCode, setCountryCode] = useState(tenantCountryIso?.toLowerCase() || "");
    const defaultDialCode = getTenantDialCode();

    const [subCompanyList, setSubCompanyList] = useState([]);
    const [vehicleList, setVehicleList] = useState([]);
    const [driverList, setDriverList] = useState([]);
    const [accountList, setAccountList] = useState([]);
    const [loadingSubCompanies, setLoadingSubCompanies] = useState(false);
    const [searchApi, setSearchApi] = useState(SEARCH_API);
    const [googleService, setGoogleService] = useState(null);
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState([]);
    const [viaSuggestions, setViaSuggestions] = useState({});
    const [showPickup, setShowPickup] = useState(false);
    const [showDestination, setShowDestination] = useState(false);
    const [showVia, setShowVia] = useState({});
    const [pickupSearchLoading, setPickupSearchLoading] = useState(false);
    const [destinationSearchLoading, setDestinationSearchLoading] = useState(false);
    const [viaSearchLoading, setViaSearchLoading] = useState({});
    const [pickupSearchError, setPickupSearchError] = useState("");
    const [destinationSearchError, setDestinationSearchError] = useState("");
    const [viaSearchError, setViaSearchError] = useState({});
    const [locationSidebar, setLocationSidebar] = useState(EMPTY_LOCATION_SIDEBAR);
    const [nearbyBoundaryCountry, setNearbyBoundaryCountry] = useState(null);
    const [pickupPlotData, setPickupPlotData] = useState(null);
    const [destinationPlotData, setDestinationPlotData] = useState(null);
    const [viaPlotData, setViaPlotData] = useState({});
    const [stablePickupCoords, setStablePickupCoords] = useState(null);
    const [stableDestinationCoords, setStableDestinationCoords] = useState(null);
    const [stableViaCoords, setStableViaCoords] = useState([]);
    const setFieldValueRef = useRef(null);
    const [fareData, setFareData] = useState(null);
    const [fareLoading, setFareLoading] = useState(false);
    const [fareError, setFareError] = useState(null);
    const [fareCalculated, setFareCalculated] = useState(false);
    const [isBookingLoading, setIsBookingLoading] = useState(false);
    const [editBookingLoading, setEditBookingLoading] = useState(false);
    const [isMultiBooking, setIsMultiBooking] = useState(false);
    const [isManualDispatchOnly, setIsManualDispatchOnly] = useState(false);
    const [isPlotBasedDispatchEnabled, setIsPlotBasedDispatchEnabled] = useState(false);
    const [loadingDispatchSystem, setLoadingDispatchSystem] = useState(true);
    const dispatcherId = getDispatcherId();
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
    const [companyCountryOfUse, setCompanyCountryOfUse] = useState(
        tenantCountryIso || "IN"
    );
    const [userSuggestions, setUserSuggestions] = useState([]);
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userHistory, setUserHistory] = useState([]);
    const [calculateErrors, setCalculateErrors] = useState({});
    const [bookingErrors, setBookingErrors] = useState({});
    const [driverRawList, setDriverRawList] = useState([]);
    const [filteredVehicleList, setFilteredVehicleList] = useState([]);
    const [plotsData, setPlotsData] = useState([]);
    const searchAbortRef = useState({ pickup: null, destination: null, via: {} })[0];
    const searchDebounceRef = useState({ pickup: null, destination: null, via: {} })[0];
    const activeLocationQueriesRef = useRef({ pickup: "", destination: "", via: {} });
    const locationSidebarAbortRef = useRef(null);
    const userGeoCoordsRef = useRef(null);
    const userGeoRequestRef = useRef(null);
    const mapSearchPreferencesRef = useRef(mapSearchPreferences);

    useEffect(() => {
        mapSearchPreferencesRef.current = mapSearchPreferences;
    }, [mapSearchPreferences]);

    const clearCalcError = (key) => setCalculateErrors(prev => ({ ...prev, [key]: undefined }));
    const clearBookingError = (key) => setBookingErrors(prev => ({ ...prev, [key]: undefined }));
    const clearFieldErrors = (key) => { clearCalcError(key); clearBookingError(key); };

    const [initialFormValues, setInitialFormValues] = useState(() => {
        if (editBooking?.id) {
            return mapBookingToFormValues(editBooking, { mode: "edit" }) || DEFAULT_FORM_VALUES;
        }
        return DEFAULT_FORM_VALUES;
    });
    const [newBookingFormKey, setNewBookingFormKey] = useState(0);

    const chargeFields = [
        "fares", "return_fares", "waiting_time", "parking_charges", "ac_fares",
        "return_ac_fares", "ac_parking_charges", "waiting_charges", "extra_charges",
        "congestion_toll", "ac_waiting_charges",
    ];

    const handlePickupConfirmed = useCallback((coords) => {
        setStablePickupCoords(coords);
    }, []);

    const handleDestinationConfirmed = useCallback((coords) => {
        setStableDestinationCoords(coords);
    }, []);

    const applyMapFieldValue = useCallback((field, value) => {
        setFieldValueRef.current?.(field, value);
    }, []);

    const mapViaCoords = useMemo(
        () => stableViaCoords.filter(Boolean),
        [stableViaCoords]
    );

    const searchUsers = debounce(async (query) => {
        if (!query || query.length < 3) { setUserSuggestions([]); setShowUserSuggestions(false); return; }
        setLoadingUsers(true);
        try {
            const response = await apiGetUser({ search: query, perPage: 10 });
            if (response?.data?.success === 1) {
                const users = response?.data?.users?.data || [];
                setUserSuggestions(users);
                setShowUserSuggestions(users.length > 0);
            } else { setUserSuggestions([]); setShowUserSuggestions(false); }
        } catch { setUserSuggestions([]); setShowUserSuggestions(false); }
        finally { setLoadingUsers(false); }
    }, 500);

    const selectUser = (user, setFieldValue) => {
        setFieldValue("phone_no", user.phone_no || "");
        setFieldValue("name", user.name || "");
        setFieldValue("email", user.email || "");
        setFieldValue("tel_no", user.tel_no || "");
        setFieldValue("user_id", user.id || "");
        setShowUserSuggestions(false);
        setUserSuggestions([]);
    };

    const persistMapSearchPreferences = useCallback(async (nextPreferences) => {
        await saveMapSearchPreferences(
            nextPreferences.nearbySearch,
            nextPreferences.boundaryCountry
        );
        return true;
    }, [saveMapSearchPreferences]);

    const syncMapSearchPreferencesFromApi = useCallback((prefs) => {
        if (!prefs) return;

        mapSearchPreferencesRef.current = prefs;
        applyMapSearchPreferences(prefs.nearbySearch, prefs.boundaryCountry);

        if (prefs.nearbySearch && userGeoCoordsRef.current?.boundaryCountry) {
            setNearbyBoundaryCountry(userGeoCoordsRef.current.boundaryCountry);
        } else if (!prefs.nearbySearch) {
            setNearbyBoundaryCountry(null);
        }
    }, [applyMapSearchPreferences]);

    useEffect(() => {
        if (apiKeys.searchApi) {
            setSearchApi(apiKeys.searchApi.toLowerCase());
        }
        if (apiKeys.countryOfUse) {
            setCountryCode(apiKeys.countryOfUse.toLowerCase());
            setCompanyCountryOfUse(apiKeys.countryOfUse.toUpperCase());
        }
    }, [apiKeys.searchApi, apiKeys.countryOfUse, mapsApi]);

    useEffect(() => {
        const normalizePlotList = (response) => {
            const payload = response?.data;
            if (!payload) return [];
            if (Array.isArray(payload)) return payload;
            if (Array.isArray(payload.data)) return payload.data;
            if (Array.isArray(payload.data?.data)) return payload.data.data;
            if (Array.isArray(payload.list?.data)) return payload.list.data;
            return [];
        };

        const fetchPlotsForDispatch = async (plotBasedDispatchEnabled) => {
            try {
                if (plotBasedDispatchEnabled) {
                    const res = await apiGetBackupPlot({ page: 1, perPage: 1000 });
                    if (res?.data?.success === 1 || res?.data?.success === true) {
                        setPlotsData(normalizePlotList(res));
                    }
                    return;
                }

                const res = await apiGetAllPlot({ page: 1, limit: 100 });
                if (res.data?.success) setPlotsData(res.data.data?.data || res.data.data || []);
            } catch (err) {
                console.error("Fetch plots error:", err);
            }
        };

        const checkDispatchSystem = async () => {
            try {
                setLoadingDispatchSystem(true);
                const response = await apiGetDispatchSystem();
                let data = response?.data?.data || response?.data || response;
                if (!Array.isArray(data)) {
                    if (data && typeof data === 'object') {
                        const keys = ['items', 'results', 'dispatches', 'systems', 'list'];
                        for (const key of keys) { if (Array.isArray(data[key])) { data = data[key]; break; } }
                    }
                    if (!Array.isArray(data)) {
                        data = (data && typeof data === 'object' && Object.keys(data).length > 0) ? [data] : [];
                    }
                }
                const plotBasedDispatchEnabled = dispatchSystemListHasPlotBased(data);

                setIsPlotBasedDispatchEnabled(plotBasedDispatchEnabled);
                setIsManualDispatchOnly(data.some(isManualDispatchOnlySystem));

                await fetchPlotsForDispatch(plotBasedDispatchEnabled);
            } catch {
                setIsManualDispatchOnly(false);
                setIsPlotBasedDispatchEnabled(false);
                await fetchPlotsForDispatch(false);
            }
            finally { setLoadingDispatchSystem(false); }
        };
        checkDispatchSystem();
    }, []);

    useEffect(() => {
        const fetch = async () => {
            setLoadingSubCompanies(true);
            try {
                const r = await apiGetSubCompany();
                if (r?.data?.success === 1)
                    setSubCompanyList((r?.data?.list?.data || []).map(c => ({ label: c.name, value: c.id.toString() })));
            } catch { } finally { setLoadingSubCompanies(false); }
        };
        fetch();
    }, []);

    useEffect(() => {
        const fetch = async () => {
            setLoadingSubCompanies(true);
            try {
                const r = await apiGetAccount();
                if (r?.data?.success === 1)
                    setAccountList((r?.data?.list?.data || []).map(a => ({ label: a.name, value: a.id.toString() })));
            } catch { } finally { setLoadingSubCompanies(false); }
        };
        fetch();
    }, []);

    useEffect(() => {
        const fetch = async () => {
            setLoadingSubCompanies(true);
            try {
                const r = await apiGetDriverManagement({ status: "accepted", page: 1, perPage: 1000 });
                if (r?.data?.success === 1) {
                    const drivers = r?.data?.list?.data || r?.data?.list || [];
                    setDriverRawList(drivers);
                    setDriverList(drivers.map(d => ({
                        label: d.name, value: d.id.toString(),
                        assigned_vehicle: d.assigned_vehicle, vehicle_type: d.vehicle_type,
                    })));
                }
            } catch { } finally { setLoadingSubCompanies(false); }
        };
        fetch();
    }, []);

    useEffect(() => {
        const fetch = async () => {
            setLoadingSubCompanies(true);
            try {
                const r = await apiGetAllVehicleType();
                if (r?.data?.success === 1) {
                    const opts = (r?.data?.list || []).map(v => ({ label: v.vehicle_type_name, value: v.id.toString() }));
                    setVehicleList(opts);
                    setFilteredVehicleList(opts);
                }
            } catch { } finally { setLoadingSubCompanies(false); }
        };
        fetch();
    }, []);

    useEffect(() => {
        if (searchApi === "google" || searchApi === "both") {
            const { googleKey } = apiKeys;
            loadGoogleScript(googleKey).then(() => setGoogleService(new window.google.maps.places.AutocompleteService()));
        }
    }, [searchApi, apiKeys]);

    const populateFormFromBooking = useCallback(async (booking) => {
        if (!booking?.id) return;

        const formValues = mapBookingToFormValues(booking, { mode: "edit" });
        if (!formValues) return;

        const resolvedFormValues = await resolveFormLocationLabels(formValues);
        setInitialFormValues(resolvedFormValues);
        setIsMultiBooking(false);

        if (resolvedFormValues.pickup_latitude && resolvedFormValues.pickup_longitude) {
            const c = {
                lat: parseFloat(resolvedFormValues.pickup_latitude),
                lng: parseFloat(resolvedFormValues.pickup_longitude),
            };
            setStablePickupCoords(c);
            fetchPlotName(resolvedFormValues.pickup_latitude, resolvedFormValues.pickup_longitude).then(setPickupPlotData);
        } else {
            setStablePickupCoords(null);
            setPickupPlotData(null);
        }

        if (resolvedFormValues.destination_latitude && resolvedFormValues.destination_longitude) {
            const c = {
                lat: parseFloat(resolvedFormValues.destination_latitude),
                lng: parseFloat(resolvedFormValues.destination_longitude),
            };
            setStableDestinationCoords(c);
            fetchPlotName(resolvedFormValues.destination_latitude, resolvedFormValues.destination_longitude).then(setDestinationPlotData);
        } else {
            setStableDestinationCoords(null);
            setDestinationPlotData(null);
        }

        if (resolvedFormValues.via_latitude?.length > 0) {
            const viaC = [];
            resolvedFormValues.via_latitude.slice(0, 2).forEach((lat, i) => {
                const lng = resolvedFormValues.via_longitude[i];
                if (lat && lng) {
                    viaC[i] = { lat: parseFloat(lat), lng: parseFloat(lng) };
                    fetchPlotName(lat, lng).then((pd) => setViaPlotData((prev) => ({ ...prev, [i]: pd })));
                }
            });
            setStableViaCoords(viaC);
        } else {
            setStableViaCoords([]);
            setViaPlotData({});
        }

        const totalAmount = parseFloat(resolvedFormValues.total_charges) || 0;
        const baseFare = parseFloat(resolvedFormValues.fares) || totalAmount;
        if (totalAmount || baseFare) {
            setFareCalculated(true);
            setFareData({
                calculate_fare: baseFare,
                distance: parseFloat(booking.distance) || null,
            });
        } else {
            setFareCalculated(false);
            setFareData(null);
        }
    }, []);

    useEffect(() => {
        if (!editBooking?.id) return;

        let cancelled = false;
        populateFormFromBooking(editBooking);

        const loadEditBooking = async () => {
            setEditBookingLoading(true);
            try {
                const response = await apiGetEditBooking(editBooking.id);
                if (cancelled) return;

                if (isApiSuccess(response?.data)) {
                    const booking = extractUpdatedBookingFromResponse(response.data, editBooking);
                    populateFormFromBooking(booking);
                } else {
                    toast.error(response?.data?.message || "Failed to load booking for edit");
                }
            } catch (error) {
                if (!cancelled) {
                    toast.error(getApiErrorMessage(error, "Failed to load booking for edit"));
                }
            } finally {
                if (!cancelled) setEditBookingLoading(false);
            }
        };

        loadEditBooking();
        return () => {
            cancelled = true;
        };
    }, [editBooking?.id, populateFormFromBooking]);

    const getLocationBiasOrigin = () => {
        const coords =
            stablePickupCoords ||
            stableDestinationCoords ||
            stableViaCoords?.find(Boolean);

        if (coords?.lat != null && coords?.lng != null) {
            return { lat: Number(coords.lat), lon: Number(coords.lng) };
        }
        const code = countryCode?.trim().toUpperCase() || tenantCountryIso?.toUpperCase();
        return SEARCH_COUNTRY_CENTERS[code] || SEARCH_COUNTRY_CENTERS.DEFAULT;
    };

    const resolveNearbyBoundaryCountry = useCallback(async (coords, signal) => {
        if (coords?.lat == null || coords?.lon == null) {
            return null;
        }

        if (mapsApi === MAP_PROVIDER_DEFAULT && isReverseGeocodingAvailable()) {
            const countryCode = await fetchMapifyBoundaryCountryFromCoords({
                lat: coords.lat,
                lon: coords.lon,
                signal,
                allowFallback: false,
            });
            if (countryCode) return countryCode;
        }

        return null;
    }, [mapsApi]);

    const fetchUserGeolocation = useCallback(async ({ force = false } = {}) => {
        if (!force && userGeoCoordsRef.current) {
            return userGeoCoordsRef.current;
        }

        if (!force && userGeoRequestRef.current) {
            return userGeoRequestRef.current;
        }

        const request = requestBrowserGeolocation({ enableHighAccuracy: true }).then(async (coords) => {
            userGeoRequestRef.current = null;
            if (coords?.lat == null || coords?.lon == null) {
                userGeoCoordsRef.current = null;
                return null;
            }

            const boundaryCountry = await resolveNearbyBoundaryCountry(coords);
            const resolved = {
                lat: coords.lat,
                lon: coords.lon,
                boundaryCountry,
            };
            userGeoCoordsRef.current = resolved;
            setNearbyBoundaryCountry(boundaryCountry || null);
            return resolved;
        });

        userGeoRequestRef.current = request;
        return request;
    }, [resolveNearbyBoundaryCountry]);

    const resolveMapifySearchContext = useCallback(async () => {
        const prefs = mapSearchPreferencesRef.current;
        const bias = getLocationBiasOrigin();
        return {
            nearbySearch: false,
            boundaryCountry: prefs.boundaryCountry || null,
            lat: bias.lat,
            lon: bias.lon,
        };
    }, [stablePickupCoords, stableDestinationCoords, stableViaCoords, countryCode, tenantCountryIso]);

    const disableNearbySearch = useCallback(async () => {
        userGeoCoordsRef.current = null;
        userGeoRequestRef.current = null;
        setNearbyBoundaryCountry(null);
        mapSearchPreferencesRef.current = {
            ...mapSearchPreferencesRef.current,
            nearbySearch: false,
        };
        await persistMapSearchPreferences({
            nearbySearch: false,
            boundaryCountry: mapSearchPreferences.boundaryCountry || null,
        });
    }, [mapSearchPreferences.boundaryCountry, persistMapSearchPreferences]);

    const handleNearbySearchChange = useCallback(async (enabled) => {
        if (!enabled) {
            await disableNearbySearch();
            return true;
        }

        const coords = await fetchUserGeolocation({ force: true });
        if (!coords) {
            toast.error("Unable to access your location. Nearby search requires location permission.");
            return false;
        }

        mapSearchPreferencesRef.current = {
            nearbySearch: true,
            boundaryCountry: null,
        };

        await persistMapSearchPreferences({
            nearbySearch: true,
            boundaryCountry: null,
        });
        return true;
    }, [
        disableNearbySearch,
        fetchUserGeolocation,
        persistMapSearchPreferences,
    ]);

    const getGoogleSearchCountry = useCallback(() => {
        if (!mapSearchPreferences.nearbySearch) {
            const boundary = mapSearchPreferences.boundaryCountry;
            return toGoogleCountryCode(boundary) || countryCode;
        }
        return countryCode;
    }, [countryCode, mapSearchPreferences.nearbySearch, mapSearchPreferences.boundaryCountry]);

    const cancelPendingSearch = (type, index = null) => {
        if (type === "via") {
            const key = String(index);
            searchDebounceRef.via[key] && clearTimeout(searchDebounceRef.via[key]);
            searchDebounceRef.via[key] = null;
            searchAbortRef.via[key]?.abort?.();
            searchAbortRef.via[key] = null;
            return;
        }
        searchDebounceRef[type] && clearTimeout(searchDebounceRef[type]);
        searchDebounceRef[type] = null;
        searchAbortRef[type]?.abort?.();
        searchAbortRef[type] = null;
    };

    const setLocationSearchLoading = (type, index, loading) => {
        if (type === "pickup") setPickupSearchLoading(loading);
        else if (type === "destination") setDestinationSearchLoading(loading);
        else setViaSearchLoading((prev) => ({ ...prev, [index]: loading }));
    };

    const setLocationSearchError = (type, index, message) => {
        if (type === "pickup") setPickupSearchError(message);
        else if (type === "destination") setDestinationSearchError(message);
        else setViaSearchError((prev) => ({ ...prev, [index]: message }));
    };

    const updateSuggestions = (list, type, index, shouldShow = true) => {
        if (type === "pickup") {
            setPickupSuggestions(list);
            setShowPickup(shouldShow && list.length > 0);
        } else if (type === "destination") {
            setDestinationSuggestions(list);
            setShowDestination(shouldShow && list.length > 0);
        } else {
            setViaSuggestions((v) => ({ ...v, [index]: list }));
            setShowVia((v) => ({ ...v, [index]: shouldShow && list.length > 0 }));
        }
    };

    const isMapifyLocationSearch = () => mapsApi === MAP_PROVIDER_DEFAULT;

    const showNearbySearchControls = isMapifyLocationSearch();

    const closeLocationSidebar = useCallback(() => {
        locationSidebarAbortRef.current?.abort?.();
        locationSidebarAbortRef.current = null;
        setLocationSidebar(EMPTY_LOCATION_SIDEBAR);
    }, []);

    const resetNewBookingState = useCallback(() => {
        cancelPendingSearch("pickup");
        cancelPendingSearch("destination");
        Object.keys(searchAbortRef.via || {}).forEach((key) => cancelPendingSearch("via", key));
        closeLocationSidebar();

        setInitialFormValues(DEFAULT_FORM_VALUES);
        setNewBookingFormKey((key) => key + 1);
        setPickupSuggestions([]);
        setDestinationSuggestions([]);
        setViaSuggestions({});
        setShowPickup(false);
        setShowDestination(false);
        setShowVia({});
        setPickupSearchLoading(false);
        setDestinationSearchLoading(false);
        setViaSearchLoading({});
        setPickupSearchError("");
        setDestinationSearchError("");
        setViaSearchError({});
        setPickupPlotData(null);
        setDestinationPlotData(null);
        setViaPlotData({});
        setStablePickupCoords(null);
        setStableDestinationCoords(null);
        setStableViaCoords([]);
        setFareData(null);
        setFareLoading(false);
        setFareError(null);
        setFareCalculated(false);
        setIsMultiBooking(false);
        setCalculateErrors({});
        setBookingErrors({});
        setUserSuggestions([]);
        setShowUserSuggestions(false);
        setSelectedUser(null);
        setUserHistory([]);
        setShowHistoryModal(false);
        setIsBookingLoading(false);
        activeLocationQueriesRef.current = { pickup: "", destination: "", via: {} };
    }, [closeLocationSidebar]);

    const wasModalOpenRef = useRef(false);
    useEffect(() => {
        if (wasModalOpenRef.current && !isModalOpen && !editBooking?.id) {
            resetNewBookingState();
        }
        wasModalOpenRef.current = isModalOpen;
    }, [isModalOpen, editBooking?.id, resetNewBookingState]);

    const fetchLocationSearchResults = useCallback(async (cleanedQuery, signal, { size = MAPIFY_AUTOCOMPLETE_SIZE } = {}) => {
        let results = [];

        if (isMapifyLocationSearch()) {
            const searchContext = await resolveMapifySearchContext(signal);
            if (searchContext.error) {
                throw new Error(searchContext.error);
            }
            results = await fetchMapifyLocationSuggestions({
                query: cleanedQuery,
                lat: searchContext.lat,
                lon: searchContext.lon,
                nearbySearch: searchContext.nearbySearch,
                boundaryCountry: searchContext.boundaryCountry,
                signal,
                size,
                onPreferencesSynced: syncMapSearchPreferencesFromApi,
            });
            return results;
        }

        if ((searchApi === "google" || searchApi === "both") && googleService) {
            const googleCountry = getGoogleSearchCountry();
            results = await new Promise((resolve) => {
                googleService.getPlacePredictions(
                    {
                        input: cleanedQuery,
                        componentRestrictions: googleCountry ? { country: googleCountry } : undefined,
                    },
                    (predictions, status) => {
                        if (status === "OK") {
                            resolve(predictions.map((p) => ({
                                id: p.place_id,
                                label: p.description,
                                inputValue: p.description,
                                place_id: p.place_id,
                                source: "google",
                            })));
                        } else {
                            resolve([]);
                        }
                    }
                );
            });
        }

        if (searchApi === "barikoi" || searchApi === "both") {
            const res = await fetch(
                `https://barikoi.xyz/v1/api/search/autocomplete/${apiKeys.barikoiKey || BARIKOI_KEY}/place?q=${encodeURIComponent(cleanedQuery)}`,
                { signal }
            );
            const json = await res.json();
            const barikoiList = (json.places || []).map((p) => ({
                id: `${p.latitude}-${p.longitude}`,
                label: p.address || p.place_name,
                inputValue: p.address || p.place_name,
                subtitle: p.place_name && p.address ? p.place_name : "",
                lat: p.latitude,
                lng: p.longitude,
                source: "barikoi",
            }));
            results = searchApi === "both" ? [...results, ...barikoiList] : barikoiList;
        }

        return results;
    }, [
        apiKeys.barikoiKey,
        googleService,
        searchApi,
        mapsApi,
        getGoogleSearchCountry,
        resolveMapifySearchContext,
        syncMapSearchPreferencesFromApi,
    ]);

    const runSidebarLocationSearch = useCallback(async (field, query) => {
        const cleanedQuery = query?.trim() || "";
        if (cleanedQuery.length < 2) {
            toast.error("Enter at least 2 characters to search");
            return;
        }

        cancelPendingSearch(field);
        activeLocationQueriesRef.current[field] = cleanedQuery;

        if (field === "pickup") {
            setShowPickup(false);
            setPickupSearchLoading(false);
        } else if (field === "destination") {
            setShowDestination(false);
            setDestinationSearchLoading(false);
        }

        locationSidebarAbortRef.current?.abort?.();
        const controller = new AbortController();
        locationSidebarAbortRef.current = controller;

        setLocationSidebar({
            open: true,
            field,
            query: cleanedQuery,
            results: [],
            loading: true,
            error: "",
        });

        try {
            const results = await fetchLocationSearchResults(
                cleanedQuery,
                controller.signal,
                { size: MAPIFY_FULL_SEARCH_SIZE }
            );
            if (controller.signal.aborted) return;

            setLocationSidebar({
                open: true,
                field,
                query: cleanedQuery,
                results,
                loading: false,
                error: results.length ? "" : "No locations found",
            });
        } catch (err) {
            if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") return;
            console.error("Location sidebar search error:", err);
            setLocationSidebar({
                open: true,
                field,
                query: cleanedQuery,
                results: [],
                loading: false,
                error: err?.response?.data?.message || "Failed to search locations",
            });
        }
    }, [fetchLocationSearchResults]);

    const searchLocation = async (query, type, index = null) => {
        const cleanedQuery = query?.trim() || "";
        cancelPendingSearch(type, index);

        if (cleanedQuery.length < 2) {
            if (type === "via") {
                activeLocationQueriesRef.current.via[index] = "";
            } else {
                activeLocationQueriesRef.current[type] = "";
            }
            updateSuggestions([], type, index, false);
            setLocationSearchLoading(type, index, false);
            setLocationSearchError(type, index, "");
            return;
        }

        if (type === "via") {
            activeLocationQueriesRef.current.via[index] = cleanedQuery;
        } else {
            activeLocationQueriesRef.current[type] = cleanedQuery;
        }

        setLocationSearchLoading(type, index, true);
        setLocationSearchError(type, index, "");

        const runSearch = async () => {
            const controller = new AbortController();
            if (type === "via") searchAbortRef.via[String(index)] = controller;
            else searchAbortRef[type] = controller;

            try {
                const list = await fetchLocationSearchResults(cleanedQuery, controller.signal);
                if (controller.signal.aborted) return;
                updateSuggestions(list, type, index, true);
                if (!list.length) {
                    setLocationSearchError(type, index, "No locations found");
                }
            } catch (err) {
                if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") return;
                console.error("Location search error:", err);
                updateSuggestions([], type, index, false);
                setLocationSearchError(
                    type,
                    index,
                    err?.response?.data?.message || "Failed to search locations"
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLocationSearchLoading(type, index, false);
                }
            }
        };

        const timer = setTimeout(runSearch, LOCATION_SEARCH_DEBOUNCE_MS);
        if (type === "via") searchDebounceRef.via[String(index)] = timer;
        else searchDebounceRef[type] = timer;
    };

    const searchLocationRef = useRef(searchLocation);
    searchLocationRef.current = searchLocation;

    const refreshActiveLocationSearches = useCallback(() => {
        if (locationSidebar.open && locationSidebar.field && locationSidebar.query?.trim().length >= 2) {
            runSidebarLocationSearch(locationSidebar.field, locationSidebar.query);
        }
        const queries = activeLocationQueriesRef.current;
        if (queries.pickup?.trim().length >= 2) {
            searchLocationRef.current(queries.pickup, "pickup");
        }
        if (queries.destination?.trim().length >= 2) {
            searchLocationRef.current(queries.destination, "destination");
        }
        Object.entries(queries.via || {}).forEach(([index, query]) => {
            if (query?.trim().length >= 2) {
                searchLocationRef.current(query, "via", Number(index));
            }
        });
    }, [locationSidebar.field, locationSidebar.open, locationSidebar.query, runSidebarLocationSearch]);

    const handleNearbySearchCheckboxChange = useCallback(async (event) => {
        const enabled = await handleNearbySearchChange(event.target.checked);
        if (enabled) {
            refreshActiveLocationSearches();
        }
    }, [handleNearbySearchChange, refreshActiveLocationSearches]);

    useEffect(() => {
        if (!showNearbySearchControls || !mapSearchPreferences.nearbySearch) return undefined;

        let cancelled = false;
        fetchUserGeolocation({ force: true }).then(async (coords) => {
            if (cancelled) return;
            if (!coords) {
                await disableNearbySearch();
                toast.error("Unable to access your location. Nearby search requires location permission.");
                return;
            }
            refreshActiveLocationSearches();
        });

        return () => {
            cancelled = true;
        };
    }, [
        mapSearchPreferences.nearbySearch,
        disableNearbySearch,
        fetchUserGeolocation,
        showNearbySearchControls,
        refreshActiveLocationSearches,
    ]);

    const handleBoundaryCountrySelectChange = useCallback(async (event) => {
        const normalizedCountry = String(event.target.value ?? "").trim().toUpperCase();

        mapSearchPreferencesRef.current = {
            nearbySearch: false,
            boundaryCountry: normalizedCountry || null,
        };

        await persistMapSearchPreferences({
            nearbySearch: false,
            boundaryCountry: normalizedCountry || null,
        });
        refreshActiveLocationSearches();
    }, [persistMapSearchPreferences, refreshActiveLocationSearches]);

    const getLatLngFromPlaceId = (placeId) =>
        new Promise((resolve) => {
            const service = new window.google.maps.places.PlacesService(document.createElement("div"));
            service.getDetails({ placeId, fields: ["geometry"] }, (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location)
                    resolve({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
                else resolve(null);
            });
        });

    const fetchPlotName = async (lat, lng) => {
        try {
            const formData = new FormData();
            formData.append("latitude", lat);
            formData.append("longitude", lng);
            const res = await apiGetAllPlot(formData);
            if (res?.data?.success === 1 && res.data.found === 1 && res.data.record)
                return { found: true, id: res.data.record.id, name: res.data.record.name };
        } catch { }
        return { found: false, id: null, name: "Plot Not Found" };
    };

    const selectLocation = async (item, type, setFieldValue, index = null) => {
        let displayValue = item.inputValue || item.label;
        if (type === "pickup") {
            setShowPickup(false);
            closeLocationSidebar();
        } else if (type === "destination") {
            setShowDestination(false);
            closeLocationSidebar();
        } else {
            setShowVia(v => ({ ...v, [index]: false }));
        }

        setLocationSearchError(type, index, "");

        let latLng = null;
        if (item.source === "google") latLng = await getLatLngFromPlaceId(item.place_id);
        else if (item.source === "barikoi") latLng = { lat: item.lat, lng: item.lng };
        else if (item.source === "mapify") latLng = { lat: item.lat, lng: item.lng };

        if (latLng && mapsApi === MAP_PROVIDER_DEFAULT) {
            const resolved = await fetchMapifyAddressFromCoords({ lat: latLng.lat, lon: latLng.lng });
            if (resolved) displayValue = resolved;
        }

        if (type === "pickup") setFieldValue("pickup_location", displayValue);
        else if (type === "destination") setFieldValue("destination_location", displayValue);
        else setFieldValue(`via_points[${index}]`, displayValue);

        let plotData = { found: false, id: null, name: "Plot Not Found" };
        if (latLng) {
            plotData = await fetchPlotName(latLng.lat, latLng.lng);
            if (type === "pickup") {
                setFieldValue("pickup_latitude", latLng.lat);
                setFieldValue("pickup_longitude", latLng.lng);
                setFieldValue("pickup_plot_id", plotData.id);
                setStablePickupCoords({ lat: latLng.lat, lng: latLng.lng });
            } else if (type === "destination") {
                setFieldValue("destination_latitude", latLng.lat);
                setFieldValue("destination_longitude", latLng.lng);
                setFieldValue("destination_plot_id", plotData.id);
                setStableDestinationCoords({ lat: latLng.lat, lng: latLng.lng });
            } else {
                setFieldValue(`via_latitude[${index}]`, latLng.lat);
                setFieldValue(`via_longitude[${index}]`, latLng.lng);
                setFieldValue(`via_plot_id[${index}]`, plotData.id);
                setStableViaCoords(prev => {
                    const updated = [...prev];
                    updated[index] = { lat: latLng.lat, lng: latLng.lng };
                    return updated;
                });
            }
        }

        if (type === "pickup") setPickupPlotData(plotData);
        else if (type === "destination") setDestinationPlotData(plotData);
        else setViaPlotData(p => ({ ...p, [index]: plotData }));

        invalidateFare();
    };

    const getCoordinatesFromAddress = async (address) => {
        if (!address) return null;
        try {
            if ((searchApi === "google" || searchApi === "both") && window.google?.maps) {
                const geocoder = new window.google.maps.Geocoder();
                return new Promise((resolve) => {
                    geocoder.geocode({ address }, (results, status) => {
                        if (status === "OK" && results[0]) {
                            resolve({ latitude: results[0].geometry.location.lat(), longitude: results[0].geometry.location.lng() });
                        } else resolve(null);
                    });
                });
            }
            if (mapsApi === MAP_PROVIDER_DEFAULT) {
                const searchContext = await resolveMapifySearchContext();
                if (searchContext.error) {
                    return null;
                }
                const suggestions = await fetchMapifyLocationSuggestions({
                    query: address,
                    lat: searchContext.lat,
                    lon: searchContext.lon,
                    nearbySearch: searchContext.nearbySearch,
                    boundaryCountry: searchContext.boundaryCountry,
                    size: MAPIFY_AUTOCOMPLETE_SIZE,
                    onPreferencesSynced: syncMapSearchPreferencesFromApi,
                });
                const first = suggestions[0];
                if (first) {
                    return { latitude: first.lat, longitude: first.lng };
                }
            }
            if (searchApi === "barikoi" || searchApi === "both") {
                const res = await fetch(`https://barikoi.xyz/v1/api/search/autocomplete/${apiKeys.barikoiKey || BARIKOI_KEY}/place?q=${encodeURIComponent(address)}`);
                const json = await res.json();
                if (json.places?.length > 0) {
                    return { latitude: json.places[0].latitude, longitude: json.places[0].longitude };
                }
            }
            return null;
        } catch (error) {
            console.error("Error getting coordinates:", error);
            return null;
        }
    };

    const validateCalculateFares = (values) => {
        const errors = {};
        if (!values.pickup_location?.trim()) errors.pickup_location = "Pickup point is required";
        if (!values.destination_location?.trim()) errors.destination_location = "Destination is required";
        if (values.request_for_vehicle && !values.vehicle) errors.vehicle = "Vehicle type is required";
        if (!values.journey_type) errors.journey_type = "Journey type is required";
        return errors;
    };

    const validateCreateBooking = (values) => {
        const errors = {};
        if (!values.pickup_location?.trim()) errors.pickup_location = "Pickup point is required";
        if (!values.destination_location?.trim()) errors.destination_location = "Destination is required";
        if (values.request_for_vehicle && !values.vehicle) errors.vehicle = "Vehicle type is required";
        if (!values.journey_type) errors.journey_type = "Journey type is required";
        if (!values.auto_dispatch && !values.bidding) {
            errors.booking_system = "Select Auto Dispatch or Bidding";
        }
        if (!values.booking_type || values.booking_type === "outstation") errors.booking_type = "Please select a booking type";
        if (!isMultiBooking && !values.booking_date) errors.booking_date = "Booking date is required";
        if (values.pickup_time_type === "time" && !values.pickup_time) errors.pickup_time = "Pickup time is required";
        if (
            values.pickup_time_type === "time" &&
            values.reminder_minutes &&
            !REMINDER_TIME_OPTIONS.some((opt) => opt.value === String(values.reminder_minutes))
        ) {
            errors.reminder_minutes = "Please select a valid reminder time";
        }
        if (!values.name?.trim()) errors.name = "Passenger name is required";
        if (!values.phone_no?.trim()) errors.phone_no = "Mobile number is required";
        if (!values.payment_method) errors.payment_method = "Payment method is required";
        if (isMultiBooking) {
            if (!values.multi_days || values.multi_days.length === 0) errors.multi_days = "Please select at least one day";
            if (!values.multi_start_at) errors.multi_start_at = "Start date is required";
            if (!values.multi_end_at) errors.multi_end_at = "End date is required";
            if (values.multi_start_at && values.multi_end_at && new Date(values.multi_start_at) > new Date(values.multi_end_at))
                errors.multi_end_at = "End date cannot be before start date";
            if (
                values.multi_days?.includes(todayWeekday) &&
                values.multi_start_at &&
                values.multi_end_at &&
                !multiBookingIncludesToday(values.multi_days, values.multi_start_at, values.multi_end_at)
            ) {
                errors.multi_days = `${todayWeekday} is selected but the date range does not include today`;
            }
        }
        if (!fareCalculated) errors.fare = "Please calculate fares before creating booking";
        return errors;
    };

    const resolveLocationCoords = async (address, latitude, longitude) => {
        if (latitude && longitude) {
            return { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
        }
        return getCoordinatesFromAddress(address);
    };

    const ensureHumanReadableLocation = async (locationValue, latitude, longitude) => {
        if (locationValue?.trim() && !isCoordinateString(locationValue)) return locationValue;

        if (latitude && longitude && mapsApi === MAP_PROVIDER_DEFAULT) {
            const address = await fetchMapifyAddressFromCoords({
                lat: parseFloat(latitude),
                lon: parseFloat(longitude),
            });
            if (address) return address;
        }

        return locationValue || "";
    };

    const resolveFormLocationLabels = async (formValues) => {
        const next = { ...formValues };

        if (
            (!formValues.pickup_location?.trim() || isCoordinateString(formValues.pickup_location)) &&
            formValues.pickup_latitude &&
            formValues.pickup_longitude
        ) {
            const pickupLabel = await ensureHumanReadableLocation(
                formValues.pickup_location,
                formValues.pickup_latitude,
                formValues.pickup_longitude
            );
            if (pickupLabel) next.pickup_location = pickupLabel;
        }

        if (
            (!formValues.destination_location?.trim() || isCoordinateString(formValues.destination_location)) &&
            formValues.destination_latitude &&
            formValues.destination_longitude
        ) {
            const destinationLabel = await ensureHumanReadableLocation(
                formValues.destination_location,
                formValues.destination_latitude,
                formValues.destination_longitude
            );
            if (destinationLabel) next.destination_location = destinationLabel;
        }

        if (formValues.via_points?.length > 0) {
            const viaPoints = [...formValues.via_points];
            await Promise.all(
                viaPoints.map(async (viaPoint, index) => {
                    const lat = formValues.via_latitude?.[index];
                    const lng = formValues.via_longitude?.[index];
                    if (!isCoordinateString(viaPoint) || !lat || !lng) return;

                    const viaLabel = await ensureHumanReadableLocation(viaPoint, lat, lng);
                    if (viaLabel) viaPoints[index] = viaLabel;
                })
            );
            next.via_points = viaPoints;
        }

        return next;
    };

    useEffect(() => {
        if (!isModalOpen || editBooking?.id) return undefined;

        const storedData = localStorage.getItem("copiedBookingData");
        if (!storedData) return undefined;

        let cancelled = false;

        const loadCopiedBooking = async () => {
            try {
                await ensureMapConfigurationLoaded(fetchMapConfiguration);
                const parsedData = JSON.parse(storedData);
                const resolvedFormValues = await resolveFormLocationLabels({
                    ...parsedData,
                    request_for_vehicle: Boolean(
                        parsedData.request_for_vehicle ?? parsedData.vehicle
                    ),
                });

                if (cancelled) return;

                setInitialFormValues(resolvedFormValues);
                setNewBookingFormKey((key) => key + 1);

                if (resolvedFormValues.pickup_latitude && resolvedFormValues.pickup_longitude) {
                    const c = {
                        lat: parseFloat(resolvedFormValues.pickup_latitude),
                        lng: parseFloat(resolvedFormValues.pickup_longitude),
                    };
                    setStablePickupCoords(c);
                    fetchPlotName(resolvedFormValues.pickup_latitude, resolvedFormValues.pickup_longitude).then(setPickupPlotData);
                }
                if (resolvedFormValues.destination_latitude && resolvedFormValues.destination_longitude) {
                    const c = {
                        lat: parseFloat(resolvedFormValues.destination_latitude),
                        lng: parseFloat(resolvedFormValues.destination_longitude),
                    };
                    setStableDestinationCoords(c);
                    fetchPlotName(resolvedFormValues.destination_latitude, resolvedFormValues.destination_longitude).then(setDestinationPlotData);
                }
                if (resolvedFormValues.via_latitude?.length > 0) {
                    const viaC = [];
                    const limitedViaLat = resolvedFormValues.via_latitude.slice(0, 2);
                    limitedViaLat.forEach((lat, i) => {
                        const lng = resolvedFormValues.via_longitude[i];
                        if (lat && lng) {
                            viaC[i] = { lat: parseFloat(lat), lng: parseFloat(lng) };
                            fetchPlotName(lat, lng).then((pd) => setViaPlotData((prev) => ({ ...prev, [i]: pd })));
                        }
                    });
                    setStableViaCoords(viaC);
                }

                localStorage.removeItem("copiedBookingData");
            } catch {
                localStorage.removeItem("copiedBookingData");
                toast.error("Failed to load booking data");
            }
        };

        loadCopiedBooking();

        return () => {
            cancelled = true;
        };
    }, [isModalOpen, editBooking?.id]);

    const appendAccountFields = (formData, accountId) => {
        const value = accountId ? String(accountId) : "";
        formData.append("account", value);
        formData.append("account_id", value);
    };

    const shouldSendDriverOnSubmit = (values, { isEdit = false } = {}) => {
        if (!values.auto_dispatch) return false;
        if (!isEdit && isPlotBasedDispatchEnabled && !isManualDispatchOnly) return false;
        return true;
    };

    const shouldShowDriverField = (values, isEdit = false) =>
        (values.auto_dispatch || isManualDispatchOnly) &&
        !values.bidding &&
        (isManualDispatchOnly || !isPlotBasedDispatchEnabled || isEdit);

    const requiresPlotBasedPickupValidation = (values) =>
        isPlotBasedDispatchEnabled &&
        !isManualDispatchOnly &&
        Boolean(values.auto_dispatch) &&
        !values.bidding;

    const handleCalculateFares = async (values, setFieldValue) => {
        const errors = validateCalculateFares(values);
        if (Object.keys(errors).length > 0) { setCalculateErrors(errors); setFareLoading(false); return; }
        setCalculateErrors({});
        setFareLoading(true);
        setFareError(null);
        try {
            const pickupCoords = await resolveLocationCoords(
                values.pickup_location,
                values.pickup_latitude,
                values.pickup_longitude
            );
            if (!pickupCoords) { toast.error("Could not get coordinates for pickup point"); setFareLoading(false); return; }

            const destinationCoords = await resolveLocationCoords(
                values.destination_location,
                values.destination_latitude,
                values.destination_longitude
            );
            if (!destinationCoords) { toast.error("Could not get coordinates for destination"); setFareLoading(false); return; }

            const formData = new FormData();
            formData.append('pickup_point[latitude]', pickupCoords.latitude.toString());
            formData.append('pickup_point[longitude]', pickupCoords.longitude.toString());
            formData.append('destination_point[latitude]', destinationCoords.latitude.toString());
            formData.append('destination_point[longitude]', destinationCoords.longitude.toString());

            if (values.via_points?.length > 0) {
                let vi = 0;
                for (let i = 0; i < values.via_points.length; i++) {
                    const viaPoint = values.via_points[i];
                    if (viaPoint?.trim()) {
                        const viaCoords = await resolveLocationCoords(
                            viaPoint,
                            values.via_latitude?.[i],
                            values.via_longitude?.[i]
                        );
                        if (viaCoords) {
                            formData.append(`via_point[${vi}][latitude]`, viaCoords.latitude.toString());
                            formData.append(`via_point[${vi}][longitude]`, viaCoords.longitude.toString());
                            formData.append(`via_location[${vi}]`, viaPoint);
                            const viaPlotId = values.via_plot_id?.[i];
                            if (viaPlotId) {
                                formData.append(`via_point_id[${vi}]`, viaPlotId);
                                formData.append(`via_plot_id[${vi}]`, viaPlotId);
                            }
                            vi++;
                        }
                    }
                }
            }
            formData.append('vehicle_id', values.vehicle || '');
            formData.append('journey', values.journey_type);
            appendAccountFields(formData, values.account);
            const response = await apiCreateCalculateFares(formData);
            if (response?.data?.success === 1) {
                setFareData(response.data);
                setFareCalculated(true);
                if (response.data.distance) setFieldValue('distance', metersToDisplayDistance(response.data.distance));
                toast.success("Fare calculated successfully");
            } else {
                const msg = response?.data?.message || "Failed to calculate fares";
                toast.error(msg); setFareError(msg);
            }
        } catch (error) {
            const msg = error?.response?.data?.message || "An error occurred while calculating fares";
            toast.error(msg); setFareError(msg);
        } finally { setFareLoading(false); }
    };

    const invalidateFare = () => {
        setFareData(null); setFareError(null); setFareCalculated(false);
    };

    useEffect(() => {
        if (!setFieldValueRef.current) return;

        if (!stablePickupCoords?.lat || !stableDestinationCoords?.lat) {
            setFieldValueRef.current("distance", "");
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            const distanceKm = await fetchRouteDistance(
                stablePickupCoords,
                stableDestinationCoords,
                mapViaCoords,
                mapsApi,
                apiKeys
            );
            if (!cancelled && distanceKm) {
                setFieldValueRef.current("distance", kmValueToDisplayDistance(distanceKm));
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        stablePickupCoords,
        stableDestinationCoords,
        mapViaCoords,
        mapsApi,
        apiKeys,
    ]);

    const swapLocations = (index, setFieldValue, values) => {
        const viaPoint = values.via_points[index];
        const viaLat = values.via_latitude?.[index];
        const viaLng = values.via_longitude?.[index];
        const viaPlotId = values.via_plot_id?.[index];
        const viaPlotDataValue = viaPlotData[index];
        const viaStable = stableViaCoords[index];

        setFieldValue(`via_points[${index}]`, values.destination_location);
        setFieldValue(`via_latitude[${index}]`, values.destination_latitude);
        setFieldValue(`via_longitude[${index}]`, values.destination_longitude);
        setFieldValue(`via_plot_id[${index}]`, values.destination_plot_id);
        setViaPlotData(p => ({ ...p, [index]: destinationPlotData }));

        setFieldValue("destination_location", viaPoint);
        setFieldValue('destination_latitude', viaLat);
        setFieldValue('destination_longitude', viaLng);
        setFieldValue('destination_plot_id', viaPlotId);
        setDestinationPlotData(viaPlotDataValue);

        setStableDestinationCoords(viaStable || null);
        setStableViaCoords(prev => {
            const updated = [...prev];
            updated[index] = stableDestinationCoords;
            return updated;
        });

        invalidateFare();
    };

    const swapPickupAndDestination = (setFieldValue, values) => {
        setFieldValue("pickup_location", values.destination_location);
        setFieldValue("destination_location", values.pickup_location);
        setFieldValue("pickup_latitude", values.destination_latitude);
        setFieldValue("pickup_longitude", values.destination_longitude);
        setFieldValue("destination_latitude", values.pickup_latitude);
        setFieldValue("destination_longitude", values.pickup_longitude);
        setFieldValue("pickup_plot_id", values.destination_plot_id);
        setFieldValue("destination_plot_id", values.pickup_plot_id);

        setPickupPlotData(destinationPlotData);
        setDestinationPlotData(pickupPlotData);
        setStablePickupCoords(stableDestinationCoords);
        setStableDestinationCoords(stablePickupCoords);

        setShowPickup(false);
        setShowDestination(false);
        setPickupSuggestions([]);
        setDestinationSuggestions([]);

        invalidateFare();
    };

    const applyMultiBookingDateSync = (values, setFieldValue, overrides = {}) => {
        const multiDays = overrides.multi_days ?? values.multi_days;
        const multiStartAt = overrides.multi_start_at ?? values.multi_start_at;
        const multiEndAt = overrides.multi_end_at ?? values.multi_end_at;
        const nextDate = syncMultiBookingReferenceDate({
            multiDays,
            multiStartAt,
            multiEndAt,
        });
        if (nextDate) setFieldValue("booking_date", nextDate);
    };

    const handleCreateBooking = async (values) => {
        const errors = validateCreateBooking(values);
        if (Object.keys(errors).length > 0) { setBookingErrors(errors); return; }
        setBookingErrors({});
        setIsBookingLoading(true);
        try {
            const formData = new FormData();
            formData.append('sub_company', values.sub_company || '');
            formData.append('multi_booking', isMultiBooking ? 'yes' : 'no');
            const includesToday = isMultiBooking
                ? multiBookingIncludesToday(values.multi_days, values.multi_start_at, values.multi_end_at)
                : false;

            if (isMultiBooking) {
                (values.multi_days || []).forEach((day) => formData.append("multi_days[]", day));
                formData.append('start_at', values.multi_start_at || '');
                formData.append('end_at', values.multi_end_at || '');
                formData.append('week', values.week_pattern || '');
                formData.append('includes_today', includesToday ? 'yes' : 'no');
                formData.append('today_weekday', todayWeekday);
            }
            formData.append('pickup_time_type', values.pickup_time_type === "time" ? "time" : "asap");
            if (values.pickup_time_type === "asap") {
                formData.append("pickup_time", formatCompanyTimeForApi());
            } else {
                const tv = values.pickup_time || "";
                formData.append("pickup_time", tv ? `${tv}:00` : "");
                if (values.reminder_minutes) {
                    formData.append("reminder_minutes", String(values.reminder_minutes));
                }
            }
            const bookingDate = isMultiBooking
                ? resolveMultiBookingSubmitDate({
                    includesToday,
                    multiStartAt: values.multi_start_at,
                    bookingDate: values.booking_date,
                })
                : (values.booking_date || "");
            formData.append('booking_date', bookingDate);
            formData.append('booking_type', values.booking_type || '');
            formData.append("dispatcher_id", dispatcherId);
            const pickupCoords = await resolveLocationCoords(
                values.pickup_location,
                values.pickup_latitude,
                values.pickup_longitude
            );
            const destinationCoords = await resolveLocationCoords(
                values.destination_location,
                values.destination_latitude,
                values.destination_longitude
            );
            const pickupLocationLabel = values.pickup_location?.trim()
                || await ensureHumanReadableLocation(
                    values.pickup_location,
                    values.pickup_latitude,
                    values.pickup_longitude
                );
            const destinationLocationLabel = values.destination_location?.trim()
                || await ensureHumanReadableLocation(
                    values.destination_location,
                    values.destination_latitude,
                    values.destination_longitude
                );

            if (isPlotBasedDispatchEnabled && !isEditMode) {
                if (!pickupCoords) {
                    const message = "Pickup location is required.";
                    setBookingErrors({ pickup_location: message });
                    toast.error(message);
                    return;
                }

                const pickupPlot = await resolvePickupPlot({
                    latitude: pickupCoords.latitude,
                    longitude: pickupCoords.longitude,
                    fetchPlotName,
                    plotsData,
                });

                if (!pickupPlot?.id) {
                    const message = "Outside of plot";
                    setBookingErrors({ pickup_location: message });
                    toast.error(message);
                    return;
                }
            }

            if (requiresPlotBasedPickupValidation(values)) {
                if (!pickupCoords) {
                    const message = "Pickup location is required for plot-based dispatch.";
                    setBookingErrors({ pickup_location: message });
                    toast.error(message);
                    return;
                }

                const plotValidation = await validatePlotBasedPickup({
                    latitude: pickupCoords.latitude,
                    longitude: pickupCoords.longitude,
                    fetchPlotName,
                    plotsData,
                    drivers: driverRawList,
                });

                if (!plotValidation.ok) {
                    setBookingErrors({ pickup_location: plotValidation.message });
                    toast.error(plotValidation.message);
                    return;
                }
            }

            if (pickupCoords) {
                formData.append('pickup_point', `${pickupCoords.latitude}, ${pickupCoords.longitude}`);
                formData.append('pickup_location', pickupLocationLabel);

                let pickupPlotId = values.pickup_plot_id;
                const plotRes = await fetchPlotName(pickupCoords.latitude, pickupCoords.longitude);
                if (plotRes && plotRes.found && plotRes.id) {
                    pickupPlotId = plotRes.id;
                }
                if (pickupPlotId) {
                    formData.append('pickup_point_id', pickupPlotId);
                    formData.append('pickup_plot_id', pickupPlotId);
                }
            }

            if (destinationCoords) {
                formData.append('destination_point', `${destinationCoords.latitude}, ${destinationCoords.longitude}`);
                formData.append('destination_location', destinationLocationLabel);
                
                let destinationPlotId = values.destination_plot_id;
                const plotRes = await fetchPlotName(destinationCoords.latitude, destinationCoords.longitude);
                if (plotRes && plotRes.found && plotRes.id) {
                    destinationPlotId = plotRes.id;
                }
                if (destinationPlotId) {
                    formData.append('destination_point_id', destinationPlotId);
                    formData.append('destination_plot_id', destinationPlotId);
                }
            }

            if (values.via_points?.length > 0) {
                let vi = 0;
                for (let i = 0; i < values.via_points.length; i++) {
                    const viaPoint = values.via_points[i];
                    if (viaPoint?.trim()) {
                        const viaCoords = await getCoordinatesFromAddress(viaPoint);
                        if (viaCoords) {
                            const viaLocationLabel = await ensureHumanReadableLocation(
                                viaPoint,
                                values.via_latitude?.[i],
                                values.via_longitude?.[i]
                            );
                            formData.append(`via_point[${vi}][latitude]`, viaCoords.latitude.toString());
                            formData.append(`via_point[${vi}][longitude]`, viaCoords.longitude.toString());
                            formData.append(`via_location[${vi}]`, viaLocationLabel);
                            
                            let viaPlotId = values.via_plot_id?.[i];
                            const plotRes = await fetchPlotName(viaCoords.latitude, viaCoords.longitude);
                            if (plotRes && plotRes.found && plotRes.id) {
                                viaPlotId = plotRes.id;
                            }
                            if (viaPlotId) {
                                formData.append(`via_point_id[${vi}]`, viaPlotId);
                                formData.append(`via_plot_id[${vi}]`, viaPlotId);
                            }
                            vi++;
                        }
                    }
                }
            }
            formData.append('user_id', values.user_id || '');
            formData.append('name', values.name || '');
            formData.append('email', values.email || '');
            formData.append('phone_no', values.phone_no || '');
            formData.append('tel_no', values.tel_no || '');
            formData.append('journey_type', values.journey_type || '');
            appendAccountFields(formData, values.account);
            formData.append('vehicle', values.request_for_vehicle ? (values.vehicle || '') : '');
            formData.append('driver', shouldSendDriverOnSubmit(values, { isEdit: false }) ? (values.driver || '') : '');
            formData.append('request_for_vehicle', values.request_for_vehicle ? 'yes' : 'no');
            formData.append('passenger', values.passenger || '0');
            formData.append('luggage', values.luggage || '0');
            formData.append('hand_luggage', values.hand_luggage || '0');
            formData.append('special_request', values.special_request || '');
            formData.append('payment_reference', values.payment_reference || '');
            formData.append('booking_system', values.booking_system || 'auto_dispatch');
            formData.append('payment_method', values.payment_method || '');
            formData.append('parking_charge', values.parking_charges || '');
            formData.append('waiting_charge', values.waiting_charges || '');
            formData.append('ac_fares', values.ac_fares || '');
            formData.append('return_ac_fares', values.return_ac_fares || '');
            formData.append('ac_parking_charge', values.ac_parking_charges || '');
            formData.append('ac_waiting_charge', values.ac_waiting_charges || '');
            formData.append('extra_charge', values.extra_charges || '');
            formData.append('toll', values.congestion_toll || '');
            formData.append('booking_amount', values.total_charges?.toString() || '0');
            const distanceMeters = resolveBookingDistanceMeters(fareData?.distance, values.distance);
            formData.append("distance", distanceMeters != null ? String(distanceMeters) : "");
            const response = await apiCreateBooking(formData);
            if (response?.data?.success === 1) {
                const createdCount = getMultiBookingCreatedCount(response.data);
                const successMessage = isMultiBooking
                    ? (
                        createdCount
                            ? `${createdCount} bookings created. Check Today's Booking for today and Pre Bookings for future dates.`
                            : (response?.data?.message || "Multi-bookings created successfully")
                    )
                    : values.pickup_time_type === "time"
                        ? (response?.data?.message || "Booking created. View it under Pre Bookings.")
                        : (response?.data?.message || "Booking created successfully");
                toast.success(successMessage);
                playSuccessSound();
                const bookingCreatedMeta = {
                    isMultiBooking,
                    includesToday,
                    createdCount,
                    isScheduled: values.pickup_time_type === "time",
                    pickupTimeType: values.pickup_time_type,
                    reminderMinutes: values.reminder_minutes || null,
                    createdBookings: extractCreatedBookings(response.data, {
                        isScheduled: values.pickup_time_type === "time",
                        pickupTimeType: values.pickup_time_type,
                        reminderMinutes: values.reminder_minutes || null,
                        bookingDate,
                        pickupTime: values.pickup_time_type === "time" && values.pickup_time
                            ? `${values.pickup_time}:00`
                            : null,
                        pickupLocation: pickupLocationLabel || null,
                        destinationLocation: destinationLocationLabel || null,
                        phoneNo: values.phone_no || null,
                        passenger: values.passenger || 1,
                    }),
                };
                if (response?.data?.alertMessage) {
                    setAlertModal({ isOpen: true, message: response.data.alertMessage });
                    onBookingCreated?.(bookingCreatedMeta);
                    return;
                }
                onBookingCreated?.(bookingCreatedMeta);
                unlockBodyScroll();
                setIsOpen({ type: "new", isOpen: false, booking: null });
            } else {
                toast.error(response?.data?.message || "Failed to create booking");
            }
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || "";
            if (message.includes("bookings/broadcast") || message.includes("Could not resolve host: bookings")) {
                toast.error(
                    "Booking could not be broadcast. Ask your backend admin to set SOCKET_API_URL to the full socket API URL (e.g. https://backend.cabifyit.com/socket-api)."
                );
            } else {
                toast.error(message || "An error occurred while creating booking");
            }
        } finally {
            setIsBookingLoading(false);
        }
    };

    const handleUpdateBooking = async (values) => {
        const errors = validateCreateBooking(values);
        if (Object.keys(errors).length > 0) { setBookingErrors(errors); return; }
        setBookingErrors({});
        setIsBookingLoading(true);
        try {
            const formData = new FormData();
            formData.append("id", String(editBooking.id));
            formData.append("sub_company", values.sub_company || "");
            formData.append("pickup_time_type", values.pickup_time_type === "time" ? "time" : "asap");

            if (values.pickup_time_type === "asap") {
                formData.append("pickup_time", formatCompanyTimeForApi());
            } else {
                const tv = values.pickup_time || "";
                formData.append("pickup_time", tv ? `${tv}:00` : "");
                if (values.reminder_minutes) {
                    formData.append("reminder_minutes", String(values.reminder_minutes));
                }
            }

            formData.append("booking_date", values.booking_date || "");
            formData.append("booking_type", values.booking_type || "");
            formData.append("dispatcher_id", dispatcherId);

            const pickupCoords = await resolveLocationCoords(
                values.pickup_location,
                values.pickup_latitude,
                values.pickup_longitude
            );
            const destinationCoords = await resolveLocationCoords(
                values.destination_location,
                values.destination_latitude,
                values.destination_longitude
            );
            const pickupLocationLabel = values.pickup_location?.trim()
                || await ensureHumanReadableLocation(
                    values.pickup_location,
                    values.pickup_latitude,
                    values.pickup_longitude
                );
            const destinationLocationLabel = values.destination_location?.trim()
                || await ensureHumanReadableLocation(
                    values.destination_location,
                    values.destination_latitude,
                    values.destination_longitude
                );

            if (pickupCoords) {
                formData.append("pickup_point", `${pickupCoords.latitude}, ${pickupCoords.longitude}`);
                formData.append("pickup_location", pickupLocationLabel || "");

                let pickupPlotId = values.pickup_plot_id;
                const plotRes = await fetchPlotName(pickupCoords.latitude, pickupCoords.longitude);
                if (plotRes?.found && plotRes.id) pickupPlotId = plotRes.id;
                if (pickupPlotId) {
                    formData.append("pickup_point_id", pickupPlotId);
                    formData.append("pickup_plot_id", pickupPlotId);
                }
            }

            if (destinationCoords) {
                formData.append("destination_point", `${destinationCoords.latitude}, ${destinationCoords.longitude}`);
                formData.append("destination_location", destinationLocationLabel || "");

                let destinationPlotId = values.destination_plot_id;
                const plotRes = await fetchPlotName(destinationCoords.latitude, destinationCoords.longitude);
                if (plotRes?.found && plotRes.id) destinationPlotId = plotRes.id;
                if (destinationPlotId) {
                    formData.append("destination_point_id", destinationPlotId);
                    formData.append("destination_plot_id", destinationPlotId);
                }
            }

            if (values.via_points?.length > 0) {
                let vi = 0;
                for (let i = 0; i < values.via_points.length; i++) {
                    const viaPoint = values.via_points[i];
                    if (!viaPoint?.trim()) continue;

                    const viaCoords = await resolveLocationCoords(
                        viaPoint,
                        values.via_latitude?.[i],
                        values.via_longitude?.[i]
                    );
                    if (!viaCoords) continue;

                    const viaLocationLabel = await ensureHumanReadableLocation(
                        viaPoint,
                        values.via_latitude?.[i],
                        values.via_longitude?.[i]
                    );

                    formData.append(`via_point[${vi}][latitude]`, viaCoords.latitude.toString());
                    formData.append(`via_point[${vi}][longitude]`, viaCoords.longitude.toString());
                    formData.append(`via_location[${vi}]`, viaLocationLabel);

                    let viaPlotId = values.via_plot_id?.[i];
                    const plotRes = await fetchPlotName(viaCoords.latitude, viaCoords.longitude);
                    if (plotRes?.found && plotRes.id) viaPlotId = plotRes.id;
                    if (viaPlotId) {
                        formData.append(`via_point_id[${vi}]`, viaPlotId);
                        formData.append(`via_plot_id[${vi}]`, viaPlotId);
                    }
                    vi++;
                }
            }

            formData.append("user_id", values.user_id || "");
            formData.append("name", values.name || "");
            formData.append("email", values.email || "");
            formData.append("phone_no", values.phone_no || "");
            formData.append("tel_no", values.tel_no || "");
            formData.append("journey_type", values.journey_type || "");
            appendAccountFields(formData, values.account);
            formData.append("vehicle", values.request_for_vehicle ? (values.vehicle || "") : "");
            formData.append("driver", shouldSendDriverOnSubmit(values, { isEdit: true }) ? (values.driver || "") : "");
            formData.append("request_for_vehicle", values.request_for_vehicle ? "yes" : "no");
            formData.append("passenger", values.passenger || "0");
            formData.append("luggage", values.luggage || "0");
            formData.append("hand_luggage", values.hand_luggage || "0");
            formData.append("special_request", values.special_request || "");
            formData.append("payment_reference", values.payment_reference || "");
            formData.append("booking_system", values.booking_system || "auto_dispatch");
            formData.append("payment_method", values.payment_method || "");
            formData.append("parking_charge", values.parking_charges || "");
            formData.append("waiting_charge", values.waiting_charges || "");
            formData.append("ac_fares", values.ac_fares || "");
            formData.append("return_ac_fares", values.return_ac_fares || "");
            formData.append("ac_parking_charge", values.ac_parking_charges || "");
            formData.append("ac_waiting_charge", values.ac_waiting_charges || "");
            formData.append("extra_charge", values.extra_charges || "");
            formData.append("toll", values.congestion_toll || "");
            formData.append("booking_amount", values.total_charges?.toString() || "0");
            const distanceMeters = resolveBookingDistanceMeters(fareData?.distance, values.distance);
            formData.append("distance", distanceMeters != null ? String(distanceMeters) : "");

            const dispatcherName = getDispatcherName();
            if (dispatcherName) formData.append("dispatcher_name", dispatcherName);

            const response = await apiUpdateBooking(formData);
            if (isApiSuccess(response?.data)) {
                toast.success(response?.data?.message || "Booking updated successfully");
                onBookingCreated?.({
                    isEdit: true,
                    updatedBooking: extractUpdatedBookingFromResponse(response?.data, editBooking),
                });
                unlockBodyScroll();
                setIsOpen({ type: "new", isOpen: false, booking: null });
            } else {
                toast.error(response?.data?.message || "Failed to update booking");
            }
        } catch (error) {
            console.error("Update booking error:", error);
            const message = getApiErrorMessage(error, "An error occurred while updating booking");
            if (message.includes("bookings/broadcast") || message.includes("Could not resolve host: bookings")) {
                toast.error(
                    "Booking could not be broadcast. Ask your backend admin to set SOCKET_API_URL to the full socket API URL (e.g. https://backend.cabifyit.com/socket-api)."
                );
            } else {
                toast.error(message);
            }
        } finally {
            setIsBookingLoading(false);
        }
    };

    const shouldDisableDispatchOptions = (values) => {
        if (isMultiBooking) return true;
        if (!values.booking_date) return false;
        return isCompanyFutureDateTime(values.booking_date, values.pickup_time || "00:00");
    };

    const handleViewHistory = async (user) => {
        setSelectedUser(user);
        setShowUserSuggestions(false);
        try {
            const response = await apiGetRideHistory(user.id);
            if (response?.data?.success === 1) {
                setUserHistory((response.data.rideHistory?.data || []).map(ride => ({
                    id: ride.id,
                    date: `${ride.booking_date} ${ride.pickup_time}`,
                    from: ride.pickup_location || ride.pickup_point,
                    to: ride.destination_location || ride.destination_point,
                    status: ride.booking_status,
                    driver: ride.driver_detail?.name || "N/A",
                    bookingId: ride.booking_id,
                })));
            } else { setUserHistory([]); }
        } catch { setUserHistory([]); }
        setShowHistoryModal(true);
    };

    useEffect(() => () => {
        cancelPendingSearch("pickup");
        cancelPendingSearch("destination");
        Object.keys(searchAbortRef.via || {}).forEach((key) => cancelPendingSearch("via", key));
    }, []);

    useEffect(() => () => {
        closeLocationSidebar();
    }, [closeLocationSidebar]);

    const memoizedMap = (
        <Maps
            key={mapsApi || "map-loading"}
            mapsApi={mapsApi}
            mapError={mapError}
            apiKeys={apiKeys}
            plotsData={plotsData}
            pickupCoords={stablePickupCoords}
            destinationCoords={stableDestinationCoords}
            viaCoords={mapViaCoords}
            setFieldValue={applyMapFieldValue}
            fetchPlotName={fetchPlotName}
            setPickupPlotData={setPickupPlotData}
            setDestinationPlotData={setDestinationPlotData}
            onPickupConfirmed={handlePickupConfirmed}
            onDestinationConfirmed={handleDestinationConfirmed}
            SEARCH_API={searchApi}
        />
    );

    return (
        <>
            <AlertModal
                isOpen={alertModal.isOpen}
                message={alertModal.message}
                onClose={() => {
                    setAlertModal({ isOpen: false, message: '' });
                    unlockBodyScroll();
                    setIsOpen({ type: "new", isOpen: false, booking: null });
                }}
            />

            <Formik
                initialValues={initialFormValues}
                key={editBooking?.id ? `edit-${editBooking.id}` : `new-${newBookingFormKey}`}
                onSubmit={isEditMode ? handleUpdateBooking : handleCreateBooking}
                enableReinitialize
            >
                {({ values, setFieldValue }) => {
                    setFieldValueRef.current = setFieldValue;

                    useEffect(() => {
                        if (fareData?.calculate_fare) {
                            setFieldValue('base_fare', fareData.calculate_fare);
                            const additionalCharges = chargeFields.reduce((sum, key) => sum + Number(values[key] || 0), 0);
                            setFieldValue("total_charges", parseFloat((fareData.calculate_fare + additionalCharges).toFixed(2)));
                        }
                    }, [fareData]);

                    const handleChargeChange = (name, value) => {
                        setFieldValue(name, value === "" ? "" : Number(value) || 0);
                        if (name === "total_charges") return;
                        setTimeout(() => {
                            const additionalCharges = chargeFields.reduce((sum, key) => sum + Number(values[key] || 0), 0);
                            const baseFare = Number(values.base_fare || 0);
                            setFieldValue("total_charges", parseFloat((baseFare + additionalCharges).toFixed(2)));
                        }, 0);
                    };

                    return (
                        <Form>
                            {isEditMode && editBookingLoading && (
                                <div className="mb-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs text-[#6B7280]">
                                    Loading booking details...
                                </div>
                            )}
                            <div className="flex flex-col lg:flex-row gap-3 items-start">
                            <div className="w-full flex-1 min-w-0 flex flex-col gap-2 lg:gap-2">
                                {/* Header */}
                                <div className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 lg:px-3 shadow-sm">
                                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <h2 className="text-base lg:text-lg font-semibold text-[#111827]">
                                                {isEditMode ? "Edit Booking" : "Create New Booking"}
                                            </h2>
                                            {isEditMode && (
                                                <p className="mt-0.5 text-xs text-[#6B7280]">
                                                    Booking #{editBooking.booking_id || editBooking.id}
                                                </p>
                                            )}
                                            <p className="mt-0.5 text-xs text-[#6B7280] sm:hidden">
                                                {isEditMode
                                                    ? "Update trip, passenger, and dispatch details."
                                                    : "Fill in trip, passenger, and dispatch details."}
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                                            <div className="sm:min-w-[220px]">
                                                <label className={formLabelClass}>Sub Company</label>
                                                <select
                                                    name="sub_company"
                                                    value={values.sub_company || ""}
                                                    onChange={(e) => setFieldValue("sub_company", e.target.value)}
                                                    disabled={loadingSubCompanies}
                                                    className={formSelectClass}
                                                >
                                                    <option value="">Select Sub Company</option>
                                                    {subCompanyList?.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                                                </select>
                                            </div>
                                            {!isEditMode && (
                                            <div className="flex items-center justify-between sm:justify-start gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                                                <span className={`text-sm font-medium ${!isMultiBooking ? "text-[#1F41BB]" : "text-[#6B7280]"}`}>Single</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={isMultiBooking} onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setIsMultiBooking(checked);
                                                        if (checked) {
                                                            const today = getCompanyTodayForInput();
                                                            if (!values.multi_start_at) setFieldValue("multi_start_at", today);
                                                            if (!values.booking_date) setFieldValue("booking_date", today);
                                                            applyMultiBookingDateSync(
                                                                { ...values, multi_start_at: values.multi_start_at || today },
                                                                setFieldValue,
                                                                { multi_start_at: values.multi_start_at || today }
                                                            );
                                                        }
                                                    }} />
                                                    <div className="w-11 h-6 bg-[#D1D5DB] peer-focus:outline-none rounded-full peer peer-checked:bg-[#1F41BB] transition-all" />
                                                    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-all" />
                                                </label>
                                                <span className={`text-sm font-medium ${isMultiBooking ? "text-[#1F41BB]" : "text-[#6B7280]"}`}>Multi</span>
                                            </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isMultiBooking && (
                                    <FormSection title="Recurring Schedule" description="Select weekdays and the date range for multi-bookings.">
                                        <div className="flex flex-wrap gap-2">
                                            {MULTI_BOOKING_WEEKDAYS.map((day) => {
                                                const value = day;
                                                const checked = values.multi_days?.includes(value);
                                                const isToday = day === todayWeekday;
                                                return (
                                                    <label
                                                        key={day}
                                                        className={`flex items-center gap-2 cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs lg:text-sm transition ${checked ? "border-[#1F41BB] bg-[#EEF2FF] text-[#1F41BB]" : "border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]"}`}
                                                    >
                                                        <input type="checkbox" checked={checked} className="sr-only"
                                                            onChange={(e) => {
                                                                const days = new Set(values.multi_days || []);
                                                                e.target.checked ? days.add(value) : days.delete(value);
                                                                const nextDays = [...days];
                                                                setFieldValue("multi_days", nextDays);
                                                                applyMultiBookingDateSync(values, setFieldValue, { multi_days: nextDays });
                                                                clearBookingError("multi_days");
                                                            }}
                                                        />
                                                        {day}{isToday ? " (Today)" : ""}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <FieldError message={bookingErrors.multi_days} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                            <FormField label="Start Date">
                                                <input type="date"
                                                    className={`${formInputClass} ${bookingErrors.multi_start_at ? formInputErrorClass : ""}`}
                                                    value={values.multi_start_at || ""}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setFieldValue("multi_start_at", value);
                                                        applyMultiBookingDateSync(values, setFieldValue, { multi_start_at: value });
                                                        clearBookingError("multi_start_at");
                                                    }} />
                                                <FieldError message={bookingErrors.multi_start_at} />
                                            </FormField>
                                            <FormField label="End Date">
                                                <input type="date"
                                                    className={`${formInputClass} ${bookingErrors.multi_end_at ? formInputErrorClass : ""}`}
                                                    value={values.multi_end_at || ""}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setFieldValue("multi_end_at", value);
                                                        applyMultiBookingDateSync(values, setFieldValue, { multi_end_at: value });
                                                        clearBookingError("multi_end_at");
                                                    }} />
                                                <FieldError message={bookingErrors.multi_end_at} />
                                            </FormField>
                                        </div>
                                    </FormSection>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-6 lg:grid-rows-[auto_auto_auto] gap-2">
                                    {/* Row 1: Schedule */}
                                    <div className="lg:col-span-2 lg:row-start-1 min-w-0">
                                        <FormSection title="Schedule">
                                                    <div className={`grid gap-2 w-full ${values.pickup_time_type === "time" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
                                                        <FormField label="Pickup Time">
                                                            <div className="flex gap-2">
                                                                <select
                                                                    className={formSelectClass}
                                                                    value={values.pickup_time_type || ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setFieldValue("pickup_time_type", val);
                                                                        if (val === "asap") {
                                                                            setFieldValue("pickup_time", "");
                                                                            setFieldValue("reminder_minutes", "");
                                                                        } else if (!values.pickup_time) {
                                                                            setFieldValue("pickup_time", "00:00");
                                                                        }
                                                                        clearBookingError("pickup_time");
                                                                        clearBookingError("reminder_minutes");
                                                                    }}>
                                                                    <option value="asap">ASAP</option>
                                                                    <option value="time">Pick a time</option>
                                                                </select>
                                                                {values.pickup_time_type === "time" && (
                                                                    <input type="time"
                                                                        className={`${formInputClass} ${bookingErrors.pickup_time ? formInputErrorClass : ""}`}
                                                                        value={values.pickup_time || ""}
                                                                        onChange={(e) => { setFieldValue("pickup_time", e.target.value); clearBookingError("pickup_time"); }} />
                                                                )}
                                                            </div>
                                                            <FieldError message={bookingErrors.pickup_time} />
                                                        </FormField>
                                                        <FormField label={isMultiBooking ? "Reference Date" : "Booking Date"}>
                                                                <input type="date"
                                                                    className={`${formInputClass} ${bookingErrors.booking_date ? formInputErrorClass : ""}`}
                                                                    value={values.booking_date || ""}
                                                                    disabled={isMultiBooking}
                                                                    onChange={(e) => { setFieldValue("booking_date", e.target.value); clearBookingError("booking_date"); }} />
                                                                {isMultiBooking && (
                                                                    <p className="text-[10px] text-[#6B7280] mt-0.5 hidden lg:block">
                                                                        Auto from start date
                                                                    </p>
                                                                )}
                                                                <FieldError message={bookingErrors.booking_date} />
                                                        </FormField>
                                                        <FormField label="Booking Type">
                                                                <select
                                                                    className={`${formSelectClass} ${bookingErrors.booking_type ? formInputErrorClass : ""}`}
                                                                    value={values.booking_type || ""}
                                                                    onChange={(e) => { setFieldValue("booking_type", e.target.value); clearBookingError("booking_type"); }}>
                                                                    <option value="outstation">Select type</option>
                                                                    <option value="local">Local</option>
                                                                </select>
                                                                <FieldError message={bookingErrors.booking_type} />
                                                        </FormField>
                                                        {values.pickup_time_type === "time" && (
                                                            <FormField label="Reminder Time">
                                                                <select
                                                                    className={`${formSelectClass} ${bookingErrors.reminder_minutes ? formInputErrorClass : ""}`}
                                                                    value={values.reminder_minutes || ""}
                                                                    onChange={(e) => {
                                                                        setFieldValue("reminder_minutes", e.target.value);
                                                                        clearBookingError("reminder_minutes");
                                                                    }}
                                                                >
                                                                    <option value="">Select reminder</option>
                                                                    {REMINDER_TIME_OPTIONS.map((opt) => (
                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                                <FieldError message={bookingErrors.reminder_minutes} />
                                                            </FormField>
                                                        )}
                                                    </div>
                                        </FormSection>
                                    </div>

                                    {/* Row 1: Passenger */}
                                    <div className="lg:col-span-2 lg:row-start-1 min-w-0">
                                        <FormSection title="Passenger">
                                            <div className="grid grid-cols-2 gap-2">
                                                <FormField label="Name">
                                                    <input type="text" placeholder="Passenger name"
                                                        className={`${formInputClass} ${bookingErrors.name ? formInputErrorClass : ""}`}
                                                        value={values.name || ""}
                                                        onChange={(e) => { setFieldValue("name", e.target.value); clearBookingError("name"); }} />
                                                    <FieldError message={bookingErrors.name} />
                                                </FormField>
                                                <FormField label="Email">
                                                    <input type="email" placeholder="Email"
                                                        className={formInputClass}
                                                        value={values.email || ""}
                                                        onChange={(e) => setFieldValue("email", e.target.value)} />
                                                </FormField>
                                                <FormField label="Mobile No">
                                                    <div className="relative flex">
                                                        {defaultDialCode && (
                                                            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-[#D1D5DB] bg-[#F3F4F6] px-2 text-xs font-medium text-[#374151]">
                                                                {defaultDialCode}
                                                            </span>
                                                        )}
                                                        <input type="text" placeholder="Mobile"
                                                            className={`${formInputClass} ${defaultDialCode ? "rounded-l-none" : ""} ${bookingErrors.phone_no ? formInputErrorClass : ""}`}
                                                            value={values.phone_no || ""}
                                                            onChange={(e) => { const v = e.target.value; setFieldValue("phone_no", v); searchUsers(v); clearBookingError("phone_no"); }}
                                                            onFocus={() => { if (values.phone_no && userSuggestions.length > 0) setShowUserSuggestions(true); }} />
                                                        {showUserSuggestions && (
                                                            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-40 overflow-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                                                                {userSuggestions.map((user, idx) => (
                                                                    <div key={user.id || idx} onClick={() => selectUser(user, setFieldValue)}
                                                                        className="flex cursor-pointer items-center justify-between border-b border-[#F3F4F6] p-2 last:border-b-0 hover:bg-[#F9FAFB] text-xs">
                                                                        <div className="font-medium text-[#111827]">{user.phone_no}</div>
                                                                        <span onClick={(e) => { e.stopPropagation(); handleViewHistory(user); }} className="cursor-pointer text-[#6B7280]">History</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <FieldError message={bookingErrors.phone_no} />
                                                </FormField>
                                                <FormField label="Telephone">
                                                    <input type="text" placeholder="Telephone"
                                                        className={formInputClass}
                                                        value={values.tel_no || ""}
                                                        onChange={(e) => setFieldValue("tel_no", e.target.value)} />
                                                </FormField>
                                            </div>
                                        </FormSection>
                                    </div>

                                    {/* Row 1: Dispatch & Vehicle */}
                                    <div className="lg:col-span-2 lg:row-start-1 min-w-0">
                                        <FormSection title="Dispatch & Vehicle">
                                            <div className="grid grid-cols-2 gap-2">
                                                <FormField label="Journey">
                                                    <div className="flex flex-wrap gap-1">
                                                        {[{ val: "one_way", label: "One Way" }, { val: "return", label: "Return" }, { val: "wr", label: "W/R" }].map(({ val, label }) => (
                                                            <label key={val} className={`cursor-pointer rounded border px-2 py-1 text-xs font-medium transition ${values.journey_type === val ? "border-[#1F41BB] bg-[#EEF2FF] text-[#1F41BB]" : "border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]"}`}>
                                                                <input type="radio" name="journey" className="sr-only" checked={values.journey_type === val}
                                                                    onChange={() => { setFieldValue("journey_type", val); invalidateFare(); clearFieldErrors("journey_type"); }} />
                                                                {label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </FormField>
                                                <FormField label="Account">
                                                    <select name="account" value={values.account || ""}
                                                        onChange={(e) => {
                                                            setFieldValue("account", e.target.value);
                                                            invalidateFare();
                                                        }}
                                                        className={formSelectClass}
                                                        disabled={loadingSubCompanies}>
                                                        <option value="">Account</option>
                                                        {accountList?.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                                                    </select>
                                                </FormField>
                                            </div>
                                            <div className={`inline-flex rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-0.5 w-full ${isManualDispatchOnly ? "opacity-50" : ""}`}>
                                                <button type="button" disabled={isManualDispatchOnly}
                                                    onClick={() => { setFieldValue("auto_dispatch", true); setFieldValue("bidding", false); setFieldValue("booking_system", "auto_dispatch"); }}
                                                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${values.auto_dispatch && !values.bidding ? "bg-white text-[#1F41BB] shadow-sm" : "text-[#6B7280]"}`}>
                                                    Auto
                                                </button>
                                                <button type="button" disabled={isManualDispatchOnly}
                                                    onClick={() => { setFieldValue("auto_dispatch", false); setFieldValue("bidding", true); setFieldValue("booking_system", "bidding"); setFieldValue("driver", ""); clearBookingError("driver"); }}
                                                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${values.bidding && !values.auto_dispatch ? "bg-white text-[#1F41BB] shadow-sm" : "text-[#6B7280]"}`}>
                                                    Bidding
                                                </button>
                                            </div>
                                            <FieldError message={bookingErrors.booking_system} />
                                            <div className="grid grid-cols-2 gap-2">
                                                {shouldShowDriverField(values, isEditMode) && (
                                                    <FormField label="Driver">
                                                        <select name="driver" value={values.driver || ""}
                                                            onChange={(e) => {
                                                                const selectedDriverId = e.target.value;
                                                                setFieldValue("driver", selectedDriverId);
                                                                clearBookingError("driver");
                                                                if (!selectedDriverId) {
                                                                    if (values.request_for_vehicle) { setFilteredVehicleList(vehicleList); setFieldValue("vehicle", ""); invalidateFare(); }
                                                                    return;
                                                                }
                                                                if (!values.request_for_vehicle) return;
                                                                const sel = driverList.find(d => d.value === selectedDriverId);
                                                                if (!sel) { setFilteredVehicleList(vehicleList); return; }
                                                                const avId = sel.assigned_vehicle;
                                                                const vtId = sel.vehicle_type;
                                                                if (avId) {
                                                                    const filtered = vehicleList.filter(v => v.value === avId.toString());
                                                                    setFilteredVehicleList(filtered.length > 0 ? filtered : vehicleList);
                                                                    if (filtered.length === 1) { setFieldValue("vehicle", filtered[0].value); invalidateFare(); }
                                                                    else setFieldValue("vehicle", "");
                                                                } else {
                                                                    setFilteredVehicleList(vehicleList);
                                                                    if (vtId) {
                                                                        const match = vehicleList.find(v => v.value === vtId.toString());
                                                                        if (match) { setFieldValue("vehicle", match.value); invalidateFare(); }
                                                                    } else setFieldValue("vehicle", "");
                                                                }
                                                            }}
                                                            disabled={loadingSubCompanies}
                                                            className={`${formSelectClass} ${bookingErrors.driver ? formInputErrorClass : ""}`}>
                                                            <option value="">Driver</option>
                                                            {driverList?.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                                                        </select>
                                                        <FieldError message={bookingErrors.driver} />
                                                    </FormField>
                                                )}
                                                <FormField label="Req. Vehicle">
                                                    <div className="flex h-[34px] items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2">
                                                        <span className="text-xs text-[#374151]">{values.request_for_vehicle ? "Yes" : "No"}</span>
                                                        <button type="button" aria-pressed={values.request_for_vehicle}
                                                            onClick={() => {
                                                                const next = !values.request_for_vehicle;
                                                                setFieldValue("request_for_vehicle", next);
                                                                if (!next) { setFieldValue("vehicle", ""); setFilteredVehicleList(vehicleList); invalidateFare(); clearFieldErrors("vehicle"); }
                                                            }}
                                                            className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors flex-shrink-0 ${values.request_for_vehicle ? "bg-[#1F41BB]" : "bg-[#D1D5DB]"}`}>
                                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${values.request_for_vehicle ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                                                        </button>
                                                    </div>
                                                </FormField>
                                                {values.request_for_vehicle && (
                                                    <FormField label="Vehicle" className="col-span-2">
                                                        <select name="vehicle" value={values.vehicle || ""}
                                                            onChange={(e) => { setFieldValue("vehicle", e.target.value); invalidateFare(); clearFieldErrors("vehicle"); }}
                                                            disabled={loadingSubCompanies}
                                                            className={`${formSelectClass} ${(calculateErrors.vehicle || bookingErrors.vehicle) ? formInputErrorClass : ""}`}>
                                                            <option value="">Vehicle</option>
                                                            {filteredVehicleList?.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                                                        </select>
                                                        <FieldError message={calculateErrors.vehicle || bookingErrors.vehicle} />
                                                    </FormField>
                                                )}
                                            </div>
                                        </FormSection>
                                    </div>

                                    {/* Row 2: Route */}
                                    <div className="lg:col-span-3 lg:row-start-2 min-w-0 overflow-visible">
                                        <FormSection title="Route" overflowVisible>
                                            <div className="space-y-2">
                                                {showNearbySearchControls && (
                                                    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
                                                        <MapNearbySearchControls
                                                            nearbySearch={mapSearchPreferences.nearbySearch}
                                                            boundaryCountry={mapSearchPreferences.boundaryCountry || ""}
                                                            onNearbySearchChange={handleNearbySearchCheckboxChange}
                                                            onBoundaryCountryChange={handleBoundaryCountrySelectChange}
                                                            loading={mapSearchPreferencesLoading}
                                                            disabled={mapSearchPreferencesLoading}
                                                            compact
                                                            showNearbyToggle={false}
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                                                    <div className="flex-1">
                                                        <InputBox label="Pickup" value={values.pickup_location} plot={pickupPlotData?.name || ""}
                                                            suggestions={pickupSuggestions} show={showPickup} placeholder="Search pickup..."
                                                            loading={pickupSearchLoading} error={pickupSearchError}
                                                            requireInputForDropdown
                                                            hasError={!!(calculateErrors.pickup_location || bookingErrors.pickup_location)}
                                                            onChange={(v) => {
                                                                setFieldValue("pickup_location", v);
                                                                if (!v) {
                                                                    setStablePickupCoords(null);
                                                                    setFieldValue("pickup_latitude", "");
                                                                    setFieldValue("pickup_longitude", "");
                                                                    setPickupSearchError("");
                                                                    if (locationSidebar.field === "pickup") closeLocationSidebar();
                                                                }
                                                                searchLocation(v, "pickup");
                                                                clearFieldErrors("pickup_location");
                                                            }}
                                                            onSelect={(item) => selectLocation(item, "pickup", setFieldValue)}
                                                            onEnterSearch={() => runSidebarLocationSearch("pickup", values.pickup_location)}
                                                            onDismiss={() => {
                                                                setShowPickup(false);
                                                                setPickupSearchLoading(false);
                                                                cancelPendingSearch("pickup");
                                                            }} />
                                                        <FieldError message={calculateErrors.pickup_location || bookingErrors.pickup_location} />
                                                    </div>
                                                    {values.via_points.length < 2 && (
                                                        <button type="button" onClick={() => {
                                                            if (values.via_points.length < 2) { setFieldValue("via_points", [...values.via_points, ""]); invalidateFare(); }
                                                            else toast.error("Maximum 2 via stops allowed");
                                                        }} className="lg:mt-5 rounded border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-1.5 text-xs font-medium text-[#1F41BB]">+ Via</button>
                                                    )}
                                                </div>
                                                {values.via_points.map((_, i) => (
                                                    <div key={i} className="flex flex-col gap-2 lg:flex-row lg:items-start">
                                                        <div className="flex-1">
                                                            <InputBox label={`Via ${i + 1}`} value={values.via_points[i]} plot={viaPlotData[i]?.name || ""}
                                                                suggestions={viaSuggestions[i] || []} placeholder="Search via..." show={showVia[i]}
                                                                loading={Boolean(viaSearchLoading[i])} error={viaSearchError[i] || ""}
                                                                hasError={!!(calculateErrors[`via_points_${i}`] || bookingErrors[`via_points_${i}`])}
                                                                onChange={(v) => {
                                                                    setFieldValue(`via_points[${i}]`, v);
                                                                    if (!v) { setStableViaCoords(prev => { const u = [...prev]; u[i] = null; return u; }); setFieldValue(`via_latitude[${i}]`, ""); setFieldValue(`via_longitude[${i}]`, ""); }
                                                                    searchLocation(v, "via", i); clearCalcError(`via_points_${i}`); clearBookingError(`via_points_${i}`);
                                                                }}
                                                                onSelect={(i2) => selectLocation(i2, "via", setFieldValue, i)} />
                                                            <FieldError message={calculateErrors[`via_points_${i}`] || bookingErrors[`via_points_${i}`]} />
                                                        </div>
                                                        <div className="flex gap-1 lg:mt-5">
                                                            <button type="button" onClick={() => swapLocations(i, setFieldValue, values)} className="rounded border border-[#E5E7EB] px-2 py-1 text-xs">Swap</button>
                                                            <button type="button" onClick={() => {
                                                                setFieldValue("via_points", values.via_points.filter((_, idx) => idx !== i));
                                                                const newP = { ...viaPlotData }; delete newP[i]; setViaPlotData(newP);
                                                                setStableViaCoords(prev => prev.filter((_, idx) => idx !== i)); invalidateFare();
                                                            }} className="rounded border border-[#FECACA] bg-[#FEF2F2] px-2 py-1 text-xs text-[#DC2626]">Remove</button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => swapPickupAndDestination(setFieldValue, values)}
                                                        className="inline-flex items-center gap-1.5 rounded border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1.5 text-xs font-medium text-[#1F41BB] hover:bg-[#DBEAFE]"
                                                        title="Swap pickup and destination"
                                                    >
                                                        <span aria-hidden>⇅</span>
                                                        Reverse route
                                                    </button>
                                                </div>
                                                <InputBox label="Destination" value={values.destination_location} plot={destinationPlotData?.name || ""}
                                                    suggestions={destinationSuggestions} show={showDestination} placeholder="Search destination..."
                                                    loading={destinationSearchLoading} error={destinationSearchError}
                                                    requireInputForDropdown
                                                    dropup
                                                    hasError={!!(calculateErrors.destination_location || bookingErrors.destination_location)}
                                                    onChange={(v) => {
                                                        setFieldValue("destination_location", v);
                                                        if (!v) {
                                                            setStableDestinationCoords(null);
                                                            setFieldValue("destination_latitude", "");
                                                            setFieldValue("destination_longitude", "");
                                                            setDestinationSearchError("");
                                                            if (locationSidebar.field === "destination") closeLocationSidebar();
                                                        }
                                                        searchLocation(v, "destination");
                                                        clearFieldErrors("destination_location");
                                                    }}
                                                    onSelect={(item) => selectLocation(item, "destination", setFieldValue)}
                                                    onEnterSearch={() => runSidebarLocationSearch("destination", values.destination_location)}
                                                    onDismiss={() => {
                                                        setShowDestination(false);
                                                        setDestinationSearchLoading(false);
                                                        cancelPendingSearch("destination");
                                                    }} />
                                                <FieldError message={calculateErrors.destination_location || bookingErrors.destination_location} />
                                            </div>
                                        </FormSection>
                                    </div>

                                    {/* Row 2: Trip */}
                                    <div className="lg:col-span-1 lg:row-start-2 min-w-0">
                                        <FormSection title="Trip">
                                            <div className="grid grid-cols-3 lg:grid-cols-1 gap-1.5">
                                                {[{ label: "Pax", name: "passenger" }, { label: "Lug", name: "luggage" }, { label: "Hand", name: "hand_luggage" }].map(({ label, name }) => (
                                                    <FormField key={name} label={label}>
                                                        <input type="number" className={formInputClass}
                                                            value={values[name] || 0}
                                                            onChange={(e) => setFieldValue(name, Number(e.target.value) || 0)} />
                                                    </FormField>
                                                ))}
                                            </div>
                                            <FormField label="Special Req.">
                                                <input type="text" placeholder="Notes..." className={formInputClass}
                                                    value={values.special_request || ""}
                                                    onChange={(e) => setFieldValue("special_request", e.target.value)} />
                                            </FormField>
                                            <FormField label="Pay Ref.">
                                                <input type="text" placeholder="Ref..." className={formInputClass}
                                                    value={values.payment_reference || ""}
                                                    onChange={(e) => setFieldValue("payment_reference", e.target.value)} />
                                            </FormField>
                                        </FormSection>
                                    </div>

                                    {/* Row 2: Map */}
                                    <div className="lg:col-span-2 lg:row-start-2 min-w-0 space-y-1.5">
                                        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                                            <div className="border-b border-[#F3F4F6] px-2 py-1.5 flex items-center justify-between">
                                                <h3 className="text-xs font-semibold text-[#111827]">Routes & Maps</h3>
                                                <span className="text-[10px] text-[#6B7280]">{formatDistanceWithUnit(values.distance) || "—"}</span>
                                            </div>
                                            <div className="h-[200px] lg:h-[280px] w-full">
                                                {memoizedMap}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 3: Fare & Charges + Actions */}
                                    <div className="lg:col-span-6 lg:row-start-3 min-w-0">
                                        <FormSection title="Fare & Charges" className="bg-[#F8FAFF] !mb-0">
                                            <div className="flex flex-wrap items-end gap-2">
                                                <div className="w-[110px] shrink-0">
                                                    <FormField label="Payment">
                                                        <select value={values.payment_method}
                                                            onChange={(e) => { setFieldValue("payment_method", e.target.value); clearBookingError("payment_method"); }}
                                                            className={`${formSelectClass} ${bookingErrors.payment_method ? formInputErrorClass : ""}`}>
                                                            <option value="">Method</option>
                                                            <option value="cash">Cash</option>
                                                            <option value="online">Online</option>
                                                        </select>
                                                    </FormField>
                                                </div>
                                                <div className="w-[90px] shrink-0">
                                                    <ChargeInput label="Bk Fee" name="booking_fee_charges" value={values.booking_fee_charges} onChange={handleChargeChange} />
                                                </div>
                                                {chargeFields.map(field => (
                                                    <div key={field} className="w-[80px] shrink-0">
                                                        <ChargeInput label={field.replaceAll("_", " ").replace("fares", "fare").replace("charges", "").replace("waiting time", "wait").replace("congestion toll", "toll")} name={field} value={values[field]} onChange={handleChargeChange} />
                                                    </div>
                                                ))}
                                                <div className="w-[100px] shrink-0 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-1">
                                                    <ChargeInput label="Total" name="total_charges" value={values.total_charges} onChange={handleChargeChange} />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 ml-auto shrink-0">
                                                    {!fareCalculated && (
                                                        <span className="text-[10px] font-medium text-red-600 whitespace-nowrap">Calc fares first</span>
                                                    )}
                                                    {bookingErrors.fare && (
                                                        <span className="text-[10px] font-medium text-red-600">{bookingErrors.fare}</span>
                                                    )}
                                                    <Button btnSize="md" type="filled" className="px-3 py-2 text-xs whitespace-nowrap"
                                                        onClick={() => handleCalculateFares(values, setFieldValue)}
                                                        disabled={fareLoading}>
                                                        {fareLoading ? "..." : "Calc Fares"}
                                                    </Button>
                                                    <Button btnSize="md" type="filledGray" className="px-3 py-2 text-xs"
                                                        onClick={() => { unlockBodyScroll(); setIsOpen({ type: "new", isOpen: false, booking: null }); }}>
                                                        Cancel
                                                    </Button>
                                                    <Button btnType="submit" btnSize="md" type="filled" className="px-3 py-2 text-xs"
                                                        disabled={isBookingLoading || !fareCalculated}
                                                        title={!fareCalculated ? "Calculate fares first" : ""}>
                                                        {isBookingLoading ? "..." : isEditMode ? "Update" : "Create"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </FormSection>
                                    </div>
                                </div>
                            </div>
                            {locationSidebar.open && (
                                <LocationSearchSidebar
                                    field={locationSidebar.field}
                                    query={locationSidebar.query}
                                    results={locationSidebar.results}
                                    loading={locationSidebar.loading}
                                    error={locationSidebar.error}
                                    nearbySearch={mapSearchPreferences.nearbySearch}
                                    boundaryCountry={
                                        mapSearchPreferences.nearbySearch
                                            ? nearbyBoundaryCountry
                                            : mapSearchPreferences.boundaryCountry
                                    }
                                    onClose={closeLocationSidebar}
                                    onSelect={(item) => selectLocation(item, locationSidebar.field, setFieldValue)}
                                />
                            )}
                            </div>
                        </Form>
                    );
                }}
            </Formik>

            {showHistoryModal && (
                <History user={selectedUser} historyData={userHistory} onClose={() => setShowHistoryModal(false)} />
            )}
        </>
    );
};

export default AddBooking;

const InputBox = ({
    label,
    value,
    onChange,
    suggestions,
    show,
    onSelect,
    onDismiss,
    plot,
    placeholder,
    hasError,
    loading = false,
    error = "",
    dropup = false,
    enterKeySearch = false,
    onEnterSearch,
    requireInputForDropdown = false,
}) => {
    const containerRef = useRef(null);

    const hasInput = Boolean(String(value ?? "").trim());
    const dropdownOpen = !enterKeySearch
        && (!requireInputForDropdown || hasInput)
        && (show || loading || error);

    useEffect(() => {
        if (!dropdownOpen) return undefined;

        const handlePointerDown = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                onDismiss?.();
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [dropdownOpen, onDismiss]);

    return (
        <div ref={containerRef} className="relative w-full">
            <label className={formLabelClass}>{label}</label>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_90px] gap-1.5">
                <div className="relative">
                    <input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && onEnterSearch) {
                                event.preventDefault();
                                onDismiss?.();
                                onEnterSearch();
                            }
                        }}
                        onBlur={() => {
                            if (!enterKeySearch) onDismiss?.();
                        }}
                        placeholder={placeholder}
                        className={`${formInputClass} ${hasError ? formInputErrorClass : ""}`}
                    />
                    {onEnterSearch && (
                        <p className="mt-1 text-[10px] text-[#9CA3AF]">Press Enter for full results</p>
                    )}
                    {dropdownOpen && (
                        <ul className={`absolute left-0 right-0 z-[100] max-h-60 overflow-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg ${dropup ? "bottom-full mb-1" : "top-full mt-1"}`}>
                            {loading && (
                                <li className="px-3 py-2 text-sm text-[#6B7280]">Searching...</li>
                            )}
                            {!loading && error && (
                                <li className="px-3 py-2 text-sm text-[#DC2626]">{error}</li>
                            )}
                            {!loading && !error && suggestions.length === 0 && show && (
                                <li className="px-3 py-2 text-sm text-[#6B7280]">No locations found</li>
                            )}
                            {!loading && !error && suggestions.map((item, idx) => (
                                <li
                                    key={item.id || `${item.label}-${idx}`}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => onSelect(item)}
                                    className="cursor-pointer px-3 py-2 text-sm hover:bg-[#F9FAFB]"
                                >
                                    <div className="font-medium text-[#111827]">{item.label}</div>
                                    {item.subtitle ? (
                                        <div className="text-xs text-[#6B7280]">{item.subtitle}</div>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <input readOnly placeholder="Plot" value={plot || ""}
                    className={`${formInputClass} bg-[#F9FAFB] text-[#6B7280]`} />
            </div>
        </div>
    );
};

const ChargeInput = ({ label, name, value, onChange, readOnly = false }) => (
    <div>
        <label className={formLabelClass}>{label}</label>
        <input type="number" step="0.01" value={value === "" || value == null ? "" : value} readOnly={readOnly}
            onChange={(e) => onChange && onChange(name, e.target.value)}
            className={`${formInputClass} ${readOnly ? "bg-[#F9FAFB]" : ""}`} />
    </div>
);