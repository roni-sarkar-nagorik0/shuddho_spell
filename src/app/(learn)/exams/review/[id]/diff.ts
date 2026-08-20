export interface IDiffPart {
  readonly kind: 'same' | 'added' | 'removed';
  readonly text: string;
}

/**
 * A character diff, by longest common subsequence.
 *
 * Word-level would be cheaper and wrong for this product: the mistakes it
 * exists to show are `recieve` against `receive` and `wery` against `very`,
 * which are one or two characters inside a word. A word diff renders both as
 * "whole word replaced" and teaches nothing.
 *
 * O(n·m) in time and space, which is fine for an exam answer — the schema caps
 * a submitted value at 2,000 characters, and answers in practice are a handful
 * of words.
 */
export function diffCharacters(from: string, to: string): readonly IDiffPart[] {
  const left = Array.from(from);
  const right = Array.from(to);

  const lengths: number[][] = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0),
  );

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      const row = lengths[i];
      const nextRow = lengths[i + 1];

      if (row === undefined || nextRow === undefined) {
        continue;
      }

      row[j] =
        left[i] === right[j]
          ? (nextRow[j + 1] ?? 0) + 1
          : Math.max(nextRow[j] ?? 0, row[j + 1] ?? 0);
    }
  }

  const parts: IDiffPart[] = [];

  const push = (kind: IDiffPart['kind'], text: string): void => {
    const last = parts[parts.length - 1];

    // Coalesce, so a five-character insertion is one span rather than five.
    if (last !== undefined && last.kind === kind) {
      parts[parts.length - 1] = { kind, text: last.text + text };
      return;
    }

    parts.push({ kind, text });
  };

  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      push('same', left[i] ?? '');
      i += 1;
      j += 1;
    } else if ((lengths[i + 1]?.[j] ?? 0) >= (lengths[i]?.[j + 1] ?? 0)) {
      push('removed', left[i] ?? '');
      i += 1;
    } else {
      push('added', right[j] ?? '');
      j += 1;
    }
  }

  while (i < left.length) {
    push('removed', left[i] ?? '');
    i += 1;
  }

  while (j < right.length) {
    push('added', right[j] ?? '');
    j += 1;
  }

  return parts;
}

/**
 * `correctAnswer` is `jsonb`, so it is a string for most question types and an
 * object for a few. Rendering the object as JSON is honest — it is what was
 * stored — and far better than picking a field that may not exist.
 */
export function answerText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  return value === null || value === undefined ? '' : JSON.stringify(value);
}
