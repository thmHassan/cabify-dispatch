import React, { useCallback, useEffect, useState } from 'react';
import PageTitle from '../../../../components/ui/PageTitle/PageTitle';
import PageSubTitle from '../../../../components/ui/PageSubTitle/PageSubTitle';
import { useAppSelector } from '../../../../store';
import { PAGE_SIZE_OPTIONS, STATUS_OPTIONS } from '../../../../constants/selectOptions';
import CardContainer from '../../../../components/shared/CardContainer';
import SearchBar from '../../../../components/shared/SearchBar/SearchBar';
import Loading from '../../../../components/shared/Loading/Loading';
import Pagination from '../../../../components/ui/Pagination/Pagination';
import CustomSelect from '../../../../components/ui/CustomSelect';
import TicketsCard from './components/TicketsCard';
import Modal from '../../../../components/shared/Modal/Modal';
import AddTicketModel from './components/AddTicketModel';
// import { apiChangeTicketStatus, apiGetTicketList } from '../../../../services/TicketsServices';

const Tickets = () => {
  const [isTicketsModelOpen, setIsTicketsModelOpen] = useState({
    type: "new",
    isOpen: false,
  });
  const [selectedTicket, setSelectedTicket] = useState(null);
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
  const [ticketsData, setTicketsData] = useState([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(_searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [_searchQuery]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };


  // const fetchTickets = useCallback(async () => {
  //   setTableLoading(true);
  //   try {
  //     const params = {
  //       page: currentPage,
  //       perPage: itemsPerPage,
  //     };
  //     if (debouncedSearchQuery?.trim()) {
  //       params.search = debouncedSearchQuery.trim();
  //     }

  //     const response = await apiGetTicketList(params);

  //     if (response?.data?.success === 1) {
  //       const listData = response?.data?.list;
  //       setTicketsData(listData?.data || []);
  //       setTotalItems(listData?.total || 0);
  //       setTotalPages(listData?.last_page || 1);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching tickets:", error);
  //     setTicketsData([]);
  //   } finally {
  //     setTableLoading(false);
  //   }
  // }, [currentPage, itemsPerPage, debouncedSearchQuery]);

  // useEffect(() => {
  //   fetchTickets();
  // }, [currentPage, itemsPerPage, debouncedSearchQuery, fetchTickets, refreshTrigger]);

  const handleReplyClick = (ticket) => {
    setSelectedTicket(ticket);
    setIsTicketsModelOpen({ isOpen: true });
  };

  // const handleStatusChange = async (ticketId, newStatus) => {
  //   try {
  //     const formData = new FormData();
  //     formData.append("ticket_id", ticketId);
  //     formData.append("status", newStatus);

  //     const response = await apiChangeTicketStatus(formData);

  //     if (response?.data?.success === 1) {
  //       setRefreshTrigger((prev) => prev + 1);
  //     }
  //   } catch (error) {
  //     console.error("Error changing ticket status:", error);
  //   }
  // };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <div className="flex justify-between">
          <PageTitle title="Tickets" />
        </div>
        <div>
          <PageSubTitle title="Need Content Here" />
        </div>
      </div>

      <CardContainer className="p-3 sm:p-4 lg:p-5 bg-[#F5F5F5]">
        <div className="flex flex-row items-stretch gap-3 justify-between mb-4">
          <div className="md:w-full">
            <SearchBar
              value={_searchQuery}
              onSearchChange={setSearchQuery}
              className="w-full md:max-w-[400px]"
            />
          </div>

          <div className="hidden md:flex flex-row gap-5">
            <CustomSelect
              variant={2}
              options={STATUS_OPTIONS}
              value={_selectedStatus}
              placeholder="All Status"
            />
          </div>
        </div>

        <Loading loading={tableLoading} type="cover">
          <div className="flex flex-col gap-4 pt-4">
            {ticketsData.map((ticket) => (
              <TicketsCard
                key={ticket.id}
                tickets={ticket}
                onReplyClick={handleReplyClick}
                // onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </Loading>

        {ticketsData.length > 0 && (
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

      <Modal isOpen={isTicketsModelOpen.isOpen}>
        <AddTicketModel
          ticket={selectedTicket}
          onClose={() => setIsTicketsModelOpen({ isOpen: false })}
          refreshList={() => setRefreshTrigger(prev => prev + 1)}
        />
      </Modal>
    </div>
  );
};

export default Tickets;
