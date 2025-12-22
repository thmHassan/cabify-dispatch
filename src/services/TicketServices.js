import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import ApiService from "./ApiService";
import {GET_TICKETS, CHANGE_TICKET_STATUS, REPLY_TICKET } from "../constants/api.route.constant";

export async function apiChangeTicketStatus(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: CHANGE_TICKET_STATUS,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiGetTicketList(params) {
    try {
        return ApiService.fetchData({
            url: GET_TICKETS,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export async function apiReplyTicket(data) {
    const isFormData = data instanceof FormData;
    return ApiService.fetchData({
        url: REPLY_TICKET,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

