import React from 'react'

const AdvanceSearchIcon = ({ width = 18, height = 18, fill = "#ffffff" }) => {
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
            class="lucide lucide-search-icon lucide-search">
            <path
                d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
        </svg>
    );
}

export default AdvanceSearchIcon