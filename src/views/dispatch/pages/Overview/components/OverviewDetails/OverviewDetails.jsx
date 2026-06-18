import { useState, useEffect, useRef, useCallback } from "react";
import CardContainer from "../../../../../../components/shared/CardContainer";
import SearchBar from "../../../../../../components/shared/SearchBar/SearchBar";
import CustomSelect from "../../../../../../components/ui/CustomSelect";
import Pagination from "../../../../../../components/ui/Pagination/Pagination";
import { useSocket } from "../../../../../../components/routes/SocketProvider";
import { getBookings } from "../../../../../../services/AddBookingServices";
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
    const overviewTabOptions = { nearestDriverDispatchEnabled, plotBasedDispatchEnabled };
    const applyTabFilter = useCallback(
        (bookings) => filterBookingsForOverviewTab((bookings || []).filter(Boolean), filter, overviewTabOptions),
        [filter, nearestDriverDispatchEnabled, plotBasedDispatchEnabled]
    );
    const [openMenu, setOpenMenu] = useState(null);
    const [showAllocateModal, setShowAllocateModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showFollowOnModal, setShowFollowOnModal] = useState(false);
    const [followOnSourceBooking, setFollowOnSourceBooking] = useState(null);
    const socket = useSocket();
    const [bookings, setBookings] = useState([]);
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
    const pendingSeedBookingsRef = useRef([]);

    useEffect(() => {
        if (seedBookings?.length) {
            pendingSeedBookingsRef.current = seedBookings;
        }
    }, [seedBookings]);

    const showNotification = useCallback((data) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setAssignmentNotifications((prev) => [...prev, { id, ...data }]);
    }, []);

    const handleCloseNotification = useCallback((id) => {
        setAssignmentNotifications((prev) => prev.filter((notification) => notification.id !== id));
    }, []);

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
        setTableLoading(true);
        const fetchBookings = async () => {
            try {
                const params = { page, limit };
                if (search) params.search = search;
                if (selectedStatus) params.status = selectedStatus;
                if (selectedSubCompany) params.sub_company = selectedSubCompany;
                if (filter) params.filter = filter;

                let res = await getBookings(params);
                const fetchedBookings = res?.data?.success ? (res.data.data || []).filter(Boolean) : [];

                const pendingSeeds = pendingSeedBookingsRef.current || [];
                const relevantSeeds = pendingSeeds.filter((booking) =>
                    shouldShowBookingInOverviewTab(booking, filter, overviewTabOptions)
                );
                setBookings(mergeBookingsById(fetchedBookings, relevantSeeds));
                setTotalPages(res?.data?.pagination?.total_pages || 1);
                if (relevantSeeds.length > 0) {
                    pendingSeedBookingsRef.current = [];
                    onSeedConsumedRef.current?.();
                }
            } catch (error) {
                console.error("Error fetching booking:", error);
                const pendingSeeds = pendingSeedBookingsRef.current || [];
                const relevantSeeds = pendingSeeds.filter((booking) =>
                    shouldShowBookingInOverviewTab(booking, filter, overviewTabOptions)
                );
                setBookings(relevantSeeds);
                if (relevantSeeds.length > 0) {
                    pendingSeedBookingsRef.current = [];
                    onSeedConsumedRef.current?.();
                }
            } finally {
                setTableLoading(false);
            }
        };
        fetchBookings();
    }, [page, search, selectedStatus, selectedSubCompany, filter, refreshTrigger, externalRefreshTrigger]);

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
            setBookings((prev) =>
                mapBookings(prev, (b) =>
                    b.id === data.booking_id
                        ? { ...b, ...data.booking, booking_status: "ongoing" }
                        : b
                )
            );
            showNotification({
                booking_id: data.booking_id,
                driver_name: data.driver_name,
                message: data.message,
                type: "accepted",
            });
        };

        const handleJobRejected = (data) => {
            console.log("job-rejected-by-driver:", data);
            if (!data?.booking_id) return;
            setBookings((prev) =>
                mapBookings(prev, (b) =>
                    b.id === data.booking_id ? { ...b, booking_status: "pending" } : b
                )
            );
            showNotification({
                booking_id: data.booking_id,
                driver_name: data.driver_name,
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
                    const exists = safe.some((b) => b.id === updatedBooking.id);

                    if (!exists) {
                        return shouldShowBookingInOverviewTab(updatedBooking, filter, overviewTabOptions)
                            ? [updatedBooking, ...safe]
                            : safe;
                    }

                    return applyTabFilter(
                        safe.map((b) => (b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b))
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

        const handleBookingCancelled = (data) => {
            console.log("booking-cancelled:", data);
            if (!data?.booking_id) return;
            setBookings((prev) =>
                prev.filter(Boolean).map((b) =>
                    b.id === data.booking_id ? { ...b, booking_status: "cancelled" } : b
                )
            );
            showNotification({
                booking_id: data.booking_id,
                message: data.message || "Booking has been cancelled by customer",
                type: "cancelled",
            });
            setRefreshTrigger(prev => prev + 1);
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
            setBookings((prev) =>
                mapBookings(prev, (b) =>
                    b.id === data.booking_id
                        ? { ...b, ...data.booking, booking_status: "pending_acceptance" }
                        : b
                )
            );
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
            setBookings((prev) =>
                prev.filter(Boolean).map((b) =>
                    b.id === data.booking_id
                        ? { ...b, booking_status: "pending", driver: null, driverDetail: null }
                        : b
                )
            );
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
            setBookings((prev) => {
                const safe = prev.filter(Boolean);
                const exists = safe.some((b) => b.id === booking.id);

                if (!exists) {
                    return shouldShowBookingInOverviewTab(booking, filter, overviewTabOptions)
                        ? [booking, ...safe]
                        : safe;
                }

                return safe
                    .map((b) => (b.id === booking.id ? { ...b, ...booking } : b))
                    .filter((b) => shouldShowBookingInOverviewTab(b, filter, overviewTabOptions));
            });
            setRefreshTrigger((prev) => prev + 1);
        };

        socket.onAny((event, ...args) => {
            console.log(`${event}:`, args);
        });

        socket.on("new-booking-event", handleNewBooking);
        socket.on("driver-assignment-pending", handleDriverAssignmentPending);
        socket.on("job-accepted-by-driver", handleJobAccepted);
        socket.on("job-rejected-by-driver", handleJobRejected);
        socket.on("auto-dispatch-failed", handleAutoDispatchFailed);
        socket.on("nearest-dispatch-failed", handleNearestDispatchFailed);
        socket.on("plot-dispatch-failed", handlePlotDispatchFailed);
        socket.on("booking-cancelled-event", handleBookingCancelled);
        socket.on("booking-cancelled", handleBookingCancelled);
        socket.on("cancel-booking-event", handleBookingCancelled);
        socket.on("dashboard-cards-update", (data) => {
            console.log("dashboard-cards-update (triggering refresh)");
            setRefreshTrigger(prev => prev + 1);
        });
        socket.on("follow-on-job-linked", handleFollowOnLinked);
        socket.on("follow-on-job-sent-to-driver", handleFollowOnSentToDriver);
        socket.on("follow-on-job-timeout", handleFollowOnTimeout);
        socket.on("follow-on-job-removed", handleFollowOnRemoved);
        socket.on("send-reminder", handleSendReminder);
        socket.on("booking-updated-event", handleBookingUpdated);
        socket.on("refresh-bookings-list", () => {
            setRefreshTrigger((prev) => prev + 1);
        });

        return () => {
            socket.offAny();
            socket.off("new-booking-event", handleNewBooking);
            socket.off("driver-assignment-pending", handleDriverAssignmentPending);
            socket.off("job-accepted-by-driver", handleJobAccepted);
            socket.off("job-rejected-by-driver", handleJobRejected);
            socket.off("auto-dispatch-failed", handleAutoDispatchFailed);
            socket.off("nearest-dispatch-failed", handleNearestDispatchFailed);
            socket.off("plot-dispatch-failed", handlePlotDispatchFailed);
            socket.off("booking-cancelled-event", handleBookingCancelled);
            socket.off("booking-cancelled", handleBookingCancelled);
            socket.off("cancel-booking-event", handleBookingCancelled);
            socket.off("dashboard-cards-update");
            socket.off("follow-on-job-linked", handleFollowOnLinked);
            socket.off("follow-on-job-sent-to-driver", handleFollowOnSentToDriver);
            socket.off("follow-on-job-timeout", handleFollowOnTimeout);
            socket.off("follow-on-job-removed", handleFollowOnRemoved);
            socket.off("send-reminder", handleSendReminder);
            socket.off("booking-updated-event", handleBookingUpdated);
            socket.off("refresh-bookings-list");
        };

    }, [socket, showNotification, filter, applyTabFilter, nearestDriverDispatchEnabled, plotBasedDispatchEnabled]);

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

    const handleStatusChange = (option) => { setSelectedStatus(option.value); setPage(1); };
    const handleSubCompanyChange = (option) => { setSelectedSubCompany(option.value); setPage(1); };

    const handleBookingUpdate = (updated) => {
        if (!updated || updated.id == null) return;
        setBookings((prev) =>
            prev
                .map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
                .filter((b) => shouldShowBookingInOverviewTab(b, filter, overviewTabOptions))
        );
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
                <div className="p-3 sm:p-4 lg:p-5 flex lg:flex-row md:flex-row flex-col sm:items-center gap-3 sm:gap-5 justify-between mb-4 sm:mb-0">
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

                <div className="border-t">
                    {tableLoading ? (
                        <div className="flex justify-center py-8"><AppLogoLoader /></div>
                    ) : bookings.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {search || selectedStatus || selectedSubCompany
                                ? "No bookings found matching your filters"
                                : "No bookings found"}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
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

                                            <Col w="w-[220px]" className="truncate" title={b.pickup_location}>
                                                {b.pickup_location ?? "N/A"}
                                            </Col>

                                            <Col w="w-[220px]" className="truncate" title={b.destination_location}>
                                                {b.destination_location ?? "N/A"}
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
                                                {b.dispatcher_action ?? "-"}
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