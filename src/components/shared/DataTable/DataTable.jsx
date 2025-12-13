/* eslint-disable react-hooks/rules-of-hooks */
import {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
  useState,
  useMemo,
} from "react";
import classNames from "classnames";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import Table from "../../ui/Table";
// import Pagination from '../../ui/Pagination'
// import Select from '../../ui/Select'
import Checkbox from "../../ui/Checkbox";
import TableRowSkeleton from "../loaders/TableRowSkeleton";
import Loading from "../Loading/Loading";
import Pagination from "../../ui/Pagination";
import { PAGE_SIZE_OPTIONS } from "../../../constants/selectOptions";

const { Tr, Th, Td, THead, TBody, Sorter } = Table;

const IndeterminateCheckbox = (props) => {
  const {
    indeterminate,
    onChange,
    onCheckBoxChange,
    onIndeterminateCheckBoxChange,
    ...rest
  } = props;

  const ref = useRef(null);

  useEffect(() => {
    if (typeof indeterminate === "boolean" && ref.current) {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, indeterminate]);

  const handleChange = (e) => {
    onChange(e);
    onCheckBoxChange?.(e);
    onIndeterminateCheckBoxChange?.(e);
  };

  return (
    <Checkbox
      ref={ref}
      className="mb-0"
      onChange={(_, e) => handleChange(e)}
      {...rest}
    />
  );
};

function _DataTable(props, ref) {
  const {
    skeletonAvatarColumns,
    columns: columnsProp = [],
    paginationVariant,
    data = [],
    loading = false,
    onCheckBoxChange,
    onIndeterminateCheckBoxChange,
    // onPaginationChange,
    // onSelectChange,
    onSort,
    // pageSizes = [10, 25, 50, 100],
    selectable = false,
    skeletonAvatarProps,
    pagingData = {
      total: 0,
      pageIndex: 1,
      pageSize: 10,
    },
  } = props;

  //   const { pageSize, pageIndex, total } = pagingData;
  const { pageSize } = pagingData;

  const [sorting, setSorting] = useState(null);

  // const pageSizeOption = useMemo(
  //     () =>
  //         pageSizes.map((number) => ({
  //             value: number,
  //             label: `${number} / page`,
  //         })),
  //     [pageSizes]
  // )

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalItems = 25;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  //   const handleSearchChange = (value) => {
  //     setSearchQuery(value);
  //   };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleCheckBoxChange = (checked, row) => {
    if (!loading) {
      onCheckBoxChange?.(checked, row);
    }
  };

  const handleIndeterminateCheckBoxChange = (checked, rows) => {
    if (!loading) {
      onIndeterminateCheckBoxChange?.(checked, rows);
    }
  };

  //   const handlePaginationChange = (page) => {
  //     if (!loading) {
  //       onPaginationChange?.(page);
  //     }
  //   };

  // const handleSelectChange = (value?: number) => {
  //     if (!loading) {
  //         onSelectChange?.(Number(value))
  //     }
  // }

  useEffect(() => {
    if (Array.isArray(sorting)) {
      const sortOrder =
        sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : "";
      const id = sorting.length > 0 ? sorting[0].id : "";
      onSort?.({ order: sortOrder, key: id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting]);

  const finalColumns = useMemo(() => {
    const columns = columnsProp;

    if (selectable) {
      return [
        {
          id: "select",
          header: ({ table }) => (
            <IndeterminateCheckbox
              checked={table.getIsAllRowsSelected()}
              indeterminate={table.getIsSomeRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
              onIndeterminateCheckBoxChange={(e) => {
                handleIndeterminateCheckBoxChange(
                  e.target.checked,
                  table.getRowModel().rows
                );
              }}
            />
          ),
          cell: ({ row }) => (
            <IndeterminateCheckbox
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              indeterminate={row.getIsSomeSelected()}
              onChange={row.getToggleSelectedHandler()}
              onCheckBoxChange={(e) =>
                handleCheckBoxChange(e.target.checked, row.original)
              }
            />
          ),
        },
        ...columns,
      ];
    }
    return columns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsProp, selectable]);

  const table = useReactTable({
    paginationVariant,
    data,
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    onSortingChange: (sorter) => {
      setSorting(sorter);
    },
    state: {
      sorting: sorting,
    },
  });

  const resetSorting = () => {
    table.resetSorting();
  };

  const resetSelected = () => {
    table.toggleAllRowsSelected(false);
  };

  useImperativeHandle(ref, () => ({
    resetSorting,
    resetSelected,
  }));

  return (
    <Loading loading={loading && data.length !== 0} type="cover">
      <div>
        <Table>
          <THead>
            {table.getHeaderGroups().map((headerGroup) => {
              return (
                <Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <Th key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : (
                          <div
                            className={classNames(
                              header.column.getCanSort() &&
                                "cursor-pointer select-none point",
                              loading && "pointer-events-none",
                              header.column.columnDef.className
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getCanSort() && onSort && (
                              <Sorter sort={header.column.getIsSorted()} />
                            )}
                          </div>
                        )}
                      </Th>
                    );
                  })}
                </Tr>
              );
            })}
          </THead>
          {loading && data.length === 0 ? (
            <TableRowSkeleton
              columns={finalColumns.length}
              rows={pagingData.pageSize}
              avatarInColumns={skeletonAvatarColumns}
              avatarProps={skeletonAvatarProps}
            />
          ) : (
            <TBody>
              {table
                .getRowModel()
                .rows.slice(0, pageSize)
                .map((row) => {
                  return (
                    <Tr key={row.id}>
                      {row.getVisibleCells().map((cell) => {
                        return (
                          <Td key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </Td>
                        );
                      })}
                    </Tr>
                  );
                })}
            </TBody>
          )}
        </Table>
      </div>
      <div className="border-t border-[#E9E9E9] pt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          itemsPerPageOptions={PAGE_SIZE_OPTIONS}
          variant={paginationVariant}
        />
      </div>
    </Loading>
  );
}

const DataTable = forwardRef(_DataTable);

export default DataTable;
