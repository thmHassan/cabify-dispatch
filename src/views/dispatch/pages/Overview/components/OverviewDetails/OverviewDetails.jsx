import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import CardContainer from "../../../../../../components/shared/CardContainer";
import SearchBar from "../../../../../../components/shared/SearchBar/SearchBar";
import CustomSelect from "../../../../../../components/ui/CustomSelect";
import Pagination from "../../../../../../components/ui/Pagination/Pagination";
import { useSocket, useSocketStatus } from "../../../../../../components/routes/SocketProvider";
import { getBookings, getPlotDispatchStatus, startAutoDispatch } from "../../../../../../services/AddBookingServices";
import { apiGetSubCompany } from "../../../../../../services/SubCompanyServices";
import { OVERVIEW_STATUS_OPTIONS } from "../../../../../../constants/selectOptions";
import {
    filterBookingsForOverviewTab,
    mergeBookingsById,
    shouldShowBookingInOverviewTab,
} from "../../../../../../utils/functions/bookingDateFilter";
import { formatBookingDate, formatCurrency, formatPickupTime, formatReminderLabel } from "../../../../../../utils/functions/formatters";
import { useNavigate } from "react-router-dom";
import StatusMenu from "./StatusMenu";
import AllocateDriverModal from "./AllocateDriverModal";
import AppLogoLoader from "../../../../../../components/shared/AppLogoLoader";
import DriverAssignmentModal from "./DriverAssignmentModal";
import EditableBookingRow, { isEditableOverviewTab } from "./EditableBookingRow";
import {
    NEAREST_DISPATCH_FAILURE_FALLBACK,
    sanitizeNearestDispatchMessage,
} from "../../../../../../utils/notifications/nearestDispatchMessages";
import {
    PLOT_DISPATCH_FAILURE_FALLBACK,
    sanitizePlotDispatchMessage,
} from "../../../../../../utils/notifications/plotDispatchMessages";
import FollowOnJobModal from "./Followonjobmodal";
import PlotDispatchActiveStrip from "./PlotDispatchActiveStrip";
import PlotDispatchStatusPanel from "./PlotDispatchStatusPanel";
import {
    cleanDispatcherAction,
    formatPlotDispatchProgressMessage,
    getPlotDispatchBookingId,
    inferPhaseFromEvent,
    isPlotDispatchPhaseActive,
    isPlotDispatchPhaseTerminal,
    isPlotDispatchStatusActive,
    isTerminalBooking,
    mergePlotDispatchIntoBooking,
    normalizePlotDispatchStatus,
    PLOT_DISPATCH_SOCKET_EVENTS,
    parsePlotDispatchPayload,
    shouldPollPlotDispatchStatus,
} from "../../../../../../utils/plotDispatch/plotDispatchStatus";
import { getDispatcherName } from "../../../../../../utils/auth";
import { useResolvedBookingLocations } from "../../../../../../hooks/useResolvedBookingLocations";
import toast from "react-hot-toast";

const statusColor = {
    pending: "text-orange-500",
    pending_acceptance: "text-yellow-500",
    unassigned: "text-amber-600",
    ongoing: "text-blue-500",
    arrived: "text-purple-500",
    started: "text-cyan-500",
    completed: "text-green-600",
    cancelled: "text-red-500",
    no_show: "text-gray-500",
};

const Col = ({ w, children, className = "" }) => (
    <div className={`px-4 py-3 flex-shrink-0 ${w} ${className}`}>{children}</div>
);

const PENDING_BOOKINGS_STORAGE_KEY = "dispatch_overview_pending_bookings";

const normalizeBookingEventPayload = (payload = {}, fallbackStatus = null) => {
    const booking = payload?.booking && typeof payload.booking === "object" ? payload.booking : {};
    const status = payload?.booking_status || payload?.status || booking?.booking_status || fallbackStatus;
    const id = booking?.id ?? payload?.id ?? payload?.booking_id_numeric ?? (
        Number.isFinite(Number(payload?.booking_id)) ? Number(payload.booking_id) : null
    );
    const publicBookingId = booking?.booking_id ?? payload?.booking_reference ?? (
        Number.isFinite(Number(payload?.booking_id)) ? null : payload?.booking_id
    );

    return {
        ...booking,
        ...(id != null ? { id } : {}),
        ...(publicBookingId ? { booking_id: publicBookingId } : {}),
        ...(status ? { booking_status: status } : {}),
    };
};

const sameBookingIdentity = (booking, eventBooking) => {
    if (!booking || !eventBooking) return false;
    const bookingId = booking.id != null ? String(booking.id) : null;
    const eventId = eventBooking.id != null ? String(eventBooking.id) : null;
    if (bookingId && eventId && bookingId === eventId) return true;

    const publicId = booking.booking_id != null ? String(booking.booking_id) : null;
    const eventPublicId = eventBooking.booking_id != null ? String(eventBooking.booking_id) : null;
    return Boolean(publicId && eventPublicId && publicId === eventPublicId);
};

const mergeBookingEvent = (current, eventBooking) => {
    if (!current) {
        return isTerminalBooking(eventBooking)
            ? {
                ...eventBooking,
                dispatcher_action: cleanDispatcherAction(eventBooking?.dispatcher_action),
                plot_dispatch_status: null,
            }
            : eventBooking;
    }

    const currentIsTerminal = isTerminalBooking(current);
    const nextIsTerminal = isTerminalBooking(eventBooking);

    if (currentIsTerminal && !nextIsTerminal) {
        return {
            ...current,
            dispatcher_action: cleanDispatcherAction(current.dispatcher_action),
            plot_dispatch_status: null,
        };
    }

    const merged = { ...current, ...eventBooking };
    return isTerminalBooking(merged)
        ? {
            ...merged,
            dispatcher_action: cleanDispatcherAction(merged.dispatcher_action),
            plot_dispatch_status: null,
        }
        : merged;
};

const mergeBookingCollections = (current = [], incoming = []) => {
    const next = (current || []).filter(Boolean);

    (incoming || []).filter(Boolean).forEach((incomingBooking) => {
        const existingIndex = next.findIndex((booking) =>
            sameBookingIdentity(booking, incomingBooking)
        );

        if (existingIndex === -1) {
            next.push(incomingBooking);
            return;
        }

        next[existingIndex] = mergeBookingEvent(next[existingIndex], incomingBooking);
    });

    return next;
};

const getBookingNotificationId = (data = {}) => {
    const booking = data.booking || {};
    return (
        data.booking_id ||
        data.bookingId ||
        data.booking_reference ||
        booking.id ||
        booking.booking_id ||
        null
    );
};

const buildAssignmentNotificationKey = (data = {}) => {
    const bookingId = getBookingNotificationId(data);
    if (!bookingId) return null;
    return [
        data.database || data.booking?.database || "tenant",
        data.type || data.status || data.booking_status || data.booking?.booking_status || "default",
        bookingId,
    ].join(":");
};

