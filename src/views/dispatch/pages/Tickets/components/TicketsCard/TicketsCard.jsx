import React, { useState } from "react";

const TicketsCard = ({ tickets, onReplyClick, onStatusChange }) => {
    const [showDropdown, setShowDropdown] = useState(false);

    const statusOptions =
        tickets.status === "open"
            ? ["closed"]
            : ["open"];

    return (
        <div className="bg-white rounded-[15px] p-4 flex items-center justify-between hover:shadow-md overflow-x-auto">
            <div className="flex items-center gap-3">
                <div className="w-60">
                    <p className="font-semibold text-xl">{tickets.ticket_id}</p>
                    <p className="text-[10px]">{tickets.customer}</p>
                    <p className="text-xs">
                        {new Date(tickets.created_at).toLocaleDateString("en-GB")}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100">
                    <p className="text-xs text-gray-500 text-center">Subject</p>
                    <p className="text-black text-sm">{tickets.subject}</p>
                </div>

                <div className="inline-flex w-40 flex-col px-4 py-2 rounded-full bg-gray-100 break-all">
                    <p className="text-black text-[10px] break-all">
                        {tickets.message}
                    </p>
                </div>

                {/* STATUS BUTTON */}
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className={`h-12 w-28 py-2 text-center rounded-full border 
                            ${
                                tickets.status === "open"
                                ? "bg-[#b1f7d8] border-green-500 text-green-700"
                                : "bg-[#faadad] border-red-500 text-red-700"
                            }`}
                    >
                        <p className="text-black font-semibold text-sm capitalize">
                            {tickets.status}
                        </p>
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 mt-2 bg-white shadow-md border rounded-lg z-20 w-28">
                            {statusOptions.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => {
                                        onStatusChange(tickets.id, status);
                                        setShowDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 capitalize text-sm"
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => onReplyClick(tickets)}
                    className="px-4 py-2 rounded-full border border-[#1F41BB] text-xs text-[#1F41BB]"
                >
                    {tickets.reply_message === null ? "Reply" : "View Reply"}
                </button>
            </div>
        </div>
    );
};

export default TicketsCard;
