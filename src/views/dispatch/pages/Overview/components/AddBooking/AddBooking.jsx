import { ErrorMessage, Form, Formik } from "formik";
import { useEffect, useState } from "react";
import Maps from "./components/maps";
import { apiGetSubCompany } from "../../../../../../services/SubCompanyServices";
import { apiGetAccount } from "../../../../../../services/AccountServices";
import { apiGetDriverManagement } from "../../../../../../services/DriverManagementService";
import { apiGetAllVehicleType } from "../../../../../../services/VehicleTypeServices";
import { getTenantData } from "../../../../../../utils/functions/tokenEncryption";
import Button from "../../../../../../components/ui/Button/Button";
import { getDispatcherId } from "../../../../../../utils/auth";
import { apiCreateBooking, apiCreateCalculateFares } from "../../../../../../services/AddBookingServices";
import { unlockBodyScroll } from "../../../../../../utils/functions/common.function";

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

const AddBooking = ({ initialValue = {}, setIsOpen, onSubCompanyCreated }) => {
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

    const [pickupPlot, setPickupPlot] = useState("");
    const [destinationPlot, setDestinationPlot] = useState("");
    const [viaPlots, setViaPlots] = useState({});

    const [fareData, setFareData] = useState(null);
    const [fareLoading, setFareLoading] = useState(false);
    const [fareError, setFareError] = useState(null);
    const [fareCalculated, setFareCalculated] = useState(false);
    const [isBookingLoading, setIsBookingLoading] = useState(false);
    const [isMultiBooking, setIsMultiBooking] = useState(false);

    const tenant = getTenantData();
    const SEARCH_API = tenant?.search_api || "barikoi";
    const COUNTRY_CODE = tenant?.country_of_use?.toLowerCase() || "india";

    useEffect(() => {
        const tenant = getTenantData();
        if (tenant?.maps_api) {
            const mapType = tenant.maps_api.toLowerCase();
            setMapsApi(mapType === "google" ? "google" : mapType === "barikoi" ? "barikoi" : "google");
        }
    }, []);

    useEffect(() => {
        const fetchSubCompanies = async () => {
            setLoadingSubCompanies(true);
            try {
                const response = await apiGetSubCompany();
                if (response?.data?.success === 1) {
                    const companies = response?.data?.list?.data || [];
                    const options = companies.map(company => ({
                        label: company.name,
                        value: company.id.toString(),
                    }));
                    setSubCompanyList(options);
                }
            } catch (error) {
                console.error("Error fetching sub-companies:", error);
            } finally {
                setLoadingSubCompanies(false);
            }
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
                    const options = accounts.map(account => ({
                        label: account.name,
                        value: account.id.toString(),
                    }));
                    setAccountList(options);
                }
            } catch (error) {
                console.error("Error fetching account:", error);
            } finally {
                setLoadingSubCompanies(false);
            }
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
                    const options = drivers.map(driver => ({
                        label: driver.name,
                        value: driver.id.toString(),
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
                    const options = vehicletype.map(vehicle => ({
                        label: vehicle.vehicle_type_name,
                        value: vehicle.id.toString(),
                    }));
                    setVehicleList(options);
                }
            } catch (error) {
                console.error("Error fetching driver:", error);
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
    }, []);

    const searchLocation = async (query, type, index = null) => {
        if (!query) return;

        let list = [];

        if ((SEARCH_API === "google" || SEARCH_API === "both") && googleService) {
            googleService.getPlacePredictions(
                { input: query, componentRestrictions: { country: COUNTRY_CODE } },
                (predictions, status) => {
                    if (status === "OK") {
                        list = predictions.map((p) => ({
                            label: p.description,
                            place_id: p.place_id,
                            source: "google",
                        }));
                        updateSuggestions(list, type, index);
                    }
                }
            );
        }

        if (SEARCH_API === "barikoi" || SEARCH_API === "both") {
            const res = await fetch(
                `https://barikoi.xyz/v1/api/search/autocomplete/${BARIKOI_KEY}/place?q=${encodeURIComponent(
                    query
                )}`
            );
            const json = await res.json();

            const barikoiList = (json.places || []).map((p) => ({
                label: p.address || p.place_name,
                lat: p.latitude,
                lng: p.longitude,
                source: "barikoi",
            }));

            list = SEARCH_API === "both" ? [...list, ...barikoiList] : barikoiList;
            updateSuggestions(list, type, index);
        }
    };

    const updateSuggestions = (list, type, index) => {
        if (type === "pickup") {
            setPickupSuggestions(list);
            setShowPickup(true);
        } else if (type === "destination") {
            setDestinationSuggestions(list);
            setShowDestination(true);
        } else {
            setViaSuggestions((v) => ({ ...v, [index]: list }));
            setShowVia((v) => ({ ...v, [index]: true }));
        }
    };

    const getLatLngFromPlaceId = (placeId) =>
        new Promise((resolve) => {
            const service = new window.google.maps.places.PlacesService(
                document.createElement("div")
            );

            service.getDetails(
                { placeId, fields: ["geometry"] },
                (place, status) => {
                    if (
                        status === window.google.maps.places.PlacesServiceStatus.OK &&
                        place?.geometry?.location
                    ) {
                        resolve({
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng(),
                        });
                    } else resolve(null);
                }
            );
        });

    const fetchPlotName = async (lat, lng) => {
        try {
            const formData = new FormData();
            formData.append("latitude", lat);
            formData.append("longitude", lng);

            const res = await apiGetAllPlot(formData);

            if (res?.data?.success === 1) {
                if (res.data.found === 1 && res.data.record) {
                    return res.data.record;
                }
            }
            return "No Plot Found";
        } catch {
            return "No Plot Found";
        }
    };

    const selectLocation = async (item, type, setFieldValue, index = null) => {
        if (type === "pickup") {
            setFieldValue("pickup_point", item.label);
            setShowPickup(false);
        } else if (type === "destination") {
            setFieldValue("destination", item.label);
            setShowDestination(false);
        } else {
            setFieldValue(`via_points[${index}]`, item.label);
            setShowVia((v) => ({ ...v, [index]: false }));
        }

        let latLng = null;

        if (item.source === "google") {
            latLng = await getLatLngFromPlaceId(item.place_id);
        } else if (item.source === "barikoi") {
            latLng = { lat: item.lat, lng: item.lng };
        }

        let plot = "No Plot Found";
        if (latLng) {
            plot = await fetchPlotName(latLng.lat, latLng.lng);

            // Store coordinates
            if (type === "pickup") {
                setFieldValue("pickup_latitude", latLng.lat);
                setFieldValue("pickup_longitude", latLng.lng);
            } else if (type === "destination") {
                setFieldValue("destination_latitude", latLng.lat);
                setFieldValue("destination_longitude", latLng.lng);
            } else {
                setFieldValue(`via_latitude[${index}]`, latLng.lat);
                setFieldValue(`via_longitude[${index}]`, latLng.lng);
            }
        }

        if (type === "pickup") setPickupPlot(plot);
        else if (type === "destination") setDestinationPlot(plot);
        else setViaPlots((p) => ({ ...p, [index]: plot }));

        // Invalidate fare when location changes
        invalidateFare();
    };

    const getCoordinatesFromAddress = async (address) => {
        if (!address) return null;

        try {
            if ((SEARCH_API === "google" || SEARCH_API === "both") && window.google?.maps) {
                const geocoder = new window.google.maps.Geocoder();

                return new Promise((resolve) => {
                    geocoder.geocode({ address }, (results, status) => {
                        if (status === "OK" && results[0]) {
                            resolve({
                                latitude: results[0].geometry.location.lat(),
                                longitude: results[0].geometry.location.lng()
                            });
                        } else {
                            resolve(null);
                        }
                    });
                });
            }
            if (SEARCH_API === "barikoi" || SEARCH_API === "both") {
                const res = await fetch(
                    `https://barikoi.xyz/v1/api/search/autocomplete/${BARIKOI_KEY}/place?q=${encodeURIComponent(address)}`
                );
                const json = await res.json();

                if (json.places && json.places.length > 0) {
                    return {
                        latitude: json.places[0].latitude,
                        longitude: json.places[0].longitude
                    };
                }
            }

            return null;
        } catch (error) {
            console.error("Error getting coordinates:", error);
            return null;
        }
    };

    const handleCalculateFares = async (values) => {
        setFareLoading(true);
        setFareError(null);

        try {
            if (!values.pickup_point) {
                setFareError("Please select a pickup point");
                setFareLoading(false);
                return;
            }

            if (!values.destination) {
                setFareError("Please select a destination");
                setFareLoading(false);
                return;
            }

            if (!values.vehicle) {
                setFareError("Please select a vehicle type");
                setFareLoading(false);
                return;
            }

            if (!values.journey_type) {
                setFareError("Please select a journey type");
                setFareLoading(false);
                return;
            }

            const pickupCoords = await getCoordinatesFromAddress(values.pickup_point);
            if (!pickupCoords) {
                setFareError("Could not get coordinates for pickup point");
                setFareLoading(false);
                return;
            }

            const destinationCoords = await getCoordinatesFromAddress(values.destination);
            if (!destinationCoords) {
                setFareError("Could not get coordinates for destination");
                setFareLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('pickup_point[latitude]', pickupCoords.latitude.toString());
            formData.append('pickup_point[longitude]', pickupCoords.longitude.toString());
            formData.append('destination_point[latitude]', destinationCoords.latitude.toString());
            formData.append('destination_point[longitude]', destinationCoords.longitude.toString());

            if (values.via_points && values.via_points.length > 0) {
                for (let i = 0; i < values.via_points.length; i++) {
                    const viaPoint = values.via_points[i];
                    if (viaPoint) {
                        const viaCoords = await getCoordinatesFromAddress(viaPoint);
                        if (viaCoords) {
                            formData.append(`via_point[${i}][latitude]`, viaCoords.latitude.toString());
                            formData.append(`via_point[${i}][longitude]`, viaCoords.longitude.toString());
                        }
                    }
                }
            }

            formData.append('vehicle_id', values.vehicle);
            formData.append('journey', values.journey_type);

            const response = await apiCreateCalculateFares(formData);

            if (response?.data?.success === 1) {
                setFareData(response.data);
                setFareCalculated(true);
                console.log("Fare calculation successful:", response.data);
            } else {
                setFareError(response?.data?.message || "Failed to calculate fares");
            }
        } catch (error) {
            console.error("Error calculating fares:", error);
            setFareError(error?.response?.data?.message || "An error occurred while calculating fares");
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
        const viaPlotValue = viaPlots[index];

        const destination = values.destination;
        const destLat = values.destination_latitude;
        const destLng = values.destination_longitude;
        const destPlotValue = destinationPlot;

        setFieldValue(`via_points[${index}]`, destination);
        setFieldValue(`via_latitude[${index}]`, destLat);
        setFieldValue(`via_longitude[${index}]`, destLng);
        setViaPlots((p) => ({ ...p, [index]: destPlotValue }));

        setFieldValue('destination', viaPoint);
        setFieldValue('destination_latitude', viaLat);
        setFieldValue('destination_longitude', viaLng);
        setDestinationPlot(viaPlotValue);

        invalidateFare();
    };

    const handleCreateBooking = async (values) => {
        if (!fareCalculated) {
            setFareError("Please calculate fares before creating booking");
            return;
        }

        setIsBookingLoading(true);

        try {
            const dispatcherId = getDispatcherId();
            const formData = new FormData();

            formData.append('sub_company', values.sub_company || '');
            formData.append('multi_booking', isMultiBooking ? 'yes' : 'no');
            formData.append("dispatcher_id", dispatcherId);

            if (isMultiBooking) {
                formData.append('multi_days', values.multi_days || '');
                formData.append('start_at', values.multi_start_at || '');
                formData.append('end_at', values.multi_end_at || '');
                formData.append('week', values.week_pattern || '');
            }

            if (values.pickup_time_type === "asap") {
                const now = new Date();
                const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
                formData.append('pickup_time', timeString);
            } else {
                const timeValue = values.pickup_time || '';
                formData.append('pickup_time', timeValue ? `${timeValue}:00` : '');
            }

            formData.append('booking_date', values.booking_date || '');
            formData.append('booking_type', values.booking_type || '');

            const pickupCoords = await getCoordinatesFromAddress(values.pickup_point);
            const destinationCoords = await getCoordinatesFromAddress(values.destination);

            if (pickupCoords) {
                formData.append('pickup_point', `${pickupCoords.latitude}, ${pickupCoords.longitude}`);
                formData.append('pickup_location', values.pickup_point);
            }

            if (destinationCoords) {
                formData.append('destination_point', `${destinationCoords.latitude}, ${destinationCoords.longitude}`);
                formData.append('destination_location', values.destination);
            }

            if (values.via_points && values.via_points.length > 0) {
                for (let i = 0; i < values.via_points.length; i++) {
                    const viaPoint = values.via_points[i];
                    if (viaPoint) {
                        const viaCoords = await getCoordinatesFromAddress(viaPoint);
                        if (viaCoords) {
                            formData.append(`via_point[${i}][latitude]`, viaCoords.latitude.toString());
                            formData.append(`via_point[${i}][longitude]`, viaCoords.longitude.toString());
                            formData.append(`via_location[${i}]`, viaPoint);
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
            formData.append('vehicle', values.vehicle || '');
            formData.append('driver', values.driver || '');
            formData.append('passenger', values.passenger || '0');
            formData.append('luggage', values.luggage || '0');
            formData.append('hand_luggage', values.hand_luggage || '0');
            formData.append('special_request', values.special_request || '');
            formData.append('payment_reference', values.payment_reference || '');

            if (!values.driver) {
                formData.append('booking_system', values.booking_system || 'auto_dispatch');
            }

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
                console.log("Booking created successfully:", response.data);

                if (onSubCompanyCreated) {
                    onSubCompanyCreated(response.data);
                }

                unlockBodyScroll();
                setIsOpen({ type: "new", isOpen: false });
            } else {
                alert(response?.data?.message || "Failed to create booking");
            }
        } catch (error) {
            console.error("Error creating booking:", error);
            alert(error?.response?.data?.message || "An error occurred while creating booking");
        } finally {
            setIsBookingLoading(false);
        }
    };

    const chargeFields = [
        "fares",
        "return_fares",
        "waiting_time",
        "parking_charges",
        "ac_fares",
        "return_ac_fares",
        "ac_parking_charges",
        "waiting_charges",
        "extra_charges",
        "congestion_toll",
        "ac_waiting_charges",
    ];

    return (
        <>
            <Formik
                initialValues={{
                    pickup_point: "",
                    destination: "",
                    via_points: [],
                    via_latitude: [],
                    via_longitude: [],
                    account: "",
                    vehicle: "",
                    driver: "",
                    journey_type: "one_way",
                    booking_system: "auto_dispatch",
                    auto_dispatch: true,
                    bidding: true,
                    pickup_time_type: "asap",
                    pickup_time: "",
                    booking_date: "",
                    booking_type: "outstation",
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
                }}
                onSubmit={handleCreateBooking}
            >
                {({ values, setFieldValue }) => {
                    useEffect(() => {
                        if (fareData?.calculate_fare) {
                            setFieldValue('base_fare', fareData.calculate_fare);

                            const additionalCharges = chargeFields.reduce(
                                (sum, key) => sum + Number(values[key] || 0),
                                0
                            );

                            setFieldValue("total_charges", fareData.calculate_fare + additionalCharges);
                        }
                    }, [fareData]);

                    const handleChargeChange = (name, value) => {
                        setFieldValue(name, Number(value) || 0);

                        setTimeout(() => {
                            const additionalCharges = chargeFields.reduce(
                                (sum, key) => sum + Number(values[key] || 0),
                                0
                            );

                            const baseFare = Number(values.base_fare || 0);
                            setFieldValue("total_charges", baseFare + additionalCharges);
                        }, 0);
                    };

                    return (
                        <Form>
                            <div className="w-full flex flex-col gap-4">
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
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center rounded-[8px] px-3 py-2 border-[1.5px] shadow-lg border-[#8D8D8D]">
                                            <span className="text-sm mr-2">Single Booking</span>

                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={isMultiBooking}
                                                    onChange={(e) => setIsMultiBooking(e.target.checked)}
                                                />
                                                <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-green-400 transition-all"></div>
                                                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-all"></div>
                                            </label>

                                            <span className="text-sm ml-2">Multi Booking</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex xl:flex-row lg:flex-row md:flex-col flex-col gap-4">
                                    <div className="">
                                        {isMultiBooking && (
                                            <div className="w-full mb-3">

                                                <div className="flex flex-col gap-2">
                                                    <span className="font-semibold text-sm">
                                                        Select day of the week
                                                    </span>

                                                    <div className="flex flex-wrap gap-3 pb-3">
                                                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                                                            const value = day.toLowerCase();
                                                            const checked = values.multi_days?.includes(value);

                                                            return (
                                                                <label
                                                                    key={day}
                                                                    className="flex items-center gap-2 cursor-pointer text-sm"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={(e) => {
                                                                            const days = new Set(values.multi_days || []);
                                                                            e.target.checked
                                                                                ? days.add(value)
                                                                                : days.delete(value);

                                                                            setFieldValue("multi_days", [...days]);
                                                                        }}
                                                                        className="w-4 h-4"
                                                                    />
                                                                    {day}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                                    <div className="flex flex-row gap-2 inline-flex">
                                                        <label className="text-sm font-semibold md:w-20 w-20">Week</label>
                                                        <select
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                            value={values.week_pattern || ""}
                                                            onChange={(e) =>
                                                                setFieldValue("week_pattern", e.target.value)
                                                            }
                                                        >
                                                            <option value="">Every Week</option>
                                                            <option value="every">Every Week</option>
                                                            <option value="alternate">Alternate Weeks</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex flex-row gap-2 inline-flex">
                                                        <label className="text-sm font-semibold md:w-9 w-20">Start At</label>
                                                        <input
                                                            type="date"
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                            value={values.multi_start_at || ""}
                                                            onChange={(e) =>
                                                                setFieldValue("multi_start_at", e.target.value)
                                                            }
                                                        />
                                                    </div>

                                                    <div className="flex flex-row gap-2 inline-flex">
                                                        <label className="text-sm font-semibold md:w-20 w-20">End At</label>
                                                        <input
                                                            type="date"
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                            value={values.multi_end_at || ""}
                                                            onChange={(e) =>
                                                                setFieldValue("multi_end_at", e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="w-full bg-white">
                                            <div className="flex lg:flex-row md:flex-col flex-col gap-4">
                                                <div className="lg:col-span-3 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                                                        <div className="flex w-full items-center gap-2 md:text-center">
                                                            <label className="text-sm font-semibold md:text-center w-20">Pick up Time</label>
                                                            <div className="w-full flex gap-2">
                                                                <select
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                    value={values.pickup_time_type || ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setFieldValue("pickup_time_type", val);
                                                                        if (val === "asap") {
                                                                            setFieldValue("pickup_time", "");
                                                                        } else if (!values.pickup_time) {
                                                                            setFieldValue("pickup_time", "00:00");
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="asap">ASAP</option>
                                                                    <option value="time">Pick a time</option>
                                                                </select>
                                                                {values.pickup_time_type === "time" && (
                                                                    <input
                                                                        type="time"
                                                                        className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                        value={values.pickup_time || ""}
                                                                        onChange={(e) => setFieldValue("pickup_time", e.target.value)}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex w-full items-center gap-2">
                                                            <label className="text-sm font-semibold mb-1 w-20 md:w-auto">Date</label>
                                                            <input
                                                                type="date"
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                value={values.booking_date || ""}
                                                                onChange={(e) => setFieldValue("booking_date", e.target.value)}
                                                            />
                                                        </div>

                                                        <div className="flex w-full items-center gap-2 md:text-center">
                                                            <label className="text-sm font-semibold mb-1 w-20">Booking Type</label>
                                                            <select
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                value={values.booking_type || ""}
                                                                onChange={(e) => setFieldValue("booking_type", e.target.value)}
                                                            >

                                                                <option value="outstation">Outstation</option>
                                                                <option value="local">Local</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="relative flex gap-2 w-full flex-col md:flex-row">
                                                        {/* <label className="font-semibold">Pick up Point</label> */}
                                                        <InputBox
                                                            label="Pick up Point"
                                                            value={values.pickup_point}
                                                            plot={pickupPlot}
                                                            suggestions={pickupSuggestions}
                                                            show={showPickup}
                                                            placeholder="Search location..."
                                                            onChange={(v) => {
                                                                setFieldValue("pickup_point", v);
                                                                searchLocation(v, "pickup");
                                                            }}
                                                            onSelect={(i) => selectLocation(i, "pickup", setFieldValue)}

                                                        />
                                                        {/* {showPickup && (
                                                            <ul className="absolute bg-white border w-20 z-50 max-h-48 overflow-auto">
                                                                {pickupSuggestions.map((i, idx) => (
                                                                    <li
                                                                        key={idx}
                                                                        onClick={() => selectLocation(i, "pickup", setFieldValue)}
                                                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                                    >
                                                                        {i.label}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )} */}
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setFieldValue("via_points", [...values.via_points, ""]);
                                                                    invalidateFare();
                                                                }}
                                                                className="px-2 py-2 w-24 border rounded-lg bg-blue-50 text-blue-600  hover:bg-blue-100"
                                                            >
                                                                +Via
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {values.via_points.map((_, i) => (
                                                        <div key={i} className="relative flex gap-2 w-full flex-col md:flex-row">
                                                            <InputBox
                                                                label={`Via ${i + 1}`}
                                                                value={values.via_points[i]}
                                                                plot={viaPlots[i]}
                                                                suggestions={viaSuggestions[i] || []}
                                                                placeholder="Search location..."
                                                                show={showVia[i]}
                                                                onChange={(v) => {
                                                                    setFieldValue(`via_points[${i}]`, v);
                                                                    searchLocation(v, "via", i);
                                                                }}
                                                                onSelect={(i2) =>
                                                                    selectLocation(i2, "via", setFieldValue, i)
                                                                }
                                                            />
                                                            {/* {showVia[i] && (
                                                                    <ul className="absolute bg-white border w-full z-50 overflow-auto">
                                                                        {(viaSuggestions[i] || []).map((item, idx) => (
                                                                            <li
                                                                                key={idx}
                                                                                onClick={() => selectLocation(item, "via", setFieldValue, i)}
                                                                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                                            >
                                                                                {item.label}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )} */}
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    title="Swap with destination"
                                                                    type="button"
                                                                    onClick={() => swapLocations(i, setFieldValue, values)} className="px-2 py-2 w-20 border rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                                >
                                                                    ⇅ Swap
                                                                </button>
                                                                {/* Remove Button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newViaPoints = values.via_points.filter((_, idx) => idx !== i);
                                                                        setFieldValue("via_points", newViaPoints);
                                                                        // Clean up via plots
                                                                        const newViaPlots = { ...viaPlots };
                                                                        delete newViaPlots[i];
                                                                        setViaPlots(newViaPlots);
                                                                        invalidateFare();
                                                                    }}
                                                                    title="Remove via point"
                                                                    className="px-2 py-2 border rounded-lg bg-red-50 text-red-600 hover:bg-red-100 w-14"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <div className="flex gap-4 ">
                                                        <div className="relative flex gap-2 w-full flex-col md:flex-row">
                                                            <InputBox
                                                                label="Desti-nation"
                                                                value={values.destination}
                                                                plot={destinationPlot}
                                                                suggestions={destinationSuggestions}
                                                                show={showDestination}
                                                                placeholder="Search location..."
                                                                onChange={(v) => {
                                                                    setFieldValue("destination", v);
                                                                    searchLocation(v, "destination");
                                                                }}
                                                                onSelect={(i) => selectLocation(i, "destination", setFieldValue)}
                                                            />
                                                            {/* {showDestination && (
                                                                <ul className="absolute bg-white border w-full z-50 max-h-48 overflow-auto">
                                                                    {destinationSuggestions.map((i, idx) => (
                                                                        <li
                                                                            key={idx}
                                                                            onClick={() =>
                                                                                selectLocation(i, "destination", setFieldValue)
                                                                            }
                                                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                                        >
                                                                            {i.label}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )} */}
                                                        </div>
                                                    </div>

                                                    <div className="flex md:flex-row flex-col">
                                                        <div className="w-full gap-3 grid">
                                                            {/* name, email */}
                                                            <div className="flex md:flex-row flex-col gap-2">
                                                                <div className="text-left flex">
                                                                    <label className="text-sm font-semibold mb-1 md:w-28 w-20">Name</label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Enter Name"
                                                                        className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                                        value={values.name || ""}
                                                                        onChange={(e) => setFieldValue("name", e.target.value)}
                                                                    />
                                                                </div>

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

                                                            {/* Mobile / Tel */}
                                                            <div className="flex md:flex-row flex-col gap-2">
                                                                <div className="text-left flex">
                                                                    <label className="text-sm font-semibold mb-1 md:w-28 w-20">Mobile No</label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Enter Mobile No"
                                                                        className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full md:w-full"
                                                                        value={values.phone_no || ""}
                                                                        onChange={(e) => setFieldValue("phone_no", e.target.value)}
                                                                    />
                                                                </div>

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

                                                            {/* Journey, account */}
                                                            <div className="w-full">
                                                                <div className="md:flex-row flex-col flex gap-2 w-full">
                                                                    <div className="text-left flex items-center gap-2">
                                                                        <label className="text-sm font-semibold md:w-16">Journey</label>
                                                                        <div className="flex items-center gap-2">
                                                                            <label className="flex items-center gap-1">
                                                                                <input
                                                                                    type="radio"
                                                                                    name="journey"
                                                                                    className="w-"
                                                                                    checked={values.journey_type === "one_way"}
                                                                                    onChange={() => {
                                                                                        setFieldValue("journey_type", "one_way");
                                                                                        invalidateFare();
                                                                                    }}
                                                                                />
                                                                                One Way
                                                                            </label>

                                                                            <label className="flex items-center gap-1">
                                                                                <input
                                                                                    type="radio"
                                                                                    name="journey"
                                                                                    checked={values.journey_type === "return"}
                                                                                    onChange={() => {
                                                                                        setFieldValue("journey_type", "return");
                                                                                        invalidateFare();
                                                                                    }}
                                                                                />
                                                                                Return
                                                                            </label>

                                                                            <label className="flex items-center gap-1">
                                                                                <input
                                                                                    type="radio"
                                                                                    name="journey"
                                                                                    checked={values.journey_type === "wr"}
                                                                                    onChange={() => {
                                                                                        setFieldValue("journey_type", "wr");
                                                                                        invalidateFare();
                                                                                    }}
                                                                                />
                                                                                W/R
                                                                            </label>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex-1">
                                                                        <div className="text-center flex items-center gap-2">
                                                                            <label className="text-sm md:text-right text-left font-semibold mb-1 md:w-24 w-14">Accounts</label>
                                                                            <div className="w-full">
                                                                                <select
                                                                                    name="account"
                                                                                    value={values.account || ""}
                                                                                    onChange={(e) => setFieldValue("account", e.target.value)}
                                                                                    className="border-[1.5px] border-[#8D8D8D] rounded-[8px] px-2 py-2 w-full"
                                                                                    disabled={loadingSubCompanies}
                                                                                >
                                                                                    <option value="">Select Account</option>
                                                                                    {accountList?.map((item) => (
                                                                                        <option key={item.value} value={item.value}>
                                                                                            {item.label}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <ErrorMessage
                                                                                name="account"
                                                                                component="div"
                                                                                className="text-red-500 text-sm mt-1"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* vehicle, driver */}
                                                            <div className="flex gap-2 w-full md:flex-row flex-col">
                                                                <div className="flex md:flex-row items-center flex-row gap-2 w-full">
                                                                    <label className="text-sm font-semibold md:w-24 w-16">Vehicle</label>
                                                                    <select
                                                                        name="vehicle"
                                                                        value={values.vehicle || ""}
                                                                        onChange={(e) => {
                                                                            setFieldValue("vehicle", e.target.value);
                                                                            invalidateFare();
                                                                        }}
                                                                        disabled={loadingSubCompanies}
                                                                        className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full bg-gray-50"
                                                                    >
                                                                        <option value="">Select Vehicle</option>
                                                                        {vehicleList?.map((item) => (
                                                                            <option key={item.value} value={item.value}>
                                                                                {item.label}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <ErrorMessage name="vehicle" component="div" className="text-red-500 text-sm mt-1" />
                                                                </div>

                                                                <div className="flex md:flex-row items-center flex-row gap-2 w-full text-right">
                                                                    <label className="text-sm font-semibold text-left md:w-16 w-16">Driver</label>
                                                                    <div className="w-full">
                                                                        <select
                                                                            name="driver"
                                                                            value={values.driver || ""}
                                                                            onChange={(e) => setFieldValue("driver", e.target.value)}
                                                                            disabled={loadingSubCompanies}
                                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full bg-gray-50"
                                                                        >
                                                                            <option value="">Select Driver</option>
                                                                            {driverList?.map((item) => (
                                                                                <option key={item.value} value={item.value}>
                                                                                    {item.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                        <ErrorMessage name="driver" component="div" className="text-red-500 text-sm mt-1" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Auto Dispatch + Bidding - Only show if driver is not selected */}
                                                        {!values.driver && (
                                                            <div className="border mt-2 max-sm:w-full rounded-lg h-28 md:mt-0 px-4 py-4 bg-white shadow-sm">
                                                                <div className="flex flex-col gap-3">
                                                                    <label className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={values.auto_dispatch}
                                                                            onChange={(e) => {
                                                                                setFieldValue("auto_dispatch", e.target.checked);
                                                                                if (e.target.checked) {
                                                                                    setFieldValue("booking_system", "auto_dispatch");
                                                                                }
                                                                            }}
                                                                        />
                                                                        Auto Dispatch
                                                                    </label>

                                                                    <label className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={values.bidding}
                                                                            onChange={(e) => {
                                                                                setFieldValue("bidding", e.target.checked);
                                                                                if (e.target.checked) {
                                                                                    setFieldValue("booking_system", "bidding");
                                                                                }
                                                                            }}
                                                                        />
                                                                        Bidding
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-sm font-semibold mb-1 md:w-28 w-20">Passenger</label>
                                                            <input
                                                                type="number"
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                                value={values.passenger || 0}
                                                                onChange={(e) => setFieldValue("passenger", Number(e.target.value) || 0)}
                                                            />
                                                        </div>

                                                        <div className="text-center flex items-center gap-2">
                                                            <label className="text-sm font-semibold mb-1 md:w-28 w-20">Luggage</label>
                                                            <input
                                                                type="number"
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                                value={values.luggage || 0}
                                                                onChange={(e) => setFieldValue("luggage", Number(e.target.value) || 0)}
                                                            />
                                                        </div>

                                                        <div className="md:text-center flex md:items-center gap-2">
                                                            <label className="text-sm font-semibold mb-1 md:w-28 w-20">
                                                                Hand Luggage
                                                            </label>
                                                            <input
                                                                type="number"
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                                value={values.hand_luggage || 0}
                                                                onChange={(e) => setFieldValue("hand_luggage", Number(e.target.value) || 0)}
                                                            />
                                                        </div>
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
                                                pickupCoords={values.pickup_latitude && values.pickup_longitude ? {
                                                    lat: parseFloat(values.pickup_latitude),
                                                    lng: parseFloat(values.pickup_longitude)
                                                } : null}
                                                destinationCoords={values.destination_latitude && values.destination_longitude ? {
                                                    lat: parseFloat(values.destination_latitude),
                                                    lng: parseFloat(values.destination_longitude)
                                                } : null}
                                                viaCoords={(values.via_latitude || []).map((lat, index) => {
                                                    const lng = values.via_longitude?.[index];
                                                    return lat && lng ? {
                                                        lat: parseFloat(lat),
                                                        lng: parseFloat(lng)
                                                    } : null;
                                                }).filter(Boolean)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-lg space-y-4 mt-7">
                                    <div className="flex md:justify-between max-sm:flex-col md:items-center">
                                        <h3 className="font-semibold text-xl">Charges</h3>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button
                                                btnSize="md"
                                                type="filled"
                                                className="px-4 py-3 text-xs text-white rounded"
                                                onClick={() => handleCalculateFares(values)}
                                                disabled={fareLoading}
                                            >
                                                {fareLoading ? "Calculating..." : "Calculate Fares"}
                                            </Button>
                                            <Button
                                                btnSize="md"
                                                type="filled"
                                                className="px-4 py-3 text-xs text-white rounded"
                                            >
                                                Show Map
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between max-sm:flex-col gap-2">
                                        <div className="flex gap-4 items-center">

                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={values.quoted || false}
                                                    onChange={(e) =>
                                                        setFieldValue("quoted", e.target.checked)
                                                    }
                                                />
                                                Quoted
                                            </label>

                                            <select
                                                value={values.payment_mode || "cash"}
                                                onChange={(e) =>
                                                    setFieldValue("payment_mode", e.target.value)
                                                }
                                                className="border rounded px-2 py-1 w-48"
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="card">Card</option>
                                                <option value="upi">UPI</option>
                                            </select>
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
                                            <ChargeInput
                                                label="TOTAL CHARGES"
                                                name="total_charges"
                                                value={values.total_charges}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-end mt-3">
                                <Button
                                    btnSize="md"
                                    type="filledGray"
                                    className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
                                    onClick={() => {
                                        unlockBodyScroll();
                                        setIsOpen({ type: "new", isOpen: false });
                                    }}
                                >
                                    <span>Cancel</span>
                                </Button>
                                <Button
                                    btnType="submit"
                                    btnSize="md"
                                    type="filled"
                                    className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
                                    disabled={isBookingLoading || !fareCalculated}
                                >
                                    <span>{isBookingLoading ? "Creating..." : "Create Booking"}</span>
                                </Button>
                            </div>
                        </Form>
                    );
                }}
            </Formik>
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
    plot,
    placeholder
}) => (
    <div className="relative flex md:flex-row max-sm:w-full gap-2">
        <label className="font-semibold text-sm md:w-20 w-20 text-left">{label}</label>
        <div className="flex max-sm:flex-col gap-2 w-full">
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
            />
            {show && (
                <ul className="absolute mt-12 bg-white border md:w-52 w-58 z-50 max-h-60 overflow-auto">
                    {suggestions.map((i, idx) => (
                        <li
                            key={idx}
                            onClick={() => onSelect(i)}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                        >
                            {i.label} <span className="text-xs text-gray-400"></span>
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
            value={value || 0}
            readOnly={readOnly}
            onChange={(e) => onChange && onChange(name, e.target.value)}
            className="rounded-[8px] px-5 py-2 w-full"
        />
    </div>
);