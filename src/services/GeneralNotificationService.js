import { SEND_NOTIFICATION } from "../constants/api.route.constant";
import { METHOD_POST } from "../constants/method.constant";
import ApiService from "./ApiService";

export async function apiSendNotifiction(data) {
    return ApiService.fetchData({
        url: SEND_NOTIFICATION,
        method: METHOD_POST,
        data,
    });
}