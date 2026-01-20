import React, { useEffect, useRef, useState } from "react";

const TicketsCard = ({ tickets, onReplyClick, onStatusChange }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownPos, setDropdownPos] = useState(null);

    const statusBtnRef = useRef(null);
    const dropdownRef = useRef(null);

    const statusOptions =
        tickets.status === "open" ? ["closed"] : ["open"];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                statusBtnRef.current &&
                !statusBtnRef.current.contains(event.target)
            ) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDropdown]);

    const handleStatusClick = () => {
        const rect = statusBtnRef.current.getBoundingClientRect();
        setDropdownPos({
            top: rect.bottom + window.scrollY,
            left: rect.right + window.scrollX - 112, 
        });
        setShowDropdown((prev) => !prev);
    };

    return (
        <>
            <div className="bg-white rounded-[15px] p-4 flex items-center justify-between hover:shadow-md overflow-x-auto">
                <div className="flex items-center gap-3">
                    <div className="w-60">
                        <p className="font-semibold text-xl">
                            {tickets.ticket_id}
                        </p>
                        <p className="text-[10px]">
                            {tickets.customer}
                        </p>
                        <p className="text-xs">
                            {new Date(tickets.created_at).toLocaleDateString("en-GB")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] w-[200px]">
                        <p className="text-xs text-[#6C6C6C] text-center">
                            Subject
                        </p>
                        <p className="text-[#333333] text-center text-sm">
                            {tickets.subject}
                        </p>
                    </div>

                    <div className="inline-flex w-40 flex-col px-4 py-2 rounded-full bg-[#EFEFEF] break-all w-[300px]">
                        <p className="text-[#333333] text-[10px] break-all line-clamp-2">
                            {tickets.message}
                        </p>
                    </div>

                    <button
                        ref={statusBtnRef}
                        onClick={handleStatusClick}
                        className={`w-28 px-4 py-2 rounded-full border flex items-center justify-between
                            ${tickets.status === "open"
                                ? "bg-[#FFF1F1] border-[#FF4747] text-[#FF4747]"
                                : "bg-[#E4FFF6] border-[#10B981] text-[#10B981]"
                            }`}
                    >
                        <span className="font-semibold  text-sm capitalize">
                            {tickets.status}
                        </span>

                        <svg
                            className="w-4 h-4 text-[#333333] ml-2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => onReplyClick(tickets)}
                        className="px-4 py-2 rounded-full border border-[#1F41BB] text-xs text-[#1F41BB] text-nowrap"
                    >
                        {tickets.reply_message === null ? "Reply" : "View Reply"}
                    </button>
                </div>
            </div>

            {showDropdown && dropdownPos && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: "absolute",
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        zIndex: 9999,
                    }}
                    className="bg-white shadow-lg border rounded-lg mt-2 w-28"
                >
                    {statusOptions.map((status) => (
                        <button
                            key={status}
                            onClick={() => {
                                onStatusChange(tickets.id, status);
                                setShowDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[#EFEFEF] capitalize text-sm"
                        >
                            {status}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
};

export default TicketsCard;
