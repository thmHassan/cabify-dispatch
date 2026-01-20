import React, { useEffect } from "react";

const Toast = ({ message, type = "error", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === "error"
      ? "bg-red-500"
      : type === "success"
      ? "bg-green-500"
      : "bg-yellow-500";

  return (
    <div className="fixed top-5 right-5 z-[9999]">
      <div
        className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg min-w-[260px] flex justify-between items-center`}
      >
        <span className="text-sm">{message}</span>
        <button
          className="ml-4 text-white font-bold"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
