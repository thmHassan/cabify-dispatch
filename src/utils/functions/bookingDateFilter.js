const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MULTI_BOOKING_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const getTodayWeekdayLabel = () => WEEKDAY_LABELS[new Date().getDay()];

export const formatDateForInput = (date) => {
    const d = date instanceof Date ? date : parseBookingDate(date);
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

/** Parse booking_date as local calendar date (avoids UTC timezone shift on YYYY-MM-DD). */
export const parseBookingDate = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const raw = String(value).trim();
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch.map(Number);
        return new Date(y, m - 1, d);
    }

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const toDateOnly = (value) => {
    const d = parseBookingDate(value);
    if (!d) return null;
    d.setHours(0, 0, 0, 0);
    return d;
};

export const isDateInRange = (date, startAt, endAt) => {
    const d = toDateOnly(date);
    const start = toDateOnly(startAt);
    const end = toDateOnly(endAt);
    if (!d || !start || !end) return false;
    return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
};

export const isTodayDate = (dateValue) => {
    const d = toDateOnly(dateValue);
    const today = toDateOnly(new Date());
    return Boolean(d && today && d.getTime() === today.getTime());
};

export const isFutureDate = (dateValue) => {
    const d = toDateOnly(dateValue);
    const today = toDateOnly(new Date());
    return Boolean(d && today && d.getTime() > today.getTime());
};

export const multiBookingIncludesToday = (multiDays, startAt, endAt) => {
    if (!Array.isArray(multiDays) || multiDays.length === 0) return false;
    if (!multiDays.includes(getTodayWeekdayLabel())) return false;
    return isDateInRange(new Date(), startAt, endAt);
};

export const resolveMultiBookingSubmitDate = ({
    includesToday,
    multiStartAt,
    bookingDate,
}) => {
    if (includesToday) return formatDateForInput(new Date());
    return multiStartAt || bookingDate || "";
};

export const syncMultiBookingReferenceDate = ({
    multiDays,
    multiStartAt,
    multiEndAt,
    includesToday = multiBookingIncludesToday(multiDays, multiStartAt, multiEndAt),
}) => {
    if (includesToday) return formatDateForInput(new Date());
    if (multiStartAt) return multiStartAt;
    return "";
};

export const filterBookingsForOverviewTab = (bookings, filter) => {
    if (!Array.isArray(bookings) || !filter) return bookings || [];

    if (filter === "todays_booking") {
        return bookings.filter((booking) => isTodayDate(booking?.booking_date));
    }

    if (filter === "pre_bookings") {
        return bookings.filter((booking) => isFutureDate(booking?.booking_date));
    }

    return bookings;
};

export const getMultiBookingCreatedCount = (responseData) => {
    if (!responseData) return null;
    const count =
        responseData.bookings_created ??
        responseData.created_count ??
        responseData.bookings_count ??
        responseData.data?.bookings_created ??
        responseData.data?.created_count;

    const parsed = Number(count);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
