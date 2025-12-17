import { SEND_NOTIFICATION } from "../constants/api.route.constant";
import { METHOD_POST } from "../constants/method.constant";
import ApiService from "./ApiService";

export async function apiSendNotifiction(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: SEND_NOTIFICATION,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}