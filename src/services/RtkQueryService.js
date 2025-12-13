import { createApi } from "@reduxjs/toolkit/query/react"
import BaseService from "./BaseService"

const axiosBaseQuery = () => async (request) => {
    try {
        const response = BaseService(request)
        return response
    } catch (err) {
        return {
            error: {
                status: err.response?.status,
                data: err.response?.data || err.message,
            },
        }
    }
}

const RtkQueryService = createApi({
    reducerPath: 'rtkApi',
    baseQuery: axiosBaseQuery(),
    endpoints: () => ({}),
})

export default RtkQueryService