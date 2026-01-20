import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../../store";
import { PAGE_SIZE_OPTIONS, STATUS_OPTIONS } from "../../../../constants/selectOptions";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
import Button from "../../../../components/ui/Button/Button";
import CardContainer from "../../../../components/shared/CardContainer";
import SearchBar from "../../../../components/shared/SearchBar/SearchBar";
import CustomSelect from "../../../../components/ui/CustomSelect";
import Loading from "../../../../components/shared/Loading/Loading";
import DriverManagementCard from "./components/DriversManagementCard/DriversManagementCard";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import {
  apiDeleteDriverManagement,
  apiGetDriverManagement,
} from "../../../../services/DriverManagementService";
import Modal from "../../../../components/shared/Modal/Modal";

const DriversManagement = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [tableLoading, setTableLoading] = useState(false);
  const [driversData, setDriversData] = useState([]);

  const [selectedStatus, setSelectedStatus] = useState(
    STATUS_OPTIONS.find(o => o.value === "all")
  );
  const savedPagination = useAppSelector(
    state => state?.app?.app?.pagination?.companies
  );
  const [currentPage, setCurrentPage] = useState(
    Number(savedPagination?.currentPage) || 1
  );
  const [itemsPerPage, setItemsPerPage] = useState(
    Number(savedPagination?.itemsPerPage) || 10
  );

  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDrivers = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = {
        page: currentPage,
        perPage: itemsPerPage,
      };

      if (selectedStatus?.value !== "all") {
        params.status = selectedStatus.value;
      }

      if (debouncedSearchQuery?.trim()) {
        params.search = debouncedSearchQuery.trim();
      }

      const response = await apiGetDriverManagement(params);

      if (response?.data?.success === 1) {
        setDriversData(response.data.list?.data || []);
        setTotalPages(response.data.list?.last_page || 1);
      } else {
        setDriversData([]);
      }
    } catch (error) {
      console.error("Fetch drivers error:", error);
      setDriversData([]);
    } finally {
      setTableLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    selectedStatus,
    debouncedSearchQuery,
  ]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers, refreshTrigger]);

  const handleDeleteDriver = async () => {
    if (!driverToDelete?.id) return;

    setIsDeleting(true);
    try {
      const res = await apiDeleteDriverManagement(driverToDelete.id);
      if (res?.data?.success === 1) {
        setDeleteModalOpen(false);
        setDriverToDelete(null);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex justify-between sm:flex-row flex-col items-start sm:items-center gap-3 sm:gap-0 2xl:mb-6 1.5xl:mb-10 mb-0">
        <div className="sm:mb-[30px] mb-1 sm:w-[calc(100%-240px)] w-full flex gap-5 items-center">
          <div className="flex flex-col gap-2.5 w-[calc(100%-100px)]">
            <PageTitle title="Drivers Management" />
            <PageSubTitle title="Manage your driver network and monitor their performance" />
          </div>
        </div>
      </div>
      <div>
        <CardContainer className="p-3 sm:p-4 lg:p-5 bg-[#F5F5F5]">
          <div className="flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 justify-between mb-4 sm:mb-0">
            <div className="md:w-full w-[calc(100%-54px)] sm:flex-1">
              <SearchBar
                value={searchQuery}
                onSearchChange={setSearchQuery}
                className="w-full md:max-w-[400px] max-w-full"
              />
            </div>
            <div className="hidden md:flex flex-row gap-3 sm:gap-5 w-full sm:w-auto">
              <CustomSelect
                options={STATUS_OPTIONS}
                value={selectedStatus}
                onChange={(opt) => {
                  setSelectedStatus(opt);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <Loading loading={tableLoading} type="cover">
            <div className="flex flex-col gap-4 pt-4">
              {driversData?.map((driver) => (
                <DriverManagementCard
                  key={driver.id}
                  driver={driver}
                  onEdit={() => navigate(`/driver/${driver.id}`)}
                  onDelete={(d) => {
                    setDriverToDelete(d);
                    setDeleteModalOpen(true);
                  }}
                />
              ))}
            </div>
          </Loading>
          {Array.isArray(driversData) &&
            driversData.length > 0 ? (
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

      <Modal isOpen={deleteModalOpen} className="p-10">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-3">Delete Driver?</h2>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete {driverToDelete?.name}?
          </p>

          <div className="flex justify-center gap-4">
            <Button
              type="filledGray"
              onClick={() => {
                setDeleteModalOpen(false);
                setDriverToDelete(null);
              }}
              className="px-6 py-2 rounded-md"
            >
              Cancel
            </Button>

            <Button
              type="filledRed"
              onClick={handleDeleteDriver}
              disabled={isDeleting}
              className="px-6 py-2 rounded-md"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DriversManagement;
