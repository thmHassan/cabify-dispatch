import {
    isPlotDispatchExhausted,
    isPlotDispatchInProgress,
    PLOT_DISPATCH_ACTIVE_PREFIX,
} from "../functions/bookingDateFilter";

export const TERMINAL_BOOKING_STATUSES = new Set(["cancelled", "completed", "no_show"]);

export const isTerminalBookingStatus = (status) =>
    TERMINAL_BOOKING_STATUSES.has(String(status || "").toLowerCase());

export const isTerminalBooking = (booking) =>
    isTerminalBookingStatus(booking?.booking_status);

export const cleanDispatcherAction = (action) => {
    if (typeof action !== "string") return action || "";
    if (action.startsWith(PLOT_DISPATCH_ACTIVE_PREFIX)) {
        return action.slice(PLOT_DISPATCH_ACTIVE_PREFIX.length);
    }
    return action;
};

export const PLOT_DISPATCH_SOCKET_EVENTS = {
    STATUS: "plot-dispatch-status",
    STARTED: "plot-dispatch-started",
    BACKUP_ADVANCED: "plot-dispatch-backup-advanced",
    DRIVER_REJECTED: "plot-dispatch-driver-rejected",
    ACCEPTED: "plot-dispatch-accepted",
    EXHAUSTED: "plot-dispatch-exhausted",
    MANUAL_REQUIRED: "manual-dispatch-required",
    FAILED: "plot-dispatch-failed",
};

export const PLOT_DISPATCH_PHASES = {
    PRIMARY: "primary",
    BACKUP: "backup",
    ACCEPTED: "accepted",
    EXHAUSTED: "exhausted",
};

export const parsePlotDispatchPayload = (raw) => {
    if (!raw) return null;
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw);
        } catch {
            return { message: raw };
        }
    }
    return raw;
};

export const getPlotDispatchBookingId = (payload) => {
    if (!payload) return null;
    return (
        payload.booking_id ??
        payload.bookingId ??
        payload.booking?.id ??
        payload.id ??
        null
    );
};

const normalizeDriverList = (drivers) => {
    if (!Array.isArray(drivers)) return [];
    return drivers
        .filter(Boolean)
        .map((driver) => ({
            id: driver.id ?? driver.driver_id,
            name: driver.name ?? driver.driver_name ?? `Driver ${driver.id ?? driver.driver_id ?? ""}`,
        }));
};

const normalizePlotChain = (chain) => {
    if (!Array.isArray(chain)) return [];
    return chain
        .filter(Boolean)
        .map((plot) => ({
            id: plot.id ?? plot.plot_id,
            name: plot.name ?? plot.plot_name ?? (plot.id ? `Plot #${plot.id}` : "Plot"),
            type: plot.type ?? plot.plot_type ?? "primary",
            visited: Boolean(plot.visited),
        }));
};

const toTimestampMs = (value) => {
    if (value == null || value === "") return null;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
        return numeric > 0 && numeric < 10000000000 ? numeric * 1000 : numeric;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
};

export const normalizePlotDispatchStatus = (payload, { eventName } = {}) => {
    const parsed = parsePlotDispatchPayload(payload);
    if (!parsed) return null;

    const bookingId = getPlotDispatchBookingId(parsed);
    const phase = String(
        parsed.phase ??
        parsed.plot_dispatch_phase ??
        parsed.status?.phase ??
        ""
    ).toLowerCase();

    const explicitActive = typeof parsed.active === "boolean"
        ? parsed.active
        : (parsed.active == null ? null : Boolean(Number(parsed.active)));

    const expiresInSeconds = Number(
        parsed.expires_in_seconds ??
        parsed.expiresInSeconds ??
        parsed.timer_seconds
    );

    const receivedAt = toTimestampMs(parsed.receivedAt ?? parsed.received_at) ?? Date.now();
    const explicitExpiresAt = toTimestampMs(
        parsed.expiresAt ??
        parsed.expires_at ??
        parsed.offer_expires_at ??
        parsed.offerExpiresAt
    );
    const expiresAt = explicitExpiresAt ??
        (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
            ? receivedAt + expiresInSeconds * 1000
            : null);

    return {
        booking_id: bookingId,
        active: explicitActive ?? null,
        phase,
        eventName: eventName || parsed.eventName || null,
        current_plot_id: parsed.current_plot_id ?? parsed.currentPlotId ?? null,
        current_plot_name: parsed.current_plot_name ?? parsed.currentPlotName ?? null,
        plot_chain: normalizePlotChain(parsed.plot_chain ?? parsed.plotChain),
        pending_drivers: normalizeDriverList(parsed.pending_drivers ?? parsed.pendingDrivers),
        rejected_drivers: normalizeDriverList(parsed.rejected_drivers ?? parsed.rejectedDrivers),
        expires_in_seconds: Number.isFinite(expiresInSeconds) ? expiresInSeconds : null,
        expiresAt,
        receivedAt,
        dispatcher_action: parsed.dispatcher_action ?? parsed.dispatcherAction ?? null,
        message: parsed.message ?? null,
        booking: parsed.booking ?? null,
        highlight_booking_id: parsed.highlight_booking_id ?? parsed.highlightBookingId ?? null,
    };
};

