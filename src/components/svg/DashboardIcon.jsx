import React from "react";

const DashboardIcon = ({ width = 28, height = 28, fill = "#333333" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 28 28"
      fill="none"
    >
      <path
        d="M15.1667 10.5V3.5H24.5V10.5H15.1667ZM3.5 15.1667V3.5H12.8333V15.1667H3.5ZM15.1667 24.5V12.8333H24.5V24.5H15.1667ZM3.5 24.5V17.5H12.8333V24.5H3.5Z"
        fill={fill}
      />
    </svg>
  );
};

export default DashboardIcon;
