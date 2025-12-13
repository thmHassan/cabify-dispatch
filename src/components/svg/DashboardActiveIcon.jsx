import React from "react";

const DashboardActiveIcon = ({ width = 24, height = 24, fill = "#333333" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M2.424 24C1.757 24 1.1865 23.7625 0.7125 23.2875C0.2385 22.8125 0.001 22.243 0 21.579V12.375H9.75V24H2.424ZM11.25 24V12.375H24V21.5775C24 22.2435 23.7625 22.8135 23.2875 23.2875C22.8125 23.7615 22.2425 23.999 21.5775 24H11.25ZM0 10.875V2.424C0 1.757 0.2375 1.1865 0.7125 0.7125C1.1875 0.2385 1.7575 0.001 2.4225 0H21.5775C22.2435 0 22.8135 0.2375 23.2875 0.7125C23.7615 1.1875 23.999 1.7575 24 2.4225V10.875H0Z"
        fill={fill}
      />
    </svg>
  );
};

export default DashboardActiveIcon;
