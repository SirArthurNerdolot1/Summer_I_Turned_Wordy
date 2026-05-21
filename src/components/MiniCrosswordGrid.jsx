import React, { useEffect, useMemo, useRef } from "react";

export const MINI_CROSSWORD_SIZE = 4;

export function createEmptyGrid(size = MINI_CROSSWORD_SIZE) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => ""));
}

export function normalizeGrid(grid, size = MINI_CROSSWORD_SIZE) {
  const sourceRows = Array.isArray(grid) ? grid : [];

  return Array.from({ length: size }, (_, rowIndex) => {
    const sourceRow = Array.isArray(sourceRows[rowIndex])
      ? sourceRows[rowIndex]
      : String(sourceRows[rowIndex] || "").split("");

    return Array.from({ length: size }, (_, colIndex) => {
      const value = String(sourceRow[colIndex] || "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 1);
      return value;
    });
  });
}

export function transposeGrid(grid) {
  if (!Array.isArray(grid) || !grid.length) {
    return [];
  }

  return grid[0].map((_, colIndex) => grid.map((row) => row[colIndex] || ""));
}

export function gridToWords(grid) {
  const normalizedGrid = normalizeGrid(grid);
  return {
    across: normalizedGrid.map((row) => row.join("")),
    down: transposeGrid(normalizedGrid).map((column) => column.join("")),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

export default function MiniCrosswordGrid({
  value,
  onChange,
  activeCell,
  onActiveCellChange,
  direction,
  onDirectionChange,
  className = "",
  cellClassName = "",
  inputClassName = "",
}) {
  const grid = useMemo(() => normalizeGrid(value), [value]);
  const refs = useRef(null);

  if (!refs.current) {
    refs.current = Array.from({ length: MINI_CROSSWORD_SIZE }, () =>
      Array.from({ length: MINI_CROSSWORD_SIZE }, () => React.createRef()),
    );
  }

  const focusCell = (row, col) => {
    const nextRow = clamp(row, 0, MINI_CROSSWORD_SIZE - 1);
    const nextCol = clamp(col, 0, MINI_CROSSWORD_SIZE - 1);
    onActiveCellChange?.({ row: nextRow, col: nextCol });
    window.requestAnimationFrame(() => {
      refs.current?.[nextRow]?.[nextCol]?.current?.focus();
    });
  };

  useEffect(() => {
    if (!activeCell) {
      return;
    }

    const row = clamp(activeCell.row ?? 0, 0, MINI_CROSSWORD_SIZE - 1);
    const col = clamp(activeCell.col ?? 0, 0, MINI_CROSSWORD_SIZE - 1);
    window.requestAnimationFrame(() => {
      refs.current?.[row]?.[col]?.current?.focus();
    });
  }, [activeCell]);

  const moveCell = (row, col, deltaRow, deltaCol) => {
    focusCell(row + deltaRow, col + deltaCol);
  };

  const updateCell = (row, col, nextValue) => {
    if (typeof onChange !== "function") {
      return;
    }

    const nextGrid = cloneGrid(grid);
    nextGrid[row][col] = nextValue;
    onChange(nextGrid);
  };

  const handleKeyDown = (event, row, col) => {
    const key = event.key;

    if (key === "ArrowRight") {
      event.preventDefault();
      moveCell(row, col, 0, 1);
      return;
    }
    if (key === "ArrowLeft") {
      event.preventDefault();
      moveCell(row, col, 0, -1);
      return;
    }
    if (key === "ArrowUp") {
      event.preventDefault();
      moveCell(row, col, -1, 0);
      return;
    }
    if (key === "ArrowDown") {
      event.preventDefault();
      moveCell(row, col, 1, 0);
      return;
    }
    if (key === "Enter") {
      event.preventDefault();
      onDirectionChange?.((current) => (current === "across" ? "down" : "across"));
      return;
    }
    if (key === "Backspace") {
      event.preventDefault();
      const currentValue = grid[row][col];
      if (currentValue) {
        updateCell(row, col, "");
        return;
      }

      const previousCell =
        direction === "across"
          ? { row, col: clamp(col - 1, 0, MINI_CROSSWORD_SIZE - 1) }
          : { row: clamp(row - 1, 0, MINI_CROSSWORD_SIZE - 1), col };
      updateCell(previousCell.row, previousCell.col, "");
      focusCell(previousCell.row, previousCell.col);
    }
  };

  const handleChange = (event, row, col) => {
    const nextValue = String(event.target.value || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 1);

    updateCell(row, col, nextValue);

    if (!nextValue) {
      return;
    }

    if (direction === "across") {
      focusCell(row, col + 1);
      return;
    }

    focusCell(row + 1, col);
  };

  const handleCellClick = (row, col) => {
    if (activeCell?.row === row && activeCell?.col === col) {
      onDirectionChange?.((current) => (current === "across" ? "down" : "across"));
      return;
    }

    focusCell(row, col);
  };

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-zinc-950 p-2 shadow-inner shadow-zinc-950/20">
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isActiveCell =
              activeCell?.row === rowIndex && activeCell?.col === colIndex;
            const isActiveWord =
              activeCell &&
              (direction === "across"
                ? activeCell.row === rowIndex
                : activeCell.col === colIndex);

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`rounded-lg border transition-all duration-200 ${
                  isActiveCell
                    ? "border-amber-400 bg-amber-100 shadow-md shadow-amber-200/60"
                    : isActiveWord
                      ? "border-sky-200 bg-sky-50"
                      : "border-zinc-200 bg-white"
                } ${cellClassName}`}
              >
                <input
                  ref={refs.current[rowIndex][colIndex]}
                  value={cell}
                  onFocus={() => onActiveCellChange?.({ row: rowIndex, col: colIndex })}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  onKeyDown={(event) => handleKeyDown(event, rowIndex, colIndex)}
                  onChange={(event) => handleChange(event, rowIndex, colIndex)}
                  inputMode="text"
                  maxLength={1}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}`}
                  className={`h-14 w-14 rounded-lg bg-transparent text-center text-xl font-semibold uppercase text-zinc-950 outline-none placeholder:text-zinc-300 focus:ring-2 focus:ring-inset focus:ring-sky-300 md:h-16 md:w-16 ${inputClassName}`}
                />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
