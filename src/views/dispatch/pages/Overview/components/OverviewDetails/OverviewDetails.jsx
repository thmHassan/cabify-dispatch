import { useState } from "react"
import CardContainer from "../../../../../../components/shared/CardContainer"
import Loading from "../../../../../../components/shared/Loading/Loading"
import SearchBar from "../../../../../../components/shared/SearchBar/SearchBar"
import CustomSelect from "../../../../../../components/ui/CustomSelect"
import Pagination from "../../../../../../components/ui/Pagination/Pagination"
import { STATUS_OPTIONS } from "../../../../../../constants/selectOptions"

const bookings = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    lead: "11:07",
    date: "19-Aug",
    time: "11:06",
    pax: 3,
    mobile: "+1 555 2222 555",
    pickup: "4140 Parker Rd...",
    destination: "2715 Ash Dr. Sa...",
    fare: "39.99",
    payment: "Card",
    vehicle: "Mercedes GT120",
    driver: "Alex Robert",
    company: "Online",
    subCompany: ["Standard", "Time Taxis", "Diamond Taxis", "Crest Cars"][i % 4],
    status: ["Waiting", "On Board", "Active", "Scheduled"][i % 4],
}));
const statusColor = {
    Waiting: "text-orange-500",
    "On Board": "text-green-500",
    Active: "text-blue-500",
    Scheduled: "text-purple-500",
};

/* Column width helper */
const Col = ({ w, children }) => (
    <div className={`px-4 py-3 flex-shrink-0 ${w}`}>{children}</div>
);
const OverViewDetails = () => {
    const [openMenu, setOpenMenu] = useState(null);


    return (
        <div>
            <div className="mt-9  w-full">

                <CardContainer className="p-3 sm:p-4 lg:p-5 bg-[#F5F5F5]">
                    <div className="flex flex-row items-stretch gap-3 justify-between mb-4">
                        <div className="md:w-full">
                            <SearchBar
                                // value={_searchQuery}
                                // onSearchChange={setSearchQuery}
                                className="w-full md:max-w-[400px]"
                            />
                        </div>

                        <div className="hidden md:flex flex-row gap-5">
                            <CustomSelect
                                variant={2}
                                options={STATUS_OPTIONS}
                                // value={_selectedStatus}
                                placeholder="All Sub Companies"
                            />
                        </div>
                        <div className="hidden md:flex flex-row gap-5">
                            <CustomSelect
                                variant={2}
                                options={STATUS_OPTIONS}
                                // value={_selectedStatus}
                                placeholder="All Bookings"
                            />
                        </div>
                        <div className="hidden md:flex flex-row gap-5">
                            <CustomSelect
                                variant={2}
                                options={STATUS_OPTIONS}
                                // value={_selectedStatus}
                                placeholder="All Status"
                            />
                        </div>
                    </div>

                    <Loading type="cover">
                        <div className="flex flex-col gap-4 pt-4">
                            {/* {ticketsData.map((ticket) => (
                                <TicketsCard
                                    key={ticket.id}
                                    tickets={ticket}
                                    onReplyClick={handleReplyClick}
                                // onStatusChange={handleStatusChange}
                                />
                            ))} */}
                        </div>
                    </Loading>

                    {/* {ticketsData.length > 0 && (
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
                    )} */}
                    <div className="p-6 bg-gray-100 min-h-screen">
                        <div className="bg-white rounded-lg shadow">

                            {/* Scroll container WITHOUT bg */}
                            <div className="relative max-h-[450px] overflow-auto">

                                {/* Sticky header WITH bg only */}
                                <div
                                    className="
              sticky top-0 z-50
              bg-gray-100
              border-b
              flex text-sm font-semibold text-gray-700
            "
                                >
                                    <Col w="w-[80px]">Lead</Col>
                                    <Col w="w-[110px]">Pickup Date</Col>
                                    <Col w="w-[90px]">Time</Col>
                                    <Col w="w-[60px]">Pax</Col>
                                    <Col w="w-[180px]">Mobile No.</Col>
                                    <Col w="w-[220px]">Pickup</Col>
                                    <Col w="w-[220px]">Destination</Col>
                                    <Col w="w-[110px]">Fare</Col>
                                    <Col w="w-[220px]">Vehicle</Col>
                                    <Col w="w-[170px]">Sub Company</Col>
                                    <Col w="w-[170px]">Status</Col>
                                </div>

                                {/* Rows WITH white background */}
                                {bookings.map((b) => (
                                    <div
                                        key={b.id}
                                        className="flex text-sm border-b bg-white hover:bg-gray-50"
                                    >
                                        <Col w="w-[80px]">{b.lead}</Col>
                                        <Col w="w-[110px]">{b.date}</Col>
                                        <Col w="w-[90px]">{b.time}</Col>
                                        <Col w="w-[60px]">{b.pax}</Col>
                                        <Col w="w-[180px]">{b.mobile}</Col>
                                        <Col w="w-[220px] truncate">{b.pickup}</Col>
                                        <Col w="w-[220px] truncate">{b.destination}</Col>

                                        <Col w="w-[110px]">
                                            <div className="font-semibold">${b.fare}</div>
                                            <div className="text-xs text-gray-500">{b.payment}</div>
                                        </Col>

                                        <Col w="w-[220px]">
                                            <div className="font-semibold">{b.vehicle}</div>
                                            <div className="text-xs text-gray-500">{b.driver}</div>
                                        </Col>

                                        <Col w="w-[170px]">
                                            <div>{b.company}</div>
                                            <div className="text-xs text-gray-500">{b.subCompany}</div>
                                        </Col>

                                        <Col w="w-[170px]">
                                            <div className="relative">
                                                <button
                                                    onClick={() =>
                                                        setOpenMenu(openMenu === b.id ? null : b.id)
                                                    }
                                                    className="w-full flex justify-between items-center border rounded px-3 py-1 bg-white"
                                                >
                                                    <span
                                                        className={`flex items-center gap-2 ${statusColor[b.status]}`}
                                                    >
                                                        ● {b.status}
                                                    </span>
                                                    ▾
                                                </button>

                                                {openMenu === b.id && (
                                                    <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow-lg z-50">
                                                        {[
                                                            "Dispatch Job",
                                                            "Cancel Job",
                                                            "Allocate Driver",
                                                            "Follow-On-Job",
                                                            "Send Pre-Job",
                                                            "Completed Job",
                                                            "Call Customer",
                                                            "Copy Booking",
                                                            "Send Confirmation Email",
                                                            "Send SMS To Customer",
                                                        ].map((item) => (
                                                            <button
                                                                key={item}
                                                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                                            >
                                                                {item}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </Col>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            <div className="flex justify-between items-center p-4 text-sm">
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 rounded bg-blue-600 text-white">
                                        1
                                    </button>
                                    <button className="px-3 py-1 border rounded">2</button>
                                    <button className="px-3 py-1 border rounded">3</button>
                                </div>

                                <select className="border rounded px-2 py-1">
                                    <option>10 / page</option>
                                    <option>20 / page</option>
                                    <option>50 / page</option>
                                </select>
                            </div>

                        </div>
                    </div>
                </CardContainer>

            </div>
        </div>
    )
}

export default OverViewDetails