const resolveDriverName = (data = {}) => (
    data.driver_name ||
    data.driverName ||
    data.booking?.driverDetail?.name ||
    data.booking?.driver_name ||
    data.booking?.driver?.name ||
    null
);

const loadPendingBookingsFromStorage = () => {
    try {
        const raw = sessionStorage.getItem(PENDING_BOOKINGS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return [];
    }
};

const savePendingBookingsToStorage = (bookings) => {
    try {
        if (!bookings?.length) {
            sessionStorage.removeItem(PENDING_BOOKINGS_STORAGE_KEY);
            return;
        }

        sessionStorage.setItem(PENDING_BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    } catch {
        // ignore storage errors
    }
};

const normalizeOverviewSelectValue = (value) => {
    if (value == null) return "";
    const normalized = String(value).trim();
    if (!normalized || normalized === "all" || normalized === "All Status" || normalized === "All Sub Companies") {
        return "";
    }
    return normalized;
};

const OverViewDetails = ({
    filter,
    externalRefreshTrigger = 0,
    seedBookings = [],
    onSeedConsumed,
    onOpenEditBooking,
    nearestDriverDispatchEnabled = false,
    plotBasedDispatchEnabled = false,
}) => {
    const navigate = useNavigate();
    const overviewTabOptions = useMemo(() => ({
        nearestDriverDispatchEnabled,
        plotBasedDispatchEnabled,
    }), [nearestDriverDispatchEnabled, plotBasedDispatchEnabled]);
    const applyTabFilter = useCallback(
        (bookings) => filterBookingsForOverviewTab((bookings || []).filter(Boolean), filter, overviewTabOptions),
        [filter, overviewTabOptions]
    );
    const [openMenu, setOpenMenu] = useState(null);
    const [showAllocateModal, setShowAllocateModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showFollowOnModal, setShowFollowOnModal] = useState(false);
    const [followOnSourceBooking, setFollowOnSourceBooking] = useState(null);
    const socket = useSocket();
    const isSocketConnected = useSocketStatus();
    const [bookings, setBookings] = useState([]);
    const { getLocationDisplay } = useResolvedBookingLocations(bookings);
    const buttonRefs = useRef({});
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedSubCompany, setSelectedSubCompany] = useState("");
    const [subCompanyList, setSubCompanyList] = useState([]);
    const [loadingSubCompanies, setLoadingSubCompanies] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [assignmentNotifications, setAssignmentNotifications] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [plotDispatchStatusById, setPlotDispatchStatusById] = useState({});
    const [highlightedBookingId, setHighlightedBookingId] = useState(null);
    const [plotDispatchPanel, setPlotDispatchPanel] = useState(null);
    const pendingSeedBookingsRef = useRef(loadPendingBookingsFromStorage());
    const bookingsRef = useRef([]);
    const latestFetchKeyRef = useRef("");
    const hasCompletedInitialFetchRef = useRef(false);
    const highlightTimeoutRef = useRef(null);
    const plotDispatchEndpointUnavailableRef = useRef(false);

    useEffect(() => {
        bookingsRef.current = bookings;
    }, [bookings]);

    const clearHighlightLater = useCallback((bookingId, delayMs = 12000) => {
        if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = setTimeout(() => {
            setHighlightedBookingId((current) =>
                Number(current) === Number(bookingId) ? null : current
            );
        }, delayMs);
    }, []);

    const clearPlotDispatchForBooking = useCallback((bookingOrId) => {
        const bookingId = typeof bookingOrId === "object" ? bookingOrId?.id : bookingOrId;
        if (bookingId == null) return;

        setPlotDispatchStatusById((prev) => {
            if (!prev?.[bookingId]) return prev;
            const next = { ...prev };
            delete next[bookingId];
            return next;
        });

        setPlotDispatchPanel((current) =>
            Number(current?.booking?.id) === Number(bookingId) ? null : current
        );

        setHighlightedBookingId((current) =>
            Number(current) === Number(bookingId) ? null : current
        );
    }, []);

    const applyBookingEvent = useCallback((payload, fallbackStatus = null, { addIfMissing = false } = {}) => {
        const eventBooking = normalizeBookingEventPayload(payload, fallbackStatus);
        if (!eventBooking.id && !eventBooking.booking_id) return;

        if (isTerminalBooking(eventBooking)) {
            clearPlotDispatchForBooking(eventBooking);
        }

        setBookings((prev) => {
            const safe = prev.filter(Boolean);
            let found = false;
            const next = safe.map((booking) => {
                if (!sameBookingIdentity(booking, eventBooking)) return booking;
                found = true;
                return mergeBookingEvent(booking, eventBooking);
            });

            if (!found && addIfMissing) {
                next.unshift(mergeBookingEvent(null, eventBooking));
            }

            return applyTabFilter(next);
        });
    }, [applyTabFilter, clearPlotDispatchForBooking]);

    useEffect(() => {
        if (seedBookings?.length) {
            const mergedSeeds = mergeBookingsById(pendingSeedBookingsRef.current, seedBookings);
            pendingSeedBookingsRef.current = mergedSeeds;
            savePendingBookingsToStorage(mergedSeeds);
        }
    }, [seedBookings]);

    const splitPendingSeeds = useCallback((fetchedBookings = []) => {
        const pendingSeeds = pendingSeedBookingsRef.current || [];
        if (!pendingSeeds.length) {
            return { relevantSeeds: [], remainingSeeds: [] };
        }

        const fetchedIds = new Set(
            (fetchedBookings || [])
                .map((booking) => booking?.id)
                .filter((id) => id != null)
                .map((id) => String(id))
        );

        const relevantSeeds = pendingSeeds.filter((booking) =>
            shouldShowBookingInOverviewTab(booking, filter, overviewTabOptions)
        );

        const remainingSeeds = pendingSeeds.filter((booking) => {
            const bookingId = booking?.id;
            if (bookingId == null) {
                return true;
            }

            return !fetchedIds.has(String(bookingId));
        });

        return { relevantSeeds, remainingSeeds };
    }, [filter, overviewTabOptions]);

    useEffect(() => {
        if (!seedBookings?.length) return;

        const relevantSeeds = seedBookings.filter((booking) =>
            shouldShowBookingInOverviewTab(booking, filter, overviewTabOptions)
        );

        if (!relevantSeeds.length) return;

        setBookings((prev) => applyTabFilter(mergeBookingsById(prev, relevantSeeds)));
    }, [seedBookings, filter, overviewTabOptions, applyTabFilter]);

    const showNotification = useCallback((data) => {
        const notificationKey = buildAssignmentNotificationKey(data);
        const id = notificationKey || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const normalized = {
            ...data,
            id,
            notificationKey,
            driver_name: resolveDriverName(data),
        };

        setAssignmentNotifications((prev) => {
            if (!notificationKey) return [...prev, normalized];
            const existingIndex = prev.findIndex((notification) => notification.notificationKey === notificationKey);
            if (existingIndex === -1) return [...prev, normalized];
            const next = [...prev];
            next[existingIndex] = { ...next[existingIndex], ...normalized };
            return next;
        });
    }, []);

    const handleCloseNotification = useCallback((id) => {
        setAssignmentNotifications((prev) => prev.filter((notification) => notification.id !== id));
    }, []);

    const applyPlotDispatchUpdate = useCallback((rawPayload, eventName) => {
        const parsed = parsePlotDispatchPayload(rawPayload);
        if (!parsed) return null;

        const phase = inferPhaseFromEvent(eventName, parsed);
        const status = normalizePlotDispatchStatus(
            { ...parsed, phase: phase || parsed.phase, eventName },
            { eventName }
        );
        const bookingId = getPlotDispatchBookingId(status);
        if (!bookingId) return null;

        const currentBooking = bookingsRef.current.find((b) => Number(b?.id) === Number(bookingId));
        const incomingBooking = status.booking || parsed.booking || null;
        if (isTerminalBooking(currentBooking) || isTerminalBooking(incomingBooking)) {
            clearPlotDispatchForBooking(bookingId);
            return status;
        }

        setPlotDispatchStatusById((prev) => ({
            ...prev,
            [bookingId]: {
                ...(prev[bookingId] || {}),
                ...status,
                booking_id: bookingId,
            },
        }));

        const mergedBooking = status.booking
            ? mergePlotDispatchIntoBooking(status.booking, status)
            : null;

        setBookings((prev) => {
            const safe = prev.filter(Boolean);
            const exists = safe.some((b) => Number(b.id) === Number(bookingId));

            if (mergedBooking) {
                if (isTerminalBooking(mergedBooking)) {
                    clearPlotDispatchForBooking(bookingId);
                    return applyTabFilter(
                        safe.map((b) =>
                            Number(b.id) === Number(bookingId)
                                ? mergeBookingEvent(b, mergedBooking)
                                : b
                        )
                    );
                }

                if (!exists) {
                    return shouldShowBookingInOverviewTab(mergedBooking, filter, overviewTabOptions)
                        ? applyTabFilter([mergedBooking, ...safe])
                        : safe;
                }
                return applyTabFilter(
                    safe.map((b) =>
                        Number(b.id) === Number(bookingId)
                            ? mergeBookingEvent(b, mergePlotDispatchIntoBooking({ ...b, ...mergedBooking }, status))
                            : b
                    )
                );
            }

            if (!exists) return safe;

            return applyTabFilter(
                safe.map((b) =>
                    Number(b.id) === Number(bookingId)
                        ? mergeBookingEvent(b, mergePlotDispatchIntoBooking(b, status))
                        : b
                )
            );
        });

        if (status.highlight_booking_id) {
            setHighlightedBookingId(status.highlight_booking_id);
            clearHighlightLater(status.highlight_booking_id);
        }

        if (phase === "exhausted" || eventName === PLOT_DISPATCH_SOCKET_EVENTS.MANUAL_REQUIRED) {
            setHighlightedBookingId(bookingId);
            clearHighlightLater(bookingId);
            setRefreshTrigger((prev) => prev + 1);
        }

        if (phase === "accepted" || eventName === PLOT_DISPATCH_SOCKET_EVENTS.ACCEPTED) {
            setPlotDispatchStatusById((prev) => {
                const next = { ...prev };
                delete next[bookingId];
                return next;
            });
            showNotification({
                booking_id: bookingId,
                booking: mergedBooking,
                driver_name:
                    mergedBooking?.driverDetail?.name ||
                    parsed.driver_name ||
                    status.pending_drivers?.[0]?.name,
                message:
                    formatPlotDispatchProgressMessage(status) ||
                    parsed.message ||
                    "Driver accepted plot dispatch",
                type: "accepted",
                status: "ongoing",
            });
        }

        if (isPlotDispatchPhaseTerminal(phase) && phase !== "accepted") {
            setPlotDispatchPanel((current) =>
                current?.booking?.id === bookingId
                    ? { booking: mergedBooking || current.booking, status }
                    : current
            );
        }

        return status;
    }, [applyTabFilter, clearHighlightLater, clearPlotDispatchForBooking, filter, overviewTabOptions, showNotification]);

    const syncPlotDispatchStatus = useCallback(async (bookingId, { force = false } = {}) => {
        if (!bookingId || !plotBasedDispatchEnabled) return null;
        if (!force && plotDispatchEndpointUnavailableRef.current) return null;

        const booking = bookingsRef.current.find((b) => Number(b.id) === Number(bookingId));
        if (!force && booking && !shouldPollPlotDispatchStatus(booking, plotDispatchStatusById)) {
            return null;
        }

        try {
            const res = await getPlotDispatchStatus(bookingId);
            const payload = res?.data?.data ?? res?.data;
            if (!payload) return null;
            return applyPlotDispatchUpdate(payload, PLOT_DISPATCH_SOCKET_EVENTS.STATUS);
        } catch (error) {
            const status = error?.response?.status;
            const body = error?.response?.data;
            const isMissingRoute =
                status === 404 &&
                typeof body === "string" &&
                body.includes("Cannot GET");

            if (isMissingRoute) {
                plotDispatchEndpointUnavailableRef.current = true;
                console.warn(
                    "Plot dispatch status endpoint is not available on socket-api; relying on socket events only."
                );
                return null;
            }

            if (status === 404) {
                return null;
            }

            console.warn(`Plot dispatch status poll failed for booking ${bookingId}:`, error.message);
            return null;
        }
    }, [applyPlotDispatchUpdate, plotBasedDispatchEnabled, plotDispatchStatusById]);

    const handleOpenPlotDispatchPanel = useCallback((booking, status) => {
        setPlotDispatchPanel({ booking, status });
    }, []);

    const handlePlotDispatchRedispatch = useCallback(async (booking) => {
        if (!booking?.id) return;
        try {
            const dispatcherName = getDispatcherName();
            const res = await startAutoDispatch(booking.id, dispatcherName);
            if (res?.data?.success) {
                toast.success("Plot dispatch restarted");
                setPlotDispatchPanel(null);
                setHighlightedBookingId(null);
                setRefreshTrigger((prev) => prev + 1);
            } else {
                toast.error(res?.data?.message || "Failed to restart dispatch");
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to restart dispatch");
        }
    }, []);

    const activePlotDispatches = useMemo(() => {
        if (!plotBasedDispatchEnabled) return [];
        return Object.values(plotDispatchStatusById)
            .filter((status) => isPlotDispatchStatusActive(status))
            .map((status) => {
                const booking =
                    bookings.find((b) => Number(b.id) === Number(status.booking_id)) ||
                    status.booking ||
                    { id: status.booking_id };
                return { booking, status };
            })
            .filter(({ booking }) => !isTerminalBooking(booking));
    }, [bookings, plotBasedDispatchEnabled, plotDispatchStatusById]);

    useEffect(() => {
        const fetchSubCompanies = async () => {
            setLoadingSubCompanies(true);
            try {
                const response = await apiGetSubCompany();
                if (response?.data?.success === 1) {
                    const companies = response?.data?.list?.data || [];
                    const options = [
                        { value: "", label: "All Sub Companies" },
                        ...companies.map(company => ({ label: company.name, value: company.id.toString() }))
                    ];
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

    const onSeedConsumedRef = useRef(onSeedConsumed);
    useEffect(() => {
        onSeedConsumedRef.current = onSeedConsumed;
    }, [onSeedConsumed]);

    useEffect(() => {
        setPage(1);
    }, [filter]);

    useEffect(() => {
        const normalizedStatus = normalizeOverviewSelectValue(selectedStatus);
        const normalizedSubCompany = normalizeOverviewSelectValue(selectedSubCompany);
        const requestKey = JSON.stringify({
            page,
            limit,
            search,
            status: normalizedStatus,
            sub_company: normalizedSubCompany,
            filter,
            refreshTrigger,
            externalRefreshTrigger,
        });
        latestFetchKeyRef.current = requestKey;
        setTableLoading(!hasCompletedInitialFetchRef.current && bookingsRef.current.length === 0);
        const fetchBookings = async () => {
            try {
                const params = { page, limit };
                if (search) params.search = search;
                if (normalizedStatus) params.status = normalizedStatus;
                if (normalizedSubCompany) params.sub_company = normalizedSubCompany;
                if (filter) params.filter = filter;

                let res = await getBookings(params);
                const fetchedBookings = res?.data?.success ? (res.data.data || []).filter(Boolean) : [];
                const pagination = res?.data?.pagination || {};
                const totalRows = Number(pagination?.total ?? fetchedBookings.length);
                if (latestFetchKeyRef.current !== requestKey) return;
                if (page > 1 && fetchedBookings.length === 0 && totalRows > 0) {
                    setPage(1);
                    return;
                }
                const hadPendingSeeds = (pendingSeedBookingsRef.current || []).length > 0;
                const { relevantSeeds, remainingSeeds } = splitPendingSeeds(fetchedBookings);
                const fetchedWithSeeds = mergeBookingsById(fetchedBookings, relevantSeeds);
                if (fetchedBookings.length === 0 && totalRows > 0 && bookingsRef.current.length > 0) {
                    setBookings((prev) => applyTabFilter(mergeBookingCollections(prev, relevantSeeds)));
                } else {
                    setBookings(mergeBookingCollections([], fetchedWithSeeds));
                }
                setTotalPages(pagination?.total_pages || 1);
                if (remainingSeeds.length !== (pendingSeedBookingsRef.current || []).length) {
                    pendingSeedBookingsRef.current = remainingSeeds;
                    savePendingBookingsToStorage(remainingSeeds);
                }
                if (hadPendingSeeds && remainingSeeds.length === 0) {
                    onSeedConsumedRef.current?.();
                }
            } catch (error) {
                if (latestFetchKeyRef.current !== requestKey) return;
                console.error("Error fetching booking:", error);
                const { relevantSeeds } = splitPendingSeeds([]);
                setBookings((prev) => applyTabFilter(mergeBookingCollections(prev, relevantSeeds)));
            } finally {
                if (latestFetchKeyRef.current === requestKey) {
                    hasCompletedInitialFetchRef.current = true;
                    setTableLoading(false);
                }
            }
        };
        fetchBookings();
    }, [page, search, selectedStatus, selectedSubCompany, filter, refreshTrigger, externalRefreshTrigger, applyTabFilter, splitPendingSeeds]);

    useEffect(() => {
        if (!plotBasedDispatchEnabled || plotDispatchEndpointUnavailableRef.current) return undefined;

        const candidates = bookingsRef.current.filter((booking) =>
            shouldPollPlotDispatchStatus(booking, plotDispatchStatusById)
        );

        candidates.slice(0, 5).forEach((booking) => {
            syncPlotDispatchStatus(booking.id);
        });
    }, [bookings, plotBasedDispatchEnabled, plotDispatchStatusById, refreshTrigger, externalRefreshTrigger, syncPlotDispatchStatus]);

    useEffect(() => {
        if (!plotBasedDispatchEnabled || !isSocketConnected) return undefined;

        const activeIds = Object.entries(plotDispatchStatusById)
            .filter(([, status]) => isPlotDispatchStatusActive(status))
            .map(([bookingId]) => bookingId);

        if (!activeIds.length) return undefined;

        const pollActiveStatuses = () => {
            activeIds.forEach((bookingId) => syncPlotDispatchStatus(bookingId));
        };

        pollActiveStatuses();
        const interval = setInterval(pollActiveStatuses, 15000);
        return () => clearInterval(interval);
    }, [isSocketConnected, plotBasedDispatchEnabled, plotDispatchStatusById, syncPlotDispatchStatus]);

    useEffect(() => () => {
        if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (!socket) return;

        const safeMap = (prev, mapFn) =>
            prev.filter(Boolean).map(mapFn).filter(Boolean);


        const handleNewBooking = (booking) => {
            console.log("new-booking-event:", booking);
            if (!booking || booking.id == null) return;
            if (!shouldShowBookingInOverviewTab(booking, filter, overviewTabOptions)) return;

            setBookings((prev) => {
                const safe = prev.filter(Boolean);
                if (safe.find((b) => b.id === booking.id)) return safe;
                return [booking, ...safe];
            });

            if (
                plotBasedDispatchEnabled &&
                !booking.driver &&
                !booking.pending_driver_id &&
                booking.booking_status === "pending"
            ) {
                if (booking.plot_dispatch_status || booking.dispatcher_action) {
                    applyPlotDispatchUpdate(
                        { booking, ...(booking.plot_dispatch_status || {}) },
                        PLOT_DISPATCH_SOCKET_EVENTS.STARTED
                    );
                } else {
                    syncPlotDispatchStatus(booking.id, { force: true });
                }
            }
        };

        const mapBookings = (prev, mapFn) => applyTabFilter(safeMap(prev, mapFn));

        const handleDriverAssignmentPending = (data) => {
            console.log("driver-assignment-pending:", data);
            const updatedBooking = data?.booking ?? null;
            if (updatedBooking?.id) {
                setBookings((prev) =>
                    mapBookings(prev, (b) => b.id === updatedBooking.id ? updatedBooking : b)
                );
            }
            showNotification(data);
        };

        const handleJobAccepted = (data) => {
            console.log("job-accepted-by-driver:", data);
            if (!data?.booking_id) return;
            applyBookingEvent(data, "ongoing");
            showNotification({
                booking_id: data.booking_id,
                booking: data.booking,
                driver_name: resolveDriverName(data),
                message: data.message,
                type: "accepted",
                status: "ongoing",
            });
        };

        const handleJobRejected = (data) => {
            console.log("job-rejected-by-driver:", data);
            if (!data?.booking_id) return;
            applyBookingEvent(data, data?.booking_status || data?.booking?.booking_status || "pending");
            showNotification({
                booking_id: data.booking_id,
                booking: data.booking,
                driver_name: resolveDriverName(data),
                message: data.message,
                type: "cancelled",
            });
        };

        const updateBookingFromDispatchFailure = (data) => {
            const updatedBooking = data?.booking ?? null;
            const bookingId = data?.booking_id || data?.bookingId || updatedBooking?.id;

            if (updatedBooking?.id) {
                setBookings((prev) => {
                    const safe = prev.filter(Boolean);
                    const existing = safe.find((b) => b.id === updatedBooking.id);

                    if (isTerminalBooking(existing)) {
                        return applyTabFilter(safe);
                    }

                    if (!existing) {
                        return shouldShowBookingInOverviewTab(updatedBooking, filter, overviewTabOptions)
                            ? [updatedBooking, ...safe]
                            : safe;
                    }

                    return applyTabFilter(
                        safe.map((b) =>
                            b.id === updatedBooking.id ? mergeBookingEvent(b, updatedBooking) : b
                        )
                    );
                });
            } else if (bookingId) {
                setRefreshTrigger((prev) => prev + 1);
            } else {
                setRefreshTrigger((prev) => prev + 1);
            }

            return { updatedBooking, bookingId };
        };

        const handleAutoDispatchFailed = (data) => {
            console.log("auto-dispatch-failed:", data);
            if (!data?.booking_id && !data?.booking?.id) return;

            const { updatedBooking, bookingId } = updateBookingFromDispatchFailure(data);

            showNotification({
                booking_id: bookingId || data.booking_id,
                booking: updatedBooking,
                message:
                    data.message ||
                    "Ride not selected during auto dispatch. Please book manually.",
                type: "failed",
            });
        };

        const handleNearestDispatchFailed = (rawData) => {
            console.log("nearest-dispatch-failed:", rawData);
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }

            const { updatedBooking, bookingId } = updateBookingFromDispatchFailure(data);

            showNotification({
                booking_id: bookingId,
                booking: updatedBooking,
                message: sanitizeNearestDispatchMessage(
                    data?.message || data?.reason || NEAREST_DISPATCH_FAILURE_FALLBACK
                ),
                type: "failed",
            });
        };

        const handlePlotDispatchFailed = (rawData) => {
            console.log("plot-dispatch-failed:", rawData);
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }

            applyPlotDispatchUpdate(data, PLOT_DISPATCH_SOCKET_EVENTS.FAILED);
            const { updatedBooking, bookingId } = updateBookingFromDispatchFailure(data);

            showNotification({
                booking_id: bookingId,
                booking: updatedBooking,
                message: sanitizePlotDispatchMessage(
                    data?.message || data?.reason || PLOT_DISPATCH_FAILURE_FALLBACK
                ),
                type: "failed",
            });
        };

        const handlePlotDispatchEvent = (eventName) => (rawData) => {
            console.log(`${eventName}:`, rawData);
            applyPlotDispatchUpdate(rawData, eventName);
        };

        const handleManualDispatchRequired = (rawData) => {
            console.log("manual-dispatch-required:", rawData);
            const status = applyPlotDispatchUpdate(rawData, PLOT_DISPATCH_SOCKET_EVENTS.MANUAL_REQUIRED);
            const bookingId = getPlotDispatchBookingId(parsePlotDispatchPayload(rawData));
            if (bookingId) {
                showNotification({
                    booking_id: bookingId,
                    message:
                        parsePlotDispatchPayload(rawData)?.message ||
                        "No driver accepted — available for manual dispatch",
                    type: "failed",
                });
            }
            return status;
        };

        const handleRefreshBookingsList = (rawData) => {
            const payload = parsePlotDispatchPayload(rawData);
            const highlightId =
                payload?.highlight_booking_id ??
                payload?.highlightBookingId ??
                payload?.booking_id ??
                payload?.bookingId;

            if (highlightId) {
                setHighlightedBookingId(highlightId);
                clearHighlightLater(highlightId);
            }

            if (payload?.booking) {
                applyPlotDispatchUpdate(payload, PLOT_DISPATCH_SOCKET_EVENTS.STATUS);
            }

            setRefreshTrigger((prev) => prev + 1);
        };

        const handleBookingCancelled = (data) => {
            console.log("booking-cancelled:", data);
            if (!data?.booking_id) return;
            applyBookingEvent(data, "cancelled", { addIfMissing: true });
            showNotification({
                booking_id: data.booking_id,
                booking: data.booking,
                driver_name: resolveDriverName(data) || (data.cancelled_by === "user" ? "Customer" : "Admin or Dispatcher"),
                message: data.message || "Booking has been cancelled by customer",
                type: "cancelled",
                status: "cancelled",
            });
        };

        const handleBookingNoShow = (data) => {
            console.log("booking-no-show:", data);
            if (!data?.booking_id) return;
            applyBookingEvent(data, "no_show", { addIfMissing: true });
            showNotification({
                booking_id: data.booking_id,
                booking: data.booking,
                driver_name: resolveDriverName(data),
                message: data.message || "Driver marked the customer as no show",
                type: "no_show",
                status: "no_show",
            });
        };

        const handleFollowOnLinked = (data) => {
            console.log("follow-on-job-linked:", data);
            if (!data?.job1_id) return;
            setBookings((prev) =>
                prev.filter(Boolean).map((b) =>
                    b.id === data.job1_id ? { ...b, follow_on_job_id: data.job2_id } : b
                )
            );
            showNotification({
                booking_id: data.job1_id,
                driver_name: data.driver_name,
                message: data.message,
                type: "default",
            });
        };

        const handleFollowOnSentToDriver = (data) => {
            console.log("follow-on-job-sent-to-driver:", data);
            if (!data?.booking_id) return;
            applyBookingEvent(data, "pending_acceptance");
            showNotification({
                booking_id: data.booking_id,
                driver_name: data.driver_name,
                message: data.message,
                type: "default",
            });
        };

        const handleFollowOnTimeout = (data) => {
            console.log("follow-on-job-timeout:", data);
            if (!data?.booking_id) return;
            applyBookingEvent({ ...data, booking: { ...(data.booking || {}), driver: null, driverDetail: null } }, "pending");
            showNotification({
                booking_id: data.booking_id,
                driver_name: data.driver_name,
                message: data.message || "Driver did not respond to follow-on job — booking reset to pending",
                type: "cancelled",
            });
        };

        const handleFollowOnRemoved = (data) => {
            console.log("follow-on-job-removed:", data);
            if (!data?.booking_id) return;
            setBookings((prev) =>
                prev.filter(Boolean).map((b) =>
                    b.id === parseInt(data.booking_id) ? { ...b, follow_on_job_id: null } : b
                )
            );
        };

        const handleSendReminder = (rawData) => {
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }
            if (!data) return;

            console.log("send-reminder:", data);
            showNotification({
                type: "reminder",
                title: data.title || "Booking Reminder",
                message: data.description || data.message || data.body || "",
                booking_id: data.booking_id,
                booking_reference: data.booking_reference,
                pickup_location: data.pickup_location,
                pickup_time: data.pickup_time,
                booking_date: data.booking_date,
                reminder_minutes: data.reminder_minutes,
            });
        };

        const handleBookingUpdated = (rawData) => {
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }

            const booking = data?.booking ?? data;
            if (!booking?.id) return;

            console.log("booking-updated-event:", booking);
            if (plotBasedDispatchEnabled && !isTerminalBooking(booking) && (booking.plot_dispatch_status || booking.dispatcher_action)) {
                applyPlotDispatchUpdate(
                    { booking, ...(booking.plot_dispatch_status || {}) },
                    PLOT_DISPATCH_SOCKET_EVENTS.STATUS
                );
            }
            applyBookingEvent({ booking }, booking.booking_status, { addIfMissing: true });
        };

        const handleBookingStatusUpdated = (rawData) => {
            let data;
            try {
                data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            } catch {
                data = rawData;
            }
            if (!data) return;
            applyBookingEvent(data, data?.booking_status || data?.status, { addIfMissing: true });
        };

        const handleDashboardCardsUpdate = (data) => {
            console.log("dashboard-cards-update:", data);
        };

        socket.onAny((event, ...args) => {
            console.log(`${event}:`, args);
        });

        const handlePlotDispatchStatus = handlePlotDispatchEvent(PLOT_DISPATCH_SOCKET_EVENTS.STATUS);
        const handlePlotDispatchStarted = handlePlotDispatchEvent(PLOT_DISPATCH_SOCKET_EVENTS.STARTED);
        const handlePlotDispatchBackupAdvanced = handlePlotDispatchEvent(PLOT_DISPATCH_SOCKET_EVENTS.BACKUP_ADVANCED);
        const handlePlotDispatchDriverRejected = handlePlotDispatchEvent(PLOT_DISPATCH_SOCKET_EVENTS.DRIVER_REJECTED);
        const handlePlotDispatchAccepted = handlePlotDispatchEvent(PLOT_DISPATCH_SOCKET_EVENTS.ACCEPTED);
        const handlePlotDispatchExhausted = handlePlotDispatchEvent(PLOT_DISPATCH_SOCKET_EVENTS.EXHAUSTED);

        socket.on("new-booking-event", handleNewBooking);
        socket.on("driver-assignment-pending", handleDriverAssignmentPending);
        socket.on("job-accepted-by-driver", handleJobAccepted);
        socket.on("job-rejected-by-driver", handleJobRejected);
        socket.on("auto-dispatch-failed", handleAutoDispatchFailed);
        socket.on("nearest-dispatch-failed", handleNearestDispatchFailed);
        socket.on("plot-dispatch-failed", handlePlotDispatchFailed);
        socket.on(PLOT_DISPATCH_SOCKET_EVENTS.STATUS, handlePlotDispatchStatus);
        socket.on(PLOT_DISPATCH_SOCKET_EVENTS.STARTED, handlePlotDispatchStarted);
        socket.on(PLOT_DISPATCH_SOCKET_EVENTS.BACKUP_ADVANCED, handlePlotDispatchBackupAdvanced);
        socket.on(PLOT_DISPATCH_SOCKET_EVENTS.DRIVER_REJECTED, handlePlotDispatchDriverRejected);
        socket.on(PLOT_DISPATCH_SOCKET_EVENTS.ACCEPTED, handlePlotDispatchAccepted);
        socket.on(PLOT_DISPATCH_SOCKET_EVENTS.EXHAUSTED, handlePlotDispatchExhausted);
        socket.on(PLOT_DISPATCH_SOCKET_EVENTS.MANUAL_REQUIRED, handleManualDispatchRequired);
        socket.on("booking-cancelled-event", handleBookingCancelled);
        socket.on("booking-cancelled", handleBookingCancelled);
        socket.on("cancel-booking-event", handleBookingCancelled);
        socket.on("booking-no-show-event", handleBookingNoShow);
        socket.on("dashboard-cards-update", handleDashboardCardsUpdate);
        socket.on("follow-on-job-linked", handleFollowOnLinked);
        socket.on("follow-on-job-sent-to-driver", handleFollowOnSentToDriver);
        socket.on("follow-on-job-timeout", handleFollowOnTimeout);
        socket.on("follow-on-job-removed", handleFollowOnRemoved);
        socket.on("send-reminder", handleSendReminder);
        socket.on("booking-updated-event", handleBookingUpdated);
        socket.on("booking-status-updated", handleBookingStatusUpdated);
        socket.on("refresh-bookings-list", handleRefreshBookingsList);

        return () => {
            socket.offAny();
            socket.off("new-booking-event", handleNewBooking);
            socket.off("driver-assignment-pending", handleDriverAssignmentPending);
            socket.off("job-accepted-by-driver", handleJobAccepted);
            socket.off("job-rejected-by-driver", handleJobRejected);
            socket.off("auto-dispatch-failed", handleAutoDispatchFailed);
            socket.off("nearest-dispatch-failed", handleNearestDispatchFailed);
            socket.off("plot-dispatch-failed", handlePlotDispatchFailed);
            socket.off(PLOT_DISPATCH_SOCKET_EVENTS.STATUS, handlePlotDispatchStatus);
            socket.off(PLOT_DISPATCH_SOCKET_EVENTS.STARTED, handlePlotDispatchStarted);
            socket.off(PLOT_DISPATCH_SOCKET_EVENTS.BACKUP_ADVANCED, handlePlotDispatchBackupAdvanced);
            socket.off(PLOT_DISPATCH_SOCKET_EVENTS.DRIVER_REJECTED, handlePlotDispatchDriverRejected);
            socket.off(PLOT_DISPATCH_SOCKET_EVENTS.ACCEPTED, handlePlotDispatchAccepted);
            socket.off(PLOT_DISPATCH_SOCKET_EVENTS.EXHAUSTED, handlePlotDispatchExhausted);
            socket.off(PLOT_DISPATCH_SOCKET_EVENTS.MANUAL_REQUIRED, handleManualDispatchRequired);
            socket.off("booking-cancelled-event", handleBookingCancelled);
            socket.off("booking-cancelled", handleBookingCancelled);
            socket.off("cancel-booking-event", handleBookingCancelled);
            socket.off("booking-no-show-event", handleBookingNoShow);
            socket.off("dashboard-cards-update", handleDashboardCardsUpdate);
            socket.off("follow-on-job-linked", handleFollowOnLinked);
            socket.off("follow-on-job-sent-to-driver", handleFollowOnSentToDriver);
            socket.off("follow-on-job-timeout", handleFollowOnTimeout);
            socket.off("follow-on-job-removed", handleFollowOnRemoved);
            socket.off("send-reminder", handleSendReminder);
            socket.off("booking-updated-event", handleBookingUpdated);
            socket.off("booking-status-updated", handleBookingStatusUpdated);
            socket.off("refresh-bookings-list", handleRefreshBookingsList);
        };

    }, [
        socket,
        showNotification,
        filter,
        applyTabFilter,
        nearestDriverDispatchEnabled,
        plotBasedDispatchEnabled,
        applyBookingEvent,
        applyPlotDispatchUpdate,
        clearHighlightLater,
        syncPlotDispatchStatus,
    ]);

    const getButtonRef = (id) => {
        if (!buttonRefs.current[id]) buttonRefs.current[id] = { current: null };
        return buttonRefs.current[id];
    };

    const formatStatus = (status) =>
        status ? status.charAt(0).toUpperCase() + status.slice(1) : "-";

    const handleSearchChange = (e) => {
        const value = e?.target?.value ?? e;
        setSearch(value);
        setPage(1);
    };

    const handleStatusChange = (option) => { setSelectedStatus(normalizeOverviewSelectValue(option?.value)); setPage(1); };
    const handleSubCompanyChange = (option) => { setSelectedSubCompany(normalizeOverviewSelectValue(option?.value)); setPage(1); };

    const handleBookingUpdate = (updated) => {
        if (!updated || updated.id == null) return;
        setBookings((prev) =>
            prev
                .map((b) => (b.id === updated.id ? mergeBookingEvent(b, updated) : b))
                .filter((b) => shouldShowBookingInOverviewTab(b, filter, overviewTabOptions))
        );
        if (isTerminalBooking(updated)) {
            clearPlotDispatchForBooking(updated);
        }
        setRefreshTrigger((prev) => prev + 1);
    };

    const handleOpenAllocateModal = (booking, assignmentType = "allocate_driver") => {
        setSelectedBooking({ ...booking, _assignmentType: assignmentType });
        setShowAllocateModal(true);
        setOpenMenu(null);
    };

    const handleAllocateSuccess = (updatedBooking) => {
        handleBookingUpdate(updatedBooking);
        setShowAllocateModal(false);
        setSelectedBooking(null);
        const isPreJob = updatedBooking?._assignmentType === "pre_job";
        if (updatedBooking) {
            showNotification({
                booking: updatedBooking,
                driver_name: updatedBooking?.driverDetail?.name ?? "Driver",
                message: updatedBooking._successMessage || (
                    isPreJob
                        ? `Pre-job sent to ${updatedBooking?.driverDetail?.name ?? "driver"}. Waiting for response.`
                        : `Job assigned to ${updatedBooking?.driverDetail?.name ?? "driver"}. Waiting for driver response.`
                ),
                type: "default",
            });
        }
    };

    const handleOpenFollowOnModal = (booking) => {
        setFollowOnSourceBooking(booking);
        setShowFollowOnModal(true);
        setOpenMenu(null);
    };

    const handleFollowOnSuccess = ({ job1, job2_id }) => {
        setBookings((prev) =>
            prev.filter(Boolean).map((b) =>
                b.id === job1.id ? { ...b, follow_on_job_id: job2_id } : b
            )
        );
        setShowFollowOnModal(false);
        setFollowOnSourceBooking(null);
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="mt-9 w-full">
            <CardContainer className="bg-[#F5F5F5]">
                <div className="p-3 sm:p-4 lg:p-5">
                {plotBasedDispatchEnabled && (
                    <PlotDispatchActiveStrip
                        activeDispatches={activePlotDispatches}
                        onOpenDetails={handleOpenPlotDispatchPanel}
                    />
                )}
                <div className="flex lg:flex-row md:flex-row flex-col sm:items-center gap-3 sm:gap-5 justify-between mb-4 sm:mb-0">
                    <div className="md:w-full w-[calc(100%-54px)] sm:flex-1">
                        <SearchBar
                            className="w-full md:max-w-[400px]"
                            value={search}
                            onSearchChange={handleSearchChange}
                        />
                    </div>

                    <div className="flex flex-row justify-end gap-3 sm:gap-5 w-full sm:w-auto">
                        <CustomSelect
                            variant={2}
                            options={subCompanyList}
                            placeholder={loadingSubCompanies ? "Loading..." : "Sub Company"}
                            onChange={handleSubCompanyChange}
                            value={subCompanyList.find(opt => opt.value === selectedSubCompany)}
                            isDisabled={loadingSubCompanies}
                            menuPortalTarget={document.body}
                            styles={{
                                menuPortal: base => ({ ...base, zIndex: 9999 }),
                                menu: base => ({ ...base, zIndex: 9999 })
                            }}
                        />
                        <CustomSelect
                            variant={2}
                            options={OVERVIEW_STATUS_OPTIONS}
                            placeholder="All Status"
                            onChange={handleStatusChange}
                            value={OVERVIEW_STATUS_OPTIONS.find(opt => opt.value === selectedStatus)}
                            menuPortalTarget={document.body}
                            styles={{
                                menuPortal: base => ({ ...base, zIndex: 9999 }),
                                menu: base => ({ ...base, zIndex: 9999 })
                            }}
                        />
                    </div>
                </div>
                </div>

                <div className="border-t min-h-[420px]">
                    {tableLoading ? (
                        <div className="min-h-[320px] flex items-center justify-center py-8 text-sm text-gray-500">
                            Loading bookings...
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="min-h-[320px] p-8 flex items-center justify-center text-center text-gray-500">
                            {search || selectedStatus || selectedSubCompany
                                ? "No bookings found matching your filters"
                                : "No bookings found"}
                        </div>
                    ) : (
                        <div className="overflow-x-auto min-h-[320px]">
                            <div className="min-w-max">
                                <div className="flex border-b text-sm font-semibold text-gray-700 bg-gray-50">
                                    <Col w="w-[80px]">ID</Col>
                                    <Col w="w-[120px]">Pickup Date</Col>
                                    <Col w="w-[100px]">Time</Col>
                                    <Col w="w-[90px]">Reminder</Col>
                                    <Col w="w-[100px]">Passenger</Col>
                                    <Col w="w-[180px]">Mobile No.</Col>
                                    <Col w="w-[220px]">Pickup</Col>
                                    <Col w="w-[220px]">Destination</Col>
                                    <Col w="w-[130px]">Fare</Col>
                                    <Col w="w-[170px]">Vehicle</Col>
                                    <Col w="w-[170px]">Sub Company</Col>
                                    {/* <Col w="w-[100px]">OTP</Col> */}
                                    <Col w="w-[170px]">Status</Col>
                                    <Col w="w-[230px]">Action</Col>
                                </div>

                                {bookings.map((b, index) => {
                                    if (!b || b.id == null) return null;
                                    const btnRef = getButtonRef(b.id);

                                    if (isEditableOverviewTab(filter)) {
                                        return (
                                            <EditableBookingRow
                                                key={b.id}
                                                booking={b}
                                                index={index}
                                                filter={filter}
                                                statusColor={statusColor}
                                                formatStatus={formatStatus}
                                                openMenu={openMenu}
                                                setOpenMenu={setOpenMenu}
                                                btnRef={btnRef}
                                                navigate={navigate}
                                                onBookingUpdate={handleBookingUpdate}
                                                onOpenAllocateModal={handleOpenAllocateModal}
                                                onOpenFollowOnModal={handleOpenFollowOnModal}
                                                onOpenEditBooking={onOpenEditBooking}
                                                plotDispatchStatusById={plotDispatchStatusById}
                                                highlightedBookingId={highlightedBookingId}
                                                onOpenPlotDispatchPanel={handleOpenPlotDispatchPanel}
                                                plotBasedDispatchEnabled={plotBasedDispatchEnabled}
                                                getLocationDisplay={getLocationDisplay}
                                            />
                                        );
                                    }

                                    return (
                                        <div
                                            key={b.id}
                                            className="flex border-b text-sm bg-white hover:bg-gray-50 transition-colors"
                                        >
                                            <Col w="w-[80px]">{index + 1}</Col>

                                            <Col w="w-[120px]">
                                                {formatBookingDate(b.booking_date)}
                                            </Col>

                                            <Col w="w-[100px]">
                                                {formatPickupTime(b)}
                                            </Col>

                                            <Col w="w-[90px]">
                                                {formatReminderLabel(b.reminder_minutes)}
                                            </Col>

                                            <Col w="w-[100px]">{b.passenger ?? 1}</Col>
                                            <Col w="w-[180px]">{b.phone_no ?? "N/A"}</Col>

                                            <Col w="w-[220px]" className="truncate" title={getLocationDisplay(b, "pickup_location")}>
                                                {getLocationDisplay(b, "pickup_location")}
                                            </Col>

                                            <Col w="w-[220px]" className="truncate" title={getLocationDisplay(b, "destination_location")}>
                                                {getLocationDisplay(b, "destination_location")}
                                            </Col>

                                            <Col w="w-[130px]">
                                                <div className="flex flex-col">
                                                    <span>{formatCurrency(b.booking_amount ?? b.offered_amount ?? 0)}</span>
                                                    <span className="text-xs text-gray-500">{formatStatus(b.payment_method)}</span>
                                                </div>
                                            </Col>

                                            <Col w="w-[170px]">
                                                <div className="flex flex-col">
                                                    <span>{b.vehicleDetail?.vehicle_type_name ?? "-"}</span>
                                                    <span className="text-xs text-gray-500">{b.vehicleDetail?.vehicle_type_service ?? ""}</span>
                                                </div>
                                            </Col>

                                            <Col w="w-[170px]">
                                                <div className="flex flex-col">
                                                    <span>{b.subCompanyDetail?.name ?? "-"}</span>
                                                    <span className="text-xs text-gray-500">{b.subCompanyDetail?.email ?? ""}</span>
                                                </div>
                                            </Col>

                                            <Col w="w-[170px]">
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        ref={(el) => (btnRef.current = el)}
                                                        onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                                                        className="w-full flex justify-between items-center border rounded px-3 py-1"
                                                    >
                                                        <span className={statusColor[b.booking_status] ?? "text-gray-500"}>
                                                            ● {b.booking_status}
                                                        </span>
                                                        ▾
                                                    </button>

                                                    {b.follow_on_job_id && (
                                                        <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full text-center">
                                                            🔗 Follow-on queued
                                                        </span>
                                                    )}

                                                    {openMenu === b.id && (
                                                        <StatusMenu
                                                            anchorRef={btnRef}
                                                            bookingId={b.id}
                                                            bookingData={b}
                                                            navigate={navigate}
                                                            onClose={() => setOpenMenu(null)}
                                                            onStatusUpdate={handleBookingUpdate}
                                                            onOpenAllocateModal={handleOpenAllocateModal}
                                                            onOpenFollowOnModal={handleOpenFollowOnModal}
                                                        />
                                                    )}
                                                </div>
                                            </Col>

                                            <Col w="w-[230px]" className="whitespace-normal break-words">
                                                {cleanDispatcherAction(b.dispatcher_action) || "-"}
                                            </Col>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {bookings.length > 0 && (
                        <div className="p-4 flex items-center justify-between">
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </div>
            </CardContainer>

            {/* Allocate Driver Modal */}
            {showAllocateModal && selectedBooking && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black bg-opacity-50"
                        onClick={() => { setShowAllocateModal(false); setSelectedBooking(null); }}
                    />
                    <div className="relative bg-white rounded-lg shadow-xl max-h-[90vh] overflow-auto w-full max-w-2xl mx-4">
                        <AllocateDriverModal
                            bookingData={selectedBooking}
                            onClose={() => { setShowAllocateModal(false); setSelectedBooking(null); }}
                            onSuccess={handleAllocateSuccess}
                        />
                    </div>
                </div>
            )}

            {/* Follow-On Job Modal — NEW */}
            {showFollowOnModal && followOnSourceBooking && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black bg-opacity-50"
                        onClick={() => { setShowFollowOnModal(false); setFollowOnSourceBooking(null); }}
                    />
                    <div className="relative bg-white rounded-lg shadow-xl max-h-[90vh] overflow-auto w-full max-w-2xl mx-4">
                        <FollowOnJobModal
                            bookingData={followOnSourceBooking}
                            onClose={() => { setShowFollowOnModal(false); setFollowOnSourceBooking(null); }}
                            onSuccess={handleFollowOnSuccess}
                        />
                    </div>
                </div>
            )}

            {plotDispatchPanel && (
                <PlotDispatchStatusPanel
                    booking={plotDispatchPanel.booking}
                    status={plotDispatchPanel.status}
                    onClose={() => setPlotDispatchPanel(null)}
                    onManualAssign={(booking) => {
                        setPlotDispatchPanel(null);
                        handleOpenAllocateModal(booking, "allocate_driver");
                    }}
                    onRedispatch={handlePlotDispatchRedispatch}
                />
            )}

            {/* Driver assignment / reminder notifications — vertical stack */}
            {assignmentNotifications.length > 0 && (
                <div className="fixed bottom-24 right-4 sm:right-6 z-[99999] flex flex-col gap-3 items-end pointer-events-none max-h-[calc(100vh-140px)] overflow-y-auto overscroll-contain w-[min(100vw-2rem,24rem)]">
                    {assignmentNotifications.map((notification) => (
                        <DriverAssignmentModal
                            key={notification.id}
                            notification={notification}
                            onClose={handleCloseNotification}
                            autoCloseDuration={6000}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default OverViewDetails;
