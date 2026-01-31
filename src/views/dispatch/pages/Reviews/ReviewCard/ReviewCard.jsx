import React from "react";

const ReviewCard = ({ review }) => {
    return (
        <div
            className="bg-white rounded-[15px] p-4 gap-2 flex items-center justify-between hover:shadow-md overflow-x-auto"
        >
            <div className="flex items-center gap-3">
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Ride ID</p>
                    <p className="text-black text-center font-semibold text-sm">{review.rideId}</p>
                </div>
            </div>
            <div className="flex items-center justify-center gap-3">
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">User Name</p>
                    <p className="text-black text-center font-semibold text-sm">{review.userName}</p>
                </div>

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Driver Name</p>
                    <p className="text-black text-center font-semibold text-sm">{review.driverName}</p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Driver Rating</p>
                    <p className="text-black text-center font-semibold text-sm">{review.rating}</p>
                </div>
                <div className="inline-flex w-80 flex-col px-4 py-2 rounded-full bg-gray-100 text-left break-all">
                    <p className="text-xs text-gray-500">User Comment</p>
                    <p className="text-black font-semibold text-[12px]">{review.comment}</p>
                </div>
            </div>
        </div>
    );
}

export default ReviewCard;