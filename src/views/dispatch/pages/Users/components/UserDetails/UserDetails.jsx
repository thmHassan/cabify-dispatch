import React from "react";
import UserDropdown from "../../../../../../components/shared/UserDropdown";
import Button from "../../../../../../components/ui/Button/Button";
import ThreeDotsIcon from "../../../../../../components/svg/ThreeDotsIcon";

const UserDetails = ({ user, onEdit, onDelete }) => {
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

    const formatDate = (dateString) => {
        if (!dateString) return "-";

        const date = new Date(dateString);

        return date.toLocaleString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).replace(",", "");
    };

    const getFirstLetter = (name) => {
        if (!name) return "?";
        return name.charAt(0).toUpperCase();
    };
    return (
        <div
            className="flex justify-between bg-white rounded-[15px] p-4 gap-2 flex items-center hover:shadow-md overflow-x-auto"
        >
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EFEFEF] flex items-center justify-center text-[#333333] font-semibold text-xl">
                    {getFirstLetter(user.name)}
                </div>
                <div className="w-60">
                    <p className="font-semibold text-xl">{user.name}</p>
                    <p className="text-[10px]">{user.email}</p>
                    <p className="text-xs">{user?.country_code || "+91"} {user.phone_no}</p>
                </div>
            </div>
            <div className="flex items-center  gap-3">
                <div className="inline-flex w-52 flex-col px-4 py-2 rounded-full bg-[#EFEFEF] text-left break-all w-[250px]">
                    <p className="text-xs text-center texdt-[#6C6C6C]">Address</p>
                    <p className="text-[#333333] font-semibold text-center text-[12px]">{user.address ? `${user.address}, ${user.city || ''}` : "-"}</p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] text-left whitespace-nowrap w-[107px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Device</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">{user.device_count || "0"}</p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] text-left whitespace-nowrap w-[107px]">
                    <p className="text-xs text-center text-[#6C6C6C]">Rating</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">{user.rating || "0.0"}</p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-[#EFEFEF] text-left whitespace-nowrap">
                    <p className="text-xs text-center text-[#6C6C6C]">Created At</p>
                    <p className="text-[#333333] text-center font-semibold text-sm">
                        {formatDate(user.created_at)}
                    </p>
                </div>

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