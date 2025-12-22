import { GET_ACCOUNT} from "../constants/api.route.constant";
import { METHOD_GET } from "../constants/method.constant";
import ApiService from "./ApiService";

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
