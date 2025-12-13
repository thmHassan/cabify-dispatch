import React from "react";

const SelectionDownArrowIcon = ({
  width = 20,
  height = 11,
  fill = "#333333",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 20 11"
      fill="none"
    >
      <path
        d="M1 1L10 10L19 1"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default SelectionDownArrowIcon;
