import {
    GATE_DISPATCH_SYSTEM,
    GET_COMPANY_API_KEYS,
    GET_COMPANY_PROFILE,
    GET_MAP_INFORMATION,
    GET_MAPIFY_TILES_BRIGHT,
    GET_THIRD_PARTY_INFORMATION,
    SUPER_ADMIN_EDIT_COMPANY,
} from "../constants/api.route.constant";
import { METHOD_GET } from "../constants/method.constant";
import ApiService from "./ApiService";
import { getTenantDatabaseRequestParams } from "../utils/functions/tokenEncryption";

export async function apiGetDispatchSystem() {
    try {
        return ApiService.fetchData({
            url: GATE_DISPATCH_SYSTEM,
            method: METHOD_GET,

        });
    } catch (error) {
        console.log("Error in API call:", error);
        throw error;
    }
}

export async function apiGetCompanyProfile() {
    try {
        return ApiService.fetchData({
            url: GET_COMPANY_PROFILE,
            method: METHOD_GET,
            params: getTenantDatabaseRequestParams(),
        });
    } catch (error) {
        console.log("Error in apiGetCompanyProfile API call:", error);
        throw error;
    }
}

export async function apiGetSuperAdminEditCompany(companyId) {
    try {
        return ApiService.fetchData({
            url: SUPER_ADMIN_EDIT_COMPANY,
            method: METHOD_GET,
            params: {
                id: companyId,
                ...getTenantDatabaseRequestParams(),
            },
        });
    } catch (error) {
        console.log("Error in apiGetSuperAdminEditCompany API call:", error);
        throw error;
    }
}

export async function apiGetCompanyApiKeys() {
    try {
        return ApiService.fetchData({
            url: GET_COMPANY_API_KEYS,
            method: METHOD_GET,
        });
    } catch (error) {
        console.log("Error in apiGetCompanyApiKeys API call:", error);
        throw error;
    }
}

export async function apiGetThirdPartyInformation() {
    try {
        return ApiService.fetchData({
            url: GET_THIRD_PARTY_INFORMATION,
            method: METHOD_GET,
        });
    } catch (error) {
        console.log("Error in apiGetThirdPartyInformation API call:", error);
        throw error;
    }
}

export async function apiGetMapInformation() {
    try {
        return ApiService.fetchData({
            url: GET_MAP_INFORMATION,
            method: METHOD_GET,
        });
    } catch (error) {
        console.log("Error in apiGetMapInformation API call:", error);
        throw error;
    }
}

export async function apiGetMapifyBrightStyle() {
    try {
        return ApiService.fetchData({
            url: GET_MAPIFY_TILES_BRIGHT,
            method: METHOD_GET,
        });
    } catch (error) {
        console.log("Error in apiGetMapifyBrightStyle API call:", error);
        throw error;
    }
}