import { method } from "lodash";
import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import { replaceSlash } from "../utils/functions/common.function";
import ApiService from "./ApiService";
import { CREATE_DRIVER, DELETE_DRIVER, DRIVER_DOCUMENT_LIST, EDIT_DRIVER, GET_BY_ID_DRIVER_DOCUMENT, GET_DRIVER_BY_ID, GET_DRIVERS_MANAGEMENT } from "../constants/api.route.constant";

export async function apiCreateDriveManagement(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: CREATE_DRIVER,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiGetDriverManagement(params) {
    try {
        return ApiService.fetchData({
            url: GET_DRIVERS_MANAGEMENT,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error fetching drivers:", error);
        throw error;
    }
}

export async function apiGetDriverManagementById(params) {
    return ApiService.fetchData({
        url: params
            ? replaceSlash(params, GET_DRIVER_BY_ID)
            : GET_DRIVER_BY_ID,
        method: METHOD_GET,
    });
}

export async function apiEditDriverManagement(data) {
    const isFormData = data instanceof FormData;

    return ApiService.fetchData({
        url: EDIT_DRIVER,
        method: METHOD_POST,
        data,
        ...(isFormData && {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
    });
}

export async function apiDeleteDriverManagement(id) {
    return ApiService.fetchData({
        url: `${DELETE_DRIVER}?id=${id}`,
        method: METHOD_GET,
    });
}

// export async function apiAddWalletBalance(data) {
//     const isFormData = data instanceof FormData;

//     return ApiService.fetchData({
//         url: ADD_WALLET_BALANCE,
//         method: METHOD_POST,
//         data,
//         ...(isFormData && {
//             headers: {
//                 'Content-Type': 'multipart/form-data',
//             },
//         }),
//     });
// }

// export async function apieditDriverStatus(params) {
//     return ApiService.fetchData({
//         url: POST_EDIT_DRIVER_STATUS,
//         method: METHOD_GET,
//         params: params, 
//     });
// }

export async function apiGetDriverDocumentList(params) {
    try {
        return ApiService.fetchData({
            url: DRIVER_DOCUMENT_LIST,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error fetching drivers:", error);
        throw error;
    }
}

export async function apiGetDriverDocumentById(params) {
    return ApiService.fetchData({
        url: GET_BY_ID_DRIVER_DOCUMENT,
        method: METHOD_GET,
        params,
    });
}

// export async function apiChangeDriverDocument(data) {
//     const isFormData = data instanceof FormData;
    
//     try {
//         return ApiService.fetchData({
//             url: CHANGE_DRIVER_DOCUMENT_STATUS,
//             method: METHOD_POST,
//             data,
//             ...(isFormData && {
//                 headers: {
//                     'Content-Type': 'multipart/form-data',
//                 },
//             }),
//         });
//     } catch (error) {
//         console.log("Error changing driver document status:", error);
//         throw error;
//     }
// }

// export async function apiDeleteDriverDocument(id) {
//     return ApiService.fetchData({
//         url: `${DELETE_DRIVER_DOCUMENT}?id=${id}`,
//         method: METHOD_GET,
//     });
// }

// export async function apiApproveVehicle(data) {
//     const isFormData = data instanceof FormData;

//     return ApiService.fetchData({
//         url: APPROVE_VEHICLE,
//         method: METHOD_POST,
//         data,
//         ...(isFormData && {
//             headers: {
//                 'Content-Type': 'multipart/form-data',
//             },
//         }),
//     });
// }

// export async function apiRejectVehicle(data) {
//     const isFormData = data instanceof FormData;

//     return ApiService.fetchData({
//         url: REJECT_VAHICLE,
//         method: METHOD_POST,
//         data,
//         ...(isFormData && {
//             headers: {
//                 'Content-Type': 'multipart/form-data',
//             },
//         }),
//     });
// }

// export async function apiGetDriverRideHistory(id) {
//     return ApiService.fetchData({
//         url: `${DRIVER_RIDE_HISTORY}?driver_id=${id}`,
//         method: METHOD_GET,
//     });
// }