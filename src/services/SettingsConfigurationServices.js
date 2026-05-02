import { GATE_DISPATCH_SYSTEM, GET_COMPANY_API_KEYS } from "../constants/api.route.constant";
import { METHOD_GET } from "../constants/method.constant";
import ApiService from "./ApiService";

export async function apiGetDispatchSystem() {
    try {
        return ApiService.fetchData({
            url: GATE_DISPATCH_SYSTEM,
            method: METHOD_GET,

        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export async function apiGetCompanyApiKeys() {
    try {
        return ApiService.fetchData({
            url: GET_COMPANY_API_KEYS,
            method: METHOD_GET,
        });
    } catch (error) {
        console.log("Error in apiGetCompanyApiKeys API call:", error);
        throw error;
    }
}