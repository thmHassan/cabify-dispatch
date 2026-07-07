import React from "react";
import UserDropdown from "../../../../../../components/shared/UserDropdown/UserDropdown";
import Button from "../../../../../../components/ui/Button/Button";
import ThreeDotsIcon from "../../../../../../components/svg/ThreeDotsIcon";
import { formatCurrency } from "../../../../../../utils/functions/formatters";
import { formatDistanceFromBooking } from "../../../../../../utils/functions/tenantSettings";

const RidesManagementCard = ({ ride, onDelete, distanceUnit }) => {

    const statusColors = {
        pending: "bg-[#F5C60B] text-white",
        cancelled: "bg-red-500 text-white",
        completed: "bg-green-500 text-white",
        ongoing: "bg-[#10B981] text-white",
        default: "bg-[#EFEFEF] text-gray-600"
    };

    const capitalizeFirst = (value) => {
        if (!value) return "-";
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const driverName =
        ride?.driverDetail?.name ||
        ride?.driver_detail?.name ||
        ride?.driver_name ||
        ride?.driverName ||
        (ride?.driver ? "Driver details loading" : "No driver selected");

    const actionOptions = [];

    if (ride.booking_status?.toLowerCase() === "pending" && onDelete) {
        actionOptions.push({
            label: "Delete",
            onClick: () => onDelete(ride),
        });
    }

    return (
        <div className="bg-white rounded-xl p-4 hover:shadow-md w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(130px,1fr)_minmax(90px,.7fr)_minmax(90px,.7fr)_minmax(170px,1.3fr)_minmax(78px,.55fr)_minmax(70px,.5fr)_minmax(85px,.55fr)_44px] items-center gap-3">

                <div className="flex flex-col gap-2 min-w-0">
                    <div className="min-w-0">
                        <p className="font-semibold text-base xl:text-sm 2xl:text-base truncate">{ride.booking_id}</p>
                        <p
                            className={`text-[10px] px-4 py-1 font-bold rounded-full inline-block
                            ${statusColors[ride.booking_status] || statusColors.default}`}
                        >
                            {capitalizeFirst(ride.booking_status)}
                        </p>
                    </div>
                </div>

                <div className="inline-flex flex-col px-3 py-2 rounded-full bg-[#EFEFEF] min-w-0">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Driver Name</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">{capitalizeFirst(driverName)}</p>
                </div>

                <div className="inline-flex flex-col px-3 py-2 rounded-full bg-[#EFEFEF] min-w-0">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Customer Name</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">{capitalizeFirst(ride.name)}</p>
                </div>

                <div className="inline-flex flex-col px-3 py-2 rounded-2xl bg-[#EFEFEF] min-w-0">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Route</p>
                    <p className="flex flex-col text-[#333333] text-center font-semibold text-xs">
                        <span className="line-clamp-1">{ride.pickup_location}</span>
                        <span className="line-clamp-1">{ride.destination_location}</span>
                    </p>
                </div>

                <div className="inline-flex flex-col px-3 py-2 rounded-full bg-[#EFEFEF] min-w-0">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Time</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">{capitalizeFirst(ride.pickup_time)}</p>
                </div>

                <div className="inline-flex flex-col px-3 py-2 rounded-full bg-[#EFEFEF] min-w-0">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Fare</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">
                        {formatCurrency(ride.booking_amount)}
                    </p>
                </div>

                <div className="inline-flex flex-col px-3 py-2 rounded-full bg-[#EFEFEF] min-w-0">
                    <p className="text-xs font-semibold text-[#6C6C6C] text-center">Distance</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">
                        {formatDistanceFromBooking(ride, distanceUnit)}
                    </p>
                </div>

                {ride.booking_status?.toLowerCase() === "pending" && actionOptions.length > 0 && (
                    <UserDropdown options={actionOptions} itemData={ride}>
                        <Button className="w-10 h-10 bg-[#EFEFEF] rounded-full flex justify-center items-center">
                            <ThreeDotsIcon />
                        </Button>
                    </UserDropdown>
                )}

            </div>
        </div>
    );
};

export default RidesManagementCard;
