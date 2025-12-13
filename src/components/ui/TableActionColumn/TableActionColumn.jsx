import React from "react";
import EditPaperPencilIcon from "../../svg/EditPaperPencilIcon";
import BinIcon from "../../svg/BinIcon";

const TableActionColumn = ({ row, onEdit, onDelete }) => {
  return (
    <div className="flex items-center gap-3 justify-center">
      <button
        onClick={() => onEdit(row)}
        className="text-red-500 hover:text-red-700"
      >
        <EditPaperPencilIcon width={18} height={18} fill="#FF4747" />
      </button>
      <button
        onClick={() => onDelete(row)}
        className="text-black hover:text-gray-600"
      >
        <BinIcon />
      </button>
    </div>
  );
};

export default TableActionColumn;
