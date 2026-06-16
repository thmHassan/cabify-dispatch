const MapSearchBox = ({
    value,
    onChange,
    results = [],
    loading = false,
    error = "",
    showResults = false,
    onSelect,
    onClear,
}) => {
    return (
        <div className="relative w-full sm:w-[420px]">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Search places (hospital, airport, school...)"
                    className="w-full bg-transparent text-sm outline-none"
                />
                {value && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        Clear
                    </button>
                )}
            </div>

            {showResults && (
                <div className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {loading && <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>}
                    {!loading && error && <div className="px-3 py-2 text-sm text-red-600">{error}</div>}
                    {!loading && !error && results.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No locations found</div>
                    )}
                    {!loading && !error && results.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onSelect(item)}
                            className="w-full border-b border-gray-100 px-3 py-2 text-left hover:bg-gray-50 last:border-b-0"
                        >
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.label || item.layer || item.country || "Location"}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MapSearchBox;
