import React, { useEffect, useRef } from "react";
import CustomSelect from "../CustomSelect";
import LeftArrowIcon from "../../svg/LeftArrowIcon";
import RightArrowIcon from "../../svg/RightArrowIcon";
import { useAppDispatch, useAppSelector, setPaginationConfig } from "../../../store";

const VARIANT_CONFIG = {
  0: "bg-[#ffffff] border border-[#ededed]",
  1: "bg-[#f9f9f9]",
};

const Pagination = ({
  variant = 0,
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [
    { value: 10, label: "10 / page" },
    { value: 25, label: "25 / page" },
    { value: 50, label: "50 / page" },
    { value: 100, label: "100 / page" },
  ],
  className = "",
  pageKey,
}) => {
  const didInitRef = useRef(false);
  const dispatch = useAppDispatch?.() || null;
  const savedConfig = useAppSelector((state) => state?.app?.app?.pagination?.[pageKey]);

  useEffect(() => {
    if (!pageKey || didInitRef.current) return;
    didInitRef.current = true;
    if (!savedConfig) return;
    const nextItems = Number(savedConfig?.itemsPerPage) || itemsPerPage;
    const nextPage = Number(savedConfig?.currentPage) || 1;
    if (nextItems !== itemsPerPage) {
      onItemsPerPageChange?.(nextItems);
    }
    if (nextPage !== currentPage) {
      onPageChange?.(nextPage);
    }
  }, [pageKey, savedConfig, itemsPerPage, currentPage, onItemsPerPageChange, onPageChange]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const next = currentPage - 1;
      onPageChange?.(next);
      if (pageKey && dispatch) dispatch(setPaginationConfig({ key: pageKey, currentPage: next, itemsPerPage }));
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const next = currentPage + 1;
      onPageChange?.(next);
      if (pageKey && dispatch) dispatch(setPaginationConfig({ key: pageKey, currentPage: next, itemsPerPage }));
    }
  };

  const handlePageClick = (pageNumber) => {
    if (
      pageNumber !== currentPage &&
      pageNumber >= 1 &&
      pageNumber <= totalPages
    ) {
      onPageChange?.(pageNumber);
      if (pageKey && dispatch) dispatch(setPaginationConfig({ key: pageKey, currentPage: pageNumber, itemsPerPage }));
    }
  };

  const handleItemsPerPageChange = (selectedOption) => {
    const nextItems = selectedOption.value;
    onItemsPerPageChange?.(nextItems);
    if (pageKey && dispatch) dispatch(setPaginationConfig({ key: pageKey, currentPage: 1, itemsPerPage: nextItems }));
  };

  const getCurrentItemsPerPageOption = () => {
    return (
      itemsPerPageOptions.find((option) => option.value === itemsPerPage) ||
      itemsPerPageOptions[0]
    );
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 3;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 1);
      const endPage = Math.min(totalPages, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-between gap-2 sm:gap-0 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-base sm:text-lg font-medium transition-colors ${
            currentPage === 1
              ? "text-[#B0B0B0] cursor-not-allowed"
              : "text-[#6C6C6C] hover:bg-[#F5F5F5] cursor-pointer"
          }`}
        >
          <LeftArrowIcon />
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => handlePageClick(pageNumber)}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                pageNumber === currentPage
                  ? "bg-[#1F41BB] text-white"
                  : `text-[#6C6C6C] hover:bg-[#F5F5F5] cursor-pointer ${VARIANT_CONFIG[variant]}`
              }`}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-base sm:text-lg font-medium transition-colors ${
            currentPage === totalPages
              ? "text-[#B0B0B0] cursor-not-allowed"
              : "text-[#6C6C6C] hover:bg-[#F5F5F5] cursor-pointer"
          }`}
        >
          <RightArrowIcon />
        </button>
      </div>

      {/* <div className="min-w-[90px] sm:min-w-[100px] 2xl:min-w-[120px]">
        <CustomSelect
          variant={variant}
          options={itemsPerPageOptions}
          value={getCurrentItemsPerPageOption()}
          onChange={handleItemsPerPageChange}
          menuPlacement="top"
          menuPosition="fixed"
          placeholder="Items per page"
          isSearchable={false}
          className="min-w-[90px] sm:min-w-[100px] 2xl:min-w-[120px]"
        />
      </div> */}
    </div>
  );
};

export default Pagination;
