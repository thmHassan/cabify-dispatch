import { Form, Formik } from "formik";
import { useEffect, useState, useMemo, useCallback } from "react";
import Maps from "./components/maps";
import { getTenantData } from "../../../../../../utils/functions/tokenEncryption";
import {
    formatDistanceWithUnit,
    getTenantCountryIso,
    getTenantDialCode,
    kmValueToDisplayDistance,
    metersToDisplayDistance,
    setCachedDistanceUnit,
} from "../../../../../../utils/functions/tenantSettings";
import { apiGetSubCompany } from "../../../../../../services/SubCompanyServices";
import { apiGetAccount } from "../../../../../../services/AccountServices";
import { apiGetDriverManagement } from "../../../../../../services/DriverManagementService";
import { apiGetAllVehicleType } from "../../../../../../services/VehicleTypeServices";
import Button from "../../../../../../components/ui/Button/Button";
import { apiGetAllPlot, apiCreateCalculateFares, apiCreateBooking } from "../../../../../../services/AddBookingServices";
import { apiGetDispatchSystem, apiGetCompanyApiKeys } from "../../../../../../services/SettingsConfigurationServices";
import { unlockBodyScroll } from "../../../../../../utils/functions/common.function";
import toast from 'react-hot-toast';
import { getDispatcherId } from "../../../../../../utils/auth";
import { apiGetRideHistory, apiGetUser } from "../../../../../../services/UserService";
import { debounce } from "lodash";
import {
    formatDateForInput,
    getMultiBookingCreatedCount,
    getTodayWeekdayLabel,
    multiBookingIncludesToday,
    MULTI_BOOKING_WEEKDAYS,
    resolveMultiBookingSubmitDate,
    syncMultiBookingReferenceDate,
} from "../../../../../../utils/functions/bookingDateFilter";
import History from "./components/History";
import successSound from "../../../../../../assets/audio/meldix-success-340660.mp3";

const DEFAULT_GOOGLE_KEY = "AIzaSyDTlV1tPVuaRbtvBQu4-kjDhTV54tR4cDU";
const DEFAULT_BARIKOI_KEY = "bkoi_a468389d0211910bd6723de348e0de79559c435f07a17a5419cbe55ab55a890a";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || DEFAULT_GOOGLE_KEY;
const BARIKOI_KEY = import.meta.env.VITE_BARIKOI_API_KEY || DEFAULT_BARIKOI_KEY;

const loadGoogleScript = (apiKey) =>
    new Promise((resolve, reject) => {
        if (window.google?.maps?.places) return resolve();
        const existing = document.getElementById("google-maps-script");
        if (existing) {
            if (window.google?.maps?.places) return resolve();
            existing.addEventListener("load", resolve);
            existing.addEventListener("error", () => reject(new Error("Google Maps load failed")));
            return;
        }
        const script = document.createElement("script");
        script.id = "google-maps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey || GOOGLE_KEY}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
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
    "w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2.5 text-sm text-[#111827] shadow-sm outline-none transition focus:border-[#1F41BB] focus:ring-2 focus:ring-[#1F41BB]/20 disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]";
const formSelectClass = formInputClass;
const formInputErrorClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";
const formLabelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]";

const FormSection = ({ title, description, children, className = "" }) => (
    <section className={`rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-5 shadow-sm ${className}`}>
        {title && (
            <div className="mb-4 border-b border-[#F3F4F6] pb-3">
                <h3 className="text-base font-semibold text-[#111827]">{title}</h3>
                {description && <p className="mt-1 text-xs text-[#6B7280]">{description}</p>}
            </div>
        )}
        <div className="space-y-4">{children}</div>
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
    } else if (mapsApi === "barikoi" && !hasVia) {
        distance = await fetchBarikoiRouteDistance(pickup, destination, apiKeys?.barikoiKey);
    }

    if (!distance) {
        distance = await fetchOsrmRouteDistance(pickup, destination, viaCoords);
    }

    return distance;
};

