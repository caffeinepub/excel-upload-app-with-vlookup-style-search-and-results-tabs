import { useState, useEffect } from 'react';
import { SheetData, SearchParams } from '../../state/appState';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { X, Play, Pause, RotateCcw } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface VlookupAnimationProps {
  data: SheetData;
  searchParams: SearchParams;
  onClose: () => void;
}

type AnimationStep = 
  | { type: 'intro'; message: string }
  | { type: 'highlight-lookup'; message: string }
  | { type: 'scan-row'; rowIndex: number; message: string }
  | { type: 'found'; rowIndex: number; message: string }
  | { type: 'return-value'; rowIndex: number; message: string }
  | { type: 'complete'; message: string }
  | { type: 'not-found'; message: string };

export function VlookupAnimation({ data, searchParams, onClose }: VlookupAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [steps, setSteps] = useState<AnimationStep[]>([]);

  const keyColumnIndex = data.headers.indexOf(searchParams.keyColumn);
  const returnColumnIndex = data.headers.indexOf(searchParams.returnColumn);

  useEffect(() => {
    // Generate animation steps
    const animationSteps: AnimationStep[] = [];
    
    animationSteps.push({
      type: 'intro',
      message: `Looking for "${searchParams.lookupValue}" in column "${searchParams.keyColumn}"`
    });

    animationSteps.push({
      type: 'highlight-lookup',
      message: `Scanning the "${searchParams.keyColumn}" column...`
    });

    let foundRowIndex = -1;
    
    // Scan through rows
    for (let i = 0; i < Math.min(data.rows.length, 20); i++) {
      const cellValue = data.rows[i][keyColumnIndex];
      const cellStr = String(cellValue || '').toLowerCase();
      const lookupStr = searchParams.lookupValue.toLowerCase();
      
      if (searchParams.matchType === 'exact') {
        if (cellStr === lookupStr) {
          foundRowIndex = i;
          animationSteps.push({
            type: 'scan-row',
            rowIndex: i,
            message: `Checking row ${i + 1}: "${cellValue}" - Match found!`
          });
          break;
        } else {
          animationSteps.push({
            type: 'scan-row',
            rowIndex: i,
            message: `Checking row ${i + 1}: "${cellValue}" - No match`
          });
        }
      } else {
        // Approximate match logic
        const numValue = Number(cellValue);
        const lookupNum = Number(searchParams.lookupValue);
        
        if (!isNaN(numValue) && !isNaN(lookupNum)) {
          if (numValue <= lookupNum) {
            foundRowIndex = i;
            animationSteps.push({
              type: 'scan-row',
              rowIndex: i,
              message: `Checking row ${i + 1}: ${cellValue} ≤ ${searchParams.lookupValue}`
            });
          } else {
            animationSteps.push({
              type: 'scan-row',
              rowIndex: i,
              message: `Checking row ${i + 1}: ${cellValue} > ${searchParams.lookupValue} - Stopping`
            });
            break;
          }
        }
      }
    }

    if (foundRowIndex >= 0) {
      animationSteps.push({
        type: 'found',
        rowIndex: foundRowIndex,
        message: `Match found at row ${foundRowIndex + 1}!`
      });

      const returnValue = data.rows[foundRowIndex][returnColumnIndex];
      animationSteps.push({
        type: 'return-value',
        rowIndex: foundRowIndex,
        message: `Returning value from "${searchParams.returnColumn}": ${returnValue === null || returnValue === undefined ? '(empty)' : String(returnValue)}`
      });

      animationSteps.push({
        type: 'complete',
        message: 'VLOOKUP complete!'
      });
    } else {
      animationSteps.push({
        type: 'not-found',
        message: 'No match found in the data'
      });
    }

    setSteps(animationSteps);
  }, [data, searchParams, keyColumnIndex, returnColumnIndex]);

  useEffect(() => {
    if (!isPlaying || currentStep >= steps.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, steps.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(true);
  };

  const currentStepData = steps[currentStep];

  const getCellHighlight = (rowIndex: number, colIndex: number): string => {
    if (!currentStepData) return '';

    if (currentStepData.type === 'highlight-lookup' && colIndex === keyColumnIndex) {
      return 'bg-blue-200 dark:bg-blue-900/50 animate-pulse';
    }

    if (currentStepData.type === 'scan-row' && currentStepData.rowIndex === rowIndex) {
      if (colIndex === keyColumnIndex) {
        return 'bg-yellow-300 dark:bg-yellow-700/70 animate-pulse';
      }
    }

    if (currentStepData.type === 'found' && currentStepData.rowIndex === rowIndex) {
      if (colIndex === keyColumnIndex) {
        return 'bg-green-300 dark:bg-green-700/70';
      }
    }

    if (currentStepData.type === 'return-value' && currentStepData.rowIndex === rowIndex) {
      if (colIndex === keyColumnIndex) {
        return 'bg-green-300 dark:bg-green-700/70';
      }
      if (colIndex === returnColumnIndex) {
        return 'bg-green-400 dark:bg-green-600/80 animate-pulse font-bold';
      }
    }

    if (currentStepData.type === 'complete') {
      const foundStep = steps.find(s => s.type === 'found') as { type: 'found'; rowIndex: number } | undefined;
      if (foundStep && foundStep.rowIndex === rowIndex) {
        if (colIndex === returnColumnIndex) {
          return 'bg-green-400 dark:bg-green-600/80 font-bold';
        }
      }
    }

    return '';
  };

  const displayRows = data.rows.slice(0, 20);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">VLOOKUP Animation</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handlePlayPause}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <div className="flex-1 ml-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">
                {currentStepData?.message || 'Initializing...'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full rounded-md border">
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="border border-border bg-muted p-2 text-left font-semibold text-sm w-12">
                      #
                    </th>
                    {data.headers.map((header, idx) => (
                      <th
                        key={idx}
                        className={`border border-border bg-muted p-2 text-left font-semibold text-sm min-w-[120px] ${
                          idx === keyColumnIndex ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                        } ${
                          idx === returnColumnIndex ? 'bg-green-100 dark:bg-green-900/30' : ''
                        }`}
                      >
                        {header || `Column ${idx + 1}`}
                        {idx === keyColumnIndex && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Key)</span>
                        )}
                        {idx === returnColumnIndex && (
                          <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Return)</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={data.headers.length + 1} className="text-center p-4 text-muted-foreground">
                        No data rows found
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        <td className="border border-border p-2 text-sm font-medium text-muted-foreground bg-muted/50">
                          {rowIdx + 1}
                        </td>
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className={`border border-border p-2 text-sm transition-all duration-300 ${getCellHighlight(
                              rowIdx,
                              cellIdx
                            )}`}
                          >
                            {cell === null || cell === undefined ? (
                              <span className="text-muted-foreground italic">empty</span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ScrollArea>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Step {currentStep + 1} of {steps.length}
            </span>
            <span>Showing first 20 rows</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
