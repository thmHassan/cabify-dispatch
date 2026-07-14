import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiGetDriverManagement } from "../../../../../../services/DriverManagementService";
import { assignDriverToBooking, isApiSuccess, getApiErrorMessage } from "../../../../../../services/AddBookingServices";
import { extractUpdatedBookingFromResponse } from "../../../../../../utils/functions/bookingDateFilter";
import Button from "../../../../../../components/ui/Button/Button";
import { getDispatcherName } from "../../../../../../utils/auth";

const getDriverOnlineStatusValue = (driver) =>
    (driver?.online_status ?? driver?.driver_status ?? driver?.status ?? "").toString().toLowerCase();
const resolveDriverWorkStatus = (driver) => {
    const status = (driver?.driving_status ?? driver?.driver_status ?? "").toString().toLowerCase();
    return ["busy", "active", "on_job", "onjob"].includes(status) ? "Busy" : "Idle";
};

const resolveDriverOnlineStatus = (driver) => {
    const status = getDriverOnlineStatusValue(driver);
    return status === "online" ? "Online" : "Offline";
};

const resolveDriverStatusColor = (driver) => (resolveDriverOnlineStatus(driver) === "Online" ? "#16A34A" : "#DC2626");
const resolveDriverStatusClass = (driver) => (resolveDriverOnlineStatus(driver) === "Online" ? "text-green-600" : "text-red-600");

const AlertModal = ({ isOpen, message, onClose, onConfirm }) => {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => { onClose(); }, 10000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Driver Busy – Heads Up!</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <Button
                        btnSize="md"
                        type="filledGray"
                        className="!px-6"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        btnSize="md"
                        type="filled"
                        className="!px-6"
                        onClick={onConfirm}
                    >
                        Proceed Anyway
                    </Button>
                </div>
            </div>
        </div>
    );
};

