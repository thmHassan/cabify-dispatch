const EmptyState = ({
  title = "No data found",
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div className={`flex items-center justify-center min-h-[40vh] w-full ${className}`}>
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#EEEEEE] flex items-center justify-center">
          <span className="text-[#1F41BB] text-xl font-bold">i</span>
        </div>
        <div className="text-[18px] leading-[25px] font-semibold text-[#252525]">{title}</div>
        {description ? (
          <div className="text-sm text-[#6C6C6C]">{description}</div>
        ) : null}
        {typeof onAction === "function" && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 inline-flex items-center rounded-lg bg-[#1F41BB] px-5 py-2 text-white hover:bg-[#1a38a6] transition-colors shadow-[-4px_4px_6px_0px_#0000001F]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default EmptyState;


