import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Save, X } from 'lucide-react';

interface ResultRowEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (editedData: (string | number | boolean | null)[]) => void;
  rowData: (string | number | boolean | null)[];
  headers: string[];
}

export function ResultRowEditModal({
  open,
  onClose,
  onSave,
  rowData,
  headers,
}: ResultRowEditModalProps) {
  const [editedData, setEditedData] = useState<(string | number | boolean | null)[]>([]);

  useEffect(() => {
    if (open) {
      setEditedData([...rowData]);
    }
  }, [open, rowData]);

  const handleCellChange = (index: number, value: string) => {
    const newData = [...editedData];
    newData[index] = value;
    setEditedData(newData);
  };

  const handleSave = () => {
    onSave(editedData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Row Data</DialogTitle>
          <DialogDescription>
            Make changes to the row data. These changes will only affect the exported file.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {headers.map((header, idx) => (
              <div key={idx} className="space-y-2">
                <Label htmlFor={`field-${idx}`}>{header}</Label>
                <Input
                  id={`field-${idx}`}
                  value={editedData[idx] === null || editedData[idx] === undefined ? '' : String(editedData[idx])}
                  onChange={(e) => handleCellChange(idx, e.target.value)}
                  placeholder={`Enter ${header}...`}
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
