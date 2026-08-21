import { type GrammarDayEntry } from './schema';

/**
 * Week 1 — the machine of the sentence.
 *
 * Nothing here is an IELTS trick. It is the seven things every later day
 * assumes: what a sentence is made of, the verb *to be*, the two present
 * tenses, articles, countable and uncountable nouns, and the small prepositions
 * that leak marks in every part of the exam.
 *
 * The order is not arbitrary. Articles come after the present tenses because a
 * learner cannot practise *a* and *the* without a sentence to put them in, and
 * they come before everything in week 2 because a missing article is the single
 * most frequent error in Bengali speakers' writing — Bangla has no article at
 * all, so there is no habit to transfer, only one to build.
 */
export const GRAMMAR_DAYS_01_07: readonly GrammarDayEntry[] = [
  {
    dayIndex: 1,
    title: 'What a sentence is made of',
    banglaTitle: 'একটি বাক্য কী দিয়ে তৈরি',
    goal: 'You can point at any English sentence and name its subject, its verb and its object.',
    ieltsWhy:
      'Every mark in Writing and Speaking is given for sentences. The Grammatical Range and Accuracy criterion is a quarter of your Writing score, and it is judged on whether your sentences hold together — so the parts have to be visible to you before anything else can be.',
    minutes: 20,
    sections: [
      {
        heading: 'Three jobs: who, does what, to what',
        plain:
          'An English sentence is a small machine with three parts. First the subject — the person or thing the sentence is about. Then the verb — the action or the state. Then, often, the object — the thing the action lands on. "Rahim eats rice." Rahim is the subject, eats is the verb, rice is the object. That order almost never changes in English, and this is the first big difference from Bangla, where the verb goes last.',
        bangla: 'বাংলায় ক্রিয়া বাক্যের শেষে বসে, ইংরেজিতে ক্রিয়া কর্তার ঠিক পরেই বসে।',
        examples: [
          { english: 'Rahim eats rice.', note: 'subject → verb → object' },
          { english: 'The government built a bridge.', note: 'the subject can be more than one word' },
          { english: 'Students study.', note: 'no object at all — some verbs do not take one' },
        ],
        table: {
          caption: 'The same idea in both languages',
          headers: ['Bangla order', 'English order'],
          rows: [
            ['রহিম ভাত খায় (Rahim rice eats)', 'Rahim eats rice'],
            ['আমি বই পড়ি (I book read)', 'I read a book'],
            ['সে চা বানায় (He tea makes)', 'He makes tea'],
          ],
        },
      },
      {
        heading: 'Every sentence needs a verb — no exceptions',
        plain:
          'This is the rule that catches the most people. A group of words with no verb is not a sentence, however long it is. "The number of students in the university" is not a sentence — it is just a long name for a thing. Add a verb and it becomes one: "The number of students in the university increased." In Bangla you can leave the verb out and still be understood; in English you cannot.',
        bangla: 'বাংলায় ক্রিয়া ছাড়া বাক্য চলে, ইংরেজিতে চলে না — প্রতিটি বাক্যে একটি ক্রিয়া লাগবেই।',
        examples: [
          { english: 'The chart very interesting.', note: 'not a sentence — there is no verb' },
          { english: 'The chart is very interesting.', note: 'now it is a sentence' },
          { english: 'He a doctor.', note: 'not a sentence' },
          { english: 'He is a doctor.', note: 'the verb is is' },
        ],
      },
      {
        heading: 'The extras: where, when, how',
        plain:
          'After the three main parts you can add information. Where something happened, when it happened, how it happened. These go at the end, or sometimes at the front with a comma. What they must not do is get between the verb and the object. "I eat every day rice" is wrong; "I eat rice every day" is right.',
        bangla: 'কোথায়, কখন, কীভাবে — এগুলো বাক্যের শেষে বসে, ক্রিয়া আর কর্মের মাঝখানে নয়।',
        examples: [
          { english: 'She studies English at home.', note: 'where, at the end' },
          { english: 'She studies English every evening.', note: 'when, at the end' },
          { english: 'Every evening, she studies English.', note: 'or at the front, with a comma' },
        ],
      },
      {
        heading: 'Capital letter, full stop',
        plain:
          'A sentence starts with a capital letter and ends with a full stop, a question mark or an exclamation mark. In IELTS Writing this is marked. A whole paragraph written as one long line with commas instead of full stops costs marks under the same criterion as tenses, and it is the cheapest mistake there is to fix.',
        bangla: 'প্রতিটি বাক্য বড় হাতের অক্ষরে শুরু হবে আর দাঁড়ি (.) দিয়ে শেষ হবে।',
        examples: [
          { english: 'the graph shows three lines', note: 'wrong — no capital, no full stop' },
          { english: 'The graph shows three lines.', note: 'right' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'I rice eat.',
        right: 'I eat rice.',
        why: 'The Bangla order puts the verb last. English puts the verb straight after the subject, and moving it changes the sentence from clumsy to unreadable in longer writing.',
      },
      {
        wrong: 'The population of Dhaka very high.',
        right: 'The population of Dhaka is very high.',
        why: 'There is no verb in the first one. Bangla allows the "is" to be understood; English requires it to be written.',
      },
      {
        wrong: 'Yesterday I bought in the market vegetables.',
        right: 'Yesterday I bought vegetables in the market.',
        why: 'Nothing may sit between the verb and its object. The place goes after the object, not in front of it.',
      },
      {
        wrong: 'she is a teacher',
        right: 'She is a teacher.',
        why: 'A sentence needs a capital letter at the start and a full stop at the end. Both are marked in Writing.',
      },
    ],
    ieltsMoves: [
      'The graph shows the number of visitors between 2010 and 2020.',
      'This essay will discuss both views and give my own opinion.',
      'In my opinion, the advantages outweigh the disadvantages.',
      'The table compares the cost of housing in four cities.',
    ],
    checks: [
      {
        prompt: 'Put in order: English / every day / studies / she',
        answer: 'She studies English every day.',
        why: 'Subject (she), verb (studies), object (English), then the time at the end.',
      },
      {
        prompt: 'Is this a sentence? "The number of cars in the city."',
        answer: 'No — it has no verb.',
        why: 'It is only a long name for a thing. Add a verb: "The number of cars in the city rose."',
      },
      {
        prompt: 'Fix: "The report very clear."',
        answer: 'The report is very clear.',
        why: 'English never leaves out the verb "to be", even where Bangla would.',
      },
      {
        prompt: 'Find the subject: "The three largest companies employ 40,000 people."',
        answer: 'The three largest companies',
        why: 'The subject is everything the sentence is about, not just the last noun before the verb.',
      },
    ],
  },
  {
    dayIndex: 2,
    title: 'am, is, are — the verb "to be"',
    banglaTitle: 'am, is, are — "হওয়া" ক্রিয়া',
    goal: 'You can say what someone or something is, was, and will be, without ever adding an extra verb.',
    ieltsWhy:
      'This is the most used verb in the language and the backbone of Task 1 description ("the figure is highest in June") and of the passive voice, which arrives on day 18. Get it wrong and the error appears in every second sentence you write.',
    minutes: 20,
    sections: [
      {
        heading: 'One verb, three shapes',
        plain:
          'English changes this verb depending on who is doing it. I take am. He, she and it take is. You, we and they take are. There is no logic to learn here and nothing to work out — these three shapes are simply memorised, the way you memorised the alphabet. Say them out loud until the wrong one sounds wrong.',
        bangla: 'আমি → am, সে/এটি → is, তুমি/আমরা/তারা → are। এটি মুখস্থ করার জিনিস, বোঝার নয়।',
        examples: [
          { english: 'I am a student.' },
          { english: 'She is a doctor.' },
          { english: 'They are engineers.' },
          { english: 'The results are surprising.', note: 'results is plural, so are' },
        ],
        table: {
          caption: 'to be, present and past',
          headers: ['Subject', 'Now', 'Before'],
          rows: [
            ['I', 'am', 'was'],
            ['he / she / it', 'is', 'was'],
            ['you / we / they', 'are', 'were'],
          ],
        },
      },
      {
        heading: 'What it is for',
        plain:
          'This verb does not describe an action. It links the subject to what it is, where it is, or what it is like. "He is tired." "The office is in Dhaka." "The chart is clear." Whenever you are saying what something IS rather than what it DOES, this is the verb you need.',
        bangla: 'কেউ কী করছে তা নয় — কেউ বা কিছু কী, কেমন, বা কোথায়, তা বলার জন্য এই ক্রিয়া।',
        examples: [
          { english: 'The problem is serious.', note: 'what it is like' },
          { english: 'My family is in Sylhet.', note: 'where it is' },
          { english: 'He is the manager.', note: 'what he is' },
        ],
      },
      {
        heading: 'Saying no, and asking',
        plain:
          'To make it negative, put not straight after it: is not, are not, am not. In speech and informal writing these shrink to isn’t and aren’t — but write them in full in IELTS Writing, because short forms are informal. To ask a question, swap the first two words: "He is ready" becomes "Is he ready?" You do not add do or does. That is the commonest error with this verb.',
        bangla: 'প্রশ্ন করতে শুধু প্রথম দুটি শব্দ উল্টে দিন — "Is he ready?" এখানে do/does লাগে না।',
        examples: [
          { english: 'She is not ready.', note: 'negative' },
          { english: 'Is she ready?', note: 'question — just swap' },
          { english: 'Are the results reliable?' },
          { english: 'Why is the figure so low?', note: 'question word first, then the swap' },
        ],
      },
      {
        heading: 'Never two verbs doing one job',
        plain:
          'This is the trap. Words like agree, want, need, know, live and go are already verbs. They do not need am, is or are in front of them. "I am agree" is wrong because agree is doing the work on its own — "I agree" is the whole sentence. Only use am, is or are with an -ing word (I am working) or with a describing word (I am tired).',
        bangla: 'agree, want, know — এগুলো নিজেরাই ক্রিয়া, এদের আগে am/is/are বসে না।',
        examples: [
          { english: 'I am agree with you.', note: 'wrong — two verbs' },
          { english: 'I agree with you.', note: 'right' },
          { english: 'I am working now.', note: 'right — am plus an -ing word' },
          { english: 'I am tired.', note: 'right — am plus a describing word' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'I am agree with this statement.',
        right: 'I agree with this statement.',
        why: '"Agree" is already the verb. Adding "am" gives the sentence two verbs for one job. The same applies to disagree, want, need and know.',
      },
      {
        wrong: 'The data is showing two trends. Do it is correct?',
        right: 'Is that correct?',
        why: 'Questions with "to be" are made by swapping the subject and the verb. "Do" is never used to question is, am or are.',
      },
      {
        wrong: 'The number of students are increasing.',
        right: 'The number of students is increasing.',
        why: 'The subject is "the number", which is singular. "Of students" only describes it. The verb agrees with the head of the phrase, not the nearest noun.',
      },
      {
        wrong: 'He isn’t interested in the topic.',
        right: 'He is not interested in the topic.',
        why: 'Correct English, but short forms are informal. IELTS Writing is formal, so write both words out. In Speaking the short form is natural and better.',
      },
    ],
    ieltsMoves: [
      'The figure is highest in June and lowest in December.',
      'It is clear that the two trends are closely related.',
      'There are several reasons for this change.',
      'This is one of the most common arguments against the policy.',
    ],
    checks: [
      {
        prompt: 'Fill in: "The results ___ surprising."',
        answer: 'are',
        why: 'Results is plural, and plural subjects take "are".',
      },
      {
        prompt: 'Make it a question: "The chart is accurate."',
        answer: 'Is the chart accurate?',
        why: 'Swap the subject and the verb. No "do" is added.',
      },
      {
        prompt: 'Fix: "I am know the answer."',
        answer: 'I know the answer.',
        why: '"Know" is the verb already. It cannot follow "am".',
      },
      {
        prompt: 'Fill in: "The number of applications ___ risen."',
        answer: 'has',
        why: 'A trap — the subject is "the number", which is singular. This one is not "to be" at all, and day 10 explains the "has risen" form.',
      },
    ],
  },
  {
    dayIndex: 3,
    title: 'Present simple — facts and habits',
    banglaTitle: 'Present simple — নিয়মিত কাজ ও সত্য কথা',
    goal: 'You can talk about what is always true and what you regularly do, and you never forget the -s.',
    ieltsWhy:
      'Speaking Part 1 is almost entirely this tense — where you live, what you do, what you like. Task 2 essays state general truths in it: "Technology changes the way people work." A missing -s in either place is heard immediately.',
    minutes: 25,
    sections: [
      {
        heading: 'Two jobs: always true, and regularly done',
        plain:
          'Use this tense for two things. First, facts that do not change: water boils at 100 degrees, Dhaka is the capital, people need sleep. Second, things you do again and again: I get up at six, she works in a bank, they visit their village every Eid. Notice that neither of these is about right now — for right now, you need tomorrow’s tense.',
        bangla: 'যা সব সময় সত্যি, আর যা নিয়মিত করা হয় — এই দুটোর জন্য present simple।',
        examples: [
          { english: 'Water boils at 100 degrees Celsius.', note: 'a fact' },
          { english: 'I work in a hospital.', note: 'a regular situation' },
          { english: 'Most students take the test twice.', note: 'a habit' },
        ],
      },
      {
        heading: 'The -s that only he, she and it get',
        plain:
          'This is the rule everyone knows and everyone still breaks. With he, she or it — or any single person or thing — the verb takes an -s. I work, you work, we work, they work, but he works. It is one letter, it carries no meaning at all, and leaving it out is the most noticeable beginner mistake in English. The trick is to hear it: read your sentences aloud and listen for a missing s.',
        bangla: 'he, she, it বা একবচন কর্তার সঙ্গে ক্রিয়ার শেষে -s বসবেই। এটাই সবচেয়ে বেশি ভুল হয়।',
        examples: [
          { english: 'He works at a bank.', note: 'one person → works' },
          { english: 'They work at a bank.', note: 'more than one → work' },
          { english: 'The company employs 200 people.', note: 'a company is one thing → employs' },
          { english: 'She studies medicine.', note: 'study → studies, because y follows a consonant' },
        ],
        table: {
          caption: 'The three spellings of the -s',
          headers: ['Ending', 'Add', 'Example'],
          rows: [
            ['most verbs', '-s', 'work → works'],
            ['-s, -sh, -ch, -x, -o', '-es', 'watch → watches, go → goes'],
            ['consonant + y', 'y → ies', 'study → studies, carry → carries'],
          ],
        },
      },
      {
        heading: 'Saying no and asking: do and does',
        plain:
          'For everything except "to be", negatives and questions need a helper: do, or does for he, she and it. And here is the part that catches people — once you use does, the main verb loses its -s, because does is already carrying it. "He does not work" and never "He does not works". Same in questions: "Does she work here?"',
        bangla: 'না-বাচক ও প্রশ্নে do/does লাগে, আর does থাকলে মূল ক্রিয়া থেকে -s উঠে যায়।',
        examples: [
          { english: 'I do not agree with this view.' },
          { english: 'He does not agree with this view.', note: 'does, and agree loses its -s' },
          { english: 'Do you live in Dhaka?' },
          { english: 'Does the graph show a decline?', note: 'show, not shows' },
        ],
      },
      {
        heading: 'The words that go with it',
        plain:
          'Certain words almost always signal this tense: always, usually, often, sometimes, rarely, never, every day, once a week. They sit before the main verb but after "to be". "I always eat rice" but "I am always late". Learning that small difference in position is worth a lot in Speaking, where it happens constantly.',
        bangla: 'always, usually, often — এগুলো মূল ক্রিয়ার আগে বসে, কিন্তু is/am/are-এর পরে বসে।',
        examples: [
          { english: 'I usually study at night.', note: 'before the main verb' },
          { english: 'She is usually on time.', note: 'after "is"' },
          { english: 'We rarely eat outside.' },
          { english: 'He goes to the gym three times a week.', note: 'frequency at the end' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'He work in a bank.',
        right: 'He works in a bank.',
        why: 'Single third person always takes -s. This is the single most common grammar error for Bengali speakers in Speaking Part 1, and examiners notice it in the first minute.',
      },
      {
        wrong: 'She does not works here.',
        right: 'She does not work here.',
        why: '"Does" already carries the third-person -s. The main verb goes back to its plain form.',
      },
      {
        wrong: 'I am go to university every day.',
        right: 'I go to university every day.',
        why: '"Go" is the verb; it does not need "am" in front of it. "Am going" would be right, but it means something different — see day 4.',
      },
      {
        wrong: 'Every day I am eating rice.',
        right: 'Every day I eat rice.',
        why: 'A habit takes the present simple. The -ing form describes what is happening now, which "every day" contradicts.',
      },
    ],
    ieltsMoves: [
      'I live in Dhaka with my family.',
      'The chart shows how the figures change over a ten-year period.',
      'Many people believe that education solves this problem.',
      'In my country, students usually start school at the age of six.',
    ],
    checks: [
      {
        prompt: 'Fill in: "My brother ___ (study) engineering."',
        answer: 'studies',
        why: 'One person, and study ends in consonant + y, so y becomes ies.',
      },
      {
        prompt: 'Fix: "Does he lives in Chittagong?"',
        answer: 'Does he live in Chittagong?',
        why: '"Does" carries the -s, so the main verb is plain.',
      },
      {
        prompt: 'Where does "always" go? "She ___ arrives ___ early."',
        answer: 'She always arrives early.',
        why: 'Before the main verb. It would go after "is": "She is always early."',
      },
      {
        prompt: 'Fill in: "The government ___ (spend) 20% of its budget on health."',
        answer: 'spends',
        why: 'A government is one body, so it is treated as singular and takes -s.',
      },
    ],
  },
  {
    dayIndex: 4,
    title: 'Present continuous — happening now',
    banglaTitle: 'Present continuous — এখন চলছে এমন কাজ',
    goal: 'You can describe what is happening at this moment and what is changing over this period, and you know which verbs refuse the -ing form.',
    ieltsWhy:
      'Task 2 needs it for trends in progress ("the climate is changing"), Speaking Part 1 needs it for your current situation ("I am preparing for IELTS"), and Part 2 often needs it to set a scene. Choosing between this and the present simple is a band-marker.',
    minutes: 25,
    sections: [
      {
        heading: 'am / is / are + verb-ing',
        plain:
          'Take the verb "to be" from day 2 and add a verb with -ing on the end. I am working. She is studying. They are waiting. That is the whole form. Both parts are needed — "I working" is missing the first half and "I am work" is missing the second.',
        bangla: 'am/is/are + ক্রিয়া-ing। দুটো অংশই লাগবে, একটাও বাদ দেওয়া যাবে না।',
        examples: [
          { english: 'I am writing an essay.' },
          { english: 'The temperature is rising.' },
          { english: 'They are building a new road.' },
          { english: 'She is not listening.', note: 'negative — not goes in the middle' },
        ],
      },
      {
        heading: 'Three uses, not one',
        plain:
          'Right now, at this second: "He is sleeping." Around this period, though maybe not this second: "I am studying for IELTS this month." And a change in progress: "The population is growing." The third one is the one IELTS rewards, because it lets you talk about trends without a chart in front of you.',
        bangla: 'এই মুহূর্তে, এই সময়টা জুড়ে, আর যা ধীরে ধীরে বদলাচ্ছে — তিন রকম কাজে ব্যবহার হয়।',
        examples: [
          { english: 'Please be quiet — the baby is sleeping.', note: 'this second' },
          { english: 'I am reading a very good book at the moment.', note: 'this period' },
          { english: 'Cities are becoming more crowded.', note: 'a change in progress' },
        ],
      },
      {
        heading: 'The choice: now, or always?',
        plain:
          'This is the decision you make every time. If it is a habit or a fact, use the present simple. If it is happening now or changing now, use this tense. "I work in a bank" is my job. "I am working on a report" is what is on my desk today. Both are correct English; they just mean different things, and using the wrong one gives the examiner a different meaning from the one you intended.',
        bangla: 'অভ্যাস হলে present simple, এখন চলছে এমন হলে present continuous।',
        examples: [
          { english: 'I work in a bank.', note: 'my job, in general' },
          { english: 'I am working on a report.', note: 'right now' },
          { english: 'It rains a lot in Bangladesh.', note: 'a fact about the climate' },
          { english: 'Look — it is raining.', note: 'happening now' },
        ],
        table: {
          caption: 'Which one to reach for',
          headers: ['If you mean', 'Use', 'Example'],
          rows: [
            ['a habit or a routine', 'present simple', 'I go to the gym on Fridays'],
            ['a permanent fact', 'present simple', 'Water freezes at zero'],
            ['happening at this moment', 'present continuous', 'I am waiting for the bus'],
            ['a trend or a change', 'present continuous', 'Prices are increasing'],
          ],
        },
      },
      {
        heading: 'The verbs that refuse -ing',
        plain:
          'Some verbs describe a state rather than an activity, and English does not put them in the -ing form. Know, understand, believe, want, need, like, love, hate, own, belong, seem, prefer. You cannot be in the middle of knowing something — you either know it or you do not. So it is "I know the answer", never "I am knowing the answer". This is a short list and it is worth learning by heart.',
        bangla: 'know, want, need, believe — এসব ক্রিয়া অবস্থা বোঝায়, তাই এদের সঙ্গে -ing বসে না।',
        examples: [
          { english: 'I am knowing him.', note: 'wrong' },
          { english: 'I know him.', note: 'right' },
          { english: 'I am wanting a coffee.', note: 'wrong' },
          { english: 'I want a coffee.', note: 'right' },
          { english: 'I am thinking about the question.', note: 'right — here think is an activity, not an opinion' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'I am understanding the lesson now.',
        right: 'I understand the lesson now.',
        why: '"Understand" is a state. You cannot be in the middle of it, so English does not allow the -ing form.',
      },
      {
        wrong: 'She working in Dubai at the moment.',
        right: 'She is working in Dubai at the moment.',
        why: 'The form is two parts. Dropping the "is" is the same error as leaving out the verb entirely.',
      },
      {
        wrong: 'Every morning I am going to the office.',
        right: 'Every morning I go to the office.',
        why: '"Every morning" makes it a habit, and a habit takes the present simple. The two forms are fighting each other in the wrong version.',
      },
      {
        wrong: 'The number of users is increase rapidly.',
        right: 'The number of users is increasing rapidly.',
        why: 'After is/am/are the verb must carry -ing. Half the form is not the form.',
      },
    ],
    ieltsMoves: [
      'The world is changing faster than ever before.',
      'At the moment I am preparing for the IELTS examination.',
      'An increasing number of people are working from home.',
      'This trend is becoming more common in developing countries.',
    ],
    checks: [
      {
        prompt: 'Which is right: "I am living in Dhaka" or "I live in Dhaka"?',
        answer: 'Both — but they mean different things.',
        why: '"I live" is permanent. "I am living" suggests it is temporary, for now. Say what you mean.',
      },
      {
        prompt: 'Fix: "He is wanting to study abroad."',
        answer: 'He wants to study abroad.',
        why: '"Want" is a state verb and takes no -ing form.',
      },
      {
        prompt: 'Fill in: "Look at the graph — the line ___ (fall) sharply."',
        answer: 'is falling',
        why: 'It is describing a movement in progress, so is + -ing.',
      },
      {
        prompt: 'Fill in: "Bangladesh ___ (become) more urban every year."',
        answer: 'is becoming',
        why: 'A change in progress, which is exactly what this tense is for.',
      },
    ],
  },
  {
    dayIndex: 5,
    title: 'a, an, the — and when to use nothing',
    banglaTitle: 'a, an, the — আর কখন কিছুই বসবে না',
    goal: 'You can decide, for any noun you write, whether it needs a, an, the, or nothing at all.',
    ieltsWhy:
      'Bangla has no articles, so there is no habit to carry over — this is a rule Bengali speakers have to build from scratch, and it is the error examiners see most in Writing. Fixing it lifts accuracy across every sentence you produce.',
    minutes: 30,
    sections: [
      {
        heading: 'The one question that decides it',
        plain:
          'Ask yourself: does my reader already know which one I mean? If yes, use "the". If no, and there is only one of them, use "a" or "an". "I bought a book" — you do not know which book, it is new information. "The book was expensive" — now you do, because I just mentioned it. That is the whole system: "a" introduces, "the" refers back.',
        bangla: 'পাঠক কোনটার কথা বলছি জানলে "the", না জানলে "a/an"। এটাই মূল নিয়ম।',
        examples: [
          { english: 'I saw a car outside. The car was red.', note: 'a introduces, the refers back' },
          { english: 'Please close the door.', note: 'we both know which door' },
          { english: 'She works in a hospital in Dhaka.', note: 'one of many hospitals' },
        ],
      },
      {
        heading: 'a or an — it is about sound, not spelling',
        plain:
          'Use "an" before a vowel sound, "a" before a consonant sound. Listen, do not look. "An hour" takes an because the h is silent and you hear "our". "A university" takes a because you hear "yoo". "An MBA" takes an because you say "em-bee-ay". Say the word out loud and let your ear decide.',
        bangla: 'বানান নয়, উচ্চারণ দেখে ঠিক করুন — শব্দটি স্বরধ্বনি দিয়ে শুরু হলে "an"।',
        examples: [
          { english: 'an hour', note: 'silent h — the sound is a vowel' },
          { english: 'a university', note: 'sounds like "yoo" — a consonant sound' },
          { english: 'an honest answer' },
          { english: 'a European country', note: 'sounds like "yoo" again' },
          { english: 'an MBA, an X-ray, a one-way street' },
        ],
      },
      {
        heading: 'When "the" is compulsory',
        plain:
          'Some cases do not need thinking about — "the" is simply required. When there is only one in the world: the sun, the moon, the internet, the environment, the government. With superlatives: the best, the highest, the most important. With ordinals: the first, the second. With rivers, seas, oceans and groups of islands: the Padma, the Bay of Bengal. And with a plural country name: the Netherlands, the United States.',
        bangla: 'পৃথিবীতে একটাই আছে এমন জিনিস, সর্বোচ্চ-বাচক শব্দ, আর নদী-সাগরের নামে "the" বসবেই।',
        examples: [
          { english: 'The government should invest in the environment.' },
          { english: 'This is the most important factor.', note: 'superlative' },
          { english: 'The first reason is economic.', note: 'ordinal' },
          { english: 'The Padma is the longest river in Bangladesh.' },
        ],
      },
      {
        heading: 'When you use nothing at all',
        plain:
          'This is the half people forget. When you talk about things in general — all of them, everywhere — you use no article at all. "Children need sleep" means all children. "The children need sleep" means these particular ones. In Task 2 essays you are almost always talking in general, so no article is usually right: "Technology has changed education", not "The technology has changed the education".',
        bangla: 'সাধারণভাবে সব কিছুর কথা বললে কোনো article বসে না — এটাই Task 2-এর বেশিরভাগ বাক্যে সঠিক।',
        examples: [
          { english: 'Children need sleep.', note: 'all children, in general' },
          { english: 'The children need sleep.', note: 'these particular children' },
          { english: 'Education is a basic right.', note: 'general — no article' },
          { english: 'I go to school by bus.', note: 'fixed expressions take none' },
        ],
        table: {
          caption: 'The four choices, with the test for each',
          headers: ['Use', 'When', 'Example'],
          rows: [
            ['a / an', 'one of many, first mention', 'I read a report'],
            ['the', 'the reader knows which one', 'The report was long'],
            ['the', 'only one exists', 'The government, the sun'],
            ['nothing', 'plural or uncountable, in general', 'Cars cause pollution'],
          ],
        },
      },
    ],
    mistakes: [
      {
        wrong: 'I am student at the university.',
        right: 'I am a student at a university.',
        why: 'A singular countable noun can never stand alone. It needs a, an, the, my, this — something in front of it, always.',
      },
      {
        wrong: 'The education is important for the society.',
        right: 'Education is important for society.',
        why: 'Both nouns are general here, so both take no article. Adding "the" makes it mean one specific education system and one specific society.',
      },
      {
        wrong: 'He is best student in the class.',
        right: 'He is the best student in the class.',
        why: 'Superlatives always take "the" — there is only one best, so the reader knows which one you mean by definition.',
      },
      {
        wrong: 'It took me a hour to finish.',
        right: 'It took me an hour to finish.',
        why: 'The h in "hour" is silent, so the word begins with a vowel sound. Sound decides, not the letter.',
      },
    ],
    ieltsMoves: [
      'The graph illustrates the changes that took place between 1990 and 2010.',
      'The main advantage of this approach is its cost.',
      'Governments should take responsibility for public health.',
      'The most significant increase occurred in the first quarter.',
    ],
    checks: [
      {
        prompt: 'Fill in: "___ pollution in ___ cities is a serious problem."',
        answer: 'Pollution in cities... (no article, no article)',
        why: 'Both are general. Uncountable and plural nouns in a general statement take nothing.',
      },
      {
        prompt: 'a or an: "___ university degree"?',
        answer: 'a',
        why: 'University starts with a "yoo" sound, which is a consonant sound.',
      },
      {
        prompt: 'Fix: "She is teacher."',
        answer: 'She is a teacher.',
        why: 'A singular countable noun cannot stand naked. Jobs always take a or an.',
      },
      {
        prompt: 'Why "the environment" and not "environment"?',
        answer: 'There is only one — everyone knows which one you mean.',
        why: 'Unique things take "the" automatically, like the sun, the internet and the government.',
      },
    ],
  },
  {
    dayIndex: 6,
    title: 'Countable and uncountable nouns',
    banglaTitle: 'গণনাযোগ্য ও অগণনীয় বিশেষ্য',
    goal: 'You can tell whether a noun can be counted, and you choose much, many, few or little correctly every time.',
    ieltsWhy:
      'Task 1 lives on quantity words — "the amount of water", "the number of students", "a small proportion". Choose the wrong one and the sentence reads as a grammar error rather than a description.',
    minutes: 25,
    sections: [
      {
        heading: 'Can you put a number in front of it?',
        plain:
          'That is the test. Three books — yes, so book is countable. Three waters — no, so water is uncountable. Countable nouns have a plural form and can take a or an. Uncountable nouns have no plural, never take a or an, and always use a singular verb.',
        bangla: 'সামনে সংখ্যা বসানো যায় কি না — এটাই পরীক্ষা। "তিনটি বই" চলে, "তিনটি পানি" চলে না।',
        examples: [
          { english: 'one book, two books', note: 'countable' },
          { english: 'water, information, advice', note: 'uncountable — no plural form' },
          { english: 'The information is useful.', note: 'singular verb, always' },
        ],
      },
      {
        heading: 'The uncountable words that trap everyone',
        plain:
          'Some English words are uncountable even though they feel countable, and these are the ones that cost marks. Information, advice, research, knowledge, equipment, furniture, luggage, traffic, money, work, progress, evidence. There is no "informations" and no "an advice". If you need to count them, use a phrase: a piece of advice, two pieces of information, an item of furniture.',
        bangla: 'information, advice, research, furniture — এগুলোর বহুবচন হয় না। গুনতে হলে "a piece of" ব্যবহার করুন।',
        examples: [
          { english: 'He gave me some useful advice.', note: 'not advices' },
          { english: 'I need two pieces of information.', note: 'the counting phrase' },
          { english: 'The research shows a clear pattern.', note: 'not researches, and shows not show' },
          { english: 'The equipment is expensive.' },
        ],
      },
      {
        heading: 'much, many, few, little — and the pairs',
        plain:
          'Every quantity word belongs to one side. Many, few, a few and number go with countable nouns. Much, little, a little and amount go with uncountable ones. Some, any, a lot of and plenty of work with both. The pair that matters most in IELTS is number and amount: "the number of students" but "the amount of water".',
        bangla: 'গোনা যায় → many, few, number। গোনা যায় না → much, little, amount।',
        examples: [
          { english: 'many students', note: 'countable' },
          { english: 'much water', note: 'uncountable' },
          { english: 'the number of cars', note: 'countable' },
          { english: 'the amount of rainfall', note: 'uncountable' },
        ],
        table: {
          caption: 'The two columns',
          headers: ['Countable', 'Uncountable', 'Both'],
          rows: [
            ['many', 'much', 'some / any'],
            ['few / a few', 'little / a little', 'a lot of'],
            ['number of', 'amount of', 'plenty of'],
            ['fewer', 'less', 'more'],
          ],
        },
      },
      {
        heading: 'few or a few — a small word, a big difference',
        plain:
          'This one changes the meaning of your sentence. "A few" is positive and means some, enough. "Few" without the a is negative and means almost none. "I have a few friends here" is comfortable; "I have few friends here" is lonely. The same holds for little and a little. Examiners notice when a candidate uses these deliberately.',
        bangla: '"A few" মানে কিছু আছে, "few" মানে প্রায় নেই — একটি "a" পুরো অর্থ বদলে দেয়।',
        examples: [
          { english: 'A few students passed.', note: 'some did — positive' },
          { english: 'Few students passed.', note: 'almost none did — negative' },
          { english: 'We have a little time.', note: 'enough' },
          { english: 'We have little time.', note: 'not enough' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'He gave me many informations about the course.',
        right: 'He gave me a lot of information about the course.',
        why: 'Information is uncountable: no plural, and "many" belongs to countable nouns. "A lot of" works with both sides, which makes it the safe choice under pressure.',
      },
      {
        wrong: 'The amount of students has doubled.',
        right: 'The number of students has doubled.',
        why: 'Students can be counted, so it is "number". "Amount" is for things you measure rather than count, like water or money.',
      },
      {
        wrong: 'There is less cars on the road now.',
        right: 'There are fewer cars on the road now.',
        why: '"Fewer" for countable, "less" for uncountable — and the verb becomes "are", because cars is plural.',
      },
      {
        wrong: 'I did many researches on this topic.',
        right: 'I did a lot of research on this topic.',
        why: 'Research has no plural in English. If you must count studies, say "three studies", not "three researches".',
      },
    ],
    ieltsMoves: [
      'The number of visitors rose steadily over the period.',
      'A large amount of energy is wasted every year.',
      'Only a small proportion of the population has access to it.',
      'There is little evidence to support this claim.',
    ],
    checks: [
      {
        prompt: 'much or many: "How ___ time do we have?"',
        answer: 'much',
        why: 'Time is uncountable here, so it takes "much".',
      },
      {
        prompt: 'Fix: "The datas are showing an increase."',
        answer: 'The data show an increase. (or: The data shows...)',
        why: 'There is no word "datas". In IELTS writing, "data" with a singular verb is accepted and safest.',
      },
      {
        prompt: 'What is the difference between "few problems" and "a few problems"?',
        answer: '"Few" = almost none. "A few" = some.',
        why: 'The article turns a negative statement into a positive one.',
      },
      {
        prompt: 'number or amount: "the ___ of money spent on advertising"',
        answer: 'amount',
        why: 'Money is measured, not counted, so it takes "amount".',
      },
    ],
  },
  {
    dayIndex: 7,
    title: 'in, on, at — time and place',
    banglaTitle: 'in, on, at — সময় ও স্থানের প্রিপজিশন',
    goal: 'You can choose between in, on and at for any time or any place without guessing.',
    ieltsWhy:
      'Task 1 is full of dates and places: "in 2015", "on Monday", "at the start of the period". These small words appear several times per paragraph, so an error here repeats itself all over your answer.',
    minutes: 25,
    sections: [
      {
        heading: 'Time: big to small',
        plain:
          'Think of a funnel. IN takes the biggest boxes of time: years, months, seasons, centuries, and parts of the day. ON takes days and dates — one square on the calendar. AT takes exact points: clock times, and a few fixed phrases like at night and at the weekend. In 2020, on Monday, at 5 pm. Big, medium, small.',
        bangla: 'বড় সময় → in, দিন বা তারিখ → on, ঘড়ির নির্দিষ্ট সময় → at।',
        examples: [
          { english: 'in 2020, in July, in the summer, in the morning' },
          { english: 'on Monday, on 5 May, on my birthday' },
          { english: 'at 6 o’clock, at night, at the weekend' },
          { english: 'The figure peaked in June and fell on 12 July.' },
        ],
        table: {
          caption: 'Time, from biggest to smallest',
          headers: ['Preposition', 'Size of time', 'Examples'],
          rows: [
            ['in', 'years, months, seasons, parts of the day', 'in 1998, in March, in the evening'],
            ['on', 'days and dates', 'on Friday, on 3 June, on New Year’s Day'],
            ['at', 'exact times and fixed phrases', 'at 7:30, at midnight, at night'],
          ],
        },
      },
      {
        heading: 'Place: inside, on a surface, at a point',
        plain:
          'IN means inside something with edges: in a room, in Dhaka, in a country, in a car. ON means touching a surface or a line: on the table, on the wall, on the second floor, on a bus. AT means a point or an address you think of as a place on a map: at the station, at 25 Green Road, at the top of the graph.',
        bangla: 'ভিতরে → in, উপরে/তলে → on, নির্দিষ্ট বিন্দু বা ঠিকানায় → at।',
        examples: [
          { english: 'She lives in Sylhet.', note: 'inside a place with borders' },
          { english: 'The book is on the table.', note: 'on a surface' },
          { english: 'I will meet you at the airport.', note: 'a point on the map' },
          { english: 'in a car, but on a bus, on a train, on a plane', note: 'a fixed oddity worth memorising' },
        ],
      },
      {
        heading: 'The Task 1 set',
        plain:
          'A handful of these phrases appear in almost every chart description, and they are worth learning as whole units rather than as grammar: in 2010, between 1990 and 2000, from 2000 to 2010, over the period, at the beginning, at the end, by 2015. Learn the phrase with its preposition attached, and you never have to choose under pressure.',
        bangla: 'Task 1-এর এই বাক্যাংশগুলো প্রিপজিশন সহ একসঙ্গে মুখস্থ করুন, আলাদা করে নয়।',
        examples: [
          { english: 'The figure rose sharply between 1990 and 2000.' },
          { english: 'Sales fell from 40% to 25% over the period.' },
          { english: 'At the beginning of the period, the two lines were equal.' },
          { english: 'By 2015, the number had doubled.', note: 'by = not later than' },
        ],
      },
      {
        heading: 'The verbs that own a preposition',
        plain:
          'Some verbs and adjectives are permanently married to one preposition, and the pair must be learned together. Depend ON. Interested IN. Good AT. Responsible FOR. Different FROM. Consist OF. There is no rule behind these pairings — you learn them as single items, the way you learned "get up" rather than "get" and "up". Day 25 goes through the full IELTS set.',
        bangla: 'কিছু ক্রিয়া ও বিশেষণ নির্দিষ্ট প্রিপজিশনের সঙ্গে বাঁধা — জোড়া হিসেবেই শিখতে হবে।',
        examples: [
          { english: 'It depends on the situation.' },
          { english: 'I am interested in economics.' },
          { english: 'She is good at mathematics.' },
          { english: 'The government is responsible for public safety.' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'I was born in 5 May.',
        right: 'I was born on 5 May.',
        why: 'A date is one square on the calendar, so it takes "on". "In" is for the month alone: in May.',
      },
      {
        wrong: 'The meeting is in 3 pm.',
        right: 'The meeting is at 3 pm.',
        why: 'A clock time is an exact point, and exact points take "at".',
      },
      {
        wrong: 'It depends of the weather.',
        right: 'It depends on the weather.',
        why: '"Depend" takes "on", always. It is a fixed pair with no reasoning behind it, so it is memorised rather than worked out.',
      },
      {
        wrong: 'I am living in Dhaka since 2019.',
        right: 'I have been living in Dhaka since 2019.',
        why: 'The preposition is right but the tense is not — "since" needs a perfect tense, which is day 10 and 11.',
      },
    ],
    ieltsMoves: [
      'The number of tourists increased steadily between 2005 and 2015.',
      'At the start of the period, both figures stood at around 20%.',
      'In the final year, the trend reversed.',
      'The result depends on a number of factors.',
    ],
    checks: [
      {
        prompt: 'in, on or at: "___ Monday morning"?',
        answer: 'on',
        why: 'When a part of the day is attached to a named day, "on" wins: on Monday morning, but in the morning.',
      },
      {
        prompt: 'in, on or at: "The figure peaked ___ 2012."',
        answer: 'in',
        why: 'A year is a big box of time.',
      },
      {
        prompt: 'Fix: "She is good in English."',
        answer: 'She is good at English.',
        why: '"Good" pairs with "at". These pairings are learned as units.',
      },
      {
        prompt: 'in, on or at: "I will see you ___ the bus stop."',
        answer: 'at',
        why: 'A bus stop is a point on a map, not something you are inside.',
      },
    ],
  },
];
