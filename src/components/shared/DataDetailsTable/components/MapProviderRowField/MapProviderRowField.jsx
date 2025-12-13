import React from "react";
import CommonTableRowFields from "../CommonTableRowFields/CommonTableRowFields";
import Tag from "../../../../ui/Tag";

const MapProviderRowField = (props) => {
  const { data, actionOptions } = props;
  const {
    name,
    monthlyMinutes,
    monthlyRequests,
    monthlyCost,
    status,
    publicKey,
    secretKey,
    transactions,
    revenue,
  } = data;
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
          {publicKey && (
            <Tag
              variant="mediumGray"
              size="md"
              className="!py-2.5 !leading-[19px] !px-5 text-center whitespace-nowrap"
            >
              <span>
                Stripe public key: <br /> {publicKey}
              </span>
            </Tag>
          )}
          {secretKey && (
            <Tag
              variant="mediumGray"
              size="md"
              className="!py-2.5 !leading-[19px] !px-5 text-center whitespace-nowrap"
            >
              <span>
                Stripe Secret key: <br /> {secretKey}
              </span>
            </Tag>
          )}
          {transactions && (
            <div className="flex items-center">
              <Tag
                variant="mediumGray"
                size="md"
                className="!py-2.5 !leading-[19px] !px-5 text-center whitespace-nowrap"
              >
                <span>Transactions: {transactions}</span>
              </Tag>
            </div>
          )}
          {revenue && (
            <div className="flex items-center">
              <Tag
                variant="mediumGray"
                size="md"
                className="!py-2.5 !leading-[19px] !px-5 text-center whitespace-nowrap"
              >
                <span>Revenue: {revenue}</span>
              </Tag>
            </div>
          )}
          {monthlyMinutes && (
            <Tag
              variant="mediumGray"
              size="md"
              className="!py-2.5 !leading-[19px] !px-5 whitespace-nowrap"
            >
              <span>Monthly minutes: {monthlyMinutes}</span>
            </Tag>
          )}
          {monthlyRequests && (
            <Tag
              variant="mediumGray"
              size="md"
              className="!py-2.5 !leading-[19px] !px-5 whitespace-nowrap"
            >
              <span>Monthly requests: {monthlyRequests}</span>
            </Tag>
          )}
          {monthlyCost && (
            <Tag
              variant="mediumGray"
              size="md"
              className="!py-2.5 !leading-[19px] !px-5 whitespace-nowrap"
            >
              <span>Monthly cost: {monthlyCost}</span>
            </Tag>
          )}
          {status && (
            <div className="flex items-center">
              <Tag
                variant={status === "Active" ? "green" : "red"}
                size="md"
                className="!py-2.5 !leading-[19px] !px-5 whitespace-nowrap"
              >
                <span>{status}</span>
              </Tag>
            </div>
          )}
        </div>
      </td>
    </CommonTableRowFields>
  );
};

export default MapProviderRowField;
