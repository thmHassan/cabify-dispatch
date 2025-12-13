import React from "react";
import CardContainer from "../CardContainer";
import PageSubTitle from "../../ui/PageSubTitle";
import ChildText from "../../ui/ChildText.jsx/ChildText";
import Tag from "../../ui/Tag";
import classNames from "classnames";

const InfoTableCard = ({
  title,
  serviceName,
  status,
  details = [],
  features = [],
  className = "",
  innerCardContainerClassNames = "",
}) => {
  return (
    <CardContainer type={1} border={1} className={`lg:p-5 sm:px-4 px-3 sm:py-5 pt-4 pb-0.5 h-full ${className}`}>
      {title && (
        <div className="sm:mb-5 mb-3">
          <PageSubTitle title={title} className="!text-[#000000] text-center" />
        </div>
      )}

      {/* Inner card */}
      <CardContainer
        className={classNames(
          "lg:py-10 sm:px-5 px-4 py-5 mb-2.5",
          innerCardContainerClassNames
        )}
      >
        <div className="flex flex-col gap-5">
          {/* Header with service + status */}
          {serviceName && (
            <div className="flex justify-between items-center">
              <ChildText text={serviceName} className="!text-[#3D3D3D]" />
              {status && (
                <div
                  className="font-semibold text-[10.67px] leading-[15px] gap-[6.1px] flex items-center"
                  style={{ color: status?.color || "#10B981" }}
                >
                  {status?.icon}
                  <span>{status?.text}</span>
                </div>
              )}
            </div>
          )}

          {/* Details */}
          {details?.map((item, i) => (
            <div
              key={i}
              className={`flex justify-between items-center ${
                i !== details?.length - 1
                  ? "pb-2.5 border-b-[0.5px] border-[#7A7A7A50]"
                  : ""
              }`}
            >
              <ChildText text={item?.label} className="!text-[#3D3D3D]" />
              <ChildText text={item?.value} className="!text-[#3D3D3D]" />
            </div>
          ))}
        </div>
      </CardContainer>

      {/* Features (optional) */}
      {features?.length > 0 && (
        <div>
          <ChildText
            text="Active Features:"
            className="!text-[#3D3D3D] mb-2.5"
          />
          <div className="flex flex-wrap gap-x-[15px] gap-y-2.5">
            {features?.map((feature, i) => (
              <Tag
                key={i}
                variant="lightBlue"
                className="!rounded-lg !px-3.5 !py-2.5"
              >
                <span>{feature}</span>
              </Tag>
            ))}
          </div>
        </div>
      )}
    </CardContainer>
  );
};

export default InfoTableCard;
