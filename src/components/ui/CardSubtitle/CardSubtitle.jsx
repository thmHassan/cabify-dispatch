import classNames from "classnames";
import React from "react";

const COLOR_CONFIG = {
  0: "text-[#6C6C6C]",
  1: "text-[#333333]",
  2: "text-[#252525]",
};

const VARIANT_CONFIG = {
  0: "2xl:text-2xl sm:text-lg xs:text-base text-sm 2xl:leading-[33px] sm:leading-7 leading-6",
  1: "2xl:text-xl sm:text-base xs:text-sm text-xs 2xl:leading-[27px] sm:leading-5 leading-4",
};

const CardSubtitle = ({ type = 0, variant = 0, subtitle, className }) => {
  return (
    <p
      className={classNames(
        "font-semibold",
        VARIANT_CONFIG[variant],
        COLOR_CONFIG[type],
        className
      )}
    >
      {subtitle}
    </p>
  );
};

export default CardSubtitle;
