import React from 'react'

const PreBookingIcon = ({  width = 18, height = 18, fill = "#ffffff" }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            viewBox="0 0 30 30"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-clock4-icon lucide-clock-4">
            <path d="M12 6v6l4 2" />
            <circle cx="12" cy="12" r="10" />
        </svg>
    );
}

export default PreBookingIcon