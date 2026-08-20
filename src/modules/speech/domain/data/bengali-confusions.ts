import { type IPhonemeConfusion } from '../value-objects/phoneme-confusion';

/**
 * The errors a Bengali speaker actually makes in English, as **data**.
 *
 * `07-speech-scoring.md` says this is declared as an array and never as an `if`
 * chain, and the reason is not tidiness: the table below is content. It grows
 * when a teacher notices a pattern, and a branch per pattern would mean the
 * scorer is rewritten every time somebody learns something about learners.
 *
 * Every row here is a documented feature of Bengali phonology against English:
 * Bangla has no /v/, /z/, /θ/ or /ð/; its sibilant inventory pulls /s/ toward
 * /ʃ/; it has no /æ/; it does not permit word-initial /s/ + stop clusters, so a
 * vowel appears in front of them; and it has fixed initial prominence rather
 * than English's lexical stress. Each of those produces one predictable
 * substitution, which is exactly why partial credit is honest — the learner is
 * not guessing, they are transferring a rule that works in their first
 * language.
 */
export const BENGALI_CONFUSIONS: readonly IPhonemeConfusion[] = Object.freeze([
  {
    id: 'v-heard-as-w',
    kind: 'substitution',
    expected: 'v',
    commonlyHeardAs: ['w'],
    partialCredit: 0.5,
    articulationFix:
      'Rest your top teeth on your bottom lip and push the sound through them so it buzzes. /w/ uses no teeth at all — if your lips rounded, you said /w/.',
    banglaNote:
      'বাংলায় /v/ ধ্বনিটি নেই। উপরের দাঁত নিচের ঠোঁটে ছুঁইয়ে শব্দটি বের করুন — দাঁত লাগবেই।',
    graphemeShifts: [{ from: 'v', to: 'w' }],
  },
  {
    id: 'w-heard-as-v',
    kind: 'substitution',
    expected: 'w',
    commonlyHeardAs: ['v'],
    partialCredit: 0.5,
    articulationFix:
      'Round your lips as if you were about to say "oo", and keep every tooth away from your lip. Teeth touching lip is /v/, a different word.',
    banglaNote:
      'ঠোঁট গোল করুন, দাঁত ঠোঁটে একদম ছোঁয়াবেন না। দাঁত লাগলেই সেটি /v/ হয়ে যায়।',
    graphemeShifts: [{ from: 'w', to: 'v' }],
  },
  {
    id: 'theta-heard-as-t',
    kind: 'substitution',
    expected: 'θ',
    commonlyHeardAs: ['t', 'ʈ'],
    partialCredit: 0.5,
    articulationFix:
      'Put the tip of your tongue lightly between your teeth and blow — you should feel the air on your tongue. For /t/ the tongue hides behind the teeth and the air stops.',
    banglaNote:
      'জিভের ডগা দুই পাটি দাঁতের মাঝে রেখে হাওয়া ছাড়ুন। ‘ত’ বা ‘ট’-এ জিভ দাঁতের পিছনে থাকে, তাই ধ্বনিটি আলাদা।',
    graphemeShifts: [{ from: 'th', to: 't' }],
  },
  {
    id: 'eth-heard-as-d',
    kind: 'substitution',
    expected: 'ð',
    commonlyHeardAs: ['d', 'ɖ'],
    partialCredit: 0.5,
    articulationFix:
      'The same tongue-between-the-teeth position as /θ/, but with your voice switched on — put a hand on your throat and feel it vibrate.',
    banglaNote:
      'জিভের ডগা দাঁতের মাঝে রাখুন, তবে গলার স্বর চালু রাখুন। ‘দ’ বললে জিভ দাঁতের পিছনে চলে যায়।',
    graphemeShifts: [{ from: 'th', to: 'd' }],
  },
  {
    id: 'z-heard-as-j',
    kind: 'substitution',
    expected: 'z',
    commonlyHeardAs: ['dʒ'],
    partialCredit: 0.5,
    articulationFix:
      'Hold the sound. /z/ is a continuous buzz you can stretch for as long as your breath lasts; /dʒ/ begins with a stop and cannot be stretched.',
    banglaNote:
      '/z/ একটানা গুঞ্জনের মতো, ইচ্ছেমতো লম্বা করা যায়। ‘জ’ থেমে যায় — সেটিই পার্থক্য।',
    graphemeShifts: [{ from: 'z', to: 'j' }],
  },
  {
    id: 'esh-heard-as-s',
    kind: 'substitution',
    expected: 'ʃ',
    commonlyHeardAs: ['s'],
    partialCredit: 0.55,
    articulationFix:
      'Draw your tongue back from the teeth and round your lips slightly. /s/ is made with the tongue tip forward and the lips spread.',
    banglaNote: 'জিভ একটু পিছিয়ে নিন এবং ঠোঁট সামান্য গোল করুন — ‘শ’, ‘স’ নয়।',
    graphemeShifts: [{ from: 'sh', to: 's' }],
  },
  {
    id: 's-heard-as-esh',
    kind: 'substitution',
    expected: 's',
    commonlyHeardAs: ['ʃ'],
    partialCredit: 0.55,
    articulationFix:
      'Put your tongue tip close to the ridge behind your top teeth and spread your lips into a slight smile. Rounded lips turn /s/ into /ʃ/.',
    banglaNote:
      'বাংলায় ‘স’ অনেক সময় ‘শ’-এর মতো শোনায়। জিভের ডগা উপরের দাঁতের পিছনের মাড়িতে রেখে ঠোঁট ছড়িয়ে রাখুন।',
    graphemeShifts: [{ from: 's', to: 'sh' }],
  },
  {
    id: 'ash-heard-as-e',
    kind: 'substitution',
    expected: 'æ',
    commonlyHeardAs: ['e', 'ɛ'],
    partialCredit: 0.55,
    articulationFix:
      'Open your mouth wider and let your jaw drop. /æ/ sits lower and lasts longer than /e/ — think of the doctor asking you to say "aah".',
    banglaNote: 'মুখ আরও বড় করে হাঁ করুন এবং চোয়াল নামান। এটি ‘অ্যা’ ধ্বনি, ‘এ’ নয়।',
    graphemeShifts: [{ from: 'a', to: 'e' }],
  },
  {
    id: 'epenthesis-before-sk',
    kind: 'epenthesis',
    expected: 's',
    commonlyHeardAs: ['ɪs', 'is'],
    partialCredit: 0.5,
    articulationFix:
      'Begin on the /s/ itself — no vowel in front of it. Hiss first, then let the /k/ follow immediately: s-k, not i-s-k.',
    banglaNote:
      'বাংলায় শব্দের শুরুতে দুটি ব্যঞ্জন পাশাপাশি বসে না, তাই আগে একটি ‘ই’ যোগ হয়ে যায়। শব্দটি সরাসরি ‘স’ দিয়ে শুরু করুন।',
    graphemeShifts: [
      { from: 'sch', to: 'isch' },
      { from: 'sk', to: 'isk' },
      { from: 'sc', to: 'isc' },
    ],
  },
  {
    id: 'epenthesis-before-sp',
    kind: 'epenthesis',
    expected: 's',
    commonlyHeardAs: ['ɪs', 'is'],
    partialCredit: 0.5,
    articulationFix:
      'Start the word on the /s/ and close straight onto the /p/. Anything before the /s/ is an extra syllable the word does not have.',
    banglaNote:
      'শব্দের শুরুতে কোনো স্বর যোগ করবেন না। ‘স’ দিয়েই শুরু করে সঙ্গে সঙ্গে ‘প’ আনুন।',
    graphemeShifts: [{ from: 'sp', to: 'isp' }],
  },
  {
    id: 'epenthesis-before-st',
    kind: 'epenthesis',
    expected: 's',
    commonlyHeardAs: ['ɪs', 'is'],
    partialCredit: 0.5,
    articulationFix:
      'Hold the /s/ for a moment and release it directly into the /t/. The word has one syllable fewer than you are giving it.',
    banglaNote:
      'বাংলায় ‘স্ট’ শুরুতে বসে না বলে আগে ‘ই’ চলে আসে। ‘স’ দিয়ে শুরু করে সরাসরি ‘ট’-এ যান।',
    graphemeShifts: [{ from: 'st', to: 'ist' }],
  },
  {
    id: 'final-cluster-dropped',
    kind: 'cluster-drop',
    expected: 't',
    commonlyHeardAs: [''],
    partialCredit: 0.45,
    articulationFix:
      'Finish the word. The last consonant is doing grammatical work — it is what makes the verb past or the noun plural — so it has to be heard.',
    banglaNote:
      'শব্দের শেষের সব ব্যঞ্জন উচ্চারণ করুন। শেষ ধ্বনিটি ছেড়ে দিলে অতীত কাল বা বহুবচন হারিয়ে যায়।',
    graphemeShifts: [],
  },
  {
    id: 'first-syllable-stress',
    kind: 'stress',
    expected: 'ˈ',
    commonlyHeardAs: [''],
    partialCredit: 0.6,
    articulationFix:
      'Every sound was right; the emphasis was not. Say the marked syllable louder and longer than the others and leave the rest light.',
    banglaNote:
      'ইংরেজি শব্দে নির্দিষ্ট একটি অক্ষরে জোর পড়ে। বাংলার মতো প্রথম অক্ষরে জোর দিলে শব্দটি অন্যরকম শোনায় — চিহ্নিত অক্ষরটিতে জোর দিন।',
    graphemeShifts: [],
  },
] as const satisfies readonly IPhonemeConfusion[]);
