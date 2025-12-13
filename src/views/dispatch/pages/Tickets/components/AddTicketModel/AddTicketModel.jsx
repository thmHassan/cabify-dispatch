import React, { useState } from "react";
// import { apiReplyTicket } from "../../../../../../services/TicketsServices";

const AddTicketModel = ({ ticket, onClose, refreshList }) => {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const isViewOnly = ticket.reply_message !== null && ticket.reply_message !== "";

    // const handleReplySubmit = async () => {
    //     if (!message.trim()) return alert("Please enter a reply message");

    //     setLoading(true);

    //     try {
    //         const formData = new FormData();
    //         formData.append("ticket_id", ticket.id);
    //         formData.append("reply_message", message);

    //         const response = await apiReplyTicket(formData);

    //         if (response?.data?.success === 1) {
    //             refreshList();
    //             onClose();
    //         } else {
    //             alert("Failed to submit reply");
    //         }

    //     } catch (error) {
    //         console.error("Reply API Error:", error);
    //         alert("Something went wrong");
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    return (
        <div className="w-[420px] bg-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">

            <h2 className="text-xl font-semibold mb-1">#{ticket.ticket_id}</h2>

            <p className="text-gray-600 text-sm">
                Customer - {ticket.customer ?? "Unknown"}
            </p>

            <p className="text-gray-400 text-sm mb-5">
                {new Date(ticket.created_at).toLocaleDateString("en-GB")}
            </p>

            <div className="flex flex-col gap-4 mb-5">

                <div className="self-start max-w-[80%] bg-blue-50 text-gray-700 px-4 py-3 rounded-2xl">
                    <p>{ticket.message}</p>
                </div>

                {ticket.reply_message && (
                    <div className="self-end max-w-[80%] bg-gray-100 text-gray-700 px-4 py-3 rounded-2xl">
                        <p>{ticket.reply_message}</p>
                    </div>
                )}
            </div>

            {!isViewOnly && (
                <>
                    <textarea
                        className="w-full border rounded-full px-4 py-3 text-sm outline-none shadow-sm resize-none"
                        rows="2"
                        placeholder="Write here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                </>
            )}

            <div className="flex justify-end gap-3 mt-5">

                <button
                    onClick={onClose}
                    className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
                >
                    Close
                </button>

                {!isViewOnly && (
                    <button
                        onClick={handleReplySubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-[#1F41BB] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Sending..." : "Reply"}
                    </button>
                )}
            </div>
        </div>
    );
};

export default AddTicketModel;
