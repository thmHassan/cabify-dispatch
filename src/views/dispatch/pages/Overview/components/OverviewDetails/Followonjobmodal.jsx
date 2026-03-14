import { useState, useEffect } from "react";
import { getBookings, setFollowOnJob } from "../../../../../../services/AddBookingServices";
import toast from "react-hot-toast";

const FollowOnJobModal = ({ bookingData, onClose, onSuccess }) => {
    const [pendingBookings, setPendingBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchPending = async () => {
            setLoading(true);
            try {
                const res = await getBookings({ status: "pending", limit: 100 });
                if (res?.data?.success) {
                    const filtered = (res.data.data || []).filter(
                        (b) => b.id !== bookingData.id
                    );
                    setPendingBookings(filtered);
                }
            } catch (err) {
                console.error("Error fetching pending bookings:", err);
                toast.error("Failed to load pending bookings");
            } finally {
                setLoading(false);
            }
        };
        fetchPending();
    }, [bookingData.id]);

    const filteredBookings = pendingBookings.filter((b) => {
        const q = search.toLowerCase();
        return (
            b.booking_id?.toLowerCase().includes(q) ||
            b.name?.toLowerCase().includes(q) ||
            b.phone_no?.toLowerCase().includes(q) ||
            b.pickup_location?.toLowerCase().includes(q) ||
            b.destination_location?.toLowerCase().includes(q)
        );
    });

    const handleLink = async () => {
        if (!selectedBookingId) {
            toast.error("Please select a booking to set as follow-on");
            return;
        }
        setSubmitting(true);
        try {
            const res = await setFollowOnJob(bookingData.id, selectedBookingId);
            if (res?.data?.success) {
                toast.success(res.data.message || "Follow-on job linked successfully");
                onSuccess?.({ job1: bookingData, job2_id: selectedBookingId, message: res.data.message });
                onClose();
            } else {
                toast.error(res?.data?.message || "Failed to link follow-on job");
            }
        } catch (err) {
            console.error("Link follow-on error:", err);
            toast.error(err?.response?.data?.message || "Failed to link follow-on job");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-GB");
    };

    return (
        <div className="p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Set Follow-On Job</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Active Job:{" "}
                        <span className="font-semibold text-[#1F41BB]">#{bookingData.booking_id}</span>
                        {" · "}Driver:{" "}
                        <span className="font-semibold">
                            {bookingData.driverDetail?.name || "Assigned Driver"}
                        </span>
                    </p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-sm text-blue-700">
                <span className="font-semibold">How it works: </span>
                When Job <strong>#{bookingData.booking_id}</strong> is marked completed, the selected
                booking will be sent to{" "}
                <strong>{bookingData.driverDetail?.name || "the driver"}</strong> as a new ride
                request. The driver must accept or reject it.
            </div>

            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by booking ID, name, phone, pickup…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#1F41BB]"
            />

            <div className="border rounded-lg overflow-hidden mb-5" style={{ maxHeight: "340px", overflowY: "auto" }}>
                {loading ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Loading pending bookings…</div>
                ) : filteredBookings.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                        {search ? "No bookings match your search" : "No pending bookings available"}
                    </div>
                ) : (
                    filteredBookings.map((b) => {
                        const isSelected = selectedBookingId === b.id;
                        return (
                            <button
                                key={b.id}
                                onClick={() => setSelectedBookingId(b.id)}
                                className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors ${isSelected ? "bg-[#1F41BB] text-white" : "bg-white hover:bg-gray-50 text-gray-800"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isSelected ? "bg-white text-[#1F41BB]" : "bg-blue-100 text-[#1F41BB]"}`}>
                                                #{b.booking_id}
                                            </span>
                                            <span className={`text-xs ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                                                {formatDate(b.booking_date)}
                                                {b.pickup_time ? ` · ${b.pickup_time === "asap" ? "ASAP" : b.pickup_time}` : ""}
                                            </span>
                                        </div>
                                        <div className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-gray-800"}`}>
                                            {b.name || "Unnamed Passenger"}
                                            {b.phone_no && (
                                                <span className={`ml-2 font-normal text-xs ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                                                    {b.phone_no}
                                                </span>
                                            )}
                                        </div>
                                        <div className={`text-xs mt-0.5 truncate ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                                            📍 {b.pickup_location || "N/A"}
                                        </div>
                                        <div className={`text-xs truncate ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                                            🏁 {b.destination_location || "N/A"}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <div className={`text-sm font-bold ${isSelected ? "text-white" : "text-[#1F41BB]"}`}>
                                            {b.recommended_amount || b.booking_amount || "—"}
                                        </div>
                                        <div className={`text-xs ${isSelected ? "text-blue-100" : "text-gray-400"}`}>
                                            {b.payment_method || ""}
                                        </div>
                                        {isSelected && (
                                            <span className="mt-1 inline-block text-xs bg-white text-[#1F41BB] font-bold px-2 py-0.5 rounded-full">
                                                ✓ Selected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            <div className="flex gap-3 justify-end">
                <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleLink}
                    disabled={!selectedBookingId || submitting}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${!selectedBookingId || submitting
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-[#1F41BB] hover:bg-blue-700"
                        }`}
                >
                    {submitting ? "Linking…" : "Confirm Follow-On Job"}
                </button>
            </div>
        </div>
    );
};

export default FollowOnJobModal;