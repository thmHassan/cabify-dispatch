import React, { useCallback, useEffect, useState } from 'react';
import PageTitle from '../../../../components/ui/PageTitle/PageTitle';
import { useAppSelector } from '../../../../store';
import { PAGE_SIZE_OPTIONS, TICKET_STATUS_OPTIONS } from '../../../../constants/selectOptions';
import CardContainer from '../../../../components/shared/CardContainer';
import SearchBar from '../../../../components/shared/SearchBar/SearchBar';
import Pagination from '../../../../components/ui/Pagination/Pagination';
import CustomSelect from '../../../../components/ui/CustomSelect';
import TicketsCard from './components/TicketsCard';
import Modal from '../../../../components/shared/Modal/Modal';
import AddTicketModel from './components/AddTicketModel';
import TicketUserModal from './components/TicketUserModal';
import AppLogoLoader from '../../../../components/shared/AppLogoLoader';
import { apiChangeTicketStatus, apiGetTicketList } from '../../../../services/TicketServices';
import { getDispatcherId } from '../../../../utils/auth';
import { lockBodyScroll, unlockBodyScroll } from '../../../../utils/functions/common.function';
import { useSocket } from '../../../../components/routes/SocketProvider';

const Tickets = () => {
  const [isTicketsModelOpen, setIsTicketsModelOpen] = useState({
    type: "new",
    isOpen: false,
  });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedUserTicket, setSelectedUserTicket] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [_searchQuery, setSearchQuery] = useState("");
  const [tableLoading, setTableLoading] = useState(false);
  const [_selectedStatus, setSelectedStatus] = useState(
    TICKET_STATUS_OPTIONS.find((o) => o.value === "all") ?? TICKET_STATUS_OPTIONS[0]
  );

  const dispatcherId = getDispatcherId();
  
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
  const [typingByTicket, setTypingByTicket] = useState({});
  const socket = useSocket();

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(_searchQuery);
      setCurrentPage(1);
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

  const handleStatusFilterChange = (newStatus) => {
    setSelectedStatus(newStatus);
    setCurrentPage(1);
  };

  // Fetch Ticket List
  const fetchTickets = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = {
        page: currentPage,
        perPage: itemsPerPage,
        dispatcher_id: dispatcherId,
      };
      if (debouncedSearchQuery?.trim()) {
        params.search = debouncedSearchQuery.trim();
      }
      if (_selectedStatus?.value && _selectedStatus.value !== "all") {
        params.status = _selectedStatus.value;
      }

      const response = await apiGetTicketList(params);

      if (response?.data?.success === 1) {
        const listData = response?.data?.list;
        setTicketsData(listData?.data || []);
        setTotalItems(listData?.total || 0);
        setTotalPages(listData?.last_page || 1);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setTicketsData([]);
    } finally {
      setTableLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchQuery, _selectedStatus?.value, dispatcherId]);

  useEffect(() => {
    fetchTickets();
  }, [currentPage, itemsPerPage, debouncedSearchQuery, fetchTickets, refreshTrigger]);

  const upsertTicketReply = useCallback((ticketId, reply, replyCount) => {
    if (!ticketId || !reply) return;

    const applyReply = (ticket) => {
      if (!ticket || Number(ticket.id) !== Number(ticketId)) return ticket;

      const replies = Array.isArray(ticket.replies) ? ticket.replies : [];
      const hasReply = reply.id
        ? replies.some((item) => Number(item.id) === Number(reply.id))
        : replies.some((item) => item.created_at === reply.created_at && item.message === reply.message);
      const nextReplies = hasReply ? replies : [...replies, reply];

      return {
        ...ticket,
        replies: nextReplies,
        reply_count: replyCount ?? nextReplies.length,
        reply_message: reply.message,
        reply_by_type: reply.reply_by_type,
        reply_by_id: reply.reply_by_id,
        reply_by_name: reply.reply_by_name,
        replied_at: reply.created_at,
      };
    };

    setTicketsData((prev) => prev.map(applyReply));
    setSelectedTicket((prev) => applyReply(prev));
  }, []);

  const prependCreatedTicket = useCallback((ticket) => {
    if (!ticket?.id) return;
    if (_selectedStatus?.value && _selectedStatus.value !== "all" && ticket.status !== _selectedStatus.value) {
      return;
    }

    setTicketsData((prev) => (
      prev.some((item) => Number(item.id) === Number(ticket.id))
        ? prev
        : [ticket, ...prev]
    ));
    setTotalItems((prev) => prev + 1);
  }, [_selectedStatus?.value]);

  const updateTicketStatus = useCallback((ticketId, status) => {
    if (!ticketId || !status) return;

    const applyStatus = (ticket) => {
      if (!ticket || Number(ticket.id) !== Number(ticketId)) return ticket;
      return { ...ticket, status };
    };

    setTicketsData((prev) => {
      const next = prev.map(applyStatus);
      if (_selectedStatus?.value && _selectedStatus.value !== "all" && status !== _selectedStatus.value) {
        return next.filter((ticket) => Number(ticket.id) !== Number(ticketId));
      }
      return next;
    });
    setSelectedTicket((prev) => applyStatus(prev));
  }, [_selectedStatus?.value]);

  useEffect(() => {
    if (!socket) return;

    const handleTicketReply = (payload = {}) => {
      if (!payload.reply) return;
      upsertTicketReply(payload.ticket_id, payload.reply, payload.reply_count);
    };
    const handleTicketCreated = (payload = {}) => {
      prependCreatedTicket(payload.ticket);
    };
    const handleTicketStatusChanged = (payload = {}) => {
      updateTicketStatus(payload.ticket_id, payload.status);
    };

    socket.on("ticket-reply", handleTicketReply);
    socket.on("ticket-updated", handleTicketReply);
    socket.on("ticket-created", handleTicketCreated);
    socket.on("ticket-status-changed", handleTicketStatusChanged);

    return () => {
      socket.off("ticket-reply", handleTicketReply);
      socket.off("ticket-updated", handleTicketReply);
      socket.off("ticket-created", handleTicketCreated);
      socket.off("ticket-status-changed", handleTicketStatusChanged);
    };
  }, [socket, upsertTicketReply, prependCreatedTicket, updateTicketStatus]);

  useEffect(() => {
    if (!socket) return;

    const handleTicketTyping = (payload = {}) => {
      if (!payload.ticket_id) return;

      setTypingByTicket((prev) => ({
        ...prev,
        [payload.ticket_id]: payload.is_typing ? payload : null,
      }));
    };

    socket.on("ticket-typing", handleTicketTyping);

    return () => {
      socket.off("ticket-typing", handleTicketTyping);
    };
  }, [socket]);

  useEffect(() => {
    if (!selectedTicket) return;

    const freshTicket = ticketsData.find((ticket) => ticket.id === selectedTicket.id);
    if (freshTicket) {
      setSelectedTicket(freshTicket);
    }
  }, [ticketsData, selectedTicket?.id]);

  const filteredTickets = ticketsData;

  const handleReplyClick = (ticket) => {
    setSelectedTicket(ticket);
    setIsTicketsModelOpen({ isOpen: true });
  };

  const handleUserClick = (ticket) => {
    lockBodyScroll();
    setSelectedUserTicket(ticket);
    setIsUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    unlockBodyScroll();
    setIsUserModalOpen(false);
    setSelectedUserTicket(null);
  };


  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const formData = new FormData();
      formData.append("ticket_id", ticketId);
      formData.append("status", newStatus);

      const response = await apiChangeTicketStatus(formData);

      if (response?.data?.success === 1) {
        updateTicketStatus(ticketId, newStatus);
      }
    } catch (error) {
      console.error("Error changing ticket status:", error);
    }
  };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <div className="flex justify-between">
          <PageTitle title="Tickets" />
        </div>
        <div>
          {/* <PageSubTitle title="Need Content Here" /> */}
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
              options={TICKET_STATUS_OPTIONS}
              value={_selectedStatus}
              onChange={handleStatusFilterChange}
              placeholder="All Status"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-4">
          {tableLoading ? (
            <div className="flex justify-center py-8">
              <AppLogoLoader />
            </div>
          ) : filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <TicketsCard
                key={ticket.id}
                tickets={ticket}
                onReplyClick={handleReplyClick}
                onStatusChange={handleStatusChange}
                onUserClick={handleUserClick}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tickets found
            </div>
          )}
        </div>

        {filteredTickets.length > 0 && (
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
          onClose={() => {
            setIsTicketsModelOpen({ isOpen: false });
            setSelectedTicket(null);
          }}
          onReplyCreated={(reply, replyCount) => upsertTicketReply(selectedTicket?.id, reply, replyCount)}
          typingUser={selectedTicket ? typingByTicket[selectedTicket.id] : null}
          socket={socket}
          onUserClick={(ticket) => {
            setIsTicketsModelOpen({ isOpen: false });
            handleUserClick(ticket);
          }}
        />
      </Modal>

      <Modal isOpen={isUserModalOpen} className="p-4 sm:p-6 lg:p-10">
        <TicketUserModal
          ticket={selectedUserTicket}
          onClose={handleCloseUserModal}
        />
      </Modal>
    </div>
  );
};

export default Tickets;
