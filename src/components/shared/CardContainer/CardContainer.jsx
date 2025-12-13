import classNames from "classnames";
import React from "react";

const CONTAINER_CONFIG = {
  0: "bg-[#F9F9F9]",
  1: "bg-[#ffffff]",
};

const BORDER_CONFIG = {
  0: "border-2 border-[#E9E9E9]",
  1: "border border-[#D7D7D7]",
};

const CardContainer = ({ children, border = 0, type = 0, className }) => {
  return (
    <div
      className={classNames(
        "rounded-[20px] xs:rounded-xl sm:rounded-[20px]",
        BORDER_CONFIG[border],
        CONTAINER_CONFIG[type],
        className
      )}
    >
      {children}
    </div>
  );
};

export default CardContainer;
