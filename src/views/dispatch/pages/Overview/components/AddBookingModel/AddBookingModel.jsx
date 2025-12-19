import { ErrorMessage, Field, Form, Formik } from "formik";
import { useRef, useState, useEffect } from "react";
import _ from "lodash";
import { apiGetSubCompany } from "../../../../../../services/SubCompanyServices";
import { apiGetAccount } from "../../../../../../services/AccountServices";
import { apiGetDriverManagement } from "../../../../../../services/DriverManagementService";
import { apiGetAllVehicleType } from "../../../../../../services/VehicleTypeServices";
import { apiCreateBooking, apiCreateCalculateFares, apiGetAllPlot } from "../../../../../../services/AddBookingServices";
import Button from "../../../../../../components/ui/Button/Button";
import { getTenantData } from "../../../../../../utils/functions/tokenEncryption";


const AddBookingModel = ({ initialValue = {}, setIsOpen, onSubCompanyCreated }) => {
    const [submitError, setSubmitError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [subCompanyList, setSubCompanyList] = useState([]);
    const [vehicleList, setVehicleList] = useState([]);
    const [driverList, setDriverList] = useState([]);
    const [accountList, setAccountList] = useState([]);
    const [loadingSubCompanies, setLoadingSubCompanies] = useState(false);
    const [googleLoaded, setGoogleLoaded] = useState(false);
    const [mapProvider, setMapProvider] = useState("google");
    const [googleApiKey, setGoogleApiKey] = useState("");
    const [barikoiApiKey, setBarikoiApiKey] = useState("");
    const [plotData, setPlotData] = useState("");
    const [destinationPlotData, setDestinationPlotData] = useState("");
    const [viaPoints, setViaPoints] = useState([]);
    const [mapUrl, setMapUrl] = useState("https://www.google.com/maps/embed");
    const [pickupCoords, setPickupCoords] = useState(null);
    const [destinationCoords, setDestinationCoords] = useState(null);
    const [pickupAddress, setPickupAddress] = useState("");
    const [destinationAddress, setDestinationAddress] = useState("");
    const [barikoiSuggestions, setBarikoiSuggestions] = useState([]);
    const [showBarikoiSuggestions, setShowBarikoiSuggestions] = useState(false);
    const [destinationBarikoiSuggestions, setDestinationBarikoiSuggestions] = useState([]);
    const [showDestinationBarikoiSuggestions, setShowDestinationBarikoiSuggestions] = useState(false);
    const [activeSearchField, setActiveSearchField] = useState(null);
    const [viaBarikoiSuggestions, setViaBarikoiSuggestions] = useState({});
    const [loadingPlot, setLoadingPlot] = useState(false);
    const [loadingDestinationPlot, setLoadingDestinationPlot] = useState(false);
    const [viaPointsAdd, setViaPointAdd] = useState([])
    const setFieldValueRef = useRef(null);
    const autocompleteInstanceRef = useRef(null);
    const destinationAutocompleteInstanceRef = useRef(null);
    const barikoiTimeoutRef = useRef(null);
    const destinationBarikoiTimeoutRef = useRef(null);
    const pickupInputRefValue = useRef(null);
    const destinationInputRefValue = useRef(null);
    const calculatedDistanceRef = useRef(null);

    const [fareCalculated, setFareCalculated] = useState(false);
    const [isCalculatingFares, setIsCalculatingFares] = useState(false);
    const [calculatedFare, setCalculatedFare] = useState(0);

    const invalidateFare = () => {
        setFareCalculated(false);
        setCalculatedFare(0);
    };

    useEffect(() => {
        setIsEditMode(!!initialValue?.id);
    }, [initialValue]);

    useEffect(() => {
        const tenant = getTenantData();
        const envGoogleKey =
            import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY ||
            (typeof process !== "undefined" ? process.env.REACT_APP_GOOGLE_MAPS_API_KEY : "") ||
            "";
        const envBarikoiKey =
            import.meta?.env?.VITE_BARIKOI_API_KEY ||
            (typeof process !== "undefined" ? process.env.REACT_APP_BARIKOI_API_KEY : "") ||
            "";

        const tenantBarikoiKey = tenant?.barikoi_api_key || tenant?.barikoi_api_keys || tenant?.barikoiApiKey || "";
        const isValidBarikoiKey = tenantBarikoiKey && tenantBarikoiKey.startsWith("bkoi_");

        const resolvedGoogleKey =
            envGoogleKey ||
            tenant?.google_api_key ||
            "";

        const resolvedBarikoiKey =
            envBarikoiKey ||
            (isValidBarikoiKey ? tenantBarikoiKey : "") ||
            "";

        const prefRaw =
            tenant?.maps_api ||
            tenant?.map ||
            tenant?.search_api ||
            "";
        const preference = prefRaw?.toLowerCase?.() || "google";

        let provider =
            preference.includes("barikoi") && !preference.includes("google")
                ? "barikoi"
                : "google";

        if (provider === "google" && !resolvedGoogleKey && resolvedBarikoiKey) {
            provider = "barikoi";
        }
        if (provider === "barikoi" && !resolvedBarikoiKey && resolvedGoogleKey) {
            provider = "google";
        }

        setMapProvider(provider);
        setGoogleApiKey(resolvedGoogleKey);
        setBarikoiApiKey(resolvedBarikoiKey);
    }, []);

    useEffect(() => {
        if (mapProvider !== "google") return;

        const apiKey = googleApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

        if (window.google && window.google.maps && window.google.maps.places) {
            setGoogleLoaded(true);
            return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => {
                setGoogleLoaded(true);
            });
            return;
        }

        if (!apiKey) {
            console.warn('Google Maps API key not found');
            return;
        }

        const script = document.createElement('script');
        // Load Google Maps JavaScript API with Places library (for maps / places features)
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            setGoogleLoaded(true);
        };
        script.onerror = () => {
            console.error('Failed to load Google Maps API');
        };
        document.head.appendChild(script);

        return () => {
            const scriptToRemove = document.querySelector('script[src*="maps.googleapis.com"]');
            if (scriptToRemove && scriptToRemove === script) {
                document.head.removeChild(script);
            }
        };
    }, [mapProvider, googleApiKey]);

    const fetchPlotData = async (latitude, longitude, isDestination = false, viaIndex = null) => {
        if (viaIndex !== null) {
            setLoadingPlot(true);
            try {
                const formData = new FormData();
                formData.append('latitude', latitude.toString());
                formData.append('longitude', longitude.toString());

                const response = await apiGetAllPlot(formData);

                if (response?.data?.success === 1) {
                    // If plot exists (found === 1), use the record name, otherwise show "No plot found"
                    const hasPlot = response?.data?.found === 1 && response?.data?.record?.name;
                    const plotName = hasPlot ? response.data.record.name : "No plot found";
                    const updatedViaPoints = [...viaPoints];
                    updatedViaPoints[viaIndex].plot = plotName;
                    setViaPoints(updatedViaPoints);
                } else {
                    // Clear plot if API call fails
                    const updatedViaPoints = [...viaPoints];
                    updatedViaPoints[viaIndex].plot = "";
                    setViaPoints(updatedViaPoints);
                }
            } catch (error) {
                console.error("Error fetching plot data:", error);
                // Clear plot on error
                const updatedViaPoints = [...viaPoints];
                updatedViaPoints[viaIndex].plot = "";
                setViaPoints(updatedViaPoints);
            } finally {
                setLoadingPlot(false);
            }
        } else if (isDestination) {
            setLoadingDestinationPlot(true);
            try {
                const formData = new FormData();
                formData.append('latitude', latitude.toString());
                formData.append('longitude', longitude.toString());

                const response = await apiGetAllPlot(formData);

                if (response?.data?.success === 1) {
                    // If plot exists (found === 1), use the record name, otherwise show "No plot found"
                    const hasPlot = response?.data?.found === 1 && response?.data?.record?.name;
                    const plotName = hasPlot ? response.data.record.name : "No plot found";
                    setDestinationPlotData(plotName);
                } else {
                    // Clear destination plot if API call fails
                    setDestinationPlotData("");
                }
            } catch (error) {
                console.error("Error fetching plot data:", error);
                // Clear destination plot on error
                setDestinationPlotData("");
            } finally {
                setLoadingDestinationPlot(false);
            }
        } else {
            setLoadingPlot(true);
            try {
                const formData = new FormData();
                formData.append('latitude', latitude.toString());
                formData.append('longitude', longitude.toString());

                const response = await apiGetAllPlot(formData);

                if (response?.data?.success === 1) {
                    // If plot exists (found === 1), use the record name, otherwise show "No plot found"
                    const hasPlot = response?.data?.found === 1 && response?.data?.record?.name;
                    const plotName = hasPlot ? response.data.record.name : "No plot found";
                    setPlotData(plotName);
                } else {
                    // Clear pickup plot if API call fails
                    setPlotData("");
                }
            } catch (error) {
                console.error("Error fetching plot data:", error);
                // Clear pickup plot on error
                setPlotData("");
            } finally {
                setLoadingPlot(false);
            }
        }
    };

    const updateMapUrl = (latitude, longitude) => {
        const apiKey = googleApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        let newMapUrl;
        if (apiKey) {
            newMapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latitude},${longitude}&zoom=15`;
        } else {
            newMapUrl = `https://www.google.com/maps?q=${latitude},${longitude}&output=embed&z=15`;
        }
        setMapUrl(newMapUrl);
    };

    useEffect(() => {
        setPickupAddress(initialValue?.pickup_point || "");
        setDestinationAddress(initialValue?.destination || "");
    }, [initialValue]);

    useEffect(() => {
        if (fareCalculated) {
            setFareCalculated(false);
        }
    }, [pickupCoords, destinationCoords, viaPoints, pickupAddress, destinationAddress]);

    useEffect(() => {
        const hasPickupCoords = pickupCoords && pickupCoords.lat != null && pickupCoords.lng != null;
        const hasDestinationCoords = destinationCoords && destinationCoords.lat != null && destinationCoords.lng != null;

        const hasPickupAddress = pickupAddress && pickupAddress.trim().length > 0;
        const hasDestinationAddress = destinationAddress && destinationAddress.trim().length > 0;

        const apiKey = googleApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

        if (apiKey && hasPickupAddress && hasDestinationAddress) {
            const viaAddresses = viaPoints
                .map(v => v?.address)
                .filter(a => a && a.trim().length > 0)
                .map(a => a.trim())
                .join("|");

            let routeUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}` +
                `&origin=${encodeURIComponent(pickupAddress.trim())}` +
                `&destination=${encodeURIComponent(destinationAddress.trim())}` +
                `&mode=driving`;

            if (viaAddresses) {
                routeUrl += `&waypoints=${encodeURIComponent(viaAddresses)}`;
            }

            setMapUrl(routeUrl);
            return;
        }

        if (apiKey && hasPickupCoords && hasDestinationCoords) {
            const waypointCoords = viaPoints
                .map(v => v?.coords)
                .filter(c => c && c.lat != null && c.lng != null)
                .map(c => `${c.lat},${c.lng}`)
                .join("|");

            let routeUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}` +
                `&origin=${pickupCoords.lat},${pickupCoords.lng}` +
                `&destination=${destinationCoords.lat},${destinationCoords.lng}` +
                `&mode=driving`;

            if (waypointCoords) {
                routeUrl += `&waypoints=${encodeURIComponent(waypointCoords)}`;
            }

            setMapUrl(routeUrl);
            return;
        }

        if (hasPickupCoords) {
            updateMapUrl(pickupCoords.lat, pickupCoords.lng);
        } else if (hasDestinationCoords) {
            updateMapUrl(destinationCoords.lat, destinationCoords.lng);
        }
    }, [pickupCoords, destinationCoords, viaPoints, mapProvider, googleApiKey, pickupAddress, destinationAddress]);

    const searchGooglePlaceAndUpdateMap = async (query) => {
        const cleanQuery = query?.trim() || "";
        if (!cleanQuery) return;

        const apiKey = googleApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
        if (!apiKey) {
            console.warn("Google Maps API key not found for text search");
            return;
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(cleanQuery)}&key=${apiKey}`;
            const response = await fetch(url, {
                method: "GET",
                headers: { Accept: "application/json" },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Google Places Text Search API error:", response.status, errorText);
                return;
            }

            const data = await response.json();
            const results = Array.isArray(data.results) ? data.results : [];
            if (!results.length) return;

            const first = results[0];
            const lat = first.geometry?.location?.lat;
            const lng = first.geometry?.location?.lng;
            if (lat != null && lng != null) {
                updateMapUrl(Number(lat), Number(lng));
            }
        } catch (error) {
            console.error("Error calling Google Places Text Search:", error);
        }
    };

    const searchBarikoi = async (query, fieldType = 'pickup', viaIndex = null) => {
        const cleanQuery = query?.trim() || "";

        if (!cleanQuery || cleanQuery.length < 1) {
            if (fieldType === 'pickup') {
                setBarikoiSuggestions([]);
                setShowBarikoiSuggestions(false);
            } else if (fieldType === 'destination') {
                setDestinationBarikoiSuggestions([]);
                setShowDestinationBarikoiSuggestions(false);
            } else if (fieldType === 'via' && viaIndex !== null) {
                setViaBarikoiSuggestions(prev => ({ ...prev, [viaIndex]: [] }));
            }
            return;
        }

        if (!barikoiApiKey) {
            console.warn('Barikoi API key not found');
            return;
        }

        if (!barikoiApiKey.startsWith("bkoi_")) {
            console.error('Invalid Barikoi API key format. Key should start with "bkoi_"');
            if (fieldType === 'pickup') {
                setBarikoiSuggestions([]);
                setShowBarikoiSuggestions(false);
            } else if (fieldType === 'destination') {
                setDestinationBarikoiSuggestions([]);
                setShowDestinationBarikoiSuggestions(false);
            } else if (fieldType === 'via' && viaIndex !== null) {
                setViaBarikoiSuggestions(prev => ({ ...prev, [viaIndex]: [] }));
            }
            return;
        }

        try {
            // Use the cleaned query
            const searchQuery = cleanQuery;

            // Try multiple Barikoi API endpoint formats
            const url = `https://barikoi.xyz/v1/api/search/autocomplete/${barikoiApiKey}/place?q=${encodeURIComponent(searchQuery)}`;
            console.log('Barikoi API Request:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Barikoi API authentication failed:', errorData.message || 'Invalid or No Registered Key');
                    if (fieldType === 'pickup') {
                        setBarikoiSuggestions([]);
                        setShowBarikoiSuggestions(false);
                    } else if (fieldType === 'destination') {
                        setDestinationBarikoiSuggestions([]);
                        setShowDestinationBarikoiSuggestions(false);
                    } else if (fieldType === 'via' && viaIndex !== null) {
                        setViaBarikoiSuggestions(prev => ({ ...prev, [viaIndex]: [] }));
                    }
                    return;
                }
                const errorText = await response.text();
                console.error('Barikoi API error:', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error('Barikoi API returned non-JSON response:', text.substring(0, 200));
                if (fieldType === 'pickup') {
                    setBarikoiSuggestions([]);
                    setShowBarikoiSuggestions(false);
                } else if (fieldType === 'destination') {
                    setDestinationBarikoiSuggestions([]);
                    setShowDestinationBarikoiSuggestions(false);
                } else if (fieldType === 'via' && viaIndex !== null) {
                    setViaBarikoiSuggestions(prev => ({ ...prev, [viaIndex]: [] }));
                }
                return;
            }

            const data = await response.json();
            console.log('Barikoi API Full Response:', JSON.stringify(data, null, 2));

            // Try multiple response structure formats
            let places = [];
            if (data.places && Array.isArray(data.places)) {
                places = data.places;
                console.log('Found places in data.places:', places.length);
            } else if (data.data && Array.isArray(data.data)) {
                places = data.data;
                console.log('Found places in data.data:', places.length);
            } else if (data.results && Array.isArray(data.results)) {
                places = data.results;
                console.log('Found places in data.results:', places.length);
            } else if (data.suggestions && Array.isArray(data.suggestions)) {
                places = data.suggestions;
                console.log('Found places in data.suggestions:', places.length);
            } else if (data.list && Array.isArray(data.list)) {
                places = data.list;
                console.log('Found places in data.list:', places.length);
            } else if (data.items && Array.isArray(data.items)) {
                places = data.items;
                console.log('Found places in data.items:', places.length);
            } else if (Array.isArray(data)) {
                places = data;
                console.log('Response is direct array:', places.length);
            } else {
                console.warn('No places found in response. Response structure:', Object.keys(data));
            }

            console.log('Final parsed places:', places);
            console.log('Places count:', places.length);

            if (places.length > 0) {
                console.log('Setting suggestions for fieldType:', fieldType);
                if (fieldType === 'pickup') {
                    setBarikoiSuggestions(places);
                    setShowBarikoiSuggestions(true);
                    setActiveSearchField('pickup');
                    console.log('Pickup suggestions set:', places.length);
                } else if (fieldType === 'destination') {
                    setDestinationBarikoiSuggestions(places);
                    setShowDestinationBarikoiSuggestions(true);
                    setActiveSearchField('destination');
                    console.log('Destination suggestions set:', places.length);
                } else if (fieldType === 'via' && viaIndex !== null) {
                    setViaBarikoiSuggestions(prev => ({ ...prev, [viaIndex]: places }));
                    setActiveSearchField(viaIndex);
                    console.log('Via suggestions set for index:', viaIndex, places.length);
                }
            } else {
                if (fieldType === 'pickup') {
                    setBarikoiSuggestions([]);
                    setShowBarikoiSuggestions(false);
                } else if (fieldType === 'destination') {
                    setDestinationBarikoiSuggestions([]);
                    setShowDestinationBarikoiSuggestions(false);
                } else if (fieldType === 'via' && viaIndex !== null) {
                    setViaBarikoiSuggestions(prev => ({ ...prev, [viaIndex]: [] }));
                }
            }
        } catch (error) {
            console.error('Error searching Barikoi:', error);
            if (fieldType === 'pickup') {
                setBarikoiSuggestions([]);
                setShowBarikoiSuggestions(false);
            } else if (fieldType === 'destination') {
                setDestinationBarikoiSuggestions([]);
                setShowDestinationBarikoiSuggestions(false);
            } else if (fieldType === 'via' && viaIndex !== null) {
                setViaBarikoiSuggestions(prev => ({ ...prev, [viaIndex]: [] }));
            }
        }
    };

    const searchDestinationBarikoi = async (query) => {
        await searchBarikoi(query, 'destination');
    };

    const handleCalculateFares = async (values) => {
        setSubmitError(null);
        setIsCalculatingFares(true);

        try {
            if (!pickupCoords || !destinationCoords) {
                setSubmitError("Please select both pickup and destination (with map suggestions) before calculating fares.");
                return;
            }

            if (!values.vehicle) {
                setSubmitError("Please select a vehicle to calculate fares.");
                return;
            }

            const formData = new FormData();
            formData.append('pickup_point[latitude]', pickupCoords.lat);
            formData.append('pickup_point[longitude]', pickupCoords.lng);
            formData.append('destination_point[latitude]', destinationCoords.lat);
            formData.append('destination_point[longitude]', destinationCoords.lng);
            console.log('Via Points before adding to payload:', viaPoints);
            console.log('Via payload:', viaPointsAdd);

            viaPointsAdd.forEach((v, index) => {
                if (v && v.coords) {
                    const lat = v.coords.lat;
                    const lng = v.coords.lng;
                    if (lat != null && lat !== undefined && lat !== '' && !isNaN(lat) &&
                        lng != null && lng !== undefined && lng !== '' && !isNaN(lng)) {
                        console.log(`Adding via point ${index} to payload:`, lat, lng);
                        formData.append(`via_point[${index}][latitude]`, String(lat));
                        formData.append(`via_point[${index}][longitude]`, String(lng));
                    } else {
                        console.warn(`Via point ${index} skipped - invalid coordinates:`, { lat, lng, viaPoint: v });
                    }
                } else {
                    console.warn(`Via point ${index} skipped - missing coords object:`, v);
                }
            });

            formData.append('vehicle_id', values.vehicle);
            formData.append('journey', values.journey_type || "one_way");

            const response = await apiCreateCalculateFares(formData);

            if (response?.data?.success === 1 || response?.status === 200) {
                setFareCalculated(true);
                // Extract calculate_fare from response
                const calculateFareFromApi = response?.data?.calculate_fare || response?.data?.data?.calculate_fare || 0;
                setCalculatedFare(Number(calculateFareFromApi) || 0);

                calculatedDistanceRef.current = response?.data?.distance || 0;

                // Update total_charges with calculated fare plus any existing user charges
                if (setFieldValueRef.current) {
                    const chargeFields = [
                        "fares",
                        "return_fares",
                        "parking_charges",
                        "booking_fee_charges",
                        "ac_fares",
                        "return_ac_fares",
                        "ac_parking_charges",
                        "waiting_charges",
                        "extra_charges",
                        "congestion_toll",
                        "ac_waiting_charges",
                    ];
                    const userChargesSum = chargeFields.reduce((acc, field) => {
                        return acc + (Number(values[field] || 0));
                    }, 0);
                    const totalCharges = Number(calculateFareFromApi) + userChargesSum;
                    setFieldValueRef.current("total_charges", totalCharges);
                }
            } else {
                setSubmitError(response?.data?.message || "Failed to calculate fares. Please try again.");
            }
        } catch (error) {
            console.error("Calculate fares error:", error);
            setSubmitError(error?.response?.data?.message || error?.message || "Error calculating fares");
        } finally {
            setIsCalculatingFares(false);
        }
    };

    const handleSubmit = async (values) => {
        setIsLoading(true);
        setSubmitError(null);

        try {
            if (!fareCalculated) {
                setSubmitError("Please calculate fares before creating the booking.");
                setIsLoading(false);
                return;
            }

            // if (!values.user_id) {
            //     setSubmitError("User is required for booking.");
            //     setIsLoading(false);
            //     return;
            // }

            // const requiresBookingType = !values.driver;
            // if (requiresBookingType && !values.booking_type) {
            //     setSubmitError("Select a booking type or assign a driver.");
            //     setIsLoading(false);
            //     return;
            // }

            if (values.multi_booking === "yes") {
                const hasMultiDates = values.multi_start_at && values.multi_end_at;
                if (!values.multi_days?.length || !hasMultiDates) {
                    setSubmitError("For multi booking, pick days, start and end dates.");
                    setIsLoading(false);
                    return;
                }
            }

            if (calculatedDistanceRef.current == null) {
                setSubmitError("Distance not calculated. Please calculate fares again.");
                setIsLoading(false);
                return;
            }

            const formDataObj = new FormData();

            formDataObj.append('sub_company', values.sub_company || "");
            formDataObj.append("distance", calculatedDistanceRef.current);
            formDataObj.append('multi_booking', values.multi_booking || "no");
            const multiDays = Array.isArray(values.multi_days) ? values.multi_days.join(",") : (values.multi_days || "");
            formDataObj.append('multi_days', values.multi_booking === "yes" ? multiDays : "");

            if (values.multi_booking === "yes") {
                formDataObj.append('start_at', values.multi_start_at || "");
                formDataObj.append('end_at', values.multi_end_at || "");
                formDataObj.append('week', values.week_pattern || "");
            }

            const pickupTimeValue = values.pickup_time_type === "asap" ? "asap" : (values.pickup_time || "");
            formDataObj.append('pickup_time', pickupTimeValue);
            formDataObj.append('booking_date', values.booking_date || "");
            const bookingTypeValue = values.driver ? "" : (values.booking_type || "");
            formDataObj.append('booking_type', bookingTypeValue);

            const pickupLat = pickupCoords?.lat;
            const pickupLng = pickupCoords?.lng;
            const destLat = destinationCoords?.lat;
            const destLng = destinationCoords?.lng;

            formDataObj.append('pickup_point', (pickupLat != null && pickupLng != null) ? `${pickupLat},${pickupLng}` : (values.pickup_point || ""));
            formDataObj.append('pickup_location', pickupAddress || values.pickup_point || "");

            formDataObj.append('destination_point', (destLat != null && destLng != null) ? `${destLat},${destLng}` : (values.destination || ""));
            formDataObj.append('destination_location', destinationAddress || values.destination || "");

            viaPoints.forEach((viaPoint, index) => {
                if (viaPoint?.coords) {
                    formDataObj.append(`via_point[${index}][latitude]`, viaPoint.coords.lat);
                    formDataObj.append(`via_point[${index}][longitude]`, viaPoint.coords.lng);
                }
                formDataObj.append(`via_location[${index}]`, viaPoint?.address || "");
            });

            formDataObj.append('user_id', values.user_id || "");
            formDataObj.append('name', values.name || "");
            formDataObj.append('email', values.email || "");
            formDataObj.append('phone_no', values.phone_no || "");
            formDataObj.append('tel_no', values.tel_no || "");
            formDataObj.append('journey_type', values.journey_type || "one_way");
            formDataObj.append('account', values.account || "");
            formDataObj.append('vehicle', values.vehicle || "");
            formDataObj.append('driver', values.driver || "");
            formDataObj.append('passenger', values.passenger || "");
            formDataObj.append('luggage', values.luggage || "");
            formDataObj.append('hand_luggage', values.hand_luggage || "");
            formDataObj.append('special_request', values.special_request || "");
            formDataObj.append('payment_reference', values.payment_reference || "");

            const bookingSystemValue = values.driver ? (values.booking_system || "") : "reviewed";
            formDataObj.append('booking_system', bookingSystemValue);

            formDataObj.append('parking_charge', values.parking_charges || "");
            formDataObj.append('waiting_charge', values.waiting_charges || "");
            formDataObj.append('ac_fares', values.ac_fares || "");
            formDataObj.append('return_ac_fares', values.return_ac_fares || "");
            formDataObj.append('ac_parking_charge', values.ac_parking_charges || "");
            formDataObj.append('ac_waiting_charge', values.ac_waiting_charges || "");
            formDataObj.append('extra_charge', values.extra_charges || "");
            formDataObj.append('toll', values.congestion_toll || "");
            formDataObj.append('booking_amount', values.total_charges || values.booking_amount || "");

            const response = await apiCreateBooking(formDataObj);

            if (response?.data?.success === 1 || response?.status === 200) {
                if (onSubCompanyCreated) {
                    onSubCompanyCreated();
                }
                unlockBodyScroll();
                setIsOpen({ type: "new", isOpen: false });
            } else {
                setSubmitError(response?.data?.message || "Failed to create booking");
            }
        } catch (error) {
            console.error(`Booking creation error:`, error);
            setSubmitError(error?.response?.data?.message || error?.message || "Error creating booking");
        } finally {
            setIsLoading(false);
        }
    };

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
        const handleClickOutside = (event) => {
            const inputElement = pickupInputRefValue.current;
            if (inputElement && showBarikoiSuggestions) {
                const inputContainer = inputElement.closest('.relative');
                if (inputContainer && !inputContainer.contains(event.target)) {
                    setShowBarikoiSuggestions(false);
                }
            }
        };

        if (showBarikoiSuggestions) {
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showBarikoiSuggestions]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const inputElement = destinationInputRefValue.current;
            if (inputElement && showDestinationBarikoiSuggestions) {
                const inputContainer = inputElement.closest('.relative');
                if (inputContainer && !inputContainer.contains(event.target)) {
                    setShowDestinationBarikoiSuggestions(false);
                }
            }
        };

        if (showDestinationBarikoiSuggestions) {
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDestinationBarikoiSuggestions]);

    return (
        <div>
            <Formik
                initialValues={{
                    name: initialValue?.name || "",
                    email: initialValue?.email || "",
                    pickup_point: initialValue?.pickup_point || "",
                    destination: initialValue?.destination || "",
                    plot: "",
                    sub_company: "",
                    account: "",
                    vehicle: "",
                    driver: "",
                    passenger: 0,
                    luggage: 0,
                    hand_luggage: 0,
                    special_request: "",
                    payment_reference: "",
                    pickup_time: "",
                    pickup_time_type: "asap",
                    booking_date: "",
                    booking_type: "local",
                    journey_type: "one_way",
                    quoted: false,
                    payment_mode: "cash",
                    multi_booking: "no",
                    multi_days: [],
                    week_pattern: "",
                    multi_start_at: "",
                    multi_end_at: "",
                    user_id: "",
                    booking_system: "auto_dispatch",
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
                    waiting_time: 0,
                    total_charges: 0,
                    booking_amount: 0,
                }}
                onSubmit={handleSubmit}
            >
                {({ values, setFieldValue }) => {
                    setFieldValueRef.current = setFieldValue;

                    const chargeFields = [
                        "fares",
                        "return_fares",
                        "parking_charges",
                        "booking_fee_charges",
                        "ac_fares",
                        "return_ac_fares",
                        "ac_parking_charges",
                        "waiting_charges",
                        "extra_charges",
                        "congestion_toll",
                        "ac_waiting_charges",
                    ];

                    const updateChargeField = (name, rawValue) => {
                        const numericValue = Number(rawValue) || 0;
                        setFieldValue(name, numericValue);
                        const userChargesSum = chargeFields.reduce((acc, field) => {
                            const currentVal = field === name ? numericValue : Number(values[field] || 0);
                            return acc + currentVal;
                        }, 0);
                        // Add calculated fare to user charges
                        const totalCharges = calculatedFare + userChargesSum;
                        setFieldValue("total_charges", totalCharges);
                    };

                    const pickupInputRef = (inputElement) => {
                        if (!inputElement) {
                            if (autocompleteInstanceRef.current) {
                                window.google?.maps?.event?.clearInstanceListeners(autocompleteInstanceRef.current);
                                autocompleteInstanceRef.current = null;
                            }
                            pickupInputRefValue.current = null;
                            return;
                        }

                        pickupInputRefValue.current = inputElement;

                        if (mapProvider !== "google") return;

                        if (!googleLoaded || autocompleteInstanceRef.current) return;

                        setTimeout(() => {
                            if (!window.google?.maps?.places) return;

                            try {
                                if (autocompleteInstanceRef.current) {
                                    window.google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
                                }
                                const autocomplete = new window.google.maps.places.Autocomplete(
                                    inputElement,
                                    {
                                        types: ['address', 'establishment'],
                                        componentRestrictions: { country: [] },
                                        fields: ['formatted_address', 'geometry', 'name', 'place_id']
                                    }
                                );

                                autocompleteInstanceRef.current = autocomplete;

                                // Handle place selection
                                autocomplete.addListener('place_changed', () => {
                                    const place = autocomplete.getPlace();
                                    if (place && place.formatted_address && setFieldValueRef.current) {
                                        // Update Formik field value
                                        setFieldValueRef.current('pickup_point', place.formatted_address);
                                        invalidateFare();

                                        // Get coordinates
                                        const lat = place.geometry?.location?.lat();
                                        const lng = place.geometry?.location?.lng();

                                        if (lat && lng) {
                                            // Fetch plot data
                                            fetchPlotData(lat, lng);
                                            // Save pickup coordinates for route
                                            setPickupCoords({ lat, lng });
                                        }
                                    }
                                });
                            } catch (error) {
                                console.error('Error initializing Google Places Autocomplete:', error);
                            }
                        }, 100);
                    };

                    const handleBarikoiInputChange = (e) => {
                        const value = e.target.value;
                        setFieldValue('pickup_point', value);
                        setPickupAddress(value);
                        invalidateFare();
                        setActiveSearchField('pickup');
                        // Close other suggestions
                        setShowDestinationBarikoiSuggestions(false);
                        setViaBarikoiSuggestions({});

                        // Clear previous timeout
                        if (barikoiTimeoutRef.current) {
                            clearTimeout(barikoiTimeoutRef.current);
                        }

                        // Debounce search
                        barikoiTimeoutRef.current = setTimeout(() => {
                            if (mapProvider === "barikoi") {
                                searchBarikoi(value, 'pickup');
                            }
                        }, 300);
                    };

                    const handleBarikoiSelect = (place) => {
                        // Extract address from different possible fields
                        const address = place.address ||
                            place.formatted_address ||
                            place.place ||
                            place.name ||
                            (place.address_line && place.address_line.length > 0 ? place.address_line[0] : "") ||
                            "";
                        setFieldValue('pickup_point', address);
                        setPickupAddress(address);
                        invalidateFare();
                        setShowBarikoiSuggestions(false);
                        setBarikoiSuggestions([]);
                        setActiveSearchField(null);
                        // Close other suggestions
                        setShowDestinationBarikoiSuggestions(false);
                        setViaBarikoiSuggestions({});

                        // Get coordinates - Barikoi may use different field names
                        const lat = place.latitude || place.lat || (place.location && place.location.lat) || (place.geometry && place.geometry.coordinates && place.geometry.coordinates[1]);
                        const lng = place.longitude || place.lng || place.lon || (place.location && place.location.lng) || (place.geometry && place.geometry.coordinates && place.geometry.coordinates[0]);

                        if (lat && lng) {
                            // Fetch plot data
                            fetchPlotData(parseFloat(lat), parseFloat(lng));
                            // Save pickup coordinates for route
                            setPickupCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
                        }
                    };

                    const destinationInputRef = (inputElement) => {
                        if (!inputElement) {
                            // Cleanup on unmount
                            if (destinationAutocompleteInstanceRef.current) {
                                window.google?.maps?.event?.clearInstanceListeners(destinationAutocompleteInstanceRef.current);
                                destinationAutocompleteInstanceRef.current = null;
                            }
                            destinationInputRefValue.current = null;
                            return;
                        }

                        destinationInputRefValue.current = inputElement;

                        // Only initialize Google autocomplete if using Google provider
                        if (mapProvider !== "google") return;

                        if (!googleLoaded || destinationAutocompleteInstanceRef.current) return;

                        // Wait a bit for Google to be fully ready
                        setTimeout(() => {
                            if (!window.google?.maps?.places) return;

                            try {
                                // Cleanup existing autocomplete if any
                                if (destinationAutocompleteInstanceRef.current) {
                                    window.google.maps.event.clearInstanceListeners(destinationAutocompleteInstanceRef.current);
                                }

                                // Initialize Autocomplete
                                const autocomplete = new window.google.maps.places.Autocomplete(
                                    inputElement,
                                    {
                                        types: ['address', 'establishment'],
                                        componentRestrictions: { country: [] },
                                        fields: ['formatted_address', 'geometry', 'name', 'place_id']
                                    }
                                );

                                destinationAutocompleteInstanceRef.current = autocomplete;

                                // Handle place selection
                                autocomplete.addListener('place_changed', () => {
                                    const place = autocomplete.getPlace();
                                    if (place && place.formatted_address && setFieldValueRef.current) {
                                        // Update Formik field value
                                        setFieldValueRef.current('destination', place.formatted_address);
                                        invalidateFare();

                                        // Get coordinates
                                        const lat = place.geometry?.location?.lat();
                                        const lng = place.geometry?.location?.lng();

                                        if (lat && lng) {
                                            // Fetch plot data for destination
                                            fetchPlotData(lat, lng, true);
                                            // Save destination coordinates for route
                                            setDestinationCoords({ lat, lng });
                                        }
                                    }
                                });
                            } catch (error) {
                                console.error('Error initializing Google Places Autocomplete for destination:', error);
                            }
                        }, 100);
                    };

                    const handleDestinationBarikoiInputChange = (e) => {
                        const value = e.target.value;
                        setFieldValue('destination', value);
                        setDestinationAddress(value);
                        invalidateFare();
                        setActiveSearchField('destination');
                        // Close other suggestions
                        setShowBarikoiSuggestions(false);
                        setViaBarikoiSuggestions({});

                        // Clear previous timeout
                        if (destinationBarikoiTimeoutRef.current) {
                            clearTimeout(destinationBarikoiTimeoutRef.current);
                        }

                        // Debounce search
                        destinationBarikoiTimeoutRef.current = setTimeout(() => {
                            if (mapProvider === "barikoi") {
                                searchBarikoi(value, 'destination');
                            }
                        }, 300);
                    };

                    const handleDestinationBarikoiSelect = (place) => {
                        // Extract address from different possible fields
                        const address = place.address ||
                            place.formatted_address ||
                            place.place ||
                            place.name ||
                            (place.address_line && place.address_line.length > 0 ? place.address_line[0] : "") ||
                            "";
                        setFieldValue('destination', address);
                        setDestinationAddress(address);
                        invalidateFare();
                        setShowDestinationBarikoiSuggestions(false);
                        setDestinationBarikoiSuggestions([]);
                        setActiveSearchField(null);
                        // Close other suggestions
                        setShowBarikoiSuggestions(false);
                        setViaBarikoiSuggestions({});

                        // Get coordinates - Barikoi may use different field names
                        const lat = place.latitude || place.lat || (place.location && place.location.lat) || (place.geometry && place.geometry.coordinates && place.geometry.coordinates[1]);
                        const lng = place.longitude || place.lng || place.lon || (place.location && place.location.lng) || (place.geometry && place.geometry.coordinates && place.geometry.coordinates[0]);

                        if (lat && lng) {
                            // Fetch plot data for destination
                            fetchPlotData(parseFloat(lat), parseFloat(lng), true);
                            // Save destination coordinates for route
                            setDestinationCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
                        }
                    };

                    const handleAddVia = () => {
                        setViaPoints([...viaPoints, { address: "", plot: "", coords: null }]);
                        invalidateFare();
                    };

                    const handleRemoveVia = (index) => {
                        const updatedViaPoints = viaPoints.filter((_, i) => i !== index);
                        setViaPoints(updatedViaPoints);
                        invalidateFare();
                    };

                    const handleSwapDestinationWithLastVia = () => {
                        if (!viaPoints.length) return;

                        const lastIndex = viaPoints.length - 1;
                        const lastVia = viaPoints[lastIndex];

                        const newViaPoints = [...viaPoints];
                        newViaPoints[lastIndex] = {
                            ...lastVia,
                            address: destinationAddress || values.destination || "",
                            plot: destinationPlotData,
                            coords: destinationCoords || null,
                        };

                        const newDestinationAddress = lastVia.address || "";

                        setViaPoints(newViaPoints);
                        setFieldValue("destination", newDestinationAddress);
                        setDestinationAddress(newDestinationAddress);
                        setDestinationPlotData(lastVia.plot || "");
                        setDestinationCoords(lastVia.coords || null);
                        invalidateFare();
                    };

                    return (
                        <Form>
                            <div className="w-full">
                                <div className="space-y-4 w-full">
                                    <div class="w-full flex max-sm:flex-col md:items-center gap-4">
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

                                            <ErrorMessage
                                                name="sub_company"
                                                component="div"
                                                className="text-red-500 text-sm mt-1"
                                            />
                                        </div>
                                        <div class="flex items-center max-sm:justify-center rounded-[8px] px-3 py-2 border-[1.5px] shadow-lg border-[#8D8D8D]">
                                            <span class="text-sm mr-2">Single Booking</span>

                                            <label class="relative inline-flex items-center cursor-pointer ">
                                                <input
                                                    type="checkbox"
                                                    class="sr-only peer"
                                                    checked={values.multi_booking === "yes"}
                                                    onChange={(e) => {
                                                        const isMulti = e.target.checked;
                                                        setFieldValue("multi_booking", isMulti ? "yes" : "no");
                                                        if (!isMulti) {
                                                            setFieldValue("multi_days", []);
                                                        }
                                                    }}
                                                />
                                                <div class="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-green-400 transition-all"></div>
                                                <div
                                                    class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-all">
                                                </div>
                                            </label>

                                            <span className="text-sm ml-2">Multi Booking</span>
                                        </div>

                                    </div>


                                    <div className="w-full bg-white">
                                        <div className="flex lg:flex-row md:flex-col flex-col gap-4">

                                            <div className="lg:col-span-3 space-y-4">
                                                {values.multi_booking === "yes" && (
                                                    <div className="w-full space-y-3">
                                                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">

                                                            <span className="font-semibold text-sm sm:text-base">
                                                                Select day of the week
                                                            </span>

                                                            <div className="flex flex-wrap max-sm:grid max-sm:grid-cols-4 gap-2">
                                                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                                                                    const isChecked = values.multi_days.includes(day.toLowerCase());

                                                                    return (
                                                                        <label
                                                                            key={day}
                                                                            className="flex items-center gap-2 text-sm sm:text-base cursor-pointer"
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={(e) => {
                                                                                    const next = new Set(values.multi_days);
                                                                                    if (e.target.checked) {
                                                                                        next.add(day.toLowerCase());
                                                                                    } else {
                                                                                        next.delete(day.toLowerCase());
                                                                                    }
                                                                                    setFieldValue("multi_days", Array.from(next));
                                                                                }}
                                                                                className="w-4 h-4"
                                                                            />
                                                                            {day}
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>

                                                        </div>


                                                        <div className="grid md:grid-cols-3 grid-cols-1 items-center gap-4">
                                                            <div className="flex gap-2">
                                                                <label className="text-sm font-semibold mb-1 block">Week</label>
                                                                <select
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                    value={values.week_pattern}
                                                                    onChange={(e) => setFieldValue("week_pattern", e.target.value)}
                                                                >
                                                                    <option value="">Every 1st Days of Week</option>
                                                                    <option value="every">Every Week</option>
                                                                    <option value="alternate">Alternate Weeks</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <label className="text-sm font-semibold mb-1 block">Start At</label>
                                                                <input
                                                                    type="date"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                    value={values.multi_start_at || ""}
                                                                    onChange={(e) => setFieldValue("multi_start_at", e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <label className="text-sm font-semibold mb-1 block">End At</label>
                                                                <input
                                                                    type="date"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                    value={values.multi_end_at || ""}
                                                                    onChange={(e) => setFieldValue("multi_end_at", e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                                                    <div className="flex w-full items-center gap-2 md:text-center">
                                                        <label className="text-sm font-semibold md:text-center">Pick up Time</label>
                                                        <div className="w-full flex gap-2">
                                                            <select
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px]  px-3 py-2 text-sm w-full"
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

                                                    <div className="flex w-full items-center gap-2 md:text-center">
                                                        <label className="text-sm font-semibold mb-1">Date</label>
                                                        <input
                                                            type="date"
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                            value={values.booking_date || ""}
                                                            onChange={(e) => setFieldValue("booking_date", e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="flex w-full items-center gap-2 md:text-center">
                                                        <label className="text-sm font-semibold mb-1">Booking Type</label>
                                                        <select
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                            value={values.booking_type || ""}
                                                            onChange={(e) => setFieldValue("booking_type", e.target.value)}
                                                        >
                                                            <option value="local">Local</option>
                                                            {/* <option value="outstation">Outstation</option> */}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex  gap-4">
                                                    <div className="flex gap-2 w-full">
                                                        <div className="flex gap-2 items-center relative">
                                                            <span className="text-sm  text-center font-semibold mb-1 w-full">Pick up Point</span>
                                                            <div className="relative">
                                                                <input
                                                                    ref={(el) => {
                                                                        if (mapProvider === "google") {
                                                                            pickupInputRef(el);
                                                                        } else {
                                                                            pickupInputRefValue.current = el;
                                                                        }
                                                                    }}
                                                                    type="text"
                                                                    name="pickup_point"
                                                                    value={values.pickup_point || ''}
                                                                    onChange={mapProvider === "barikoi" ? handleBarikoiInputChange : (e) => {
                                                                        setFieldValue('pickup_point', e.target.value);
                                                                        setPickupAddress(e.target.value);
                                                                        invalidateFare();
                                                                    }}
                                                                    placeholder="Search location..."
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    autoComplete="off"
                                                                    onFocus={mapProvider === "barikoi" && values.pickup_point ? () => searchBarikoi(values.pickup_point) : undefined}
                                                                />
                                                                {/* Barikoi Suggestions Dropdown - appears below input like Google Maps */}
                                                                {mapProvider === "barikoi" && activeSearchField === 'pickup' && showBarikoiSuggestions && barikoiSuggestions.length > 0 && (
                                                                    <div
                                                                        className="barikoi-suggestions absolute z-[9999] w-full top-full left-0 mt-0.5 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                                                                        style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                                                                    >
                                                                        {barikoiSuggestions.map((place, index) => {
                                                                            // Format address similar to the image - combine name and location
                                                                            // Barikoi API response structure: Check all possible fields
                                                                            console.log('Place object:', place);

                                                                            // Extract all possible fields from Barikoi API response
                                                                            const placeName = place.name || place.place || place.place_name || place.address || "";
                                                                            const address = place.address || place.formatted_address ||
                                                                                (Array.isArray(place.address_line) ? place.address_line.join(", ") : (place.address_line || "")) || "";
                                                                            const area = place.area || place.sub_district || place.subdistrict || "";
                                                                            const city = place.city || place.district || place.sub_district || place.subdistrict || "";
                                                                            const state = place.state || place.region || place.division || "";

                                                                            // Create full address like "Vesu Surat, Gujarat" or "Ahmedabad, Gujarat"
                                                                            let displayAddress = "";

                                                                            // Strategy 1: If we have a place name, use it as primary
                                                                            if (placeName && placeName.trim()) {
                                                                                displayAddress = placeName.trim();

                                                                                // If address exists and is different, append it
                                                                                if (address && address.trim() &&
                                                                                    address.toLowerCase() !== placeName.toLowerCase() &&
                                                                                    !address.toLowerCase().includes(placeName.toLowerCase()) &&
                                                                                    !placeName.toLowerCase().includes(address.toLowerCase())) {
                                                                                    displayAddress += ` ${address.trim()}`;
                                                                                }
                                                                            } else if (address && address.trim()) {
                                                                                displayAddress = address.trim();
                                                                            }

                                                                            // Build location string (city, state) - always add these
                                                                            const locationParts = [];

                                                                            // Add city if available and not already in displayAddress
                                                                            if (city && city.trim()) {
                                                                                const cityLower = city.toLowerCase().trim();
                                                                                if (!displayAddress.toLowerCase().includes(cityLower)) {
                                                                                    locationParts.push(city.trim());
                                                                                }
                                                                            }

                                                                            // Add state if available and not already in displayAddress
                                                                            if (state && state.trim()) {
                                                                                const stateLower = state.toLowerCase().trim();
                                                                                if (!displayAddress.toLowerCase().includes(stateLower)) {
                                                                                    locationParts.push(state.trim());
                                                                                }
                                                                            }

                                                                            // Combine everything: "PlaceName, City, State"
                                                                            if (locationParts.length > 0) {
                                                                                if (displayAddress) {
                                                                                    displayAddress += `, ${locationParts.join(", ")}`;
                                                                                } else {
                                                                                    displayAddress = locationParts.join(", ");
                                                                                }
                                                                            }

                                                                            // Final fallback: use any available field
                                                                            if (!displayAddress || displayAddress.trim() === "") {
                                                                                displayAddress = (Array.isArray(place.address_line) ? place.address_line.join(", ") : place.address_line) ||
                                                                                    place.formatted_address ||
                                                                                    place.place ||
                                                                                    place.name ||
                                                                                    (place.city && place.state ? `${place.city}, ${place.state}` : "") ||
                                                                                    "Location";
                                                                            }

                                                                            console.log('Formatted displayAddress:', displayAddress);

                                                                            return (
                                                                                <div
                                                                                    key={index}
                                                                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors flex items-start gap-3"
                                                                                    onClick={() => handleBarikoiSelect(place)}
                                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                                                >
                                                                                    {/* Location Pin Icon */}
                                                                                    <svg
                                                                                        className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                                                                                        fill="currentColor"
                                                                                        viewBox="0 0 20 20"
                                                                                    >
                                                                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                                                    </svg>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="font-medium text-sm text-gray-900 truncate">
                                                                                            {displayAddress || "Location"}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-center flex items-center gap-2 max-sm:mt-8">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Plot Name"
                                                                    value={plotData}
                                                                    readOnly
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 bg-gray-50 w-52"
                                                                    disabled={loadingPlot}
                                                                />
                                                                {/* {loadingPlot && (
                                                                    <span className="text-xs text-gray-500">Loading...</span>
                                                                )} */}
                                                            </div>
                                                        </div>


                                                        <div className="text-center flex items-center max-sm:justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleAddVia}
                                                                className="px-2 py-2 w-24 border rounded-lg bg-blue-50 text-blue-600  hover:bg-blue-100"
                                                            >
                                                                +Via
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {viaPoints.map((viaPoint, viaIndex) => {
                                                    const viaInputRef = (inputElement) => {
                                                        if (!inputElement) return;
                                                        if (mapProvider !== "google" || !googleLoaded) return;

                                                        setTimeout(() => {
                                                            if (!window.google?.maps?.places) return;
                                                            try {
                                                                const autocomplete = new window.google.maps.places.Autocomplete(
                                                                    inputElement,
                                                                    {
                                                                        types: ['address', 'establishment'],
                                                                        componentRestrictions: { country: [] },
                                                                        fields: ['formatted_address', 'geometry', 'name', 'place_id']
                                                                    }
                                                                );

                                                                autocomplete.addListener('place_changed', () => {
                                                                    const place = autocomplete.getPlace();
                                                                    if (place && place.formatted_address) {
                                                                        const updatedViaPoints = [...viaPoints];
                                                                        const address = place.formatted_address;
                                                                        updatedViaPoints[viaIndex].address = address;
                                                                        const lat = place.geometry?.location?.lat();
                                                                        const lng = place.geometry?.location?.lng();
                                                                        if (lat && lng) {
                                                                            fetchPlotData(lat, lng, false, viaIndex);
                                                                            updatedViaPoints[viaIndex] = {
                                                                                ...updatedViaPoints[viaIndex],
                                                                                coords: { lat, lng },
                                                                            };
                                                                        }
                                                                        setViaPoints(updatedViaPoints);
                                                                        invalidateFare();
                                                                    }
                                                                });
                                                            } catch (error) {
                                                                console.error('Error initializing Google Places Autocomplete for via point:', error);
                                                            }
                                                        }, 100);
                                                    };

                                                    const handleViaBarikoiInputChange = (e) => {
                                                        const updatedViaPoints = [...viaPoints];
                                                        updatedViaPoints[viaIndex].address = e.target.value;
                                                        setViaPoints(updatedViaPoints);
                                                        invalidateFare();
                                                        setActiveSearchField(viaIndex);
                                                        // Close other suggestions
                                                        setShowBarikoiSuggestions(false);
                                                        setShowDestinationBarikoiSuggestions(false);

                                                        if (destinationBarikoiTimeoutRef.current) {
                                                            clearTimeout(destinationBarikoiTimeoutRef.current);
                                                        }
                                                        destinationBarikoiTimeoutRef.current = setTimeout(() => {
                                                            if (mapProvider === "barikoi") {
                                                                searchBarikoi(e.target.value, 'via', viaIndex);
                                                            }
                                                        }, 300);
                                                    };

                                                    const handleViaBarikoiSelect = (place) => {
                                                        console.log('handleViaBarikoiSelect - Full place object:', place);
                                                        console.log('handleViaBarikoiSelect - Place keys:', Object.keys(place));

                                                        // Extract address from different possible fields
                                                        const address = place.address ||
                                                            place.formatted_address ||
                                                            place.place ||
                                                            place.name ||
                                                            (place.address_line && place.address_line.length > 0 ? place.address_line[0] : "") ||
                                                            "";

                                                        // Barikoi API returns latitude and longitude directly (per documentation)
                                                        // Try all possible coordinate formats
                                                        const lat = place.latitude !== undefined && place.latitude !== null ? place.latitude :
                                                            (place.lat !== undefined && place.lat !== null ? place.lat :
                                                                (place.location && place.location.latitude !== undefined ? place.location.latitude :
                                                                    (place.location && place.location.lat !== undefined ? place.location.lat :
                                                                        (place.geometry && place.geometry.coordinates && Array.isArray(place.geometry.coordinates) && place.geometry.coordinates.length >= 2 ? place.geometry.coordinates[1] :
                                                                            (place.geometry && place.geometry.location && typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() :
                                                                                (place.geometry && place.geometry.location && place.geometry.location.lat !== undefined ? place.geometry.location.lat :
                                                                                    null))))));

                                                        const lng = place.longitude !== undefined && place.longitude !== null ? place.longitude :
                                                            (place.lng !== undefined && place.lng !== null ? place.lng :
                                                                (place.lon !== undefined && place.lon !== null ? place.lon :
                                                                    (place.location && place.location.longitude !== undefined ? place.location.longitude :
                                                                        (place.location && place.location.lng !== undefined ? place.location.lng :
                                                                            (place.location && place.location.lon !== undefined ? place.location.lon :
                                                                                (place.geometry && place.geometry.coordinates && Array.isArray(place.geometry.coordinates) && place.geometry.coordinates.length >= 2 ? place.geometry.coordinates[0] :
                                                                                    (place.geometry && place.geometry.location && typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() :
                                                                                        (place.geometry && place.geometry.location && place.geometry.location.lng !== undefined ? place.geometry.location.lng :
                                                                                            null))))))));

                                                        console.log('Extracted coordinates for via point:', { lat, lng, address, viaIndex, placeLatitude: place.latitude, placeLongitude: place.longitude });

                                                        const updatedViaPoints = [...viaPoints];
                                                        updatedViaPoints[viaIndex].address = address;

                                                        // Convert to numbers and validate
                                                        if (lat != null && lng != null && lat !== undefined && lng !== undefined) {
                                                            const parsedLat = parseFloat(lat);
                                                            const parsedLng = parseFloat(lng);

                                                            if (!isNaN(parsedLat) && !isNaN(parsedLng) && isFinite(parsedLat) && isFinite(parsedLng)) {
                                                                console.log('Setting via point coordinates:', parsedLat, parsedLng);
                                                                fetchPlotData(parsedLat, parsedLng, false, viaIndex);
                                                                // Save via coordinates for route
                                                                updatedViaPoints[viaIndex] = {
                                                                    ...updatedViaPoints[viaIndex],
                                                                    coords: { lat: parsedLat, lng: parsedLng }
                                                                };
                                                            } else {
                                                                console.warn('Parsed coordinates are invalid:', { parsedLat, parsedLng, originalLat: lat, originalLng: lng });
                                                            }
                                                        } else {
                                                            console.warn('Could not extract valid coordinates from place. Place structure:', Object.keys(place), 'lat:', lat, 'lng:', lng, 'place.latitude:', place.latitude, 'place.longitude:', place.longitude);
                                                        }

                                                        console.log('Final updated via point:', viaPoints);
                                                        setViaPoints(updatedViaPoints);
                                                        setViaPointAdd(updatedViaPoints)
                                                        invalidateFare();
                                                        setViaBarikoiSuggestions(prev => ({ ...prev, [viaIndex]: [] }));
                                                        setActiveSearchField(null);
                                                    };

                                                    const handleSwapViaWithDestination = () => {
                                                        const currentVia = viaPoints[viaIndex];

                                                        const newViaPoints = [...viaPoints];
                                                        newViaPoints[viaIndex] = {
                                                            ...currentVia,
                                                            address: values.destination || "",
                                                            plot: destinationPlotData,
                                                            coords: destinationCoords || null,
                                                        };

                                                        // Swap destination with this via point (address, plot, coords)
                                                        setViaPoints(newViaPoints);
                                                        const newDestinationAddress = currentVia.address || "";
                                                        setFieldValue('destination', newDestinationAddress);
                                                        setDestinationAddress(newDestinationAddress);
                                                        setDestinationPlotData(currentVia.plot || "");
                                                        setDestinationCoords(currentVia.coords || null);
                                                        invalidateFare();
                                                    };

                                                    return (
                                                        <div key={viaIndex} className="flex max-sm:flex-col gap-4">
                                                            <div className="flex  gap-2">
                                                                <div className="flex gap-2 items-center relative">
                                                                    <label className="text-sm font-semibold mb-1 w-20">Via Point {viaIndex + 1}</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            ref={mapProvider === "google" ? viaInputRef : null}
                                                                            type="text"
                                                                            value={viaPoint.address || ""}
                                                                            onChange={mapProvider === "barikoi" ? handleViaBarikoiInputChange : (e) => {
                                                                                const updatedViaPoints = [...viaPoints];
                                                                                updatedViaPoints[viaIndex].address = e.target.value;
                                                                                setViaPoints(updatedViaPoints);
                                                                                invalidateFare();
                                                                            }}
                                                                            placeholder="Search via location..."
                                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px]  px-3 py-2 w-full"
                                                                            autoComplete="off"
                                                                        />
                                                                        {/* Barikoi Suggestions for Via Point */}
                                                                        {mapProvider === "barikoi" && activeSearchField === viaIndex && viaBarikoiSuggestions[viaIndex] && viaBarikoiSuggestions[viaIndex].length > 0 && (
                                                                            <div
                                                                                className="barikoi-suggestions absolute z-[9999] w-full top-full left-0 mt-0.5 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                                                                                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                                                                            >
                                                                                {viaBarikoiSuggestions[viaIndex].map((place, index) => {
                                                                                    // Format address similar to the image - combine name and location
                                                                                    const placeName = place.name || place.place || place.place_name || "";
                                                                                    const address = place.address || place.formatted_address || place.address_line ||
                                                                                        (Array.isArray(place.address_line) ? place.address_line.join(", ") : "") || "";
                                                                                    const area = place.area || place.sub_district || "";
                                                                                    const city = place.city || place.district || place.sub_district || "";
                                                                                    const state = place.state || place.region || place.division || "";

                                                                                    // Create full address like "Vesu Surat, Gujarat" or "Vesu Canal Road Vesu, Surat, Gujarat"
                                                                                    let displayAddress = "";

                                                                                    // Strategy: Use place name first, then add location details
                                                                                    if (placeName) {
                                                                                        displayAddress = placeName;

                                                                                        // Add address if it's different from name
                                                                                        if (address && !address.toLowerCase().includes(placeName.toLowerCase()) &&
                                                                                            !placeName.toLowerCase().includes(address.toLowerCase())) {
                                                                                            displayAddress += ` ${address}`;
                                                                                        }
                                                                                    } else if (address) {
                                                                                        displayAddress = address;
                                                                                    }

                                                                                    // Build location string (city, state)
                                                                                    const locationParts = [];

                                                                                    // Add area if it's meaningful and different
                                                                                    if (area && area.toLowerCase() !== city?.toLowerCase() &&
                                                                                        !displayAddress.toLowerCase().includes(area.toLowerCase())) {
                                                                                        locationParts.push(area);
                                                                                    }

                                                                                    // Add city
                                                                                    if (city && !displayAddress.toLowerCase().includes(city.toLowerCase())) {
                                                                                        locationParts.push(city);
                                                                                    }

                                                                                    // Add state
                                                                                    if (state && !displayAddress.toLowerCase().includes(state.toLowerCase())) {
                                                                                        locationParts.push(state);
                                                                                    }

                                                                                    // Combine everything
                                                                                    if (locationParts.length > 0) {
                                                                                        if (displayAddress) {
                                                                                            displayAddress += `, ${locationParts.join(", ")}`;
                                                                                        } else {
                                                                                            displayAddress = locationParts.join(", ");
                                                                                        }
                                                                                    }

                                                                                    // Fallback: if still empty, use any available field
                                                                                    if (!displayAddress) {
                                                                                        displayAddress = place.address_line ||
                                                                                            place.formatted_address ||
                                                                                            place.place ||
                                                                                            place.name ||
                                                                                            "Location";
                                                                                    }

                                                                                    return (
                                                                                        <div
                                                                                            key={index}
                                                                                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors flex items-start gap-3"
                                                                                            onClick={() => handleViaBarikoiSelect(place)}
                                                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                                                        >
                                                                                            {/* Location Pin Icon */}
                                                                                            <svg
                                                                                                className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                                                                                                fill="currentColor"
                                                                                                viewBox="0 0 20 20"
                                                                                            >
                                                                                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                                                            </svg>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="font-medium text-sm text-gray-900 truncate">
                                                                                                    {displayAddress || "Location"}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-center flex items-center gap-2 max-sm:mt-8">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Plot Name"
                                                                        value={viaPoint.plot || ""}
                                                                        readOnly
                                                                        className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px]  px-3 py-2 bg-gray-50"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleSwapViaWithDestination}
                                                                        className="px-2 py-2 w-24 border rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                                    >
                                                                        ⇅ Swap
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveVia(viaIndex)}
                                                                        className="px-2 py-2 border rounded-lg bg-red-50 text-red-600 hover:bg-red-100 w-14"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                <div className="flex gap-4">
                                                    <div className="flex gap-2">
                                                        <div className="flex items-center gap-2 relative">
                                                            <label className="text-sm font-semibold mb-1 w-20">Destination</label>
                                                            <div className="relative">
                                                                <input
                                                                    ref={(el) => {
                                                                        if (mapProvider === "google") {
                                                                            destinationInputRef(el);
                                                                        } else {
                                                                            destinationInputRefValue.current = el;
                                                                        }
                                                                    }}
                                                                    type="text"
                                                                    name="destination"
                                                                    value={values.destination || ''}
                                                                    onChange={mapProvider === "barikoi" ? handleDestinationBarikoiInputChange : (e) => {
                                                                        setFieldValue('destination', e.target.value);
                                                                        setDestinationAddress(e.target.value);
                                                                        invalidateFare();
                                                                    }}
                                                                    placeholder="Search location..."
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    autoComplete="off"
                                                                    onFocus={mapProvider === "barikoi" && values.destination ? () => searchDestinationBarikoi(values.destination) : undefined}
                                                                />
                                                                {/* Barikoi Suggestions Dropdown for Destination */}
                                                                {mapProvider === "barikoi" && activeSearchField === 'destination' && showDestinationBarikoiSuggestions && destinationBarikoiSuggestions.length > 0 && (
                                                                    <div
                                                                        className="barikoi-suggestions absolute z-[9999] w-full top-full left-0 mt-0.5 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                                                                        style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                                                                    >
                                                                        {destinationBarikoiSuggestions.map((place, index) => {
                                                                            // Format address similar to the image - combine name and location
                                                                            const placeName = place.name || place.place || place.place_name || place.address || "";
                                                                            const address = place.address || place.formatted_address ||
                                                                                (Array.isArray(place.address_line) ? place.address_line.join(", ") : place.address_line) || "";
                                                                            const area = place.area || place.sub_district || place.subdistrict || "";
                                                                            const city = place.city || place.district || place.sub_district || place.subdistrict || "";
                                                                            const state = place.state || place.region || place.division || "";

                                                                            // Create full address like "Vesu Surat, Gujarat" or "Ahmedabad, Gujarat"
                                                                            let displayAddress = "";

                                                                            // Strategy 1: If we have a place name, use it as primary
                                                                            if (placeName) {
                                                                                displayAddress = placeName.trim();

                                                                                // If address exists and is different, append it
                                                                                if (address && address.trim() &&
                                                                                    address.toLowerCase() !== placeName.toLowerCase() &&
                                                                                    !address.toLowerCase().includes(placeName.toLowerCase()) &&
                                                                                    !placeName.toLowerCase().includes(address.toLowerCase())) {
                                                                                    displayAddress += ` ${address.trim()}`;
                                                                                }
                                                                            } else if (address) {
                                                                                displayAddress = address.trim();
                                                                            }

                                                                            // Build location string (city, state) - always add these
                                                                            const locationParts = [];

                                                                            // Add city if available and not already in displayAddress
                                                                            if (city && city.trim()) {
                                                                                const cityLower = city.toLowerCase().trim();
                                                                                if (!displayAddress.toLowerCase().includes(cityLower)) {
                                                                                    locationParts.push(city.trim());
                                                                                }
                                                                            }

                                                                            // Add state if available and not already in displayAddress
                                                                            if (state && state.trim()) {
                                                                                const stateLower = state.toLowerCase().trim();
                                                                                if (!displayAddress.toLowerCase().includes(stateLower)) {
                                                                                    locationParts.push(state.trim());
                                                                                }
                                                                            }

                                                                            // Combine everything: "PlaceName, City, State"
                                                                            if (locationParts.length > 0) {
                                                                                if (displayAddress) {
                                                                                    displayAddress += `, ${locationParts.join(", ")}`;
                                                                                } else {
                                                                                    displayAddress = locationParts.join(", ");
                                                                                }
                                                                            }

                                                                            // Final fallback: use any available field
                                                                            if (!displayAddress || displayAddress.trim() === "") {
                                                                                displayAddress = place.address_line ||
                                                                                    place.formatted_address ||
                                                                                    place.place ||
                                                                                    place.name ||
                                                                                    (place.city && place.state ? `${place.city}, ${place.state}` : "") ||
                                                                                    "Location";
                                                                            }

                                                                            return (
                                                                                <div
                                                                                    key={index}
                                                                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors flex items-start gap-3"
                                                                                    onClick={() => handleDestinationBarikoiSelect(place)}
                                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                                                >
                                                                                    {/* Location Pin Icon */}
                                                                                    <svg
                                                                                        className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                                                                                        fill="currentColor"
                                                                                        viewBox="0 0 20 20"
                                                                                    >
                                                                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                                                    </svg>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="font-medium text-sm text-gray-900 truncate">
                                                                                            {displayAddress || "Location"}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="text-center flex items-center gap-2 max-sm:mt-8">
                                                            <input
                                                                type="text"
                                                                placeholder="Plot Name"
                                                                value={destinationPlotData}
                                                                readOnly
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-52 bg-gray-50"
                                                                disabled={loadingDestinationPlot}
                                                            />
                                                            {/* {loadingDestinationPlot && (
                                                                <span className="text-xs text-gray-500">Loading...</span>
                                                            )} */}
                                                        </div>
                                                    </div>
                                                    <div className="text-center flex items-center max-sm:justify-end gap-2">
                                                        {viaPoints.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={handleSwapDestinationWithLastVia}
                                                                className="px-2 py-2 w-24 border rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                            >
                                                                ⇅ swap
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex md:flex-row flex-col">
                                                    <div className="w-full gap-3 grid">
                                                        <div className="flex md:flex-row flex-col gap-2">
                                                            <div className="text-left flex  gap-2">
                                                                <label className="text-sm font-semibold mb-1 w-20">Name</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Enter Name"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    value={values.name || ""}
                                                                    onChange={(e) => setFieldValue("name", e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="text-left flex items-center gap-2 ">
                                                                <label className="text-sm font-semibold mb-1 w-11">Email</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Enter Email"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    value={values.email}
                                                                    onChange={(e) => setFieldValue("email", e.target.value)}
                                                                />
                                                            </div>

                                                        </div>

                                                        {/* Mobile / Tel */}
                                                        <div className="flex md:flex-row flex-col gap-2">
                                                            <div className="text-left flex items-left gap-2">
                                                                <label className="text-sm font-semibold mb-1 w-20">Mobile No</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Enter Mobile No"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    value={values.phone_no || ""}
                                                                    onChange={(e) => setFieldValue("phone_no", e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="text-center flex items-center gap-2">
                                                                <label className="text-sm font-semibold mb-1">Tel No.</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Enter Telephone no"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    value={values.tel_no}
                                                                    onChange={(e) => setFieldValue("tel_no", e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Journey */}
                                                        <div className="w-full">
                                                            <div className="md:flex-row flex-col flex gap-2 w-full">
                                                                <div className="text-left flex items-center gap-2">
                                                                    <label className="text-sm font-semibold w-20">Journey</label>
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="flex items-center gap-1">
                                                                            <input
                                                                                type="radio"
                                                                                name="journey"
                                                                                checked={values.journey_type === "one_way"}
                                                                                onChange={() => setFieldValue("journey_type", "one_way")}
                                                                            />
                                                                            One Way
                                                                        </label>

                                                                        <label className="flex items-center gap-1">
                                                                            <input
                                                                                type="radio"
                                                                                name="journey"
                                                                                checked={values.journey_type === "return"}
                                                                                onChange={() => setFieldValue("journey_type", "return")}
                                                                            />
                                                                            Return
                                                                        </label>

                                                                        <label className="flex items-center gap-1">
                                                                            <input
                                                                                type="radio"
                                                                                name="journey"
                                                                                checked={values.journey_type === "wr"}
                                                                                onChange={() => setFieldValue("journey_type", "wr")}
                                                                            />
                                                                            W/R
                                                                        </label>
                                                                    </div>
                                                                </div>

                                                                <div className="flex-1">
                                                                    <div className="text-center flex items-center gap-2">
                                                                        <label className="text-sm font-semibold mb-1">Accounts</label>
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



                                                        <div className="flex gap-2 w-full">
                                                            <div className="flex md:flex-row items-center flex-row gap-2 w-full">
                                                                <label className="text-sm font-semibold w-28">Vehicle</label>
                                                                {/* <div className="w-full"> */}
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
                                                                {/* </div> */}
                                                            </div>

                                                            <div className="flex md:flex-row items-center flex-row gap-2 w-full text-right">
                                                                <label className="text-sm font-semibold w-20">Driver</label>
                                                                <div className="w-full">
                                                                    <select
                                                                        name="driver"
                                                                        value={values.driver}
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
                                                    {/* Auto Dispatch + Bidding */}
                                                    <div className="border rounded-lg h-28 md:mt-10 mx-4 px-4 py-4 w-full bg-white shadow-sm">
                                                        <div className="flex flex-col gap-3">
                                                            <label className="flex items-center gap-2">
                                                                <input type="checkbox" defaultChecked />
                                                                Auto Dispatch
                                                            </label>

                                                            <label className="flex items-center gap-2">
                                                                <input type="checkbox" defaultChecked />
                                                                Bidding
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
                                                    <div className="text-center flex items-center gap-2">
                                                        <label className="text-sm font-semibold mb-1 w-20">Passenger</label>
                                                        <input
                                                            type="number"
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px]  px-3 py-2 w-full"
                                                            value={values.passenger}
                                                            onChange={(e) => setFieldValue("passenger", Number(e.target.value) || 0)}
                                                        />
                                                    </div>

                                                    <div className="text-center flex items-center gap-2">
                                                        <label className="text-sm font-semibold mb-1 w-20">Luggage</label>
                                                        <input
                                                            type="number"
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                            value={values.luggage}
                                                            onChange={(e) => setFieldValue("luggage", Number(e.target.value) || 0)}
                                                        />
                                                    </div>

                                                    <div className="text-center flex items-center gap-2">
                                                        <label className="text-sm font-semibold mb-1 w-full">
                                                            Hand Luggage
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                            value={values.hand_luggage}
                                                            onChange={(e) => setFieldValue("hand_luggage", Number(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 grid-cols-1 gap-4 ">                                                            <div className="text-center flex items-center gap-2">
                                                    <label className="text-sm font-semibold mb-1 w-28">Special Req</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Write here..."
                                                        className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px]  px-3 py-2 w-full"
                                                        value={values.special_request}
                                                        onChange={(e) => setFieldValue("special_request", e.target.value)}
                                                    />
                                                </div>
                                                    <div className="text-center flex items-center gap-2">
                                                        <label className="text-sm font-semibold mb-1 w-28">Payment Ref</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Write here..."
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px]  px-3 py-2 w-full"
                                                            value={values.payment_reference}
                                                            onChange={(e) => setFieldValue("payment_reference", e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="w-full h-full rounded-xl overflow-hidden border" style={{ minHeight: '400px' }}>
                                                    <iframe
                                                        title="map"
                                                        width="100%"
                                                        height="100%"
                                                        loading="lazy"
                                                        allowFullScreen
                                                        src={mapUrl}
                                                        style={{ minHeight: '400px' }}
                                                    ></iframe>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-lg space-y-4 mt-7">

                                            <div className="flex justify-between items-center">
                                                <h3 className="font-semibold text-xl">Charges</h3>

                                                <div className="flex gap-2">
                                                    <Button
                                                        btnSize="md"
                                                        type="filled"
                                                        className="px-4 py-3 text-xs text-white rounded"
                                                        disabled={isCalculatingFares}
                                                        onClick={() => handleCalculateFares(values)}
                                                    >
                                                        {isCalculatingFares ? "Calculating..." : "Calculate Fares"}
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

                                            <div className="flex justify-between">
                                                <div className="flex gap-4 items-center">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm font-medium">Payment Ref</label>
                                                    </div>

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
                                                        value={values.payment_mode}
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
                                                <div className="w-60">
                                                    <ChargeInput label="Booking Fees Charges" name="booking_fee_charges" values={values} onChange={(v) => updateChargeField("booking_fee_charges", v)} />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-4 grid-cols-1 gap-4">
                                                <ChargeInput label="Fares" name="fares" values={values} onChange={(v) => updateChargeField("fares", v)} />
                                                <ChargeInput label="Return Fares" name="return_fares" values={values} onChange={(v) => updateChargeField("return_fares", v)} />
                                                <ChargeInput label="Waiting Time" name="waiting_time" values={values} onChange={(v) => setFieldValue("waiting_time", Number(v) || 0)} />
                                                <ChargeInput label="Parking Charges" name="parking_charges" values={values} onChange={(v) => updateChargeField("parking_charges", v)} />

                                                <ChargeInput label="AC Fares" name="ac_fares" values={values} onChange={(v) => updateChargeField("ac_fares", v)} />
                                                <ChargeInput label="Return AC Fares" name="return_ac_fares" values={values} onChange={(v) => updateChargeField("return_ac_fares", v)} />
                                                <ChargeInput label="Waiting Charges" name="waiting_charges" values={values} onChange={(v) => updateChargeField("waiting_charges", v)} />
                                                <ChargeInput label="AC Parking Charges" name="ac_parking_charges" values={values} onChange={(v) => updateChargeField("ac_parking_charges", v)} />

                                                <ChargeInput label="Extra Charges" name="extra_charges" values={values} onChange={(v) => updateChargeField("extra_charges", v)} />
                                                <ChargeInput label="Congestion / Toll" name="congestion_toll" values={values} onChange={(v) => updateChargeField("congestion_toll", v)} />
                                                <ChargeInput label="AC Waiting Charges" name="ac_waiting_charges" values={values} onChange={(v) => updateChargeField("ac_waiting_charges", v)} />
                                                <div className="font-bold text-[#10B981]">
                                                    <ChargeInput label="Total Charges" name="total_charges" values={values} readOnly />
                                                </div>
                                            </div>
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
                                    disabled={isLoading || !fareCalculated}
                                >
                                    <span>{isLoading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update" : "Create Booking")}</span>
                                </Button>
                            </div>
                        </Form>
                    );
                }}
            </Formik>
        </div >
    );
};

export default AddBookingModel;

const ChargeInput = ({ label, name, values, onChange, readOnly = false }) => (
    <div className="flex items-center gap-2">
        <label className="text-sm font-medium w-40">{label}</label>
        <input
            type="number"
            value={values[name] || 0}
            onChange={(e) => onChange && onChange(e.target.value)}
            readOnly={readOnly}
            className=" rounded-[8px] px-5 py-2 w-full"
        />
    </div>
);