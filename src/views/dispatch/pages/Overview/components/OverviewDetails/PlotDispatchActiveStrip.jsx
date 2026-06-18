import { useEffect, useState } from "react";
import {
    formatPlotDispatchProgressMessage,
    getPlotDispatchSecondsRemaining,
    isPlotDispatchPhaseActive,
} from "../../../../../../utils/plotDispatch/plotDispatchStatus";

const PlotDispatchActiveStrip = ({ activeDispatches = [], onOpenDetails }) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!activeDispatches.length) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [activeDispatches.length]);

    if (!activeDispatches.length) return null;

    return (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[#1F41BB]">
                    Plot dispatch in progress
                </p>
                <span className="text-[10px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    {activeDispatches.length} active
                </span>
            </div>
            <div className="space-y-2">
                {activeDispatches.map(({ booking, status }) => {
                    const message = formatPlotDispatchProgressMessage(status, { now });
                    const seconds = getPlotDispatchSecondsRemaining(status, now);
                    return (
                        <button
                            key={booking.id}
                            type="button"
                            onClick={() => onOpenDetails?.(booking, status)}
                            className="w-full text-left rounded-lg bg-white border border-blue-100 px-3 py-2 hover:border-[#1F41BB] transition-colors"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-gray-900">
                                    #{booking.booking_id || booking.id}
                                </span>
                                {seconds != null && isPlotDispatchPhaseActive(status.phase) && (
                                    <span className="text-[10px] font-bold text-[#1F41BB]">{seconds}s</span>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{message}</p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PlotDispatchActiveStrip;
