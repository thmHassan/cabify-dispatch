import { useEffect, useRef, useState } from "react";
import { mapBookingToFormValues } from "../../../../../../utils/functions/bookingFormMapper";
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
import {
    recordDispatcherAction,
    sendConfirmationEmail,
    startAutoDispatch,
    updateBookingStatus,
} from "../../../../../../services/AddBookingServices";
import { getDispatcherName } from "../../../../../../utils/auth";

const StatusMenu = ({
    anchorRef,
    bookingId,
    onClose,
    onStatusUpdate,
    bookingData,
    navigate,
    onOpenAllocateModal,
    onOpenFollowOnModal,
}) => {
    const menuRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
        }

        const handleOutsideClick = (e) => {
            if (!menuRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) {
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
                onOpenAllocateModal(bookingData, "allocate_driver");
                setUpdating(false);
                return;
            }

            if (action === "Send Pre-Job") {
                onOpenAllocateModal(bookingData, "pre_job");
                setUpdating(false);
                return;
            }

            if (action === "Follow-On Job") {
                onOpenFollowOnModal(bookingData);
                setUpdating(false);
                return;
            }

            if (action === "Dispatch Job") {
                try {
                    const dispatcherName = getDispatcherName();
                    const res = await startAutoDispatch(bookingId, dispatcherName);
                    if (res?.data?.success) {
                        toast.success("Auto dispatch started");
                        onStatusUpdate({ ...bookingData, booking_status: "pending" });
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

            if (action === "Follow on job") {
                if (!bookingData.driver) {
                    toast.error("No driver assigned to this booking");
                    onClose();
                    setUpdating(false);
                    return;
                }
                navigate("/map", {
                    state: {
                        trackingBookingId: bookingData.id,
                        driverId: bookingData.driver,
                        driverName: bookingData.driverDetail?.name,
                        bookingReference: bookingData.booking_id,
                    },
                });
                onClose();
                setUpdating(false);
                return;
            }

            if (action === "Send Confirmation Email") {
                const dispatcherName = getDispatcherName();
                const res = await sendConfirmationEmail(bookingId, dispatcherName);
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
                    const dispatcherName = getDispatcherName();
                    await recordDispatcherAction(bookingId, "copied this booking", dispatcherName);

                    const copiedData = mapBookingToFormValues(bookingData, { mode: "copy" });

                    localStorage.setItem("copiedBookingData", JSON.stringify(copiedData));
                    toast.success("Booking copied! Opening booking form...");
                    onClose();
                    window.dispatchEvent(new CustomEvent("openAddBookingModal"));
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

            const dispatcherName = getDispatcherName();
            const res = await updateBookingStatus(bookingId, payload, dispatcherName);
            if (res?.data?.success) {
                toast.success(res.data.message || "Status updated");
                onStatusUpdate({ ...bookingData, ...payload, ...(res.data.data || {}) });
                onClose();
            } else {
                toast.error("Failed to update booking");
            }
        } catch (err) {
            console.error("Action error:", err);
            toast.error(err?.response?.data?.message || "Action failed");
        } finally {
            setUpdating(false);
        }
    };

    const allMenuItems = [
        { label: "Dispatch Job", icon: DispatchJobIcon, color: "bg-[#1F41BB]" },
        { label: "Cancel Job", icon: CancelJobIcon, color: "bg-[#1F41BB]" },
        { label: "Allocate Driver", icon: AllocateDriverIcon, color: "bg-[#1F41BB]" },
        // { label: "Follow on job", icon: FollowOnJobIcon, color: "bg-[#1F41BB]" },
        // { label: "Send Pre-Job", icon: SendPreJobIcon, color: "bg-[#1F41BB]" },
        // { label: "Follow-On Job", icon: FollowOnJobIcon, color: "bg-[#1F41BB]" },
        { label: "Completed Job", icon: CompletedJobIcon, color: "bg-[#1F41BB]" },
        { label: "Call Customer", icon: CallCustomerIcon, color: "bg-[#1F41BB]" },
        { label: "Copy Booking", icon: CopyBookingIcon, color: "bg-[#1F41BB]" },
        { label: "Send Confirmation Email", icon: ConfirmationEmailIcon, color: "bg-[#1F41BB]" },
        { label: "Send SMS To Customer", icon: SMSToCustomerIcon, color: "bg-[#1F41BB]" },
    ];

    const getFilteredMenuItems = () => {
        const status = bookingData?.booking_status;
        const isDriverAssigned = !!(bookingData?.driver || bookingData?.pending_driver_id);
        const hasFollowOnLinked = !!bookingData?.follow_on_job_id;

        if (status === "cancelled") {
            return allMenuItems.filter((item) =>
                ["Call Customer", "Copy Booking", "Send SMS To Customer"].includes(item.label)
            );
        }

        if (status === "completed") {
            return allMenuItems.filter((item) =>
                ["Call Customer", "Copy Booking", "Send SMS To Customer"].includes(item.label)
            );
        }

        if (["ongoing", "arrived", "started"].includes(status)) {
            if (hasFollowOnLinked) {
                return [
                    ...allMenuItems.filter((item) =>
                        ["Completed Job", "Cancel Job",
                            "Call Customer", "Send Confirmation Email", "Send SMS To Customer"].includes(item.label)
                    ),
                    { label: "✓ Follow-On Linked", icon: SendPreJobIcon, color: "bg-green-500", disabled: true },
                ];
            }
            return allMenuItems.filter((item) =>
                ["Follow-On Job", "Completed Job", "Cancel Job",
                    "Call Customer", "Send Confirmation Email", "Send SMS To Customer"].includes(item.label)
            );
        }

        let items = allMenuItems.filter(
            (item) => !["Follow-On Job", "Follow on job"].includes(item.label)
        );

        if (isDriverAssigned) {
            items = items.filter(
                (item) => !["Dispatch Job", "Allocate Driver"].includes(item.label)
            );
        }

        return items;
    };

    return createPortal(
        <div
            ref={menuRef}
            className="absolute w-48 bg-white border rounded shadow-lg z-[9999]"
            style={{ top: pos.top, left: pos.left }}
        >
            {getFilteredMenuItems().map((item) => {
                const Icon = item.icon;
                const isDisabled = item.disabled || updating;
                return (
                    <button
                        key={item.label}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!item.disabled) handleStatusChange(item.label);
                        }}
                        disabled={isDisabled}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold transition-colors ${item.disabled
                            ? "text-green-600 cursor-default bg-green-50"
                            : "hover:bg-gray-50 text-gray-800"
                            }`}
                    >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                    </button>
                );
            })}
        </div>,
        document.body
    );
};

export default StatusMenu;