import classNames from "classnames";
import React from "react";

const variant = {
  filled: "bg-[#1F41BB] text-[#ffffff] font-semibold",
  bgOutlined:
    "w-full border-2 border-[#1F41BB4D] bg-[#E9F2FF] pt-4 pb-[15px] flex justify-center rounded-lg text-[#1F41BB] font-semibold text-[24px] leading-[33px]",
  filledGray: "bg-[#EEEEEE] text-[#252525] font-semibold",
  filledGreen:
    "bg-[#10B981] text-[#FFFFFF] font-semibold leading-6 text-[18px]",
  filledRed: "bg-[#FF4747] text-[#FFFFFF] font-semibold",
  filledOrange: "bg-[#F59E0B] text-[#ffffff] font-semibold",
  outline: "border border-[#C5C5C5] bg-[#ffffff] text-[#6C6C6C] font-semibold",
  custom: "",
};

const SIZE_CONFIG = {
  "2xl": "2xl:text-2xl sm:text-xl xs:text-lg text-base 2xl:leading-[33px] sm:leading-6 xs:leading-5 leading-[14px] px-[25px] sm:pt-3.5 pt-2.5 pb-[13px] rounded-[10px]",
  md: "text-base leading-[22px] px-[18px] py-[9px] rounded-lg",
  sm: "text-sm",
};

const Button = ({
  btnType = "button",
  type = "custom",
  btnSize = "sm",
  className,
  children,
  onClick,
  ripple = false,
  ...rest
}) => {
  const handleClick = (e) => {
    // Run user's onClick immediately (navigation shouldn't wait on ripple)
    if (typeof onClick === "function") onClick(e);

    if (ripple) {
      // Defer ripple to next tick to avoid any sync work delaying navigation
      const button = e.currentTarget;
      setTimeout(() => {
        if (!button.isConnected) return; // component unmounted due to navigation
        const overlay = document.createElement("span");
        overlay.className = "td-ripple-overlay";
        button.appendChild(overlay);
        overlay.addEventListener("animationend", () => overlay.remove());
      }, 0);
    }
  };

  return (
    <button
      type={btnType}
      className={classNames(
        "font-poppins-semibold relative overflow-hidden",
        variant[type],
        SIZE_CONFIG[btnSize],
        className
      )}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