const AllocateDriverModal = ({ bookingData, onClose, onSuccess }) => {
    const [drivers, setDrivers] = useState([]);
    const [selectedDriverId, setSelectedDriverId] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showBusyAlert, setShowBusyAlert] = useState(false);

    const assignmentType = bookingData?._assignmentType || "allocate_driver";
    const isPreJob = assignmentType === "pre_job";

    const getDriverId = (driver) => driver?.id ?? driver?.driver_id;

    useEffect(() => {
        fetchDrivers();
    }, []);

    useEffect(() => {
        const assignedDriverId = bookingData?.driver ?? bookingData?.pending_driver_id;
        if (assignedDriverId) {
            setSelectedDriverId(String(assignedDriverId));
        }
    }, [bookingData]);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const response = await apiGetDriverManagement({ page: 1, perPage: 100 });
            if (response?.data?.success === 1) {
                const driversList = response.data.list?.data || [];
                setDrivers(driversList);
            } else {
                setDrivers([]);
            }
        } catch (error) {
            console.error("Fetch drivers error:", error);
            toast.error("Failed to fetch drivers");
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    };

    const selectedDriver = drivers.find(
        (d) => String(getDriverId(d)) === String(selectedDriverId)
    );
    const isSelectedDriverBusy = selectedDriver?.driving_status === "busy";

    const handleAssignClick = () => {
        if (!selectedDriverId) {
            toast.error("Please select a driver");
            return;
        }
        if (isSelectedDriverBusy) {
            setShowBusyAlert(true);
            return;
        }
        doAssign();
    };

    const doAssign = async () => {
        setShowBusyAlert(false);

        const bookingId = Number(bookingData?.id);
        const driverId = Number(selectedDriverId);

        if (!Number.isFinite(bookingId) || bookingId <= 0) {
            toast.error("Invalid booking. Please refresh the list and try again.");
            return;
        }

        if (!Number.isFinite(driverId) || driverId <= 0) {
            toast.error("Please select a valid driver");
            return;
        }

        setSaving(true);
        try {
            const dispatcherName = getDispatcherName();
            const response = await assignDriverToBooking(
                bookingId,
                driverId,
                assignmentType,
                dispatcherName
            );

            if (isApiSuccess(response?.data)) {
                const successMessage = isPreJob
                    ? `Pre-job sent to driver. Waiting for driver response.`
                    : `Driver assigned successfully. Waiting for driver response.`;

                toast.success(response?.data?.message || successMessage);

                const apiBooking = extractUpdatedBookingFromResponse(response?.data, bookingData);

                onSuccess({
                    ...apiBooking,
                    driver: driverId,
                    driverDetail: selectedDriver
                        ? {
                            id: getDriverId(selectedDriver),
                            name: selectedDriver.name,
                            phone_no: selectedDriver.phone_no,
                        }
                        : apiBooking.driverDetail || null,
                    booking_status: apiBooking.booking_status || "pending_acceptance",
                    _assignmentType: assignmentType,
                    _successMessage: response?.data?.message || successMessage,
                });
                onClose();
            } else {
                toast.error(response?.data?.message || "Failed to assign driver");
            }
        } catch (error) {
            console.error("Assign driver error:", error);
            toast.error(getApiErrorMessage(error, "Failed to assign driver"));
        } finally {
            setSaving(false);
        }
    };

    const idleDrivers = drivers.filter((d) => d.driving_status !== "busy");
    const busyDrivers = drivers.filter((d) => d.driving_status === "busy");

    return (
        <>
            <AlertModal
                isOpen={showBusyAlert}
                message={`${selectedDriver?.name ?? "This driver"} (${resolveDriverOnlineStatus(selectedDriver)}) is currently on an active ride. The new booking will be queued and will start only after their current ride is completed. Do you want to proceed?`}
                onClose={() => setShowBusyAlert(false)}
                onConfirm={doAssign}
            />

            <div className="w-full">
                <div className="px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {isPreJob ? "Send Pre-Job" : "Allocate Driver"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="py-3 px-4 bg-gray-100 mx-6 rounded">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">Booking ID:</span>
                        <span>{bookingData.booking_id || bookingData.id}</span>
                    </div>
                    {isPreJob && (
                        <div className="mt-1 text-xs text-blue-600 font-medium">
                            This will send a pre-job notification to the selected driver
                        </div>
                    )}
                </div>

                <div className="px-6 py-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Driver
                    </label>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                        </div>
                    ) : (
                        <select
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="">Select a Driver</option>

                            {idleDrivers.length > 0 && (
                                <optgroup label="Available (Idle)">
                                    {idleDrivers.map((driver) => {
                                        const driverId = getDriverId(driver);
                                        const driverStatus = resolveDriverOnlineStatus(driver);
                                        const driverStatusColor = resolveDriverStatusColor(driver);
                                        return (
                                            <option key={driverId} value={driverId} style={{ color: driverStatusColor }}>
                                                {driver.name} – {driver.phone_no} ({driverStatus} / {resolveDriverWorkStatus(driver)})
                                            </option>
                                        );
                                    })}
                                </optgroup>
                            )}

                            {busyDrivers.length > 0 && (
                                <optgroup label="Busy (Active Ride)">
                                    {busyDrivers.map((driver) => {
                                        const driverId = getDriverId(driver);
                                        const driverStatus = resolveDriverOnlineStatus(driver);
                                        const driverStatusColor = resolveDriverStatusColor(driver);
                                        return (
                                            <option key={driverId} value={driverId} style={{ color: driverStatusColor }}>
                                                {driver.name} – {driver.phone_no} ({driverStatus} / {resolveDriverWorkStatus(driver)})
                                            </option>
                                        );
                                    })}
                                </optgroup>
                            )}
                        </select>
                    )}

                    {/* {isSelectedDriverBusy && (
                        <div className="mt-3 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-xs text-yellow-700">
                                This driver is currently on an active ride. The booking will be queued and start after their current ride completes.
                            </p>
                        </div>
                    )} */}

                {drivers.length === 0 && !loading && (
                        <p className="text-sm text-red-500 mt-2">No drivers available</p>
                    )}
                    {selectedDriver && (
                            <p className={`mt-2 text-sm font-medium ${resolveDriverStatusClass(selectedDriver)}`}>
                                Current driver status: {resolveDriverOnlineStatus(selectedDriver)} / {resolveDriverWorkStatus(selectedDriver)}
                            </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-end mx-6 my-3">
                    <Button
                        btnSize="md"
                        type="filledGray"
                        className="!px-10 pt-4 pb-[10px] w-full sm:w-auto"
                        onClick={onClose}
                    >
                        <span>Cancel</span>
                    </Button>
                    <Button
                        btnType="submit"
                        btnSize="md"
                        type="filled"
                        className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
                        onClick={handleAssignClick}
                        disabled={!selectedDriverId || saving || loading}
                    >
                        <span>
                            {saving
                                ? isPreJob ? "Sending..." : "Assigning..."
                                : isPreJob ? "Send Pre-Job" : "Assign Driver"}
                        </span>
                    </Button>
                </div>
            </div>
        </>
    );
};

export default AllocateDriverModal;

// import { useState, useEffect } from "react";
// import toast from "react-hot-toast";
// import { apiGetDriverManagement } from "../../../../../../services/DriverManagementService";
// import { assignDriverToBooking } from "../../../../../../services/AddBookingServices";
// import Button from "../../../../../../components/ui/Button/Button";
// import { getDispatcherName } from "../../../../../../utils/auth";

// const AllocateDriverModal = ({ bookingData, onClose, onSuccess }) => {
//     const [drivers, setDrivers] = useState([]);
//     const [selectedDriverId, setSelectedDriverId] = useState("");
//     const [loading, setLoading] = useState(false);
//     const [saving, setSaving] = useState(false);
//     const assignmentType = bookingData?._assignmentType || "allocate_driver";
//     const isPreJob = assignmentType === "pre_job";

