import React from "react";
import BinIcon from "../../svg/BinIcon";
import EditPaperPencilIcon from "../../svg/EditPaperPencilIcon";
import Button from "../../ui/Button/Button";

const Table = ({ columns, data, onEdit, onDelete, onView }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse rounded-lg shadow-md">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                className={`px-4 py-8 text-left text-[25px] leading-[34px] font-semibold text-[#000000]`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIndex) => (
            <tr
              key={rIndex}
              className="border-t hover:bg-white transition-colors"
            >
              {columns.map((col, cIndex) => (
                <td
                  key={cIndex}
                  className={`px-4 py-2 text-sm ${col.className || ""}`}
                >
                  {col.accessor === "file" ? (
                    <div className="flex items-center">
                      <Button type="filled" btnSize="md" onClick={onView}>
                        <span>View</span>
                      </Button>
                    </div>
                  ) : col.accessor === "actions" ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEdit(row)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <EditPaperPencilIcon
                          width={18}
                          height={18}
                          fill="#FF4747"
                        />
                      </button>
                      <button
                        onClick={() => onDelete(row)}
                        className="text-black hover:text-gray-600"
                      >
                        <BinIcon />
                      </button>
                    </div>
                  ) : (
                    row[col.accessor] || "-"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