export const getBookingPlotDispatchStatus = (booking, statusById = {}) => {
    if (!booking?.id) return null;
    const tracked = statusById[booking.id];
    if (tracked) return tracked;
    if (booking.plot_dispatch_status) {
        return normalizePlotDispatchStatus({
            ...booking.plot_dispatch_status,
            booking_id: booking.id,
            dispatcher_action: booking.dispatcher_action,
        });
    }
    return null;
};

export const isPlotDispatchPhaseActive = (phase) => {
    const normalized = String(phase || "").toLowerCase();
    return normalized === PLOT_DISPATCH_PHASES.PRIMARY || normalized === PLOT_DISPATCH_PHASES.BACKUP;
};

export const isPlotDispatchPhaseTerminal = (phase) => {
    const normalized = String(phase || "").toLowerCase();
    return (
        normalized === PLOT_DISPATCH_PHASES.ACCEPTED ||
        normalized === PLOT_DISPATCH_PHASES.EXHAUSTED
    );
};

export const isPlotDispatchStatusActive = (status) => {
    if (!status) return false;
    if (isPlotDispatchPhaseActive(status.phase)) return true;
    const action = status.dispatcher_action || "";
    return typeof action === "string" && action.startsWith(PLOT_DISPATCH_ACTIVE_PREFIX);
};

const normalizePollDispatchStatusForPolling = (status) => {
    if (!status) return null;
    if (typeof status.active === "boolean") return status;
    if (status.active === false) return { ...status, active: false };
    const normalized = normalizePlotDispatchStatus(status);
    return normalized && typeof normalized.active === "boolean"
        ? normalized
        : { ...normalized, active: null };
};

export const isPlotDispatchStatusExhausted = (status) => {
    if (!status) return false;
    if (String(status.phase || "").toLowerCase() === PLOT_DISPATCH_PHASES.EXHAUSTED) return true;
    return /no driver accepted|available for manual|all plots exhausted|plot dispatch failed/i.test(
        status.dispatcher_action || status.message || ""
    );
};

export const getPlotDispatchSecondsRemaining = (status, now = Date.now()) => {
    if (!status) return null;
    const expiresAt = toTimestampMs(status.expiresAt);
    if (expiresAt) {
        return Math.max(0, Math.ceil((expiresAt - now) / 1000));
    }
    if (Number.isFinite(status.expires_in_seconds)) {
        const receivedAt = toTimestampMs(status.receivedAt) ?? now;
        const elapsed = Math.floor((now - receivedAt) / 1000);
        return Math.max(0, status.expires_in_seconds - elapsed);
    }
    return null;
};

export const formatPlotLabel = (status) => {
    if (!status) return "";
    if (status.current_plot_name) return status.current_plot_name;
    if (status.current_plot_id != null) return `Plot #${status.current_plot_id}`;
    return "Plot";
};

export const formatPlotDispatchProgressMessage = (status, { now = Date.now() } = {}) => {
    if (!status) return "";

    const phase = String(status.phase || "").toLowerCase();
    const plotLabel = formatPlotLabel(status);
    const pendingCount = status.pending_drivers?.length ?? 0;
    const seconds = getPlotDispatchSecondsRemaining(status, now);

    if (phase === PLOT_DISPATCH_PHASES.ACCEPTED) {
        const acceptedDriver =
            status.booking?.driverDetail?.name ||
            status.pending_drivers?.[0]?.name ||
            status.message;
        return acceptedDriver
            ? `Accepted by ${acceptedDriver}`
            : "Driver accepted plot dispatch";
    }

    if (phase === PLOT_DISPATCH_PHASES.EXHAUSTED || isPlotDispatchStatusExhausted(status)) {
        return "No driver accepted — available for manual dispatch";
    }

    if (phase === PLOT_DISPATCH_PHASES.BACKUP) {
        const timer = seconds != null ? ` — ${seconds}s remaining` : "";
        return `Moving to backup ${plotLabel}${timer}`;
    }

    if (phase === PLOT_DISPATCH_PHASES.PRIMARY || isPlotDispatchStatusActive(status)) {
        const driverPart = pendingCount
            ? `Broadcasting to ${pendingCount} driver${pendingCount === 1 ? "" : "s"} in ${plotLabel}`
            : `Broadcasting in ${plotLabel}`;
        const timer = seconds != null ? ` — ${seconds}s remaining` : "";
        return `${driverPart}${timer}`;
    }

    if (status.dispatcher_action) return cleanDispatcherAction(status.dispatcher_action);
    if (status.message) return status.message;
    return "";
};

