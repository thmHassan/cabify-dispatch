import {
    formatDateForInputInCompanyTimezone,
    getCompanyNow,
    getCompanyTodayForInput,
    getCompanyTodayWeekdayLabel,
    isCompanyFutureDate,
    isCompanyToday,
    parseCalendarDate,
} from "./appDateTime";

export const MULTI_BOOKING_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const getTodayWeekdayLabel = () => getCompanyTodayWeekdayLabel();

export const formatDateForInput = (date) => formatDateForInputInCompanyTimezone(date);

/** Parse booking_date as local calendar date (avoids UTC timezone shift on YYYY-MM-DD). */
export const parseBookingDate = parseCalendarDate;

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

export const isTodayDate = (dateValue) => isCompanyToday(dateValue);

export const isFutureDate = (dateValue) => isCompanyFutureDate(dateValue);

export const isUpcomingScheduledPreBooking = (booking) => {
    if (!isScheduledPreBooking(booking)) return false;
    if (!booking?.booking_date) return false;

    return isFutureDate(booking.booking_date);
};

export const multiBookingIncludesToday = (multiDays, startAt, endAt) => {
    if (!Array.isArray(multiDays) || multiDays.length === 0) return false;
    if (!multiDays.includes(getTodayWeekdayLabel())) return false;
    return isDateInRange(getCompanyNow(), startAt, endAt);
};

export const resolveMultiBookingSubmitDate = ({
    includesToday,
    multiStartAt,
    bookingDate,
}) => {
    if (includesToday) return getCompanyTodayForInput();
    return multiStartAt || bookingDate || "";
};

export const syncMultiBookingReferenceDate = ({
    multiDays,
    multiStartAt,
    multiEndAt,
    includesToday = multiBookingIncludesToday(multiDays, multiStartAt, multiEndAt),
}) => {
    if (includesToday) return getCompanyTodayForInput();
    if (multiStartAt) return multiStartAt;
    return "";
};

const isApiSuccess = (data) => data?.success === 1 || data?.success === true;

export const NEAREST_DISPATCH_ACTIVE_PREFIX = "NEAREST_DISPATCH_ACTIVE|";
export const PLOT_DISPATCH_ACTIVE_PREFIX = "PLOT_DISPATCH_ACTIVE|";

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

export const isPlotDispatchInProgress = (booking) => {
    const trackedPhase = String(booking?.plot_dispatch_status?.phase || "").toLowerCase();
    if (trackedPhase === "primary" || trackedPhase === "backup") {
        return true;
    }

    const action = booking?.dispatcher_action;
    if (typeof action !== "string" || !action.trim()) {
        return false;
    }

    if (action.startsWith(PLOT_DISPATCH_ACTIVE_PREFIX)) {
        return true;
    }

    if (/started plot[- ]based dispatch/i.test(action)) {
        return true;
    }

    if (/broadcast to \d+ driver\(s\) in (plot|backup)/i.test(action)) {
        return true;
    }

    if (/dispatched to (primary |backup )?plot/i.test(action)) {
        return true;
    }

    return /plot dispatch.*in progress/i.test(action);
};

export const isPlotDispatchExhausted = (booking) => {
    const trackedPhase = String(booking?.plot_dispatch_status?.phase || "").toLowerCase();
    if (trackedPhase === "exhausted") {
        return true;
    }

    const action = booking?.dispatcher_action || "";
    const status = String(booking?.booking_status || "").toLowerCase();

    if (status === "unassigned") {
        return true;
    }

    return /no driver accepted|plot dispatch failed|all plots exhausted|available for manual/i.test(
        action
    );
};

export const isScheduledPreBooking = (booking) => {
    if (!booking) return false;

    if (booking.pickup_time_type === "asap") return false;

    const isReleased =
        booking.dispatch_released === true ||
        booking.dispatch_released === 1 ||
        booking.dispatch_released === "1";
    if (isReleased) return false;

    if (String(booking.booking_status || "").toLowerCase() !== "pending") {
        return false;
    }

    const isScheduled =
        booking.pickup_time_type === "time" ||
        booking.is_scheduled === true ||
        booking.is_scheduled === 1 ||
        booking.is_scheduled === "1";

    return isScheduled;
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

export const shouldHideFromTodaysBookingForPlotDispatch = (
    booking,
    plotBasedDispatchEnabled = false
) => {
    if (!booking || !plotBasedDispatchEnabled) {
        return false;
    }

    if (isScheduledPreBooking(booking)) {
        return false;
    }

    if (isPlotDispatchExhausted(booking)) {
        return false;
    }

    if (isPlotDispatchInProgress(booking)) {
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

export const isUserVisibleTodayBookingStatus = (booking) => {
    const status = String(booking?.booking_status || "").toLowerCase();
    return ["pending", "pending_acceptance", "started", "unassigned"].includes(status);
};

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
    const {
        nearestDriverDispatchEnabled = false,
        plotBasedDispatchEnabled = false,
    } = options;

    if (!filter || filter === "recent_jobs" || filter === "completed" || filter === "no_show" || filter === "cancelled") {
        return true;
    }

    if (filter === "pre_bookings") {
        return isUpcomingScheduledPreBooking(booking);
    }

    if (filter === "todays_booking") {
        if (!isTodayDate(booking?.booking_date)) {
            return false;
        }

        if (!isUserVisibleTodayBookingStatus(booking)) {
            return false;
        }

        if (shouldHideFromTodaysBookingForNearestDispatch(booking, nearestDriverDispatchEnabled)) {
            return false;
        }

        return !shouldHideFromTodaysBookingForPlotDispatch(booking, plotBasedDispatchEnabled);
    }

    return true;
};
