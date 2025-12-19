import { GET_VEHICLE_TYPES, CREATE_VEHICLE_TYPE, EDIT_VEHICLE_TYPE, DELETE_VEHICLE_TYPE, GET_VEHICLE_TYPE_BY_ID, ALL_VEHICLE_TYPE } from "../constants/api.route.constant";
import { METHOD_GET, METHOD_POST } from "../constants/method.constant";
import ApiService from "./ApiService";

export async function apiGetVehicleTypes(params) {
    try {
        console.log("Making API call to:", GET_VEHICLE_TYPES, "with params:", params);
        return ApiService.fetchData({
            url: GET_VEHICLE_TYPES,
            method: METHOD_GET,
            params,
        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export async function apiGetVehicleTypeById(params) {
    const id = params?.id;
    return ApiService.fetchData({
        url: id ? `${GET_VEHICLE_TYPE_BY_ID}?id=${id}` : GET_VEHICLE_TYPE_BY_ID,
        method: METHOD_GET,
    });
}

export async function apiCreateVehicleType(data) {
    return ApiService.fetchData({
        url: CREATE_VEHICLE_TYPE,
        method: METHOD_POST,
        data,
    });
}

export async function apiEditVehicleType(data) {
    const isFormData = data instanceof FormData;
    let vehicleTypeId = null;

    if (isFormData) {
        vehicleTypeId = data.get('id');
    } else if (data && typeof data === 'object' && data.id) {
        vehicleTypeId = data.id;
    }

    return ApiService.fetchData({
        url: vehicleTypeId ? `${EDIT_VEHICLE_TYPE}?id=${vehicleTypeId}` : EDIT_VEHICLE_TYPE,
        method: METHOD_POST,
        data,
    });
}

export async function apiDeleteVehicleType(id) {
    return ApiService.fetchData({
        url: `${DELETE_VEHICLE_TYPE}?id=${id}`,
        method: METHOD_GET,
    });
}

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