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

export const updateBookingStatus = (bookingId, data, dispatcherName) => {
    return socketApi.put(`/bookings/${bookingId}/status`, {
        ...data,
        dispatcher_name: dispatcherName
    });
};

export const followDriverTracking = (bookingId) => {
    return socketApi.post(`/bookings/${bookingId}/follow-driver`);
};

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

export const removeFollowOnJob = (job1Id) => {
    return socketApi.delete(`/bookings/${job1Id}/remove-follow-on-job`);
};