import classNames from "classnames";
import React from "react";

const VARIANT_BG_CONFIG = {
  blue: "bg-[#1F41BB] text-[#ffffff]",
  gray: "bg-[#EEEEEE] text-[#6C6C6C]",
  mediumGray: "bg-[#EFEFEF] text-[#6C6C6C]",
  green: "bg-[#10B981] text-[#ffffff]",
  purple: "bg-[#8B5CF6] text-[#ffffff]",
  lightBlue: "bg-[#E9F2FF] text-[#3C71B7]",
  orange: "bg-[#F59E0B] text-[#ffffff]",
  yellow: "bg-[#F5C60B] text-[#FFFFFF]",
  white: "bg-[#FFFFFF] text-[#6C6C6C]",
  red: "bg-[#EF4444] text-[#ffffff]",
  lightPurple: "bg-[#7190FF] text-[#ffffff]",
};

const SIZE_CONFIG = {
  sm: "px-5 pt-1.5 pb-[5px] text-sm leading-[19px] rounded-[25px] text-center",
  md: "px-[30px] py-1.5 text-base leading-[22px] rounded-[35px] text-center",
  lg: "px-[35px] pt-[11px] pb-2.5 text-[18px] leading-[25px] rounded-[35px] text-center",
};

const VARIANT_BORDER_CONFIG = {
  blue: "border border-[#1F41BB] text-[#1F41BB]",
  gray: "border border-[#EEEEEE] text-[#EEEEEE]",
  mediumGray: "border border-[#EFEFEF] text-[#EFEFEF]",
  green: "border border-[#10B981] text-[#10B981]",
  purple: "border border-[#8B5CF6] text-[#8B5CF6]",
  lightBlue: "border border-[#E9F2FF] text-[#E9F2FF]",
  orange: "border border-[#F59E0B] text-[#F59E0B]",
  yellow: "border border-[#F5C60B] text-[#F5C60B]",
  white: "border border-[#FFFFFF] text-[#FFFFFF]",
  red: "border border-[#EF4444] text-[#EF4444]",
  lightPurple: "border border-[#7190FF] text-[#7190FF]",
};

const VARIANT_CONFIG = {
  bg: VARIANT_BG_CONFIG,
  border: VARIANT_BORDER_CONFIG,
};

const Tag = ({
  children,
  variant = "gray",
  layout = "bg",
  size = "sm",
  // className,
  ...rest
}) => {
  return (
    <div
      className={classNames(
        "font-semibold text-center",
        VARIANT_CONFIG[layout][variant],
        SIZE_CONFIG[size],
        // className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Tag;
