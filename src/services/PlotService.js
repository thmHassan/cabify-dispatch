import { method } from "lodash";
import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import { replaceSlash } from "../utils/functions/common.function";
import ApiService from "./ApiService";
import { ASSIGN_BACKUP_PLOT, CREATE_PLOT, DELETE_PLOT, EDIT_PLOT, GET_BACKUP_PLOT, GET_PLOT_BY_ID, GET_PLOTS, MANAGE_PLOT } from "../constants/api.route.constant";

export async function apiCreatePlot(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: CREATE_PLOT,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiGetPlot(params) {
    try {
        console.log("Making API call to:", GET_PLOTS, "with params:", params);
        return ApiService.fetchData({
            url: GET_PLOTS,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export async function apiGetPlotById(params) {
    return ApiService.fetchData({
        url: params
            ? replaceSlash(params, GET_PLOT_BY_ID)
            : GET_PLOT_BY_ID,
        method: METHOD_GET,
    });
}

export async function apiDeletePlot(id) {
    return ApiService.fetchData({
        url: `${DELETE_PLOT}?id=${id}`,
        method: METHOD_GET,
    });
}

export async function apiEditPlot(data) {
    const isFormData = data instanceof FormData;
    let plotId = null;

    if (isFormData) {
        plotId = data.get('id');
    }

    return ApiService.fetchData({
        url: plotId ? `${EDIT_PLOT}?id=${plotId}` : EDIT_PLOT,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiGetManagePlot(params) {
    try {
        return ApiService.fetchData({
            url: MANAGE_PLOT,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export async function apiAssignBackupPlot(data) {
    const isFormData = data instanceof FormData;
    return ApiService.fetchData({
        url: ASSIGN_BACKUP_PLOT,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiGetBackupPlot(params) {
    try {
        return ApiService.fetchData({
            url: GET_BACKUP_PLOT,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}