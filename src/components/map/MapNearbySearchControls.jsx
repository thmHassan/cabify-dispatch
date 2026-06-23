export const MAP_SEARCH_BOUNDARY_COUNTRIES = [
    { value: "PK", label: "Pakistan" },
    { value: "ARE", label: "United Arab Emirates" },
    { value: "AE", label: "United Arab Emirates" },
    { value: "BD", label: "Bangladesh" },
    { value: "IN", label: "India" },
    { value: "GB", label: "United Kingdom" },
    { value: "SA", label: "Saudi Arabia" },
    { value: "QA", label: "Qatar" },
    { value: "OM", label: "Oman" },
    { value: "KW", label: "Kuwait" },
    { value: "BH", label: "Bahrain" },
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "AU", label: "Australia" },
    { value: "MY", label: "Malaysia" },
    { value: "SG", label: "Singapore" },
];

const GOOGLE_COUNTRY_ALIASES = {
    ARE: "ae",
    UAE: "ae",
};

export const toGoogleCountryCode = (code) => {
    const normalized = String(code ?? "").trim().toUpperCase();
    if (!normalized) return "";
    if (GOOGLE_COUNTRY_ALIASES[normalized]) {
        return GOOGLE_COUNTRY_ALIASES[normalized];
    }
    if (normalized.length === 2) {
        return normalized.toLowerCase();
    }
    return normalized.slice(0, 2).toLowerCase();
};

const resolveCountryOption = (code) => {
    const normalized = String(code ?? "").trim().toUpperCase();
    if (!normalized) return null;
    return MAP_SEARCH_BOUNDARY_COUNTRIES.find((item) => item.value === normalized)
        || { value: normalized, label: normalized };
};

const MapNearbySearchControls = ({
    nearbySearch = false,
    boundaryCountry = "",
    onNearbySearchChange,
    onBoundaryCountryChange,
    className = "",
    compact = false,
    disabled = false,
    loading = false,
}) => {
    const selectedCountry = resolveCountryOption(boundaryCountry);
    const countryOptions = selectedCountry
        && !MAP_SEARCH_BOUNDARY_COUNTRIES.some((item) => item.value === selectedCountry.value)
        ? [selectedCountry, ...MAP_SEARCH_BOUNDARY_COUNTRIES]
        : MAP_SEARCH_BOUNDARY_COUNTRIES;

    if (loading) {
        return (
            <div className={`flex items-center gap-2.5 py-1 ${className}`}>
                <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#D1D5DB] border-t-[#1F41BB]"
                    aria-hidden
                />
                <span className="text-xs text-[#6B7280]">Loading nearby search preferences...</span>
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
            <label className="flex items-center gap-2 text-xs text-[#374151] select-none">
                <input
                    type="checkbox"
                    checked={nearbySearch}
                    disabled={disabled}
                    onChange={(event) => onNearbySearchChange?.(event)}
                    className="rounded border-[#D1D5DB] disabled:opacity-50"
                />
                <span className="font-medium">Nearby search</span>
            </label>

            {nearbySearch ? (
                <span className="text-xs text-[#6B7280]">
                      
                </span>
            ) : (
                <div className={`flex items-center gap-2 ${compact ? "w-full sm:w-auto" : "w-full sm:min-w-[220px]"}`}>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] whitespace-nowrap">
                        Country
                    </label>
                    <select
                        value={selectedCountry?.value || ""}
                        disabled={disabled}
                        onChange={(event) => onBoundaryCountryChange?.(event)}
                        className="min-w-[160px] flex-1 rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-xs text-[#111827] shadow-sm outline-none focus:border-[#1F41BB] focus:ring-2 focus:ring-[#1F41BB]/20 disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                    >
                        <option value="">Global (all countries)</option>
                        {countryOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label} ({item.value})
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

export default MapNearbySearchControls;
