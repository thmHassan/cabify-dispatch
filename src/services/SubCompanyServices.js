import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import { replaceSlash } from "../utils/functions/common.function";
import ApiService from "./ApiService";
import { CREATE_SUB_COMPANY, EDIT_SUB_COMPANY, GET_SUB_COMPANY_BY_ID, GET_SUB_COMPANY_LIST, DELETE_SUB_COMPANY } from "../constants/api.route.constant";

export async function apiCreateSubCompany(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: CREATE_SUB_COMPANY,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiGetSubCompany(params) {
    try {
        console.log("Making API call to:", GET_SUB_COMPANY_LIST, "with params:", params);
        return ApiService.fetchData({
            url: GET_SUB_COMPANY_LIST,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export async function apiGetSubCompanyById(params) {
    return ApiService.fetchData({
        url: params
            ? replaceSlash(params, GET_SUB_COMPANY_BY_ID)
            : GET_SUB_COMPANY_BY_ID,
        method: METHOD_GET,
    });
}

export async function apiDeleteSubCompany(id) {
    return ApiService.fetchData({
        url: `${DELETE_SUB_COMPANY}?id=${id}`,
        method: METHOD_GET,
    });
}

export async function apiEditSubCompany(data) {
    const isFormData = data instanceof FormData;
    let plotId = null;
    
    if (isFormData) {
        plotId = data.get('id');
    }

    return ApiService.fetchData({
        url: plotId ? `${EDIT_SUB_COMPANY}?id=${plotId}` : EDIT,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}
