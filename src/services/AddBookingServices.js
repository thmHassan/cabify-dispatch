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

export const sendConfirmationEmail = (bookingId) => {
    return socketApi.post(`/bookings/${bookingId}/send-confirmation-email`);
};

export const getDashboardCards = () => {
    return socketApi.get("/bookings/dashboard-cards");
};

export const updateBookingStatus = (bookingId, data) => {
    return socketApi.put(`/bookings/${bookingId}/status`, data);
};

export const followDriverTracking = (bookingId) => {
    return socketApi.post(`/bookings/${bookingId}/follow-driver`);
};

export const assignDriverToBooking = (bookingId, driverId) => {
    return socketApi.put(`/bookings/${bookingId}/assign-driver`, {
        driver_id: driverId
    });
};