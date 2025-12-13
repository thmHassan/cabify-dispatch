import React, { useCallback, useEffect, useState } from 'react'
import PageTitle from '../../../../components/ui/PageTitle/PageTitle';
import PageSubTitle from '../../../../components/ui/PageSubTitle/PageSubTitle';
import { useAppSelector } from '../../../../store';
import { PAGE_SIZE_OPTIONS, STATUS_OPTIONS } from '../../../../constants/selectOptions';
import Button from '../../../../components/ui/Button/Button';
import CardContainer from '../../../../components/shared/CardContainer';
import SearchBar from '../../../../components/shared/SearchBar/SearchBar';
import CustomSelect from '../../../../components/ui/CustomSelect';
import Loading from '../../../../components/shared/Loading/Loading';
import Pagination from '../../../../components/ui/Pagination/Pagination';
import RidesManagementCard from './components/RidesManagementCard';
// import { apiGetRidesManagement } from '../../../../services/RidesManagementServices';

const RidesManagement = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [_searchQuery, setSearchQuery] = useState("");
  const [tableLoading, setTableLoading] = useState(false);
  const [_selectedStatus, setSelectedStatus] = useState(
    STATUS_OPTIONS.find((o) => o.value === "all") ?? STATUS_OPTIONS[0]
  );
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
  const [rideManagementData, setRideManagementData] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(_searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [_searchQuery]);

  // const fetchRidesManagement = useCallback(async () => {
  //   setTableLoading(true);
  //   try {
  //     const params = {
  //       page: currentPage,
  //       perPage: itemsPerPage,
  //     };
  //     if (debouncedSearchQuery?.trim()) {
  //       params.search = debouncedSearchQuery.trim();
  //     }

  //     const response = await apiGetRidesManagement(params);

  //     if (response?.data?.success === 1) {
  //       const listData = response?.data?.list;
  //       setRideManagementData(listData?.data || []);
  //       setTotalItems(listData?.total || 0);
  //       setTotalPages(listData?.last_page || 1);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching sub-companies:", error);
  //     setRideManagementData([]);
  //   } finally {
  //     setTableLoading(false);
  //   }
  // }, [currentPage, itemsPerPage, debouncedSearchQuery]);

  // useEffect(() => {
  //   fetchRidesManagement();
  // }, [currentPage, itemsPerPage, debouncedSearchQuery, fetchRidesManagement, refreshTrigger]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };


  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <div className="flex justify-between">
          <PageTitle title="Rides Management" />
        </div>
        <div>
          <PageSubTitle title="Monitor live rides and view ride history across your platform" />
        </div>
      </div>
      <div className="bg-[#006FFF1A] p-1 rounded-lg mb-6 inline-flex gap-1">
        <Button
          type="filled"
          btnSize="2xl"
          className={`${activeTab === "all" ? "!bg-[#1F41BB] !text-white" : "!bg-transparent !text-black"}`}
          onClick={() => setActiveTab("all")}
        >
          All
        </Button>
        <Button
          type="filled"
          btnSize="2xl"
          className={`${activeTab === "pob" ? "!bg-[#1F41BB] !text-white" : "!bg-transparent !text-black"}`}
          onClick={() => setActiveTab("pob")}
        >
          POB
        </Button>
        <Button
          type="filled"
          btnSize="2xl"
          className={`${activeTab === "pending" ? "!bg-[#1F41BB] !text-white" : "!bg-transparent !text-black"}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending
        </Button>
        <Button
          type="filled"
          btnSize="2xl"
          className={`${activeTab === "waiting" ? "!bg-[#1F41BB] !text-white" : "!bg-transparent !text-black"}`}
          onClick={() => setActiveTab("waiting")}
        >
          Waiting
        </Button>
        <Button
          type="filled"
          btnSize="2xl"
          className={`${activeTab === "arrived" ? "!bg-[#1F41BB] !text-white" : "!bg-transparent !text-black"}`}
          onClick={() => setActiveTab("arrived")}
        >
          Arrived
        </Button>
        <Button
          type="filled"
          btnSize="2xl"
          className={`${activeTab === "cancelled" ? "!bg-[#1F41BB] !text-white" : "!bg-transparent !text-black"}`}
          onClick={() => setActiveTab("cancelled")}
        >
          Cancelled
        </Button>
        <Button
          type="filled"
          btnSize="2xl"
          className={`${activeTab === "no-Show" ? "!bg-[#1F41BB] !text-white" : "!bg-transparent !text-black"}`}
          onClick={() => setActiveTab("no-show")}
        >
          No-show
        </Button>
      </div>
      <div>
        <CardContainer className="p-3 sm:p-4 lg:p-5 bg-[#F5F5F5]">
          <div className="flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 justify-between mb-4 sm:mb-0">
            <div className="md:w-full w-[calc(100%-54px)] sm:flex-1">
              <SearchBar
                value={_searchQuery}
                // onSearchChange={handleSearchChange}
                className="w-full md:max-w-[400px] max-w-full"
              />
            </div>
            <div className="hidden md:flex flex-row gap-3 sm:gap-5 w-full sm:w-auto">
              <CustomSelect
                variant={2}
                options={STATUS_OPTIONS}
                value={_selectedStatus}
                // onChange={handleStatusChange}
                placeholder="All Status"
              />
              <CustomSelect
                variant={2}
                options={STATUS_OPTIONS}
                value={_selectedStatus}
                // onChange={handleStatusChange}
                placeholder="Select Date"
              />
            </div>
          </div>
          <Loading loading={tableLoading} type="cover">
            <div className="flex flex-col gap-4 pt-4">
              {rideManagementData.map((ride) => (
                <RidesManagementCard key={ride.id} ride={ride} />
              ))}
            </div>
          </Loading>
          {Array.isArray(rideManagementData) &&
            rideManagementData.length > 0 ? (
            <div className="mt-4 sm:mt-4 border-t border-[#E9E9E9] pt-3 sm:pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={PAGE_SIZE_OPTIONS}
                pageKey="companies"
              />
            </div>
          ) : null}
        </CardContainer>
      </div>
    </div>
  );
}

export default RidesManagement