import React from "react";

const SupportTicketsIcon = ({ width = 25, height = 25, fill = "#000000" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 25 25"
      fill="none"
    >
      <path
        d="M12.0543 13.3443C14.5208 13.3443 16.5204 11.3448 16.5204 8.87823C16.5204 6.41166 14.5208 4.41211 12.0543 4.41211C9.58768 4.41211 7.58813 6.41166 7.58813 8.87823C7.58813 11.3448 9.58768 13.3443 12.0543 13.3443Z"
        stroke={fill}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M19.6967 20.9862C19.6967 18.9593 18.8915 17.0154 17.4583 15.5822C16.0251 14.1489 14.0812 13.3438 12.0543 13.3438C10.0274 13.3438 8.08351 14.1489 6.65028 15.5822C5.21705 17.0154 4.41187 18.9593 4.41187 20.9862"
        stroke={fill}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

export default SupportTicketsIcon;
