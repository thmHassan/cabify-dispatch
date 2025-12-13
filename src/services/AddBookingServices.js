import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import { replaceSlash } from "../utils/functions/common.function";
import ApiService from "./ApiService";
// import { CANCELLED_BOOKING, GET_ALL_PLOT } from "../constants/api.route.constant";

// export async function apiGetAllPlot(data) {
//     const isFormData = data instanceof FormData;

//     return ApiService.fetchData({
//         url: GET_ALL_PLOT,
//         method: METHOD_POST,
//         data,
//         ...(isFormData && {
//             headers: {
//                 'Content-Type': 'multipart/form-data',
//             },
//         }),
//     });
// }

// export async function apiGetCancelledBooking(params) {
//     try {
//         return ApiService.fetchData({
//             url: CANCELLED_BOOKING,
//             method: METHOD_GET,
//             params,
//         });
//     } catch (error) {
//         console.log("Error in API call:", error);
//         throw error;
//     }
// }

// export async function apiGetSubCompany(params) {
//     try {
//         console.log("Making API call to:", GET_SUB_COMPANY_LIST, "with params:", params);
//         return ApiService.fetchData({
//             url: GET_SUB_COMPANY_LIST,
//             method: METHOD_GET,
//             params,
//         });
//     } catch (error) {
//         console.log("Error in API call:", error);
//         throw error;
//     }
// }

// export async function apiGetSubCompanyById(params) {
//     return ApiService.fetchData({
//         url: params
//             ? replaceSlash(params, GET_SUB_COMPANY_BY_ID)
//             : GET_SUB_COMPANY_BY_ID,
//         method: METHOD_GET,
//     });
// }

// export async function apiDeleteSubCompany(id) {
//     return ApiService.fetchData({
//         url: `${DELETE_SUB_COMPANY}?id=${id}`,
//         method: METHOD_GET,
//     });
// }

// export async function apiEditSubCompany(data) {
//     const isFormData = data instanceof FormData;
//     let plotId = null;
    
//     if (isFormData) {
//         plotId = data.get('id');
//     }

//     return ApiService.fetchData({
//         url: plotId ? `${EDIT_SUB_COMPANY}?id=${plotId}` : EDIT,
//         method: METHOD_POST,
//         data,
//         ...(isFormData && {
//             headers: {
//                 'Content-Type': 'multipart/form-data',
//             },
//         }),
//     });
// }
