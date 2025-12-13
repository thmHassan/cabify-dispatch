import React from "react";

const SelectedDoneIcon = ({ width = 40, height = 40, fill = "#1F41BB" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 40 40"
      fill="none"
    >
      <path
        d="M20 0C9 0 0 9 0 20C0 31 9 40 20 40C31 40 40 31 40 20C40 9 31 0 20 0ZM16 30L6 20L8.82 17.18L16 24.34L31.18 9.16L34 12L16 30Z"
        fill={fill}
      />
    </svg>
  );
};

export default SelectedDoneIcon;
