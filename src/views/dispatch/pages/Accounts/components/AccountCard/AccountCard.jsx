import React from "react";
import UserDropdown from "../../../../../../components/shared/UserDropdown";
import Button from "../../../../../../components/ui/Button/Button";
import ThreeDotsIcon from "../../../../../../components/svg/ThreeDotsIcon";

const AccountCard = ({ account, onEdit, onView, onDelete }) => {
    const actionOptions = [
        // {
        //     label: "View",
        //     onClick: () => onView(account),
        // },
        {
            label: "Edit",
            onClick: () => onEdit(account),
        },
        {
            label: "Delete",
            onClick: () => onDelete(account),
        },
    ];
    return (

        <div
            className="bg-white rounded-[15px] p-4 gap-2 flex items-center justify-between hover:shadow-md overflow-x-auto"
        >
            <div className="flex items-center gap-3">
                <p className="font-semibold text-xl">{account.name}</p>
            </div>

            <UserDropdown options={actionOptions} itemData={account}>
                <Button className="w-10 h-10 bg-[#EFEFEF] rounded-full flex justify-center items-center">
                    <ThreeDotsIcon />
                </Button>
            </UserDropdown>
        </div>




    );
};

export default AccountCard;
