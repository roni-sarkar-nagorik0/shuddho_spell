import { type GrammarDayEntry } from './schema';

/**
 * Week 4 — the polish that separates a 6.5 from a 7.5.
 *
 * Nothing here is new grammar in the sense weeks 1 and 2 were. It is the
 * difference between sentences that are correct and sentences that are *well
 * made*: joined properly, hedged properly, punctuated properly, and varied
 * enough that the examiner can see a range rather than infer one.
 *
 * Day 28 closes the course by naming the criterion itself — Grammatical Range
 * and Accuracy — and turning it into a checklist the learner can run over their
 * own writing. A course about an exam should end by telling the candidate what
 * the marker is actually holding in their hand.
 */
export const GRAMMAR_DAYS_22_28: readonly GrammarDayEntry[] = [
  {
    dayIndex: 22,
    title: 'Linking ideas — however, although, despite',
    banglaTitle: 'বাক্য জোড়া — however, although, despite',
    goal: 'You can connect two ideas with the right word in the right position, and you never confuse although with despite again.',
    ieltsWhy:
      'Coherence and Cohesion is a full quarter of the Writing score, and this is its grammar half. It is also where linkers are most often used wrongly — the punctuation after "however" and the structure after "despite" are two of the most frequent errors in the whole exam.',
    minutes: 30,
    sections: [
      {
        heading: 'Three kinds of joining word, three different rules',
        plain:
          'English has three ways to join ideas and they do not behave alike. Conjunctions (and, but, so, because, although) join two halves inside one sentence. Adverbs (however, moreover, therefore) start a new sentence and take a comma. Prepositions (despite, in spite of, because of) must be followed by a noun, not a sentence. Most linker errors are really a mix-up between these three groups.',
        bangla: 'তিন ধরনের সংযোগ শব্দ আছে, আর তিনটির নিয়ম আলাদা — এই পার্থক্যই বেশিরভাগ ভুলের কারণ।',
        examples: [
          { english: 'The plan was expensive, but it worked.', note: 'conjunction, inside one sentence' },
          { english: 'The plan was expensive. However, it worked.', note: 'adverb, new sentence plus comma' },
          { english: 'Despite the cost, the plan worked.', note: 'preposition plus a noun' },
        ],
        table: {
          caption: 'What must come after each one',
          headers: ['Type', 'Words', 'Followed by'],
          rows: [
            ['conjunction', 'although, because, but, so, while', 'a full clause: subject + verb'],
            ['adverb', 'however, therefore, moreover, nevertheless', 'a comma, then a full sentence'],
            ['preposition', 'despite, in spite of, because of, due to', 'a noun or an -ing form'],
          ],
        },
      },
      {
        heading: 'although vs despite — the one that decides marks',
        plain:
          'They mean the same thing and take completely different structures. ALTHOUGH is followed by a full clause with a subject and a verb: "Although it was expensive, we bought it." DESPITE is followed by a noun or an -ing word: "Despite the cost, we bought it" or "Despite being expensive, it sold well". If you want a clause after despite you must insert "the fact that": "despite the fact that it was expensive".',
        bangla: 'although-এর পরে পূর্ণ বাক্য, despite-এর পরে noun বা -ing। এটাই সবচেয়ে বেশি ভুল হওয়া জায়গা।',
        examples: [
          { english: 'Although the policy was popular, it failed.' },
          { english: 'Despite its popularity, the policy failed.' },
          { english: 'Despite being popular, the policy failed.' },
          { english: 'Despite the fact that it was popular, the policy failed.' },
        ],
      },
      {
        heading: 'The punctuation of however',
        plain:
          'However is not "but". It cannot join two halves with a comma. "The results were poor, however we continued" is a punctuation error called a comma splice. Write it as two sentences — "The results were poor. However, we continued." — or use a semicolon. However always takes a comma after it when it opens a sentence.',
        bangla: '"however" দিয়ে কমা দিয়ে দুটি বাক্য জোড়া যায় না — আলাদা বাক্য লিখুন এবং পরে কমা দিন।',
        examples: [
          { english: 'It rained, however we went out.', note: 'wrong — a comma splice' },
          { english: 'It rained. However, we went out.', note: 'right' },
          { english: 'It rained; however, we went out.', note: 'also right' },
        ],
      },
      {
        heading: 'because vs because of',
        plain:
          'Same pair, same trap. BECAUSE takes a full clause: "because prices rose". BECAUSE OF takes a noun: "because of the rise in prices". "Due to" behaves like "because of". Learn them as a pair and check what comes next before you choose.',
        bangla: 'because-এর পরে পূর্ণ বাক্য, because of-এর পরে noun।',
        examples: [
          { english: 'The event was cancelled because it rained.' },
          { english: 'The event was cancelled because of the rain.' },
          { english: 'Due to heavy rain, the event was cancelled.' },
        ],
      },
      {
        heading: 'Enough is enough',
        plain:
          'A linker at the start of every sentence is worse than none. Examiners describe it as mechanical, and it is specifically named in the band descriptors. Use them where the logic actually turns — a contrast, a consequence, an addition that matters — and let the other sentences follow each other naturally.',
        bangla: 'প্রতিটি বাক্যের শুরুতে linker বসালে লেখা যান্ত্রিক শোনায় — যেখানে সত্যিই দরকার সেখানেই দিন।',
        examples: [
          { english: 'Firstly… Moreover… Furthermore… In addition… Finally…', note: 'a list, not an argument' },
          { english: 'The first reason is economic. A second, more serious problem is social.', note: 'linked by meaning' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'Despite it was raining, we went out.',
        right: 'Although it was raining, we went out.',
        why: '"Despite" cannot be followed by a clause. Either switch to "although" or change the second half to a noun: "despite the rain".',
      },
      {
        wrong: 'Although he was tired, but he continued.',
        right: 'Although he was tired, he continued.',
        why: 'One contrast needs one linker. "Although" and "but" doing the same job in one sentence is a doubled conjunction.',
      },
      {
        wrong: 'The costs were high, however the project continued.',
        right: 'The costs were high. However, the project continued.',
        why: '"However" is an adverb, not a conjunction, so it cannot join two clauses with a comma.',
      },
      {
        wrong: 'The delay was because of the weather was bad.',
        right: 'The delay was because the weather was bad.',
        why: '"Because of" needs a noun. Once a clause follows, the "of" must go.',
      },
    ],
    ieltsMoves: [
      'Although this approach has clear benefits, it also carries significant risks.',
      'Despite considerable investment, the situation has not improved.',
      'This policy is expensive. However, the long-term savings justify the cost.',
      'The main problem arises because of a lack of coordination between agencies.',
    ],
    checks: [
      {
        prompt: 'Fix: "Despite of the rain, we continued."',
        answer: 'Despite the rain, we continued.',
        why: '"Despite" never takes "of". "In spite of" is the version with the "of" in it.',
      },
      {
        prompt: 'although or despite: "___ working hard, he failed."',
        answer: 'Despite',
        why: 'An -ing form follows, and only "despite" can take one.',
      },
      {
        prompt: 'Fix the punctuation: "It was expensive, however, it was worth it."',
        answer: 'It was expensive. However, it was worth it.',
        why: '"However" cannot join two clauses. It opens a new sentence.',
      },
      {
        prompt: 'because or because of: "The delay was ___ heavy traffic."',
        answer: 'because of',
        why: '"Heavy traffic" is a noun phrase, not a clause.',
      },
    ],
  },
  {
    dayIndex: 23,
    title: 'Gerunds and infinitives — -ing or to?',
    banglaTitle: 'Gerund ও Infinitive — -ing না to?',
    goal: 'You can choose between "doing" and "to do" after any verb, adjective or preposition.',
    ieltsWhy:
      'It affects nearly every sentence you speak, and the errors are audible: "I enjoy to read" and "I look forward to meet you" are two of the most recognisable non-native patterns there are.',
    minutes: 30,
    sections: [
      {
        heading: 'Two ways to use a verb as a thing',
        plain:
          'Sometimes a verb has to behave like a noun — the subject of a sentence, or the object of another verb. English has two forms for that: the -ing form (swimming, reading) and the to-form (to swim, to read). Both are correct English; which one you need depends entirely on the word in front, and that has to be learned rather than reasoned out.',
        bangla: 'ক্রিয়াকে বিশেষ্যের মতো ব্যবহার করার দুটি রূপ আছে — কোনটি লাগবে তা আগের শব্দ ঠিক করে দেয়।',
        examples: [
          { english: 'Swimming is good exercise.', note: 'the -ing form as a subject' },
          { english: 'I want to swim.', note: 'the to-form after "want"' },
          { english: 'I enjoy swimming.', note: 'the -ing form after "enjoy"' },
        ],
      },
      {
        heading: 'The verbs that take -ing',
        plain:
          'Enjoy, avoid, finish, suggest, mind, practise, consider, imagine, keep, recommend, admit, deny. All of these must be followed by -ing. "I enjoy reading", never "I enjoy to read". The rough logic — these verbs describe your relationship to an activity that is already going on — helps a little, but the list is what you memorise.',
        bangla: 'enjoy, avoid, finish, suggest, mind — এদের পরে সব সময় -ing বসে।',
        examples: [
          { english: 'I enjoy reading in the evening.' },
          { english: 'She avoided answering the question.' },
          { english: 'They suggested changing the schedule.' },
          { english: 'Would you mind waiting outside?' },
        ],
        table: {
          caption: 'The two lists, side by side',
          headers: ['Take -ing', 'Take to'],
          rows: [
            ['enjoy, avoid, finish', 'want, need, decide'],
            ['suggest, recommend, consider', 'hope, plan, agree'],
            ['mind, practise, keep', 'promise, refuse, offer'],
            ['admit, deny, imagine', 'learn, manage, afford'],
          ],
        },
      },
      {
        heading: 'The verbs that take "to"',
        plain:
          'Want, need, decide, hope, plan, agree, promise, refuse, offer, learn, manage, afford, expect. These take the to-form: "I decided to apply", "They refused to cooperate". Many of these are about a future action or an intention, which is a useful hint, though not a rule you can trust blindly.',
        bangla: 'want, decide, hope, plan, refuse — এদের পরে to + ক্রিয়া বসে।',
        examples: [
          { english: 'I decided to apply for the scholarship.' },
          { english: 'They refused to accept the offer.' },
          { english: 'He managed to finish on time.' },
        ],
      },
      {
        heading: 'After a preposition, always -ing',
        plain:
          'This one is a genuine rule with no exceptions, and it is worth more than the two lists put together: any verb that follows a preposition takes -ing. Interested IN working. Good AT solving. Instead OF waiting. Before leaving. The famous trap is "look forward to", where the "to" is a preposition and not part of an infinitive — so it is "I look forward to hearing from you", never "to hear".',
        bangla: 'preposition-এর পরে ক্রিয়া সব সময় -ing রূপে বসে — "look forward to hearing", "to hear" নয়।',
        examples: [
          { english: 'She is interested in studying abroad.' },
          { english: 'Instead of complaining, he offered a solution.' },
          { english: 'I look forward to hearing from you.', note: 'the classic trap' },
          { english: 'He is used to working at night.', note: '"used to" here is a preposition too' },
        ],
      },
      {
        heading: 'The pairs that change meaning',
        plain:
          'A few verbs take both, with different meanings. "I stopped smoking" means I quit; "I stopped to smoke" means I paused in order to have one. "I remember locking the door" is a memory of doing it; "Remember to lock the door" is an instruction for later. These are small, exact differences and using one deliberately shows real control.',
        bangla: 'কিছু ক্রিয়ায় দুটোই বসে, কিন্তু অর্থ বদলে যায় — stop smoking আর stop to smoke এক নয়।',
        examples: [
          { english: 'He stopped smoking last year.', note: 'he quit' },
          { english: 'He stopped to smoke.', note: 'he paused in order to smoke' },
          { english: 'I remember meeting her in 2018.', note: 'a memory' },
          { english: 'Remember to send the email.', note: 'do not forget' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'I enjoy to watch films.',
        right: 'I enjoy watching films.',
        why: '"Enjoy" is on the -ing list. There is no reason behind it; the list is memorised.',
      },
      {
        wrong: 'I look forward to meet you.',
        right: 'I look forward to meeting you.',
        why: 'The "to" in "look forward to" is a preposition, and every verb after a preposition takes -ing.',
      },
      {
        wrong: 'She suggested to go to the museum.',
        right: 'She suggested going to the museum.',
        why: '"Suggest" takes -ing. If you want a "to" structure, the verb has to change: "She offered to go."',
      },
      {
        wrong: 'He is good at to solve problems.',
        right: 'He is good at solving problems.',
        why: '"At" is a preposition, so the -ing form is compulsory.',
      },
    ],
    ieltsMoves: [
      'Governments should consider investing more in public transport.',
      'Many young people are interested in working abroad.',
      'Instead of banning cars, cities could improve alternatives.',
      'It is worth noting that the two figures are closely linked.',
    ],
    checks: [
      {
        prompt: 'Fill in: "I am thinking of ___ (change) my career."',
        answer: 'changing',
        why: '"Of" is a preposition, so the -ing form follows.',
      },
      {
        prompt: 'Fix: "They decided going by train."',
        answer: 'They decided to go by train.',
        why: '"Decide" is on the "to" list.',
      },
      {
        prompt: 'What is the difference between "I stopped reading" and "I stopped to read"?',
        answer: 'The first means I quit; the second means I paused in order to read.',
        why: 'With "stop", the -ing form is what ended and the to-form is the purpose.',
      },
      {
        prompt: 'Fill in: "I look forward to ___ (hear) from you."',
        answer: 'hearing',
        why: 'The "to" here is a preposition, not part of an infinitive.',
      },
    ],
  },
  {
    dayIndex: 24,
    title: 'Reported speech and reporting verbs',
    banglaTitle: 'Reported speech — অন্যের কথা বলা',
    goal: 'You can report what someone said without quoting them, and you can choose a reporting verb that carries your own judgement.',
    ieltsWhy:
      'Task 2 requires you to present other people’s views before answering them, and Speaking Part 3 constantly asks what people in your country think. Both are reported speech, and the reporting verb you choose is itself an argument.',
    minutes: 30,
    sections: [
      {
        heading: 'The one-step-back rule',
        plain:
          'When the reporting verb is in the past — said, told, explained — every tense inside the report moves one step back. Present becomes past, past becomes past perfect, will becomes would, can becomes could. "I am tired" becomes "He said he was tired". "I will call" becomes "He said he would call". One step back, every time.',
        bangla: 'said/told অতীতে থাকলে ভিতরের প্রতিটি কাল এক ধাপ পিছিয়ে যায়।',
        examples: [
          { english: '"I am busy." → She said she was busy.' },
          { english: '"I finished it." → He said he had finished it.' },
          { english: '"I will help." → They said they would help.' },
        ],
        table: {
          caption: 'One step back',
          headers: ['Direct', 'Reported'],
          rows: [
            ['am / is / are', 'was / were'],
            ['work / works', 'worked'],
            ['worked', 'had worked'],
            ['have worked', 'had worked'],
            ['will', 'would'],
            ['can', 'could'],
            ['may', 'might'],
          ],
        },
      },
      {
        heading: 'What else moves',
        plain:
          'Pronouns change to match the new speaker: "I" becomes "he" or "she". Time and place words shift too: today becomes that day, tomorrow becomes the next day, here becomes there, this becomes that. And "say" and "tell" are not interchangeable — you tell someone something, but you say something to someone.',
        bangla: 'সর্বনাম, সময় ও স্থানবাচক শব্দও বদলায়; আর tell-এর পরে ব্যক্তি বসে, say-এর পরে বসে না।',
        examples: [
          { english: 'He said, "I will come tomorrow." → He said he would come the next day.' },
          { english: 'She told me she was leaving.', note: 'tell + person' },
          { english: 'She said she was leaving.', note: 'say + no person' },
          { english: 'She said me she was leaving.', note: 'wrong' },
        ],
      },
      {
        heading: 'Reported questions lose their question shape',
        plain:
          'This one surprises people. A reported question goes back to normal word order and loses its question mark. "Where do you live?" becomes "He asked where I lived" — not "where did I live". If there is no question word, use "if" or "whether": "Are you ready?" becomes "She asked if I was ready."',
        bangla: 'Reported question-এ শব্দক্রম সাধারণ বাক্যের মতো হয়ে যায়, প্রশ্নবোধক চিহ্নও থাকে না।',
        examples: [
          { english: 'He asked where I lived.', note: 'not "where did I live"' },
          { english: 'She asked if I had finished.' },
          { english: 'They asked whether the report was ready.' },
        ],
      },
      {
        heading: 'Reporting verbs that carry an opinion',
        plain:
          'This is the part that earns marks. "Say" is neutral. Every other reporting verb tells the reader what you think of the claim. "Critics argue" presents a case. "Supporters claim" quietly signals doubt. "Research suggests" is careful; "research proves" is a strong commitment you must be able to back up. Choose the verb deliberately — it is the cheapest way to show a position without saying "I think".',
        bangla: 'কোন reporting verb বেছে নিচ্ছেন, তাতেই আপনার নিজের মনোভাব ফুটে ওঠে।',
        examples: [
          { english: 'Critics argue that the policy is ineffective.', note: 'a reasoned case' },
          { english: 'Supporters claim that costs will fall.', note: 'a claim you are not endorsing' },
          { english: 'Recent research suggests a link between the two.', note: 'careful' },
          { english: 'The report demonstrates that the method works.', note: 'strong, and it had better be true' },
        ],
        table: {
          caption: 'Reporting verbs by strength',
          headers: ['Verb', 'What it signals'],
          rows: [
            ['suggest, indicate', 'careful, tentative'],
            ['argue, maintain, contend', 'a reasoned position'],
            ['claim, allege', 'the writer is not convinced'],
            ['show, demonstrate, prove', 'strong — needs real evidence'],
            ['acknowledge, concede', 'admitting a point against yourself'],
          ],
        },
      },
      {
        heading: 'When the tense does not move',
        plain:
          'If what was said is still true, you may leave the tense alone. "She said the earth goes round the sun" is fine, because it still does. The same applies to a fact that has not changed: "He told me he lives in Dhaka" — and he still does. Both versions are correct here; moving the tense back is never wrong, so it is the safer default under exam pressure.',
        bangla: 'যা এখনও সত্যি, তার কাল না বদলালেও চলে — তবে পিছিয়ে দেওয়া কখনো ভুল নয়।',
        examples: [
          { english: 'She said that water boils at 100 degrees.' },
          { english: 'He told me he lives in Chittagong.', note: 'and he still does' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'He said me that he was busy.',
        right: 'He told me that he was busy.',
        why: '"Say" is never followed directly by a person. Use "tell someone" or "say to someone".',
      },
      {
        wrong: 'She asked me where did I live.',
        right: 'She asked me where I lived.',
        why: 'A reported question takes ordinary word order. The question shape belongs only to a real question.',
      },
      {
        wrong: 'He said he will come tomorrow.',
        right: 'He said he would come the next day.',
        why: 'A past reporting verb pulls "will" back to "would", and "tomorrow" shifts with it.',
      },
      {
        wrong: 'The article says that pollution proves cancer.',
        right: 'The article suggests that pollution may contribute to cancer.',
        why: 'The reporting verb overcommits. "Prove" claims certainty that a single article cannot support.',
      },
    ],
    ieltsMoves: [
      'Opponents argue that the policy places an unfair burden on the poor.',
      'Recent studies suggest that the relationship is more complex than it appears.',
      'While supporters claim that the benefits are clear, the evidence is mixed.',
      'It should be acknowledged that both sides have valid concerns.',
    ],
    checks: [
      {
        prompt: 'Report it: "I am studying English."',
        answer: 'She said she was studying English.',
        why: 'One step back: "am studying" becomes "was studying", and "I" becomes "she".',
      },
      {
        prompt: 'Fix: "He asked me what time is it."',
        answer: 'He asked me what time it was.',
        why: 'Reported questions use ordinary word order, and the tense steps back.',
      },
      {
        prompt: 'say or tell: "She ___ me the answer."',
        answer: 'told',
        why: '"Tell" takes a person straight after it; "say" does not.',
      },
      {
        prompt: 'Which reporting verb signals that you do not accept the claim?',
        answer: 'claim (or allege)',
        why: 'It reports the position without endorsing it — useful in the paragraph you intend to argue against.',
      },
    ],
  },
  {
    dayIndex: 25,
    title: 'Dependent prepositions and collocations',
    banglaTitle: 'নির্দিষ্ট preposition ও collocation',
    goal: 'You know which preposition belongs to the verbs and adjectives IELTS actually uses, and you stop translating them from Bangla.',
    ieltsWhy:
      'These are marked under both Lexical Resource and Grammatical Accuracy, and they are invisible until they are wrong. "Discuss about" and "depend of" are caught instantly by any examiner.',
    minutes: 30,
    sections: [
      {
        heading: 'Why there is no rule',
        plain:
          'A dependent preposition is one that belongs permanently to a word: depend ON, interested IN, responsible FOR. There is no logic connecting the meaning to the preposition — every language pairs them differently, which is exactly why translating from Bangla produces the wrong one. These are learned as two-word items, the way you learned "get up".',
        bangla: 'এই জোড়াগুলোর পিছনে কোনো যুক্তি নেই — বাংলা থেকে অনুবাদ করলে প্রায় সব সময় ভুল হবে।',
        examples: [
          { english: 'It depends on the circumstances.' },
          { english: 'She is responsible for the project.' },
          { english: 'This is different from the previous version.' },
        ],
      },
      {
        heading: 'The verbs that take no preposition at all',
        plain:
          'Some English verbs already contain the idea of "about" or "to", so adding one is an error. Discuss something, not discuss about it. Enter a room, not enter into it. Also: answer a question, marry someone, reach a place, request something, emphasise a point, lack something. This small list accounts for a large share of preposition errors in IELTS Writing.',
        bangla: 'discuss, enter, answer, marry, reach — এদের পরে কোনো preposition বসে না।',
        examples: [
          { english: 'The essay discusses both views.', note: 'not "discusses about"' },
          { english: 'He entered the building.', note: 'not "entered into"' },
          { english: 'She answered the question.', note: 'not "answered to"' },
          { english: 'The report emphasises the need for reform.' },
        ],
      },
      {
        heading: 'The IELTS set worth memorising',
        plain:
          'These pairs appear again and again in essay topics: depend on, focus on, rely on, spend on, lead to, contribute to, result in, suffer from, benefit from, deal with, cope with, associated with, aware of, capable of, responsible for, concerned about. Learn them in short phrases, not as a list of words, so the whole unit comes out under pressure.',
        bangla: 'এই জোড়াগুলো ছোট ছোট বাক্যাংশ হিসেবে মুখস্থ করুন, আলাদা শব্দ হিসেবে নয়।',
        examples: [
          { english: 'Poverty contributes to poor health outcomes.' },
          { english: 'Many families suffer from a lack of clean water.' },
          { english: 'Governments must deal with the consequences.' },
          { english: 'This policy has resulted in higher costs.' },
        ],
        table: {
          caption: 'Cause and effect, with their prepositions',
          headers: ['Phrase', 'Example'],
          rows: [
            ['lead to', 'Rapid growth led to overcrowding'],
            ['result in', 'The policy resulted in higher prices'],
            ['contribute to', 'Traffic contributes to air pollution'],
            ['result from', 'The problem results from poor planning'],
            ['be caused by', 'The delay was caused by heavy rain'],
          ],
        },
      },
      {
        heading: 'Adjective plus preposition',
        plain:
          'The same fixed pairing happens after adjectives: aware of, capable of, similar to, different from, familiar with, dependent on, responsible for, concerned about, interested in, good at, bad at, famous for. Note "different from" — "different than" is common in speech but is safest avoided in Writing.',
        bangla: 'বিশেষণের পরেও নির্দিষ্ট preposition বসে — aware of, similar to, different from।',
        examples: [
          { english: 'Young people are more aware of environmental issues.' },
          { english: 'This system is similar to the one used in Japan.' },
          { english: 'The results are different from what we expected.' },
        ],
      },
      {
        heading: 'Learn them in sentences, not in lists',
        plain:
          'A list of pairs is forgotten within a week. A short sentence carrying the pair survives, because you recall the rhythm of the sentence and the preposition comes with it. Write one true sentence about yourself for each pair — "I am interested in economics", "My result depends on this test" — and the pairing is stored where you can reach it.',
        bangla: 'তালিকা নয়, নিজের সম্পর্কে একটি করে সত্যি বাক্য লিখুন — তাহলে জোড়াটি মনে থাকবে।',
        examples: [
          { english: 'I am interested in renewable energy.' },
          { english: 'My future depends on this examination.' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'This essay will discuss about the causes of pollution.',
        right: 'This essay will discuss the causes of pollution.',
        why: '"Discuss" already means "talk about". The preposition is inside the verb.',
      },
      {
        wrong: 'It depends of the situation.',
        right: 'It depends on the situation.',
        why: '"Depend" is permanently paired with "on". No other preposition is possible.',
      },
      {
        wrong: 'The results are different than last year.',
        right: 'The results are different from last year.',
        why: '"Different from" is the standard written form and is never marked wrong; "than" is informal and risky in an exam.',
      },
      {
        wrong: 'Many people are suffering by poverty.',
        right: 'Many people are suffering from poverty.',
        why: '"Suffer" pairs with "from". "By" would suggest an agent doing the suffering to them.',
      },
    ],
    ieltsMoves: [
      'Rapid urbanisation has contributed to a decline in air quality.',
      'The success of the programme depends largely on public support.',
      'Many rural communities suffer from limited access to healthcare.',
      'Governments must deal with these challenges at a national level.',
    ],
    checks: [
      {
        prompt: 'Fix: "We discussed about the problem."',
        answer: 'We discussed the problem.',
        why: '"Discuss" takes no preposition.',
      },
      {
        prompt: 'Fill in: "The outcome depends ___ several factors."',
        answer: 'on',
        why: 'Depend is fixed to "on".',
      },
      {
        prompt: 'Fill in: "This approach is similar ___ the one used in Canada."',
        answer: 'to',
        why: '"Similar" pairs with "to", while "different" pairs with "from".',
      },
      {
        prompt: 'Fill in: "Air pollution contributes ___ respiratory illness."',
        answer: 'to',
        why: '"Contribute to" is one of the core cause-and-effect pairs in Task 2.',
      },
    ],
  },
  {
    dayIndex: 26,
    title: 'Complex sentences — subordination, participles, inversion',
    banglaTitle: 'জটিল বাক্য — subordination, participle, inversion',
    goal: 'You can combine ideas in four different ways and vary how your sentences begin.',
    ieltsWhy:
      'The band 7 descriptor asks for "a variety of complex structures". This day is that phrase, turned into four specific techniques you can apply to sentences you have already written.',
    minutes: 35,
    sections: [
      {
        heading: 'What "complex" actually means',
        plain:
          'A complex sentence is not a long one. It is a sentence with a main clause and at least one subordinate clause — a half that cannot stand alone. "Although prices rose, demand remained stable" is complex; "Prices rose and demand remained stable" is not, because both halves could stand by themselves. Length is not the measure; dependence is.',
        bangla: 'জটিল বাক্য মানে লম্বা বাক্য নয় — একটি প্রধান খণ্ডবাক্য আর একটি নির্ভরশীল খণ্ডবাক্য থাকলেই সেটি জটিল।',
        examples: [
          { english: 'Prices rose and demand fell.', note: 'compound, not complex' },
          { english: 'Although prices rose, demand remained stable.', note: 'complex' },
          { english: 'Because the policy was unpopular, it was withdrawn.', note: 'complex' },
        ],
      },
      {
        heading: 'Subordinators, and where to put them',
        plain:
          'Because, although, while, whereas, since, unless, if, when, after, before. Each attaches a dependent half to the main sentence, and the dependent half can come first or second. When it comes first, put a comma after it. Starting some sentences with the subordinate half is the easiest way to vary rhythm without changing meaning.',
        bangla: 'নির্ভরশীল অংশ আগে বসলে তার পরে কমা দিন — এভাবে বাক্যের শুরু বদলে বৈচিত্র্য আনা যায়।',
        examples: [
          { english: 'Demand fell because prices rose.' },
          { english: 'Because prices rose, demand fell.', note: 'same meaning, different rhythm, comma needed' },
          { english: 'Whereas the first group improved, the second showed no change.', note: 'whereas is ideal for Task 1 contrast' },
        ],
      },
      {
        heading: 'Participle clauses — the short cut',
        plain:
          'You can cut a clause down to an -ing or -ed phrase when both halves share a subject. "Because he was tired, he left early" becomes "Being tired, he left early". "The report, which was published in May, criticised the policy" becomes "Published in May, the report criticised the policy". One warning: the subject must be the same in both halves, or the sentence becomes accidentally funny.',
        bangla: 'দুই অংশের কর্তা এক হলে খণ্ডবাক্যকে -ing বা -ed দিয়ে ছোট করা যায়।',
        examples: [
          { english: 'Having finished the report, she left the office.' },
          { english: 'Introduced in 2010, the scheme has since expanded.' },
          { english: 'Walking down the street, the building looked enormous.', note: 'wrong — the building was not walking' },
        ],
      },
      {
        heading: 'Cleft sentences — putting the emphasis where you want it',
        plain:
          'A cleft sentence splits one idea in two to spotlight a part of it. "The government must act" becomes "It is the government that must act" or "What the government must do is act". This is a natural way to emphasise in Speaking Part 3 and to open a paragraph in Writing, and it takes almost no new grammar.',
        bangla: 'কোনো অংশে জোর দিতে বাক্যকে দুই ভাগে ভাগ করা যায় — "It is … that …" বা "What … is …"।',
        examples: [
          { english: 'It is education, rather than punishment, that reduces crime.' },
          { english: 'What the graph shows is a steady decline after 2010.' },
          { english: 'What worries me most is the cost.' },
        ],
      },
      {
        heading: 'Inversion — for one sentence, not for ten',
        plain:
          'After certain negative openers, the subject and the helper swap places, exactly as in a question. "Not only did the cost rise, but quality also fell." "Rarely have I seen such a clear result." It is formal and striking, which is why one per essay is impressive and three is exhausting. Use it once, in a place you have thought about.',
        bangla: 'Not only, rarely, never — এমন শব্দ দিয়ে বাক্য শুরু করলে কর্তা ও সহায়ক ক্রিয়া উল্টে যায়। একটির বেশি ব্যবহার করবেন না।',
        examples: [
          { english: 'Not only does this policy cost more, but it also achieves less.' },
          { english: 'Rarely has the issue received so much attention.' },
          { english: 'Only when governments act together will the problem be solved.' },
        ],
        table: {
          caption: 'Four ways to combine the same two ideas',
          headers: ['Technique', 'Example'],
          rows: [
            ['subordination', 'Although the cost rose, demand held steady'],
            ['relative clause', 'The cost, which rose sharply, did not affect demand'],
            ['participle clause', 'Rising sharply, the cost still did not affect demand'],
            ['cleft', 'It was the cost, not demand, that rose'],
          ],
        },
      },
    ],
    mistakes: [
      {
        wrong: 'Because the policy was expensive. It was cancelled.',
        right: 'Because the policy was expensive, it was cancelled.',
        why: 'A subordinate clause cannot stand alone as a sentence. It must be attached to the main clause with a comma.',
      },
      {
        wrong: 'Walking to the station, the rain started.',
        right: 'While I was walking to the station, it started to rain.',
        why: 'A participle clause takes the subject of the main clause. As written, the rain was doing the walking.',
      },
      {
        wrong: 'Not only the cost rose, but quality also fell.',
        right: 'Not only did the cost rise, but quality also fell.',
        why: 'After "not only" at the start of a sentence, the subject and helper invert, as in a question.',
      },
      {
        wrong: 'Although it was expensive, but we bought it.',
        right: 'Although it was expensive, we bought it.',
        why: 'One connector per join. English does not allow "although" and "but" to do the same job twice.',
      },
    ],
    ieltsMoves: [
      'While the first approach is cheaper, the second is far more effective in the long term.',
      'Having considered both views, I believe the benefits outweigh the drawbacks.',
      'It is not the technology itself but the way it is used that creates the problem.',
      'Not only does this reduce costs, but it also improves access for rural communities.',
    ],
    checks: [
      {
        prompt: 'Is this complex? "The cost rose and demand fell."',
        answer: 'No — it is compound.',
        why: 'Both halves could stand alone. A complex sentence needs a half that cannot.',
      },
      {
        prompt: 'Shorten: "After she had finished the report, she went home."',
        answer: 'Having finished the report, she went home.',
        why: 'Both halves share a subject, so the first can become a participle clause.',
      },
      {
        prompt: 'Fix: "Not only the price increased, but the quality decreased."',
        answer: 'Not only did the price increase, but the quality also decreased.',
        why: '"Not only" at the front forces inversion.',
      },
      {
        prompt: 'Rewrite as a cleft: "Poor planning caused the delay."',
        answer: 'It was poor planning that caused the delay.',
        why: 'The cleft moves the emphasis onto the cause.',
      },
    ],
  },
  {
    dayIndex: 27,
    title: 'Hedging, certainty and academic register',
    banglaTitle: 'Hedging ও একাডেমিক ভাষা',
    goal: 'You can say how sure you are, avoid claims you cannot defend, and write in a register that suits the exam.',
    ieltsWhy:
      'Task 2 essays lose marks for overgeneralising — "all young people are addicted to phones" is indefensible, and an examiner reads it as unsupported. Hedging is the grammar of a defensible argument.',
    minutes: 30,
    sections: [
      {
        heading: 'Why absolute claims lose marks',
        plain:
          'Words like all, every, always and never commit you to something no evidence can support. One counterexample destroys the sentence. Replace them with most, many, generally, tend to, in most cases, and the same idea becomes defensible. You are not weakening your argument; you are making it survivable.',
        bangla: 'all, always, never — এসব শব্দ এমন দাবি করে যা প্রমাণ করা যায় না; most, generally, tend to ব্যবহার করুন।',
        examples: [
          { english: 'All students hate exams.', note: 'indefensible' },
          { english: 'Most students find exams stressful.', note: 'defensible' },
          { english: 'People always use their phones too much.', note: 'indefensible' },
          { english: 'Many people tend to spend excessive time on their phones.', note: 'defensible' },
        ],
      },
      {
        heading: 'The four hedging tools',
        plain:
          'Modals: may, might, could, would. Adverbs: probably, possibly, generally, largely, arguably. Verbs: tend to, appear to, seem to, suggest. Phrases: it is likely that, there is some evidence that, in many cases. Mix them rather than repeating one — four "possibly"s in a paragraph is worse than none.',
        bangla: 'Modal, adverb, verb আর phrase — চার ধরনের hedging আছে, পালা করে ব্যবহার করুন।',
        examples: [
          { english: 'This may be one of the main causes.' },
          { english: 'Young people tend to adapt more quickly to new technology.' },
          { english: 'It is likely that the trend will continue.' },
          { english: 'There is some evidence that the policy has helped.' },
        ],
        table: {
          caption: 'The certainty scale',
          headers: ['Strength', 'Language', 'Example'],
          rows: [
            ['certain', 'is, will, clearly', 'This is the main cause'],
            ['strong', 'is likely to, probably', 'This is likely to be the main cause'],
            ['medium', 'may, might, could', 'This may be a significant factor'],
            ['weak', 'possibly, in some cases', 'This is possibly a factor'],
          ],
        },
      },
      {
        heading: 'Register: what to leave out of Writing',
        plain:
          'Academic writing avoids five things. Short forms (don’t, isn’t) — write them in full. Very informal words (kids, stuff, a lot of) — use children, factors, a great deal of. Slang and idioms. Question forms as a style ("So what is the solution?"). And exclamation marks, which have no place at all. Speaking is different: short forms there are natural and correct.',
        bangla: 'লিখিত পরীক্ষায় সংক্ষিপ্ত রূপ, অতি-কথ্য শব্দ ও বিস্ময়চিহ্ন এড়িয়ে চলুন — কিন্তু Speaking-এ সেগুলোই স্বাভাবিক।',
        examples: [
          { english: 'Kids don’t like it.', note: 'too informal for Writing' },
          { english: 'Children generally dislike it.', note: 'appropriate' },
          { english: 'A lot of people think so.', note: 'weak' },
          { english: 'A significant proportion of the population holds this view.', note: 'stronger' },
        ],
      },
      {
        heading: 'Saying "I" without saying "I think" ten times',
        plain:
          'Opinion essays do need your position, and "In my opinion" once is fine. After that, vary it: "I would argue that…", "From my perspective…", "It seems to me that…", or simply state the claim with a hedge, which reads as your view anyway. Repeating one phrase in every paragraph is a repetition penalty under Lexical Resource.',
        bangla: '"In my opinion" বারবার নয় — "I would argue that", "It seems to me that" দিয়ে বদল আনুন।',
        examples: [
          { english: 'In my view, the second approach is more practical.' },
          { english: 'I would argue that education offers a more lasting solution.' },
          { english: 'It seems to me that both factors are involved.' },
        ],
      },
      {
        heading: 'Do not hedge everything',
        plain:
          'A conclusion needs a position. If every sentence in the essay is softened, the reader never learns what you think, and Task Response marks that down as an unclear position. Hedge the evidence and the predictions; state your own view clearly. "The evidence suggests X. I therefore believe Y is the better approach."',
        bangla: 'সব কিছু নরম করবেন না — প্রমাণ hedge করুন, কিন্তু নিজের মতামত স্পষ্টভাবে বলুন।',
        examples: [
          { english: 'The evidence suggests that early intervention is more effective.', note: 'hedged evidence' },
          { english: 'I therefore believe that funding should be redirected towards schools.', note: 'a clear position' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'Everyone knows that technology is destroying society.',
        right: 'Many commentators argue that technology is weakening social ties.',
        why: '"Everyone knows" claims universal agreement, which is never true and cannot be supported. Attribute the view and soften the verb.',
      },
      {
        wrong: 'This will definitely solve the problem.',
        right: 'This is likely to reduce the problem considerably.',
        why: 'Predictions cannot be certain. "Definitely" invites the examiner to think of the exception.',
      },
      {
        wrong: 'Kids nowadays don’t respect their parents.',
        right: 'Some young people today appear less respectful towards their parents.',
        why: 'Three fixes: register (kids), short form (don’t), and an absolute claim about a whole generation.',
      },
      {
        wrong: 'In my opinion, I think that in my view this is wrong.',
        right: 'In my view, this approach is mistaken.',
        why: 'Three opinion markers doing one job. One is enough, and the sentence is shorter and stronger without the others.',
      },
    ],
    ieltsMoves: [
      'The evidence suggests that this approach is more effective in the long term.',
      'While this may be true in some cases, it does not apply universally.',
      'It is likely that these trends will continue unless action is taken.',
      'I would argue that the benefits of this policy outweigh its drawbacks.',
    ],
    checks: [
      {
        prompt: 'Hedge this: "Social media causes depression."',
        answer: 'Social media may contribute to depression in some people.',
        why: 'A modal plus a softer verb plus a limited scope turns an unprovable claim into a defensible one.',
      },
      {
        prompt: 'Make it academic: "Loads of kids don’t like maths."',
        answer: 'Many children dislike mathematics.',
        why: 'Informal quantifier, informal noun and a short form all replaced.',
      },
      {
        prompt: 'Which is stronger: "may be" or "is likely to be"?',
        answer: '"is likely to be"',
        why: 'It states a probability above fifty per cent, while "may" is roughly even.',
      },
      {
        prompt: 'What is wrong with hedging every sentence?',
        answer: 'Your own position disappears, and Task Response requires a clear one.',
        why: 'Hedge the evidence; state your view.',
      },
    ],
  },
  {
    dayIndex: 28,
    title: 'Punctuation, and what the examiner is marking',
    banglaTitle: 'যতিচিহ্ন এবং পরীক্ষক আসলে কী দেখেন',
    goal: 'You can punctuate accurately and check your own writing against the criterion it is actually marked on.',
    ieltsWhy:
      'Grammatical Range and Accuracy is 25% of the Writing score and is judged on two things only: how much variety you show, and how many of your sentences are error-free. This day turns that into something you can check yourself.',
    minutes: 30,
    sections: [
      {
        heading: 'The comma splice — the most common punctuation error',
        plain:
          'Two complete sentences cannot be joined by a comma. "The cost was high, we cancelled the project" is an error. You have four fixes: a full stop, a semicolon, a joining word (so, but, and), or a subordinator (because, although). Pick any one; what you cannot do is leave the comma alone.',
        bangla: 'দুটি পূর্ণ বাক্য কেবল কমা দিয়ে জোড়া যায় না — দাঁড়ি, সেমিকোলন বা সংযোজক শব্দ ব্যবহার করুন।',
        examples: [
          { english: 'The cost was high, we cancelled the project.', note: 'wrong' },
          { english: 'The cost was high, so we cancelled the project.', note: 'right' },
          { english: 'The cost was high. We cancelled the project.', note: 'right' },
          { english: 'Because the cost was high, we cancelled the project.', note: 'right' },
        ],
      },
      {
        heading: 'Where commas do belong',
        plain:
          'Four places worth knowing. After an introductory phrase: "In 2010, the figure doubled." Around extra information: "The report, which was published in May, is detailed." Between items in a list: "cost, quality and availability". And before a joining word linking two full clauses: "The plan was cheap, but it failed."',
        bangla: 'শুরুর বাক্যাংশের পরে, বাড়তি তথ্যের দুই পাশে, তালিকার মাঝে, আর দুটি পূর্ণ বাক্যের সংযোজকের আগে — এই চার জায়গায় কমা।',
        examples: [
          { english: 'By 2015, the trend had reversed.' },
          { english: 'The policy, introduced in 2010, was later abandoned.' },
          { english: 'The study examined cost, quality and access.' },
        ],
      },
      {
        heading: 'Capitals, apostrophes and the small marks',
        plain:
          'Capital letters for sentence starts, names, countries, languages, months and days — but not for seasons or subjects, so "in summer I study economics" is correct. The apostrophe marks possession: the student’s essay (one student), the students’ essays (several). It is never used to make a plural: "1990s", not "1990’s". And "its" means belonging to it, while "it’s" means "it is" — a short form you should not be writing in Task 2 at all.',
        bangla: 'দেশ, ভাষা, মাস ও বারের নামে বড় হাতের অক্ষর; ঋতু বা বিষয়ের নামে নয়।',
        examples: [
          { english: 'In July, Bengali students study English.', note: 'month, nationality, language' },
          { english: 'in summer, in winter', note: 'seasons take no capital' },
          { english: 'the government’s policy', note: 'possession' },
          { english: 'during the 1990s', note: 'no apostrophe in a decade' },
        ],
      },
      {
        heading: 'The self-check, in five passes',
        plain:
          'When you finish a piece of writing, read it five times, looking for one thing each time. First: does every sentence have a subject and a verb? Second: do the verbs agree — the -s on he, she and it? Third: is every singular countable noun preceded by a, an, the or something else? Fourth: is the tense consistent within each paragraph? Fifth: is every sentence separated by a full stop rather than a comma? Five quick passes catch more than one slow one.',
        bangla: 'লেখা শেষে পাঁচবার পড়ুন — প্রতিবার একটি জিনিস খুঁজুন: ক্রিয়া, -s, article, কাল, আর যতিচিহ্ন।',
        examples: [
          { english: 'Pass 1: every sentence has a verb.' },
          { english: 'Pass 2: he works, not he work.' },
          { english: 'Pass 3: a student, the government, not just student.' },
        ],
        table: {
          caption: 'The five passes, with the day that taught each',
          headers: ['Pass', 'Look for', 'Day'],
          rows: [
            ['1', 'a subject and a verb in every sentence', 'day 1'],
            ['2', 'the -s on he, she and it', 'day 3'],
            ['3', 'an article before every singular countable noun', 'day 5'],
            ['4', 'one tense held across the paragraph', 'day 14'],
            ['5', 'full stops, not comma splices', 'day 28'],
          ],
        },
      },
      {
        heading: 'What "range" really means',
        plain:
          'Range is not showing off. The descriptor asks for a variety of structures used accurately, and four is plenty: a complex sentence with although or because, a relative clause, a passive where it belongs, and one conditional. Use each once, correctly, in a 250-word essay and you have demonstrated range. Ten structures with five errors demonstrates the opposite.',
        bangla: 'বৈচিত্র্য মানে সব কিছু ব্যবহার করা নয় — চারটি গঠন নির্ভুলভাবে ব্যবহার করাই যথেষ্ট।',
        examples: [
          { english: 'Although the cost is high, the long-term benefits are considerable.', note: 'subordination' },
          { english: 'The policy, which was introduced in 2015, has had mixed results.', note: 'relative clause' },
          { english: 'These measures should be introduced gradually.', note: 'passive with a modal' },
          { english: 'If governments acted now, the problem would be far smaller.', note: 'second conditional' },
        ],
      },
      {
        heading: 'Where to go from here',
        plain:
          'You have the whole system now: the sentence, the twelve tenses, the modals, the conditionals, the passive, relative clauses, the linkers and the register. What builds confidence from here is not more grammar — it is using this grammar until it stops needing thought. Write one paragraph a day, run the five passes over it, and go back to the day that explains whatever you keep getting wrong.',
        bangla: 'এখান থেকে আর নতুন ব্যাকরণ নয় — প্রতিদিন এক অনুচ্ছেদ লিখুন, পাঁচবার যাচাই করুন, আর যেটি ভুল হয় সেই দিনে ফিরে যান।',
        examples: [
          { english: 'Write one paragraph a day, then run the five passes over it.' },
          {
            english: 'Keep a list of the three errors you make most, and check for those first.',
            note: 'most learners repeat the same three, not thirty',
          },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'The results were clear, however the committee disagreed.',
        right: 'The results were clear. However, the committee disagreed.',
        why: 'A comma splice with "however", which is the single most frequent punctuation error in IELTS Writing.',
      },
      {
        wrong: 'In the Summer, many Students travel abroad.',
        right: 'In the summer, many students travel abroad.',
        why: 'Seasons and ordinary nouns take no capital letter. Capitals belong to names, countries, languages, months and days.',
      },
      {
        wrong: 'The countrys economy grew during the 1990’s.',
        right: 'The country’s economy grew during the 1990s.',
        why: 'The apostrophe marks possession, not a plural. It belongs in "country’s" and not in "1990s".',
      },
      {
        wrong: 'Its clear that the policy failed.',
        right: 'It is clear that the policy failed.',
        why: '"Its" means belonging to it. The short form "it’s" would be correct in speech but should be written in full in Task 2.',
      },
    ],
    ieltsMoves: [
      'Although the evidence is mixed, the overall trend is clear.',
      'The measures, which were introduced in 2018, have had limited effect.',
      'If this approach were adopted more widely, the results would be significant.',
      'In conclusion, while both views have merit, I believe the first is more convincing.',
    ],
    checks: [
      {
        prompt: 'Fix: "The plan was expensive, it was cancelled."',
        answer: 'The plan was expensive, so it was cancelled.',
        why: 'A comma alone cannot join two complete sentences. Any of the four fixes works.',
      },
      {
        prompt: 'Capital or not: "in winter, many bengali students study english"?',
        answer: 'In winter, many Bengali students study English.',
        why: 'Nationalities and languages take capitals; seasons do not.',
      },
      {
        prompt: 'the students essays (plural, several students) — where does the apostrophe go?',
        answer: 'the students’ essays',
        why: 'After the s when the owner is plural, before it when the owner is singular.',
      },
      {
        prompt: 'Name the five passes.',
        answer: 'Verb, -s agreement, articles, tense consistency, full stops.',
        why: 'One thing per pass catches more errors than one slow read looking for everything.',
      },
    ],
  },
];