//     useEffect(() => {
//         fetchDrivers();
//     }, []);

//     useEffect(() => {
//         if (bookingData?.driver) {
//             setSelectedDriverId(bookingData.driver.toString());
//         }
//     }, [bookingData]);

//     const fetchDrivers = async () => {
//         setLoading(true);
//         try {
//             const response = await apiGetDriverManagement({ page: 1, perPage: 100 });
//             if (response?.data?.success === 1) {
//                 const driversList = response.data.list?.data || [];
//                 setDrivers(driversList);
//             } else {
//                 setDrivers([]);
//             }
//         } catch (error) {
//             console.error("Fetch drivers error:", error);
//             toast.error("Failed to fetch drivers");
//             setDrivers([]);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleAssignDriver = async () => {
//         if (!selectedDriverId) {
//             toast.error("Please select a driver");
//             return;
//         }

//         setSaving(true);
//         try {
//             const dispatcherName = getDispatcherName();
//             const response = await assignDriverToBooking(
//                 bookingData.id,
//                 selectedDriverId,
//                 assignmentType,
//                 dispatcherName
//             );

//             if (response?.data?.success) {
//                 const successMessage = isPreJob
//                     ? `Pre-job sent to driver. Waiting for driver response.`
//                     : `Driver assigned successfully. Waiting for driver response.`;

//                 toast.success(successMessage);

//                 const selectedDriver = drivers.find(
//                     (d) => d.id.toString() === selectedDriverId.toString()
//                 );

//                 onSuccess({
//                     ...bookingData,
//                     driver: selectedDriverId,
//                     driverDetail: selectedDriver
//                         ? {
//                             id: selectedDriver.id,
//                             name: selectedDriver.name,
//                             phone_no: selectedDriver.phone_no,
//                         }
//                         : null,
//                     _assignmentType: assignmentType,
//                     _successMessage: successMessage,
//                 });
//                 onClose();
//             } else {
//                 toast.error(response?.data?.message || "Failed to assign driver");
//             }
//         } catch (error) {
//             console.error("Assign driver error:", error);
//             toast.error(error?.response?.data?.message || "Failed to assign driver");
//         } finally {
//             setSaving(false);
//         }
//     };

//     return (
//         <div className="w-full">
//             <div className="px-6 py-4 flex items-center justify-between">
//                 <h2 className="text-xl font-semibold text-gray-800">
//                     {isPreJob ? "Send Pre-Job" : "Allocate Driver"}
//                 </h2>
//                 <button
//                     onClick={onClose}
//                     className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
//                 >
//                     ×
//                 </button>
//             </div>

//             <div className="py-3 px-4 bg-gray-100 mx-6 rounded">
//                 <div className="flex items-center gap-4 text-sm">
//                     <span className="font-medium">Booking ID:</span>
//                     <span>{bookingData.booking_id}</span>
//                 </div>
//                 {isPreJob && (
//                     <div className="mt-1 text-xs text-blue-600 font-medium">
//                         This will send a pre-job notification to the selected driver
//                     </div>
//                 )}
//             </div>

//             <div className="px-6 py-6">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Select Driver
//                 </label>

//                 {loading ? (
//                     <div className="flex items-center justify-center py-8">
//                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//                     </div>
//                 ) : (
//                     <select
//                         value={selectedDriverId}
//                         onChange={(e) => setSelectedDriverId(e.target.value)}
//                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
//                     >
//                         <option value="">Select a Driver</option>
//                         {drivers.map((driver) => (
//                             <option key={driver.id} value={driver.id}>
//                                 {driver.name} - {driver.phone_no}
//                             </option>
//                         ))}
//                     </select>
//                 )}

//                 {drivers.length === 0 && !loading && (
//                     <p className="text-sm text-red-500 mt-2">No idle drivers available</p>
//                 )}
//             </div>

//             <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-end mx-6 my-3">
//                 <Button
//                     btnSize="md"
//                     type="filledGray"
//                     className="!px-10 pt-4 pb-[10px] w-full sm:w-auto"
//                     onClick={onClose}
//                 >
//                     <span>Cancel</span>
//                 </Button>
//                 <Button
//                     btnType="submit"
//                     btnSize="md"
//                     type="filled"
//                     className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
//                     onClick={handleAssignDriver}
//                     disabled={!selectedDriverId || saving || loading}
//                 >
//                     <span>
//                         {saving
//                             ? isPreJob ? "Sending..." : "Assigning..."
//                             : isPreJob ? "Send Pre-Job" : "Assign Driver"}
//                     </span>
//                 </Button>
//             </div>
//         </div>
//     );
// };

// export default AllocateDriverModal;
