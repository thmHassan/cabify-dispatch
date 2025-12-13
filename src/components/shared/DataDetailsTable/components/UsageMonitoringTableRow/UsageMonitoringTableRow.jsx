import React from "react";
import WalletIcon from "../../../../svg/WalletIcon";
import CommonTableRowFields from "../CommonTableRowFields/CommonTableRowFields";
import Tag from "../../../../ui/Tag";
import ChildText from "../../../../ui/ChildText.jsx/ChildText";
import classNames from "classnames";

const UsageMonitoringTableRow = (props) => {
  const { data, actionOptions } = props;
  const {
    company_name,
    api_calls_today,
    map_request,
    voip_minutes,
    dispatchers,
  } = data;
  const metrics = [
    { label: "API Calls Today", value: api_calls_today },
    { label: "Map Requests", value: map_request },
    { label: "VoIP Minutes", value: voip_minutes },
    { label: "Dispatchers", value: dispatchers },
  ];
  return (
    <CommonTableRowFields
      data={{
        name: company_name,
        status: ["Active"],
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
          <div className="flex gap-[30px] items-center min-h-max pr-8">
            {metrics.map(({ label, value }, index) => (
              <Tag key={index} variant="mediumGray" size="lg">
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-xs font-semibold whitespace-nowrap">
                    {label}
                  </span>
                  <ChildText
                    text={value}
                    className={classNames(
                      "whitespace-nowrap",
                      label === "Dispatchers"
                        ? "!text-[#F59E0B]"
                        : "!text-[#333333]"
                    )}
                  />
                </div>
              </Tag>
            ))}
            <Tag variant="blue" size="lg">
              <div className="flex flex-col gap-1 items-center">
                <span className="text-xs font-semibold opacity-75 whitespace-nowrap">
                  Last Seen
                </span>
                <ChildText
                  text="2 minute ago"
                  className="!text-[#FFFFFF] whitespace-nowrap"
                />
              </div>
            </Tag>
          </div>
        </div>
      </td>
    </CommonTableRowFields>
  );
};

export default UsageMonitoringTableRow;
