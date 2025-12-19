import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import ApiService from "./ApiService";
import { CALCULATE_FARES, CANCELLED_BOOKING, CREATE_BOOKING, GET_ALL_PLOT } from "../constants/api.route.constant";

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
