const COORDINATE_PATTERN = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/;

export const isCoordinateString = (value) => {
    if (value == null) return false;
    const trimmed = String(value).trim();
    if (!trimmed || !COORDINATE_PATTERN.test(trimmed)) return false;

    const [lat, lng] = trimmed.split(",").map((part) => parseFloat(part.trim()));
    return Number.isFinite(lat) && Number.isFinite(lng);
};

export const parseCoordinateString = (value) => {
    if (!isCoordinateString(value)) return null;

    const [lat, lng] = String(value).split(",").map((part) => parseFloat(part.trim()));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
};

export const parseBookingPoint = (point) => {
    if (point == null || point === "") return null;

    if (typeof point === "object") {
        const lat = Number(point.latitude ?? point.lat);
        const lng = Number(point.longitude ?? point.lng ?? point.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
        }
        return null;
    }

    const trimmed = String(point).trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("{")) {
        try {
            const parsed = JSON.parse(trimmed);
            return parseBookingPoint(parsed);
        } catch {
            // fall through to coordinate string parsing
        }
    }

    return parseCoordinateString(trimmed);
};

const BOOKING_POINT_FIELDS = {
    pickup_location: "pickup_point",
    destination_location: "destination_point",
};

export const getBookingLocationDisplaySource = (booking, field) => {
    if (!booking) return { needsResolve: false };

    const raw = booking[field];
    if (raw && isCoordinateString(raw)) {
        const coords = parseCoordinateString(raw);
        if (coords) {
            return { needsResolve: true, lat: coords.lat, lng: coords.lng, fallback: raw };
        }
    }

    const pointField = BOOKING_POINT_FIELDS[field];
    const point = pointField ? booking[pointField] : null;
    const pointCoords = parseBookingPoint(point);

    if ((!raw || isCoordinateString(raw)) && pointCoords) {
        const fallback = typeof point === "string" && !isCoordinateString(point)
            ? point
            : `${pointCoords.lat}, ${pointCoords.lng}`;
        return {
            needsResolve: true,
            lat: pointCoords.lat,
            lng: pointCoords.lng,
            fallback,
        };
    }

    return { needsResolve: false };
};

export const getBookingLocationDisplayValue = (booking, field, resolvedValue) => {
    if (resolvedValue) return resolvedValue;

    const raw = booking?.[field];
    if (raw && !isCoordinateString(raw)) return raw;

    const pointField = BOOKING_POINT_FIELDS[field];
    const point = pointField ? booking?.[pointField] : null;
    if (point && typeof point === "string" && !isCoordinateString(point) && !point.startsWith("{")) {
        return point;
    }

    return raw || (typeof point === "string" ? point : null) || "N/A";
};
