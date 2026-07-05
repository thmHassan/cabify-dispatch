import { useCallback, useEffect, useRef } from "react";
import { formatBookingDate, formatReminderMinutes, formatTime } from "../../../../../../utils/functions/formatters";
import { usePausableAutoDismiss } from "../../../../../../hooks/usePausableAutoDismiss";

const DriverAssignmentModal = ({
    notification,
    onClose,
    autoCloseDuration = 6000,
}) => {
    const progressRef = useRef(null);
    const handleDismiss = useCallback(() => {
        if (notification?.id != null) onClose(notification.id);
    }, [notification?.id, onClose]);

    const { hoverHandlers, pause, resume, remainingMsRef } = usePausableAutoDismiss(
        handleDismiss,
        autoCloseDuration,
        Boolean(notification)
    );

    const startProgressAnimation = useCallback((durationMs) => {
        if (!progressRef.current) return;
        const el = progressRef.current;
        el.style.transition = "none";
        el.style.width = "100%";
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!progressRef.current) return;
                progressRef.current.style.transition = `width ${durationMs}ms linear`;
                progressRef.current.style.width = "0%";
            });
        });
    }, []);

    const pauseProgress = useCallback(() => {
        if (!progressRef.current) return;
        const el = progressRef.current;
        const parent = el.parentElement;
        const pct = parent?.getBoundingClientRect().width
            ? (el.getBoundingClientRect().width / parent.getBoundingClientRect().width) * 100
            : 0;
        el.style.transition = "none";
        el.style.width = `${pct}%`;
    }, []);

    const resumeProgress = useCallback(() => {
        if (!progressRef.current) return;
        const el = progressRef.current;
        const remaining = remainingMsRef.current;
        requestAnimationFrame(() => {
            if (!progressRef.current) return;
            progressRef.current.style.transition = `width ${remaining}ms linear`;
            progressRef.current.style.width = "0%";
        });
    }, [remainingMsRef]);

    useEffect(() => {
        if (!notification) return;
        startProgressAnimation(autoCloseDuration);
    }, [notification, autoCloseDuration, startProgressAnimation]);

    if (!notification) return null;

    const {
        booking,
        driver_name,
        message,
        type,
        title: notificationTitle,
        booking_reference,
        pickup_location,
        pickup_time,
        booking_date,
        reminder_minutes,
        booking_id,
    } = notification;

    const isReminder = type === "reminder";

    const theme = {
        reminder: {
            color: "#d97706",
            label: notificationTitle || "Booking Reminder",
            gradient: "from-amber-600 via-amber-400 to-amber-600",
            dot: "bg-amber-600",
            ping: "bg-amber-600",
            avatar: "bg-amber-600",
            progress: "bg-amber-600",
        },
        accepted: {
            color: "#16a34a",
            label: "Ride Accepted",
            gradient: "from-green-600 via-green-400 to-green-600",
            dot: "bg-green-600",
            ping: "bg-green-600",
            avatar: "bg-green-600",
            progress: "bg-green-600",
        },
        cancelled: {
            color: "#dc2626",
            label: "Ride Cancelled",
            gradient: "from-red-600 via-red-400 to-red-600",
            dot: "bg-red-600",
            ping: "bg-red-600",
            avatar: "bg-red-600",
            progress: "bg-red-600",
        },
        no_show: {
            color: "#4b5563",
            label: "Customer No Show",
            gradient: "from-gray-700 via-gray-500 to-gray-700",
            dot: "bg-gray-700",
            ping: "bg-gray-700",
            avatar: "bg-gray-700",
            progress: "bg-gray-700",
        },
        failed: {
            color: "#dc2626",
            label: "Dispatch Failed",
            gradient: "from-red-600 via-red-400 to-red-600",
            dot: "bg-red-600",
            ping: "bg-red-600",
            avatar: "bg-red-600",
            progress: "bg-red-600",
        },
        default: {
            color: "#1F41BB",
            label: notificationTitle || (driver_name ? "Driver Assignment" : "Dispatch In Progress"),
            gradient: "from-[#1F41BB] via-[#4F6FE8] to-[#1F41BB]",
            dot: "bg-[#1F41BB]",
            ping: "bg-[#1F41BB]",
            avatar: "bg-[#1F41BB]",
            progress: "bg-[#1F41BB]",
        },
    };

    const t = theme[type] || theme.default;
    const shouldShowDriverBlock =
        !isReminder &&
        Boolean(driver_name || ["accepted", "cancelled", "no_show"].includes(type));

    const statusBadgeStyle = {
        pending_acceptance: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Acceptance" },
        ongoing: { bg: "bg-blue-100", text: "text-blue-700", label: "Ongoing" },
        pending: { bg: "bg-gray-100", text: "text-gray-600", label: "Pending" },
        cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
        no_show: { bg: "bg-gray-200", text: "text-gray-700", label: "No Show" },
        accepted: { bg: "bg-green-100", text: "text-green-700", label: "Accepted" },
    };

    const handleMouseEnter = () => {
        pause();
        pauseProgress();
    };

    const handleMouseLeave = () => {
        resume();
        resumeProgress();
    };

    return (
        <>
            <div
                className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden shrink-0"
                style={{ animation: "slideInUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className={`h-1 w-full bg-gradient-to-r ${t.gradient}`} />

                <div className="flex items-start justify-between px-5 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${t.ping} opacity-60`} />
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${t.dot}`} />
                        </span>
                        <span className="text-sm font-bold text-gray-800 tracking-tight">
                            {t.label}
                        </span>
                    </div>
                    <button
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={() => onClose(notification.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none ml-2 -mt-0.5 p-1"
                    >
                        ×
                    </button>
                </div>

                <div className="px-5 pb-4 space-y-3">

                    {shouldShowDriverBlock && (
                        <div className="flex items-center gap-2">
                            <div className={`flex-shrink-0 w-9 h-9 rounded-full ${t.avatar} flex items-center justify-center`}>
                                <span className="text-white text-sm font-bold">
                                    {driver_name?.charAt(0)?.toUpperCase() ?? "D"}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 leading-none mb-0.5">
                                    {type === "accepted" ? "Accepted by" : type === "cancelled" ? "Cancelled by" : type === "no_show" ? "Marked by" : "Assigned Driver"}
                                </p>
                                <p className="text-sm font-semibold text-gray-800 leading-tight">
                                    {driver_name ?? "Unknown Driver"}
                                </p>
                            </div>
                        </div>
                    )}

                    {message && <p className="text-sm text-gray-600 leading-snug">{message}</p>}

                    {(booking || isReminder) && (
                        <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 border border-gray-100">
                            {(booking_reference || booking?.booking_id || booking?.id || booking_id) && (
                                <Row
                                    label="Booking"
                                    value={booking_reference || booking?.booking_id || (booking?.id ? `#${booking.id}` : `#${booking_id}`)}
                                />
                            )}
                            {(pickup_location || booking?.pickup_location) && (
                                <Row label="Pickup" value={pickup_location || booking.pickup_location} truncate />
                            )}
                            {booking?.destination_location && (
                                <Row label="Drop" value={booking.destination_location} truncate />
                            )}
                            {(booking_date || booking?.booking_date) && (
                                <Row label="Date" value={formatBookingDate(booking_date || booking.booking_date, "-")} />
                            )}
                            {(pickup_time || booking?.pickup_time) && (
                                <Row label="Time" value={formatTime(pickup_time || booking.pickup_time)} />
                            )}
                            {(reminder_minutes || booking?.reminder_minutes) && (
                                <Row
                                    label="Reminder"
                                    value={formatReminderMinutes(reminder_minutes || booking.reminder_minutes, "-")}
                                />
                            )}
                            {!isReminder && booking && (
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs text-gray-500">Status</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full 
                                        ${(statusBadgeStyle[booking.booking_status] || statusBadgeStyle.pending).bg} 
                                        ${(statusBadgeStyle[booking.booking_status] || statusBadgeStyle.pending).text}`}>
                                        {(statusBadgeStyle[booking.booking_status] || statusBadgeStyle.pending).label}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="h-1 w-full bg-gray-100">
                    <div ref={progressRef} className={`h-full ${t.progress} rounded-full`} style={{ width: "100%" }} />
                </div>
            </div>

            <style>{`
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(24px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    );
};

const Row = ({ label, value, truncate = false }) => (
    <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
        <span
            className={`text-xs font-medium text-gray-700 text-right ${truncate ? "truncate max-w-[160px]" : ""}`}
            title={truncate ? value : undefined}
        >
            {value}
        </span>
    </div>
);

export default DriverAssignmentModal;
