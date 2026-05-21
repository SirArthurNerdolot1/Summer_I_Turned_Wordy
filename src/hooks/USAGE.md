## Daily Game State Hook - Usage Guide

### Overview
`useDailyGameState` is a React hook that manages daily puzzle state with automatic day-boundary detection and progress clearing. It's hydration-safe and handles offline scenarios gracefully.

### Installation & Import
```javascript
import { useDailyGameState } from '../hooks/useDailyGameState';
```

### Basic Usage

```jsx
function GamePage() {
  const { puzzle, isLoading, error, dateKey, resetDaily, isHydrated } = useDailyGameState();

  // Don't render until hydration is complete (prevents SSR mismatches)
  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return <div>Fetching today's puzzle...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!puzzle) {
    return <div>No puzzle available</div>;
  }

  return (
    <div>
      <h1>Today's Game ({dateKey})</h1>
      <GameBoard puzzle={puzzle} />
      <button onClick={resetDaily}>Reset Progress</button>
    </div>
  );
}
```

### Return Value Structure

```javascript
{
  puzzle: {
    // Daily puzzle data from API
    // Structure depends on your backend
  },
  isLoading: boolean,        // True while fetching
  error: string | null,      // Error message if fetch/cache fails
  dateKey: string,           // Today's date as "YYYY-MM-DD" (local timezone)
  isHydrated: boolean,       // True after first useEffect runs (safe to render)
  resetDaily: () => void,    // Clear today's game progress
  clearProgressForDate: (dateKey) => void  // Clear progress for specific date
}
```

### Key Features

#### 1. **Hydration Safety**
- First render returns `isHydrated: false` to prevent SSR mismatches
- localStorage is only read after component mounts
- Safe to use in Next.js/Remix without hydration errors

#### 2. **Automatic Day Detection**
- Uses local timezone (not UTC) via `getLocalDateKey()`
- Compares stored dateKey with current dateKey
- On new day: automatically clears previous day's progress

#### 3. **Smart Caching**
- Fetches puzzle from `/api/daily-puzzle` on first load
- Caches in localStorage: `lingodaily_puzzle_2024-05-20`
- On subsequent visits same day: uses cached version
- Falls back to cache if API fails (offline mode)

#### 4. **Error Handling**
- 10-second timeout for API requests
- Graceful fallback to cached puzzle
- Detailed error messages for debugging
- Continues rendering with cached data if possible

### LocalStorage Structure

```json
{
  "lingodaily_dateKey": "2024-05-20",
  "lingodaily_puzzle_2024-05-20": { "...puzzle object..." },
  "lingodaily_progress_pyramid_2024-05-20": { "...progress..." },
  "lingodaily_progress_cryptic_2024-05-20": { "...progress..." },
  "lingodaily_progress_scrabble_2024-05-20": { "...progress..." }
}
```

### Advanced Example: Multiple Games

```jsx
import { useDailyGameState } from '../hooks/useDailyGameState';
import ClearCryptics from '../games/ClearCryptics';
import WordPyramid from '../games/WordPyramid';

function HomePage() {
  const { puzzle, isHydrated, error, resetDaily } = useDailyGameState();

  if (!isHydrated) return <LoadingScreen />;
  if (error) return <ErrorBoundary error={error} />;
  if (!puzzle) return <div>No puzzle today</div>;

  return (
    <div>
      <header>
        <h1>Daily Challenges</h1>
        <button onClick={resetDaily} className="text-sm">Reset All</button>
      </header>
      
      {puzzle.wordPyramid && (
        <WordPyramid data={puzzle.wordPyramid} />
      )}
      
      {puzzle.clearCryptics && (
        <ClearCryptics data={puzzle.clearCryptics} />
      )}
    </div>
  );
}
```

### API Contract

**Endpoint:** `GET /api/daily-puzzle`

**Response Format (example):**
```json
{
  "wordPyramid": {
    "level": 1,
    "words": ["cat", "bat", "mat"],
    "target": "bat"
  },
  "clearCryptics": {
    "puzzles": [
      {
        "clue": "A feline pet",
        "answer": "CAT"
      }
    ]
  },
  "fetchedAt": "2024-05-20T14:30:00Z"
}
```

### Utility Functions

#### `getLocalDateKey()`
```javascript
import { getLocalDateKey } from '../utils/dateUtils';

const today = getLocalDateKey(); // "2024-05-20" (local timezone)
```

#### `isValidDateKey(dateKey)`
```javascript
import { isValidDateKey } from '../utils/dateUtils';

isValidDateKey("2024-05-20");  // true
isValidDateKey("invalid");     // false
```

### Best Practices

1. **Always check `isHydrated` before rendering:** Prevents hydration mismatches in SSR environments
   ```jsx
   if (!isHydrated) return <Skeleton />;
   ```

2. **Handle loading and error states:** Provide feedback to users
   ```jsx
   if (error) return <ErrorAlert message={error} />;
   ```

3. **Use `resetDaily()` for game resets:** Players can retry challenges
   ```jsx
   <button onClick={resetDaily}>Try Again</button>
   ```

4. **Don't duplicate hook calls:** Call once at top level, pass data down
   ```jsx
   // ✅ Good
   const gameState = useDailyGameState();
   return <GameBoard {...gameState} />;

   // ❌ Bad - multiple calls cause race conditions
   const state1 = useDailyGameState();
   const state2 = useDailyGameState();
   ```

### Troubleshooting

**Q: Hydration mismatch error in Next.js?**
A: Ensure you check `isHydrated` before rendering any UI content that depends on localStorage.

**Q: Puzzle shows as null even after loading?**
A: Check browser console for error messages. Verify API endpoint is correct and returns valid JSON.

**Q: Progress not clearing on new day?**
A: Verify `getLocalDateKey()` returns correct date. Check localStorage for stale dateKey values.

**Q: Offline mode showing old puzzle?**
A: This is intentional - falls back to cached puzzle when API is unavailable.
