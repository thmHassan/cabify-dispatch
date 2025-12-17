import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
import Button from "../../../../components/ui/Button/Button";
import PlusIcon from "../../../../components/svg/PlusIcon";
import CardContainer from "../../../../components/shared/CardContainer";
import SearchBar from "../../../../components/shared/SearchBar/SearchBar";
import CustomSelect from "../../../../components/ui/CustomSelect";
import { useAppSelector } from "../../../../store";
import { PAGE_SIZE_OPTIONS, STATUS_OPTIONS } from "../../../../constants/selectOptions";
import AddUserModel from "./components/AddUserModel";
import Modal from "../../../../components/shared/Modal/Modal";
import { lockBodyScroll } from "../../../../utils/functions/common.function";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import Loading from "../../../../components/shared/Loading/Loading";
import UserDetails from "./components/UserDetails";
import { apiDeleteUser, apiGetUser } from "../../../../services/UserService";

const Users = () => {
  const navigate = useNavigate();
  const [isUserModalOpen, setIsUserModalOpen] = useState({
    type: "new",
    isOpen: false,
  });
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
  const [isUserLoadnig, setIsUserLoadnig] = useState(false);
  const [userListRaw, setUserListRaw] = useState([]);
  const [userListDisplay, setUserListDisplay] = useState([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const hasCalledInitial = useRef(false);
  const prevCurrentPageRef = useRef(currentPage);
  const prevSearchRef = useRef(debouncedSearchQuery);
  const prevItemsPerPageRef = useRef(itemsPerPage);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getUser = useCallback(async () => {
    try {
      setIsUserLoadnig(true);
      const params = {
        page: currentPage,
        perPage: itemsPerPage,
      };
      if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
        params.search = debouncedSearchQuery.trim();
      }

      const result = await apiGetUser(params);

      if (result?.status === 200 && result?.data?.users) {
        const list = result?.data?.users?.data;
        const rows = Array.isArray(list) ? list : [];

        setTotalItems(result?.data?.users?.total || 0);
        setTotalPages(result?.data?.users?.last_page || 1);
        setUserListRaw(rows);
        setUserListDisplay(rows);
      }
    } catch (errors) {
      console.log(errors, "err---");
      setUserListRaw([]);
      setUserListDisplay([]);
    } finally {
      setIsUserLoadnig(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(_searchQuery);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [_searchQuery]);

  useEffect(() => {
    if (!hasCalledInitial.current) {
      hasCalledInitial.current = true;
      return;
    }
    getUser();
  }, [refreshTrigger]);

  useEffect(() => {
    if (!hasCalledInitial.current) {
      hasCalledInitial.current = true;
      return;
    }
    const pageChanged = prevCurrentPageRef.current !== currentPage;
    const searchChanged = prevSearchRef.current !== debouncedSearchQuery;
    const itemsPerPageChanged = prevItemsPerPageRef.current !== itemsPerPage;

    if (pageChanged || searchChanged || itemsPerPageChanged) {
      // getUser();
      prevCurrentPageRef.current = currentPage;
      prevSearchRef.current = debouncedSearchQuery;
      prevItemsPerPageRef.current = itemsPerPage;
    }
  }, [currentPage, itemsPerPage, debouncedSearchQuery]);

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete?.id) return;

    setIsDeleting(true);
    try {
      const response = await apiDeleteUser(userToDelete.id);

      if (response?.data?.success === 1 || response?.status === 200) {
        setDeleteModalOpen(false);
        setUserToDelete(null);
        setRefreshTrigger(prev => prev + 1);
      } else {
        console.error("Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (user) => {
    setIsUserModalOpen({
      type: "edit",
      isOpen: true,
      userData: user,
    });
  };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex justify-between sm:flex-row flex-col items-start sm:items-center gap-3 sm:gap-0">
        <div className="flex flex-col gap-2.5">
          <PageTitle title="Users" />
          <PageSubTitle title="Reviews By Customers & Drivers" />
        </div>

        <Button
          type="filled"
          btnSize="2xl"
          onClick={() => {
            lockBodyScroll();
            setIsUserModalOpen({ isOpen: true, type: "new" });
          }}
          className="w-full sm:w-auto"
        >
          <div className="flex gap-2 items-center">
            <PlusIcon />
            <span>Add New User</span>
          </div>
        </Button>
      </div>

      <CardContainer className="p-3 sm:p-4 lg:p-5 bg-[#F5F5F5] mt-5">
        <div className="flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 justify-between mb-4">
          <SearchBar
            value={_searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:max-w-[400px]"
          />

          <div className="hidden md:flex flex-row gap-3 sm:gap-5 w-full sm:w-auto">
            <CustomSelect
              variant={2}
              options={STATUS_OPTIONS}
              value={_selectedStatus}
              placeholder="All Status"
            />
          </div>
        </div>

        <Loading loading={isUserLoadnig} type="cover">
          <div className="flex flex-col gap-4 pt-4">
            {userListDisplay.map((user) => (
              <UserDetails
                key={user.id}
                user={user}
                onEdit={handleEdit}
              onDelete={handleDeleteClick}
              />
            ))}
          </div>
        </Loading>

        {userListDisplay.length > 0 && (
          <div className="mt-4 border-t border-[#E9E9E9] pt-4">
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
        )}
      </CardContainer>

      <Modal isOpen={isUserModalOpen.isOpen} className="p-4 sm:p-6 lg:p-10">
        <AddUserModel
          initialValue={isUserModalOpen.userData}
          setIsOpen={setIsUserModalOpen}
          onUserCreated={() => setRefreshTrigger(prev => prev + 1)}
        />
      </Modal>
      
      <Modal isOpen={deleteModalOpen} className="p-6 sm:p-8 w-full max-w-md">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-3">Delete User?</h2>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete {userToDelete?.name}?
          </p>

          <div className="flex justify-center gap-4">
            <Button
              type="filledGray"
              onClick={() => {
                setDeleteModalOpen(false);
                setUserToDelete(null);
              }}
              className="px-6 py-2"
            >
              Cancel
            </Button>

            <Button
              type="filledRed"
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="px-6 py-2"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
