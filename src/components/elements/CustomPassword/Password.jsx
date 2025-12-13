import { useState } from "react";
import { Field } from "formik";
import EyeIcon from "../../svg/EyeIcon";

const Password = ({ disabled = false, ...rest }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Field
        type={showPassword ? "text" : "password"}
        disabled={disabled}
        {...rest}
        style={{ paddingRight: "50px" }}
      />
      <button
        type="button"
        className="absolute top-2/4 -translate-y-2/4 right-[5px] w-[50px] h-[50px] flex justify-center items-center"
        onClick={() => {
          if (!disabled) setShowPassword(!showPassword);
        }}
      >
        <span className="hidden sm:block">{showPassword ? <EyeIcon width={20} height={20} /> : <EyeIcon width={20} height={20} />}</span>
        <span className="block sm:hidden">{showPassword ? <EyeIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}</span>
      </button>
    </div>
  );
};

export default Password;
