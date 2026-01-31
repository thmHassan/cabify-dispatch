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

            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] whitespace-nowrap">
                <p className="text-xs text-center text-[#6C6C6C]">Ride Id</p>
                <p className="text-[#333333] text-center font-semibold text-sm">
                    {cancellations.booking_id}
                </p>
            </div>

            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF]">
                <div className="w-[150px]">
                    <p className="text-xs text-center text-[#6C6C6C]">User Name</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">
                        {capitalizeFirst(cancellations.name)}
                    </p>
                </div>
            </div>

            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF]">
                <div className="w-[150px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Driver Name</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">
                        {capitalizeFirst(cancellations?.driver_detail?.name)}
                    </p>
                </div>
            </div>

            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF]">
                <div className="w-[100px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Service</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">
                        {capitalizeFirst(cancellations.booking_type)}
                    </p>
                </div>
            </div>

            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] whitespace-nowrap">
                <div className="w-[100px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Amount</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">
                        {currencySymbol} {formatAmount(cancellations.booking_amount)}
                    </p>
                </div>
            </div>

            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] w-[140px]">
                <div className="w-[114px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Cancelled By</p>
                    <p className="text-[#333333] text-center font-semibold text-sm truncate">
                        {capitalizeFirst(cancellations.cancelled_by)}
                    </p>
                </div>
            </div>

            <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] w-[220px]">
                <div className="w-[173px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Reason</p>
                    <p className="text-[#333333] text-center font-semibold text-[14px] line-clamp-2">
                        {capitalizeFirst(cancellations.cancel_reason)}
                    </p>
                </div>
            </div>

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