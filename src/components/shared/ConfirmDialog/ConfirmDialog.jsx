import React from "react";
import Modal from "../../shared/Modal";
import Button from "../../ui/Button/Button";

const ConfirmDialog = ({
  isOpen,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  confirmType = "filled", // or a red variant if available
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  return (
    <Modal size="sm" isOpen={isOpen} className="p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="text-[18px] sm:text-[20px] leading-[24px] sm:leading-[26px] font-semibold text-[#252525]">
          {title}
        </div>
        <div className="text-[#6C6C6C] text-[14px] leading-[20px]">
          {message}
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
          <Button
            btnSize="md"
            type="filledGray"
            className="w-full sm:w-auto !px-8 !pt-3 pb-[11px]"
            onClick={onCancel}
            disabled={isLoading}
          >
            <span>{cancelText}</span>
          </Button>
          <Button
            btnSize="md"
            type={confirmType}
            className="w-full sm:w-auto !px-8 !pt-3 pb-[11px]"
            onClick={onConfirm}
            disabled={isLoading}
          >
            <span>{confirmText}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;