export const mergePlotDispatchIntoBooking = (booking, status) => {
    if (!booking || !status) return booking;

    const normalizedPhase = String(status?.phase || "").toLowerCase();
    const incomingBooking = status.booking || {};
    const mergedBase = {
        ...booking,
        ...incomingBooking,
        ...(normalizedPhase === "accepted" ? { booking_status: "ongoing" } : {}),
    };
    if (isTerminalBooking(mergedBase)) {
        return {
            ...mergedBase,
            dispatcher_action: cleanDispatcherAction(mergedBase.dispatcher_action),
            plot_dispatch_status: null,
        };
    }

    const progressMessage = formatPlotDispatchProgressMessage(status);
    const dispatcher_action =
        status.dispatcher_action ||
        (progressMessage && isPlotDispatchStatusActive(status)
            ? `${PLOT_DISPATCH_ACTIVE_PREFIX}${progressMessage}`
            : progressMessage) ||
        booking.dispatcher_action;

    return {
        ...booking,
        ...incomingBooking,
        dispatcher_action,
        plot_dispatch_status: {
            ...(booking.plot_dispatch_status || {}),
            phase: status.phase,
            current_plot_id: status.current_plot_id,
            current_plot_name: status.current_plot_name,
            plot_chain: status.plot_chain,
            pending_drivers: status.pending_drivers,
            rejected_drivers: status.rejected_drivers,
            expires_in_seconds: status.expires_in_seconds,
            expiresAt: status.expiresAt,
            receivedAt: status.receivedAt,
        },
    };
};

export const shouldPollPlotDispatchStatus = (booking, statusById = {}) => {
    if (!booking?.id) return false;
    const bookingStatus = String(booking?.booking_status || "").toLowerCase();
    if (["ongoing", "pending_acceptance", "arrived", "started", "completed", "cancelled", "no_show"].includes(bookingStatus)) {
        return false;
    }

    const tracked = normalizePollDispatchStatusForPolling(statusById[booking.id]);
    if (tracked) {
        if (tracked.active === false) return false;
        if (isPlotDispatchPhaseTerminal(tracked.phase)) return false;
        if (isPlotDispatchStatusExhausted(tracked)) return false;
        return isPlotDispatchStatusActive(tracked) || false;
    }

    const known = normalizePollDispatchStatusForPolling(booking.plot_dispatch_status);
    if (known) {
        if (known.active === false) return false;
        if (isPlotDispatchPhaseTerminal(known.phase)) return false;
        if (isPlotDispatchStatusExhausted(known)) return false;
        if (isPlotDispatchStatusActive(known)) return true;
        return isPlotDispatchPhaseActive(known.phase) || false;
    }

    if (isPlotDispatchInProgress(booking)) {
        return !isTerminalBooking(booking);
    }

    if (isPlotDispatchExhausted(booking)) {
        return false;
    }

    return false;
};

export const inferPhaseFromEvent = (eventName, payload) => {
    const explicit = String(payload?.phase || "").toLowerCase();
    if (explicit) return explicit;

    switch (eventName) {
        case PLOT_DISPATCH_SOCKET_EVENTS.STARTED:
            return PLOT_DISPATCH_PHASES.PRIMARY;
        case PLOT_DISPATCH_SOCKET_EVENTS.BACKUP_ADVANCED:
            return PLOT_DISPATCH_PHASES.BACKUP;
        case PLOT_DISPATCH_SOCKET_EVENTS.ACCEPTED:
            return PLOT_DISPATCH_PHASES.ACCEPTED;
        case PLOT_DISPATCH_SOCKET_EVENTS.EXHAUSTED:
        case PLOT_DISPATCH_SOCKET_EVENTS.MANUAL_REQUIRED:
        case PLOT_DISPATCH_SOCKET_EVENTS.FAILED:
            return PLOT_DISPATCH_PHASES.EXHAUSTED;
        case PLOT_DISPATCH_SOCKET_EVENTS.DRIVER_REJECTED:
            return payload?.current_plot_id ? PLOT_DISPATCH_PHASES.PRIMARY : PLOT_DISPATCH_PHASES.BACKUP;
        default:
            return "";
    }
};
