import React from "react";
import UserDropdown from "../../../../../../components/shared/UserDropdown";
import Button from "../../../../../../components/ui/Button/Button";
import ThreeDotsIcon from "../../../../../../components/svg/ThreeDotsIcon";

const PlotsCard = ({ plot, onEdit, onDelete, onSelect }) => {
    const actionOptions = [
        {
            label: "Edit",
            onClick: () => onEdit(plot),
        },
        {
            label: "Delete",
            onClick: () => onDelete(plot),
        },
    ];
    return (
        <div
            className="flex items-center justify-between bg-white rounded-xl p-4 border hover:shadow transition cursor-pointer"
        >
            <div className="text-lg font-semibold text-[#252525]">
                {plot.name}
            </div>
            <div className="flex gap-2">
                <div>
                    <Button
                        btnType="submit"
                        type="filled"
                        className="py-2 px-2 rounded-md w-full sm:w-auto"
                        onClick={() => onSelect?.(plot)}
                    >
                        Show In Map
                    </Button>
                </div>
                {/* <UserDropdown options={actionOptions} itemData={plot}>
                    <Button className="w-10 h-10 bg-[#EFEFEF] rounded-full flex justify-center items-center">
                        <ThreeDotsIcon />
                    </Button>
                </UserDropdown> */}
            </div>
        </div>
    );
};

export default PlotsCard;
