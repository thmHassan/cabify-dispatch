import React, { useState } from "react";
import toast from "react-hot-toast";
import Button from "../../../../../../components/ui/Button/Button";
import { apiSendDriverMessage } from "../../../../../../services/DriverManagementService";

const SendDriverMessageModal = ({ driver, onClose }) => {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const driverId = driver?.id || driver?.driver_id;
    const driverName = driver?.name || driver?.driver_name || driver?.driverName || "Driver";

    const handleSend = async () => {
        if (!message.trim()) {
            setError("Message is required");
            return;
        }

        if (!driverId) {
            setError("Driver information is missing");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await apiSendDriverMessage({
                driver_id: driverId,
                message: message.trim(),
            });

            if (response?.data?.success === 1) {
                toast.success("Message sent to driver.");
                onClose();
                return;
            }

            setError(response?.data?.message || "Failed to send message");
        } catch (err) {
            console.error("Send driver message error:", err);
            setError(err?.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-[420px] bg-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-1">Message Driver</h2>
            <p className="text-gray-600 text-sm mb-5">
                Send a message to {driverName}
            </p>

            <textarea
                className="w-full border rounded-2xl px-4 py-3 text-sm outline-none shadow-sm resize-none focus:border-[#1F41BB] focus:ring-1 focus:ring-[#1F41BB]"
                rows="4"
                placeholder="Write your message..."
                value={message}
                onChange={(e) => {
                    setMessage(e.target.value);
                    setError("");
                }}
            />

            {error && (
                <div className="text-red-500 text-sm mt-2">{error}</div>
            )}

            <div className="flex justify-end gap-3 mt-5">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 border border-[#1F41BB] text-[#1F41BB] rounded-lg"
                >
                    Close
                </button>
                <Button
                    type="filled"
                    onClick={handleSend}
                    disabled={loading}
                    className="px-6 py-2 bg-[#1F41BB] text-white rounded-lg disabled:opacity-50"
                >
                    {loading ? "Sending..." : "Send"}
                </Button>
            </div>
        </div>
    );
};

export default SendDriverMessageModal;
