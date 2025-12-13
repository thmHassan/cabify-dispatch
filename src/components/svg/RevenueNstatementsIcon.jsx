import React from "react";

const RevenueNstatementsIcon = ({
  width = 28,
  height = 28,
  fill = "#333333",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 28 28"
      fill="none"
    >
      <path
        d="M5.83333 24.5C5.19167 24.5 4.64236 24.2715 4.18542 23.8146C3.72847 23.3576 3.5 22.8083 3.5 22.1667V3.5H5.83333V22.1667H24.5V24.5H5.83333ZM7 21V10.5H11.6667V21H7ZM12.8333 21V4.66667H17.5V21H12.8333ZM18.6667 21V15.1667H23.3333V21H18.6667Z"
        fill={fill}
      />
    </svg>
  );
};

export default RevenueNstatementsIcon;
