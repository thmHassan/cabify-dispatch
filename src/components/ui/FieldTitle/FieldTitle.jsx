import classNames from "classnames";
import React from "react";

const FieldTitle = ({ label, className }) => {
  return (
    <label
      htmlFor="Email"
      className={classNames(
        "block text-[18px] font-semibold leading-[25px] mb-[5px] text-[#363636]",
        className
      )}
    >
      {label}
    </label>
  );
};

export default FieldTitle;
