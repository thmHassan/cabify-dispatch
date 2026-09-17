import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../../../../components/ui/Button/Button";
import AppLogoLoader from "../../../../../../components/shared/AppLogoLoader";
import { apiGetDriverManagementById } from "../../../../../../services/DriverManagementService";
import { apiGetUserById } from "../../../../../../services/UserService";
import { formatDateTime } from "../../../../../../utils/functions/formatters";
import { formatPhoneDisplay } from "../../../../../../utils/functions/tenantSettings";

const DetailRow = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-medium text-gray-900 break-words">{value || "-"}</p>
    </div>
);

export const getTicketCreatorInfo = (ticket) => {
    if (!ticket) {
        return { userId: null, userType: null, displayName: "Unknown", userDetail: null };
    }

    const userDetail = ticket.user_detail || ticket.customer_detail;
    const userTypeRaw =
        ticket.user_type ||
        userDetail?.user_type ||
        (ticket.driver_id ? "driver" : ticket.user_id ? "user" : null);
    const userType = userTypeRaw?.toLowerCase?.() || userTypeRaw;

    const userId =
        ticket.user_id ||
        ticket.driver_id ||
        userDetail?.id ||
        userDetail?.user_id;

    const displayName =
        ticket.customer ||
        userDetail?.name ||
        userDetail?.full_name ||
        "Unknown";

    return { userId, userType, displayName, userDetail };
};

const capitalizeFirst = (value) => {
    if (!value) return "-";
    return String(value).charAt(0).toUpperCase() + String(value).slice(1);
};

const TicketUserModal = ({ ticket, onClose }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { userId, userType, displayName, userDetail } = useMemo(
        () => getTicketCreatorInfo(ticket),
        [ticket]
    );

    const isDriver = userType === "driver";

    const fetchProfile = useCallback(async () => {
        if (!userId) {
            setProfile(userDetail || null);
            setError(userDetail ? null : "User details are not available for this ticket.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = isDriver
                ? await apiGetDriverManagementById({ id: userId })
                : await apiGetUserById({ id: userId });

            if (response?.data?.success === 1 || response?.status === 200) {
                const data =
                    response?.data?.driver ||
                    response?.data?.user ||
                    response?.data?.data ||
                    null;
                setProfile(data || userDetail || null);
            } else {
                setError(response?.data?.message || "Failed to load user details");
                setProfile(userDetail || null);
            }
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to load user details");
            setProfile(userDetail || null);
        } finally {
            setLoading(false);
        }
    }, [isDriver, userDetail, userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const phone = formatPhoneDisplay(
        profile?.country_code || userDetail?.country_code,
        profile?.phone_no || profile?.phone || userDetail?.phone_no || userDetail?.phone
    );

    const title = isDriver ? "Driver Details" : "User Details";

    return (
        <div className="min-w-[180px] max-w-lg">
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-500 mt-1">#{ticket?.ticket_id || "-"}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    aria-label="Close"
                >
                    x
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <AppLogoLoader />
                </div>
            ) : (
                <>
                    {error && !profile && (
                        <p className="text-red-500 text-sm mb-4">{error}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DetailRow label="Name" value={profile?.name || displayName} />
                        <DetailRow label="Type" value={capitalizeFirst(userType || "user")} />
                        <DetailRow label="ID" value={userId ? `#${userId}` : "-"} />
                        <DetailRow label="Email" value={profile?.email || userDetail?.email} />
                        <DetailRow label="Phone" value={phone} />
                        <DetailRow label="Status" value={capitalizeFirst(profile?.status)} />
                        {!isDriver && (
                            <>
                                <DetailRow label="Address" value={profile?.address || userDetail?.address} />
                                <DetailRow label="City" value={profile?.city || userDetail?.city} />
                                <DetailRow label="Rating" value={profile?.rating || userDetail?.rating} />
                                <DetailRow label="Device Count" value={profile?.device_count || userDetail?.device_count} />
                            </>
                        )}
                        {isDriver && (
                            <>
                                <DetailRow label="License" value={profile?.driver_license || userDetail?.driver_license} />
                                <DetailRow label="Plate No" value={profile?.plate_no || userDetail?.plate_no} />
                                <DetailRow label="Vehicle" value={profile?.vehicle_name || userDetail?.vehicle_name} />
                            </>
                        )}
                        <div className="sm:col-span-2">
                            <DetailRow
                                label="Created At"
                                value={formatDateTime(profile?.created_at || userDetail?.created_at)}
                            />
                        </div>
                    </div>

                    {error && profile && (
                        <p className="text-amber-600 text-xs mt-4">
                            Showing limited details from ticket data. {error}
                        </p>
                    )}
                </>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                <Button type="filledGray" onClick={onClose} className="px-6">
                    Close
                </Button>
            </div>
        </div>
    );
};

export default TicketUserModal;
