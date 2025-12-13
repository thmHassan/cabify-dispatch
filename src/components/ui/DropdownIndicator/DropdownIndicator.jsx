import React from "react";
import { components } from "react-select";
import SelectionDownArrowIcon from "../../svg/SelectionDownArrowIcon";

const SIZE_CONFIG = {
  sm: {
    width: 9,
    height: 18,
  },
  md: {
    width: 20,
    height: 11,
  },
};

const DropdownIndicator = (props, size = "md") => {
  const DropdownIndicator = components.DropdownIndicator;
  return (
    <DropdownIndicator {...props}>
      {props.selectProps.menuIsOpen ? (
        <div className="rotate-180">
          <SelectionDownArrowIcon
            width={SIZE_CONFIG[size].width}
            height={SIZE_CONFIG[size].height}
          />
        </div>
      ) : (
        <div>
          <SelectionDownArrowIcon
            width={SIZE_CONFIG[size].width}
            height={SIZE_CONFIG[size].height}
          />
        </div>
      )}
    </DropdownIndicator>
  );
};

export default DropdownIndicator;
