import { useEffect, useState } from "react";
import {
    formatCompanyClock,
    getCompanyNow,
    getCompanyTimezone,
} from "../../../utils/functions/appDateTime";
import { useCompanyDateTime } from "../../../contexts/CompanyDateTimeContext";

const CompanyTimezoneClock = ({ className = "" }) => {
    const { timezone, ready } = useCompanyDateTime();
    const [now, setNow] = useState(() => getCompanyNow());
    const displayTimezone = ready ? timezone : getCompanyTimezone();

    useEffect(() => {
        const interval = setInterval(() => setNow(getCompanyNow()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!displayTimezone) return null;

    return (
        <p className={`text-[11px] leading-4 font-medium text-[#6B7280] ${className}`}>
            <span>{formatCompanyClock(now)}</span>
            <span className="mx-1.5 text-[#9CA3AF]">·</span>
            <span className="text-[#9CA3AF]">{displayTimezone}</span>
        </p>
    );
};

export default CompanyTimezoneClock;
