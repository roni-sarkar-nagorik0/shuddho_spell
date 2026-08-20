/**
 * Words that are spelled differently and pronounced the same.
 *
 * `07-speech-scoring.md` requires the homophone case to be **handled
 * explicitly, not accidentally**, and this is why. The browser's recogniser
 * writes down a word, not a sound: a learner who pronounces `there` perfectly
 * may well have `their` come back, because the recogniser is guessing from
 * context it does not have. Marking that down would be marking the learner for
 * the recogniser's spelling choice — a pronunciation score punishing a spelling
 * decision nobody made.
 *
 * These are the pairs of the reference accent the programme teaches. Groups
 * that only rhyme in some accents are left out: `caught`/`court` is a merger,
 * not a homophony, and treating it as one would forgive a real vowel error.
 */
export const HOMOPHONE_GROUPS: readonly (readonly string[])[] = Object.freeze([
  ['there', 'their', "they're"],
  ['to', 'too', 'two'],
  ['your', "you're"],
  ['its', "it's"],
  ['see', 'sea'],
  ['right', 'write', 'rite'],
  ['know', 'no'],
  ['knew', 'new'],
  ['hear', 'here'],
  ['one', 'won'],
  ['buy', 'by', 'bye'],
  ['flour', 'flower'],
  ['meat', 'meet'],
  ['week', 'weak'],
  ['son', 'sun'],
  ['hour', 'our'],
  ['for', 'four', 'fore'],
  ['piece', 'peace'],
  ['break', 'brake'],
  ['sale', 'sail'],
  ['road', 'rode'],
  ['plain', 'plane'],
  ['wait', 'weight'],
  ['whole', 'hole'],
  ['waist', 'waste'],
  ['mail', 'male'],
  ['pair', 'pear', 'pare'],
  ['bear', 'bare'],
  ['tail', 'tale'],
  ['cell', 'sell'],
  ['made', 'maid'],
  ['threw', 'through'],
  ['blue', 'blew'],
  ['knight', 'night'],
  ['some', 'sum'],
  ['allowed', 'aloud'],
  ['ate', 'eight'],
  ['cent', 'scent', 'sent'],
  ['die', 'dye'],
  ['fair', 'fare'],
  ['great', 'grate'],
  ['heal', 'heel'],
  ['hi', 'high'],
  ['peak', 'peek'],
  ['rain', 'reign', 'rein'],
  ['role', 'roll'],
  ['scene', 'seen'],
  ['steal', 'steel'],
  ['toe', 'tow'],
  ['vain', 'vein'],
  ['weather', 'whether'],
  ['wood', 'would'],
]);

/**
 * Every spelling that sounds like this word, the word itself included.
 *
 * Returned as *acceptable renderings* rather than as a yes/no answer, because
 * that is how the score uses them: the orthographic half of the blend measures
 * the transcript against the closest acceptable spelling, so a homophone costs
 * nothing and a genuine mispronunciation still costs what it should.
 */
export function acceptableRenderings(word: string): readonly string[] {
  const group = HOMOPHONE_GROUPS.find((entry) => entry.includes(word));

  return group === undefined ? [word] : group;
}
