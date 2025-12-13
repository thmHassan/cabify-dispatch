import classNames from "classnames";
import React from "react";

const COLOR_CONFIG = {
  0: "text-[#25252599]",
  1: "text-[#6C6C6C]",
  2: "text-[#252525]",
};

const PageSubTitle = ({ title, className, textColor = 0 }) => {
  return (
    <p
      className={classNames(
        "2xl:text-[18px] sm:text-base text-sm 2xl:leading-[25px] sm:leading-5 leading-4 font-semibold",
        COLOR_CONFIG[textColor],
        className
      )}
    >
      {title}
    </p>
  );
};

export default PageSubTitle;
