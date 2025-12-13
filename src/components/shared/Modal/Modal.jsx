import classNames from "classnames";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useAppSelector } from "../../../store";
import Base from "../../animations/Base";

const SIZE_CONFIG = {
  sm: "max-w-[95%] sm:max-w-[520px]",
  md: "max-w-[95%] sm:max-w-[720px]",
  xl: "max-w-[95%] sm:max-w-[1130px]",
  "2xl": "max-w-[95%] sm:max-w-[1200px]",
};

const ModalComponent = ({ size = "xl", children, className }) => {
  const parentRef = useRef(null);
  const childRef = useRef(null);
  const [isChildGreater, setIsChildGreater] = useState(false);
  const { tabViewScreen } = useAppSelector((state) => state.app.app);

  const checkHeights = () => {
    const parentHeight = parentRef.current?.offsetHeight || 0;
    const childHeight = childRef.current?.offsetHeight || 0;
    setIsChildGreater(childHeight > parentHeight);
  };

  useEffect(() => {
    checkHeights();
    window.addEventListener("resize", checkHeights);
    return () => window.removeEventListener("resize", checkHeights);
  }, [tabViewScreen]);

  return (
    <div
      ref={parentRef}
      className={classNames(
        "fixed z-[2000] top-0 left-0 w-full h-full overflow-y-auto bg-[#00000050] flex justify-center",
        isChildGreater 
          ? "py-4 sm:py-8 md:py-[60px] lg:py-[140px]" 
          : "items-start sm:items-center py-4 sm:py-8"
      )}
    >
      <Base
        ref={childRef}
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={classNames(
          "w-auto bg-white rounded-[15px] sm:rounded-[25px] relative h-fit shadow-xl sm:mx-6 my-4 sm:my-0",
          SIZE_CONFIG[size],
          className
        )}
      >
        {children}
      </Base>
    </div>
  );
};

const Modal = ({ isOpen = false, ...rest }) => {
  return (
    <AnimatePresence>{isOpen && <ModalComponent {...rest} />}</AnimatePresence>
  );
};

export default Modal;
