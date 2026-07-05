import { useEffect, useState } from "react";
import {
    formatPlotDispatchProgressMessage,
    getPlotDispatchSecondsRemaining,
    isPlotDispatchPhaseActive,
    isPlotDispatchStatusExhausted,
} from "../../../../../../utils/plotDispatch/plotDispatchStatus";

const PlotDispatchStatusPanel = ({
    booking,
    status,
    onClose,
    onManualAssign,
    onRedispatch,
}) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!status || !isPlotDispatchPhaseActive(status.phase)) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [status]);

    if (!booking || !status) return null;

    const secondsRemaining = getPlotDispatchSecondsRemaining(status, now);
    const progressMessage = formatPlotDispatchProgressMessage(status, { now });
    const exhausted = isPlotDispatchStatusExhausted(status);
    const active = isPlotDispatchPhaseActive(status.phase);

    return (
        <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-6">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#EEF2FF] to-white">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#1F41BB]">
                            Plot Dispatch
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                            Booking #{booking.booking_id || booking.id}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div className={`rounded-xl px-4 py-3 border ${
                        exhausted
                            ? "bg-amber-50 border-amber-200"
                            : active
                                ? "bg-blue-50 border-blue-200"
                                : "bg-green-50 border-green-200"
                    }`}>
                        <p className="text-sm font-semibold text-gray-900">{progressMessage}</p>
                        {active && secondsRemaining != null && (
                            <p className="text-xs text-gray-600 mt-1">
                                Timer: <span className="font-bold text-[#1F41BB]">{secondsRemaining}s</span> remaining
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <p className="text-[10px] uppercase text-gray-500">Current plot</p>
                            <p className="font-semibold text-gray-800">
                                {status.current_plot_name || (status.current_plot_id != null ? `Plot #${status.current_plot_id}` : "—")}
                            </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <p className="text-[10px] uppercase text-gray-500">Phase</p>
                            <p className="font-semibold text-gray-800 capitalize">{status.phase || "—"}</p>
                        </div>
                    </div>

                    {status.plot_chain?.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">Plot chain</p>
                            <div className="flex flex-wrap gap-2">
                                {status.plot_chain.map((plot) => (
                                    <span
                                        key={`${plot.id}-${plot.type}`}
                                        className={`text-[10px] px-2 py-1 rounded-full border ${
                                            plot.visited
                                                ? "bg-green-100 text-green-700 border-green-200"
                                                : "bg-gray-100 text-gray-600 border-gray-200"
                                        }`}
                                    >
                                        {plot.name || `Plot #${plot.id}`}
                                        {plot.type === "backup" ? " (backup)" : ""}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {status.pending_drivers?.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">Drivers notified</p>
                            <div className="space-y-1">
                                {status.pending_drivers.map((driver) => (
                                    <div key={driver.id} className="flex justify-between text-xs bg-blue-50 rounded px-2 py-1">
                                        <span className="font-medium text-gray-800">{driver.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {status.rejected_drivers?.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">Drivers rejected</p>
                            <div className="space-y-1">
                                {status.rejected_drivers.map((driver) => (
                                    <div key={driver.id} className="flex justify-between text-xs bg-red-50 rounded px-2 py-1">
                                        <span className="font-medium text-gray-800">{driver.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="text-xs text-gray-500 truncate" title={booking.pickup_location}>
                        Pickup: {booking.pickup_location || "—"}
                    </div>
                    <div className="text-xs text-gray-500 truncate" title={booking.destination_location}>
                        Destination: {booking.destination_location || "—"}
                    </div>
                </div>

                {exhausted && (
                    <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => onManualAssign?.(booking)}
                            className="rounded-lg bg-[#1F41BB] text-white text-xs font-semibold px-4 py-2 hover:bg-[#1835a0]"
                        >
                            Assign Driver
                        </button>
                        {onRedispatch && (
                            <button
                                type="button"
                                onClick={() => onRedispatch?.(booking)}
                                className="rounded-lg border border-[#1F41BB] text-[#1F41BB] text-xs font-semibold px-4 py-2 hover:bg-[#EEF2FF]"
                            >
                                Re-dispatch
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlotDispatchStatusPanel;
