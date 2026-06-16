import React from "react";
import UserDropdown from "../../../../../../components/shared/UserDropdown/UserDropdown";
import Button from "../../../../../../components/ui/Button/Button";
import ThreeDotsIcon from "../../../../../../components/svg/ThreeDotsIcon";
import { formatCurrency } from "../../../../../../utils/functions/formatters";

const RidesManagementCard = ({ ride, onDelete, distanceUnit }) => {

    const statusColors = {
        pending: "bg-[#F5C60B] text-white",
        cancelled: "bg-red-500 text-white",
        completed: "bg-green-500 text-white",
        ongoing: "bg-[#10B981] text-white",
        default: "bg-[#EFEFEF] text-gray-600"
    };

    const formatDistance = (distanceInMeters) => {
        if (!distanceInMeters) return "-";
        if (distanceUnit === "Km") {
            return `${(distanceInMeters / 1000).toFixed(2)} Km`;
        }
        return `${(distanceInMeters / 1609.34).toFixed(2)} Miles`;
    };

    const capitalizeFirst = (value) => {
        if (!value) return "-";
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const actionOptions = [];

    if (ride.booking_status?.toLowerCase() === "pending" && onDelete) {
        actionOptions.push({
            label: "Delete",
            onClick: () => onDelete(ride),
        });
    }

    return (
        <div className="bg-white rounded-[15px] p-4 hover:shadow-md w-full overflow-x-auto">
            <div className="flex items-center gap-3">

                <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="w-52">
                        <p className="font-semibold text-xl">{ride.booking_id}</p>
                        <p
                            className={`text-[10px] px-4 py-1 font-bold rounded-full inline-block
                            ${statusColors[ride.booking_status] || statusColors.default}`}
                        >
                            {capitalizeFirst(ride.booking_status)}
                        </p>
                    </div>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] flex-shrink-0 w-[165px]">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Driver Name</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">{capitalizeFirst(ride?.driver_detail?.name || "-")}</p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] flex-shrink-0 w-[165px]">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Customer Name</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">{capitalizeFirst(ride.name)}</p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] flex-shrink-0 w-[245px]">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Route</p>
                    <p className="flex flex-col text-[#333333] text-center font-semibold text-xs">
                        <span className="line-clamp-1">{ride.pickup_location}</span>
                        <span className="line-clamp-1">{ride.destination_location}</span>
                    </p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] flex-shrink-0 w-[210px]">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Time</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">{capitalizeFirst(ride.pickup_time)}</p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] flex-shrink-0 w-[107px]">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Fare</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">
                        {formatCurrency(ride.booking_amount)}
                    </p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] flex-shrink-0 w-[130px]">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Distance</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">
                        {formatDistance(ride.distance)}
                    </p>
                </div>

                {ride.booking_status?.toLowerCase() === "pending" && actionOptions.length > 0 && (
                    <UserDropdown options={actionOptions} itemData={ride}>
                        <Button className="w-10 h-10 bg-[#EFEFEF] rounded-full flex justify-center items-center mr-4">
                            <ThreeDotsIcon />
                        </Button>
                    </UserDropdown>
                )}

            </div>
        </div>
    );
};

export default RidesManagementCard;
