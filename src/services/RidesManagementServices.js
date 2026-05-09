import { DELETE_BOOKING, GET_RIDE_MANAGEMENT } from "../constants/api.route.constant";
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

export async function apiDeleteRide(id) {
    return ApiService.fetchData({
        url: `${DELETE_BOOKING}?id=${id}`,
        method: METHOD_GET,
    });
}