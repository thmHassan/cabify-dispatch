import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Base from "../../animations/Base";
import classNames from "classnames";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";

const UserDropdown = ({ children, options = [], className, itemData }) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Handle toggle and calculate position
  const handleToggle = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right - 192, // 192px = width of dropdown
      });
    }
    setOpen((prev) => !prev);
  };

  // ✅ Dropdown content (rendered via portal)
  const dropdownContent = (
    <AnimatePresence>
      {open && (
        <Base
          ref={menuRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "absolute",
            top: position.top,
            left: position.left,
            zIndex: 9999,
          }}
          className="w-48 bg-white rounded-xl shadow-lg border"
        >
          <ul className="py-2">
            {options.map((opt, idx) => {
              const Icon = opt.icon;
              return (
                <li
                  key={idx}
                  onClick={() => {
                    if (!opt.disabled) {
                      opt.onClick(itemData);
                      setOpen(false);
                    }
                  }}
                >
                  <div
                    className={classNames(
                      "hover:bg-gray-100 flex items-center gap-2.5 px-4 py-2 rounded-lg",
                      {
                        "bg-[#1F41BB] text-white": pathname === opt?.route,
                        "cursor-pointer": !opt.disabled,
                        "cursor-not-allowed opacity-50": opt.disabled,
                      },
                      className
                    )}
                  >
                    {Icon && (
                      <Icon
                        color={pathname === opt?.route ? "#ffffff" : "#000000"}
                      />
                    )}
                    {opt.label}
                  </div>
                </li>
              );
            })}
          </ul>
        </Base>
      )}
    </AnimatePresence>
  );

  return (
    <div className="inline-block select-none relative">
      {/* ✅ Trigger Button */}
      <div ref={buttonRef} className="cursor-pointer" onClick={handleToggle}>
        {children}
      </div>

      {/* ✅ Render dropdown only after DOM mount */}
      {mounted && createPortal(dropdownContent, document.body)}
    </div>
  );
};

export default UserDropdown;
