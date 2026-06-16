import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import ApiService from "./ApiService";
import { CALCULATE_FARES, CANCELLED_BOOKING, CREATE_BOOKING, EDIT_BOOKING, GET_ALL_PLOT, GET_RIDE_MANAGEMENT } from "../constants/api.route.constant";
import socketApi from "./SocketApiService";
import { getDispatcherId } from "../utils/auth";
import { getTenantId } from "../utils/functions/tokenEncryption";

const buildBookingParams = ({
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
    return params;
};

export const isApiSuccess = (data) =>
    data?.success === 1 || data?.success === true || data?.success === "1";

export const getApiErrorMessage = (error, fallback = "Request failed") => {
    const data = error?.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (error?.message) return error.message;
    return fallback;
};

const fetchBookingsFromLaravel = async ({
    page = 1,
    limit = 10,
    search,
    status,
    sub_company,
    filter,
}) => {
    const params = {
        page,
        perPage: limit,
        dispatcher_id: getDispatcherId(),
    };

    if (search) params.search = search;
    if (status) params.status = status;
    if (sub_company) params.sub_company = sub_company;
    if (filter) params.filter = filter;

    const res = await ApiService.fetchData({
        url: GET_RIDE_MANAGEMENT,
        method: METHOD_GET,
        params,
    });

    const rides = res?.data?.rides;

    return {
        data: {
            success: isApiSuccess(res?.data),
            data: rides?.data || [],
            pagination: {
                total_pages: rides?.last_page || 1,
                total: rides?.total || 0,
                current_page: rides?.current_page || page,
            },
        },
    };
};

const fetchDashboardCardsFromLaravel = async () => {
    const res = await ApiService.getDispatcherCards();
    const cards = res?.data?.data ?? res?.data ?? {};

    return {
        data: {
            success: res?.data?.success === 1 || res?.data?.success === true,
            data: cards,
        },
    };
};

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

export const getBookings = async (bookingParams) => {
    const params = buildBookingParams(bookingParams);

    try {
        const res = await socketApi.get("/bookings", { params });
        if (isApiSuccess(res?.data)) {
            const rows = res?.data?.data || [];
            if (rows.length > 0 || !bookingParams?.filter) {
                return res;
            }
        }
    } catch (err) {
        console.warn("Socket bookings API failed, falling back to Laravel:", err.message);
    }

    return fetchBookingsFromLaravel(bookingParams);
};

export const sendConfirmationEmail = (bookingId, dispatcherName) => {
    return socketApi.post(`/bookings/${bookingId}/send-confirmation-email`, {
        dispatcher_name: dispatcherName
    });
};

export const getDashboardCards = async () => {
    try {
        const res = await socketApi.get("/bookings/dashboard-cards");
        if (res?.data?.success) return res;
        throw new Error("Socket dashboard cards API returned unsuccessful response");
    } catch (err) {
        console.warn("Socket dashboard cards failed, falling back to Laravel:", err.message);
        return fetchDashboardCardsFromLaravel();
    }
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
            if (response?.success === 1 || response?.success === true) {
                resolve({ data: response });
                return;
            }
            reject(
                Object.assign(new Error(response?.message || "Failed to update driver rank"), {
                    response: { data: response },
                })
            );
        }

        const tenantId = getTenantId();
        socket.emit("update-driver-rank", {
            ...payload,
            ...(tenantId ? { database: tenantId } : {}),
        });
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

export const updateBooking = async (bookingId, data, dispatcherName) => {
    const formData = new FormData();
    formData.append("id", String(bookingId));
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    });
    if (dispatcherName) formData.append("dispatcher_name", dispatcherName);
    const dispatcherId = getDispatcherId();
    if (dispatcherId) formData.append("dispatcher_id", String(dispatcherId));

    try {
        const res = await ApiService.fetchData({
            url: EDIT_BOOKING,
            method: METHOD_POST,
            data: formData,
            headers: { "Content-Type": "multipart/form-data" },
        });
        if (isApiSuccess(res?.data)) return res;
        throw new Error(res?.data?.message || "Laravel booking update unsuccessful");
    } catch (err) {
        console.warn("Laravel booking update failed, falling back to socket API:", err.message);
    }

    const payload = { ...data, dispatcher_name: dispatcherName };
    return socketApi.put(`/bookings/${bookingId}`, payload);
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
    const numericBookingId = Number(bookingId);
    const numericDriverId = Number(driverId);

    return socketApi.put(`/bookings/${numericBookingId}/assign-driver`, {
        driver_id: numericDriverId,
        assignment_type: assignmentType,
        dispatcher_name: dispatcherName,
        dispatcher_id: getDispatcherId(),
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