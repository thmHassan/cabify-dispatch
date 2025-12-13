import React from "react";
import CommonTableRowFields from "../CommonTableRowFields/CommonTableRowFields";
import Tag from "../../../../ui/Tag";
import RightIcon from "../../../../svg/RightIcon";
import _ from "lodash";
import { toBoolean } from "../../../../../utils/functions/common.function";

const DriverDocumentsRowFields = ({ tik = true, actionOptions, data }) => {
  const { document_name, ...restProps } = data;
  const props = _.omit(restProps, ["created_at", "updated_at", "id"]);

  return (
    <CommonTableRowFields
      itemData={data}
      data={{
        name: document_name,
        icon: false,
        actionOptions,
      }}
    >
      <td className="min-w-[631px] w-full">
        <div className="min-h-[120px] py-[30px]">
          <div className="flex gap-[30px] items-center min-h-max">
            {Object.keys(props)?.map((key, index) => {
              if (toBoolean(props[key]))
                return (
                  <Tag
                    key={index}
                    size="md"
                    variant="mediumGray"
                    className="flex gap-2.5 !px-5 !py-2.5"
                  >
                    {tik && (
                      <div>
                        <div className="h-6 w-6 bg-[#10B981] flex items-center justify-center rounded-[4px]">
                          <RightIcon />
                        </div>
                      </div>
                    )}
                    <span>{key}</span>
                  </Tag>
                );
            })}
          </div>
        </div>
      </td>
      {/* 
      <td className="py-[30px] flex flex-col justify-center min-w-[199px]">
        <CardSubtitle type={1} subtitle={revenue} />
        <ChildText text="monthly revenue" />
      </td> */}
    </CommonTableRowFields>
  );
};

export default DriverDocumentsRowFields;
