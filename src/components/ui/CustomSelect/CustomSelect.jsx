import React from "react";
import Select from "react-select";
import DropdownIndicator from "../DropdownIndicator";

const VARIANT_CONFIG = {
  0: {
    backgroundColor: "#ffffff",
    border: "1px solid #ededed",
  },
  1: {
    backgroundColor: "#f9f9f9",
    border: "none",
  },
  2: {
    backgroundColor: "#ffffff",
    border: "none",
  },
};

const CustomSelect = ({
  variant = 0,
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  isSearchable = false,
  className = "",
  mobileBgColor,
  mobileBorder,
  forceMobile = false,
  styles: externalStyles = {},
  menuPortalTarget,

  ...props
}) => {

  const isSmallScreen =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(max-width: 767px)").matches
      : false;

  const resolveMobileBorder = () => {
    if (!mobileBorder) return VARIANT_CONFIG[variant]?.border;
    const value = String(mobileBorder);
    if (value.includes(" ")) return value;
    return `1px solid ${value}`;
  };

  const useMobileStyles =
    (forceMobile || isSmallScreen) && (mobileBgColor || mobileBorder);

  const defaultStyles = {
    control: (provided) => ({
      ...provided,
      minHeight: "54px",
      height: "54px",
      borderRadius: "10px",
      boxShadow: "none",
      cursor: "pointer",
      "&:hover": useMobileStyles
        ? { border: resolveMobileBorder() }
        : { border: "none" },
      ...(useMobileStyles
        ? {
          backgroundColor:
            mobileBgColor ||
            VARIANT_CONFIG[variant]?.backgroundColor,
          border: resolveMobileBorder(),
        }
        : VARIANT_CONFIG[variant]),
    }),

    valueContainer: (provided) => ({
      ...provided,
      height: "54px",
      padding: "0 16px",
    }),

    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0,
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    dropdownIndicator: (provided) => ({
      ...provided,
      color: "#000",
      padding: "0 16px",
    }),

    placeholder: (provided) => ({
      ...provided,
      color: "#6C6C6C",
      fontWeight: 500,
      fontSize: "14px",
    }),

    singleValue: (provided) => ({
      ...provided,
      color: "#6C6C6C",
      fontWeight: 500,
      fontSize: "14px",
    }),

    menu: (provided) => ({
      ...provided,
      borderRadius: "10px",
      boxShadow:
        "0 4px 6px rgba(0,0,0,0.1)",
      border: "none",
      zIndex: 9999,
    }),

    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),

    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#1F41BB"
        : state.isFocused
          ? "#f3f4f6"
          : "white",
      color: state.isSelected ? "white" : "#374151",
      padding: "12px 16px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 500,
    }),
  };

  const mergedStyles = {
    ...defaultStyles,
    ...externalStyles,
  };

  return (
    <div className={`min-w-[200px] ${className}`}>
      <Select
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        styles={mergedStyles}
        isSearchable={isSearchable}
        components={{ DropdownIndicator }}
        className="react-select-container"
        classNamePrefix="react-select"

        menuPortalTarget={menuPortalTarget}

        {...props}
      />
    </div>
  );
};

export default CustomSelect;
