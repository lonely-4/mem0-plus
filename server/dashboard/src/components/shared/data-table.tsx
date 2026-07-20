import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface Column<T> {
  key: keyof T;
  label: string;
  icon?: LucideIcon;
  render?(value: T[keyof T], row: T): ReactNode;
  /** Custom header cell content (e.g. select-all checkbox). */
  renderHeader?(): ReactNode;
  className?: string;
  width?: number | "auto";
  align?: "left" | "center" | "right";
  cellVariant?: "default" | "flush";
  headerVariant?: "default" | "check";
  /** Prefer fixed min width so narrow columns (checkbox) do not collapse. */
  stickyWidth?: number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  getRowKey?: (row: T, rowIndex: number) => string | number;
  onRowClick?: (row: T, rowIndex: number) => void;
  getRowClassName?: (row: T, rowIndex: number) => string | undefined;
}

const classes = {
  tableHeaderRow: "h-[38px] border-b border-memBorder-primary",
  tableHeaderCell:
    "h-[38px] p-2 align-middle bg-surface-default-fg-secondary text-onSurface-default-secondary",
  tableHeaderCheckCell:
    "w-10 min-w-10 max-w-10 h-[38px] p-2 align-middle bg-surface-default-fg-secondary",
  tableHeaderCheckWrap: "flex h-full items-center justify-center",
  tableHeaderDivider:
    "w-px self-stretch border border-memBorder-primary shrink-0",
  tableRow:
    "h-[38px] border-t border-memBorder-primary bg-surface-default-primary hover:bg-surface-default-primary-hover",
  tableCell:
    "text-sm font-medium text-onSurface-default-primary px-4 py-2 justify-start align-middle font-[Fustat] leading-[140%] tracking-normal",
  tableCellFlush: "align-middle p-0",
  tableCellCheck:
    "w-10 min-w-10 max-w-10 align-middle p-0",
} as const;

