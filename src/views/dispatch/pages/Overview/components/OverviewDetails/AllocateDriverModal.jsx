import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiGetDriverManagement } from "../../../../../../services/DriverManagementService";
import { assignDriverToBooking } from "../../../../../../services/AddBookingServices";
import Button from "../../../../../../components/ui/Button/Button";

const AllocateDriverModal = ({ bookingData, onClose, onSuccess }) => {
    const [drivers, setDrivers] = useState([]);
    const [selectedDriverId, setSelectedDriverId] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const assignmentType = bookingData?._assignmentType || "allocate_driver";
    const isPreJob = assignmentType === "pre_job";

    useEffect(() => {
        fetchDrivers();
    }, []);

    useEffect(() => {
        if (bookingData?.driver) {
            setSelectedDriverId(bookingData.driver.toString());
        }
    }, [bookingData]);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const response = await apiGetDriverManagement({ page: 1, perPage: 100 });
            if (response?.data?.success === 1) {
                const driversList = response.data.list?.data || [];
                setDrivers(driversList.filter((d) => d.driving_status === "idle"));
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

    const handleAssignDriver = async () => {
        if (!selectedDriverId) {
            toast.error("Please select a driver");
            return;
        }

        setSaving(true);
        try {
            const response = await assignDriverToBooking(
                bookingData.id,
                selectedDriverId,
                assignmentType
            );

            if (response?.data?.success) {
                const successMessage = isPreJob
                    ? `Pre-job sent to driver. Waiting for driver response.`
                    : `Driver assigned successfully. Waiting for driver response.`;

                toast.success(successMessage);

                const selectedDriver = drivers.find(
                    (d) => d.id.toString() === selectedDriverId.toString()
                );

                onSuccess({
                    ...bookingData,
                    driver: selectedDriverId,
                    driverDetail: selectedDriver
                        ? {
                            id: selectedDriver.id,
                            name: selectedDriver.name,
                            phone_no: selectedDriver.phone_no,
                        }
                        : null,
                    _assignmentType: assignmentType,
                    _successMessage: successMessage,
                });
                onClose();
            } else {
                toast.error(response?.data?.message || "Failed to assign driver");
            }
        } catch (error) {
            console.error("Assign driver error:", error);
            toast.error(error?.response?.data?.message || "Failed to assign driver");
        } finally {
            setSaving(false);
        }
    };

    return (
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
                    <span>{bookingData.booking_id}</span>
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value="">Select a Driver</option>
                        {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                                {driver.name} - {driver.phone_no}
                            </option>
                        ))}
                    </select>
                )}

                {drivers.length === 0 && !loading && (
                    <p className="text-sm text-red-500 mt-2">No idle drivers available</p>
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
                    onClick={handleAssignDriver}
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
    );
};

export default AllocateDriverModal;