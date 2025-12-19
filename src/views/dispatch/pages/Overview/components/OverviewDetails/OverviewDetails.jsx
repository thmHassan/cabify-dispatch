import { useState, useRef, useEffect } from "react";
import CardContainer from "../../../../../../components/shared/CardContainer";
import Loading from "../../../../../../components/shared/Loading/Loading";
import SearchBar from "../../../../../../components/shared/SearchBar/SearchBar";
import CustomSelect from "../../../../../../components/ui/CustomSelect";
import Pagination from "../../../../../../components/ui/Pagination/Pagination";
import { STATUS_OPTIONS } from "../../../../../../constants/selectOptions";
import { createPortal } from "react-dom";

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

// Portal dropdown component
const StatusMenu = ({ anchorRef, onClose }) => {
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
            });
        }

        const handleClick = (e) => {
            if (!anchorRef.current?.contains(e.target)) onClose();
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [anchorRef, onClose]);

    return createPortal(
        <div
            className="absolute w-56 bg-white border rounded shadow-lg z-[9999]"
            style={{ top: pos.top, left: pos.left }}
        >
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
        </div>,
        document.body
    );
};

const OverViewDetails = () => {
    const [openMenu, setOpenMenu] = useState(null);

    return (
        <div className="mt-9 w-full">
            <CardContainer className="p-3 sm:p-4 lg:p-5 bg-[#F5F5F5]">
                <div className="flex flex-row items-stretch gap-3 justify-between mb-4">
                    <div className="md:w-full">
                        <SearchBar className="w-full md:max-w-[400px]" />
                    </div>

                    <div className="hidden md:flex flex-row gap-5">
                        <CustomSelect variant={2} options={STATUS_OPTIONS} placeholder="All Sub Companies" />
                        <CustomSelect variant={2} options={STATUS_OPTIONS} placeholder="All Bookings" />
                        <CustomSelect variant={2} options={STATUS_OPTIONS} placeholder="All Status" />
                    </div>
                </div>

                <Loading type="cover">
                    <div className="flex flex-col gap-4 pt-4"></div>
                </Loading>

                <div className="p-6 bg-gray-100">
                    <div className="bg-white rounded-lg shadow">

                        {/* Scroll container */}
                        <div className="overflow-x-auto bg-gray-100">
                            <div className="min-w-max">

                                {/* Table header */}
                                <div className="flex border-b text-sm font-semibold text-gray-700">
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

                                {/* Table rows */}
                                {bookings.map((b) => {
                                    const btnRef = useRef(null);

                                    return (
                                        <div key={b.id} className="flex border-b bg-white text-sm hover:bg-gray-50 relative">
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

                                            {/* Status dropdown */}
                                            <Col w="w-[170px]">
                                                <button
                                                    ref={btnRef}
                                                    onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                                                    className="w-full flex justify-between items-center border rounded px-3 py-1 bg-white"
                                                >
                                                    <span className={`flex items-center gap-2 ${statusColor[b.status]}`}>
                                                        ● {b.status}
                                                    </span>
                                                    ▾
                                                </button>

                                                {openMenu === b.id && (
                                                    <StatusMenu anchorRef={btnRef} onClose={() => setOpenMenu(null)} />
                                                )}
                                            </Col>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>



                        {/* Pagination */}
                        <div className="p-4">
                            <Pagination />
                        </div>
                    </div>
                </div>

            </CardContainer>
        </div>
    );
};

export default OverViewDetails;
