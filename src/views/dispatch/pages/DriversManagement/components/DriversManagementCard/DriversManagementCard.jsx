import React from "react";
import UserDropdown from "../../../../../../components/shared/UserDropdown";
import Button from "../../../../../../components/ui/Button/Button";
import ThreeDotsIcon from "../../../../../../components/svg/ThreeDotsIcon";

const DriverManagementCard = ({ driver, onEdit, onDelete }) => {
    const rawStatus = driver?.status;

    const normalizedStatus =
        typeof rawStatus === "string"
            ? rawStatus.trim().toLowerCase()
            : rawStatus;

    const statusMap = {
        accepted: "accepted",
        approved: "accepted",

        rejected: "rejected",
        declined: "rejected",

        pending: "pending",
    };

    const finalStatus = statusMap[normalizedStatus];

    const statusColorMap = {
        accepted: "bg-[#10B981] text-white", // green
        rejected: "bg-[#EF4444] text-white", // red
        pending: "bg-[#FACC15] text-black",  // yellow
    };

    const actionOptions = [
        { label: "Edit", onClick: () => onEdit(driver) },
        { label: "Delete", onClick: () => onDelete(driver) },
    ];

    return (
        <div className="bg-white rounded-[15px] p-4 flex items-center justify-between hover:shadow-md overflow-x-auto">

            <div className="w-60">
                <p className="font-semibold text-xl">{driver?.name || "-"}</p>
                <p className="text-[10px]">{driver?.email}</p>
                <p className="text-xs">{driver?.phone}</p>
            </div>

            <div className="flex items-center gap-3">

                <InfoChip title="Vehicle Type" value={driver?.vahicleType || "Bike"} />
                <InfoChip
                    title="Change Req"
                    value={Number(driver?.vehicle_change_request) > 0 ? "Yes" : "No"}
                />
                <InfoChip title="Referral Code" value={driver?.referralCode || "234567"} />

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#006FFF1A]">
                    <p className="text-xs text-center text-gray-500">Wallet Balance</p>
                    <p className="text-sm font-semibold text-center text-[#1F41BB]">
                        {driver?.wallet_balance || "-"}
                    </p>
                </div>

                {finalStatus && (
                    <div
                        className={`
              ${statusColorMap[finalStatus]}
              h-10 w-24 flex items-center justify-center rounded-full
            `}
                    >
                        <p className="font-semibold text-sm capitalize">
                            {finalStatus}
                        </p>
                    </div>
                )}

                <UserDropdown options={actionOptions} itemData={driver}>
                    <Button className="w-10 h-10 bg-[#EFEFEF] rounded-full flex justify-center items-center">
                        <ThreeDotsIcon />
                    </Button>
                </UserDropdown>

            </div>
        </div>
    );
};


const InfoChip = ({ title, value }) => (
    <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100">
        <p className="text-xs text-center text-gray-500">{title}</p>
        <p className="text-sm font-semibold text-center">{value}</p>
    </div>
);

export default DriverManagementCard;
