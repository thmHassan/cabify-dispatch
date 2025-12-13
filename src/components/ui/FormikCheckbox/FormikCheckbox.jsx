import { useField } from "formik";
import React from "react";
import FieldTitle from "../FieldTitle";
import RightIcon from "../../svg/RightIcon";
import classNames from "classnames";
import _ from "lodash";

const CheckboxComponent = (
  { checked, onChange, label, className, labelClassNames, readonly },
  ref
) => {
  return (
    <label
      className={`flex items-center gap-2.5 cursor-pointer ${className || ""}`}
    >
      {/* Hidden input for accessibility */}
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        readOnly
        // onChange={(e) => onChange && onChange(!e.target.checked)}
        className="hidden"
      />

      {/* Custom checkbox box */}
      <div
        onClick={() => !readonly && onChange && onChange(!checked)}
        className={`w-6 h-6 border rounded flex justify-center items-center transition-colors ${
          checked ? "bg-[#1F41BB] border-[#1F41BB]" : "border-[#E2E4E5]"
        }`}
      >
        {/* Custom check icon */}
        {checked && <RightIcon />}
      </div>

      {/* Label text */}
      {label && (
        <FieldTitle
          label={label}
          className={classNames("!mb-0", labelClassNames)}
        />
      )}
    </label>
  );
};

const FormikCheckbox = ({
  name,
  label,
  className,
  labelClassNames,
  onChange,
  readonly,
  ...rest
}) => {
  const [field, , helpers] = useField({ name, type: "checkbox" });
  return (
    <CheckboxComponent
      label={label}
      checked={Object.prototype.hasOwnProperty.call(rest, "checked") ? rest.checked : field.value}
      onChange={onChange ?? ((val) => helpers.setValue(val))}
      className={className}
      labelClassNames={labelClassNames}
      readonly={readonly}
    />
  );
};

export default FormikCheckbox;
