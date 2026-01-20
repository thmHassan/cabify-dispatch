import { useEffect, useRef, useState } from "react";


const LostFoundCard = ({ lostfound, onView, onStatusChange }) => {
    const statusBtnRef = useRef(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const dropdownRef = useRef(null);

    const ALL_STATUSES = ["lost", "searching", "found"];

    const getStatusOptions = (currentStatus) =>
        ALL_STATUSES.filter((status) => status !== currentStatus);

    const handleStatusClick = () => {
        const rect = statusBtnRef.current.getBoundingClientRect();
        setDropdownPos({
            top: rect.bottom + window.scrollY,
            left: rect.right + window.scrollX - 112,
        });
        setShowDropdown((prev) => !prev);
    };

    function formatDateTime(isoString) {
        const date = new Date(isoString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-indexed
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");

        return `${day}-${month}-${year} at ${hours}:${minutes}`;
    }

    const getStatusStyles = (status) => {
        switch (status) {
            case "found":
                return {
                    wrapper: "bg-[#E4FFF6] border-[#10B981] text-[#10B981]",
                };

            case "searching":
                return {
                    wrapper: "bg-[#FFFAE4] border-[#F59E0B] text-[#F59E0B]",
                };

            case "lost":
            default:
                return {
                    wrapper: "bg-[#FFF1F1] border-[#FF4747] text-[#FF4747]",
                };
        }
    };

    const statusStyle = getStatusStyles(lostfound.status);


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                !statusBtnRef.current.contains(event.target)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div
            className="bg-white rounded-[15px] p-4 flex items-center justify-between hover:shadow-md overflow-x-auto"
        >
            <div className="flex items-center gap-3">
                <div className="w-60">
                    <p className="font-semibold text-xl">{lostfound?.booking_details?.user_detail?.name}</p>
                </div>
            </div>
            <div className="flex items-center justify-center gap-3">

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] text-left whitespace-nowrap w-[175px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Driver Name</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">{lostfound?.booking_details?.driver_detail?.name || "-"} </p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] text-left whitespace-nowrap w-[175px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Phone No</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">{lostfound?.booking_details?.user_detail?.country_code || "+91"} {lostfound?.booking_details?.phone_no}</p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] text-left whitespace-nowrap w-[130px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Car Plate No</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">{lostfound?.booking_details?.user_detail?.plate_no || "-"}</p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] text-left whitespace-nowrap w-[186px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Date & Time</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">{lostfound?.booking_details?.created_at
                        ? formatDateTime(lostfound.booking_details.created_at)
                        : "-"}
                    </p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] text-left whitespace-nowrap w-[205px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Descrition</p>
                    <p className="text-[#333333] text-center font-semibold text-sm line-clamp-1">{lostfound.descrition || "-"}</p>
                </div>

                <button
                    ref={statusBtnRef}
                    onClick={handleStatusClick}
                    className={`px-3 w-28 py-2 rounded-full border flex justify-between items-center 
                     ${statusStyle.wrapper}`}
                >
                    <div className="flex items-center">
                        {/* <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} /> */}
                        <span className="font-semibold text-sm capitalize">
                            {lostfound.status}
                        </span>
                    </div>

                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>

                </button>
            </div>
            {showDropdown && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-28 -ml-4 bg-white border rounded-lg shadow-md"
                    style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                    {getStatusOptions(lostfound.status).map((status) => (
                        <button
                            key={status}
                            onClick={() => {
                                setShowDropdown(false);
                                onStatusChange(lostfound.id, status);
                            }}
                            className="w-full px-3 py-2 text-left text-sm capitalize hover:bg-gray-100"
                        >
                            {status}
                        </button>
                    ))}
                </div>
            )}

        </div>
    );
};

export default LostFoundCard;