const AddBooking = ({ setIsOpen, onBookingCreated }) => {
    const todayWeekday = getTodayWeekdayLabel();
    const rawTenant = getTenantData();
    const tenant = rawTenant?.data || rawTenant || {};
    const SEARCH_API = tenant?.search_api || rawTenant?.search_api;
    const tenantCountryIso = getTenantCountryIso();

    const getInitialMapType = () => {
        const mapsApi = (tenant?.maps_api || rawTenant?.maps_api)?.trim().toLowerCase();
        if (mapsApi === "barikoi") return "barikoi";
        if (mapsApi === "google") return "google";
        if (tenantCountryIso === "BD") return "barikoi";
        return "google";
    };

    const MAPS_API = getInitialMapType();
    const [countryCode, setCountryCode] = useState(tenantCountryIso?.toLowerCase() || "");
    const defaultDialCode = getTenantDialCode();

    const [subCompanyList, setSubCompanyList] = useState([]);
    const [vehicleList, setVehicleList] = useState([]);
    const [driverList, setDriverList] = useState([]);
    const [accountList, setAccountList] = useState([]);
    const [loadingSubCompanies, setLoadingSubCompanies] = useState(false);
    const [mapsApi, setMapsApi] = useState(MAPS_API);
    const [searchApi, setSearchApi] = useState(SEARCH_API);
    const [googleService, setGoogleService] = useState(null);
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState([]);
    const [viaSuggestions, setViaSuggestions] = useState({});
    const [showPickup, setShowPickup] = useState(false);
    const [showDestination, setShowDestination] = useState(false);
    const [showVia, setShowVia] = useState({});
    const [pickupPlotData, setPickupPlotData] = useState(null);
    const [destinationPlotData, setDestinationPlotData] = useState(null);
    const [viaPlotData, setViaPlotData] = useState({});
    const [stablePickupCoords, setStablePickupCoords] = useState(null);
    const [stableDestinationCoords, setStableDestinationCoords] = useState(null);
    const [stableViaCoords, setStableViaCoords] = useState([]);
    const formikRef = useState(null);
    const [formikSetFieldValue, setFormikSetFieldValue] = useState(null);
    const [fareData, setFareData] = useState(null);
    const [fareLoading, setFareLoading] = useState(false);
    const [fareError, setFareError] = useState(null);
    const [fareCalculated, setFareCalculated] = useState(false);
    const [isBookingLoading, setIsBookingLoading] = useState(false);
    const [isMultiBooking, setIsMultiBooking] = useState(false);
    const [isManualDispatchOnly, setIsManualDispatchOnly] = useState(false);
    const [loadingDispatchSystem, setLoadingDispatchSystem] = useState(true);
    const dispatcherId = getDispatcherId();
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
    const [apiKeys, setApiKeys] = useState({ googleKey: GOOGLE_KEY, barikoiKey: BARIKOI_KEY });
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

    const clearCalcError = (key) => setCalculateErrors(prev => ({ ...prev, [key]: undefined }));
    const clearBookingError = (key) => setBookingErrors(prev => ({ ...prev, [key]: undefined }));
    const clearFieldErrors = (key) => { clearCalcError(key); clearBookingError(key); };

    const [initialFormValues, setInitialFormValues] = useState({
        pickup_point: "", destination: "", via_points: [],
        via_latitude: [], via_longitude: [],
        pickup_latitude: "", pickup_longitude: "",
        destination_latitude: "", destination_longitude: "",
        pickup_plot_id: null, destination_plot_id: null, via_plot_id: [],
        sub_company: "", account: "", vehicle: "", driver: "",
        journey_type: "one_way", booking_system: "auto_dispatch",
        auto_dispatch: true, bidding: false, request_for_vehicle: false,
        pickup_time_type: "asap", pickup_time: "",
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
    });

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

    useEffect(() => {
        const fetchApiKeys = async () => {
            try {
                const res = await apiGetCompanyApiKeys();
                if (res.data?.success) {
                    const data = res.data.data;

                    // Validate keys - fall back to defaults if they look like placeholders (e.g. "divonyx")
                    const googleKey = (data.google_api_key && data.google_api_key.startsWith("AIza"))
                        ? data.google_api_key
                        : (GOOGLE_KEY.startsWith("AIza") ? GOOGLE_KEY : DEFAULT_GOOGLE_KEY);

                    const barikoiKey = (data.barikoi_api_key && data.barikoi_api_key.startsWith("bkoi_"))
                        ? data.barikoi_api_key
                        : (BARIKOI_KEY.startsWith("bkoi_") ? BARIKOI_KEY : DEFAULT_BARIKOI_KEY);

                    setApiKeys({
                        googleKey,
                        barikoiKey,
                    });
                    if (data.maps_api) {
                        setMapsApi(data.maps_api.toLowerCase());
                    }
                    if (data.search_api) {
                        setSearchApi(data.search_api.toLowerCase());
                    }
                    if (data.country_of_use) {
                        setCountryCode(data.country_of_use.toLowerCase());
                    }
                    if (data.units) {
                        setCachedDistanceUnit(data.units);
                    }
                }
            } catch (err) {
                console.error("Fetch API keys error:", err);
            }
        };
        fetchApiKeys();

        const fetchPlots = async () => {
            try {
                const res = await apiGetAllPlot({ page: 1, limit: 100 });
                if (res.data?.success) setPlotsData(res.data.data?.data || res.data.data || []);
            } catch (err) { console.error("Fetch plots error:", err); }
        };
        fetchPlots();
    }, []);

    useEffect(() => {
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
                setIsManualDispatchOnly(data.some((item) => {
                    const isManual = item.dispatch_system === "manual_dispatch_only";
                    const isEnabled = item.status === "enable" || item.status === "enabled" || item.status === 1 || item.status === true;
                    return isManual && isEnabled;
                }));
            } catch { setIsManualDispatchOnly(false); }
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

    useEffect(() => {
        const storedData = localStorage.getItem('copiedBookingData');
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                setInitialFormValues({
                    ...parsedData,
                    request_for_vehicle: Boolean(
                        parsedData.request_for_vehicle ?? parsedData.vehicle
                    ),
                });
                if (parsedData.pickup_latitude && parsedData.pickup_longitude) {
                    const c = { lat: parseFloat(parsedData.pickup_latitude), lng: parseFloat(parsedData.pickup_longitude) };
                    setStablePickupCoords(c);
                    fetchPlotName(parsedData.pickup_latitude, parsedData.pickup_longitude).then(setPickupPlotData);
                }
                if (parsedData.destination_latitude && parsedData.destination_longitude) {
                    const c = { lat: parseFloat(parsedData.destination_latitude), lng: parseFloat(parsedData.destination_longitude) };
                    setStableDestinationCoords(c);
                    fetchPlotName(parsedData.destination_latitude, parsedData.destination_longitude).then(setDestinationPlotData);
                }
                if (parsedData.via_latitude?.length > 0) {
                    const viaC = [];
                    // Limit to 2 via stops when loading copied data
                    const limitedViaLat = parsedData.via_latitude.slice(0, 2);
                    limitedViaLat.forEach((lat, i) => {
                        const lng = parsedData.via_longitude[i];
                        if (lat && lng) {
                            viaC[i] = { lat: parseFloat(lat), lng: parseFloat(lng) };
                            fetchPlotName(lat, lng).then(pd => setViaPlotData(prev => ({ ...prev, [i]: pd })));
                        }
                    });
                    setStableViaCoords(viaC);
                }

                // Also limit via_points if they exist
                if (parsedData.via_points) parsedData.via_points = parsedData.via_points.slice(0, 2);
                if (parsedData.via_plot_id) parsedData.via_plot_id = parsedData.via_plot_id.slice(0, 2);

                localStorage.removeItem('copiedBookingData');
            } catch {
                localStorage.removeItem('copiedBookingData');
                toast.error("Failed to load booking data");
            }
        }
    }, []);

    const searchLocation = async (query, type, index = null) => {
        if (!query || query.trim().length < 2) return;
        let list = [];

        if ((searchApi === "google" || searchApi === "both") && googleService) {
            googleService.getPlacePredictions(
                {
                    input: query,
                    componentRestrictions: { country: countryCode },
                },
                (predictions, status) => {
                    if (status === "OK") {
                        list = predictions.map(p => ({
                            label: p.description,
                            place_id: p.place_id,
                            source: "google",
                        }));
                        updateSuggestions(list, type, index);
                    }
                }
            );
        }

        if (searchApi === "barikoi" || searchApi === "both") {
            try {
                const res = await fetch(
                    `https://barikoi.xyz/v1/api/search/autocomplete/${apiKeys.barikoiKey || BARIKOI_KEY}/place?q=${encodeURIComponent(query)}`
                );
                const json = await res.json();
                const barikoiList = (json.places || []).map(p => ({
                    label: p.address || p.place_name,
                    lat: p.latitude,
                    lng: p.longitude,
                    source: "barikoi",
                }));
                list = searchApi === "both" ? [...list, ...barikoiList] : barikoiList;
                updateSuggestions(list, type, index);
            } catch (err) {
                console.error("Barikoi search error:", err);
            }
        }
    };

    const updateSuggestions = (list, type, index) => {
        if (type === "pickup") { setPickupSuggestions(list); setShowPickup(true); }
        else if (type === "destination") { setDestinationSuggestions(list); setShowDestination(true); }
        else { setViaSuggestions(v => ({ ...v, [index]: list })); setShowVia(v => ({ ...v, [index]: true })); }
    };

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
        if (type === "pickup") { setFieldValue("pickup_point", item.label); setShowPickup(false); }
        else if (type === "destination") { setFieldValue("destination", item.label); setShowDestination(false); }
        else { setFieldValue(`via_points[${index}]`, item.label); setShowVia(v => ({ ...v, [index]: false })); }

        let latLng = null;
        if (item.source === "google") latLng = await getLatLngFromPlaceId(item.place_id);
        else if (item.source === "barikoi") latLng = { lat: item.lat, lng: item.lng };

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
        if (!values.pickup_point?.trim()) errors.pickup_point = "Pickup point is required";
        if (!values.destination?.trim()) errors.destination = "Destination is required";
        if (values.request_for_vehicle && !values.vehicle) errors.vehicle = "Vehicle type is required";
        if (!values.journey_type) errors.journey_type = "Journey type is required";
        return errors;
    };

    const validateCreateBooking = (values) => {
        const errors = {};
        if (!values.pickup_point?.trim()) errors.pickup_point = "Pickup point is required";
        if (!values.destination?.trim()) errors.destination = "Destination is required";
        if (values.request_for_vehicle && !values.vehicle) errors.vehicle = "Vehicle type is required";
        if (!values.journey_type) errors.journey_type = "Journey type is required";
        if (!values.auto_dispatch && !values.bidding) {
            errors.booking_system = "Select Auto Dispatch or Bidding";
        }
        if (!values.booking_type || values.booking_type === "outstation") errors.booking_type = "Please select a booking type";
        if (!isMultiBooking && !values.booking_date) errors.booking_date = "Booking date is required";
        if (values.pickup_time_type === "time" && !values.pickup_time) errors.pickup_time = "Pickup time is required";
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

    const handleCalculateFares = async (values, setFieldValue) => {
        const errors = validateCalculateFares(values);
        if (Object.keys(errors).length > 0) { setCalculateErrors(errors); setFareLoading(false); return; }
        setCalculateErrors({});
        setFareLoading(true);
        setFareError(null);
        try {
            const pickupCoords = await resolveLocationCoords(
                values.pickup_point,
                values.pickup_latitude,
                values.pickup_longitude
            );
            if (!pickupCoords) { toast.error("Could not get coordinates for pickup point"); setFareLoading(false); return; }

            const destinationCoords = await resolveLocationCoords(
                values.destination,
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
        if (!formikSetFieldValue) return;

        if (!stablePickupCoords?.lat || !stableDestinationCoords?.lat) {
            formikSetFieldValue("distance", "");
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            const distanceKm = await fetchRouteDistance(
                stablePickupCoords,
                stableDestinationCoords,
                stableViaCoords.filter(Boolean),
                mapsApi,
                apiKeys
            );
            if (!cancelled && distanceKm) {
                formikSetFieldValue("distance", kmValueToDisplayDistance(distanceKm));
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        stablePickupCoords,
        stableDestinationCoords,
        stableViaCoords,
        mapsApi,
        apiKeys,
        formikSetFieldValue,
    ]);

    const swapLocations = (index, setFieldValue, values) => {
        const viaPoint = values.via_points[index];
        const viaLat = values.via_latitude?.[index];
        const viaLng = values.via_longitude?.[index];
        const viaPlotId = values.via_plot_id?.[index];
        const viaPlotDataValue = viaPlotData[index];
        const viaStable = stableViaCoords[index];

        setFieldValue(`via_points[${index}]`, values.destination);
        setFieldValue(`via_latitude[${index}]`, values.destination_latitude);
        setFieldValue(`via_longitude[${index}]`, values.destination_longitude);
        setFieldValue(`via_plot_id[${index}]`, values.destination_plot_id);
        setViaPlotData(p => ({ ...p, [index]: destinationPlotData }));

        setFieldValue('destination', viaPoint);
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
            if (values.pickup_time_type === "asap") {
                const now = new Date();
                formData.append('pickup_time', `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`);
            } else {
                const tv = values.pickup_time || '';
                formData.append('pickup_time', tv ? `${tv}:00` : '');
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
            const pickupCoords = await getCoordinatesFromAddress(values.pickup_point);
            const destinationCoords = await getCoordinatesFromAddress(values.destination);

            if (pickupCoords) {
                formData.append('pickup_point', `${pickupCoords.latitude}, ${pickupCoords.longitude}`);
                formData.append('pickup_location', values.pickup_point);
                
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
                formData.append('destination_location', values.destination);
                
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
                            formData.append(`via_point[${vi}][latitude]`, viaCoords.latitude.toString());
                            formData.append(`via_point[${vi}][longitude]`, viaCoords.longitude.toString());
                            formData.append(`via_location[${vi}]`, viaPoint);
                            
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
            formData.append('account', values.account || '');
            formData.append('vehicle', values.request_for_vehicle ? (values.vehicle || '') : '');
            formData.append('driver', values.auto_dispatch ? (values.driver || '') : '');
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
            formData.append('distance', fareData?.distance?.toString() || '');
            const response = await apiCreateBooking(formData);
            if (response?.data?.success === 1) {
                const createdCount = getMultiBookingCreatedCount(response.data);
                const successMessage = isMultiBooking
                    ? (
                        createdCount
                            ? `${createdCount} bookings created. Check Today's Booking for today and Pre Bookings for future dates.`
                            : (response?.data?.message || "Multi-bookings created successfully")
                    )
                    : (response?.data?.message || "Booking created successfully");
                toast.success(successMessage);
                playSuccessSound();
                const bookingCreatedMeta = {
                    isMultiBooking,
                    includesToday,
                    createdCount,
                };
                if (response?.data?.alertMessage) {
                    setAlertModal({ isOpen: true, message: response.data.alertMessage });
                    onBookingCreated?.(bookingCreatedMeta);
                    return;
                }
                onBookingCreated?.(bookingCreatedMeta);
                unlockBodyScroll();
                setIsOpen({ type: "new", isOpen: false });
            } else {
                toast.error(response?.data?.message || "Failed to create booking");
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || "An error occurred while creating booking");
        } finally {
            setIsBookingLoading(false);
        }
    };

    const shouldDisableDispatchOptions = (values) => {
        if (isMultiBooking) return true;
        const now = new Date();
        let year, month, day;
        if (values.booking_date?.includes("-")) {
            const p = values.booking_date.split("-");
            if (p[0].length === 4) { year = p[0]; month = p[1]; day = p[2]; }
            else { day = p[0]; month = p[1]; year = p[2]; }
        } else if (values.booking_date?.includes("/")) {
            const p = values.booking_date.split("/");
            if (p[2].length === 4) { month = p[0]; day = p[1]; year = p[2]; }
            else { day = p[0]; month = p[1]; year = p[2]; }
        } else {
            const d = new Date();
            year = d.getFullYear(); month = d.getMonth() + 1; day = d.getDate();
        }
        const [hour, minute] = (values.pickup_time || "00:00").split(":");
        return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0) > now;
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

    const memoizedMap = useMemo(() => (
        <Maps
            mapsApi={mapsApi}
            apiKeys={apiKeys}
            plotsData={plotsData}
            pickupCoords={stablePickupCoords}
            destinationCoords={stableDestinationCoords}
            viaCoords={stableViaCoords.filter(Boolean)}
            setFieldValue={formikSetFieldValue}
            fetchPlotName={fetchPlotName}
            setPickupPlotData={setPickupPlotData}
            setDestinationPlotData={setDestinationPlotData}
            onPickupConfirmed={handlePickupConfirmed}
            onDestinationConfirmed={handleDestinationConfirmed}
            SEARCH_API={searchApi}
        />
    ), [mapsApi, apiKeys, stablePickupCoords, stableDestinationCoords, stableViaCoords, searchApi, plotsData, formikSetFieldValue]);

    return (
        <>
            <AlertModal
                isOpen={alertModal.isOpen}
                message={alertModal.message}
                onClose={() => {
                    setAlertModal({ isOpen: false, message: '' });
                    unlockBodyScroll();
                    setIsOpen({ type: "new", isOpen: false });
                }}
            />

            <Formik
                initialValues={initialFormValues}
                key={initialFormValues.pickup_point || 'new'}
                onSubmit={handleCreateBooking}
                enableReinitialize
            >
                {({ values, setFieldValue }) => {
                    useEffect(() => { setFormikSetFieldValue(() => setFieldValue); }, [setFieldValue]);

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
                            <div className="w-full flex flex-col gap-6">
                                {/* Header */}
                                <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 sm:px-5 shadow-sm">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <h2 className="text-xl font-semibold text-[#111827]">Create New Booking</h2>
                                            <p className="mt-1 text-sm text-[#6B7280]">Fill in trip, passenger, and dispatch details below.</p>
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
                                            <div className="flex items-center justify-between sm:justify-start gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                                                <span className={`text-sm font-medium ${!isMultiBooking ? "text-[#1F41BB]" : "text-[#6B7280]"}`}>Single</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={isMultiBooking} onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setIsMultiBooking(checked);
                                                        if (checked) {
                                                            const today = formatDateForInput(new Date());
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
                                        </div>
                                    </div>
                                </div>

                                <div className="grid xl:grid-cols-[1fr_320px] gap-6 mb-2">
                                    <div className="space-y-5 min-w-0">
                                        {isMultiBooking && (
                                            <FormSection title="Recurring Schedule" description="Select weekdays and the date range for multi-bookings.">
                                                <div className="flex flex-wrap gap-3">
                                                    {MULTI_BOOKING_WEEKDAYS.map((day) => {
                                                        const value = day;
                                                        const checked = values.multi_days?.includes(value);
                                                        const isToday = day === todayWeekday;
                                                        return (
                                                            <label
                                                                key={day}
                                                                className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${checked ? "border-[#1F41BB] bg-[#EEF2FF] text-[#1F41BB]" : "border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]"}`}
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
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                        <FormSection title="Schedule" description="Pickup timing and booking classification.">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                                        <FormField label="Pickup Time">
                                                            <div className="flex gap-2">
                                                                <select
                                                                    className={formSelectClass}
                                                                    value={values.pickup_time_type || ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setFieldValue("pickup_time_type", val);
                                                                        if (val === "asap") setFieldValue("pickup_time", "");
                                                                        else if (!values.pickup_time) setFieldValue("pickup_time", "00:00");
                                                                        clearBookingError("pickup_time");
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
                                                                    <p className="text-xs text-[#6B7280] mt-1">
                                                                        Auto-set from today or start date for multi-booking.
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
                                                    </div>
                                        </FormSection>

                                        <FormSection title="Route" description="Pickup, optional via stops, and destination.">
                                            <div className="space-y-4">
                                                <div className="flex flex-col gap-3 md:flex-row md:items-start">
                                                    <div className="flex-1">
                                                        <InputBox
                                                            label="Pickup Point"
                                                            value={values.pickup_point}
                                                            plot={pickupPlotData?.name || ""}
                                                            suggestions={pickupSuggestions}
                                                            show={showPickup}
                                                            placeholder="Search location..."
                                                            hasError={!!(calculateErrors.pickup_point || bookingErrors.pickup_point)}
                                                            onChange={(v) => {
                                                                setFieldValue("pickup_point", v);
                                                                if (!v) {
                                                                    setStablePickupCoords(null);
                                                                    setFieldValue("pickup_latitude", "");
                                                                    setFieldValue("pickup_longitude", "");
                                                                }
                                                                searchLocation(v, "pickup");
                                                                clearFieldErrors("pickup_point");
                                                            }}
                                                            onSelect={(i) => selectLocation(i, "pickup", setFieldValue)}
                                                        />
                                                        <FieldError message={calculateErrors.pickup_point || bookingErrors.pickup_point} />
                                                    </div>
                                                    {values.via_points.length < 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (values.via_points.length < 2) {
                                                                    setFieldValue("via_points", [...values.via_points, ""]);
                                                                    invalidateFare();
                                                                } else {
                                                                    toast.error("Maximum 2 via stops allowed");
                                                                }
                                                            }}
                                                            className="mt-6 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2.5 text-sm font-medium text-[#1F41BB] transition hover:bg-[#DBEAFE]"
                                                        >
                                                            + Add Via
                                                        </button>
                                                    )}
                                                </div>

                                                    {values.via_points.map((_, i) => (
                                                        <div key={i} className="flex flex-col gap-3 md:flex-row md:items-start">
                                                            <div className="flex-1">
                                                                <InputBox
                                                                    label={`Via ${i + 1}`}
                                                                    value={values.via_points[i]}
                                                                    plot={viaPlotData[i]?.name || ""}
                                                                    suggestions={viaSuggestions[i] || []}
                                                                    placeholder="Search location..."
                                                                    show={showVia[i]}
                                                                    hasError={!!(calculateErrors[`via_points_${i}`] || bookingErrors[`via_points_${i}`])}
                                                                    onChange={(v) => {
                                                                        setFieldValue(`via_points[${i}]`, v);
                                                                        if (!v) {
                                                                            setStableViaCoords(prev => { const u = [...prev]; u[i] = null; return u; });
                                                                            setFieldValue(`via_latitude[${i}]`, "");
                                                                            setFieldValue(`via_longitude[${i}]`, "");
                                                                        }
                                                                        searchLocation(v, "via", i);
                                                                        clearCalcError(`via_points_${i}`);
                                                                        clearBookingError(`via_points_${i}`);
                                                                    }}
                                                                    onSelect={(i2) => selectLocation(i2, "via", setFieldValue, i)}
                                                                />
                                                                <FieldError message={calculateErrors[`via_points_${i}`] || bookingErrors[`via_points_${i}`]} />
                                                            </div>
                                                            <div className="flex gap-2 md:mt-6">
                                                                <button type="button" onClick={() => swapLocations(i, setFieldValue, values)} className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]">Swap</button>
                                                                <button type="button"
                                                                    onClick={() => {
                                                                        setFieldValue("via_points", values.via_points.filter((_, idx) => idx !== i));
                                                                        const newP = { ...viaPlotData }; delete newP[i]; setViaPlotData(newP);
                                                                        setStableViaCoords(prev => prev.filter((_, idx) => idx !== i));
                                                                        invalidateFare();
                                                                    }}
                                                                    className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm font-medium text-[#DC2626] hover:bg-[#FEE2E2]">Remove</button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                <InputBox
                                                    label="Destination"
                                                    value={values.destination}
                                                    plot={destinationPlotData?.name || ""}
                                                    suggestions={destinationSuggestions}
                                                    show={showDestination}
                                                    placeholder="Search location..."
                                                    hasError={!!(calculateErrors.destination || bookingErrors.destination)}
                                                    onChange={(v) => {
                                                        setFieldValue("destination", v);
                                                        if (!v) {
                                                            setStableDestinationCoords(null);
                                                            setFieldValue("destination_latitude", "");
                                                            setFieldValue("destination_longitude", "");
                                                        }
                                                        searchLocation(v, "destination");
                                                        clearFieldErrors("destination");
                                                    }}
                                                    onSelect={(i) => selectLocation(i, "destination", setFieldValue)}
                                                />
                                                <FieldError message={calculateErrors.destination || bookingErrors.destination} />
                                            </div>
                                        </FormSection>

                                        <FormSection title="Passenger Details" description="Contact information for the booking.">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField label="Name">
                                                    <input type="text" placeholder="Enter passenger name"
                                                        className={`${formInputClass} ${bookingErrors.name ? formInputErrorClass : ""}`}
                                                        value={values.name || ""}
                                                        onChange={(e) => { setFieldValue("name", e.target.value); clearBookingError("name"); }} />
                                                    <FieldError message={bookingErrors.name} />
                                                </FormField>
                                                <FormField label="Email">
                                                    <input type="email" placeholder="Enter email"
                                                        className={formInputClass}
                                                        value={values.email || ""}
                                                        onChange={(e) => setFieldValue("email", e.target.value)} />
                                                </FormField>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField label="Mobile No">
                                                    <div className="relative flex">
                                                        {defaultDialCode && (
                                                            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-[#D1D5DB] bg-[#F3F4F6] px-3 text-sm font-medium text-[#374151]">
                                                                {defaultDialCode}
                                                            </span>
                                                        )}
                                                        <input type="text" placeholder="Enter mobile number"
                                                            className={`${formInputClass} ${defaultDialCode ? "rounded-l-none" : ""} ${bookingErrors.phone_no ? formInputErrorClass : ""}`}
                                                            value={values.phone_no || ""}
                                                            onChange={(e) => { const v = e.target.value; setFieldValue("phone_no", v); searchUsers(v); clearBookingError("phone_no"); }}
                                                            onFocus={() => { if (values.phone_no && userSuggestions.length > 0) setShowUserSuggestions(true); }} />
                                                        {showUserSuggestions && (
                                                            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                                                                {!loadingUsers && userSuggestions.length === 0 && <div className="p-3 text-center text-sm text-[#9CA3AF]">No users found</div>}
                                                                {userSuggestions.map((user, idx) => (
                                                                    <div key={user.id || idx} onClick={() => selectUser(user, setFieldValue)}
                                                                        className="flex cursor-pointer items-center justify-between border-b border-[#F3F4F6] p-3 last:border-b-0 hover:bg-[#F9FAFB]">
                                                                        <div className="font-medium text-[#111827]">{user.phone_no}</div>
                                                                        <div className="flex gap-3 text-xs text-[#1F41BB]">
                                                                            <span className="cursor-pointer">Copy Details</span>
                                                                            <span onClick={(e) => { e.stopPropagation(); handleViewHistory(user); }} className="cursor-pointer text-[#6B7280]">View History</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <FieldError message={bookingErrors.phone_no} />
                                                </FormField>
                                                <FormField label="Telephone No">
                                                    <input type="text" placeholder="Enter telephone number"
                                                        className={formInputClass}
                                                        value={values.tel_no || ""}
                                                        onChange={(e) => setFieldValue("tel_no", e.target.value)} />
                                                </FormField>
                                            </div>
                                        </FormSection>

                                        <FormSection title="Dispatch & Vehicle" description="Choose how the job is assigned and whether a vehicle type is required.">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField label="Journey Type">
                                                    <div className="flex flex-wrap gap-2">
                                                        {[{ val: "one_way", label: "One Way" }, { val: "return", label: "Return" }, { val: "wr", label: "W/R" }].map(({ val, label }) => (
                                                            <label key={val} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition ${values.journey_type === val ? "border-[#1F41BB] bg-[#EEF2FF] text-[#1F41BB]" : "border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]"}`}>
                                                                <input type="radio" name="journey" className="sr-only" checked={values.journey_type === val}
                                                                    onChange={() => { setFieldValue("journey_type", val); invalidateFare(); clearFieldErrors("journey_type"); }} />
                                                                {label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </FormField>
                                                <FormField label="Account">
                                                    <select name="account" value={values.account || ""}
                                                        onChange={(e) => setFieldValue("account", e.target.value)}
                                                        className={formSelectClass}
                                                        disabled={loadingSubCompanies}>
                                                        <option value="">Select Account</option>
                                                        {accountList?.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                                                    </select>
                                                </FormField>
                                            </div>

                                            <FormField label="Dispatch Mode">
                                                <div className={`inline-flex rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1 ${isManualDispatchOnly ? "opacity-50" : ""}`}>
                                                    <button
                                                        type="button"
                                                        disabled={isManualDispatchOnly}
                                                        onClick={() => {
                                                            setFieldValue("auto_dispatch", true);
                                                            setFieldValue("bidding", false);
                                                            setFieldValue("booking_system", "auto_dispatch");
                                                        }}
                                                        className={`rounded-md px-4 py-2 text-sm font-medium transition ${values.auto_dispatch && !values.bidding ? "bg-white text-[#1F41BB] shadow-sm" : "text-[#6B7280]"}`}
                                                    >
                                                        Auto Dispatch
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isManualDispatchOnly}
                                                        onClick={() => {
                                                            setFieldValue("auto_dispatch", false);
                                                            setFieldValue("bidding", true);
                                                            setFieldValue("booking_system", "bidding");
                                                            setFieldValue("driver", "");
                                                            clearBookingError("driver");
                                                        }}
                                                        className={`rounded-md px-4 py-2 text-sm font-medium transition ${values.bidding && !values.auto_dispatch ? "bg-white text-[#1F41BB] shadow-sm" : "text-[#6B7280]"}`}
                                                    >
                                                        Bidding
                                                    </button>
                                                </div>
                                                <FieldError message={bookingErrors.booking_system} />
                                            </FormField>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(values.auto_dispatch || isManualDispatchOnly) && !values.bidding && (
                                                    <FormField label="Driver (Optional)">
                                                        <select
                                                            name="driver"
                                                            value={values.driver || ""}
                                                            onChange={(e) => {
                                                                const selectedDriverId = e.target.value;
                                                                setFieldValue("driver", selectedDriverId);
                                                                clearBookingError("driver");
                                                                if (!selectedDriverId) {
                                                                    if (values.request_for_vehicle) {
                                                                        setFilteredVehicleList(vehicleList);
                                                                        setFieldValue("vehicle", "");
                                                                        invalidateFare();
                                                                    }
                                                                    return;
                                                                }
                                                                if (!values.request_for_vehicle) return;
                                                                const sel = driverList.find(d => d.value === selectedDriverId);
                                                                if (!sel) {
                                                                    setFilteredVehicleList(vehicleList);
                                                                    return;
                                                                }
                                                                const avId = sel.assigned_vehicle;
                                                                const vtId = sel.vehicle_type;
                                                                if (avId) {
                                                                    const filtered = vehicleList.filter(v => v.value === avId.toString());
                                                                    setFilteredVehicleList(filtered.length > 0 ? filtered : vehicleList);
                                                                    if (filtered.length === 1) {
                                                                        setFieldValue("vehicle", filtered[0].value);
                                                                        invalidateFare();
                                                                    } else {
                                                                        setFieldValue("vehicle", "");
                                                                    }
                                                                } else {
                                                                    setFilteredVehicleList(vehicleList);
                                                                    if (vtId) {
                                                                        const match = vehicleList.find(v => v.value === vtId.toString());
                                                                        if (match) {
                                                                            setFieldValue("vehicle", match.value);
                                                                            invalidateFare();
                                                                        }
                                                                    } else {
                                                                        setFieldValue("vehicle", "");
                                                                    }
                                                                }
                                                            }}
                                                            disabled={loadingSubCompanies}
                                                            className={`${formSelectClass} ${bookingErrors.driver ? formInputErrorClass : ""}`}
                                                        >
                                                            <option value="">Select Driver</option>
                                                            {driverList?.map(item => (
                                                                <option key={item.value} value={item.value}>{item.label}</option>
                                                            ))}
                                                        </select>
                                                        <FieldError message={bookingErrors.driver} />
                                                    </FormField>
                                                )}

                                                <FormField label="Request for Vehicle">
                                                    <div className="flex h-[42px] items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4">
                                                        <span className="text-sm text-[#374151]">{values.request_for_vehicle ? "Vehicle type required" : "No vehicle preference"}</span>
                                                        <button
                                                            type="button"
                                                            aria-pressed={values.request_for_vehicle}
                                                            onClick={() => {
                                                                const next = !values.request_for_vehicle;
                                                                setFieldValue("request_for_vehicle", next);
                                                                if (!next) {
                                                                    setFieldValue("vehicle", "");
                                                                    setFilteredVehicleList(vehicleList);
                                                                    invalidateFare();
                                                                    clearFieldErrors("vehicle");
                                                                }
                                                            }}
                                                            className={`relative inline-flex h-[28px] w-[48px] items-center rounded-full transition-colors flex-shrink-0 ${values.request_for_vehicle ? "bg-[#1F41BB]" : "bg-[#D1D5DB]"}`}
                                                        >
                                                            <span className={`inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow transition-transform ${values.request_for_vehicle ? "translate-x-[22px]" : "translate-x-[3px]"}`} />
                                                        </button>
                                                    </div>
                                                </FormField>

                                                {values.request_for_vehicle && (
                                                    <FormField label="Vehicle Type" className="md:col-span-2">
                                                        <select
                                                            name="vehicle"
                                                            value={values.vehicle || ""}
                                                            onChange={(e) => {
                                                                setFieldValue("vehicle", e.target.value);
                                                                invalidateFare();
                                                                clearFieldErrors("vehicle");
                                                            }}
                                                            disabled={loadingSubCompanies}
                                                            className={`${formSelectClass} ${(calculateErrors.vehicle || bookingErrors.vehicle) ? formInputErrorClass : ""}`}
                                                        >
                                                            <option value="">Select Vehicle</option>
                                                            {filteredVehicleList?.map(item => (
                                                                <option key={item.value} value={item.value}>{item.label}</option>
                                                            ))}
                                                        </select>
                                                        <FieldError message={calculateErrors.vehicle || bookingErrors.vehicle} />
                                                    </FormField>
                                                )}
                                            </div>
                                        </FormSection>

                                        <FormSection title="Trip Details">
                                                    <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
                                                        {[{ label: "Passengers", name: "passenger" }, { label: "Luggage", name: "luggage" }, { label: "Hand Luggage", name: "hand_luggage" }].map(({ label, name }) => (
                                                            <FormField key={name} label={label}>
                                                                <input type="number" className={formInputClass}
                                                                    value={values[name] || 0}
                                                                    onChange={(e) => setFieldValue(name, Number(e.target.value) || 0)} />
                                                            </FormField>
                                                        ))}
                                                    </div>
                                                    <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
                                                        <FormField label="Special Request">
                                                            <input type="text" placeholder="Any special instructions..."
                                                                className={formInputClass}
                                                                value={values.special_request || ""}
                                                                onChange={(e) => setFieldValue("special_request", e.target.value)} />
                                                        </FormField>
                                                        <FormField label="Payment Reference">
                                                            <input type="text" placeholder="Payment reference..."
                                                                className={formInputClass}
                                                                value={values.payment_reference || ""}
                                                                onChange={(e) => setFieldValue("payment_reference", e.target.value)} />
                                                        </FormField>
                                                    </div>
                                        </FormSection>
                                    </div>

                                    {/* Map sidebar */}
                                    <div className="xl:sticky xl:top-4 h-fit space-y-4">
                                        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                                            <div className="border-b border-[#F3F4F6] px-4 py-3">
                                                <h3 className="text-sm font-semibold text-[#111827]">Route Map</h3>
                                                <p className="text-xs text-[#6B7280]">Preview pickup, via, and destination</p>
                                            </div>
                                            <div className="min-h-[360px] w-full">
                                                {memoizedMap}
                                            </div>
                                        </div>
                                        <FormField label="Estimated Distance">
                                            <input type="text" placeholder="Calculated after route selection" readOnly
                                                value={formatDistanceWithUnit(values.distance)}
                                                className={`${formInputClass} bg-[#F9FAFB]`} />
                                        </FormField>
                                    </div>
                                </div>

                                {/* Charges */}
                                <FormSection title="Fare & Charges" description="Calculate fares before creating the booking." className="bg-[#F8FAFF]">
                                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                                        <FormField label="Payment Method" className="sm:min-w-[220px]">
                                            <select value={values.payment_method}
                                                onChange={(e) => { setFieldValue("payment_method", e.target.value); clearBookingError("payment_method"); }}
                                                className={`${formSelectClass} ${bookingErrors.payment_method ? formInputErrorClass : ""}`}>
                                                <option value="">Select Method</option>
                                                <option value="cash">Cash</option>
                                                <option value="online">Online</option>
                                            </select>
                                            <FieldError message={bookingErrors.payment_method} />
                                        </FormField>
                                        <Button btnSize="md" type="filled" className="px-5 py-3 text-sm whitespace-nowrap"
                                            onClick={() => handleCalculateFares(values, setFieldValue)}
                                            disabled={fareLoading}>
                                            {fareLoading ? "Calculating..." : "Calculate Fares"}
                                        </Button>
                                    </div>
                                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                                        <ChargeInput label="Booking Fee" name="booking_fee_charges" value={values.booking_fee_charges} onChange={handleChargeChange} />
                                        {chargeFields.map(field => (
                                            <ChargeInput key={field} label={field.replaceAll("_", " ")} name={field} value={values[field]} onChange={handleChargeChange} />
                                        ))}
                                    </div>
                                    <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3">
                                        <ChargeInput label="Total Charges" name="total_charges" value={values.total_charges} onChange={handleChargeChange} />
                                    </div>
                                    {bookingErrors.fare && <FieldError message={bookingErrors.fare} />}
                                </FormSection>

                                <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm">
                                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                                        <Button btnSize="md" type="filledGray" className="!px-8 py-3 w-full sm:w-auto"
                                            onClick={() => { unlockBodyScroll(); setIsOpen({ type: "new", isOpen: false }); }}>
                                            Cancel
                                        </Button>
                                        <Button btnType="submit" btnSize="md" type="filled" className="!px-8 py-3 w-full sm:w-auto"
                                            disabled={isBookingLoading || !fareCalculated}
                                            title={!fareCalculated ? "Please calculate fares first" : ""}>
                                            {isBookingLoading ? "Creating..." : "Create Booking"}
                                        </Button>
                                    </div>
                                    {!fareCalculated && (
                                        <p className="mt-3 text-xs font-medium text-red-600 text-center sm:text-right">Please calculate fares before creating the booking.</p>
                                    )}
                                </div>
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

const InputBox = ({ label, value, onChange, suggestions, show, onSelect, plot, placeholder, hasError }) => (
    <div className="relative w-full">
        <label className={formLabelClass}>{label}</label>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-2">
            <div className="relative">
                <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                    className={`${formInputClass} ${hasError ? formInputErrorClass : ""}`} />
                {show && (
                    <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                        {suggestions.map((i, idx) => (
                            <li key={idx} onClick={() => onSelect(i)} className="cursor-pointer px-3 py-2 text-sm hover:bg-[#F9FAFB]">{i.label}</li>
                        ))}
                    </ul>
                )}
            </div>
            <input readOnly placeholder="Plot" value={plot || ""}
                className={`${formInputClass} bg-[#F9FAFB] text-[#6B7280]`} />
        </div>
    </div>
);

const ChargeInput = ({ label, name, value, onChange, readOnly = false }) => (
    <div>
        <label className={formLabelClass}>{label}</label>
        <input type="number" step="0.01" value={value === "" || value == null ? "" : value} readOnly={readOnly}
            onChange={(e) => onChange && onChange(name, e.target.value)}
            className={`${formInputClass} ${readOnly ? "bg-[#F9FAFB]" : ""}`} />
    </div>
);