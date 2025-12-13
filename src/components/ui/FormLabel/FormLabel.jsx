import React from "react";
import classNames from "classnames";

const FormLabel = ({
  htmlFor,
  children,
  required = false,
  className,
  ...rest
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={classNames(
        "mb-[5px] block lg:text-[18px] sm:text-base text-sm leading-[25px] sm:leading-6 text-[#252525] font-semibold",
        className
      )}
      {...rest}
    >
      {children}
      {required && <span className="text-[#252525]"> *</span>}
    </label>
  );
};

export default FormLabel;
