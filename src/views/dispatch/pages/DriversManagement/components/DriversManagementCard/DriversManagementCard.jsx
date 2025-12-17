import React, { useState } from "react";
import UserDropdown from "../../../../../../components/shared/UserDropdown";
import Button from "../../../../../../components/ui/Button/Button";
import ThreeDotsIcon from "../../../../../../components/svg/ThreeDotsIcon";
// import { apieditDriverStatus } from "../../../../../../services/DriversDocumentServices";

const DriverManagementCard = ({ driver, onEdit, onDelete, onStatusChange }) => {
    const [status, setStatus] = useState(driver.status);
    const [loading, setLoading] = useState(false);

    const actionOptions = [
        {
            label: "Edit",
            onClick: () => onEdit(driver),
        },
        {
            label: "Delete",
            onClick: () => onDelete(driver),
        },
    ];

    // const handleStatusChange = async (newStatus) => {
    //     if (newStatus === status) return;
    //     setLoading(true);

    //     try {
    //         const response = await apieditDriverStatus({
    //             id: driver.id,
    //             status: newStatus
    //         });

    //         if (response?.data?.success === 1) {
    //             setStatus(newStatus);

    //             if (onStatusChange) {
    //                 onStatusChange(driver.id, newStatus);
    //             }
    //         } else {
    //             console.error("Failed to update status:", response);
    //             alert("Failed to update status. Try again.");
    //         }
    //     } catch (error) {
    //         console.error("Error updating driver status:", error);
    //         alert("Error updating status. Please try again.");
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    return (
        <div className="bg-white rounded-[15px] p-4 gap-2 flex items-center justify-between hover:shadow-md overflow-x-auto">
            <div className="flex items-center gap-3">
                <div className="w-60">
                    <p className="font-semibold text-xl">{driver.name}</p>
                    <p className="text-[10px]">{driver.email}</p>
                    <p className="text-xs">{driver.phone}</p>
                </div>
            </div>
            <div className="flex items-center justify-center gap-3">
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Vehicle Type</p>
                    <p className="text-black text-center font-semibold text-sm">{driver.vahicleType}</p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Change Req</p>
                    <p className="text-black text-center font-semibold text-sm">{driver.changeReq}</p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Referral Code</p>
                    <p className="text-black text-center font-semibold text-sm">{driver.referralCode}</p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#006FFF1A] text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Wallet Balance</p>
                    <p className="text-black text-center text-[#1F41BB] font-semibold text-sm">{driver.walletBalance}</p>
                </div>

                <div className={
                    driver.status === "Active"
                        ? "bg-[#10B981] text-white xl:h-10 lg:h-10 md:h-10 h-10 w-24 xl:py-3 lg:py-3 md:py-2 py-2 text-center rounded-full"
                        : "bg-[#FF4747] text-white xl:h-10 lg:h-10 md:h-10 h-10 w-24 xl:py-3 lg:py-3 md:py-2 py-2 text-center rounded-full"
                }>
                    <p className="text-white font-semibold text-sm">{driver.status}</p>
                </div>
                <UserDropdown options={actionOptions} itemData={driver}>
                    <Button className="w-10 h-10 bg-[#EFEFEF] rounded-full flex justify-center items-center">
                        <ThreeDotsIcon />
                    </Button>
                </UserDropdown>
            </div>
        </div>
    );
};

export default DriverManagementCard;
