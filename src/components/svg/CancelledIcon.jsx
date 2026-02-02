import React from 'react'

const CancelledIcon = ({  width = 18, height = 18, fill = "#ffffff" }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-ban-icon lucide-ban">
            <path
                d="M4.929 4.929 19.07 19.071" />
            <circle cx="12" cy="12" r="10" />
        </svg>
    );
}

export default CancelledIcon