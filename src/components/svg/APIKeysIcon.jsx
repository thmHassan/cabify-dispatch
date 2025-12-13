import React from "react";

const APIKeysIcon = ({ width = 26, height = 26, fill = "#333333" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 26 26"
      fill="none"
    >
      <path
        d="M4.33333 21.6667C7 24.3333 10.6667 22.6667 11.6667 21.6667L13.6667 19.6667L6.33333 12.3333L4.33333 14.3333C3.33333 15.3333 1.66667 19 4.33333 21.6667ZM4.33333 21.6667L1 25M21.6667 4.33333C19 1.66667 15.3333 3.33333 14.3333 4.33333L12.3333 6.33333L19.6667 13.6667L21.6667 11.6667C22.6667 10.6667 24.3333 7 21.6667 4.33333ZM21.6667 4.33333L25 1M13.6667 7.66667L11 10.3333M18.3333 12.3333L15.6667 15"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default APIKeysIcon;
