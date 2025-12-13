import React from "react";
import GraphIcon from "../../svg/GraphIcon";
import ChildText from "../../ui/ChildText.jsx/ChildText";
import classNames from "classnames";

const SnapshotCard = ({ data, className, isChange = true }) => {
  const {
    title,
    value,
    change,
    backgroundColor,
    color,
    icon: { component: Icon, width, height, ...restIcon },
  } = data;
  return (
    <div
      className={classNames(
        "w-full 2xl:h-[200px] h-[150px] rounded-[15px] p-[15px] flex gap-[18px]",
        className
      )}
      style={{
        background: backgroundColor,
      }}
    >
      <div className="w-[60px]">
        <div className="w-full h-[60px] rounded-md bg-[#ffffff] flex justify-center items-center">
          <Icon
            fill={color}
            width={width ?? 28}
            height={height ?? 29}
            {...restIcon}
          />
        </div>
      </div>
      <div className="w-[calc(100%-78px)]">
        <div
          className={classNames("flex flex-col gap-[5px] mb-5 h-[60px]", {
            "justify-center": !isChange,
          })}
        >
          <h5 className="text-[#252525] text-xl leading-[27px] font-semibold">
            {title}
          </h5>
          {isChange && (
            <div
              className="flex gap-2.5 text-base leading-[22px] font-semibold items-center"
              style={{ color }}
            >
              <GraphIcon fill={color} />
              <ChildText size="md" text={change} style={{ color }} />
            </div>
          )}
        </div>
        <div className="font-semibold 2xl:text-[50px] text-4xl 2xl:leading-[68px] leading-8 text-[#252525]">
          <span>{value}</span>
        </div>
      </div>
    </div>
  );
};

export default SnapshotCard;
