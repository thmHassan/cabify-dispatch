import { CREATE_ACCOUNT, DELETE_ACCOUNT, GET_ACCOUNT, GET_ACCOUNT_BY_ID, UPDATE_ACCOUNT } from "../constants/api.route.constant";
import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import { replaceSlash } from "../utils/functions/common.function";
import ApiService from "./ApiService";

export async function apiCreateAccount(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: CREATE_ACCOUNT,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiGetAccount(params) {
    try {
        console.log("Making API call to:", GET_ACCOUNT, "with params:", params);
        return ApiService.fetchData({
            url: GET_ACCOUNT,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export async function apiGetAccountById(params) {
    return ApiService.fetchData({
        url: params
            ? replaceSlash(params, GET_ACCOUNT_BY_ID)
            : GET_ACCOUNT_BY_ID,
        method: METHOD_GET,
    });
}

export async function apiDeleteAccount(id) {
    return ApiService.fetchData({
        url: `${DELETE_ACCOUNT}?id=${id}`,
        method: METHOD_GET,
    });
}

export async function apiEditAccount(data) {
    const isFormData = data instanceof FormData;
    let accountId = null;

    if (isFormData) {
        accountId = data.get('id');
    }

    return ApiService.fetchData({
        url: accountId ? `${UPDATE_ACCOUNT}?id=${accountId}` : UPDATE_ACCOUNT,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}
