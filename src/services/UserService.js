import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import { replaceSlash } from "../utils/functions/common.function";
import ApiService from "./ApiService";
import { CREATE_USER, DELETE_USER, EDIT_USER, GET_USER_BY_ID, GET_USER_LIST, POST_EDIT_USER_STATUS, RIDE_HISTORY } from "../constants/api.route.constant";

export async function apiCreateUser(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: CREATE_USER,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiGetUser(params) {
    try {
        return ApiService.fetchData({
            url: params ? replaceSlash(params, GET_USER_LIST) : GET_USER_LIST,
            method: METHOD_GET,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export async function apiGetUserById(params) {
    return ApiService.fetchData({
        url: params
            ? replaceSlash(params, GET_USER_BY_ID)
            : GET_USER_BY_ID,
        method: METHOD_GET,
    });
}

export async function apiEditUserStatus(params) {
    return ApiService.fetchData({
        url: POST_EDIT_USER_STATUS,
        method: METHOD_GET,
        params, 
    });
}

export async function apiEditUser(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: EDIT_USER,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiDeleteUser(id) {
    return ApiService.fetchData({
        url: `${DELETE_USER}?id=${id}`,
        method: METHOD_GET,
    });
}

export async function apiGetRideHistory(id) {
    return ApiService.fetchData({
        url: `${RIDE_HISTORY}?user_id=${id}`,
        method: METHOD_GET,
    });
}