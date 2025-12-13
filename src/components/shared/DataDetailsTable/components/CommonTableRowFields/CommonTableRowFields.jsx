import React from "react";
import CardSubtitle from "../../../../ui/CardSubtitle";
import Tag from "../../../../ui/Tag";
import Button from "../../../../ui/Button/Button";
import ThreeDotsIcon from "../../../../svg/ThreeDotsIcon";
import classNames from "classnames";
import UserDropdown from "../../../UserDropdown";
import EditPaperPencilIcon from "../../../../svg/EditPaperPencilIcon";
import BinIcon from "../../../../svg/BinIcon";

const CommonTableRowFields = ({
  children,
  data,
  trClassNames,
  itemData = null,
}) => {
  const { icon, name, status, actionOptions } = data;

  console.log(actionOptions, "actionOptions=========");
  const Icon = icon ? icon.component : false;
  return (
    <div
      className={classNames(
        "bg-white border border-y border-[#E9E9E9] rounded-[15px] mb-2.5 last:mb-0",
        trClassNames
      )}
    >
      <tr>
        {(icon || name) && (
          <td className="min-w-[368px] w-[368px] pr-20">
            <div className="p-[30px] flex gap-[15px] items-center">
              {icon && (
                <div className="h-[60px] min-w-[60px] bg-[#F9F9F9] rounded-lg flex justify-center items-center">
                  <Icon {...icon} />
                </div>
              )}
              <div className="flex flex-col gap-2.5">
                <div className="max-w-[350px] cursor-pointer" title={name}>
                  <CardSubtitle type={1} subtitle={name} className="truncate" />
                </div>
                {status && (
                  <div className="flex gap-[15px]">
                    {status?.map((s, i) => (
                      <Tag
                        key={i}
                        size="sm"
                        variant={
                          s === "Active" || s === "active" ? "green" : "purple"
                        }
                        className="capitalize"
                      >
                        <span>{s}</span>
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        )}
        {children}
        {actionOptions && actionOptions?.length !== 0 && (
          <td className="py-[30px] pr-[30px]">
            <UserDropdown options={actionOptions} itemData={itemData}>
              <Button
                className="w-10 h-10 bg-[#EFEFEF] rounded-full flex justify-center items-center"
                // onClick={onActionClick}
              >
                <ThreeDotsIcon />
              </Button>
            </UserDropdown>
          </td>
        )}
      </tr>
    </div>
  );
};

export default CommonTableRowFields;
