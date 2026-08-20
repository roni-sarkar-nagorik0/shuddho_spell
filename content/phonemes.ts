import { type PhonemeEntry } from './schema';

/**
 * The 44 phonemes of English, annotated for a Bengali speaker.
 *
 * **Not invented here.** These are the entries migration `010_seed_reference`
 * already carries — written, reviewed and applied in Phase 2 — moved into the
 * content pipeline so they are edited in one place and seeded by the same
 * diffing CLI as everything else. Moving rather than duplicating matters: two
 * sources for the same 44 rows drift, and the drift shows up as a lesson
 * teaching one articulation while the matrix labels another.
 *
 * Twelve vowels, eight diphthongs, twenty-four consonants.
 *
 * `banglaEquivalent: null` means **Bangla has no such sound** — data, not a
 * gap — and the schema refuses such an entry unless it also records what
 * Bengali speakers produce instead, because that substitution is the thing the
 * lesson teaches against. **Fifteen of the 44** are in that position, and they
 * are where a Bengali speaker's accent actually lives: ɜː ə əʊ ɪə eə ʊə t d v θ
 * ð z ʒ r w — the labiodental and dental fricatives Bangla lacks outright, the
 * two alveolar stops it splits into dental and retroflex with nothing between,
 * the centring diphthongs, and the unstressed central vowel it does not reduce
 * to at all.
 */
