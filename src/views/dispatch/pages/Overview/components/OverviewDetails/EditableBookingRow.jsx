import {
    isDispatchReleased,
    isPlotDispatchExhausted,
    isPlotDispatchInProgress,
    isScheduledBookingWithReminder,
} from "../../../../../../utils/functions/bookingDateFilter";
import { FaPen, FaUserPlus } from "react-icons/fa";
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
    <div className={`px-3 py-3 flex-shrink-0 ${w} ${className}`}>{children}</div>
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
    rowNumber,
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
    const dispatcherAction = cleanDispatcherAction(booking.dispatcher_action) || "-";

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
            <Col w="w-[50px]">{rowNumber ?? index + 1}</Col>

            <Col w="w-[104px]">{formatBookingDate(booking.booking_date)}</Col>

            <Col w="w-[70px]">{formatPickupTime(booking)}</Col>

            <Col w="w-[76px]">{formatReminderLabel(booking.reminder_minutes)}</Col>

            <Col w="w-[76px]">{booking.passenger ?? 1}</Col>

            <Col w="w-[132px]">{booking.phone_no ?? "N/A"}</Col>

            <Col w="w-[190px]" className="truncate" title={pickupDisplay}>
                {pickupDisplay}
            </Col>

            <Col w="w-[190px]" className="truncate" title={destinationDisplay}>
                {destinationDisplay}
            </Col>

            <Col w="w-[96px]">
                <div className="flex flex-col">
                    <span>{formatCurrency(booking.booking_amount ?? booking.offered_amount ?? 0)}</span>
                    <span className="text-xs text-gray-500">{formatStatus(booking.payment_method)}</span>
                </div>
            </Col>

            <Col w="w-[90px]">
                <div className="flex flex-col">
                    <span>{booking.vehicleDetail?.vehicle_type_name ?? "-"}</span>
                    <span className="text-xs text-gray-500">{booking.vehicleDetail?.vehicle_type_service ?? ""}</span>
                </div>
            </Col>

            <Col w="w-[110px]">
                <div className="flex flex-col">
                    <span>{booking.subCompanyDetail?.name ?? "-"}</span>
                    <span className="text-xs text-gray-500">{booking.subCompanyDetail?.email ?? ""}</span>
                </div>
            </Col>

            <Col w="w-[128px]">
                <div className="flex flex-col gap-1">
                    <button
                        ref={(el) => (btnRef.current = el)}
                        onClick={() => setOpenMenu(openMenu === booking.id ? null : booking.id)}
                        className="w-full flex justify-between items-center border rounded px-2 py-1"
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

            <Col w="w-[190px]" className="whitespace-normal">
                <div className="flex min-w-0 flex-col gap-1.5">
                    {plotBasedDispatchEnabled && progressMessage ? (
                        <button
                            type="button"
                            onClick={() => onOpenPlotDispatchPanel?.(booking, plotStatus)}
                            title={progressMessage}
                            className={`line-clamp-2 text-left text-[11px] font-medium leading-snug ${
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
                        <span className="line-clamp-2 text-[12px] leading-snug" title={dispatcherAction}>
                            {dispatcherAction}
                        </span>
                    )}

                    {(showManualAssign || showEdit) && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {showManualAssign && (
                                <button
                                    type="button"
                                    onClick={() => onOpenAllocateModal(booking, "allocate_driver")}
                                    title="Manual assign"
                                    className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-amber-600"
                                >
                                    <FaUserPlus className="text-[10px]" />
                                    Assign
                                </button>
                            )}

                            {showEdit && onOpenEditBooking && (
                                <button
                                    type="button"
                                    onClick={() => onOpenEditBooking(booking)}
                                    title="Edit booking"
                                    aria-label="Edit booking"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#1F41BB] text-[10px] text-[#1F41BB] hover:bg-[#EEF2FF]"
                                >
                                    <FaPen />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </Col>
        </div>
    );
};

export default EditableBookingRow;
