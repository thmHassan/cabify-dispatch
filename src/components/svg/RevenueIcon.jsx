import React from "react";

const RevenueIcon = ({ width = 28, height = 28, fill = "#333333" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 28 28"
      fill="none"
    >
      <path
        d="M0 0H28V28H0V0ZM2.8 11.2V25.2H25.2V11.2H2.8ZM25.2 8.4V2.8H2.8V8.4H25.2ZM4.2 4.2H7.0056V7.0056H4.2V4.2ZM5.6 14H22.4V16.8H5.6V14ZM5.6 19.6H14V22.4H5.6V19.6Z"
        fill={fill}
      />
    </svg>
  );
};

export default RevenueIcon;
