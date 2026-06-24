import { useEffect } from "react";
import { useAppSelector } from "../../store";
import {
    checkCompanyStatusFromApi,
    COMPANY_STATUS_POLL_MS,
} from "../../utils/auth/forcedLogout";
import { isAuthenticated, resolveTenantDatabaseId } from "../../utils/functions/tokenEncryption";

const CompanyInactiveGuard = ({ children }) => {
    const signedIn = useAppSelector((state) => state.auth.session.signedIn);

    useEffect(() => {
        const shouldMonitor = Boolean(
            signedIn && isAuthenticated() && resolveTenantDatabaseId()
        );

        if (!shouldMonitor) return undefined;

        checkCompanyStatusFromApi();

        const intervalId = window.setInterval(
            checkCompanyStatusFromApi,
            COMPANY_STATUS_POLL_MS
        );

        const handleRefresh = () => {
            if (document.visibilityState === "visible") {
                checkCompanyStatusFromApi();
            }
        };

        window.addEventListener("focus", checkCompanyStatusFromApi);
        document.addEventListener("visibilitychange", handleRefresh);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", checkCompanyStatusFromApi);
            document.removeEventListener("visibilitychange", handleRefresh);
        };
    }, [signedIn]);

    return children;
};

export default CompanyInactiveGuard;
