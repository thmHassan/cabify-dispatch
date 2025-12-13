import React from "react";
import CommonTableRowFields from "../CommonTableRowFields/CommonTableRowFields";
import Tag from "../../../../ui/Tag";

const SubAdminManagementRowFields = ({ actionOptions, data, onViewClick }) => {
  const { name, permissions } = data;
  console.log(JSON.parse(permissions), "permissions=====");
  return (
    <CommonTableRowFields
      itemData={data}
      data={{
        name,
        icon: false,
        actionOptions,
      }}
    >
      <td className="w-full">
        <div className="flex gap-[30px] justify-end px-7">
          <Tag
            variant="blue"
            layout="border"
            onClick={() => onViewClick(data)}
            className="cursor-pointer whitespace-nowrap"
          >
            <span>View Permissions</span>
          </Tag>
          {/* <Tag variant="green" layout="border">
            <span>Change Password</span>
          </Tag> */}
        </div>
      </td>
    </CommonTableRowFields>
  );
};

export default SubAdminManagementRowFields;
