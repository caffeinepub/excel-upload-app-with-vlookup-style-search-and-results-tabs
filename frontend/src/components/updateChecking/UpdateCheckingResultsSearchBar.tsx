import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { MatchType } from '@/lib/compare/filterComparisonRows';

interface UpdateCheckingResultsSearchBarProps {
  keyword: string;
  matchType: MatchType;
  onKeywordChange: (keyword: string) => void;
  onMatchTypeChange: (matchType: MatchType) => void;
  onClear: () => void;
}

export function UpdateCheckingResultsSearchBar({
  keyword,
  matchType,
  onKeywordChange,
  onMatchTypeChange,
  onClear,
}: UpdateCheckingResultsSearchBarProps) {
  return (
    <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-semibold">Search in Results</Label>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Enter keyword or raw name to search..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-[140px]">
          <Select value={matchType} onValueChange={(value) => onMatchTypeChange(value as MatchType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="exact">Exact Match</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onClear}
          disabled={!keyword}
          title="Clear search"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      {keyword && (
        <p className="text-xs text-muted-foreground">
          Searching for "{keyword}" using {matchType === 'exact' ? 'exact match' : 'partial match'}
        </p>
      )}
    </div>
  );
}
