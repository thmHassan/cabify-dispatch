import { useEffect, useRef, useState } from "react";
import DispatchJobIcon from "../../../../../../components/svg/DispatchJobIcon";
import CancelJobIcon from "../../../../../../components/svg/CancelJobIcon";
import AllocateDriverIcon from "../../../../../../components/svg/AllocateDriverIcon";
import FollowOnJobIcon from "../../../../../../components/svg/FollowOnJobIcon";
import SendPreJobIcon from "../../../../../../components/svg/SendPreJobIcon";
import CompletedJobIcon from "../../../../../../components/svg/CompletedJobIcon";
import CallCustomerIcon from "../../../../../../components/svg/CallCustomerIcon";
import CopyBookingIcon from "../../../../../../components/svg/CopyBookingIcon";
import ConfirmationEmailIcon from "../../../../../../components/svg/ConfirmationEmailIcon";
import SMSToCustomerIcon from "../../../../../../components/svg/SMSToCustomerIcon";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { sendConfirmationEmail, startAutoDispatch, updateBookingStatus } from "../../../../../../services/AddBookingServices";

const StatusMenu = ({ anchorRef, bookingId, onClose, onStatusUpdate, bookingData, navigate, onOpenAllocateModal }) => {
    const menuRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
            });
        }

        const handleOutsideClick = (e) => {
            if (
                !menuRef.current?.contains(e.target) &&
                !anchorRef.current?.contains(e.target)
            ) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [anchorRef, onClose]);

    const handleStatusChange = async (action) => {
        if (updating) return;

        try {
            setUpdating(true);
            if (action === "Allocate Driver" || action === "Send Pre-Job") {
                console.log(`Opening ${action} modal`);
                onOpenAllocateModal(bookingData);
                setUpdating(false);
                return;
            }

            if (action === "Dispatch Job") {
                try {
                    setUpdating(true);

                    const res = await startAutoDispatch(bookingId);

                    if (res?.data?.success) {
                        toast.success("Auto dispatch started");

                        onStatusUpdate({
                            ...bookingData,
                            booking_status: "pending"
                        });

                        onClose();
                    } else {
                        toast.error("Failed to start dispatch");
                    }

                } catch (err) {
                    console.error("Dispatch error:", err);
                    toast.error("Failed to start dispatch");
                } finally {
                    setUpdating(false);
                }

                return;
            }

            if (action === "Follow-On-Job") {
                if (!bookingData.driver) {
                    toast.error("No driver assigned to this booking");
                    onClose();
                    setUpdating(false);
                    return;
                }

                console.log("Navigating to map with data:", {
                    trackingBookingId: bookingData.id,
                    driverId: bookingData.driver,
                    driverName: bookingData.driverDetail?.name,
                    bookingReference: bookingData.booking_id
                });

                navigate('/map', {
                    state: {
                        trackingBookingId: bookingData.id,
                        driverId: bookingData.driver,
                        driverName: bookingData.driverDetail?.name,
                        bookingReference: bookingData.booking_id
                    }
                });

                onClose();
                setUpdating(false);
                return;
            }

            if (action === "Send Confirmation Email") {
                const res = await sendConfirmationEmail(bookingId);

                if (res?.data?.success) {
                    toast.success("Confirmation email sent successfully");
                } else {
                    toast.error("Failed to send confirmation email");
                }

                onClose();
                setUpdating(false);
                return;
            }

            if (action === "Copy Booking") {
                try {
                    let viaPoints = [];
                    let viaLatitudes = [];
                    let viaLongitudes = [];

                    if (bookingData.via_location) {
                        try {
                            const viaLocArray = typeof bookingData.via_location === 'string'
                                ? JSON.parse(bookingData.via_location)
                                : bookingData.via_location;
                            viaPoints = Array.isArray(viaLocArray) ? viaLocArray : [];
                        } catch (e) {
                            console.error("Error parsing via_location:", e);
                        }
                    }

                    if (bookingData.via_point) {
                        try {
                            const viaPointArray = typeof bookingData.via_point === 'string'
                                ? JSON.parse(bookingData.via_point)
                                : bookingData.via_point;

                            if (Array.isArray(viaPointArray)) {
                                viaLatitudes = viaPointArray.map(point => point.latitude || "");
                                viaLongitudes = viaPointArray.map(point => point.longitude || "");
                            }
                        } catch (e) {
                            console.error("Error parsing via_point:", e);
                        }
                    }

                    let pickupLat = "";
                    let pickupLng = "";
                    if (bookingData.pickup_point) {
                        const [lat, lng] = bookingData.pickup_point.split(',').map(s => s.trim());
                        pickupLat = lat || "";
                        pickupLng = lng || "";
                    }

                    let destLat = "";
                    let destLng = "";
                    if (bookingData.destination_point) {
                        const [lat, lng] = bookingData.destination_point.split(',').map(s => s.trim());
                        destLat = lat || "";
                        destLng = lng || "";
                    }

                    // Format pickup_time (remove seconds if present)
                    let formattedPickupTime = "";
                    if (bookingData.pickup_time && bookingData.pickup_time !== "asap") {
                        const timeParts = bookingData.pickup_time.split(':');
                        formattedPickupTime = `${timeParts[0]}:${timeParts[1]}`;
                    }

                    // Format booking_date (convert from ISO to YYYY-MM-DD)
                    let formattedDate = "";
                    if (bookingData.booking_date) {
                        const date = new Date(bookingData.booking_date);
                        formattedDate = date.toISOString().split('T')[0];
                    }

                    const copiedData = {
                        sub_company: bookingData.sub_company?.toString() || "",
                        pickup_point: bookingData.pickup_location || "",
                        destination: bookingData.destination_location || "",
                        pickup_latitude: pickupLat,
                        pickup_longitude: pickupLng,
                        destination_latitude: destLat,
                        destination_longitude: destLng,
                        pickup_plot_id: bookingData.pickup_plot_id || null,
                        destination_plot_id: bookingData.destination_plot_id || null,

                        via_points: viaPoints,
                        via_latitude: viaLatitudes,
                        via_longitude: viaLongitudes,
                        via_plot_id: [],

                        booking_date: formattedDate,
                        pickup_time: formattedPickupTime,
                        pickup_time_type: bookingData.pickup_time === "asap" ? "asap" : "time",
                        booking_type: bookingData.booking_type || "outstation",

                        name: bookingData.name || "",
                        email: bookingData.email || "",
                        phone_no: bookingData.phone_no || "",
                        tel_no: bookingData.tel_no || "",

                        journey_type: bookingData.journey_type || "one_way",
                        account: bookingData.account?.toString() || "",
                        vehicle: bookingData.vehicle?.toString() || "",
                        passenger: parseInt(bookingData.passenger) || 0,
                        luggage: parseInt(bookingData.luggage) || 0,
                        hand_luggage: parseInt(bookingData.hand_luggage) || 0,
                        special_request: bookingData.special_request || "",
                        payment_reference: bookingData.payment_reference || "",
                        payment_method: bookingData.payment_method || "cash",

                        fares: parseFloat(bookingData.fares) || 0,
                        return_fares: parseFloat(bookingData.return_fares) || 0,
                        parking_charges: parseFloat(bookingData.parking_charge) || 0,
                        waiting_charges: parseFloat(bookingData.waiting_charge) || 0,
                        ac_fares: parseFloat(bookingData.ac_fares) || 0,
                        return_ac_fares: parseFloat(bookingData.return_ac_fares) || 0,
                        ac_parking_charges: parseFloat(bookingData.ac_parking_charge) || 0,
                        ac_waiting_charges: parseFloat(bookingData.ac_waiting_charge) || 0,
                        extra_charges: parseFloat(bookingData.extra_charge) || 0,
                        congestion_toll: parseFloat(bookingData.toll) || 0,
                        booking_fee_charges: 0,
                        total_charges: parseFloat(bookingData.booking_amount) || 0,

                        driver: "",
                        booking_system: "auto_dispatch",
                        auto_dispatch: true,
                        bidding: false,
                    };

                    localStorage.setItem('copiedBookingData', JSON.stringify(copiedData));

                    toast.success("Booking copied! Opening booking form...");
                    onClose();

                    window.dispatchEvent(new CustomEvent('openAddBookingModal'));
                } catch (err) {
                    console.error("Copy booking error:", err);
                    toast.error("Failed to copy booking");
                }
                setUpdating(false);
                return;
            }

            let payload = {};

            switch (action) {
                case "Completed Job":
                    payload = { booking_status: "completed" };
                    break;

                case "Cancel Job":
                    payload = { booking_status: "cancelled" };
                    break;

                default:
                    toast.error("Action not implemented yet");
                    setUpdating(false);
                    return;
            }

            const res = await updateBookingStatus(bookingId, payload);

            if (res?.data?.success) {
                toast.success(res.data.message || "Status updated");
                onStatusUpdate(res.data.data);
                onClose();
            } else {
                toast.error("Failed to update booking");
            }
        } catch (err) {
            console.error("Action error:", err);
            toast.error(
                err?.response?.data?.message || "Action failed"
            );
        } finally {
            setUpdating(false);
        }
    };

    const menuItems = [
        {
            label: "Dispatch Job",
            icon: DispatchJobIcon,
            color: "bg-[#1F41BB]",
        },
        {
            label: "Cancel Job",
            icon: CancelJobIcon,
            color: "bg-[#1F41BB]",
        },
        {
            label: "Allocate Driver",
            icon: AllocateDriverIcon,
            color: "bg-[#1F41BB]",
        },
        {
            label: "Follow-On-Job",
            icon: FollowOnJobIcon,
            color: "bg-[#1F41BB]",
        },
        {
            label: "Send Pre-Job",
            icon: SendPreJobIcon,
            color: "bg-[#1F41BB]",
        },
        {
            label: "Completed Job",
            icon: CompletedJobIcon,
            color: "bg-[#1F41BB]",
        },
        {
            label: "Call Customer",
            icon: CallCustomerIcon,
            color: "bg-[#1F41BB]",
        },
        {
            label: "Copy Booking",
            icon: CopyBookingIcon,
            color: "bg-[#1F41BB]",
        },
        {
            label: "Send Confirmation Email",
            icon: ConfirmationEmailIcon,
            color: "bg-[#1F41BB]",
        },
        {
            label: "Send SMS To Customer",
            icon: SMSToCustomerIcon,
            color: "bg-[#1F41BB]",
        },
    ];

    return createPortal(
        <div
            ref={menuRef}
            className="absolute w-42 bg-white border rounded shadow-lg z-[9999]"
            style={{ top: pos.top, left: pos.left }}
        >
            {menuItems.map((item) => {
                const Icon = item.icon;

                return (
                    <button
                        key={item.label}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(item.label);
                        }}
                        disabled={updating}
                        className={`w-full flex items-center gap-2 px-2 py-1 text-[11px] font-semibold hover:bg-gray-50`}
                    >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1 text-left">
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>,
        document.body
    );
};

export default StatusMenu;