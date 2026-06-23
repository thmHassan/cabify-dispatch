import classNames from "classnames";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useAppSelector } from "../../../store";
import Base from "../../animations/Base";

const SIZE_CONFIG = {
  sm: "w-full max-w-[95%] sm:max-w-[520px]",
  md: "w-full max-w-[95%] sm:max-w-[720px]",
  lg: "w-full max-w-[95%] lg:max-w-[1280px]",
  xl: "w-full max-w-[95%] sm:max-w-[1130px]",
  "2xl": "w-full max-w-[95%] sm:max-w-[1200px]",
  "3xl": "w-full max-w-[95%] lg:max-w-[95vw] xl:max-w-[1800px]",
};

const ModalComponent = ({ size = "xl", children, className, isVisible = true }) => {
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
          ? "py-2 sm:py-4 lg:py-6 items-start"
          : "items-start sm:items-center py-2 sm:py-4",
        !isVisible && "invisible pointer-events-none"
      )}
      aria-hidden={!isVisible}
    >
      <Base
        ref={childRef}
        initial={isVisible ? { opacity: 0, scale: 0.9, y: 30 } : false}
        animate={isVisible ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={classNames(
          "w-full bg-white rounded-[15px] sm:rounded-[25px] relative h-fit shadow-xl sm:mx-4 lg:mx-6 my-2 sm:my-0 overflow-hidden",
          SIZE_CONFIG[size],
          className
        )}
      >
        {children}
      </Base>
    </div>
  );
};

const Modal = ({ isOpen = false, keepMounted = false, ...rest }) => {
  const wasOpenRef = useRef(isOpen);

  if (isOpen) {
    wasOpenRef.current = true;
  }

  if (keepMounted) {
    if (!wasOpenRef.current) {
      return null;
    }

    return <ModalComponent {...rest} isVisible={isOpen} />;
  }

  return (
    <AnimatePresence>{isOpen && <ModalComponent {...rest} isVisible />}</AnimatePresence>
  );
};

export default Modal;
