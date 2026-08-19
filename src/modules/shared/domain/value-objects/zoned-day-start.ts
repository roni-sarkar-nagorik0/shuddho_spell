/**
 * The UTC instant at which a calendar day begins in a given timezone.
 *
 * There is no timezone library in this project and there does not need to be —
 * `Intl` already carries the IANA database, and this is the one operation the
 * domain needs from it. The technique: format the instant *in* the zone, read
 * the wall-clock parts back, and the difference between those parts read as UTC
 * and the instant itself is the zone's offset at that moment.
 *
 * Two passes, not one. The offset is sampled at a guessed instant, and on the
 * two days a year a zone shifts, the guess can sit on the wrong side of the
 * transition — sampling again at the corrected instant lands it. A third pass
 * cannot change the answer, because by then both samples agree.
 */
function offsetMsAt(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const read = (type: string): number => {
    const found = parts.find((part) => part.type === type);

    return found === undefined ? 0 : Number(found.value);
  };

  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour'),
    read('minute'),
    read('second'),
  );

  return asUtc - instant.getTime();
}

/** Midnight on `isoDate` in `timezone`, as a UTC instant. */
export function zonedDayStart(isoDate: string, timezone: string): Date {
  const wallClockAsUtc = Date.parse(`${isoDate}T00:00:00Z`);

  const firstGuess = new Date(wallClockAsUtc - offsetMsAt(new Date(wallClockAsUtc), timezone));

  return new Date(wallClockAsUtc - offsetMsAt(firstGuess, timezone));
}
