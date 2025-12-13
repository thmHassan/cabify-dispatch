import classNames from "classnames";
import React from "react";

const COLOR_CONFIG = {
  0: "text-[#252525]",
  1: "text-[#1F41BB]",
};

const PageTitle = ({ title, textColor = 0, className }) => {
  return (
    <h2
      className={classNames(
        "font-semibold 2xl:text-[40px] sm:text-3xl text-2xl 2xl:leading-[55px] sm:leading-9 leading-7",
        COLOR_CONFIG[textColor],
        className
      )}
    >
      {title}
    </h2>
  );
};

export default PageTitle;
