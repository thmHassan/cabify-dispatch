const ENABLED_STATUSES = new Set(["enable", "enabled", 1, true]);

export const PLOT_BASED_DISPATCH_SYSTEMS = new Set([
    "auto_dispatch_plot_based",
    "auto_dispatch_plot_base",
]);

export const NEAREST_DRIVER_DISPATCH_SYSTEM = "auto_dispatch_nearest_driver";
export const MANUAL_DISPATCH_ONLY_SYSTEM = "manual_dispatch_only";

export const isDispatchSystemEnabled = (item) =>
    ENABLED_STATUSES.has(item?.status);

export const isPlotBasedDispatchSystem = (item) =>
    PLOT_BASED_DISPATCH_SYSTEMS.has(item?.dispatch_system) && isDispatchSystemEnabled(item);

export const isNearestDriverDispatchSystem = (item) =>
    item?.dispatch_system === NEAREST_DRIVER_DISPATCH_SYSTEM && isDispatchSystemEnabled(item);

export const isManualDispatchOnlySystem = (item) =>
    item?.dispatch_system === MANUAL_DISPATCH_ONLY_SYSTEM && isDispatchSystemEnabled(item);

export const dispatchSystemListHasPlotBased = (items) =>
    Array.isArray(items) && items.some(isPlotBasedDispatchSystem);

export const dispatchSystemListHasNearestDriver = (items) =>
    Array.isArray(items) && items.some(isNearestDriverDispatchSystem);
