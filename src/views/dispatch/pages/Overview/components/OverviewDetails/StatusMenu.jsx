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
import { sendConfirmationEmail, updateBookingStatus } from "../../../../../../services/AddBookingServices";

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

            if (action === "Allocate Driver") {
                console.log("Opening Allocate Driver modal");
                onOpenAllocateModal(bookingData);
                setUpdating(false);
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
                    const copiedData = {
                        ...bookingData,
                        id: undefined,
                        booking_id: undefined,
                        booking_status: "pending",
                        created_at: undefined,
                        updated_at: undefined,
                        driver: null,
                        driverDetail: null,
                    };

                    await navigator.clipboard.writeText(
                        JSON.stringify(copiedData, null, 2)
                    );

                    toast.success("Booking details copied to clipboard");
                    onClose();
                } catch (err) {
                    toast.error("Failed to copy booking");
                }
                setUpdating(false);
                return;
            }

            let payload = {};

            switch (action) {
                case "Dispatch Job":
                    payload = { booking_status: "ongoing" };
                    break;

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
        // {
        //     label: "Dispatch Job",
        //     icon: DispatchJobIcon,
        //     color: "bg-[#1F41BB]",
        // },
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
        // {
        //     label: "Send Pre-Job",
        //     icon: SendPreJobIcon,
        //     color: "bg-[#1F41BB]",
        // },
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