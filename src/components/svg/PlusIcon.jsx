import React from "react";

const PlusIcon = ({ height = 24, width = 24, fill = "#ffffff" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M24 13.7143H13.7143V24H10.2857V13.7143H0V10.2857H10.2857V0H13.7143V10.2857H24V13.7143Z"
        fill={fill}
      />
    </svg>
  );
};

export default PlusIcon;
