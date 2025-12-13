import { useField } from "formik";
import ChildText from "../ChildText.jsx/ChildText";

const RadioButton = ({ label, value, name, ...props }) => {
  const [field, , helpers] = useField({ name });

  const isChecked = field.value === value;

  return (
    <div
      className="flex items-center gap-2 cursor-pointer"
      onClick={() => helpers.setValue(value)}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={isChecked}
        onChange={() => helpers.setValue(value)}
        className="hidden"
        {...props}
      />
      <span
        className={`w-6 h-6 flex items-center justify-center rounded-full border transition-all
        ${isChecked ? "border-[#1F41BB]" : "border-[#E2E4E5]"}`}
      >
        {isChecked && <span className="w-3 h-3 rounded-full bg-[#1F41BB]" />}
      </span>
      <ChildText size="md" text={label} className="!text-[#6C6C6C]" />
    </div>
  );
};

export default RadioButton;
