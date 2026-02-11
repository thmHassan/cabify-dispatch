export const ROUTE_FEATURE_MAP = {
    "accounts": "accounts",
    "map": "map",
    "manage-zones": "manage_zones",
    "plots": "zone",
    "lost-found": "lost_found",
    "dispatcher": "dispatcher",
    "sub-company": "sub_company",
    "revenue-statements": "revenue_statements",
    "general-notification": "push_notification", 
};

/**
 * Checks if a feature is enabled (supports both "enable"/"disable" and "yes"/"no" formats)
 * @param {string} value - The feature flag value from tenant data
 * @returns {boolean} True if feature is enabled
 */
const isFeatureEnabled = (value) => {
    return value === "enable" || value === "yes";
};

/**
 * Filters navigation items based on tenant feature flags
 * @param {Array} navElements - Navigation elements array from NAV_ELEMENTS
 * @param {Object} tenantData - Tenant data from getTenantData()
 * @returns {Array} Filtered navigation elements
 */
export const filterNavByTenantFeatures = (navElements, tenantData) => {
    if (!tenantData) return navElements;

    return navElements.map(({ title, routes }) => ({
        title,
        routes: routes.filter((route) => {
            // Get the feature flag name from the route key
            const featureFlagName = ROUTE_FEATURE_MAP[route.key];

            // If route has no feature mapping, show it by default (always visible)
            if (!featureFlagName) return true;

            // Show route only if feature is enabled in tenant data (supports both formats)
            return isFeatureEnabled(tenantData[featureFlagName]);
        }),
    }));
};