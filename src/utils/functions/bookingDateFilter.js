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

const isApiSuccess = (data) => data?.success === 1 || data?.success === true;

export const NEAREST_DISPATCH_ACTIVE_PREFIX = "NEAREST_DISPATCH_ACTIVE|";

export const isNearestDispatchInProgress = (booking) => {
    const action = booking?.dispatcher_action;
    if (typeof action !== "string" || !action.trim()) {
        return false;
    }

    if (action.startsWith(NEAREST_DISPATCH_ACTIVE_PREFIX)) {
        return true;
    }

    if (/started nearest driver dispatch/i.test(action)) {
        return true;
    }

    return /Broadcast to \d+ driver\(s\) within/i.test(action);
};

export const isScheduledPreBooking = (booking) => {
    if (!booking) return false;

    if (booking.pickup_time_type === "asap") return false;

    const isReleased = booking.dispatch_released;
    if (isReleased === true || isReleased === 1 || isReleased === "1") return false;

    if (booking.pre_booking === false || booking.pre_booking === 0 || booking.pre_booking === "0") {
        return false;
    }
    if (booking.is_scheduled === false || booking.is_scheduled === 0 || booking.is_scheduled === "0") {
        return false;
    }

    if (booking.pickup_time_type === "time") return true;

    const preBooking = booking.pre_booking;
    if (preBooking === true || preBooking === 1 || preBooking === "1") return true;

    const isScheduled = booking.is_scheduled;
    if (isScheduled === true || isScheduled === 1 || isScheduled === "1") return true;

    return false;
};

export const bookingHasSchedulingMetadata = (booking) =>
    booking?.pickup_time_type != null ||
    booking?.is_scheduled != null ||
    booking?.pre_booking != null ||
    booking?.dispatcher_action != null;

export const shouldHideFromTodaysBookingForNearestDispatch = (
    booking,
    nearestDriverDispatchEnabled = false
) => {
    if (!booking || !nearestDriverDispatchEnabled) {
        return false;
    }

    if (isScheduledPreBooking(booking)) {
        return false;
    }

    if (isNearestDispatchInProgress(booking)) {
        return true;
    }

    const action = booking?.dispatcher_action || "";
    if (/no driver accepted|manual dispatch|available for manual/i.test(action)) {
        return false;
    }

    if (
        !action &&
        isAsapPickupBooking(booking) &&
        booking.booking_status === "pending" &&
        !booking.driver &&
        !booking.pending_driver_id
    ) {
        return true;
    }

    return false;
};

export const filterBookingsForOverviewTab = (bookings, filter, options = {}) => {
    if (!Array.isArray(bookings) || !filter) return bookings || [];

    if (filter === "todays_booking" || filter === "pre_bookings") {
        const { nearestDriverDispatchEnabled = false } = options;
        const canRefineClientSide =
            bookings.some(bookingHasSchedulingMetadata) || nearestDriverDispatchEnabled;

        if (!canRefineClientSide) return bookings;

        return bookings.filter((booking) =>
            shouldShowBookingInOverviewTab(booking, filter, options)
        );
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

export const extractCreatedBookings = (responseData, formMeta = {}) => {
    const raw =
        responseData?.bookings ||
        responseData?.data?.bookings ||
        responseData?.booking ||
        responseData?.data?.booking ||
        [];

    let list = Array.isArray(raw) ? raw : raw ? [raw] : [];

    if (list.length === 0) {
        const bookingId =
            responseData?.booking_id ||
            responseData?.id ||
            responseData?.data?.id ||
            responseData?.data?.booking_id;

        if (bookingId) {
            list = [{ id: bookingId }];
        } else if (formMeta.isScheduled) {
            list = [{ id: `pending-${Date.now()}` }];
        }
    }

    return list.filter(Boolean).map((booking) => ({
        ...booking,
        pickup_time_type:
            booking.pickup_time_type ||
            formMeta.pickupTimeType ||
            (formMeta.isScheduled ? "time" : "asap"),
        is_scheduled:
            booking.is_scheduled ??
            (formMeta.isScheduled ? true : false),
        pre_booking:
            booking.pre_booking ??
            (formMeta.isScheduled ? true : false),
        dispatch_released: booking.dispatch_released ?? false,
        reminder_minutes: booking.reminder_minutes ?? formMeta.reminderMinutes ?? null,
        booking_date: booking.booking_date ?? formMeta.bookingDate ?? null,
        pickup_time: booking.pickup_time ?? formMeta.pickupTime ?? null,
        pickup_location: booking.pickup_location ?? formMeta.pickupLocation ?? null,
        destination_location: booking.destination_location ?? formMeta.destinationLocation ?? null,
        phone_no: booking.phone_no ?? formMeta.phoneNo ?? null,
        passenger: booking.passenger ?? formMeta.passenger ?? 1,
        booking_status: booking.booking_status ?? "pending",
    }));
};

export const mergeBookingsById = (primary = [], secondary = []) => {
    const seen = new Set();
    const merged = [];

    [...secondary, ...primary].forEach((booking) => {
        if (!booking || booking.id == null || seen.has(booking.id)) return;
        seen.add(booking.id);
        merged.push(booking);
    });

    return merged;
};

export const isDispatchReleased = (booking) =>
    booking?.dispatch_released === true ||
    booking?.dispatch_released === 1 ||
    booking?.dispatch_released === "1";

export const isAsapPickupBooking = (booking) => {
    if (!booking) return false;
    if (booking.pickup_time_type === "asap") return true;
    return String(booking.pickup_time || "").toLowerCase() === "asap";
};

export const hasScheduledPickupTime = (booking) => {
    if (!booking || isAsapPickupBooking(booking)) return false;

    if (booking.pickup_time_type === "time") return true;
    if (booking.pickup_time || booking.scheduled_pickup_time) return true;

    const isScheduled =
        booking.is_scheduled === true ||
        booking.is_scheduled === 1 ||
        booking.is_scheduled === "1";
    const isPreBooking =
        booking.pre_booking === true ||
        booking.pre_booking === 1 ||
        booking.pre_booking === "1";

    return isScheduled || isPreBooking;
};

export const hasReminderMinutes = (booking) => {
    const reminder = booking?.reminder_minutes;
    if (reminder === null || reminder === undefined || reminder === "") return false;
    const value = Number(reminder);
    return Number.isFinite(value) && value > 0;
};

export const isScheduledBookingWithReminder = (booking) =>
    hasScheduledPickupTime(booking) && hasReminderMinutes(booking);

export const extractUpdatedBookingFromResponse = (responseData, fallbackBooking = {}) => {
    const raw =
        responseData?.data?.booking ||
        responseData?.booking ||
        responseData?.data ||
        responseData;

    if (!raw || typeof raw !== "object") {
        return { ...fallbackBooking };
    }

    const booking = raw.id != null ? raw : raw.booking;
    if (!booking || typeof booking !== "object") {
        return { ...fallbackBooking };
    }

    return { ...fallbackBooking, ...booking };
};

export const shouldShowBookingInOverviewTab = (booking, filter, options = {}) => {
    const { nearestDriverDispatchEnabled = false } = options;

    if (!filter || filter === "recent_jobs" || filter === "completed" || filter === "no_show" || filter === "cancelled") {
        return true;
    }

    if (filter === "pre_bookings") {
        return isScheduledPreBooking(booking);
    }

    if (filter === "todays_booking") {
        if (isScheduledPreBooking(booking)) {
            return false;
        }

        return !shouldHideFromTodaysBookingForNearestDispatch(booking, nearestDriverDispatchEnabled);
    }

    return true;
};
