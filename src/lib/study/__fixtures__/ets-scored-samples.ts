/**
 * Responses ETS published WITH official scores.
 *
 * Source: TOEFL iBT Writing Practice Sets (ETS, 2023), Practice Set 4 —
 * https://www.ets.org/pdfs/toefl/toefl-ibt-writing-practice-sets.pdf
 * Transcribed verbatim from the PDF, typos and all. The errors are the
 * point: Response B's official 4 rests partly on "had have to use" and
 * "don't need to storage", so silently tidying them would destroy the
 * only thing that makes this a calibration set.
 *
 * WHY ACADEMIC DISCUSSION. Write for an Academic Discussion predates the
 * January 2026 redesign and survived it unchanged, so scores published in
 * 2023 still describe the task we grade today. No equivalent scored
 * samples are public for Take an Interview, Write an Email, or Listen and
 * Repeat — those tasks are new, and ETS keeps their exemplars inside
 * TestReady and TOEFL Practice Online.
 *
 * TWO SAMPLES IS NOT A CALIBRATION SET. It cannot establish agreement
 * rates, and it says nothing about the bottom of the scale — both
 * samples are strong responses. What it CAN catch is gross
 * miscalibration: a grader that hands a published 5 a band of 2 is
 * broken, and we would rather learn that from ETS's answer key than from
 * a student.
 */

export interface EtsScoredSample {
  id: string
  task: 'academic_discussion'
  /** The prompt as our pipeline would see it: instructions, the
   *  professor's question, and both classmate posts. */
  promptText: string
  responseText: string
  /** ETS's published score on the 0–5 rubric. */
  officialScore: number
  /** Condensed from ETS's own score explanation — used only for reading
   *  the harness output, never fed to the grader. */
  officialRationale: string
}

const DISCUSSION_PROMPT = `Your professor is teaching a class on economics. Write a post responding to the professor's question.

In your response you should:
- express and support your opinion
- make a contribution to the discussion

An effective response will contain at least 100 words. You will have 10 minutes to write it.

Dr. Achebe:
When people are asked about the most important discoveries or inventions made in the last two hundred years, they usually mention something very obvious, like the computer or the cell phone. But there are thousands of other discoveries or inventions that have had a huge impact on how we live today. What scientific discovery or technological invention from the last two hundred years—other than computers and cell phones—would you choose as being important? Why?

Paul:
I mean, we're so used to science and technology that we are not even aware of all the things we use in our daily lives. I would probably choose space satellites. This technology happened in the last hundred years, and it has become important for so many things. Just think about navigation, or telecommunications, or even the military.

Claire:
I am thinking about medical progress. Like, for example, when scientists discovered things about healthy nutrition. I am thinking of identifying all the vitamins we need to stay healthy. I am not sure exactly when the vitamin discoveries happened, but I know they are very important. Our health is much better than it was 200 years ago.`

export const ETS_SCORED_SAMPLES: EtsScoredSample[] = [
  {
    id: 'set4-response-a',
    task: 'academic_discussion',
    promptText: DISCUSSION_PROMPT,
    officialScore: 5,
    officialRationale:
      'Fully successful. Well-elaborated explanations and details supporting the main opinion; '
      + 'a relevant contribution to the discussion. Minor errors expected under timed conditions.',
    responseText: `In the past 200 years, tons of scientific discoveries or technological inventions have been shown to the world. If I had to choose one in particular it will probably be vaccine or antibiotics. With Pasteur's work and discoveries, the world changed in a way people couldn't imagine. So many people were dying really young because at that time life's conditions were not as good as the one we have now. With vaccine, we could now irradicate diseases that were killing millions of people, we learn so much about the immune system and ways our body was reacting to pathogens and the answers he could produce to defend us against it. Medicine evolved so much and keeps evolving every day because scientists are curious to understand how our body is working and how he is able to communicate with our environment. People aged 40 are now not that old and still have a really long life to live and enjoy when 2 centuries ago it was synonymous of 80% chance of dying.`,
  },
  {
    id: 'set4-response-b',
    task: 'academic_discussion',
    promptText: DISCUSSION_PROMPT,
    officialScore: 4,
    officialRationale:
      'Generally successful. Effective contrast between candles and light bulbs, but never says why '
      + 'the bulb is the MOST important invention. Multiple small grammar errors kept it off the top band.',
    responseText: `From my personal point of view, I think the most important invention is the light bulb. Before it was invented, people had have to use candles for illumination in the evening. It's performance is not very stable, and it is produce really high tempreture which would probably lead to a fire accident. Light bulbs, however, produce constant and bright lighting at nights. One light bulb could use for several years, which is quite convenient-people don't need to storage many bulbs. What's more, it is safer than past candles. This is a huge progress in technology, and I consider it as the most vital invention from the last 200 years.`,
  },
]
