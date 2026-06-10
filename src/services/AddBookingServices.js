import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import ApiService from "./ApiService";
import { CALCULATE_FARES, CANCELLED_BOOKING, CREATE_BOOKING, GET_ALL_PLOT } from "../constants/api.route.constant";
import socketApi from "./SocketApiService";

export async function apiGetAllPlot(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: GET_ALL_PLOT,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiCreateBooking(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: CREATE_BOOKING,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiCreateCalculateFares(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: CALCULATE_FARES,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiGetCancelledBooking(params) {
    try {
        return ApiService.fetchData({
            url: CANCELLED_BOOKING,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export const getBookings = ({
    page = 1,
    limit = 10,
    search,
    status,
    sub_company,
    filter,
}) => {
    const params = { page, limit };

    if (search) params.search = search;
    if (status) params.status = status;
    if (sub_company) params.sub_company = sub_company;
    if (filter) params.filter = filter;

    return socketApi.get("/bookings", { params });
};

export const sendConfirmationEmail = (bookingId, dispatcherName) => {
    return socketApi.post(`/bookings/${bookingId}/send-confirmation-email`, {
        dispatcher_name: dispatcherName
    });
};

export const getDashboardCards = () => {
    return socketApi.get("/bookings/dashboard-cards");
};

const updateDriverRankViaSocket = (socket, payload) =>
    new Promise((resolve, reject) => {
        if (!socket?.connected) {
            reject(new Error("Socket not connected"));
            return;
        }

        const timeout = setTimeout(() => {
            socket.off("update-driver-rank-response", onResponse);
            reject(new Error("Rank update timed out"));
        }, 10000);

        function onResponse(response) {
            clearTimeout(timeout);
            socket.off("update-driver-rank-response", onResponse);
            if (response?.success) {
                resolve({ data: response });
                return;
            }
            reject(
                Object.assign(new Error(response?.message || "Failed to update driver rank"), {
                    response: { data: response },
                })
            );
        }

        socket.emit("update-driver-rank", payload);
        socket.once("update-driver-rank-response", onResponse);
    });

export const apiUpdateDriverRank = async (payload, socket = null) => {
    if (socket?.connected) {
        try {
            return await updateDriverRankViaSocket(socket, payload);
        } catch (err) {
            console.warn("Socket rank update failed, falling back to HTTP:", err.message);
        }
    }

    return socketApi.post("/update-driver-rank", payload);
};

export const updateBookingStatus = (bookingId, data, dispatcherName) => {
    return socketApi.put(`/bookings/${bookingId}/status`, {
        ...data,
        dispatcher_name: dispatcherName
    });
};

// export const followDriverTracking = (bookingId) => {
//     return socketApi.post(`/bookings/${bookingId}/follow-driver`);
// };

// export const assignDriverToBooking = (bookingId, driverId) => {
//     return socketApi.put(`/bookings/${bookingId}/assign-driver`, {
//         driver_id: driverId
//     });
// };

export const assignDriverToBooking = (bookingId, driverId, assignmentType = "allocate_driver", dispatcherName) => {
    return socketApi.put(`/bookings/${bookingId}/assign-driver`, {
        driver_id: driverId,
        assignment_type: assignmentType,
        dispatcher_name: dispatcherName,
    });
};

export const startAutoDispatch = (bookingId, dispatcherName) => {
    return socketApi.post(`/bookings/${bookingId}/start-auto-dispatch`, {
        dispatcher_name: dispatcherName
    });
};

export const recordDispatcherAction = (bookingId, action, dispatcherName) => {
    return socketApi.post(`/bookings/${bookingId}/record-action`, {
        action: action,
        dispatcher_name: dispatcherName
    });
};

export const setFollowOnJob = (job1Id, followOnBookingId, dispatcherName) => {
    return socketApi.post(`/bookings/${job1Id}/set-follow-on-job`, {
        follow_on_booking_id: followOnBookingId,
        dispatcher_name: dispatcherName,
    });
};

// export const removeFollowOnJob = (job1Id) => {
//     return socketApi.delete(`/bookings/${job1Id}/remove-follow-on-job`);
// };