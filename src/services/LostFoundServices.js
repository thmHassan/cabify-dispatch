import { CHANGE_STATUS_LOST_FOUND, GET_LOST_FOUND_LIST } from "../constants/api.route.constant";
import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import ApiService from "./ApiService";

export async function apiGetLostFoundList(params) {
    try {
        return ApiService.fetchData({
            url: GET_LOST_FOUND_LIST,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export async function apiChangeLostFoundStatus(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: CHANGE_STATUS_LOST_FOUND,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}