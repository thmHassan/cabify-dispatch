import React from "react";
import Select from "react-select";
import DropdownIndicator from "../DropdownIndicator";

const defaultOptions = [
  { value: "value1", label: "label 1" },
  { value: "value2", label: "label 2" },
  { value: "value3", label: "label 3" },
  { value: "value4", label: "label 4" },
];

const FormSelection = ({
  options = defaultOptions,
  value,
  onChange,
  placeholder = "Select option",
  isMulti = false,
  isDisabled = false,
  name,
  menuPlacement = "auto",
}) => {
  const customStyles = {
    control: (base, state) => ({
      ...base,
      // placeholder:text-[#6C6C6C] text-base leading-[22px] font-semibold
      borderRadius: "8px",
      height: isMulti ? "auto" : "100%",
      minHeight: isMulti ? "auto" : "56px",
      width: "100%",
      borderColor: state.isFocused ? "#1f41bb" : "#8D8D8D",
      boxShadow: state.isFocused
        ? "0 0 0 2px #1f41bb inset, -4px 4px 6px 0px #0000001F"
        : "-4px 4px 6px 0px #0000001F",
      transition: "none",
      fontSize: "16px",
      lineHeight: "22px",
      fontWeight: "600",
      alignItems: "center",
      display: "flex",
      "&:hover": { borderColor: "#1f41bb" },
      "&placeholder": { color: "#6C6C6C" },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 12px",
      gap: "8px",
      alignItems: "center",
      display: "flex",
      minHeight: isMulti ? "auto" : "56px",
      height: isMulti ? "auto" : "100%",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      borderRadius: "12px",
      overflow: "hidden",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#e0e7ff"
        : state.isFocused
        ? "#f3f4f6"
        : "white",
      color: state.isSelected ? "#1d4ed8" : "#111827",
      cursor: "pointer",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#6b7280",
      margin: 0,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      position: "absolute",
      top: "50%",
      left: "12px",
      transform: "translateY(-50%)",
      width: "calc(100% - 12px)",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#111827",
      margin: 0,
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#00000000",
      borderRadius: "20px",
      alignItems: "center",
      margin: 0,
      display: "flex",
      paddingLeft: "8px",
      paddingRight: "0px",
      paddingTop: "0px",
      paddingBottom: "0px",
      border: "1px solid #808080",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "#252525",
      padding: "4px 0px 4px 8px",
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "20px",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "#252525",
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: "0 20px 20px 0",
      "&:hover": {
        backgroundColor: "#D1D1D150",
        color: "#252525",
      },
    }),
  };

  return (
    <Select
      name={name}
      options={options}
      className="form-selection h-full"
      value={
        isMulti
          ? options.filter((opt) => value?.includes(opt.value))
          : options.find((opt) => opt.value === value) || null
      }
      onChange={(selectedOption) => {
        if (isMulti) {
          onChange(
            selectedOption ? selectedOption.map((opt) => opt.value) : []
          );
        } else {
          onChange(selectedOption ? selectedOption.value : "");
        }
      }}
      placeholder={placeholder}
      isMulti={isMulti}
      isDisabled={isDisabled}
      styles={customStyles}
      components={{
        DropdownIndicator: (props) => (
          <div className="py-3 pr-3 pl-1">
            <DropdownIndicator size="sm" {...props} />
          </div>
        ),
        IndicatorSeparator: () => null,
      }}
      menuPlacement={menuPlacement}
    />
  );
};

export default FormSelection;
