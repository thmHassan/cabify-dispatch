import { toBookingDateInputValue } from "./formatters";
import { metersToDisplayDistance } from "./tenantSettings";

const parseViaLocations = (booking) => {
    let viaPoints = [];
    let viaLatitudes = [];
    let viaLongitudes = [];

    if (booking.via_location) {
        try {
            const arr =
                typeof booking.via_location === "string"
                    ? JSON.parse(booking.via_location)
                    : booking.via_location;
            viaPoints = Array.isArray(arr) ? arr : [];
        } catch {
            viaPoints = [];
        }
    }

    if (booking.via_point) {
        try {
            const arr =
                typeof booking.via_point === "string"
                    ? JSON.parse(booking.via_point)
                    : booking.via_point;
            if (Array.isArray(arr)) {
                viaLatitudes = arr.map((p) => p.latitude || "");
                viaLongitudes = arr.map((p) => p.longitude || "");
            }
        } catch {
            viaLatitudes = [];
            viaLongitudes = [];
        }
    }

    return {
        viaPoints: viaPoints.slice(0, 2),
        viaLatitudes: viaLatitudes.slice(0, 2),
        viaLongitudes: viaLongitudes.slice(0, 2),
    };
};

const parsePointCoords = (point) => {
    if (!point) return { lat: "", lng: "" };
    const [lat, lng] = String(point).split(",").map((s) => s.trim());
    return { lat: lat || "", lng: lng || "" };
};

const formatPickupTimeInput = (pickupTime) => {
    if (!pickupTime || String(pickupTime).toLowerCase() === "asap") return "";
    const parts = String(pickupTime).split(":");
    if (parts.length < 2) return "";
    return `${parts[0]}:${parts[1]}`;
};

export const mapBookingToFormValues = (booking, { mode = "copy" } = {}) => {
    if (!booking) return null;

    const { viaPoints, viaLatitudes, viaLongitudes } = parseViaLocations(booking);
    const pickup = parsePointCoords(booking.pickup_point);
    const destination = parsePointCoords(booking.destination_point);
    const isEdit = mode === "edit";

    const bookingSystem = booking.booking_system || "auto_dispatch";
    const autoDispatch = bookingSystem !== "bidding" && bookingSystem !== "manual_dispatch";
    const requestForVehicle = Boolean(
        booking.request_for_vehicle === "yes" ||
        booking.request_for_vehicle === true ||
        booking.request_for_vehicle === 1 ||
        booking.vehicle
    );

    return {
        pickup_location: booking.pickup_location || "",
        destination_location: booking.destination_location || "",
        via_points: viaPoints,
        via_latitude: viaLatitudes,
        via_longitude: viaLongitudes,
        pickup_latitude: pickup.lat,
        pickup_longitude: pickup.lng,
        destination_latitude: destination.lat,
        destination_longitude: destination.lng,
        pickup_plot_id: booking.pickup_plot_id || booking.pickup_point_id || null,
        destination_plot_id: booking.destination_plot_id || booking.destination_point_id || null,
        via_plot_id: [],
        sub_company: (booking.sub_company ?? booking.subCompanyDetail?.id ?? "").toString(),
        account: (booking.account ?? booking.accountDetail?.id ?? booking.account_id ?? "").toString(),
        vehicle: (booking.vehicle ?? booking.vehicleDetail?.id ?? "").toString(),
        driver: isEdit ? (booking.driver ?? booking.pending_driver_id ?? "").toString() : "",
        journey_type: booking.journey_type || "one_way",
        booking_system: bookingSystem,
        auto_dispatch: autoDispatch,
        bidding: bookingSystem === "bidding",
        request_for_vehicle: requestForVehicle,
        pickup_time_type:
            booking.pickup_time_type ||
            (booking.pickup_time === "asap" ? "asap" : "time"),
        pickup_time: formatPickupTimeInput(booking.pickup_time),
        reminder_minutes: booking.reminder_minutes ? String(booking.reminder_minutes) : "",
        booking_date: booking.booking_date ? toBookingDateInputValue(booking.booking_date) : "",
        booking_type: booking.booking_type || "outstation",
        name: booking.name || "",
        email: booking.email || "",
        phone_no: booking.phone_no || "",
        tel_no: booking.tel_no || "",
        passenger: parseInt(booking.passenger, 10) || 1,
        luggage: parseInt(booking.luggage, 10) || 0,
        hand_luggage: parseInt(booking.hand_luggage, 10) || 0,
        special_request: booking.special_request || "",
        payment_reference: booking.payment_reference || "",
        payment_method: booking.payment_method || "cash",
        base_fare: parseFloat(booking.fares) || parseFloat(booking.booking_amount) || "",
        fares: parseFloat(booking.fares) || 0,
        return_fares: parseFloat(booking.return_fares) || 0,
        parking_charges: parseFloat(booking.parking_charge ?? booking.parking_charges) || 0,
        waiting_charges: parseFloat(booking.waiting_charge ?? booking.waiting_charges) || 0,
        ac_fares: parseFloat(booking.ac_fares) || 0,
        return_ac_fares: parseFloat(booking.return_ac_fares) || 0,
        ac_parking_charges: parseFloat(booking.ac_parking_charge ?? booking.ac_parking_charges) || 0,
        ac_waiting_charges: parseFloat(booking.ac_waiting_charge ?? booking.ac_waiting_charges) || 0,
        extra_charges: parseFloat(booking.extra_charge ?? booking.extra_charges) || 0,
        congestion_toll: parseFloat(booking.toll ?? booking.congestion_toll) || 0,
        booking_fee_charges: parseFloat(booking.booking_fee_charges) || 0,
        total_charges: parseFloat(booking.booking_amount ?? booking.offered_amount) || 0,
        distance: booking.distance ? metersToDisplayDistance(booking.distance) : "",
        user_id: (booking.user_id ?? "").toString(),
        multi_days: [],
        multi_start_at: "",
        multi_end_at: "",
        week_pattern: "",
    };
};
