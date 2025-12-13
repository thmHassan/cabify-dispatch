import { GET_LOST_FOUND_LIST } from "../constants/api.route.constant";
import { METHOD_GET } from "../constants/method.constant";
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