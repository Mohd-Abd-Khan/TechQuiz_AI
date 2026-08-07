import cron from 'node-cron';
import { Type } from '@google/genai';
import Quiz from '../models/Quiz';
import Question from '../models/Question';
import { withGeminiFailover } from '../config/gemini';

// List of potential technical categories to select from dynamically
const CATEGORIES = [
  'JavaScript Core',
  'React Hooks & State',
  'Node.js & Express',
  'Data Structures & Algorithms',
  'System Design & Scale',
  'Python Programming',
  'SQL & Database Indexing',
  'CSS Grid & Styling Architecture',
  'REST APIs & Security',
  'Git & Release Workflow',
];

/**
 * Helper to check if a given date is today (server local time)
 */
const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Automates daily challenge generation at midnight (12:00 AM)
 */
export const startDailyChallengeCron = (): void => {
  // Cron schedule: 0 0 * * * (Every midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('CRON: Launching automated Daily Challenge quiz generation...');
    let success = false;
    const maxAttempts = 3;
    let delayMs = 60000; // 1 minute delay initially

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await generateDailyChallenge();
        success = true;
        break;
      } catch (err) {
        console.error(`CRON ERROR: Attempt ${attempt}/${maxAttempts} failed to generate daily challenge:`, err);
        if (attempt < maxAttempts) {
          console.log(`CRON: Retrying in ${delayMs / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
        }
      }
    }

    if (!success) {
      console.error('CRON CRITICAL ERROR: All automated Daily Challenge generation attempts failed. Retaining current daily challenge.');
    }
  });

  console.log('Daily Challenge cron scheduler loaded (Runs midnight)');

  // Run startup verification to seed database if no active daily challenge exists or if it's stale
  const checkAndSeedDailyChallenge = async () => {
    try {
      const activeDaily = await Quiz.findOne({ isDailyChallenge: true, isActive: true });
      if (!activeDaily) {
        console.log('STARTUP: No active Daily Challenge found. Triggering automated seeding...');
        await generateDailyChallenge();
      } else {
        // Verify it has questions and that it was created today
        const questionCount = await Question.countDocuments({ quizId: activeDaily._id });
        const createdDate = new Date(activeDaily.createdAt);

        if (questionCount === 0) {
          console.warn('STARTUP: Active Daily Challenge has 0 questions. Regenerating...');
          await generateDailyChallenge();
        } else if (!isToday(createdDate)) {
          console.log(`STARTUP: Active Daily Challenge is stale (Created on ${createdDate.toLocaleDateString()}). Regenerating for today...`);
          await generateDailyChallenge();
        } else {
          console.log(`STARTUP: Active Daily Challenge verified for today: "${activeDaily.title}" (${questionCount} questions).`);
        }
      }
    } catch (err) {
      console.error('STARTUP ERROR: Failed to verify or seed daily challenge:', err);
    }
  };

  // Fire in background after server connection is established
  setTimeout(checkAndSeedDailyChallenge, 5000);
};

/**
 * Generates and inserts a daily challenge quiz into the database.
 */
export const generateDailyChallenge = async (): Promise<void> => {
  const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const quizTitle = `Daily Challenge - ${randomCategory} - ${dateString}`;
  const quizDescription = `Test your skills in ${randomCategory}! Generated automatically on ${dateString} for daily streak preservation.`;

  // 1. Prompt Gemini to generate 10 questions using the responseSchema BEFORE altering the database
  const prompt = `Generate a JSON list of exactly 10 MCQ questions for the technical topic: "${randomCategory}".
  Target difficulty is intermediate. Ensure questions test practical developer insights.
  Each question must contain:
  1. text (clear question)
  2. options (exactly 4 choice strings)
  3. correctIndex (integer 0-3)
  4. explanation (detailed reasoning for solution)
  5. points (integer 10)`;

  const responseText = await withGeminiFailover(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Daily challenge questions list',
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              points: { type: Type.INTEGER },
            },
            required: ['text', 'options', 'correctIndex', 'explanation'],
          },
        },
      },
    });
    return response.text;
  });

  if (!responseText) {
    throw new Error('Gemini API returned empty response text during cron daily challenge generation.');
  }

  const generatedQuestions = JSON.parse(responseText);

  // 2. Only deactivate old challenges and save the new shell once AI generation has fully succeeded
  await Quiz.updateMany({ isDailyChallenge: true, isActive: true }, { isActive: false });

  const dailyQuiz = new Quiz({
    title: quizTitle,
    description: quizDescription,
    category: randomCategory,
    difficulty: 'intermediate',
    timeLimitPerQuestion: 25, // seconds
    isActive: true,
    isDailyChallenge: true,
    creator: null, // Generated by system
  });

  await dailyQuiz.save();

  // 3. Bulk insert the questions referencing the newly saved quiz ID
  const questionsToInsert = generatedQuestions.map((q: any) => ({
    quizId: dailyQuiz._id,
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
    points: q.points || 10,
    explanation: q.explanation || '',
  }));

  await Question.insertMany(questionsToInsert);
  console.log(`CRON SUCCESS: Created daily challenge quiz: "${quizTitle}" with ${questionsToInsert.length} questions.`);
};
