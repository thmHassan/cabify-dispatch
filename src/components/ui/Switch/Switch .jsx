import { useField } from "formik";
import React, { useState } from "react";

const FormikSwitch = ({ name }) => {
  const [field, , helpers] = useField(name);

  const handleToggle = () => {
    helpers.setValue(!field.value);
    helpers.setTouched(true);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative inline-flex h-[31px] w-[51px] items-center rounded-full transition-colors ${
        field.value ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white transition-transform shadow-md ${
          field.value ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
};

export const PlainSwitch = ({ value = false, onChange }) => {
  const [internalValue, setInternalValue] = useState(value);

  const handleToggle = () => {
    const newValue = !internalValue;
    setInternalValue(newValue);
    if (onChange) onChange(newValue);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative inline-flex h-[31px] w-[51px] items-center rounded-full transition-colors ${
        internalValue ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white transition-transform shadow-md ${
          internalValue ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
};

const Switch = ({ isFormik = true, ...props }) => {
  return isFormik ? <FormikSwitch {...props} /> : <PlainSwitch {...props} />;
};

export default Switch;
