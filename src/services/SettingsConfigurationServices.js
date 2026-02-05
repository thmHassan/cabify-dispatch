import { GATE_DISPATCH_SYSTEM, } from "../constants/api.route.constant";
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