export const PHONEMES: readonly PhonemeEntry[] = [
  {
    symbol: 'iː',
    type: 'vowel',
    banglaEquivalent: 'ই',
    articulationNote:
      'Close front unrounded. The tongue is high and forward, the lips spread, and the vowel is held long.',
    commonBengaliSubstitution:
      'Produced as short ই. Length is not contrastive in Bangla, so seat and sit fall together.',
    needsReview: false,
  },
  {
    symbol: 'ɪ',
    type: 'vowel',
    banglaEquivalent: 'ই',
    articulationNote:
      'Near-close near-front unrounded, lax and short. The tongue sits lower and more central than for the long vowel.',
    commonBengaliSubstitution:
      'Produced as the same ই used for the long vowel, so sit and seat sound alike.',
    needsReview: false,
  },
  {
    symbol: 'e',
    type: 'vowel',
    banglaEquivalent: 'এ',
    articulationNote:
      'Mid front unrounded. The lips are neutral and the jaw only slightly open.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'æ',
    type: 'vowel',
    banglaEquivalent: 'অ্যা',
    articulationNote:
      'Near-open front unrounded. The jaw drops further than for the mid front vowel.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'ɑː',
    type: 'vowel',
    banglaEquivalent: 'আ',
    articulationNote:
      'Open back unrounded, held long. The tongue is low and pulled back.',
    commonBengaliSubstitution:
      'Produced as the central আ, which sits further forward than the English back vowel.',
    needsReview: false,
  },
  {
    symbol: 'ɒ',
    type: 'vowel',
    banglaEquivalent: 'অ',
    articulationNote:
      'Open back rounded and short, with light lip rounding.',
    commonBengaliSubstitution:
      'Produced as অ, which also serves the long back vowel and the mid central one, so cot, caught and cut converge.',
    needsReview: false,
  },
  {
    symbol: 'ɔː',
    type: 'vowel',
    banglaEquivalent: 'অ',
    articulationNote:
      'Open-mid back rounded, held long, with firm lip rounding.',
    commonBengaliSubstitution:
      'Produced as short অ or as ও, which moves caught towards coat.',
    needsReview: false,
  },
  {
    symbol: 'ʊ',
    type: 'vowel',
    banglaEquivalent: 'উ',
    articulationNote:
      'Near-close near-back rounded, lax and short.',
    commonBengaliSubstitution:
      'Produced as উ, the same vowel used for the long one, so full and fool merge.',
    needsReview: false,
  },
  {
    symbol: 'uː',
    type: 'vowel',
    banglaEquivalent: 'উ',
    articulationNote:
      'Close back rounded, held long. The tongue is high and back and the lips are tightly rounded.',
    commonBengaliSubstitution:
      'Produced as উ, so the contrast with the short vowel is lost.',
    needsReview: false,
  },
  {
    symbol: 'ʌ',
    type: 'vowel',
    banglaEquivalent: 'অ',
    articulationNote:
      'Open-mid back unrounded and short. The jaw is more open than for the unstressed central vowel.',
    commonBengaliSubstitution:
      'Produced as অ, which is rounded, so cut approaches cot.',
    needsReview: false,
  },
  {
    symbol: 'ɜː',
    type: 'vowel',
    banglaEquivalent: null,
    articulationNote:
      'Mid central unrounded, held long, lips neutral. In the standard accent the following r is not pronounced.',
    commonBengaliSubstitution:
      'No Bangla counterpart. আ or অ্যা is used and the র is sounded, so bird comes out as bard with an audible r.',
    needsReview: false,
  },
  {
    symbol: 'ə',
    type: 'vowel',
    banglaEquivalent: null,
    articulationNote:
      'Mid central, always unstressed and very short. It is the commonest vowel in English.',
    commonBengaliSubstitution:
      'Bangla does not reduce unstressed vowels, so the spelling vowel is given full value and about begins with আ.',
    needsReview: false,
  },
  {
    symbol: 'eɪ',
    type: 'diphthong',
    banglaEquivalent: 'এই',
    articulationNote:
      'Glides from a mid front vowel towards a close front one. The first element is the longer of the two.',
    commonBengaliSubstitution:
      'Flattened to a single এ, so late sounds like a lengthened let.',
    needsReview: false,
  },
  {
    symbol: 'aɪ',
    type: 'diphthong',
    banglaEquivalent: 'আই',
    articulationNote:
      'Glides from an open central vowel towards a close front one.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'ɔɪ',
    type: 'diphthong',
    banglaEquivalent: 'ঐ',
    articulationNote:
      'Glides from an open-mid back rounded vowel towards a close front one.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'aʊ',
    type: 'diphthong',
    banglaEquivalent: 'আউ',
    articulationNote:
      'Glides from an open central vowel towards a close back rounded one.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'əʊ',
    type: 'diphthong',
    banglaEquivalent: null,
    articulationNote:
      'Glides from a mid central vowel towards a close back rounded one.',
    commonBengaliSubstitution:
      'Flattened to ও, so no and know lose the glide entirely.',
    needsReview: false,
  },
  {
    symbol: 'ɪə',
    type: 'diphthong',
    banglaEquivalent: null,
    articulationNote:
      'Glides from a near-close front vowel towards the unstressed central vowel. The r in the spelling is not pronounced.',
    commonBengaliSubstitution:
      'Produced as ই plus a full আ with an audible র, so here becomes hiyar.',
    needsReview: false,
  },
  {
    symbol: 'eə',
    type: 'diphthong',
    banglaEquivalent: null,
    articulationNote:
      'Glides from a mid front vowel towards the unstressed central vowel. The r in the spelling is not pronounced.',
    commonBengaliSubstitution:
      'Produced as এ plus a full আ with an audible র, so hair becomes heyar.',
    needsReview: false,
  },
  {
    symbol: 'ʊə',
    type: 'diphthong',
    banglaEquivalent: null,
    articulationNote:
      'Glides from a near-close back rounded vowel towards the unstressed central vowel.',
    commonBengaliSubstitution:
      'Produced as উ plus a full আ with an audible র, so tour becomes tuar.',
    needsReview: false,
  },
  {
    symbol: 'p',
    type: 'consonant',
    banglaEquivalent: 'প',
    articulationNote:
      'Voiceless bilabial stop. The lips close completely and then release.',
    commonBengaliSubstitution:
      'Bangla প is unaspirated while English p is aspirated at the start of a word, so pin can be heard as bin.',
    needsReview: false,
  },
  {
    symbol: 'b',
    type: 'consonant',
    banglaEquivalent: 'ব',
    articulationNote:
      'Voiced bilabial stop. The lips close and the vocal folds vibrate through the closure.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 't',
    type: 'consonant',
    banglaEquivalent: null,
    articulationNote:
      'Voiceless alveolar stop. The tongue tip touches the ridge behind the upper teeth.',
    commonBengaliSubstitution:
      'Bangla has dental ত and retroflex ট and nothing between them, so ট is substituted and t acquires a retroflex colour.',
    needsReview: false,
  },
  {
    symbol: 'd',
    type: 'consonant',
    banglaEquivalent: null,
    articulationNote:
      'Voiced alveolar stop. The tongue tip touches the ridge behind the upper teeth.',
    commonBengaliSubstitution:
      'Retroflex ড is substituted for the same reason as the voiceless one.',
    needsReview: false,
  },
  {
    symbol: 'k',
    type: 'consonant',
    banglaEquivalent: 'ক',
    articulationNote:
      'Voiceless velar stop. The back of the tongue presses against the soft palate.',
    commonBengaliSubstitution:
      'Bangla ক is unaspirated, so an initial k lacks the English release of breath.',
    needsReview: false,
  },
  {
    symbol: 'ɡ',
    type: 'consonant',
    banglaEquivalent: 'গ',
    articulationNote:
      'Voiced velar stop. The back of the tongue presses against the soft palate and the vocal folds vibrate.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'tʃ',
    type: 'consonant',
    banglaEquivalent: 'চ',
    articulationNote:
      'Voiceless post-alveolar affricate. A stop released slowly into a fricative.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'dʒ',
    type: 'consonant',
    banglaEquivalent: 'জ',
    articulationNote:
      'Voiced post-alveolar affricate.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'f',
    type: 'consonant',
    banglaEquivalent: 'ফ',
    articulationNote:
      'Voiceless labiodental fricative. The upper teeth rest on the lower lip and air is forced between them.',
    commonBengaliSubstitution:
      'ফ is [f] for most Bangladeshi speakers but an aspirated bilabial stop for many others, who produce fan as phan.',
    needsReview: false,
  },
  {
    symbol: 'v',
    type: 'consonant',
    banglaEquivalent: null,
    articulationNote:
      'Voiced labiodental fricative. As its voiceless partner, with the vocal folds vibrating.',
    commonBengaliSubstitution:
      'Absent from Bangla. ভ or ব is substituted, so very becomes bhery.',
    needsReview: false,
  },
  {
    symbol: 'θ',
    type: 'consonant',
    banglaEquivalent: null,
    articulationNote:
      'Voiceless dental fricative. The tongue tip sits against or between the teeth and air is forced through.',
    commonBengaliSubstitution:
      'Absent from Bangla. The dental stop থ is substituted, so think becomes tink.',
    needsReview: false,
  },
  {
    symbol: 'ð',
    type: 'consonant',
    banglaEquivalent: null,
    articulationNote:
      'Voiced dental fricative. As its voiceless partner, with the vocal folds vibrating.',
    commonBengaliSubstitution:
      'Absent from Bangla. The dental stop দ is substituted, so this becomes dis.',
    needsReview: false,
  },
  {
    symbol: 's',
    type: 'consonant',
    banglaEquivalent: 'স',
    articulationNote:
      'Voiceless alveolar fricative. A narrow groove along the tongue directs the air at the teeth.',
    commonBengaliSubstitution:
      'Bangla স is pronounced as শ in most positions, so see is often produced as she.',
    needsReview: false,
  },
  {
    symbol: 'z',
    type: 'consonant',
    banglaEquivalent: null,
    articulationNote:
      'Voiced alveolar fricative.',
    commonBengaliSubstitution:
      'Absent from Bangla. জ is substituted, so zoo becomes joo.',
    needsReview: false,
  },
  {
    symbol: 'ʃ',
    type: 'consonant',
    banglaEquivalent: 'শ',
    articulationNote:
      'Voiceless post-alveolar fricative. The tongue is drawn back and the lips are slightly rounded.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'ʒ',
    type: 'consonant',
    banglaEquivalent: null,
    articulationNote:
      'Voiced post-alveolar fricative. It never begins a native English word.',
    commonBengaliSubstitution:
      'Absent from Bangla. জ is substituted, so measure becomes mejar.',
    needsReview: false,
  },
  {
    symbol: 'h',
    type: 'consonant',
    banglaEquivalent: 'হ',
    articulationNote:
      'Voiceless glottal fricative. The vocal tract stays open and the breath is audible.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'm',
    type: 'consonant',
    banglaEquivalent: 'ম',
    articulationNote:
      'Voiced bilabial nasal. The lips close and the air escapes through the nose.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
  {
    symbol: 'n',
    type: 'consonant',
    banglaEquivalent: 'ন',
    articulationNote:
      'Voiced alveolar nasal. The tongue tip touches the ridge behind the upper teeth.',
    commonBengaliSubstitution:
      'Bangla ন is dental, articulated a little further forward than the English one.',
    needsReview: false,
  },
  {
    symbol: 'ŋ',
    type: 'consonant',
    banglaEquivalent: 'ঙ',
    articulationNote:
      'Voiced velar nasal. It never begins a word in English.',
    commonBengaliSubstitution:
      'The sound exists, but the spelling ng invites a following গ, so singer can gain a hard g.',
    needsReview: false,
  },
  {
    symbol: 'l',
    type: 'consonant',
    banglaEquivalent: 'ল',
    articulationNote:
      'Voiced alveolar lateral. The air passes around the sides of the tongue.',
    commonBengaliSubstitution:
      'Bangla ল is always clear, so the dark l English uses after a vowel is not distinguished.',
    needsReview: false,
  },
  {
    symbol: 'r',
    type: 'consonant',
    banglaEquivalent: null,
    articulationNote:
      'Voiced post-alveolar approximant. The tongue tip approaches the ridge without touching it.',
    commonBengaliSubstitution:
      'Bangla র is a tap or a trill and is sounded wherever it is written, so car and park gain an audible r.',
    needsReview: false,
  },
  {
    symbol: 'w',
    type: 'consonant',
    banglaEquivalent: null,
    articulationNote:
      'Voiced labial-velar approximant. The lips round while the back of the tongue rises.',
    commonBengaliSubstitution:
      'Bangla has [w] only as a glide inside a syllable, never as a consonant of its own, so ভ or ও is substituted and west becomes bhest.',
    needsReview: false,
  },
  {
    symbol: 'j',
    type: 'consonant',
    banglaEquivalent: 'য়',
    articulationNote:
      'Voiced palatal approximant. The tongue rises close to the hard palate without contact.',
    commonBengaliSubstitution:
      null,
    needsReview: false,
  },
];
