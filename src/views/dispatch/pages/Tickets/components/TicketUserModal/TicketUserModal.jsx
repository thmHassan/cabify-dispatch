import React, { useCallback, useEffect, useState } from "react";
import AppLogoLoader from "../../../../../../components/shared/AppLogoLoader";
import { apiGetDriverManagementById } from "../../../../../../services/DriverManagementService";
import { apiGetUserById } from "../../../../../../services/UserService";
import { formatPhoneDisplay } from "../../../../../../utils/functions/tenantSettings";

const DetailRow = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs text-[#6C6C6C]">{label}</span>
        <span className="text-sm text-[#333333] font-medium break-all">{value || "-"}</span>
    </div>
);

const getUserTypeLabel = (userType) => (userType === "driver" ? "Driver" : "Customer");

const TicketUserModal = ({ ticket, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [userData, setUserData] = useState(null);

    const isDriver = ticket?.user_type === "driver";

    const fetchUserDetails = useCallback(async () => {
        if (!ticket?.user_id) {
            setError("User information is not available for this ticket.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = isDriver
                ? await apiGetDriverManagementById({ id: ticket.user_id })
                : await apiGetUserById({ id: ticket.user_id });

            if (response?.data?.success === 1) {
                const data = isDriver
                    ? response.data.driver
                    : response.data.user;
                setUserData(data || null);
            } else {
                setError("Failed to load user details.");
            }
        } catch (err) {
            console.error("Error fetching ticket user details:", err);
            setError("Something went wrong while loading user details.");
        } finally {
            setLoading(false);
        }
    }, [isDriver, ticket?.user_id]);

    useEffect(() => {
        fetchUserDetails();
    }, [fetchUserDetails]);

    const phone = userData
        ? formatPhoneDisplay(userData.country_code, userData.phone_no)
        : "";

    return (
        <div className="w-[420px] bg-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h2 className="text-xl font-semibold">Ticket Creator</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        #{ticket?.ticket_id} · {getUserTypeLabel(ticket?.user_type)}
                    </p>
                </div>
                <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isDriver
                            ? "bg-[#EEF2FF] text-[#1F41BB]"
                            : "bg-[#E4FFF6] text-[#10B981]"
                    }`}
                >
                    {getUserTypeLabel(ticket?.user_type)}
                </span>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <AppLogoLoader />
                </div>
            ) : error ? (
                <p className="text-sm text-red-500 py-6">{error}</p>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <DetailRow label="Name" value={userData?.name} />
                    <DetailRow label="Email" value={userData?.email} />
                    <DetailRow label="Phone" value={phone} />
                    <DetailRow
                        label="Address"
                        value={
                            userData?.address
                                ? `${userData.address}${userData.city ? `, ${userData.city}` : ""}`
                                : ""
                        }
                    />
                    {isDriver ? (
                        <>
                            <DetailRow label="License" value={userData?.driver_license} />
                            <DetailRow label="Vehicle" value={userData?.vehicle_name} />
                            <DetailRow label="Status" value={userData?.status} />
                        </>
                    ) : (
                        <>
                            <DetailRow label="Rating" value={userData?.rating ?? "0"} />
                            <DetailRow label="Devices" value={userData?.device_count ?? "0"} />
                        </>
                    )}
                </div>
            )}

            <div className="flex justify-end mt-6">
                <button
                    onClick={onClose}
                    className="px-6 py-2 border border-[#1F41BB] text-[#1F41BB] rounded-lg"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default TicketUserModal;
