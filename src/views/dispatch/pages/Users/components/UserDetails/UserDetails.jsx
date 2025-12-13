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

                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">ID</p>
                    <p className="text-black text-center font-semibold text-sm">{user.id}</p>
                </div>
                <div className="inline-flex w-52 flex-col px-4 py-2 rounded-full bg-gray-100 text-left break-all">
                    <p className="text-xs text-center text-gray-500">Address</p>
                    <p className="text-black font-semibold text-[12px]">{user.address}</p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Device</p>
                    <p className="text-black text-center font-semibold text-sm">{user.device}</p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Rating</p>
                    <p className="text-black text-center font-semibold text-sm">{user.ratings}</p>
                </div>
                <div className="inline-flex flex-col px-4 py-2 rounded-full bg-gray-100 text-left whitespace-nowrap">
                    <p className="text-xs text-center text-gray-500">Created At</p>
                    <p className="text-black text-center font-semibold text-sm">{user.createdAt}</p>
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