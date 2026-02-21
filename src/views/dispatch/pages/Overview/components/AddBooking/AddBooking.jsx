import { Form, Formik } from "formik";
import { useEffect, useState } from "react";
import Maps from "./components/maps";
import { getTenantData } from "../../../../../../utils/functions/tokenEncryption";
import { apiGetSubCompany } from "../../../../../../services/SubCompanyServices";
import { apiGetAccount } from "../../../../../../services/AccountServices";
import { apiGetDriverManagement } from "../../../../../../services/DriverManagementService";
import { apiGetAllVehicleType } from "../../../../../../services/VehicleTypeServices";
import Button from "../../../../../../components/ui/Button/Button";
import { apiGetAllPlot, apiCreateCalculateFares, apiCreateBooking } from "../../../../../../services/AddBookingServices";
import { apiGetDispatchSystem } from "../../../../../../services/SettingsConfigurationServices";
import { unlockBodyScroll } from "../../../../../../utils/functions/common.function";
import toast from 'react-hot-toast';
import { getDispatcherId } from "../../../../../../utils/auth";
import { apiGetRideHistory, apiGetUser } from "../../../../../../services/UserService";
import { debounce } from "lodash";
import History from "./components/History";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const BARIKOI_KEY = import.meta.env.VITE_BARIKOI_API_KEY;

