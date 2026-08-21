import { type GrammarDayEntry } from './schema';

/**
 * Week 3 — the structures the exam rewards.
 *
 * Weeks 1 and 2 were about being correct. This week is about being *marked
 * well*: the modals, the conditionals, the passive, relative clauses and the
 * language of comparison are what the Grammatical Range descriptor is actually
 * describing when it says "a variety of complex structures".
 *
 * Day 16 is a whole day on one word. That is deliberate and it was asked for:
 * **would** does five unrelated jobs, textbooks usually teach one of them, and
 * a learner who has only met it inside "if" sentences cannot read half the
 * sentences in a Task 2 model answer.
 */
export const GRAMMAR_DAYS_15_21: readonly GrammarDayEntry[] = [
  {
    dayIndex: 15,
    title: 'Modals — can, could, may, might, must, should',
    banglaTitle: 'Modal verbs — সামর্থ্য, সম্ভাবনা, প্রয়োজন ও পরামর্শ',
    goal: 'You can express ability, possibility, obligation and advice, and you can control how strong each sentence sounds.',
    ieltsWhy:
      'Task 2 is an argument, and an argument is made of degrees of certainty. "This causes crime" and "this may contribute to crime" are marked differently — the second is defensible, and defensible writing scores higher.',
    minutes: 30,
    sections: [
      {
        heading: 'What a modal is, and the two rules it never breaks',
        plain:
          'A modal is a small helper word placed in front of a verb to change how certain, how possible or how necessary the action is. There are only about ten of them, and they follow two rules with no exceptions. First: the verb after a modal is always plain — can go, must work, should study, never "can goes" or "must to work". Second: a modal never takes -s, even with he or she.',
        bangla: 'Modal-এর পরে ক্রিয়া সব সময় সাধারণ রূপে থাকে, আর modal-এর শেষে কখনো -s বসে না।',
        examples: [
          { english: 'She can speak three languages.', note: 'not "can speaks"' },
          { english: 'He must submit the form today.', note: 'not "must to submit"' },
          { english: 'They should study harder.' },
        ],
      },
      {
        heading: 'Ability and permission: can and could',
        plain:
          'CAN is ability now and informal permission. COULD is ability in the past, and a politer version of can. "I can swim" is a fact about today; "I could swim when I was five" is about the past. "Could you help me?" is simply a softer "Can you help me?" — and softer is what you want with a stranger or an examiner.',
        bangla: 'can = এখনকার সামর্থ্য, could = অতীতের সামর্থ্য বা বেশি বিনীত অনুরোধ।',
        examples: [
          { english: 'I can use spreadsheets well.' },
          { english: 'I could read before I started school.', note: 'past ability' },
          { english: 'Could you repeat the question, please?', note: 'polite' },
        ],
      },
      {
        heading: 'Possibility: may, might, could',
        plain:
          'All three mean "perhaps", and the difference in strength is small: may is about a fifty-fifty chance, might is a little weaker, could is roughly the same as might. What matters for IELTS is that they exist. A sentence like "Air pollution may be responsible for the increase" makes a careful claim, and careful claims are what a band-7 argument is made of.',
        bangla: 'may, might, could — তিনটিই সম্ভাবনা বোঝায়; নিশ্চিত না হলে এগুলো ব্যবহার করুন।',
        examples: [
          { english: 'This policy may reduce traffic in the long term.' },
          { english: 'Rising costs might explain the fall in demand.' },
          { english: 'The two factors could be connected.' },
        ],
      },
      {
        heading: 'Obligation: must, have to, should',
        plain:
          'MUST is strong and usually comes from the speaker: "I must finish this tonight." HAVE TO is strong and comes from outside — a rule, a law, a boss: "You have to show your passport." SHOULD is advice, not obligation: "The government should invest more." In Task 2, "should" is your recommendation verb and it appears in almost every conclusion.',
        bangla: 'must = নিজের কড়া প্রয়োজন, have to = বাইরের নিয়ম, should = পরামর্শ।',
        examples: [
          { english: 'Passengers must not carry liquids.', note: 'a rule' },
          { english: 'I have to renew my visa next month.', note: 'an outside requirement' },
          { english: 'Schools should teach financial literacy.', note: 'advice — the Task 2 workhorse' },
        ],
        table: {
          caption: 'Strength, from strongest to weakest',
          headers: ['Modal', 'Meaning', 'Example'],
          rows: [
            ['must', 'necessary, no choice', 'Applicants must provide evidence'],
            ['have to', 'required by a rule outside you', 'You have to book in advance'],
            ['should', 'advice, a good idea', 'Governments should act now'],
            ['may / might', 'possible', 'This may increase costs'],
            ['can', 'able, or generally possible', 'Exercise can reduce stress'],
          ],
        },
      },
      {
        heading: 'must not is not the opposite of must',
        plain:
          'This trap catches everyone. "You must not go" means it is forbidden. "You do not have to go" means it is optional. They sound like opposites of the same word but they mean completely different things, and using the wrong one reverses your meaning entirely.',
        bangla: '"must not" মানে নিষেধ, আর "don’t have to" মানে দরকার নেই — দুটি সম্পূর্ণ আলাদা।',
        examples: [
          { english: 'You must not use a dictionary.', note: 'forbidden' },
          { english: 'You do not have to use a dictionary.', note: 'allowed, but not required' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'She can to drive a car.',
        right: 'She can drive a car.',
        why: 'No modal is ever followed by "to". The verb goes in its plain form immediately after it.',
      },
      {
        wrong: 'He must studies harder.',
        right: 'He must study harder.',
        why: 'A modal never takes the third-person -s, and neither does the verb behind it.',
      },
      {
        wrong: 'Governments must solve every social problem.',
        right: 'Governments should address these problems.',
        why: 'Not a grammar error but an argument error. "Must" states an absolute obligation, which is hard to defend; "should" is a recommendation, which is what an essay is asked for.',
      },
      {
        wrong: 'You must not bring your own pen.',
        right: 'You do not have to bring your own pen.',
        why: 'The first forbids it. If you mean it is simply not required, the negative belongs on "have to".',
      },
    ],
    ieltsMoves: [
      'Governments should invest more heavily in public transport.',
      'This may be one of the main reasons for the decline.',
      'Such measures can significantly reduce the problem.',
      'Applicants must meet all three conditions to qualify.',
    ],
    checks: [
      {
        prompt: 'Fix: "He can to speak English."',
        answer: 'He can speak English.',
        why: 'A modal is followed by the plain verb, never by "to".',
      },
      {
        prompt: 'must or should: "The government ___ consider this option."',
        answer: 'should',
        why: 'It is advice in an essay, not a law. "Should" is the recommendation modal.',
      },
      {
        prompt: 'What is the difference between "You must not wait" and "You do not have to wait"?',
        answer: 'The first forbids waiting; the second says waiting is optional.',
        why: 'The negative attaches to different things: to the action, or to the necessity.',
      },
      {
        prompt: 'Soften this: "Pollution causes this problem."',
        answer: 'Pollution may be a major cause of this problem.',
        why: 'A modal turns an absolute claim into a defensible one, which scores better in Task 2.',
      },
    ],
  },
  {
    dayIndex: 16,
    title: '"would" — the five jobs of one word',
    banglaTitle: '"would" — একটি শব্দের পাঁচটি কাজ',
    goal: 'You can recognise which of would’s five jobs a sentence is doing, and you can use each of them on purpose.',
    ieltsWhy:
      'Would appears in Speaking Part 3 hypotheticals, in every second conditional, in polite requests, in past habits in Part 2, and as the main hedging device in Task 2. One word, five places in the exam — and most learners only ever meet the conditional one.',
    minutes: 35,
    sections: [
      {
        heading: 'Job 1 — the unreal present: imagining',
        plain:
          'This is would’s main job. It describes something that is not real: a situation you are imagining. "If I had a million taka, I would buy a house." I do not have it, so the buying is imaginary, and "would" is the word that marks it as imaginary. Whenever you are talking about something that is not true right now, the result half of the sentence takes would.',
        bangla: 'যা বাস্তব নয়, শুধু কল্পনা — সেই কল্পনার ফল বোঝাতে would।',
        examples: [
          { english: 'If I lived in London, I would visit museums every week.' },
          { english: 'I would take the job if they offered it.' },
          { english: 'It would be difficult to solve this problem quickly.' },
        ],
      },
      {
        heading: 'Job 2 — politeness: softening a request',
        plain:
          'Would makes a request gentle. "Do you want tea?" becomes "Would you like tea?" "Can you help?" becomes "Would you mind helping?" Nothing about the meaning changes — only the manner. In Speaking, "I would say that…" is a natural, polite way to start an opinion, and it buys you a second to think.',
        bangla: 'অনুরোধ বা প্রস্তাব বিনীত করতে would ব্যবহার হয়।',
        examples: [
          { english: 'Would you like some tea?', note: 'politer than "do you want"' },
          { english: 'I would like to apply for this course.', note: 'politer than "I want"' },
          { english: 'Would you mind repeating that?' },
        ],
      },
      {
        heading: 'Job 3 — past habits: what you used to do',
        plain:
          'Would can describe something you did repeatedly in the past, the same as "used to". "Every summer we would visit my grandparents." It is warmer and more storylike than the past simple, which makes it excellent in Speaking Part 2. One restriction: this job only works with actions, not with states — say "I used to have a bicycle", not "I would have a bicycle".',
        bangla: 'অতীতে বারবার করা কাজ বোঝাতে would ব্যবহার করা যায়, ঠিক used to-র মতো।',
        examples: [
          { english: 'When I was a child, we would go to the river every Friday.' },
          { english: 'My father would read to us before bed.' },
          { english: 'I would have long hair then.', note: 'wrong — a state, so use "I used to have"' },
        ],
      },
      {
        heading: 'Job 4 — the future seen from the past',
        plain:
          'When you tell a story about the past and mention what was going to happen next, "will" becomes "would". "He said he will come" becomes "He said he would come." This is the same shift that reported speech uses on day 24, and it is why "would" turns up so often in narrative writing.',
        bangla: 'অতীতের কথায় ভবিষ্যতের কথা বললে will বদলে would হয়ে যায়।',
        examples: [
          { english: 'She promised that she would send the documents.' },
          { english: 'We knew the journey would take six hours.' },
          { english: 'Nobody expected that the price would fall so quickly.' },
        ],
      },
      {
        heading: 'Job 5 — hedging: the Task 2 job',
        plain:
          'This is the one that changes essay marks. "Would" lets you make a claim without claiming it absolutely. "Banning cars would reduce pollution" says the same thing as "banning cars reduces pollution", but honestly — it presents the result as an expected consequence rather than as a proven fact. Examiners read a lot of overconfident essays. A hedged claim reads as a thinking writer.',
        bangla: 'দাবিটাকে নরম করে "সম্ভাব্য ফল" হিসেবে বলার জন্য Task 2-তে would খুব কাজে লাগে।',
        examples: [
          { english: 'Such a policy would benefit low-income families.' },
          { english: 'It would be unrealistic to expect an immediate change.' },
          { english: 'I would argue that education is the more effective solution.' },
        ],
        table: {
          caption: 'The five jobs at a glance',
          headers: ['Job', 'Signal', 'Example'],
          rows: [
            ['unreal present', 'an if-sentence, or an imagined situation', 'If I were rich, I would travel'],
            ['politeness', 'a request or an offer', 'Would you like some help?'],
            ['past habit', 'a repeated past action, with a time phrase', 'We would visit every Eid'],
            ['future in the past', 'after said, knew, thought, promised', 'He said he would call'],
            ['hedging', 'a claim in an essay', 'This would improve public health'],
          ],
        },
      },
      {
        heading: 'What never follows "would"',
        plain:
          'Three fixed rules. The verb after would is always plain: would go, never would goes and never would to go. Would never appears in the "if" half of a second conditional — "If I would have money" is wrong, it is "If I had money". And for something imagined in the *past*, would takes a third form behind it: "I would have gone", which is day 17’s third conditional.',
        bangla: 'would-এর পরে সব সময় সাধারণ ক্রিয়া; "if" অংশে would বসে না।',
        examples: [
          { english: 'If I would have time, I would help.', note: 'wrong' },
          { english: 'If I had time, I would help.', note: 'right' },
          { english: 'I would have helped if you had asked.', note: 'right — imagined past' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'If I would be rich, I would travel the world.',
        right: 'If I were rich, I would travel the world.',
        why: '"Would" belongs only in the result half. The "if" half takes the past form — and with "to be" the traditional written form is "were" for every subject.',
      },
      {
        wrong: 'I would like to went there.',
        right: 'I would like to go there.',
        why: 'After "would like to" comes the plain verb. Would itself never touches a past form directly.',
      },
      {
        wrong: 'When I was young, I would be very shy.',
        right: 'When I was young, I used to be very shy.',
        why: 'The past-habit job of "would" works with actions only. For a state, "used to" is the correct choice.',
      },
      {
        wrong: 'He said he will help me.',
        right: 'He said he would help me.',
        why: 'A past reporting verb pulls "will" back to "would". This is the future-in-the-past job.',
      },
      {
        wrong: 'This policy would definitely solves the problem.',
        right: 'This policy would help to solve the problem.',
        why: 'Two things: the verb after would is plain, and "definitely" undoes the hedge that "would" was there to provide.',
      },
    ],
    ieltsMoves: [
      'I would argue that the second approach is more effective.',
      'Such a change would have a significant impact on rural communities.',
      'It would be difficult to implement this policy without public support.',
      'If governments invested more in education, the problem would gradually disappear.',
    ],
    checks: [
      {
        prompt: 'Which job? "Would you mind opening the window?"',
        answer: 'Politeness.',
        why: 'It is a request made gentle. The meaning is simply "please open the window".',
      },
      {
        prompt: 'Fix: "If I would have a car, I would drive to work."',
        answer: 'If I had a car, I would drive to work.',
        why: '"Would" never appears in the if-half of a second conditional.',
      },
      {
        prompt: 'Which job? "Every winter we would visit our village."',
        answer: 'Past habit.',
        why: 'A repeated past action with a time phrase. "Used to" would work equally well here.',
      },
      {
        prompt: 'Hedge this claim: "Free transport reduces traffic."',
        answer: 'Free transport would reduce traffic.',
        why: 'It presents the result as an expected consequence rather than a proven fact — the Task 2 job.',
      },
    ],
  },
  {
    dayIndex: 17,
    title: 'Conditionals — zero, first, second, third',
    banglaTitle: 'Conditional — শর্তবাচক বাক্য',
    goal: 'You can build all four if-sentences and choose the one that matches how real the situation is.',
    ieltsWhy:
      'Speaking Part 3 asks hypothetical questions almost by design — "What would happen if…?" — and Task 2 arguments run on consequences. One accurate second conditional is worth more than three shaky complex sentences.',
    minutes: 35,
    sections: [
      {
        heading: 'Zero — always true',
        plain:
          'If plus present, then present. This is for things that always happen: scientific facts, rules, automatic results. "If you heat water to 100 degrees, it boils." You can replace "if" with "when" and the sentence still means the same thing — that is the test for a zero conditional.',
        bangla: 'যা সব সময় ঘটে — if + present, তারপর present।',
        examples: [
          { english: 'If you heat ice, it melts.' },
          { english: 'If people exercise regularly, they stay healthier.' },
          { english: 'Plants die if they do not get water.' },
        ],
      },
      {
        heading: 'First — real and likely',
        plain:
          'If plus present, then will. This is a real possibility in the future. "If it rains, I will stay at home." It might rain; that is genuinely on the table. Remember the day 13 rule: no "will" in the if-half, however future the meaning is.',
        bangla: 'সত্যিকারের সম্ভাবনা — if + present, তারপর will।',
        examples: [
          { english: 'If the government raises taxes, businesses will suffer.' },
          { english: 'If I pass this test, I will apply to a university abroad.' },
          { english: 'We will start on time if everyone arrives by nine.' },
        ],
      },
      {
        heading: 'Second — unreal or unlikely now',
        plain:
          'If plus past, then would. The situation is imaginary or very unlikely. "If I had a million taka, I would start a business." The past form here is not about past time at all — it is English’s way of marking distance from reality. This is the conditional IELTS Speaking Part 3 asks for most often.',
        bangla: 'কল্পনা বা অসম্ভব — if + past, তারপর would। এখানে past মানে অতীত নয়, অবাস্তবতা।',
        examples: [
          { english: 'If I were the prime minister, I would invest in education.' },
          { english: 'If cities had better transport, fewer people would drive.' },
          { english: 'What would you do if you lost your job?' },
        ],
      },
      {
        heading: 'Third — the past that did not happen',
        plain:
          'If plus had plus third form, then would have plus third form. It talks about a past that cannot be changed. "If I had studied harder, I would have passed." I did not study, and I did not pass — the sentence is regret, or explanation. It is the longest form in the language and using one correctly is a clear signal of range.',
        bangla: 'অতীতে যা ঘটেনি — if + had + তৃতীয় রূপ, তারপর would have + তৃতীয় রূপ।',
        examples: [
          { english: 'If I had known about the deadline, I would have applied.' },
          { english: 'If the policy had been introduced earlier, the crisis would have been avoided.' },
        ],
        table: {
          caption: 'The four, side by side',
          headers: ['Type', 'If-half', 'Result half', 'Means'],
          rows: [
            ['zero', 'if + present', 'present', 'always true'],
            ['first', 'if + present', 'will + verb', 'real and possible'],
            ['second', 'if + past', 'would + verb', 'imaginary now'],
            ['third', 'if + had + 3rd form', 'would have + 3rd form', 'impossible past'],
          ],
        },
      },
      {
        heading: 'Mixed, and the unless shortcut',
        plain:
          'Two extras worth having. A mixed conditional joins a past cause to a present result: "If I had studied medicine, I would be a doctor now." And "unless" means "if not" — "Unless the government acts, the problem will worsen" is the same as "If the government does not act…". Do not put a second negative after unless; it is already negative.',
        bangla: '"unless" মানেই "if not" — এর পরে আবার not বসাবেন না।',
        examples: [
          { english: 'If I had taken that job, I would be living in Chittagong now.', note: 'mixed' },
          { english: 'Unless action is taken, conditions will deteriorate.' },
          { english: 'Unless we do not act…', note: 'wrong — two negatives' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'If it will rain, I will stay at home.',
        right: 'If it rains, I will stay at home.',
        why: 'The if-half never takes "will", even though the meaning is future. The present form carries it.',
      },
      {
        wrong: 'If I would have money, I would buy a car.',
        right: 'If I had money, I would buy a car.',
        why: 'The second conditional puts the past form in the if-half and "would" only in the result.',
      },
      {
        wrong: 'If I would have studied, I would have passed.',
        right: 'If I had studied, I would have passed.',
        why: 'The third conditional takes "had" in the if-half. "Would have" belongs on the result side only.',
      },
      {
        wrong: 'Unless you do not hurry, you will miss the bus.',
        right: 'Unless you hurry, you will miss the bus.',
        why: '"Unless" already contains the "not". Adding another one reverses the meaning.',
      },
    ],
    ieltsMoves: [
      'If governments invested more in renewable energy, emissions would fall significantly.',
      'Unless urgent action is taken, the situation will continue to deteriorate.',
      'If the policy had been introduced a decade ago, many of these problems would have been avoided.',
      'If people are given the right information, they usually make better choices.',
    ],
    checks: [
      {
        prompt: 'Which type? "If I had more time, I would learn another language."',
        answer: 'Second conditional.',
        why: 'Past form in the if-half, would in the result: imaginary now.',
      },
      {
        prompt: 'Fill in: "If I ___ (know) earlier, I would have told you."',
        answer: 'had known',
        why: 'Third conditional — an impossible past takes "had" plus the third form.',
      },
      {
        prompt: 'Fix: "If she will come, we will start."',
        answer: 'If she comes, we will start.',
        why: 'No "will" after "if" in a first conditional.',
      },
      {
        prompt: 'Rewrite with "unless": "If the government does not act, the crisis will worsen."',
        answer: 'Unless the government acts, the crisis will worsen.',
        why: '"Unless" replaces "if … not", and the verb becomes positive.',
      },
    ],
  },
  {
    dayIndex: 18,
    title: 'The passive — when the doer does not matter',
    banglaTitle: 'Passive voice — কর্মবাচ্য',
    goal: 'You can turn any active sentence into a passive one and, more importantly, know when you should.',
    ieltsWhy:
      'Task 1 process diagrams are written almost entirely in the passive — "the beans are dried and then roasted" — and academic Task 2 uses it to sound impersonal: "It is often argued that…". Both are marked as range.',
    minutes: 30,
    sections: [
      {
        heading: 'The form: to be + third form',
        plain:
          'Take the verb "to be" in whatever tense you need, and add the third form of the main verb. "The company built the bridge" becomes "The bridge was built by the company". The object moves to the front, the doer moves to the end after "by" — or disappears entirely, which is usually the point.',
        bangla: 'to be + ক্রিয়ার তৃতীয় রূপ। কর্ম সামনে আসে, কর্তা পিছনে যায় বা একেবারে বাদ পড়ে।',
        examples: [
          { english: 'The bridge was built in 1998.' },
          { english: 'The results are checked twice.' },
          { english: 'A new system has been introduced.' },
        ],
        table: {
          caption: 'The passive in each tense',
          headers: ['Tense', 'Active', 'Passive'],
          rows: [
            ['present simple', 'They make cars here', 'Cars are made here'],
            ['past simple', 'They made cars here', 'Cars were made here'],
            ['present perfect', 'They have made cars', 'Cars have been made'],
            ['future', 'They will make cars', 'Cars will be made'],
            ['modal', 'They must check it', 'It must be checked'],
          ],
        },
      },
      {
        heading: 'Why you would choose it',
        plain:
          'Three reasons, and none of them is "to sound clever". First, the doer is unknown or unimportant: "My bag was stolen." Second, the doer is obvious: "The suspect was arrested" — by the police, of course. Third, you want the focus on the thing rather than the person, which is exactly what a process description needs.',
        bangla: 'কে করেছে তা অজানা, অস্পষ্ট বা অপ্রয়োজনীয় হলে passive ব্যবহার করুন।',
        examples: [
          { english: 'My phone was stolen last night.', note: 'we do not know who' },
          { english: 'English is spoken all over the world.', note: 'by everyone — no need to say' },
          { english: 'The samples are then placed in a container.', note: 'a process' },
        ],
      },
      {
        heading: 'The Task 1 process voice',
        plain:
          'If a Task 1 question gives you a diagram of how something is made, the passive is not one option among several — it is the expected voice for the whole answer. Combine it with sequence words: first, then, next, after that, finally. "First, the raw material is collected. It is then washed and sorted. Finally, the product is packaged."',
        bangla: 'Task 1-এর process বর্ণনায় পুরো উত্তরটাই passive-এ লেখা হয়, সঙ্গে first, then, finally।',
        examples: [
          { english: 'First, the grain is harvested and transported to the mill.' },
          { english: 'The mixture is then heated to a high temperature.' },
          { english: 'Finally, the finished product is distributed to retailers.' },
        ],
      },
      {
        heading: 'The impersonal essay opener',
        plain:
          'A small set of passive phrases lets you present a common view without owning it. "It is often argued that…", "It is widely believed that…", "It has been suggested that…". These are ideal for the paragraph where you state the opposing view before disagreeing with it, and they are more academic than "many people say".',
        bangla: 'অন্যের মত তুলে ধরতে "It is often argued that…" ধরনের passive বাক্য খুব কার্যকর।',
        examples: [
          { english: 'It is often argued that technology isolates people.' },
          { english: 'It is widely believed that early education is crucial.' },
          { english: 'It has been suggested that the policy failed for economic reasons.' },
        ],
      },
      {
        heading: 'Do not overuse it',
        plain:
          'The passive is a tool, not a style. An entire essay in the passive is heavy and hard to read, and examiners mark clarity too. Use it where it belongs — processes, unknown doers, impersonal claims — and keep the active voice everywhere else, because the active is shorter and clearer.',
        bangla: 'পুরো লেখা passive-এ লিখবেন না — যেখানে দরকার সেখানেই ব্যবহার করুন।',
        examples: [
          { english: 'The decision was made by the committee.', note: 'fine, but longer' },
          { english: 'The committee made the decision.', note: 'clearer, and usually better' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'The report was wrote by the manager.',
        right: 'The report was written by the manager.',
        why: 'The passive needs the third form, not the past. Write, wrote, written.',
      },
      {
        wrong: 'The problem is discuss in the article.',
        right: 'The problem is discussed in the article.',
        why: 'Both halves are required. "Is" without the third form is half a verb.',
      },
      {
        wrong: 'The accident was happened yesterday.',
        right: 'The accident happened yesterday.',
        why: '"Happen" has no object, so it cannot be made passive. The same is true of arrive, occur, rise, fall and appear.',
      },
      {
        wrong: 'It is believed by many people that education is important.',
        right: 'It is widely believed that education is important.',
        why: 'Grammatically fine, but naming the doer defeats the purpose of an impersonal construction. An adverb does the job better.',
      },
    ],
    ieltsMoves: [
      'It is often argued that stricter regulation is the only solution.',
      'The raw materials are first sorted and then processed.',
      'A number of measures have been introduced in recent years.',
      'This issue must be addressed at a national level.',
    ],
    checks: [
      {
        prompt: 'Make it passive: "Somebody stole my bike."',
        answer: 'My bike was stolen.',
        why: 'The doer is unknown, so the passive is the natural choice and "by somebody" is dropped.',
      },
      {
        prompt: 'Fix: "The letter was send yesterday."',
        answer: 'The letter was sent yesterday.',
        why: 'Send, sent, sent — the third form is needed after "was".',
      },
      {
        prompt: 'Why is "The problem was occurred" wrong?',
        answer: '"Occur" has no object, so it has no passive form.',
        why: 'Only verbs that take an object can be turned around.',
      },
      {
        prompt: 'Rewrite impersonally: "Many people think that money brings happiness."',
        answer: 'It is widely believed that money brings happiness.',
        why: 'The impersonal passive presents the view without attributing it to a vague group.',
      },
    ],
  },
  {
    dayIndex: 19,
    title: 'Relative clauses — who, which, that, where',
    banglaTitle: 'Relative clause — who, which, that দিয়ে বাক্য জোড়া',
    goal: 'You can join two short sentences into one longer one, and you know exactly when a comma is required.',
    ieltsWhy:
      'This is the cheapest complex sentence in English and the most reliable way to show range. Two simple sentences joined properly reads as band 7; the same two left separate reads as band 5.',
    minutes: 30,
    sections: [
      {
        heading: 'Joining two sentences into one',
        plain:
          'Take two sentences about the same thing: "I met a teacher. She studied in London." Replace the repeated word with who, which, that or where, and you get one sentence: "I met a teacher who studied in London." The relative word does two jobs at once — it points back, and it holds the two halves together.',
        bangla: 'একই বিষয়ের দুটি বাক্যকে who, which, that দিয়ে জুড়ে একটি বাক্য বানানো হয়।',
        examples: [
          { english: 'I met a teacher who studied in London.' },
          { english: 'This is the book that changed my mind.' },
          { english: 'Dhaka is a city where traffic is a serious problem.' },
        ],
      },
      {
        heading: 'Which word to use',
        plain:
          'WHO for people. WHICH for things. THAT for either, in defining clauses only. WHERE for places. WHOSE for possession — "the student whose essay won". WHEN for times. Choosing "which" for a person is the commonest slip here, and it sounds abrupt to an examiner.',
        bangla: 'মানুষ → who, জিনিস → which, স্থান → where, অধিকার → whose।',
        examples: [
          { english: 'The candidate who applied first got the job.' },
          { english: 'The policy which was introduced last year has failed.' },
          { english: 'The village where I grew up has changed completely.' },
          { english: 'A student whose first language is Bangla may find this difficult.' },
        ],
        table: {
          caption: 'The relative words',
          headers: ['Word', 'Used for', 'Example'],
          rows: [
            ['who', 'people', 'the woman who called'],
            ['which', 'things', 'the report which arrived'],
            ['that', 'people or things, defining only', 'the report that arrived'],
            ['where', 'places', 'the city where I live'],
            ['whose', 'possession', 'the man whose car broke down'],
            ['when', 'times', 'the year when everything changed'],
          ],
        },
      },
      {
        heading: 'The comma rule, and why it changes the meaning',
        plain:
          'If the clause is needed to identify which one you mean, no commas: "Students who cheat are disqualified" — only the cheating ones. If it is extra information you could remove, use commas: "My brother, who lives in Dubai, is visiting" — I have one brother, and the Dubai part is a bonus. This is not decoration; the commas change what the sentence claims.',
        bangla: 'কোনটি বোঝাতে দরকার হলে কমা নয়; বাড়তি তথ্য হলে দুই পাশে কমা।',
        examples: [
          { english: 'Students who cheat are disqualified.', note: 'only the cheaters — no comma' },
          { english: 'My brother, who lives in Dubai, is a doctor.', note: 'extra information — commas' },
          { english: 'The report, which was published in May, has been criticised.' },
        ],
      },
      {
        heading: 'Two rules that catch people',
        plain:
          'First: "that" cannot be used after a comma. Say "The report, which was late…", never "The report, that was late…". Second: do not repeat the noun inside the clause. "The book that I read it was good" has one "it" too many — the relative word has already taken that job.',
        bangla: 'কমার পরে that বসে না, আর clause-এর ভিতরে আবার সর্বনাম বসানো যায় না।',
        examples: [
          { english: 'The house, that I bought last year, is small.', note: 'wrong — that after a comma' },
          { english: 'The house, which I bought last year, is small.', note: 'right' },
          { english: 'The film that I watched it was boring.', note: 'wrong — "it" is redundant' },
          { english: 'The film that I watched was boring.', note: 'right' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'The man which helped me was very kind.',
        right: 'The man who helped me was very kind.',
        why: '"Which" is for things. People take "who", and using the wrong one is noticed immediately.',
      },
      {
        wrong: 'This is the place where I was born there.',
        right: 'This is the place where I was born.',
        why: '"Where" already means "in that place". Adding "there" says it twice.',
      },
      {
        wrong: 'Students, who study regularly, get better results.',
        right: 'Students who study regularly get better results.',
        why: 'The commas turn it into a claim about all students. Without them, it correctly limits the claim to the regular studiers.',
      },
      {
        wrong: 'The report, that was published in May, is detailed.',
        right: 'The report, which was published in May, is detailed.',
        why: '"That" is never used in a comma clause. Only "which" and "who" can follow a comma.',
      },
    ],
    ieltsMoves: [
      'People who live in rural areas often have limited access to healthcare.',
      'The policy, which was introduced in 2015, has had mixed results.',
      'This is the main reason why many students choose to study abroad.',
      'Countries whose economies depend on tourism were hit hardest.',
    ],
    checks: [
      {
        prompt: 'Join: "I know a woman. She speaks five languages."',
        answer: 'I know a woman who speaks five languages.',
        why: 'A person, and the clause identifies which woman, so no comma.',
      },
      {
        prompt: 'Comma or no comma? "The book ___ I borrowed from you ___ was excellent."',
        answer: 'No commas — "The book that I borrowed from you was excellent."',
        why: 'The clause identifies which book, so it is essential and takes no commas.',
      },
      {
        prompt: 'Fix: "My mother, that is a teacher, retired last year."',
        answer: 'My mother, who is a teacher, retired last year.',
        why: '"That" cannot follow a comma, and a person takes "who".',
      },
      {
        prompt: 'Fix: "The city where I live in is crowded."',
        answer: 'The city where I live is crowded. (or: The city which I live in is crowded.)',
        why: '"Where" already contains the "in". Use one or the other, never both.',
      },
    ],
  },
  {
    dayIndex: 20,
    title: 'Comparing, and the language of change',
    banglaTitle: 'তুলনা ও পরিবর্তনের ভাষা',
    goal: 'You can compare two things accurately and describe a rise or fall with the right verb, adverb and preposition.',
    ieltsWhy:
      'This is the whole of Task 1. Every chart answer is comparison plus movement, and the marks come from doing both precisely rather than repeating "increase" nine times.',
    minutes: 30,
    sections: [
      {
        heading: 'Comparatives: -er or more',
        plain:
          'Short words take -er: cheaper, faster, higher, bigger. Longer words take "more": more expensive, more significant, more important. One syllable is always -er, three syllables is always more, and two-syllable words split — most take "more", but those ending in -y take -ier: happy becomes happier. And after a comparative, the joining word is "than", never "then".',
        bangla: 'ছোট শব্দে -er, বড় শব্দে more; তুলনার পরে "than" বসে।',
        examples: [
          { english: 'Housing is more expensive in the capital than in rural areas.' },
          { english: 'The second figure is higher than the first.' },
          { english: 'This method is easier and cheaper.' },
        ],
        table: {
          caption: 'Which form a word takes',
          headers: ['Length', 'Comparative', 'Superlative'],
          rows: [
            ['one syllable', 'cheap → cheaper', 'the cheapest'],
            ['two, ending in -y', 'easy → easier', 'the easiest'],
            ['two or more', 'expensive → more expensive', 'the most expensive'],
            ['irregular', 'good → better, bad → worse', 'the best, the worst'],
          ],
        },
      },
      {
        heading: 'Superlatives always take "the"',
        plain:
          'The highest, the most common, the least expensive. There is only one of them, so the reader knows which you mean — which is exactly day 5’s rule for "the". Superlatives are also where "in" and "of" appear: the highest in Asia, the most popular of the four.',
        bangla: 'সর্বোচ্চ-বাচক শব্দের আগে সব সময় "the" বসে।',
        examples: [
          { english: 'India recorded the highest figure of the five countries.' },
          { english: 'This is the most significant change in the data.' },
          { english: 'The least popular option was public transport.' },
        ],
      },
      {
        heading: 'The Task 1 movement kit',
        plain:
          'Learn these as sets. Going up: rise, increase, grow, climb, soar. Going down: fall, decrease, decline, drop, plummet. Staying still: remain stable, level off, stay constant. Changing direction: fluctuate, peak, bottom out. Each verb also has a noun form — "prices rose" and "there was a rise in prices" — and alternating between them is what stops a Task 1 answer sounding repetitive.',
        bangla: 'বাড়া, কমা, স্থির থাকা, ওঠানামা — প্রতিটির জন্য আলাদা শব্দ শিখুন এবং পালা করে ব্যবহার করুন।',
        examples: [
          { english: 'Sales rose sharply in the first quarter.' },
          { english: 'There was a sharp rise in sales in the first quarter.', note: 'the same fact, as a noun' },
          { english: 'Unemployment fell steadily before levelling off in 2015.' },
          { english: 'The figure fluctuated between 20% and 30%.' },
        ],
      },
      {
        heading: 'How much, and how fast',
        plain:
          'A verb of movement usually needs an adverb: sharply, dramatically, significantly for big changes; steadily, gradually for even ones; slightly, marginally for small ones. With the noun form the same words become adjectives: a sharp rise, a gradual decline. Getting the pair right — adverb with verb, adjective with noun — is where most learners slip.',
        bangla: 'ক্রিয়ার সঙ্গে adverb (sharply), আর noun-এর সঙ্গে adjective (a sharp rise)।',
        examples: [
          { english: 'The figure increased dramatically.', note: 'verb + adverb' },
          { english: 'There was a dramatic increase.', note: 'adjective + noun' },
          { english: 'Prices declined slightly over the period.' },
        ],
      },
      {
        heading: 'The prepositions of numbers',
        plain:
          'These are fixed and worth memorising as phrases. Rise BY an amount — the size of the change. Rise TO a figure — where it ended. Rise FROM one figure TO another. AT a level. A rise OF ten per cent. Say "increased by 5%" when you mean the gap, and "increased to 5%" when you mean the destination; they are different numbers.',
        bangla: 'by = কতটা বেড়েছে, to = কোথায় পৌঁছেছে, from…to = কোথা থেকে কোথায়।',
        examples: [
          { english: 'Sales rose by 15% last year.', note: 'the size of the change' },
          { english: 'Sales rose to 15 million.', note: 'the final figure' },
          { english: 'The figure fell from 60% to 45%.' },
          { english: 'It remained at around 30% for five years.' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'This method is more cheaper than the other one.',
        right: 'This method is cheaper than the other one.',
        why: 'Never both. A word takes either -er or "more", and using the two together is a doubled comparative.',
      },
      {
        wrong: 'The figure increased with 20%.',
        right: 'The figure increased by 20%.',
        why: 'The size of a change always takes "by". "With" is not used for amounts.',
      },
      {
        wrong: 'Dhaka is the most biggest city in the country.',
        right: 'Dhaka is the biggest city in the country.',
        why: 'A doubled superlative. "Biggest" is already the top of the scale.',
      },
      {
        wrong: 'There was a sharply increase in prices.',
        right: 'There was a sharp increase in prices.',
        why: 'An adverb cannot describe a noun. Before "increase" you need the adjective "sharp".',
      },
    ],
    ieltsMoves: [
      'The number of visitors rose sharply, from 2 million to 5 million, over the period.',
      'Spending on housing was significantly higher than spending on transport.',
      'The figure for China was more than twice that of Japan.',
      'After peaking in 2012, the trend levelled off and remained stable.',
    ],
    checks: [
      {
        prompt: 'Fix: "The second option is more better."',
        answer: 'The second option is better.',
        why: '"Better" is already comparative. Never combine it with "more".',
      },
      {
        prompt: 'by or to: "Prices increased ___ 10% to reach 55 taka."',
        answer: 'by',
        why: '10% is the size of the change, so it takes "by". 55 taka is the destination, so it takes "to".',
      },
      {
        prompt: 'Rewrite as a noun phrase: "The figure fell sharply."',
        answer: 'There was a sharp fall in the figure.',
        why: 'The adverb becomes an adjective when the verb becomes a noun.',
      },
      {
        prompt: 'Superlative of "significant"?',
        answer: 'the most significant',
        why: 'Three syllables, so it takes "most", and superlatives always take "the".',
      },
    ],
  },
  {
    dayIndex: 21,
    title: 'Building longer noun phrases',
    banglaTitle: 'বড় noun phrase তৈরি করা',
    goal: 'You can expand a bare noun into a precise, academic phrase, and keep the words in the order English demands.',
    ieltsWhy:
      'Band 7 writing is not made of longer sentences so much as denser ones. "Pollution" becomes "the rapid increase in industrial air pollution in urban areas" — same sentence structure, far more information, and both Lexical Resource and Grammatical Range go up.',
    minutes: 30,
    sections: [
      {
        heading: 'What a noun phrase is',
        plain:
          'A noun phrase is a noun plus everything attached to it. "Students" is a noun phrase. So is "the growing number of international students at British universities". Both can sit in the same slot in a sentence — they are one unit doing one job — and swapping the short one for the long one is the fastest upgrade available in Task 2.',
        bangla: 'একটি noun আর তার সঙ্গে যুক্ত সব শব্দ মিলে noun phrase — এটি বাক্যে একটি একক হিসেবে কাজ করে।',
        examples: [
          { english: 'Students face many problems.' },
          { english: 'International students at British universities face a number of financial problems.' },
        ],
      },
      {
        heading: 'The four places you can add information',
        plain:
          'You can add in front of the noun: a determiner (the, this, a number of), then describing words (rapid, industrial). You can add behind it: a prepositional phrase (in urban areas), a relative clause (which affects millions). Front, front, back, back — and that is the whole technique.',
        bangla: 'noun-এর আগে determiner ও বিশেষণ, পরে preposition বা relative clause — এভাবেই phrase বড় হয়।',
        examples: [
          { english: 'pollution', note: 'the bare noun' },
          { english: 'air pollution', note: 'a noun used as a describer' },
          { english: 'serious air pollution', note: 'an adjective' },
          { english: 'the serious air pollution in major cities', note: 'a prepositional phrase' },
          { english: 'the serious air pollution in major cities, which affects millions of people', note: 'a relative clause' },
        ],
        table: {
          caption: 'Growing one phrase, step by step',
          headers: ['Step', 'Phrase'],
          rows: [
            ['bare noun', 'traffic'],
            ['+ describer', 'traffic congestion'],
            ['+ adjective', 'severe traffic congestion'],
            ['+ determiner', 'the severe traffic congestion'],
            ['+ where', 'the severe traffic congestion in Dhaka'],
            ['+ clause', 'the severe traffic congestion in Dhaka, which costs the economy billions'],
          ],
        },
      },
      {
        heading: 'Adjective order — the one you already half know',
        plain:
          'When several adjectives stack up, English fixes their order: opinion, size, age, shape, colour, origin, material, purpose. "A beautiful small old wooden house" sounds right; "a wooden old small beautiful house" sounds wrong to every native speaker, and nobody can explain why without this list. In practice you rarely need more than two, so learn the beginning: opinion first, then size, then age.',
        bangla: 'একাধিক বিশেষণ থাকলে ইংরেজিতে তাদের ক্রম নির্দিষ্ট: মতামত → আকার → বয়স → রঙ।',
        examples: [
          { english: 'a serious long-term problem', note: 'opinion, then time' },
          { english: 'a large modern building' },
          { english: 'an important recent development' },
        ],
      },
      {
        heading: 'Nouns describing nouns',
        plain:
          'English lets one noun describe another, and the first one stays singular: a traffic problem, a government policy, a five-year plan, air pollution. This is enormously common in academic writing and it is shorter than the "of" version — "a government policy" beats "a policy of the government". Note the singular: "a three-hour journey", not "a three-hours journey".',
        bangla: 'একটি noun আরেকটি noun-কে বর্ণনা করতে পারে, আর প্রথমটি একবচনেই থাকে।',
        examples: [
          { english: 'a traffic problem, a government policy, a health system' },
          { english: 'a five-year plan', note: 'singular year, with a hyphen' },
          { english: 'a two-hour exam', note: 'not "two-hours"' },
        ],
      },
      {
        heading: 'Do not let it collapse',
        plain:
          'One warning. A long noun phrase is still a phrase, not a sentence — it has no verb. Building a beautiful twelve-word noun phrase and then forgetting to give it something to do is exactly the day 1 error, arriving in a much more sophisticated disguise. Write the phrase, then check the sentence still has a verb.',
        bangla: 'যত বড় noun phrase-ই হোক, বাক্যে ক্রিয়া লাগবেই — না হলে সেটি বাক্যই নয়।',
        examples: [
          { english: 'The rapid growth of the urban population in developing countries.', note: 'no verb — not a sentence' },
          { english: 'The rapid growth of the urban population in developing countries has created serious problems.', note: 'now it is one' },
        ],
      },
    ],
    mistakes: [
      {
        wrong: 'It is a two-hours journey from here.',
        right: 'It is a two-hour journey from here.',
        why: 'When a number and a noun describe another noun, the middle noun stays singular and takes a hyphen.',
      },
      {
        wrong: 'The pollution of the air in the cities of the country is increasing.',
        right: 'Urban air pollution is increasing.',
        why: 'Not wrong, but three "of" phrases in a row is heavy. Noun-plus-noun says the same thing in three words.',
      },
      {
        wrong: 'a wooden beautiful old table',
        right: 'a beautiful old wooden table',
        why: 'Adjective order is fixed in English: opinion, then age, then material.',
      },
      {
        wrong: 'The increasing number of young people who leave rural areas every year.',
        right: 'The increasing number of young people who leave rural areas every year is a serious concern.',
        why: 'A long noun phrase with no verb is still not a sentence, however impressive it looks.',
      },
    ],
    ieltsMoves: [
      'The rapid growth of the urban population has placed enormous pressure on public services.',
      'A significant proportion of household income is spent on housing.',
      'The widespread use of social media among young people has changed how they communicate.',
      'Long-term government investment in renewable energy is essential.',
    ],
    checks: [
      {
        prompt: 'Expand "problem" into a full noun phrase about traffic in Dhaka.',
        answer: 'the serious traffic problem in Dhaka',
        why: 'Determiner, adjective, noun-describer, noun, then a place phrase behind it.',
      },
      {
        prompt: 'Fix: "a five-years contract"',
        answer: 'a five-year contract',
        why: 'A noun describing another noun stays singular.',
      },
      {
        prompt: 'Is this a sentence? "The dramatic rise in the cost of living over the last decade."',
        answer: 'No — there is no verb.',
        why: 'It is one long noun phrase. Add a verb: "...has affected millions of families."',
      },
      {
        prompt: 'Put in order: old / an / interesting / building',
        answer: 'an interesting old building',
        why: 'Opinion comes before age in the fixed adjective order.',
      },
    ],
  },
];
