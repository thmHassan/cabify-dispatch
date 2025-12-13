import React from "react";

const CloseIcon = ({ width = 12, height = 12, fill = "#252525" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M1 11L11 1M11 11L1 1"
        stroke={fill}
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CloseIcon;
