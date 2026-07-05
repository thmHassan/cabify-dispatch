import {
    isDispatchReleased,
    isPlotDispatchExhausted,
    isPlotDispatchInProgress,
    isScheduledBookingWithReminder,
} from "../../../../../../utils/functions/bookingDateFilter";
import {
    formatBookingDate,
    formatCurrency,
    formatPickupTime,
    formatReminderLabel,
} from "../../../../../../utils/functions/formatters";
import {
    cleanDispatcherAction,
    formatPlotDispatchProgressMessage,
    getBookingPlotDispatchStatus,
    isPlotDispatchPhaseActive,
    isPlotDispatchStatusExhausted,
} from "../../../../../../utils/plotDispatch/plotDispatchStatus";
import StatusMenu from "./StatusMenu";

const Col = ({ w, children, className = "" }) => (
    <div className={`px-4 py-3 flex-shrink-0 ${w} ${className}`}>{children}</div>
);

export const isEditableOverviewTab = (filter) =>
    filter === "todays_booking" || filter === "pre_bookings";

export const canEditBookingRow = (booking, filter) => {
    if (!isEditableOverviewTab(filter) || !booking) return false;
    if (booking.booking_status !== "pending") return false;
    if (isScheduledBookingWithReminder(booking)) return true;
    if (isDispatchReleased(booking)) return false;
    return true;
};

export const shouldBlinkPendingTodaysRow = (booking, filter) =>
    filter === "todays_booking" && booking?.booking_status === "pending";

const hasAssignedDriver = (booking) => Boolean(
    booking?.driver ||
    booking?.driver_id ||
    booking?.pending_driver_id ||
    booking?.driverDetail?.id ||
    booking?.driver_detail?.id
);

