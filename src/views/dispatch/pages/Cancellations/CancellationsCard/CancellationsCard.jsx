// import React from "react";

// const CancellationsCard = ({ cancellations }) => {

//     return (
//         <div
//             className="bg-white rounded-[15px] p-4 gap-2 flex items-center justify-between hover:shadow-md overflow-x-auto"
//         >
//             <div className="flex items-center gap-3">
//                 <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
//                     <p className="text-xs text-center text-gray-500">Ride ID</p>
//                     <p className="text-black text-center font-semibold text-sm">{cancellations.rideId}</p>
//                 </div>
//             </div>
//             <div className="flex items-center justify-center gap-3">
//                 <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
//                     <p className="text-xs text-center text-gray-500">User Name</p>
//                     <p className="text-black text-center font-semibold text-sm">{cancellations.userName}</p>
//                 </div>

//                 <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
//                     <p className="text-xs text-center text-gray-500">Driver Name</p>
//                     <p className="text-black text-center font-semibold text-sm">{cancellations.driverName}</p>
//                 </div>
//                 <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
//                     <p className="text-xs text-center text-gray-500">Driver Rating</p>
//                     <p className="text-black text-center font-semibold text-sm">{cancellations.rating}</p>
//                 </div>
//                 <div className="inline-flex w-80 flex-col px-4 py-2 rounded-full bg-gray-100 text-left break-all">
//                     <p className="text-xs text-gray-500">User Comment</p>
//                     <p className="text-black font-semibold text-[12px]">{cancellations.comment}</p>
//                 </div>
//             </div>
//         </div>
//     );
// }

// export default CancellationsCard;

import { useEffect, useState } from "react";
import { getTenantData } from "../../../../../utils/functions/tokenEncryption";

const CancellationsCard = ({ cancellations }) => {
    const currencySymbols = {
        INR: "₹",
        USD: "$",
        EUR: "€",
        GBP: "£",
        AUD: "A$",
        CAD: "C$",
        AED: "د.إ",
    };

    const [currencySymbol, setCurrencySymbol] = useState("₹");

    useEffect(() => {
        const tenant = getTenantData();

        if (tenant?.currency) {
            setCurrencySymbol(currencySymbols[tenant.currency] || tenant.currency);
        }
    }, []);


    const capitalizeFirst = (value) => {
        if (!value) return "-";
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const formatAmount = (amount) => {
        if (amount === null || amount === undefined) return "-";
        return Number(amount).toFixed(2);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";

        const date = new Date(dateString);

        return date.toLocaleString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).replace(",", "")
    };

    return (
        <div className="bg-white rounded-[15px] p-4 gap-[13px] flex items-center justify-between hover:shadow-md overflow-x-auto">

            {/* Ride ID */}
            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] whitespace-nowrap">
                <p className="text-xs text-center text-[#6C6C6C]">Ride Id</p>
                <p className="text-[#333333] text-center font-semibold text-sm">
                    {cancellations.booking_id}
                </p>
            </div>

            {/* User Name */}
            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF]">
                <div className="w-[150px]">
                    <p className="text-xs text-center text-[#6C6C6C]">User Name</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">
                        {capitalizeFirst(cancellations.name)}
                    </p>
                </div>
            </div>

            {/* Driver Name */}
            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF]">
                <div className="w-[150px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Driver Name</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">
                        {capitalizeFirst(cancellations?.driver_detail?.name)}
                    </p>
                </div>
            </div>

            {/* Service */}
            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF]">
                <div className="w-[100px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Service</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">
                        {capitalizeFirst(cancellations.booking_type)}
                    </p>
                </div>
            </div>

            {/* Amount */}
            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] whitespace-nowrap">
                <div className="w-[100px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Amount</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">
                        {currencySymbol} {formatAmount(cancellations.booking_amount)}
                    </p>
                </div>
            </div>

            {/* Cancelled By */}
            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] w-[140px]">
                <div className="w-[114px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Cancelled By</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">
                        {capitalizeFirst(cancellations.cancelled_by)}
                    </p>
                </div>
            </div>


            {/* Reason */}
            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] w-[220px]">
                <div className="w-[173px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Reason</p>
                    <p className="text-[#333333] text-center font-semibold text-[14px] line-clamp-2">
                        {capitalizeFirst(cancellations.cancel_reason)}
                    </p>
                </div>
            </div>

            {/* Initiated At */}
            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF]">
                <div className="w-[140px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Initiated At</p>
                    <p className="text-[#333333] text-center font-semibold text-sm line-clamp-3">
                        {formatDate(cancellations.created_at)}
                    </p>
                </div>
            </div>

        </div>
    );
};

export default CancellationsCard;