import { METHOD_GET } from "../constants/method.constant";
import ApiService from "./ApiService";
import { GET_SUB_COMPANY_LIST } from "../constants/api.route.constant";

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

