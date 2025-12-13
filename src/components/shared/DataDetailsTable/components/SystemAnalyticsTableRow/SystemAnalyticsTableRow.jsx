import React from "react";
import CommonTableRowFields from "../CommonTableRowFields/CommonTableRowFields";
import WalletIcon from "../../../../svg/WalletIcon";
import Tag from "../../../../ui/Tag";
import ChildText from "../../../../ui/ChildText.jsx/ChildText";

const SystemAnalyticsTableRow = (props) => {
  const { data, actionOptions } = props;
  const { name, status, metrics, uptime } = data;
  return (
    <CommonTableRowFields
      data={{
        name,
        status,
        actionOptions,
        icon: {
          component: WalletIcon,
          width: 31.82,
          height: 31.82,
          fill: "#1F41BB",
        },
      }}
    >
      <td className="min-w-[631px] w-full">
        <div className="min-h-[120px] py-[30px]">
          <div className="flex gap-[30px] items-center min-h-max">
            {metrics.map(({ label, value }, index) => (
              <Tag
                key={index}
                variant="mediumGray"
                size="lg"
                className="min-w-[165px]"
              >
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-xs font-semibold">{label}</span>
                  <ChildText
                    text={value}
                    className={
                      label === "Dispatchers"
                        ? "!text-[#F59E0B]"
                        : "!text-[#333333]"
                    }
                  />
                </div>
              </Tag>
            ))}
            <Tag variant="blue" size="lg" className="min-w-[165px]">
              <div className="flex flex-col gap-1 items-center">
                <span className="text-xs font-semibold opacity-75">Uptime</span>
                <ChildText text={uptime} className="!text-[#FFFFFF]" />
              </div>
            </Tag>
          </div>
        </div>
      </td>
    </CommonTableRowFields>
  );
};

export default SystemAnalyticsTableRow;
