const FIELD_LABELS = {
    pickup: "Pickup",
    destination: "Destination",
};

const LocationSearchSidebar = ({
    field,
    query,
    results = [],
    loading = false,
    error = "",
    nearbySearch = false,
    boundaryCountry = null,
    onClose,
    onSelect,
}) => {
    const fieldLabel = FIELD_LABELS[field] || "Location";
    const scopeHint = nearbySearch
        ? boundaryCountry
            ? `Showing results in ${boundaryCountry} (from your current location).`
            : "Showing results in your country (from your current location)."
        : boundaryCountry
            ? `Showing results in ${boundaryCountry}.`
            : "Showing global results.";

    return (
        <aside className="w-full lg:w-[280px] xl:w-[300px] shrink-0 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col max-h-[min(70vh,520px)] lg:sticky lg:top-2">
            <div className="flex items-start justify-between gap-2 border-b border-[#F3F4F6] px-3 py-2.5">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#111827]">{fieldLabel} search</h3>
                    {query ? (
                        <p className="mt-0.5 truncate text-xs text-[#6B7280]">&ldquo;{query}&rdquo;</p>
                    ) : null}
                    <p className="mt-1 text-[10px] leading-snug text-[#9CA3AF]">{scopeHint}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-md p-1 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                    aria-label="Close search results"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[120px]">
                {loading && (
                    <div className="flex items-center gap-2 px-3 py-4 text-sm text-[#6B7280]">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#D1D5DB] border-t-[#1F41BB]" />
                        Searching...
                    </div>
                )}
                {!loading && error && (
                    <p className="px-3 py-4 text-sm text-[#DC2626]">{error}</p>
                )}
                {!loading && !error && results.length === 0 && (
                    <p className="px-3 py-4 text-sm text-[#6B7280]">No locations found.</p>
                )}
                {!loading && !error && results.length > 0 && (
                    <ul className="divide-y divide-[#F3F4F6]">
                        {results.map((item, idx) => (
                            <li key={item.id || `${item.label}-${idx}`}>
                                <button
                                    type="button"
                                    onClick={() => onSelect?.(item)}
                                    className="w-full px-3 py-2.5 text-left hover:bg-[#F9FAFB] transition-colors"
                                >
                                    <div className="text-sm font-medium text-[#111827]">{item.label}</div>
                                    {item.subtitle ? (
                                        <div className="mt-0.5 text-xs text-[#6B7280] line-clamp-2">{item.subtitle}</div>
                                    ) : null}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </aside>
    );
};

export default LocationSearchSidebar;
