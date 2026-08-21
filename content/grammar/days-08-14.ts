import { type GrammarDayEntry } from './schema';

/**
 * Week 2 — time.
 *
 * Seven days that cover every tense IELTS actually asks for. The order follows
 * the exam rather than the textbook: the past comes first because Speaking Part
 * 2 is almost always a story about something that happened, then the perfect
 * tenses, then the futures, and the week closes by putting all twelve in one
 * table so the learner chooses rather than guesses.
 *
 * The present perfect (day 10) gets a whole day and the longest mistake list in
 * the course. It is the tense Bangla has no clean equivalent for — "আমি গিয়েছি"
 * covers both *I went* and *I have gone* — so the boundary has to be taught
 * explicitly rather than felt.
 */
export const GRAMMAR_DAYS_08_14: readonly GrammarDayEntry[] = [
  {
    dayIndex: 8,
    title: 'Past simple — finished and gone',
    banglaTitle: 'Past simple — শেষ হয়ে যাওয়া কাজ',
    goal: 'You can tell any finished story in the past, with regular and irregular verbs, questions and negatives.',
    ieltsWhy:
      'Speaking Part 2 is a two-minute story about something that already happened — a place you visited, a person you met. It is graded largely on whether you can hold this tense for two minutes without slipping.',
    minutes: 30,
    sections: [
      {
        heading: 'One rule: it is over',
        plain:
          'Use the past simple when the action is finished and the time it happened in is also finished. Yesterday, last year, in 2015, two days ago, when I was a child. If you can name the finished time, this is your tense. It does not matter whether it happened a minute ago or a century ago — only that it is closed.',
        bangla: 'কাজটি শেষ, আর সময়টিও শেষ — তখনই past simple।',
        examples: [
          { english: 'I visited my village last month.' },
          { english: 'The company opened in 1998.' },
          { english: 'She graduated two years ago.' },
        ],
      },
      {
        heading: 'Regular verbs: add -ed',
        plain:
          'Most verbs simply take -ed: work became worked, visit became visited, play became played. If the verb already ends in e, add only d: live became lived. If it ends in consonant + y, the y becomes ied: study became studied. And a short verb ending in one vowel plus one consonant doubles that consonant: stop became stopped.',
        bangla: 'সাধারণ ক্রিয়ায় শেষে -ed যোগ হয়; বানানের কয়েকটি ছোট নিয়ম আছে।',
        examples: [
          { english: 'work → worked, watch → watched' },
          { english: 'live → lived, agree → agreed', note: 'already ends in e' },
          { english: 'study → studied, carry → carried' },
          { english: 'stop → stopped, plan → planned' },
        ],
      },
      {
        heading: 'Irregular verbs: no rule, only memory',
        plain:
          'About a hundred common verbs ignore -ed completely and change shape instead. Go became went. See became saw. Take became took. There is no pattern to work out and no shortcut — these are learned as a list, a few at a time, and they are worth the effort because they are the most frequent verbs in the language. Learn the ten below first; they cover a large share of everything you will say.',
        bangla: 'অনিয়মিত ক্রিয়াগুলোর কোনো নিয়ম নেই — মুখস্থ করা ছাড়া উপায় নেই।',
        examples: [
          { english: 'go → went, come → came, see → saw' },
          { english: 'take → took, give → gave, make → made' },
          { english: 'have → had, do → did, say → said, get → got' },
        ],
        table: {
          caption: 'Ten irregular verbs worth knowing today',
          headers: ['Now', 'Past', 'Example'],
          rows: [
            ['go', 'went', 'I went to Cox’s Bazar'],
            ['see', 'saw', 'We saw the sunrise'],
            ['take', 'took', 'It took four hours'],
            ['give', 'gave', 'She gave me advice'],
            ['make', 'made', 'They made a decision'],
            ['have', 'had', 'I had no choice'],
            ['do', 'did', 'He did the work'],
            ['say', 'said', 'She said nothing'],
            ['get', 'got', 'I got the results'],
            ['buy', 'bought', 'We bought tickets'],
          ],
        },
      },
      {
        heading: 'did — and the verb goes back to plain',
        plain:
          'For negatives and questions the past hides inside the helper "did", and the main verb returns to its base form. "I went" becomes "I did not go", not "I did not went". "She saw it" becomes "Did she see it?" Once "did" is in the sentence it carries the past tense alone, and the main verb must not carry it as well. This is the single most common past-tense error there is.',
        bangla: '"did" এলে মূল ক্রিয়া তার সাধারণ রূপে ফিরে যায় — did not went নয়, did not go।',
        examples: [
          { english: 'I did not go to the meeting.', note: 'go, not went' },
          { english: 'Did you see the report?', note: 'see, not saw' },
          { english: 'She did not understand the question.' },
          { english: 'Where did they live before?' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'I did not went to the party.',
        right: 'I did not go to the party.',
        why: '"Did" is already the past. Two words carrying the same tense is like writing the date twice on one line.',
      },
      {
        wrong: 'Yesterday I have visited my uncle.',
        right: 'Yesterday I visited my uncle.',
        why: 'A named finished time such as "yesterday" cannot be used with the present perfect. Finished time means past simple.',
      },
      {
        wrong: 'She buyed a new phone.',
        right: 'She bought a new phone.',
        why: '"Buy" is irregular. Adding -ed to an irregular verb is a guess, and the list has to be learned instead.',
      },
      {
        wrong: 'When I was child, I am playing cricket every day.',
        right: 'When I was a child, I played cricket every day.',
        why: 'Two errors that travel together: the missing article, and a present tense inside a past story. A habit in the past takes the past simple.',
      },
    ],
    ieltsMoves: [
      'Last year I visited a place that I had always wanted to see.',
      'The figure fell sharply in 2008 and then recovered.',
      'When I was younger, I spent most weekends with my cousins.',
      'It was one of the most memorable experiences of my life.',
    ],
    checks: [
      {
        prompt: 'Fix: "Did you went there?"',
        answer: 'Did you go there?',
        why: '"Did" holds the past tense, so "go" stays in its base form.',
      },
      {
        prompt: 'Past of "teach"?',
        answer: 'taught',
        why: 'Irregular. There is no "teached".',
      },
      {
        prompt: 'Fill in: "The population ___ (grow) rapidly between 1980 and 1990."',
        answer: 'grew',
        why: 'A finished period, so past simple — and grow is irregular.',
      },
      {
        prompt: 'Why is "I have seen him yesterday" wrong?',
        answer: '"Yesterday" is a finished time, so it needs "I saw him yesterday".',
        why: 'The present perfect refuses a named finished time. Day 10 explains the whole boundary.',
      },
    ],
  },
  {
    dayIndex: 9,
    title: 'Past continuous — the interrupted picture',
    banglaTitle: 'Past continuous — যা চলছিল',
    goal: 'You can set the background of a story and show one action interrupting another.',
    ieltsWhy:
      'It is what turns a flat list of events in Part 2 into a story: "I was waiting at the station when I met an old friend." Examiners hear the tense pairing and mark it as range.',
    minutes: 20,
    sections: [
      {
        heading: 'was / were + verb-ing',
        plain:
          'Take was or were and add an -ing verb. I was working. They were waiting. It means the action was in the middle of happening at some past moment — not finished, just running. Was goes with I, he, she and it; were goes with you, we and they.',
        bangla: 'was/were + ক্রিয়া-ing। অতীতের কোনো মুহূর্তে কাজটি চলছিল, শেষ হয়নি।',
        examples: [
          { english: 'I was studying when you called.' },
          { english: 'They were living in Khulna at that time.' },
          { english: 'It was raining all morning.' },
        ],
      },
      {
        heading: 'The pair: long action, short interruption',
        plain:
          'This tense almost always works with the past simple. The long action that was already running takes the continuous; the short action that cuts into it takes the simple. "I was crossing the road when a car stopped." Crossing was going on; stopped happened in a second. Use "while" for the long one and "when" for the short one, and the sentence builds itself.',
        bangla: 'যা চলছিল তা continuous, আর যা হঠাৎ ঘটল তা simple — while দীর্ঘ কাজের সঙ্গে, when হঠাৎ কাজের সঙ্গে।',
        examples: [
          { english: 'I was cooking when the power went out.' },
          { english: 'While we were waiting, the announcement came.' },
          { english: 'She was giving a presentation when the projector failed.' },
        ],
        table: {
          caption: 'Which half takes which tense',
          headers: ['The long action', 'The short action'],
          rows: [
            ['I was walking home', 'when it started to rain'],
            ['While they were talking', 'the meeting began'],
            ['He was driving', 'when he saw the accident'],
          ],
        },
      },
      {
        heading: 'Setting a scene',
        plain:
          'Use it at the start of a story to paint the background before anything happens. "It was a hot afternoon. People were queuing outside the office and the traffic was moving slowly." Nothing has happened yet — you are describing the picture. Then you switch to the past simple for the event. This is exactly the structure a Part 2 answer wants.',
        bangla: 'গল্পের শুরুতে পরিবেশ বোঝাতে এই কাল ব্যবহার করুন, তারপর ঘটনা বলতে past simple-এ যান।',
        examples: [
          { english: 'The sun was setting and the birds were returning.' },
          { english: 'Everyone was waiting quietly. Then the door opened.' },
        ],
      },
      {
        heading: 'The same state verbs still refuse -ing',
        plain:
          'Day 4’s list applies here too. Know, understand, want, believe and the rest have no continuous form in any tense. "I was knowing the answer" is wrong in exactly the way "I am knowing" was wrong. Use the past simple instead: "I knew the answer."',
        bangla: 'know, want, believe — অতীতেও এদের -ing রূপ হয় না।',
        examples: [
          { english: 'I was knowing him for years.', note: 'wrong' },
          { english: 'I had known him for years.', note: 'right — day 12' },
          { english: 'She was wanting to leave.', note: 'wrong' },
          { english: 'She wanted to leave.', note: 'right' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'While I was studying, my phone was ringing.',
        right: 'While I was studying, my phone rang.',
        why: 'The interruption is a short event, so it takes the past simple. Two continuous halves make it sound as if the phone rang for an hour.',
      },
      {
        wrong: 'I was going to school every day when I was young.',
        right: 'I went to school every day when I was young.',
        why: 'A repeated habit in the past takes the past simple. The continuous is for one stretch of time, not a routine.',
      },
      {
        wrong: 'They was waiting outside.',
        right: 'They were waiting outside.',
        why: '"They" is plural, so it takes "were". Was belongs to I, he, she and it.',
      },
      {
        wrong: 'When the teacher entered, we were stand up.',
        right: 'When the teacher entered, we stood up.',
        why: 'Two problems: "were" needs an -ing form after it, and standing up is a short reaction, so it belongs in the past simple.',
      },
    ],
    ieltsMoves: [
      'I was travelling to Sylhet when I first noticed the change.',
      'While the government was introducing the policy, prices continued to rise.',
      'At that time, more and more people were moving to the cities.',
      'Everything was going smoothly until the final week.',
    ],
    checks: [
      {
        prompt: 'Fill in: "I ___ (watch) TV when the lights went out."',
        answer: 'was watching',
        why: 'The long action running in the background takes the continuous.',
      },
      {
        prompt: 'Fill in: "While she ___ (cook), the guests arrived."',
        answer: 'was cooking',
        why: '"While" marks the long action.',
      },
      {
        prompt: 'Fix: "I was understanding the lecture."',
        answer: 'I understood the lecture.',
        why: '"Understand" is a state verb and has no -ing form.',
      },
      {
        prompt: 'was or were: "The children ___ playing outside."',
        answer: 'were',
        why: 'Children is plural.',
      },
    ],
  },
  {
    dayIndex: 10,
    title: 'Present perfect — the bridge to now',
    banglaTitle: 'Present perfect — অতীত যা এখনও গুরুত্বপূর্ণ',
    goal: 'You know exactly when to say "I have done" instead of "I did", and you use since, for, already, yet and just correctly.',
    ieltsWhy:
      'This tense is the clearest single marker between band 5 and band 7. It appears whenever you talk about experience ("I have never been abroad"), about change up to now ("the situation has improved"), and in every Task 1 summary of a period that reaches the present.',
    minutes: 35,
    sections: [
      {
        heading: 'have / has + the third form',
        plain:
          'The form is have or has plus the third form of the verb — what dictionaries call the past participle. Go, went, GONE. See, saw, SEEN. Work, worked, WORKED. Regular verbs use the same word as the past simple; irregular verbs often have a separate third form, and that third form is the one you need here. Use "has" for he, she and it, and "have" for everyone else.',
        bangla: 'have/has + ক্রিয়ার তৃতীয় রূপ। অনিয়মিত ক্রিয়ার ক্ষেত্রে তৃতীয় রূপটি আলাদা।',
        examples: [
          { english: 'I have finished the report.' },
          { english: 'She has gone to Dhaka.', note: 'has, because it is she' },
          { english: 'They have seen the results.' },
        ],
        table: {
          caption: 'Three forms of common irregular verbs',
          headers: ['Now', 'Past', 'Third form'],
          rows: [
            ['go', 'went', 'gone'],
            ['see', 'saw', 'seen'],
            ['do', 'did', 'done'],
            ['write', 'wrote', 'written'],
            ['take', 'took', 'taken'],
            ['give', 'gave', 'given'],
            ['be', 'was / were', 'been'],
          ],
        },
      },
      {
        heading: 'The whole idea in one line: the past that still counts',
        plain:
          'Use this tense when something happened before now, but the time is not finished or the result still matters today. "I have lost my keys" means they are still lost. "I lost my keys" is just a report from yesterday. This is the hard part for Bengali speakers, because Bangla often uses one form where English splits into two — so the test has to be conscious: is the time finished, and does it still matter?',
        bangla: 'বাংলায় "আমি গিয়েছি" দুটোই বোঝায়, ইংরেজিতে দুটি আলাদা কাল — সময় শেষ হয়েছে কি না, সেটাই পার্থক্য।',
        examples: [
          { english: 'I have lost my wallet.', note: 'it is still missing' },
          { english: 'I lost my wallet last week.', note: 'a finished report' },
          { english: 'The government has introduced a new rule.', note: 'the rule is in force now' },
          { english: 'Prices have risen sharply.', note: 'and they are still high' },
        ],
      },
      {
        heading: 'The line you may not cross: finished time',
        plain:
          'If you name a finished time — yesterday, last year, in 2010, two days ago, when I was young — you must use the past simple. It is not a preference; the two cannot appear together. "I have seen him yesterday" is simply not English. Remove the time word and the perfect becomes correct again: "I have seen him."',
        bangla: 'yesterday, last year, in 2010 — এমন শেষ হওয়া সময় থাকলে present perfect ব্যবহার করা যাবে না।',
        examples: [
          { english: 'I have visited Nepal in 2019.', note: 'wrong — 2019 is finished' },
          { english: 'I visited Nepal in 2019.', note: 'right' },
          { english: 'I have visited Nepal.', note: 'also right — no time named' },
          { english: 'I have visited Nepal three times.', note: 'right — counting experience, not naming a date' },
        ],
      },
      {
        heading: 'since and for — the two that go together',
        plain:
          'SINCE names the point where it started: since 2019, since Monday, since I was a child. FOR names how long it has lasted: for three years, for two hours, for a long time. Both need this tense, because both describe something that started in the past and is still true. "I have lived here since 2019" and "I have lived here for six years" say the same thing two ways.',
        bangla: 'since = কবে থেকে শুরু, for = কতদিন ধরে। দুটোতেই present perfect লাগে।',
        examples: [
          { english: 'I have worked here since 2020.', note: 'a starting point' },
          { english: 'I have worked here for five years.', note: 'a length of time' },
          { english: 'We have known each other since school.' },
          { english: 'She has been ill for a week.' },
        ],
      },
      {
        heading: 'already, yet, just, never, ever',
        plain:
          'These five live with this tense. ALREADY means sooner than expected and goes in the middle. YET means not up to now and goes at the end of negatives and questions. JUST means a moment ago. NEVER and EVER are for life experience: "Have you ever been abroad?" "No, I have never left the country."',
        bangla: 'already, yet, just, never, ever — এই শব্দগুলো present perfect-এর সঙ্গেই চলে।',
        examples: [
          { english: 'I have already submitted the form.' },
          { english: 'I have not finished yet.' },
          { english: 'She has just left the office.' },
          { english: 'Have you ever taken the test before?' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'I have gone to Cox’s Bazar last year.',
        right: 'I went to Cox’s Bazar last year.',
        why: '"Last year" is finished, and the present perfect cannot sit with a finished time. This is the most frequent tense error in the whole exam.',
      },
      {
        wrong: 'I am living here since 2018.',
        right: 'I have lived here since 2018. (or: I have been living here since 2018.)',
        why: '"Since" always needs a perfect tense, because it describes something that started in the past and continues now.',
      },
      {
        wrong: 'He has went to the bank.',
        right: 'He has gone to the bank.',
        why: 'After have or has you need the third form, not the past. Went is the past; gone is the third form.',
      },
      {
        wrong: 'I have finished my homework yesterday night.',
        right: 'I finished my homework last night.',
        why: 'Two fixes: a finished time forces the past simple, and English says "last night", never "yesterday night".',
      },
      {
        wrong: 'How long you are working here?',
        right: 'How long have you worked here?',
        why: '"How long" asks about a stretch reaching the present, which is exactly what this tense is for.',
      },
    ],
    ieltsMoves: [
      'Over the past decade, the situation has improved considerably.',
      'I have been interested in this subject since childhood.',
      'Technology has changed the way we communicate.',
      'There has been a significant rise in the number of applicants.',
    ],
    checks: [
      {
        prompt: 'Which is right: "I have seen that film last week" or "I saw that film last week"?',
        answer: 'I saw that film last week.',
        why: '"Last week" is a finished time, so the past simple is the only option.',
      },
      {
        prompt: 'since or for: "I have studied English ___ ten years."',
        answer: 'for',
        why: 'Ten years is a length of time. "Since" would need a starting point, such as "since 2015".',
      },
      {
        prompt: 'Fill in: "She ___ (not finish) the report yet."',
        answer: 'has not finished',
        why: '"Yet" belongs to the present perfect, and she takes "has".',
      },
      {
        prompt: 'Third form of "write"?',
        answer: 'written',
        why: 'Write, wrote, written. After have or has, you need the third one.',
      },
    ],
  },
  {
    dayIndex: 11,
    title: 'Present perfect continuous — how long it has been going on',
    banglaTitle: 'Present perfect continuous — কতক্ষণ ধরে চলছে',
    goal: 'You can stress the duration of something still happening, and you know when it differs from the plain perfect.',
    ieltsWhy:
      'It answers the Speaking question "How long have you been doing that?" naturally, and it upgrades Task 2 sentences about ongoing trends: "Governments have been investing heavily in renewable energy."',
    minutes: 25,
    sections: [
      {
        heading: 'have / has been + verb-ing',
        plain:
          'Three parts: have or has, then been, then the -ing verb. I have been studying. She has been working. It says the activity started in the past, has been running, and either is still running now or has only just stopped.',
        bangla: 'have/has + been + ক্রিয়া-ing। কাজটি শুরু হয়েছে এবং এখনও চলছে।',
        examples: [
          { english: 'I have been studying since morning.' },
          { english: 'She has been working here for three years.' },
          { english: 'It has been raining all day.' },
        ],
      },
      {
        heading: 'The difference from day 10',
        plain:
          'The plain perfect looks at the result; this one looks at the activity and its length. "I have written three essays" counts what is finished. "I have been writing essays all afternoon" says what I have been busy with, and does not claim any of them are done. When the sentence is about how long, choose this one.',
        bangla: 'ফলাফল বোঝালে present perfect, আর কতক্ষণ ধরে চলছে বোঝালে এই কাল।',
        examples: [
          { english: 'I have read that book.', note: 'finished — the result' },
          { english: 'I have been reading that book.', note: 'still in the middle of it' },
          { english: 'She has cooked dinner.', note: 'it is ready' },
          { english: 'She has been cooking for two hours.', note: 'the length of the activity' },
        ],
        table: {
          caption: 'Result or duration',
          headers: ['If you mean', 'Use', 'Example'],
          rows: [
            ['how many, how much, finished', 'have + third form', 'I have sent five emails'],
            ['how long, still going', 'have been + -ing', 'I have been sending emails all morning'],
          ],
        },
      },
      {
        heading: 'The visible result',
        plain:
          'It is also used to explain something you can see right now. "Your eyes are red — have you been crying?" "The roads are wet; it has been raining." The activity may have stopped, but the evidence has not, and that is what this tense points at.',
        bangla: 'এখন যা দেখা যাচ্ছে, তার কারণ বোঝাতেও এই কাল ব্যবহার হয়।',
        examples: [
          { english: 'I am tired because I have been working since six.' },
          { english: 'The ground is wet — it has been raining.' },
        ],
      },
      {
        heading: 'State verbs, one more time',
        plain:
          'Know, be, have (for possession), believe, understand — these still refuse -ing. So it is "I have known her for ten years", never "I have been knowing her". If the verb is on that list from day 4, use the plain present perfect and the sentence is still correct and still natural.',
        bangla: 'know, be, believe — এদের সঙ্গে এখানেও -ing বসবে না, সাধারণ present perfect ব্যবহার করুন।',
        examples: [
          { english: 'I have been knowing him since 2010.', note: 'wrong' },
          { english: 'I have known him since 2010.', note: 'right' },
          { english: 'We have had this car for six years.', note: 'right — have as possession' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'I am working here since 2019.',
        right: 'I have been working here since 2019.',
        why: '"Since" cannot go with a present tense. It needs a perfect form, because the situation stretches from the past to now.',
      },
      {
        wrong: 'She has been knowing me for years.',
        right: 'She has known me for years.',
        why: '"Know" is a state verb. It has no -ing form in any tense, so the plain perfect is used instead.',
      },
      {
        wrong: 'How long are you waiting?',
        right: 'How long have you been waiting?',
        why: '"How long" up to now requires a perfect tense; the present simple or continuous would mean something else entirely.',
      },
      {
        wrong: 'I have been finished my essay.',
        right: 'I have finished my essay.',
        why: 'Finishing is a single completed point, not an activity with a length. There is nothing to stretch out.',
      },
    ],
    ieltsMoves: [
      'I have been preparing for this examination for six months.',
      'Scientists have been warning about this problem for decades.',
      'The population has been growing steadily since the 1990s.',
      'People have been relying on public transport more than before.',
    ],
    checks: [
      {
        prompt: 'Fill in: "He ___ (wait) for two hours."',
        answer: 'has been waiting',
        why: 'The sentence is about how long, and waiting is an activity with a length.',
      },
      {
        prompt: 'Which is right: "I have been reading three books" or "I have read three books"?',
        answer: 'I have read three books.',
        why: 'A number counts finished results, so the plain perfect is needed.',
      },
      {
        prompt: 'Fix: "They are living here since 2015."',
        answer: 'They have been living here since 2015.',
        why: '"Since" forces a perfect tense.',
      },
      {
        prompt: 'Why is "I have been having a car for five years" wrong?',
        answer: '"Have" meaning possession is a state verb — say "I have had a car for five years".',
        why: 'State verbs take no -ing form, even when the meaning is about duration.',
      },
    ],
  },
  {
    dayIndex: 12,
    title: 'Past perfect — the earlier past',
    banglaTitle: 'Past perfect — অতীতের আগের অতীত',
    goal: 'You can show which of two past events happened first, and you can build sentences with by the time, before and after.',
    ieltsWhy:
      'It is the tense that makes a Part 2 story sound organised — "By the time I arrived, the ceremony had already started" — and it is required for the third conditional on day 17 and for reported speech on day 24.',
    minutes: 30,
    sections: [
      {
        heading: 'had + the third form',
        plain:
          'One form for every subject: had, plus the third form of the verb. I had finished. She had gone. They had left. No changes for he or she, which makes this the easiest tense in the language to build.',
        bangla: 'had + ক্রিয়ার তৃতীয় রূপ। সব কর্তার জন্য একই — এটাই সবচেয়ে সহজ গঠন।',
        examples: [
          { english: 'I had finished the work before he arrived.' },
          { english: 'She had already left when I called.' },
          { english: 'They had never seen snow before that trip.' },
        ],
      },
      {
        heading: 'Two past events, and which came first',
        plain:
          'You only need this tense when there are two things in the past and the order matters. The earlier one takes "had", the later one takes the past simple. "When I reached the station, the train had left." The train left first; I arrived second. Without "had", the sentence would mean the train left after I arrived, which is a different story.',
        bangla: 'অতীতের দুটি ঘটনার মধ্যে যেটি আগে ঘটেছে, সেটিতে had বসে।',
        examples: [
          { english: 'The film had started when we arrived.', note: 'started first' },
          { english: 'The film started when we arrived.', note: 'started as we came in — different meaning' },
          { english: 'He told me he had lost his phone.' },
        ],
        table: {
          caption: 'The order on a line',
          headers: ['First (earlier past)', 'Second (past simple)'],
          rows: [
            ['The train had left', 'when I arrived'],
            ['She had studied French', 'before she moved to Paris'],
            ['They had eaten', 'by the time we got there'],
          ],
        },
      },
      {
        heading: 'by the time, before, after, already',
        plain:
          'These words invite this tense. "By the time" means at or before that moment and nearly always takes it. "Before" and "after" already show the order, so the past simple is often enough — "I ate before I left" is fine — but "had" makes it explicit and is never wrong there.',
        bangla: 'by the time, already, never before — এই শব্দগুলোর সঙ্গে past perfect স্বাভাবিকভাবে আসে।',
        examples: [
          { english: 'By the time the results came out, I had already applied.' },
          { english: 'After I had submitted the form, I noticed the mistake.' },
          { english: 'I had never travelled alone before that year.' },
        ],
      },
      {
        heading: 'Past perfect continuous — and how long before that',
        plain:
          'The same idea with a length attached: had been plus -ing. "I had been waiting for an hour when the bus finally came." It says the waiting was going on, and had been going on for a while, before the second event happened. Use it when the duration before the past moment is the point.',
        bangla: 'had been + -ing — অতীতের কোনো মুহূর্তের আগে কাজটি কতক্ষণ ধরে চলছিল তা বোঝায়।',
        examples: [
          { english: 'I had been studying for three hours when the power went out.' },
          { english: 'She had been working there for a decade before she resigned.' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'When I arrived, the train already left.',
        right: 'When I arrived, the train had already left.',
        why: 'Without "had" the order is lost. The train leaving is the earlier of the two events, so it needs the earlier tense.',
      },
      {
        wrong: 'I had went to the office before the meeting.',
        right: 'I had gone to the office before the meeting.',
        why: 'After "had" comes the third form. Went is the past; gone is the third form.',
      },
      {
        wrong: 'Yesterday I had visited my aunt.',
        right: 'Yesterday I visited my aunt.',
        why: 'There is only one past event here. This tense needs a second, later event to be earlier than.',
      },
      {
        wrong: 'She said she has finished the work.',
        right: 'She said she had finished the work.',
        why: 'Inside reported speech, a past reporting verb pushes the tense one step back. Day 24 covers the whole shift.',
      },
    ],
    ieltsMoves: [
      'By the time I finished school, I had already decided on my career.',
      'Before the new policy was introduced, the situation had been deteriorating.',
      'I had never experienced anything like it before.',
      'The company had been struggling for years before it closed.',
    ],
    checks: [
      {
        prompt: 'Fill in: "When we arrived, the shop ___ (close)."',
        answer: 'had closed',
        why: 'It closed before we arrived, so it takes the earlier tense.',
      },
      {
        prompt: 'Fix: "He had ate before we came."',
        answer: 'He had eaten before we came.',
        why: '"Had" is followed by the third form: eat, ate, eaten.',
      },
      {
        prompt: 'Do you need "had" in: "I ate dinner and then watched TV"?',
        answer: 'No.',
        why: '"And then" already states the order, so the past simple twice is natural.',
      },
      {
        prompt: 'Fill in: "She ___ (wait) for an hour when the news came."',
        answer: 'had been waiting',
        why: 'A duration running up to a past moment takes had been + -ing.',
      },
    ],
  },
  {
    dayIndex: 13,
    title: 'The futures — will, going to, and the rest',
    banglaTitle: 'ভবিষ্যৎ কাল — will, going to এবং অন্যান্য',
    goal: 'You can choose between will, going to, the present continuous and the two perfect futures, and say why.',
    ieltsWhy:
      'Task 2 predictions need "will" and its hedged cousins; Speaking Part 1 and 3 ask about your plans, where "going to" and the present continuous are the natural answers. Using only "will" for everything is a band-6 habit.',
    minutes: 30,
    sections: [
      {
        heading: 'will — decided now, or predicted',
        plain:
          'Use will for two things: a decision you are making as you speak, and a prediction about the future. "I will help you" — decided this second. "It will rain tomorrow" — a prediction. Will never changes shape, and it is always followed by the plain verb: will go, never will goes and never will to go.',
        bangla: 'এই মুহূর্তে নেওয়া সিদ্ধান্ত আর ভবিষ্যদ্বাণী — এই দুটোর জন্য will।',
        examples: [
          { english: 'I will call you tomorrow.' },
          { english: 'Prices will probably rise next year.' },
          { english: 'She will not attend the meeting.' },
        ],
      },
      {
        heading: 'going to — already decided, or already visible',
        plain:
          'Use "going to" when the plan existed before you spoke, or when there is evidence in front of you right now. "I am going to study medicine" — I decided last year. "Look at those clouds, it is going to rain" — the evidence is in the sky. The difference from will is where the decision came from, not when the action happens.',
        bangla: 'আগে থেকেই ঠিক করা পরিকল্পনা, বা চোখের সামনের প্রমাণ — তখন going to।',
        examples: [
          { english: 'I am going to apply for a scholarship.', note: 'the plan already exists' },
          { english: 'Look at the sky — it is going to rain.', note: 'evidence now' },
          { english: 'They are going to build a new terminal.' },
        ],
        table: {
          caption: 'will or going to',
          headers: ['Situation', 'Use', 'Example'],
          rows: [
            ['deciding as you speak', 'will', 'The phone is ringing — I will get it'],
            ['a plan made earlier', 'going to', 'I am going to visit my uncle on Friday'],
            ['a prediction from opinion', 'will', 'I think prices will fall'],
            ['a prediction from evidence', 'going to', 'The clouds are dark — it is going to rain'],
          ],
        },
      },
      {
        heading: 'The present continuous for fixed arrangements',
        plain:
          'When something is arranged — a time agreed, a ticket bought, an appointment made — English uses the present continuous for the future. "I am meeting the doctor at four." "We are flying to Dubai on Sunday." It sounds more certain than "going to" because the arrangement is already in place.',
        bangla: 'সময় ঠিক করা, টিকিট কাটা — এমন নিশ্চিত ব্যবস্থার জন্য present continuous ভবিষ্যৎ বোঝায়।',
        examples: [
          { english: 'I am meeting my supervisor tomorrow morning.' },
          { english: 'The conference is starting on 3 March.' },
        ],
      },
      {
        heading: 'Future perfect and future continuous',
        plain:
          'Two more, and they are worth having for Task 2. "Will have + third form" says something will be finished by a future point: "By 2030, the population will have doubled." "Will be + -ing" says something will be in progress at a future point: "This time next year I will be studying abroad." Used once each, deliberately, they show range.',
        bangla: 'will have + তৃতীয় রূপ = ভবিষ্যতে শেষ হয়ে যাবে। will be + -ing = ভবিষ্যতে চলতে থাকবে।',
        examples: [
          { english: 'By 2030, most vehicles will have become electric.' },
          { english: 'In ten years, more people will be working remotely.' },
        ],
      },
      {
        heading: 'Time words kill the future tense',
        plain:
          'After when, if, before, after, until and as soon as, English does not use will — it uses the present, even though the meaning is future. "I will call you when I arrive", never "when I will arrive". This looks illogical and is one of the most reliable errors examiners look for.',
        bangla: 'when, if, before, until — এদের পরে will বসে না, present tense বসে।',
        examples: [
          { english: 'I will call you when I arrive.', note: 'not "when I will arrive"' },
          { english: 'If it rains, we will cancel the trip.', note: 'not "if it will rain"' },
          { english: 'We will start as soon as everyone is ready.' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'I will tell him when I will see him.',
        right: 'I will tell him when I see him.',
        why: 'After "when", English uses the present for a future meaning. The "will" belongs only in the main half of the sentence.',
      },
      {
        wrong: 'I am going to call you as soon as I will reach home.',
        right: 'I am going to call you as soon as I reach home.',
        why: 'Same rule: "as soon as" is one of the time words that refuse "will".',
      },
      {
        wrong: 'She will goes to university next year.',
        right: 'She will go to university next year.',
        why: '"Will" is always followed by the plain verb. It never takes an -s and never takes "to".',
      },
      {
        wrong: 'Next Friday I will meet my supervisor at 10 — it is already fixed.',
        right: 'Next Friday I am meeting my supervisor at 10.',
        why: 'Not an error of form but of choice: an arrangement already made is normally the present continuous, and choosing it shows control of the three futures.',
      },
    ],
    ieltsMoves: [
      'It is likely that this trend will continue over the next decade.',
      'By 2040, the majority of the population will have moved to urban areas.',
      'If governments do not act, the problem will become far worse.',
      'I am planning to take the test again in December.',
    ],
    checks: [
      {
        prompt: 'Fix: "I will help you when you will need me."',
        answer: 'I will help you when you need me.',
        why: '"When" takes the present, even for future meaning.',
      },
      {
        prompt: 'will or going to: "I have decided — I ___ study abroad."',
        answer: 'am going to',
        why: 'The decision was made before speaking.',
      },
      {
        prompt: 'Fill in: "By 2035, the city ___ (grow) by 40%."',
        answer: 'will have grown',
        why: '"By" a future point plus a completed change is the future perfect.',
      },
      {
        prompt: 'Which sounds most certain: "I will meet him", "I am going to meet him", "I am meeting him"?',
        answer: '"I am meeting him."',
        why: 'The present continuous signals a fixed arrangement, which is the strongest of the three.',
      },
    ],
  },
  {
    dayIndex: 14,
    title: 'All twelve tenses in one picture',
    banglaTitle: 'বারোটি কাল একসঙ্গে',
    goal: 'You can look at any sentence you are about to write and choose its tense on purpose, with a reason.',
    ieltsWhy:
      'Grammatical Range and Accuracy rewards variety used correctly. A candidate who moves between three tenses accurately outscores one who uses six carelessly, and this day is where the choosing becomes deliberate.',
    minutes: 30,
    sections: [
      {
        heading: 'Two questions, and the tense falls out',
        plain:
          'Every tense in English answers two questions. First: when — past, present or future? Second: what kind — a plain fact, something in progress, something completed before a point, or something in progress up to a point? Three times, four kinds, twelve tenses. Once you ask the two questions in that order, you are never choosing blindly.',
        bangla: 'প্রথমে জিজ্ঞেস করুন কখন, তারপর কী ধরনের — তিন সময় গুণ চার ধরন সমান বারোটি কাল।',
        examples: [
          { english: 'I work. / I am working. / I have worked. / I have been working.', note: 'present, four kinds' },
          { english: 'I worked. / I was working. / I had worked. / I had been working.', note: 'past' },
          { english: 'I will work. / I will be working. / I will have worked. / I will have been working.', note: 'future' },
        ],
        table: {
          caption: 'The twelve, with what each one is for',
          headers: ['Kind', 'Past', 'Present', 'Future'],
          rows: [
            ['simple — a plain fact', 'I worked', 'I work', 'I will work'],
            ['continuous — in progress', 'I was working', 'I am working', 'I will be working'],
            ['perfect — finished before a point', 'I had worked', 'I have worked', 'I will have worked'],
            ['perfect continuous — how long up to a point', 'I had been working', 'I have been working', 'I will have been working'],
          ],
        },
      },
      {
        heading: 'The four you will actually use most',
        plain:
          'In a real IELTS answer, four tenses carry almost everything: present simple for facts and opinions, past simple for stories, present perfect for change up to now, and future with will for predictions. Master those four completely and add the others where they genuinely fit. Range is not about using all twelve; it is about none of your choices being wrong.',
        bangla: 'চারটি কাল দিয়েই পরীক্ষার প্রায় সব কাজ চলে — বাকিগুলো প্রয়োজন অনুযায়ী যোগ করুন।',
        examples: [
          { english: 'Many people believe that education is the key.', note: 'present simple — an opinion' },
          { english: 'Last summer I travelled to Sylhet.', note: 'past simple — a story' },
          { english: 'The cost of living has risen sharply.', note: 'present perfect — change up to now' },
          { english: 'This problem will worsen unless action is taken.', note: 'will — a prediction' },
        ],
      },
      {
        heading: 'The three boundaries that decide most sentences',
        plain:
          'Three questions settle nearly every tense choice in the exam. Is the time finished? Then past simple, not present perfect. Is it a habit or is it happening now? Habit takes the simple, now takes the continuous. Is there a second, later past event? Then the earlier one takes "had". Ask those three and the common errors disappear.',
        bangla: 'সময় শেষ কি না, অভ্যাস না এখনকার কাজ, আর অতীতে দুটি ঘটনা আছে কি না — এই তিনটি প্রশ্নই বেশিরভাগ সিদ্ধান্ত নিয়ে নেয়।',
        examples: [
          { english: 'I have worked here since 2020.', note: 'the time is not finished' },
          { english: 'I worked there in 2019.', note: 'the time is finished' },
          { english: 'The train had left when I arrived.', note: 'a second, later event' },
        ],
      },
      {
        heading: 'Keeping one tense for a whole paragraph',
        plain:
          'A very common band-6 problem is not the wrong tense but a shifting one — a Part 2 story that starts in the past, slips into the present, and goes back again. Choose your tense for the paragraph, then hold it. Change tense only when the time genuinely changes, and let a time word signal it: "That was in 2018. Now, things are different."',
        bangla: 'একটি অনুচ্ছেদে একই কাল ধরে রাখুন; সময় সত্যিই বদলালে তবেই কাল বদলান।',
        examples: [
          { english: 'I visited the place in 2018. It was crowded and the weather was hot.', note: 'held' },
          { english: 'I visited the place in 2018. It is crowded and the weather is hot.', note: 'slipped' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'Last year I go to Dhaka and I am staying with my cousin.',
        right: 'Last year I went to Dhaka and stayed with my cousin.',
        why: 'The tense slips twice in one sentence. A finished time governs the whole sentence, not just its first half.',
      },
      {
        wrong: 'I am working here since three years.',
        right: 'I have been working here for three years.',
        why: 'Three errors in five words: the tense must be perfect, "since" must be "for" with a length, and the present cannot reach back to the past.',
      },
      {
        wrong: 'When I will finish my studies, I will look for a job.',
        right: 'When I finish my studies, I will look for a job.',
        why: 'The time-word rule from day 13: after "when", the present carries the future meaning.',
      },
      {
        wrong: 'The graph shows that the population was increasing since 1990.',
        right: 'The graph shows that the population has increased since 1990.',
        why: '"Since" reaches the present, so the past continuous cannot hold it. The perfect is the only tense that spans past to now.',
      },
    ],
    ieltsMoves: [
      'While the first figure remained stable, the second rose steadily.',
      'Although the situation has improved, serious problems remain.',
      'Before the policy was introduced, few people had considered the issue.',
      'If this trend continues, the gap will have widened considerably by 2040.',
    ],
    checks: [
      {
        prompt: 'Name the tense: "The number of users has been rising steadily."',
        answer: 'Present perfect continuous.',
        why: 'have/has + been + -ing: an activity running up to now, with the length in view.',
      },
      {
        prompt: 'Fix the tense slip: "Yesterday I meet my friend and we are going to the market."',
        answer: 'Yesterday I met my friend and we went to the market.',
        why: '"Yesterday" makes the whole sentence past.',
      },
      {
        prompt: 'Which tense for "a fact that is always true"?',
        answer: 'Present simple.',
        why: 'Facts and general truths never take a continuous form.',
      },
      {
        prompt: 'Which tense: "By the end of this year, I ___ (complete) the course."',
        answer: 'will have completed',
        why: 'Finished before a future point is the future perfect.',
      },
    ],
  },
];
