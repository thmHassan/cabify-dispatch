import classNames from "classnames";
import React, { useRef, useState, useEffect } from "react";

const CommonImageUploader = ({
  onChange,
  defaultImage = "",
  size = 120,
  rounded = true,
  label,
  className,
  icon,
}) => {
  const [imagePreview, setImagePreview] = useState(defaultImage);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (defaultImage) {
      setImagePreview(defaultImage);
    }
  }, [defaultImage]);

  const handlePickImage = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
   const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      if (onChange) onChange(file, reader.result);
    };
    reader.readAsDataURL(file);
  };
  const hasResponsiveSize = className?.includes("w-") || className?.includes("h-") || className?.includes("size");
  return (
    <div className={classNames("flex flex-col gap-4 sm:gap-5 items-center", className?.split(" ").filter(c => !c.includes("w-") && !c.includes("h-") && !c.includes("size")).join(" "))}>
      <div
        onClick={handlePickImage}
        title="Click to upload"
        style={!hasResponsiveSize ? { width: size, height: size } : undefined}
        className={classNames(
          "flex justify-center items-center bg-[#EEEEEE] overflow-hidden cursor-pointer transition hover:opacity-80",
          rounded ? "rounded-full" : "rounded-lg",
          hasResponsiveSize ? className?.split(" ").filter(c => c.includes("w-") || c.includes("h-") || c.includes("size")).join(" ") : ""
        )}
      >
        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        ) : (
          icon || (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 16v-8m0 0L8 12m4-4l4 4M6 20h12a2 2 0 002-2V8a2 2 0 00-2-2h-4l-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      {label && (
        <div className="text-lg sm:text-xl lg:text-[26px] leading-7 sm:leading-8 lg:leading-9 font-semibold text-[#252525] text-center">
          <span>{label}</span>
        </div>
      )}
    </div>
  );
};

export default CommonImageUploader;
