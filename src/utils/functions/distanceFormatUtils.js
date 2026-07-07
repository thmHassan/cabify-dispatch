export const parseDistanceUnit = (unit) => (
    String(unit || "").trim().toLowerCase() === "miles" ? "Miles" : "Km"
);

export const formatDistanceValueWithUnit = (value, distanceUnit = "Km") => {
    if (value === "" || value == null) return "";
    const numeric = Number(value);
    const displayValue = Number.isFinite(numeric) ? numeric.toFixed(2) : value;
    return `${displayValue} ${distanceUnit === "Miles" ? "Miles" : "Km"}`;
};

export const metersToDisplayDistanceValue = (meters, distanceUnit = "Km") => {
    const value = Number(meters);
    if (!Number.isFinite(value)) return "";
    if (distanceUnit === "Miles") {
        return (value / 1609.344).toFixed(2);
    }
    return (value / 1000).toFixed(2);
};

export const formatDistanceFromMeters = (meters, distanceUnit = "Km") => {
    const value = metersToDisplayDistanceValue(meters, distanceUnit);
    return value === "" || Number(value) <= 0
        ? "-"
        : formatDistanceValueWithUnit(value, distanceUnit);
};

export const formatDistanceFromBooking = (booking, fallbackUnit = "Km") => {
    if (booking?.distance_value != null && booking?.distance_unit) {
        return formatDistanceValueWithUnit(
            booking.distance_value,
            parseDistanceUnit(booking.distance_unit),
        );
    }

    return formatDistanceFromMeters(booking?.distance, fallbackUnit);
};
