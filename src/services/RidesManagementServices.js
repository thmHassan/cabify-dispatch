import { GET_RIDE_MANAGEMENT } from "../constants/api.route.constant";
import { METHOD_GET } from "../constants/method.constant";
import ApiService from "./ApiService";

export async function apiGetRidesManagement(params) {
    try {
        return ApiService.fetchData({
            url: GET_RIDE_MANAGEMENT,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}