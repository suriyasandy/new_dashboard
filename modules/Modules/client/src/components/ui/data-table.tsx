import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableProps {
  columns: any[];
  data: any[];
  onRowClick?: (row: any) => void;
  className?: string;
  rowClassName?: (row: any) => string;
}

export default function DataTable({ 
  columns, 
  data, 
  onRowClick, 
  className,
  rowClassName 
}: DataTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className="font-medium text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center">
                  {column.header}
                  <i className="fas fa-sort ml-1 text-muted-foreground/50 text-xs"></i>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-muted/50",
                rowClassName && row && rowClassName(row)
              )}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex} className="py-4">
                  {column.cell 
                    ? column.cell({ row: { getValue: (key: string) => row[key], original: row } })
                    : row[column.accessorKey]
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
