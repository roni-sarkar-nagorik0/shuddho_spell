/**
 * One step of an alignment: what was expected here, and what was heard here.
 *
 * `expected: null` is an insertion — a sound the learner added. `heard: null`
 * is a deletion — a sound they left out. Both matter and they mean opposite
 * things, which is why this is a pair of nullable slots and not a distance.
 */
export interface IAlignmentStep {
  readonly expected: string | null;
  readonly heard: string | null;
}

/**
 * Needleman–Wunsch over two symbol sequences, with the substitution cost
 * supplied by the caller.
 *
 * The cost function is the point. Distance treats every swap as one error, but
 * `07-speech-scoring.md` is built on the opposite claim: /v/ heard as /w/ is a
 * *cheap* error with a known remedy and /v/ heard as /k/ is not. Handing the
 * cost in lets the confusion map decide which mistakes are near ones, so the
 * alignment lands the learner's /w/ against the /v/ it was meant to be rather
 * than deleting one and inserting the other.
 *
 * A full matrix here rather than the two rows `editDistance` uses, because this
 * one is walked back — the traceback is the whole answer.
 */
export function align(
  expected: readonly string[],
  heard: readonly string[],
  substitutionCost: (expectedSymbol: string, heardSymbol: string) => number,
): readonly IAlignmentStep[] {
  const rows = expected.length;
  const columns = heard.length;

  const cost: number[][] = Array.from({ length: rows + 1 }, (_, row) =>
    Array.from({ length: columns + 1 }, (_, column) => (row === 0 ? column : column === 0 ? row : 0)),
  );

  const at = (row: number, column: number): number => cost[row]?.[column] ?? 0;

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      const expectedSymbol = expected[row - 1] ?? '';
      const heardSymbol = heard[column - 1] ?? '';

      const substitute =
        at(row - 1, column - 1) +
        (expectedSymbol === heardSymbol ? 0 : substitutionCost(expectedSymbol, heardSymbol));

      const row_ = cost[row];

      if (row_ !== undefined) {
        row_[column] = Math.min(substitute, at(row - 1, column) + 1, at(row, column - 1) + 1);
      }
    }
  }

  const steps: IAlignmentStep[] = [];
  let row = rows;
  let column = columns;

  while (row > 0 || column > 0) {
    const expectedSymbol = row > 0 ? (expected[row - 1] ?? '') : '';
    const heardSymbol = column > 0 ? (heard[column - 1] ?? '') : '';

    const diagonal =
      row > 0 && column > 0
        ? at(row - 1, column - 1) +
          (expectedSymbol === heardSymbol ? 0 : substitutionCost(expectedSymbol, heardSymbol))
        : Number.POSITIVE_INFINITY;

    if (row > 0 && column > 0 && at(row, column) === diagonal) {
      steps.push({ expected: expectedSymbol, heard: heardSymbol });
      row -= 1;
      column -= 1;
      continue;
    }

    if (row > 0 && at(row, column) === at(row - 1, column) + 1) {
      steps.push({ expected: expectedSymbol, heard: null });
      row -= 1;
      continue;
    }

    steps.push({ expected: null, heard: heardSymbol });
    column -= 1;
  }

  return steps.reverse();
}
