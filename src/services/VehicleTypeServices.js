import { ALL_VEHICLE_TYPE } from "../constants/api.route.constant";
import { METHOD_GET } from "../constants/method.constant";
import ApiService from "./ApiService";

export async function apiGetAllVehicleType(params) {
    try {
        return ApiService.fetchData({
            url: ALL_VEHICLE_TYPE,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}