export function DataTable<T>({
  data,
  columns,
  className = "",
  getRowKey,
  onRowClick,
  getRowClassName,
}: DataTableProps<T>) {
  const minHeight = data.length > 0 ? Math.max(76, 38 + data.length * 38) : 100;
  const flexible = columns.filter((c) => !c.stickyWidth);
  const stickyTotal = columns.reduce(
    (sum, col) => sum + (col.stickyWidth ?? 0),
    0,
  );
  const flexWeight = flexible.reduce(
    (sum, col) => sum + (typeof col.width === "number" ? col.width : 100),
    0,
  );

  return (
    <div
      className={`min-w-0 max-w-full overflow-x-auto transition-all duration-300 ease-in-out ${className}`}
      style={{ minHeight: `${minHeight}px` }}
    >
      <table className="table-fixed w-full" style={{ minWidth: stickyTotal + 480 }}>
        <colgroup>
          {columns.map((col, i) => {
            if (col.stickyWidth) {
              return (
                <col
                  key={i}
                  style={{ width: col.stickyWidth, minWidth: col.stickyWidth }}
                />
              );
            }
            const weight = typeof col.width === "number" ? col.width : 100;
            const pct =
              flexWeight > 0 ? (weight / flexWeight) * 100 : 100 / Math.max(flexible.length, 1);
            return <col key={i} style={{ width: `${pct}%` }} />;
          })}
        </colgroup>
        <thead>
          <tr className={classes.tableHeaderRow}>
            {columns.map((column, index) => {
              const isLastColumn = index === columns.length - 1;

              if (column.headerVariant === "check" || column.renderHeader) {
                return (
                  <th
                    key={index}
                    className={
                      column.headerVariant === "check"
                        ? classes.tableHeaderCheckCell
                        : `${classes.tableHeaderCell} min-w-0`
                    }
                    style={
                      column.stickyWidth
                        ? { width: column.stickyWidth, minWidth: column.stickyWidth }
                        : undefined
                    }
                  >
                    <div className="flex h-full items-stretch justify-between">
                      <div className={classes.tableHeaderCheckWrap}>
                        {column.renderHeader ? (
                          column.renderHeader()
                        ) : (
                          <span className="box-border flex h-4 w-4 items-center rounded-sm border border-memBorder-primary" />
                        )}
                      </div>
                      {!isLastColumn && (
                        <div className={classes.tableHeaderDivider} />
                      )}
                    </div>
                  </th>
                );
              }

              const Icon = column.icon;
              const relevantClasses = column.className
                ? column.className
                    .split(" ")
                    .filter(
                      (c) =>
                        c.startsWith("w-") ||
                        c.startsWith("min-w-") ||
                        c.startsWith("max-w-") ||
                        c.startsWith("text-center") ||
                        c.startsWith("text-left") ||
                        c.startsWith("text-right"),
                    )
                    .join(" ")
                : "";

              const baseHeaderClass = classes.tableHeaderCell;
              const alignClass =
                column.align === "center"
                  ? "text-center"
                  : column.align === "right"
                    ? "text-right"
                    : "";
              const mergedRelevantClasses =
                `${relevantClasses} ${alignClass}`.trim();
              const hasCustomAlignment =
                mergedRelevantClasses.includes("text-center") ||
                mergedRelevantClasses.includes("text-right");
              const headerClassName = hasCustomAlignment
                ? `${baseHeaderClass.replace("text-left", "")} ${mergedRelevantClasses}`.trim()
                : mergedRelevantClasses
                  ? `${baseHeaderClass} ${mergedRelevantClasses}`.trim()
                  : baseHeaderClass;
              const headerCellClassName = `${headerClassName} min-w-0`;

              const flexAlignment = mergedRelevantClasses.includes(
                "text-center",
              )
                ? "justify-center"
                : mergedRelevantClasses.includes("text-right")
                  ? "justify-end"
                  : "";

              return (
                <th key={index} className={headerCellClassName}>
                  <div className="flex h-full min-w-0 items-stretch justify-between">
                    <div
                      className={`flex min-w-0 flex-1 items-center gap-2 overflow-hidden ${flexAlignment}`}
                    >
                      {Icon && <Icon className="size-4 shrink-0" />}
                      <span className="truncate font-[Fustat] text-sm font-semibold leading-[18px] text-onSurface-default-secondary">
                        {column.label}
                      </span>
                    </div>
                    {!isLastColumn && (
                      <div className={classes.tableHeaderDivider} />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="transition-all duration-300 ease-in-out">
          {data.map((row, rowIndex) => (
            <tr
              key={getRowKey ? String(getRowKey(row, rowIndex)) : rowIndex}
              className={`${classes.tableRow} ${
                onRowClick ? "cursor-pointer" : ""
              } ${getRowClassName ? (getRowClassName(row, rowIndex) ?? "") : ""} animate-fade-in`}
              onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
            >
              {columns.map((column, colIndex) => {
                const value = row[column.key];
                const isCheck =
                  column.headerVariant === "check" || !!column.stickyWidth;
                const baseCellClass = isCheck
                  ? classes.tableCellCheck
                  : column.cellVariant === "flush"
                    ? classes.tableCellFlush
                    : classes.tableCell;
                // Avoid overflow-hidden on checkbox cells so controls are not clipped.
                const cellClassName = isCheck
                  ? `${column.className || baseCellClass}`
                  : `${column.className || baseCellClass} min-w-0 overflow-hidden`;
                return (
                  <td
                    key={colIndex}
                    className={cellClassName}
                    style={
                      column.stickyWidth
                        ? {
                            width: column.stickyWidth,
                            minWidth: column.stickyWidth,
                          }
                        : undefined
                    }
                  >
                    <div
                      className={
                        isCheck
                          ? "flex items-center justify-center"
                          : "min-w-0 overflow-hidden"
                      }
                    >
                      {column.render
                        ? column.render(value, row)
                        : String(value ?? "")}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { classes as tableClasses };