const loadGoogleScript = () =>
    new Promise((resolve) => {
        if (window.google?.maps?.places) return resolve();
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
        script.async = true;
        script.onload = resolve;
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

const AddBooking = ({ setIsOpen }) => {
    const [subCompanyList, setSubCompanyList] = useState([]);
    const [vehicleList, setVehicleList] = useState([]);
    const [driverList, setDriverList] = useState([]);
    const [accountList, setAccountList] = useState([]);
    const [loadingSubCompanies, setLoadingSubCompanies] = useState(false);
    const [mapsApi, setMapsApi] = useState("google");

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

    const clearCalcError = (key) =>
        setCalculateErrors(prev => ({ ...prev, [key]: undefined }));

    const clearBookingError = (key) =>
        setBookingErrors(prev => ({ ...prev, [key]: undefined }));

    const clearFieldErrors = (key) => {
        clearCalcError(key);
        clearBookingError(key);
    };

    const [initialFormValues, setInitialFormValues] = useState({
        pickup_point: "",
        destination: "",
        via_points: [],
        via_latitude: [],
        via_longitude: [],
        pickup_latitude: "",
        pickup_longitude: "",
        destination_latitude: "",
        destination_longitude: "",
        pickup_plot_id: null,
        destination_plot_id: null,
        via_plot_id: [],
        sub_company: "",
        account: "",
        vehicle: "",
        driver: "",
        journey_type: "one_way",
        booking_system: "auto_dispatch",
        auto_dispatch: true,
        bidding: false,
        pickup_time_type: "asap",
        pickup_time: "",
        booking_date: "",
        booking_type: "outstation",
        name: "",
        email: "",
        phone_no: "",
        tel_no: "",
        passenger: 0,
        luggage: 0,
        hand_luggage: 0,
        special_request: "",
        payment_reference: "",
        payment_method: "cash",
        base_fare: 0,
        fares: 0,
        return_fares: 0,
        parking_charges: 0,
        booking_fee_charges: 0,
        ac_fares: 0,
        return_ac_fares: 0,
        ac_parking_charges: 0,
        waiting_charges: 0,
        extra_charges: 0,
        congestion_toll: 0,
        ac_waiting_charges: 0,
        total_charges: 0,
        distance: "",
        user_id: "",
    });

    const rawTenant = getTenantData();
    const tenant = rawTenant?.data || {};
    const SEARCH_API = tenant?.search_api;
    const COUNTRY_CODE = tenant?.country_of_use?.toLowerCase();

    const chargeFields = [
        "fares", "return_fares", "waiting_time", "parking_charges", "ac_fares",
        "return_ac_fares", "ac_parking_charges", "waiting_charges", "extra_charges",
        "congestion_toll", "ac_waiting_charges",
    ];

    const searchUsers = debounce(async (query) => {
        if (!query || query.length < 3) {
            setUserSuggestions([]);
            setShowUserSuggestions(false);
            return;
        }
        setLoadingUsers(true);
        try {
            const response = await apiGetUser({ search: query, perPage: 10 });
            if (response?.data?.success === 1) {
                const users = response?.data?.users?.data || [];
                setUserSuggestions(users);
                setShowUserSuggestions(users.length > 0);
            } else {
                setUserSuggestions([]);
                setShowUserSuggestions(false);
            }
        } catch (error) {
            console.error("User search error:", error);
            setUserSuggestions([]);
            setShowUserSuggestions(false);
        } finally {
            setLoadingUsers(false);
        }
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
        const rawTenant = getTenantData();
        const tenant = rawTenant?.data || {};
        if (tenant?.maps_api) {
            const mapType = tenant.maps_api.toLowerCase();
            setMapsApi(mapType === "barikoi" ? "barikoi" : "google");
        }
    }, []);

    useEffect(() => {
        const checkDispatchSystem = async () => {
            try {
                setLoadingDispatchSystem(true);
                const response = await apiGetDispatchSystem();
                let data = response?.data?.data || response?.data || response;
                if (!Array.isArray(data)) {
                    if (data && typeof data === 'object') {
                        const possibleArrayKeys = ['items', 'results', 'dispatches', 'systems', 'list'];
                        for (const key of possibleArrayKeys) {
                            if (Array.isArray(data[key])) { data = data[key]; break; }
                        }
                    }
                    if (!Array.isArray(data)) {
                        data = (data && typeof data === 'object' && Object.keys(data).length > 0) ? [data] : [];
                    }
                }
                const hasManualDispatchEnabled = data.some((item) => {
                    const isManualDispatch = item.dispatch_system === "manual_dispatch_only";
                    const isEnabled = item.status === "enable" || item.status === "enabled" || item.status === 1 || item.status === true;
                    return isManualDispatch && isEnabled;
                });
                setIsManualDispatchOnly(hasManualDispatchEnabled);
            } catch (error) {
                console.error("Error fetching dispatch system:", error);
                setIsManualDispatchOnly(false);
            } finally {
                setLoadingDispatchSystem(false);
            }
        };
        checkDispatchSystem();
    }, []);

    useEffect(() => {
        const fetchSubCompanies = async () => {
            setLoadingSubCompanies(true);
            try {
                const response = await apiGetSubCompany();
                if (response?.data?.success === 1) {
                    const companies = response?.data?.list?.data || [];
                    setSubCompanyList(companies.map(c => ({ label: c.name, value: c.id.toString() })));
                }
            } catch (error) { console.error("Error fetching sub-companies:", error); }
            finally { setLoadingSubCompanies(false); }
        };
        fetchSubCompanies();
    }, []);

    useEffect(() => {
        const fetchAccounts = async () => {
            setLoadingSubCompanies(true);
            try {
                const response = await apiGetAccount();
                if (response?.data?.success === 1) {
                    const accounts = response?.data?.list?.data || [];
                    setAccountList(accounts.map(a => ({ label: a.name, value: a.id.toString() })));
                }
            } catch (error) { console.error("Error fetching account:", error); }
            finally { setLoadingSubCompanies(false); }
        };
        fetchAccounts();
    }, []);

    useEffect(() => {
        const fetchDrivers = async () => {
            setLoadingSubCompanies(true);
            try {
                const response = await apiGetDriverManagement({
                    status: "accepted",
                    page: 1,
                    perPage: 1000,
                });
                if (response?.data?.success === 1) {
                    const drivers = response?.data?.list?.data || response?.data?.list || [];

                    setDriverRawList(drivers);

                    const options = drivers.map(driver => ({
                        label: driver.name,
                        value: driver.id.toString(),
                        assigned_vehicle: driver.assigned_vehicle,
                        vehicle_type: driver.vehicle_type,
                    }));
                    setDriverList(options);
                }
            } catch (error) {
                console.error("Error fetching driver:", error);
            } finally {
                setLoadingSubCompanies(false);
            }
        };
        fetchDrivers();
    }, []);

    useEffect(() => {
        const fetchVehicle = async () => {
            setLoadingSubCompanies(true);
            try {
                const response = await apiGetAllVehicleType();
                if (response?.data?.success === 1) {
                    const vehicletype = response?.data?.list || [];
                    const options = vehicletype.map(v => ({
                        label: v.vehicle_type_name,
                        value: v.id.toString()
                    }));
                    setVehicleList(options);
                    setFilteredVehicleList(options);
                }
            } catch (error) {
                console.error("Error fetching vehicle:", error);
            } finally {
                setLoadingSubCompanies(false);
            }
        };
        fetchVehicle();
    }, []);

    useEffect(() => {
        if (SEARCH_API === "google" || SEARCH_API === "both") {
            loadGoogleScript().then(() => {
                setGoogleService(new window.google.maps.places.AutocompleteService());
            });
        }
    }, [SEARCH_API]);

    useEffect(() => {
        const storedData = localStorage.getItem('copiedBookingData');
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                setInitialFormValues(parsedData);
                if (parsedData.pickup_latitude && parsedData.pickup_longitude) {
                    fetchPlotName(parsedData.pickup_latitude, parsedData.pickup_longitude).then(setPickupPlotData);
                }
                if (parsedData.destination_latitude && parsedData.destination_longitude) {
                    fetchPlotName(parsedData.destination_latitude, parsedData.destination_longitude).then(setDestinationPlotData);
                }
                if (parsedData.via_latitude?.length > 0) {
                    parsedData.via_latitude.forEach((lat, index) => {
                        const lng = parsedData.via_longitude[index];
                        if (lat && lng) {
                            fetchPlotName(lat, lng).then(plotData => {
                                setViaPlotData(prev => ({ ...prev, [index]: plotData }));
                            });
                        }
                    });
                }
                localStorage.removeItem('copiedBookingData');
                toast.success("Booking data loaded successfully!");
            } catch (err) {
                console.error("Error parsing copied booking data:", err);
                localStorage.removeItem('copiedBookingData');
                toast.error("Failed to load booking data");
            }
        }
    }, []);

    const searchLocation = async (query, type, index = null) => {
        if (!query) return;
        let list = [];

        if ((SEARCH_API === "google" || SEARCH_API === "both") && googleService) {
            googleService.getPlacePredictions(
                { input: query, componentRestrictions: { country: COUNTRY_CODE } },
                (predictions, status) => {
                    if (status === "OK") {
                        list = predictions.map((p) => ({ label: p.description, place_id: p.place_id, source: "google" }));
                        updateSuggestions(list, type, index);
                    }
                }
            );
        }

        if (SEARCH_API === "barikoi" || SEARCH_API === "both") {
            const res = await fetch(`https://barikoi.xyz/v1/api/search/autocomplete/${BARIKOI_KEY}/place?q=${encodeURIComponent(query)}`);
            const json = await res.json();
            const barikoiList = (json.places || []).map((p) => ({ label: p.address || p.place_name, lat: p.latitude, lng: p.longitude, source: "barikoi" }));
            list = SEARCH_API === "both" ? [...list, ...barikoiList] : barikoiList;
            updateSuggestions(list, type, index);
        }
    };

    const updateSuggestions = (list, type, index) => {
        if (type === "pickup") { setPickupSuggestions(list); setShowPickup(true); }
        else if (type === "destination") { setDestinationSuggestions(list); setShowDestination(true); }
        else { setViaSuggestions((v) => ({ ...v, [index]: list })); setShowVia((v) => ({ ...v, [index]: true })); }
    };

    const getLatLngFromPlaceId = (placeId) =>
        new Promise((resolve) => {
            const service = new window.google.maps.places.PlacesService(document.createElement("div"));
            service.getDetails({ placeId, fields: ["geometry"] }, (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                    resolve({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
                } else resolve(null);
            });
        });

    const fetchPlotName = async (lat, lng) => {
        try {
            const formData = new FormData();
            formData.append("latitude", lat);
            formData.append("longitude", lng);
            const res = await apiGetAllPlot(formData);
            if (res?.data?.success === 1) {
                if (res.data.found === 1 && res.data.record) {
                    return { found: true, id: res.data.record.id, name: res.data.record.name };
                }
            }
            return { found: false, id: null, name: "Plot Not Found" };
        } catch (error) {
            return { found: false, id: null, name: "Plot Not Found" };
        }
    };

    const selectLocation = async (item, type, setFieldValue, index = null) => {
        if (type === "pickup") { setFieldValue("pickup_point", item.label); setShowPickup(false); }
        else if (type === "destination") { setFieldValue("destination", item.label); setShowDestination(false); }
        else { setFieldValue(`via_points[${index}]`, item.label); setShowVia((v) => ({ ...v, [index]: false })); }

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
            } else if (type === "destination") {
                setFieldValue("destination_latitude", latLng.lat);
                setFieldValue("destination_longitude", latLng.lng);
                setFieldValue("destination_plot_id", plotData.id);
            } else {
                setFieldValue(`via_latitude[${index}]`, latLng.lat);
                setFieldValue(`via_longitude[${index}]`, latLng.lng);
                setFieldValue(`via_plot_id[${index}]`, plotData.id);
            }
        }

        if (type === "pickup") setPickupPlotData(plotData);
        else if (type === "destination") setDestinationPlotData(plotData);
        else setViaPlotData((p) => ({ ...p, [index]: plotData }));

        invalidateFare();
    };

    const validateCalculateFares = (values) => {
        const errors = {};
        if (!values.pickup_point?.trim()) {
            errors.pickup_point = "Pickup point is required";
        } else if (!values.pickup_latitude || !values.pickup_longitude) {
            errors.pickup_point = "Please select pickup point from suggestions";
        }
        if (!values.destination?.trim()) {
            errors.destination = "Destination is required";
        } else if (!values.destination_latitude || !values.destination_longitude) {
            errors.destination = "Please select destination from suggestions";
        }
        if (values.via_points?.length > 0) {
            values.via_points.forEach((viaPoint, index) => {
                if (viaPoint?.trim()) {
                    if (!values.via_latitude?.[index] || !values.via_longitude?.[index]) {
                        errors[`via_points_${index}`] = `Via point ${index + 1}: Please select from suggestions`;
                    }
                }
            });
        }
        if (!values.vehicle) errors.vehicle = "Vehicle type is required";
        if (!values.journey_type) errors.journey_type = "Journey type is required";
        return errors;
    };

    const validateCreateBooking = (values) => {
        const errors = {};
        if (!values.pickup_point?.trim()) {
            errors.pickup_point = "Pickup point is required";
        } else if (!values.pickup_latitude || !values.pickup_longitude) {
            errors.pickup_point = "Please select pickup point from suggestions";
        }
        if (!values.destination?.trim()) {
            errors.destination = "Destination is required";
        } else if (!values.destination_latitude || !values.destination_longitude) {
            errors.destination = "Please select destination from suggestions";
        }
        if (values.via_points?.length > 0) {
            values.via_points.forEach((viaPoint, index) => {
                if (viaPoint?.trim()) {
                    if (!values.via_latitude?.[index] || !values.via_longitude?.[index]) {
                        errors[`via_points_${index}`] = `Via point ${index + 1}: Please select from suggestions`;
                    }
                }
            });
        }
        if (!values.vehicle) errors.vehicle = "Vehicle type is required";
        if (!values.journey_type) errors.journey_type = "Journey type is required";
        if (!values.booking_type || values.booking_type === "outstation") errors.booking_type = "Please select a booking type";
        if (!values.booking_date) errors.booking_date = "Booking date is required";
        if (values.pickup_time_type === "time" && !values.pickup_time) errors.pickup_time = "Pickup time is required";
        if (!values.name?.trim()) errors.name = "Passenger name is required";
        if (!values.phone_no?.trim()) errors.phone_no = "Mobile number is required";
        if (!values.payment_method) errors.payment_method = "Payment method is required";
        if (isMultiBooking) {
            if (!values.multi_days || values.multi_days.length === 0) errors.multi_days = "Please select at least one day";
            if (!values.multi_start_at) errors.multi_start_at = "Start date is required";
            if (!values.multi_end_at) errors.multi_end_at = "End date is required";
            if (values.multi_start_at && values.multi_end_at && new Date(values.multi_start_at) > new Date(values.multi_end_at)) {
                errors.multi_end_at = "End date cannot be before start date";
            }
        }
        if (shouldDisableDispatchOptions(values) && !values.driver) errors.driver = "Driver is required for future or multi bookings";
        if (!fareCalculated) errors.fare = "Please calculate fares before creating booking";
        return errors;
    };

    const handleCalculateFares = async (values, setFieldValue) => {
        const errors = validateCalculateFares(values);
        if (Object.keys(errors).length > 0) {
            setCalculateErrors(errors);
            setFareLoading(false);
            return;
        }
        setCalculateErrors({});
        setFareLoading(true);
        setFareError(null);

        try {
            const formData = new FormData();
            formData.append('pickup_point[latitude]', values.pickup_latitude.toString());
            formData.append('pickup_point[longitude]', values.pickup_longitude.toString());
            formData.append('destination_point[latitude]', values.destination_latitude.toString());
            formData.append('destination_point[longitude]', values.destination_longitude.toString());

            if (values.via_points?.length > 0) {
                let viaIndex = 0;
                for (let i = 0; i < values.via_points.length; i++) {
                    const viaLat = values.via_latitude?.[i];
                    const viaLng = values.via_longitude?.[i];
                    if (values.via_points[i]?.trim() && viaLat && viaLng) {
                        formData.append(`via_point[${viaIndex}][latitude]`, viaLat.toString());
                        formData.append(`via_point[${viaIndex}][longitude]`, viaLng.toString());
                        viaIndex++;
                    }
                }
            }

            formData.append('vehicle_id', values.vehicle);
            formData.append('journey', values.journey_type);

            const response = await apiCreateCalculateFares(formData);
            if (response?.data?.success === 1) {
                setFareData(response.data);
                setFareCalculated(true);
                if (response.data.distance) {
                    setFieldValue('distance', (response.data.distance / 1000).toFixed(2));
                }
                toast.success("Fare calculated successfully");
            } else {
                const errorMsg = response?.data?.message || "Failed to calculate fares";
                toast.error(errorMsg);
                setFareError(errorMsg);
            }
        } catch (error) {
            const errorMsg = error?.response?.data?.message || "An error occurred while calculating fares";
            toast.error(errorMsg);
            setFareError(errorMsg);
        } finally {
            setFareLoading(false);
        }
    };

    const invalidateFare = () => {
        setFareData(null);
        setFareError(null);
        setFareCalculated(false);
    };

    const swapLocations = (index, setFieldValue, values) => {
        const viaPoint = values.via_points[index];
        const viaLat = values.via_latitude?.[index];
        const viaLng = values.via_longitude?.[index];
        const viaPlotId = values.via_plot_id?.[index];
        const viaPlotDataValue = viaPlotData[index];

        setFieldValue(`via_points[${index}]`, values.destination);
        setFieldValue(`via_latitude[${index}]`, values.destination_latitude);
        setFieldValue(`via_longitude[${index}]`, values.destination_longitude);
        setFieldValue(`via_plot_id[${index}]`, values.destination_plot_id);
        setViaPlotData((p) => ({ ...p, [index]: destinationPlotData }));

        setFieldValue('destination', viaPoint);
        setFieldValue('destination_latitude', viaLat);
        setFieldValue('destination_longitude', viaLng);
        setFieldValue('destination_plot_id', viaPlotId);
        setDestinationPlotData(viaPlotDataValue);
        invalidateFare();
    };

    const handleCreateBooking = async (values) => {
        const errors = validateCreateBooking(values);
        if (Object.keys(errors).length > 0) {
            setBookingErrors(errors);
            return;
        }
        setBookingErrors({});
        setIsBookingLoading(true);

        try {
            const formData = new FormData();
            formData.append('sub_company', values.sub_company || '');
            formData.append('multi_booking', isMultiBooking ? 'yes' : 'no');

            if (isMultiBooking) {
                formData.append('multi_days', values.multi_days || '');
                formData.append('start_at', values.multi_start_at || '');
                formData.append('end_at', values.multi_end_at || '');
                formData.append('week', values.week_pattern || '');
            }

            if (values.pickup_time_type === "asap") {
                const now = new Date();
                formData.append('pickup_time', `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`);
            } else {
                const timeValue = values.pickup_time || '';
                formData.append('pickup_time', timeValue ? `${timeValue}:00` : '');
            }

            formData.append('booking_date', values.booking_date || '');
            formData.append('booking_type', values.booking_type || '');
            formData.append("dispatcher_id", dispatcherId);

            // Use stored coordinates directly
            formData.append('pickup_point', `${values.pickup_latitude}, ${values.pickup_longitude}`);
            formData.append('pickup_location', values.pickup_point);
            if (values.pickup_plot_id) formData.append('pickup_point_id', values.pickup_plot_id);

            formData.append('destination_point', `${values.destination_latitude}, ${values.destination_longitude}`);
            formData.append('destination_location', values.destination);
            if (values.destination_plot_id) formData.append('destination_point_id', values.destination_plot_id);

            if (values.via_points?.length > 0) {
                let viaIndex = 0;
                for (let i = 0; i < values.via_points.length; i++) {
                    const viaLat = values.via_latitude?.[i];
                    const viaLng = values.via_longitude?.[i];
                    if (values.via_points[i]?.trim() && viaLat && viaLng) {
                        formData.append(`via_point[${viaIndex}][latitude]`, viaLat.toString());
                        formData.append(`via_point[${viaIndex}][longitude]`, viaLng.toString());
                        formData.append(`via_location[${viaIndex}]`, values.via_points[i]);
                        if (values.via_plot_id?.[i]) formData.append(`via_point_id[${viaIndex}]`, values.via_plot_id[i]);
                        viaIndex++;
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
            formData.append('vehicle', values.vehicle || '');
            formData.append('driver', values.driver || '');
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
                toast.success(response?.data?.message || "Booking created successfully");
                if (response?.data?.alertMessage) {
                    setAlertModal({ isOpen: true, message: response.data.alertMessage });
                    return;
                }
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
            const parts = values.booking_date.split("-");
            if (parts[0].length === 4) { year = parts[0]; month = parts[1]; day = parts[2]; }
            else { day = parts[0]; month = parts[1]; year = parts[2]; }
        } else if (values.booking_date?.includes("/")) {
            const parts = values.booking_date.split("/");
            if (parts[2].length === 4) { month = parts[0]; day = parts[1]; year = parts[2]; }
            else { day = parts[0]; month = parts[1]; year = parts[2]; }
        } else {
            const d = new Date();
            year = d.getFullYear(); month = d.getMonth() + 1; day = d.getDate();
        }
        const time = values.pickup_time || "00:00";
        const [hour, minute] = time.split(":");
        const selectedDateTime = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0);
        return selectedDateTime > now;
    };

    const handleViewHistory = async (user) => {
        setSelectedUser(user);
        setShowUserSuggestions(false);
        try {
            const response = await apiGetRideHistory(user.id);
            if (response?.data?.success === 1) {
                const rides = response.data.rideHistory?.data || [];
                setUserHistory(rides.map((ride) => ({
                    id: ride.id,
                    date: `${ride.booking_date} ${ride.pickup_time}`,
                    from: ride.pickup_location || ride.pickup_point,
                    to: ride.destination_location || ride.destination_point,
                    status: ride.booking_status,
                    driver: ride.driver_detail?.name || "N/A",
                    bookingId: ride.booking_id,
                })));
            } else {
                setUserHistory([]);
            }
        } catch (error) {
            setUserHistory([]);
        }
        setShowHistoryModal(true);
    };

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
                    useEffect(() => {
                        if (fareData?.calculate_fare) {
                            setFieldValue('base_fare', fareData.calculate_fare);
                            const additionalCharges = chargeFields.reduce((sum, key) => sum + Number(values[key] || 0), 0);
                            setFieldValue("total_charges", parseFloat((fareData.calculate_fare + additionalCharges).toFixed(2)));
                        }
                    }, [fareData]);

                    const handleChargeChange = (name, value) => {
                        setFieldValue(name, Number(value) || 0);
                        setTimeout(() => {
                            const additionalCharges = chargeFields.reduce((sum, key) => sum + Number(values[key] || 0), 0);
                            const baseFare = Number(values.base_fare || 0);
                            setFieldValue("total_charges", parseFloat((baseFare + additionalCharges).toFixed(2)));
                        }, 0);
                    };

                    return (
                        <Form>
                            <div className="w-full flex flex-col gap-4">
                                {/* ── Header ── */}
                                <div>
                                    <div className="w-full flex max-sm:flex-col md:items-center gap-4">
                                        <h2 className="text-x font-semibold">Create New Booking</h2>
                                        <div className="flex md:flex-row flex-col md:gap-4 gap-0 md:items-center">
                                            <div className="md:w-72 w-full">
                                                <select
                                                    name="sub_company"
                                                    value={values.sub_company || ""}
                                                    onChange={(e) => setFieldValue("sub_company", e.target.value)}
                                                    disabled={loadingSubCompanies}
                                                    className="w-full border-[1.5px] border-[#8D8D8D] px-3 py-2 rounded-[8px]"
                                                >
                                                    <option value="">Select Sub Company</option>
                                                    {subCompanyList?.map((item) => (
                                                        <option key={item.value} value={item.value}>{item.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center rounded-[8px] px-3 py-2 border-[1.5px] shadow-lg border-[#8D8D8D]">
                                            <span className="text-sm mr-2">Single Booking</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={isMultiBooking} onChange={(e) => setIsMultiBooking(e.target.checked)} />
                                                <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-green-400 transition-all"></div>
                                                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-all"></div>
                                            </label>
                                            <span className="text-sm ml-2">Multi Booking</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex xl:flex-row lg:flex-row md:flex-col flex-col gap-4 mb-2">
                                    <div className="">
                                        {/* ── Multi Booking ── */}
                                        {isMultiBooking && (
                                            <div className="w-full mb-3">
                                                <div className="flex flex-col gap-2">
                                                    <span className="font-semibold text-sm">Select day of the week</span>
                                                    <div className="flex flex-wrap gap-3 pb-2">
                                                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                                                            const value = day.toLowerCase();
                                                            const checked = values.multi_days?.includes(value);
                                                            return (
                                                                <label key={day} className="flex items-center gap-2 cursor-pointer text-sm">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={(e) => {
                                                                            const days = new Set(values.multi_days || []);
                                                                            e.target.checked ? days.add(value) : days.delete(value);
                                                                            setFieldValue("multi_days", [...days]);
                                                                            clearBookingError("multi_days");
                                                                        }}
                                                                        className="w-4 h-4"
                                                                    />
                                                                    {day}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                    <FieldError message={bookingErrors.multi_days} />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-start mt-2">
                                                    <div className="flex flex-row gap-2">
                                                        <label className="text-sm font-semibold md:w-20 w-20">Start At</label>
                                                        <div className="w-full">
                                                            <input
                                                                type="date"
                                                                className={`border-[1.5px] shadow-lg rounded-[8px] px-3 py-2 text-sm w-full ${bookingErrors.multi_start_at ? 'border-red-500' : 'border-[#8D8D8D]'}`}
                                                                value={values.multi_start_at || ""}
                                                                onChange={(e) => { setFieldValue("multi_start_at", e.target.value); clearBookingError("multi_start_at"); }}
                                                            />
                                                            <FieldError message={bookingErrors.multi_start_at} />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-row gap-2">
                                                        <label className="text-sm font-semibold md:w-20 w-20">End At</label>
                                                        <div className="w-full">
                                                            <input
                                                                type="date"
                                                                className={`border-[1.5px] shadow-lg rounded-[8px] px-3 py-2 text-sm w-full ${bookingErrors.multi_end_at ? 'border-red-500' : 'border-[#8D8D8D]'}`}
                                                                value={values.multi_end_at || ""}
                                                                onChange={(e) => { setFieldValue("multi_end_at", e.target.value); clearBookingError("multi_end_at"); }}
                                                            />
                                                            <FieldError message={bookingErrors.multi_end_at} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="w-full bg-white">
                                            <div className="flex lg:flex-row md:flex-col flex-col gap-4">
                                                <div className="lg:col-span-3 space-y-4">

                                                    {/* ── Date / Time / Booking Type Row ── */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">

                                                        {/* Pickup Time */}
                                                        <div className="flex w-full items-start gap-2">
                                                            <label className="text-sm font-semibold md:text-center w-20 pt-2">Pick up Time</label>
                                                            <div className="w-full flex flex-col gap-1">
                                                                <div className="flex gap-2">
                                                                    <select
                                                                        className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                        value={values.pickup_time_type || ""}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setFieldValue("pickup_time_type", val);
                                                                            if (val === "asap") setFieldValue("pickup_time", "");
                                                                            else if (!values.pickup_time) setFieldValue("pickup_time", "00:00");
                                                                            clearBookingError("pickup_time");
                                                                        }}
                                                                    >
                                                                        <option value="asap">ASAP</option>
                                                                        <option value="time">Pick a time</option>
                                                                    </select>
                                                                    {values.pickup_time_type === "time" && (
                                                                        <input
                                                                            type="time"
                                                                            className={`border-[1.5px] shadow-lg rounded-[8px] px-3 py-2 text-sm w-full ${bookingErrors.pickup_time ? 'border-red-500' : 'border-[#8D8D8D]'}`}
                                                                            value={values.pickup_time || ""}
                                                                            onChange={(e) => { setFieldValue("pickup_time", e.target.value); clearBookingError("pickup_time"); }}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <FieldError message={bookingErrors.pickup_time} />
                                                            </div>
                                                        </div>

                                                        {/* Date */}
                                                        <div className="flex w-full items-start gap-2">
                                                            <label className="text-sm font-semibold mb-1 w-20 pt-2">Date</label>
                                                            <div className="w-full">
                                                                <input
                                                                    type="date"
                                                                    className={`border-[1.5px] shadow-lg rounded-[8px] px-3 py-2 text-sm w-full ${bookingErrors.booking_date ? 'border-red-500' : 'border-[#8D8D8D]'}`}
                                                                    value={values.booking_date || ""}
                                                                    onChange={(e) => { setFieldValue("booking_date", e.target.value); clearBookingError("booking_date"); }}
                                                                />
                                                                <FieldError message={bookingErrors.booking_date} />
                                                            </div>
                                                        </div>

                                                        {/* Booking Type */}
                                                        <div className="flex w-full items-start gap-2">
                                                            <label className="text-sm font-semibold mb-1 w-20 pt-2">Booking Type</label>
                                                            <div className="w-full">
                                                                <select
                                                                    className={`border-[1.5px] shadow-lg rounded-[8px] px-3 py-2 text-sm w-full ${bookingErrors.booking_type ? 'border-red-500' : 'border-[#8D8D8D]'}`}
                                                                    value={values.booking_type || ""}
                                                                    onChange={(e) => { setFieldValue("booking_type", e.target.value); clearBookingError("booking_type"); }}
                                                                >
                                                                    <option value="outstation">Select type</option>
                                                                    <option value="local">Local</option>
                                                                </select>
                                                                <FieldError message={bookingErrors.booking_type} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ── Pickup Point ── */}
                                                    <div className="relative flex gap-2 w-full flex-col md:flex-row">
                                                        <div className="w-full">
                                                            <InputBox
                                                                label="Pick up Point"
                                                                value={values.pickup_point}
                                                                plot={pickupPlotData?.name || ""}
                                                                suggestions={pickupSuggestions}
                                                                show={showPickup}
                                                                placeholder="Search location..."
                                                                hasError={!!(calculateErrors.pickup_point || bookingErrors.pickup_point)}
                                                                onChange={(v) => {
                                                                    setFieldValue("pickup_point", v);
                                                                    searchLocation(v, "pickup");
                                                                    clearFieldErrors("pickup_point");
                                                                }}
                                                                onSelect={(i) => selectLocation(i, "pickup", setFieldValue)}
                                                            />
                                                            <FieldError message={calculateErrors.pickup_point || bookingErrors.pickup_point} />
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => { setFieldValue("via_points", [...values.via_points, ""]); invalidateFare(); }}
                                                                className="px-2 py-2 w-24 border rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                            >
                                                                +Via
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* ── Via Points ── */}
                                                    {values.via_points.map((_, i) => (
                                                        <div key={i} className="relative flex gap-2 w-full flex-col md:flex-row">
                                                            <div className="w-full">
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
                                                                        searchLocation(v, "via", i);
                                                                        clearCalculateError(`via_points_${i}`);
                                                                        clearBookingError(`via_points_${i}`);
                                                                    }}
                                                                    onSelect={(i2) => selectLocation(i2, "via", setFieldValue, i)}
                                                                />
                                                                <FieldError message={calculateErrors[`via_points_${i}`] || bookingErrors[`via_points_${i}`]} />
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                <button type="button" onClick={() => swapLocations(i, setFieldValue, values)} className="px-2 py-2 w-20 border rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                                                                    ⇅ Swap
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newViaPoints = values.via_points.filter((_, idx) => idx !== i);
                                                                        setFieldValue("via_points", newViaPoints);
                                                                        const newViaPlots = { ...viaPlotData };
                                                                        delete newViaPlots[i];
                                                                        setViaPlotData(newViaPlots);
                                                                        invalidateFare();
                                                                    }}
                                                                    className="px-2 py-2 border rounded-lg bg-red-50 text-red-600 hover:bg-red-100 w-14"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* ── Destination ── */}
                                                    <div className="flex gap-4">
                                                        <div className="relative flex gap-2 w-full flex-col md:flex-row">
                                                            <div className="w-full">
                                                                <InputBox
                                                                    label="Desti-nation"
                                                                    value={values.destination}
                                                                    plot={destinationPlotData?.name || ""}
                                                                    suggestions={destinationSuggestions}
                                                                    show={showDestination}
                                                                    placeholder="Search location..."
                                                                    hasError={!!(calculateErrors.destination || bookingErrors.destination)}
                                                                    onChange={(v) => {
                                                                        setFieldValue("destination", v);
                                                                        searchLocation(v, "destination");
                                                                        clearFieldErrors("destination");
                                                                    }}
                                                                    onSelect={(i) => selectLocation(i, "destination", setFieldValue)}
                                                                />
                                                                <FieldError message={calculateErrors.destination || bookingErrors.destination} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ── Name / Email ── */}
                                                    <div className="flex md:flex-row flex-col">
                                                        <div className="w-full gap-3 grid">
                                                            <div className="flex md:flex-row flex-col gap-2">
                                                                {/* Name */}
                                                                <div className="text-left flex flex-col">
                                                                    <div className="flex">
                                                                        <label className="text-sm font-semibold mb-1 md:w-28 w-20">Name</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Enter Name"
                                                                            className={`border-[1.5px] shadow-lg rounded-[8px] px-3 py-2 w-full ${bookingErrors.name ? 'border-red-500' : 'border-[#8D8D8D]'}`}
                                                                            value={values.name || ""}
                                                                            onChange={(e) => { setFieldValue("name", e.target.value); clearBookingError("name"); }}
                                                                        />
                                                                    </div>
                                                                    <div className="ml-[5rem] md:ml-28">
                                                                        <FieldError message={bookingErrors.name} />
                                                                    </div>
                                                                </div>

                                                                {/* Email */}
                                                                <div className="text-left flex items-center md:gap-2">
                                                                    <label className="text-sm font-semibold mb-1 md:w-11 w-20">Email</label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Enter Email"
                                                                        className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                                        value={values.email || ""}
                                                                        onChange={(e) => setFieldValue("email", e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* ── Mobile / Tel ── */}
                                                            <div className="flex md:flex-row flex-col gap-2">
                                                                <div className="text-left flex flex-col relative">
                                                                    <div className="flex">
                                                                        <label className="text-sm font-semibold mb-1 md:w-28 w-20">Mobile No</label>
                                                                        <div className="w-full relative">
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Enter Mobile No"
                                                                                className={`border-[1.5px] shadow-lg rounded-[8px] px-3 py-2 w-full ${bookingErrors.phone_no ? 'border-red-500' : 'border-[#8D8D8D]'}`}
                                                                                value={values.phone_no || ""}
                                                                                onChange={(e) => {
                                                                                    const value = e.target.value;
                                                                                    setFieldValue("phone_no", value);
                                                                                    searchUsers(value);
                                                                                    clearBookingError("phone_no");
                                                                                }}
                                                                                onFocus={() => {
                                                                                    if (values.phone_no && userSuggestions.length > 0) setShowUserSuggestions(true);
                                                                                }}
                                                                            />
                                                                            {/* User suggestions dropdown */}
                                                                            {showUserSuggestions && (
                                                                                <div className="absolute mt-1 bg-white border border-gray-300 rounded-lg shadow-xl w-full lg:w-[400px] z-50 max-h-60 overflow-auto">
                                                                                    {!loadingUsers && userSuggestions.length === 0 && (
                                                                                        <div className="p-3 text-gray-400 text-center">No users found</div>
                                                                                    )}
                                                                                    {userSuggestions.map((user, idx) => (
                                                                                        <div
                                                                                            key={user.id || idx}
                                                                                            onClick={() => selectUser(user, setFieldValue)}
                                                                                            className="flex justify-between items-center p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                                                                        >
                                                                                            <div className="font-semibold text-gray-800">{user.phone_no}</div>
                                                                                            <div className="flex gap-4 text-[#1F41BB] text-sm">
                                                                                                <span className="cursor-pointer flex items-center gap-1">
                                                                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                                        <path d="M12.6654 12.6667H5.33203C4.96536 12.6667 4.65148 12.5361 4.39036 12.275C4.12925 12.0139 3.9987 11.7 3.9987 11.3334V2.00002C3.9987 1.63335 4.12925 1.31946 4.39036 1.05835C4.65148 0.797243 4.96536 0.666687 5.33203 0.666687H9.9987L13.9987 4.66669V11.3334C13.9987 11.7 13.8681 12.0139 13.607 12.275C13.3459 12.5361 13.032 12.6667 12.6654 12.6667ZM9.33203 5.33335V2.00002H5.33203V11.3334H12.6654V5.33335H9.33203ZM2.66536 15.3334C2.2987 15.3334 1.98481 15.2028 1.7237 14.9417C1.46259 14.6806 1.33203 14.3667 1.33203 14V4.66669H2.66536V14H9.9987V15.3334H2.66536Z" fill="#1F41BB" />
                                                                                                    </svg>
                                                                                                    Copy Details
                                                                                                </span>
                                                                                                <span onClick={(e) => { e.stopPropagation(); handleViewHistory(user); }} className="cursor-pointer text-[#6C6C6C] flex items-center gap-1">
                                                                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                                        <path d="M8 14C6.46667 14 5.13056 13.4917 3.99167 12.475C2.85278 11.4583 2.2 10.1889 2.03333 8.66667H3.4C3.55556 9.82222 4.06944 10.7778 4.94167 11.5333C5.81389 12.2889 6.83333 12.6667 8 12.6667C9.3 12.6667 10.4028 12.2139 11.3083 11.3083C12.2139 10.4028 12.6667 9.3 12.6667 8C12.6667 6.7 12.2139 5.59722 11.3083 4.69167C10.4028 3.78611 9.3 3.33333 8 3.33333C7.23333 3.33333 6.51667 3.51111 5.85 3.86667C5.18333 4.22222 4.62222 4.71111 4.16667 5.33333H6V6.66667H2V2.66667H3.33333V4.23333C3.9 3.52222 4.59167 2.97222 5.40833 2.58333C6.225 2.19444 7.08889 2 8 2C8.83333 2 9.61389 2.15833 10.3417 2.475C11.0694 2.79167 11.7028 3.21944 12.2417 3.75833C12.7806 4.29722 13.2083 4.93056 13.525 5.65833C13.8417 6.38611 14 7.16667 14 8C14 8.83333 13.8417 9.61389 13.525 10.3417C13.2083 11.0694 12.7806 11.7028 12.2417 12.2417C11.7028 12.7806 11.0694 13.2083 10.3417 13.525C9.61389 13.8417 8.83333 14 8 14ZM9.86667 10.8L7.33333 8.26667V4.66667H8.66667V7.73333L10.8 9.86667L9.86667 10.8Z" fill="#6C6C6C" />
                                                                                                    </svg>
                                                                                                    View History
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="ml-[5rem] md:ml-28">
                                                                        <FieldError message={bookingErrors.phone_no} />
                                                                    </div>
                                                                </div>

                                                                {/* Tel No */}
                                                                <div className="flex md:flex-row flex-col gap-2">
                                                                    <div className="flex w-full gap-2">
                                                                        <label className="text-sm font-semibold mb-1 max-sm:w-16">Tel No.</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Enter Telephone no"
                                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                                            value={values.tel_no || ""}
                                                                            onChange={(e) => setFieldValue("tel_no", e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* ── Journey / Accounts ── */}
                                                            <div className="w-full">
                                                                <div className="md:flex-row flex-col flex gap-2 w-full">
                                                                    <div className="text-left flex items-center gap-2">
                                                                        <label className="text-sm font-semibold md:w-16">Journey</label>
                                                                        <div className="flex items-center gap-2">
                                                                            {[{ val: "one_way", label: "One Way" }, { val: "return", label: "Return" }, { val: "wr", label: "W/R" }].map(({ val, label }) => (
                                                                                <label key={val} className="flex items-center gap-1">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name="journey"
                                                                                        checked={values.journey_type === val}
                                                                                        onChange={() => { setFieldValue("journey_type", val); invalidateFare(); clearFieldErrors("journey_type"); }}
                                                                                    />
                                                                                    {label}
                                                                                </label>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex-1">
                                                                        <div className="text-center flex items-center gap-2">
                                                                            <label className="text-sm md:text-right text-left font-semibold mb-1 md:w-24 w-14">Accounts</label>
                                                                            <select
                                                                                name="account"
                                                                                value={values.account || ""}
                                                                                onChange={(e) => setFieldValue("account", e.target.value)}
                                                                                className="border-[1.5px] border-[#8D8D8D] rounded-[8px] px-2 py-2 w-full"
                                                                                disabled={loadingSubCompanies}
                                                                            >
                                                                                <option value="">Select Account</option>
                                                                                {accountList?.map((item) => (
                                                                                    <option key={item.value} value={item.value}>{item.label}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* ── Vehicle / Driver ── */}
                                                            <div className="flex gap-2 w-full md:flex-row flex-col">
                                                                {/* Vehicle */}
                                                                <div className="flex md:flex-row items-start flex-row gap-2 w-full">
                                                                    <label className="text-sm font-semibold md:w-24 w-16 pt-2">Vehicle</label>
                                                                    <div className="w-full">
                                                                        <select
                                                                            name="vehicle"
                                                                            value={values.vehicle || ""}
                                                                            onChange={(e) => {
                                                                                setFieldValue("vehicle", e.target.value);
                                                                                invalidateFare();
                                                                                clearFieldErrors("vehicle");
                                                                            }}
                                                                            disabled={loadingSubCompanies}
                                                                            className={`border-[1.5px] shadow-lg rounded-[8px] px-3 py-2 w-full bg-gray-50 ${(calculateErrors.vehicle || bookingErrors.vehicle) ? 'border-red-500' : 'border-[#8D8D8D]'}`}
                                                                        >
                                                                            <option value="">Select Vehicle</option>
                                                                            {filteredVehicleList?.map((item) => (
                                                                                <option key={item.value} value={item.value}>
                                                                                    {item.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                        <FieldError message={calculateErrors.vehicle || bookingErrors.vehicle} />
                                                                    </div>
                                                                </div>

                                                                {/* Driver */}
                                                                <div className="flex md:flex-row items-start flex-row gap-2 w-full text-right">
                                                                    <label className="text-sm font-semibold text-left md:w-16 w-16 pt-2">Driver</label>
                                                                    <div className="w-full">
                                                                        <select
                                                                            name="driver"
                                                                            value={values.driver || ""}
                                                                            // onChange={(e) => {
                                                                            //     const selectedDriverId = e.target.value;
                                                                            //     setFieldValue("driver", selectedDriverId);
                                                                            //     clearBookingError("driver");

                                                                            //     if (selectedDriverId) {
                                                                            //         const selectedDriver = driverList.find(d => d.value === selectedDriverId);

                                                                            //         if (selectedDriver) {
                                                                            //             const assignedVehicleId = selectedDriver.assigned_vehicle;
                                                                            //             const vehicleTypeId = selectedDriver.vehicle_type;

                                                                            //             if (assignedVehicleId) {
                                                                            //                 const filteredVehicles = vehicleList.filter(
                                                                            //                     v => v.value === assignedVehicleId.toString()
                                                                            //                 );
                                                                            //                 setFilteredVehicleList(filteredVehicles);

                                                                            //                 if (filteredVehicles.length === 1) {
                                                                            //                     setFieldValue("vehicle", filteredVehicles[0].value);
                                                                            //                     invalidateFare();
                                                                            //                 }
                                                                            //             } else if (vehicleTypeId) {
                                                                            //                 const filteredVehicles = vehicleList.filter(
                                                                            //                     v => v.value === vehicleTypeId.toString()
                                                                            //                 );
                                                                            //                 setFilteredVehicleList(filteredVehicles);

                                                                            //                 if (filteredVehicles.length === 1) {
                                                                            //                     setFieldValue("vehicle", filteredVehicles[0].value);
                                                                            //                     invalidateFare();
                                                                            //                 }
                                                                            //             } else {
                                                                            //                 setFilteredVehicleList(vehicleList);
                                                                            //             }
                                                                            //         }
                                                                            //     } else {
                                                                            //         setFilteredVehicleList(vehicleList);
                                                                            //         setFieldValue("vehicle", "");
                                                                            //         invalidateFare();
                                                                            //     }
                                                                            // }} 
                                                                            onChange={(e) => {
                                                                                const selectedDriverId = e.target.value;
                                                                                setFieldValue("driver", selectedDriverId);
                                                                                clearBookingError("driver");

                                                                                if (!selectedDriverId) {
                                                                                    setFilteredVehicleList(vehicleList);
                                                                                    setFieldValue("vehicle", "");
                                                                                    invalidateFare();
                                                                                    return;
                                                                                }

                                                                                const selectedDriver = driverList.find(d => d.value === selectedDriverId);

                                                                                if (!selectedDriver) {
                                                                                    setFilteredVehicleList(vehicleList);
                                                                                    return;
                                                                                }

                                                                                const assignedVehicleId = selectedDriver.assigned_vehicle;
                                                                                const vehicleTypeId = selectedDriver.vehicle_type;

                                                                                if (assignedVehicleId) {
                                                                                    const filtered = vehicleList.filter(
                                                                                        v => v.value === assignedVehicleId.toString()
                                                                                    );
                                                                                    setFilteredVehicleList(filtered.length > 0 ? filtered : vehicleList);

                                                                                    if (filtered.length === 1) {
                                                                                        setFieldValue("vehicle", filtered[0].value);
                                                                                        invalidateFare();
                                                                                    } else {
                                                                                        setFieldValue("vehicle", "");
                                                                                    }
                                                                                } else {
                                                                                    setFilteredVehicleList(vehicleList);

                                                                                    if (vehicleTypeId) {
                                                                                        const matchedVehicle = vehicleList.find(
                                                                                            v => v.value === vehicleTypeId.toString()
                                                                                        );
                                                                                        if (matchedVehicle) {
                                                                                            setFieldValue("vehicle", matchedVehicle.value);
                                                                                            invalidateFare();
                                                                                        }
                                                                                    } else {
                                                                                        setFieldValue("vehicle", "");
                                                                                    }
                                                                                }
                                                                            }}
                                                                            disabled={loadingSubCompanies}
                                                                            className={`border-[1.5px] shadow-lg rounded-[8px] px-3 py-2 w-full bg-gray-50 ${bookingErrors.driver ? 'border-red-500' : 'border-[#8D8D8D]'}`}
                                                                            required={shouldDisableDispatchOptions(values)}
                                                                        >
                                                                            <option value="">Select Driver</option>
                                                                            {driverList?.map((item) => (
                                                                                <option key={item.value} value={item.value}>{item.label}</option>
                                                                            ))}
                                                                        </select>
                                                                        <FieldError message={bookingErrors.driver} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ── Auto Dispatch / Bidding ── */}
                                                        <div className="border mt-2 max-sm:w-full rounded-lg h-28 md:mt-0 px-4 py-4 bg-white shadow-sm">
                                                            <div className="flex flex-col gap-3">
                                                                <label className={`flex items-center gap-2 ${shouldDisableDispatchOptions(values) || isManualDispatchOnly || values.driver ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={values.auto_dispatch}
                                                                        disabled={shouldDisableDispatchOptions(values) || isManualDispatchOnly || values.driver}
                                                                        onChange={(e) => { setFieldValue("auto_dispatch", e.target.checked); if (e.target.checked) setFieldValue("booking_system", "auto_dispatch"); }}
                                                                    />
                                                                    Auto Dispatch
                                                                </label>
                                                                <label className={`flex items-center gap-2 ${shouldDisableDispatchOptions(values) || isManualDispatchOnly || values.driver ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={values.bidding}
                                                                        disabled={shouldDisableDispatchOptions(values) || isManualDispatchOnly || values.driver}
                                                                        onChange={(e) => { setFieldValue("bidding", e.target.checked); if (e.target.checked) setFieldValue("booking_system", "bidding"); }}
                                                                    />
                                                                    Bidding
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
                                                        {[
                                                            { label: "Passenger", name: "passenger" },
                                                            { label: "Luggage", name: "luggage" },
                                                            { label: "Hand Luggage", name: "hand_luggage" },
                                                        ].map(({ label, name }) => (
                                                            <div key={name} className="flex items-center gap-2">
                                                                <label className="text-sm font-semibold mb-1 md:w-28 w-20">{label}</label>
                                                                <input
                                                                    type="number"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                                    value={values[name] || 0}
                                                                    onChange={(e) => setFieldValue(name, Number(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-sm font-semibold mb-1 md:w-20 w-20">Special Req</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Write here..."
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                                value={values.special_request || ""}
                                                                onChange={(e) => setFieldValue("special_request", e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-sm font-semibold mb-1 md:w-20 w-20">Payment Ref</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Write here..."
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                                value={values.payment_reference || ""}
                                                                onChange={(e) => setFieldValue("payment_reference", e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-full">
                                        <div className="md:w-full xl:w-96 lg:w-72 w-full h-full rounded-xl border mt-4">
                                            <Maps
                                                mapsApi={mapsApi}
                                                pickupCoords={values.pickup_latitude && values.pickup_longitude ? { lat: parseFloat(values.pickup_latitude), lng: parseFloat(values.pickup_longitude) } : null}
                                                destinationCoords={values.destination_latitude && values.destination_longitude ? { lat: parseFloat(values.destination_latitude), lng: parseFloat(values.destination_longitude) } : null}
                                                viaCoords={(values.via_latitude || []).map((lat, index) => {
                                                    const lng = values.via_longitude?.[index];
                                                    return lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
                                                }).filter(Boolean)}
                                                setFieldValue={setFieldValue}
                                                fetchPlotName={fetchPlotName}
                                                setPickupPlotData={setPickupPlotData}
                                                setDestinationPlotData={setDestinationPlotData}
                                                SEARCH_API={SEARCH_API}
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <label className="text-sm font-semibold text-left md:w-16 w-16">Distance</label>
                                            <input
                                                type="text"
                                                placeholder="Distance will be shown here"
                                                readOnly
                                                value={values.distance ? `${values.distance} km` : ""}
                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full bg-gray-50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-lg space-y-4 mt-7">
                                    <div className="flex justify-between max-sm:flex-col items-center">
                                        <h3 className="font-semibold text-xl">Charges</h3>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button
                                                btnSize="md"
                                                type="filled"
                                                className="px-4 py-3 text-xs text-white rounded"
                                                onClick={() => handleCalculateFares(values, setFieldValue)}
                                                disabled={fareLoading}
                                            >
                                                {fareLoading ? "Calculating..." : "Calculate Fares"}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between max-sm:flex-col gap-2">
                                        <div className="flex gap-4 items-start flex-col">
                                            <div className="flex items-center gap-4">
                                                <label className="text-sm">Quoted</label>
                                                <div>
                                                    <select
                                                        value={values.payment_method}
                                                        onChange={(e) => { setFieldValue("payment_method", e.target.value); clearBookingError("payment_method"); }}
                                                        className={`border rounded px-2 py-1 w-48 ${bookingErrors.payment_method ? 'border-red-500' : ''}`}
                                                    >
                                                        <option value="">Select Method</option>
                                                        <option value="cash">Cash</option>
                                                        <option value="online">Online</option>
                                                    </select>
                                                    <FieldError message={bookingErrors.payment_method} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:w-60">
                                            <ChargeInput
                                                label="Booking Fees Charges"
                                                name="booking_fee_charges"
                                                value={values.booking_fee_charges}
                                                onChange={handleChargeChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-4 grid-cols-1 gap-4">
                                        {chargeFields.map((field) => (
                                            <ChargeInput
                                                key={field}
                                                label={field.replaceAll("_", " ").toUpperCase()}
                                                name={field}
                                                value={values[field]}
                                                onChange={handleChargeChange}
                                            />
                                        ))}
                                        <div className="font-bold text-[#10B981]">
                                            <ChargeInput label="TOTAL CHARGES" name="total_charges" value={values.total_charges} readOnly />
                                        </div>
                                    </div>

                                    {/* Fare error */}
                                    {bookingErrors.fare && (
                                        <FieldError message={bookingErrors.fare} />
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-end mt-3">
                                <Button
                                    btnSize="md"
                                    type="filledGray"
                                    className="!px-10 pt-4 pb-[10px] w-full sm:w-auto"
                                    onClick={() => { unlockBodyScroll(); setIsOpen({ type: "new", isOpen: false }); }}
                                >
                                    <span>Cancel</span>
                                </Button>
                                <Button
                                    btnType="submit"
                                    btnSize="md"
                                    type="filled"
                                    className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
                                    disabled={isBookingLoading || !fareCalculated}
                                    title={!fareCalculated ? "Please calculate fares first" : ""}
                                >
                                    <span>{isBookingLoading ? "Creating..." : "Create Booking"}</span>
                                </Button>
                            </div>
                            {!fareCalculated && (
                                <p className="text-xs text-red-600 font-medium text-center sm:text-right">
                                    Please calculate fares first
                                </p>
                            )}
                        </Form>
                    );
                }}
            </Formik>

            {showHistoryModal && (
                <History
                    user={selectedUser}
                    historyData={userHistory}
                    onClose={() => setShowHistoryModal(false)}
                />
            )}
        </>
    );
};

export default AddBooking;

const InputBox = ({ label, value, onChange, suggestions, show, onSelect, plot, placeholder, hasError }) => (
    <div className="relative flex md:flex-row max-sm:w-full gap-2">
        <label className="font-semibold text-sm md:w-20 w-20 text-left">{label}</label>
        <div className="flex max-sm:flex-col gap-2 w-full">
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`border-[1.5px] shadow-lg rounded-[8px] px-3 py-2 ${hasError ? 'border-red-500' : 'border-[#8D8D8D]'}`}
            />
            {show && (
                <ul className="absolute mt-12 bg-white border md:w-52 w-58 z-50 max-h-60 overflow-auto shadow-lg rounded">
                    {suggestions.map((i, idx) => (
                        <li key={idx} onClick={() => onSelect(i)} className="p-2 hover:bg-gray-100 cursor-pointer text-sm">
                            {i.label}
                        </li>
                    ))}
                </ul>
            )}
            <input
                readOnly
                placeholder="Plot Name"
                value={plot || ""}
                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
            />
        </div>
    </div>
);

const ChargeInput = ({ label, name, value, onChange, readOnly = false }) => (
    <div className="flex items-center gap-2">
        <label className="text-sm font-medium w-40">{label}</label>
        <input
            type="number"
            step="0.01"
            value={value || 0}
            readOnly={readOnly}
            onChange={(e) => onChange && onChange(name, e.target.value)}
            className="rounded-[8px] px-5 py-2 w-full"
        />
    </div>
);