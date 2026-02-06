import { SheetData } from '../../state/appState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';

interface DataPreviewTableProps {
  data: SheetData;
}

export function DataPreviewTable({ data }: DataPreviewTableProps) {
  if (data.headers.length === 0 && data.rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>This sheet appears to be empty.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 bg-muted/50">#</TableHead>
            {data.headers.map((header, idx) => (
              <TableHead key={idx} className="bg-muted/50 font-semibold">
                {header || `Column ${idx + 1}`}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={data.headers.length + 1} className="text-center text-muted-foreground">
                No data rows found
              </TableCell>
            </TableRow>
          ) : (
            data.rows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                <TableCell className="font-medium text-muted-foreground">{rowIdx + 1}</TableCell>
                {row.map((cell, cellIdx) => (
                  <TableCell key={cellIdx}>
                    {cell === null || cell === undefined ? (
                      <span className="text-muted-foreground italic">empty</span>
                    ) : (
                      String(cell)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
