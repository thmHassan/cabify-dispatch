import React, { useEffect, useRef, useState } from "react";
import UserDropdown from "../../../../../../components/shared/UserDropdown";
import Button from "../../../../../../components/ui/Button/Button";
import ThreeDotsIcon from "../../../../../../components/svg/ThreeDotsIcon";

const UserDetails = ({ user, onEdit, onDelete, onStatusChange }) => {
    const actionOptions = [
        {
            label: "Edit",
            onClick: () => onEdit(user),
        },
        {
            label: "Delete",
            onClick: () => onDelete(user),
        },
    ];
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownPos, setDropdownPos] = useState(null);

    const statusBtnRef = useRef(null);
    const dropdownRef = useRef(null);
    const statusOptions = user.status === "active"
        ? ["deactive"]
        : ["active"];

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
        <div
            className="bg-white rounded-[15px] p-4 gap-2 flex items-center justify-between hover:shadow-md overflow-x-auto"
        >
            <div className="flex items-center gap-3">
                <div className="w-60">
                    <p className="font-semibold text-xl">{user.name}</p>
                    <p className="text-[10px]">{user.email}</p>
                    <p className="text-xs">{user.phone_no}</p>
                </div>
            </div>
            <div className="flex items-center justify-center gap-3">

                {/* <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">ID</p>
                    <p className="text-black text-center font-semibold text-sm">{user.id}</p>
                </div> */}
                <div className="inline-flex w-52 flex-col px-4 py-2 rounded-full bg-gray-100 text-left break-all">
                    <p className="text-xs text-center text-gray-500">Address</p>
                    <p className="text-black text-center font-semibold text-[12px]">{user.address}</p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Device</p>
                    <p className="text-black text-center font-semibold text-sm">{user.device || "Android"}</p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Rating</p>
                    <p className="text-black text-center font-semibold text-sm">{user.ratings || 12}</p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Created At</p>
                    <p className="text-black text-center font-semibold text-sm">
                        {user?.createdAt ? formatDate(user.createdAt) : "12/12/2025"}
                    </p>
                </div>
                <button
                    ref={statusBtnRef}
                    onClick={handleStatusClick}
                    className={`h-12 w-28 px-4 py-2 rounded-full border flex items-center justify-between
                        ${user.status === "active"
                            ? "bg-[#b1f7d8] border-green-500 text-green-700"
                            : "bg-[#faadad] border-red-500 text-red-700"
                        }`}
                >
                    <span className="font-semibold text-sm capitalize">
                        {user.status}
                    </span>

                    <svg
                        className="w-4 h-4 text-black ml-2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

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
                                    onStatusChange(user.id, status); // 🔥 API call
                                    setShowDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 capitalize text-sm"
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                )}

                <UserDropdown options={actionOptions} itemData={user}>
                    <Button className="w-10 h-10 bg-[#EFEFEF] rounded-full flex justify-center items-center">
                        <ThreeDotsIcon />
                    </Button>
                </UserDropdown>

            </div>
        </div>
    );
}

export default UserDetails;