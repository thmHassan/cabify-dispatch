import { useEffect, useRef } from "react";

const DriverAssignmentModal = ({
    notification,
    onClose,
    autoCloseDuration = 6000,
}) => {
    const timerRef = useRef(null);
    const progressRef = useRef(null);

    useEffect(() => {
        if (!notification) return;

        timerRef.current = setTimeout(() => {
            onClose();
        }, autoCloseDuration);

        if (progressRef.current) {
            progressRef.current.style.transition = "none";
            progressRef.current.style.width = "100%";
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (progressRef.current) {
                        progressRef.current.style.transition = `width ${autoCloseDuration}ms linear`;
                        progressRef.current.style.width = "0%";
                    }
                });
            });
        }

        return () => clearTimeout(timerRef.current);
    }, [notification, autoCloseDuration, onClose]);

    if (!notification) return null;

    const { booking, driver_name, message, type } = notification;

    const theme = {
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
        default: {
            color: "#1F41BB",
            label: "Driver Assignment",
            gradient: "from-[#1F41BB] via-[#4F6FE8] to-[#1F41BB]",
            dot: "bg-[#1F41BB]",
            ping: "bg-[#1F41BB]",
            avatar: "bg-[#1F41BB]",
            progress: "bg-[#1F41BB]",
        },
    };

    const t = theme[type] || theme.default;

    const statusBadgeStyle = {
        pending_acceptance: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Acceptance" },
        ongoing: { bg: "bg-blue-100", text: "text-blue-700", label: "Ongoing" },
        pending: { bg: "bg-gray-100", text: "text-gray-600", label: "Pending" },
        cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },   
        accepted: { bg: "bg-green-100", text: "text-green-700", label: "Accepted" }, 
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-end justify-end p-6 pointer-events-none">
            <div
                className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                style={{ animation: "slideInUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
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
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none ml-2 -mt-0.5">
                        ×
                    </button>
                </div>

                <div className="px-5 pb-4 space-y-3">

                    <div className="flex items-center gap-2">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-full ${t.avatar} flex items-center justify-center`}>
                            <span className="text-white text-sm font-bold">
                                {driver_name?.charAt(0)?.toUpperCase() ?? "D"}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 leading-none mb-0.5">
                                {type === "accepted" ? "Accepted by" : type === "cancelled" ? "Cancelled by" : "Assigned Driver"}
                            </p>
                            <p className="text-sm font-semibold text-gray-800 leading-tight">
                                {driver_name ?? "Unknown Driver"}
                            </p>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 leading-snug">{message}</p>

                    {booking && (
                        <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 border border-gray-100">
                            <Row label="Booking ID" value={booking.booking_id ?? `#${booking.id}`} />
                            {booking.pickup_location && <Row label="Pickup" value={booking.pickup_location} truncate />}
                            {booking.destination_location && <Row label="Drop" value={booking.destination_location} truncate />}
                            {booking.booking_date && (
                                <Row label="Date" value={new Date(booking.booking_date).toLocaleDateString("en-GB")} />
                            )}
                            {booking.pickup_time && (
                                <Row label="Time" value={booking.pickup_time === "asap" ? "ASAP" : booking.pickup_time} />
                            )}
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-xs text-gray-500">Status</span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full 
                                    ${(statusBadgeStyle[booking.booking_status] || statusBadgeStyle.pending).bg} 
                                    ${(statusBadgeStyle[booking.booking_status] || statusBadgeStyle.pending).text}`}>
                                    {(statusBadgeStyle[booking.booking_status] || statusBadgeStyle.pending).label}
                                </span>
                            </div>
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
        </div>
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