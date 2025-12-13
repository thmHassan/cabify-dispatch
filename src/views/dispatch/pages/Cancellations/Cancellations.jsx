import React, { useCallback, useEffect, useState } from "react";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import CardContainer from "../../../../components/shared/CardContainer";
import SearchBar from "../../../../components/shared/SearchBar/SearchBar";
import CancellationsCard from "./CancellationsCard";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import { PAGE_SIZE_OPTIONS } from "../../../../constants/selectOptions";
import { useAppSelector } from "../../../../store";

const Cancellations = () => {
  const [_searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("customer");
  const savedPagination = useAppSelector(
    (state) => state?.app?.app?.pagination?.companies
  );
  const [currentPage, setCurrentPage] = useState(
    Number(savedPagination?.currentPage) || 1
  );
  const [itemsPerPage, setItemsPerPage] = useState(
    Number(savedPagination?.itemsPerPage) || 10
  );
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [tableLoading, setTableLoading] = useState(false);
  const [cancellationsData, setCancellationsData] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(_searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [_searchQuery]);

  // const fetchCancellationsBooking = useCallback(async () => {
  //   setTableLoading(true);
  //   try {
  //     const params = {
  //       page: currentPage,
  //       perPage: itemsPerPage,
  //     };
  //     if (debouncedSearchQuery?.trim()) {
  //       params.search = debouncedSearchQuery.trim();
  //     }

  //     const response = await apiGetCancelledBooking(params);

  //     if (response?.data?.success === 1) {
  //       const listData = response?.data?.list;
  //       setCancellationsData(listData?.data || []);
  //       setTotalItems(listData?.total || 0);
  //       setTotalPages(listData?.last_page || 1);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching sub-companies:", error);
  //     setCancellationsData([]);
  //   } finally {
  //     setTableLoading(false);
  //   }
  // }, [currentPage, itemsPerPage, debouncedSearchQuery]);

  // useEffect(() => {
  //   fetchCancellationsBooking();
  // }, [currentPage, itemsPerPage, debouncedSearchQuery, fetchCancellationsBooking, refreshTrigger]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const staticData = [
    {
      rideId: "MR12345",
      name: "Alex Rodriguez",
      phoneNumber: "+1 (555) 123-4567",
      carPlateNo: "ABC-1234",
      DateTime: "2023-08-15 14:30",
      loction: "Downtown",
      status: "Active",
    },
    {
      rideId: "MR12346",
      name: "Alex Rodriguez",
      phoneNumber: "+1 (555) 123-4567",
      carPlateNo: "ABC-1234",
      DateTime: "2023-08-15 14:30",
      loction: "Downtown",
      status: "Inactive",
    },
    {
      rideId: "MR12347",
      name: "Alex Rodriguez",
      phoneNumber: "+1 (555) 123-4567",
      carPlateNo: "ABC-1234",
      DateTime: "2023-08-15 14:30",
      loction: "Downtown",
      status: "Active",
    },
    {
      rideId: "MR12347",
      name: "Alex Rodriguez",
      phoneNumber: "+1 (555) 123-4567",
      carPlateNo: "ABC-1234",
      DateTime: "2023-08-15 14:30",
      loction: "Downtown",
      status: "Active",
    },
  ];


  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <div className="flex justify-between">
          <PageTitle title="Cancellations" />
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:gap-5 lg:gap-[30px]">
        <CardContainer className="p-3 sm:p-4 lg:p-5">
          <div className="flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 justify-between mb-4 sm:mb-0">
            <div className="md:w-full w-[calc(100%-54px)] sm:flex-1">
              <SearchBar
                value={_searchQuery}
                // onSearchChange={handleSearchChange}
                className="w-full md:max-w-[400px] max-w-full"
              />
            </div>
          </div>
          <div className="space-y-4">
            {staticData?.map((cancellations) => (
              <CancellationsCard
                key={cancellations.id}
                cancellations={cancellations}
              />
            ))}
          </div>
          {/* {Array.isArray(cancellationsData) &&
            cancellationsData.length > 0 ? (
            <div className="mt-4 sm:mt-4 border-t border-[#E9E9E9] pt-3 sm:pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={PAGE_SIZE_OPTIONS}
                pageKey="cancellations"
              />
            </div>
          ) : null} */}
        </CardContainer>
      </div>
    </div>
  );
};

export default Cancellations;
