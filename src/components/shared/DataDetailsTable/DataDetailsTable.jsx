import React from "react";
import DataDetailsRow from "./components/DataDetailsRow";
import EmptyState from "../EmptyState";

const DataDetailsTable = ({ rowType, companies, actionOptions, ...rest }) => {
  const hasData = Array.isArray(companies) && companies.length > 0;
  return (
    <div className="sm:pt-5 overflow-auto">
      {hasData ? (
        <table className="w-full border-collapse table-auto md:table">
          <tbody>
            {companies.map((data, i) => (
              <DataDetailsRow
                key={i}
                data={data}
                type={rowType}
                actionOptions={actionOptions}
                {...rest}
              />
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState
          title="No data found"
          description="There is nothing to display right now. Try adjusting filters or add a new item."
        />
      )}
    </div>
  );
};

export default DataDetailsTable;
