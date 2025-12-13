import React from "react";
import CommonTableRowFields from "../CommonTableRowFields/CommonTableRowFields";
import Tag from "../../../../ui/Tag";

const ApiKeyRowFields = ({ actionOptions, data }) => {
  const { name, key, created, lastUsed } = data;
  return (
    <CommonTableRowFields
      data={{
        name,
        icon: false,
        actionOptions,
      }}
    >
      <td className="w-full">
        <div className="flex justify-end px-[30px] gap-[30px]">
          <Tag
            variant="mediumGray"
            size="md"
            className="!py-2.5 !leading-[19px] !px-5 whitespace-nowrap"
          >
            <span>{key}</span>
          </Tag>
          <Tag
            variant="mediumGray"
            size="md"
            className="!py-2.5 !leading-[19px] !px-5 whitespace-nowrap"
          >
            <span>Created: {created}</span>
          </Tag>
          <Tag
            variant="mediumGray"
            size="md"
            className="!py-2.5 !leading-[19px] !px-5 whitespace-nowrap"
          >
            <span>Last used: {lastUsed}</span>
          </Tag>
        </div>
      </td>
    </CommonTableRowFields>
  );
};

export default ApiKeyRowFields;