const EditableBookingRow = ({
    booking,
    index,
    filter,
    statusColor,
    formatStatus,
    openMenu,
    setOpenMenu,
    btnRef,
    navigate,
    onBookingUpdate,
    onOpenAllocateModal,
    onOpenFollowOnModal,
    onOpenEditBooking,
    plotDispatchStatusById = {},
    highlightedBookingId = null,
    onOpenPlotDispatchPanel,
    plotBasedDispatchEnabled = false,
    getLocationDisplay,
}) => {
    const showEdit = canEditBookingRow(booking, filter) && Boolean(onOpenEditBooking);
    const blinkPending = shouldBlinkPendingTodaysRow(booking, filter);
    const plotStatus = getBookingPlotDispatchStatus(booking, plotDispatchStatusById);
    const plotDispatchActive = plotBasedDispatchEnabled && (
        isPlotDispatchPhaseActive(plotStatus?.phase) || isPlotDispatchInProgress(booking)
    );
    const plotDispatchExhausted = plotBasedDispatchEnabled && (
        isPlotDispatchStatusExhausted(plotStatus) || isPlotDispatchExhausted(booking)
    );
    const showManualAssign = Boolean(onOpenAllocateModal) && (
        plotDispatchExhausted ||
        (
            isEditableOverviewTab(filter) &&
            String(booking?.booking_status || "").toLowerCase() === "pending" &&
            !plotDispatchActive &&
            !hasAssignedDriver(booking)
        )
    );
    const isHighlighted = highlightedBookingId != null && Number(highlightedBookingId) === Number(booking.id);
    const progressMessage = plotStatus
        ? formatPlotDispatchProgressMessage(plotStatus)
        : "";

    const rowClassName = [
        "flex border-b text-sm transition-colors",
        isHighlighted ? "plot-dispatch-highlight" : "",
        plotDispatchActive && filter === "todays_booking" ? "plot-dispatch-in-progress-row plot-dispatch-active-row" : "",
        !isHighlighted && !plotDispatchActive && blinkPending ? "pending-booking-blink" : "",
        !isHighlighted && !plotDispatchActive && !blinkPending ? "bg-white hover:bg-gray-50" : "",
    ].filter(Boolean).join(" ");

    const pickupDisplay = getLocationDisplay
        ? getLocationDisplay(booking, "pickup_location")
        : (booking.pickup_location ?? "N/A");
    const destinationDisplay = getLocationDisplay
        ? getLocationDisplay(booking, "destination_location")
        : (booking.destination_location ?? "N/A");

    return (
        <div className={rowClassName}>
            <Col w="w-[80px]">{index + 1}</Col>

            <Col w="w-[120px]">{formatBookingDate(booking.booking_date)}</Col>

            <Col w="w-[100px]">{formatPickupTime(booking)}</Col>

            <Col w="w-[90px]">{formatReminderLabel(booking.reminder_minutes)}</Col>

            <Col w="w-[100px]">{booking.passenger ?? 1}</Col>

            <Col w="w-[180px]">{booking.phone_no ?? "N/A"}</Col>

            <Col w="w-[220px]" className="truncate" title={pickupDisplay}>
                {pickupDisplay}
            </Col>

            <Col w="w-[220px]" className="truncate" title={destinationDisplay}>
                {destinationDisplay}
            </Col>

            <Col w="w-[130px]">
                <div className="flex flex-col">
                    <span>{formatCurrency(booking.booking_amount ?? booking.offered_amount ?? 0)}</span>
                    <span className="text-xs text-gray-500">{formatStatus(booking.payment_method)}</span>
                </div>
            </Col>

            <Col w="w-[170px]">
                <div className="flex flex-col">
                    <span>{booking.vehicleDetail?.vehicle_type_name ?? "-"}</span>
                    <span className="text-xs text-gray-500">{booking.vehicleDetail?.vehicle_type_service ?? ""}</span>
                </div>
            </Col>

            <Col w="w-[170px]">
                <div className="flex flex-col">
                    <span>{booking.subCompanyDetail?.name ?? "-"}</span>
                    <span className="text-xs text-gray-500">{booking.subCompanyDetail?.email ?? ""}</span>
                </div>
            </Col>

            <Col w="w-[170px]">
                <div className="flex flex-col gap-1">
                    <button
                        ref={(el) => (btnRef.current = el)}
                        onClick={() => setOpenMenu(openMenu === booking.id ? null : booking.id)}
                        className="w-full flex justify-between items-center border rounded px-3 py-1"
                    >
                        <span className={statusColor[booking.booking_status] ?? "text-gray-500"}>
                            ● {booking.booking_status}
                        </span>
                        ▾
                    </button>

                    {booking.follow_on_job_id && (
                        <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full text-center">
                            🔗 Follow-on queued
                        </span>
                    )}

                    {openMenu === booking.id && (
                        <StatusMenu
                            anchorRef={btnRef}
                            bookingId={booking.id}
                            bookingData={booking}
                            navigate={navigate}
                            onClose={() => setOpenMenu(null)}
                            onStatusUpdate={onBookingUpdate}
                            onOpenAllocateModal={onOpenAllocateModal}
                            onOpenFollowOnModal={onOpenFollowOnModal}
                        />
                    )}
                </div>
            </Col>

            <Col w="w-[230px]" className="whitespace-normal break-words">
                <div className="flex flex-col gap-1">
                    {plotBasedDispatchEnabled && progressMessage ? (
                        <button
                            type="button"
                            onClick={() => onOpenPlotDispatchPanel?.(booking, plotStatus)}
                            className={`text-left text-[11px] font-medium leading-snug ${
                                plotDispatchExhausted
                                    ? "text-amber-700"
                                    : plotDispatchActive
                                        ? "text-[#1F41BB]"
                                        : "text-gray-700"
                            } hover:underline`}
                        >
                            {progressMessage}
                        </button>
                    ) : (
                        <span>{cleanDispatcherAction(booking.dispatcher_action) || "-"}</span>
                    )}

                    {showManualAssign && (
                        <button
                            type="button"
                            onClick={() => onOpenAllocateModal(booking, "allocate_driver")}
                            className="self-start rounded bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-amber-600"
                        >
                            Manual Assign
                        </button>
                    )}

                    {showEdit && onOpenEditBooking && (
                        <button
                            type="button"
                            onClick={() => onOpenEditBooking(booking)}
                            className="self-start rounded border border-[#1F41BB] px-2 py-1 text-[10px] font-semibold text-[#1F41BB] hover:bg-[#EEF2FF]"
                        >
                            Edit
                        </button>
                    )}
                </div>
            </Col>
        </div>
    );
};

export default EditableBookingRow;
