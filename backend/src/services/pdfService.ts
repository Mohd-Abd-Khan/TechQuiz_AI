import puppeteer from 'puppeteer';
import Attempt from '../models/Attempt';
import Quiz from '../models/Quiz';
import Question from '../models/Question';
import { withGeminiFailover } from '../config/gemini';
import mongoose from 'mongoose';

// Simple helper to parse basic markdown to styled HTML for PDF rendering
const parseMarkdownToHtml = (markdown: string): string => {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
};

/**
 * Compiles a detailed PDF study guide for a specific quiz attempt.
 */
export const generateAttemptPdfBuffer = async (
  attemptId: string,
  userId: string
): Promise<Buffer> => {
  // 1. Fetch attempt and details
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) throw new Error('Attempt details not found');
  if (attempt.userId.toString() !== userId) throw new Error('Unauthorized access to attempt document');

  const quiz = await Quiz.findById(attempt.quizId);
  if (!quiz) throw new Error('Quiz metadata not found');

  const questions = await Question.find({ quizId: attempt.quizId });
  const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

  // Get or generate AI feedback text
  let aiFeedback = attempt.aiFeedback;
  if (!aiFeedback) {
    let correctCount = 0;
    let wrongSummary = '';

    attempt.questionsAttempted.forEach((qa, idx) => {
      const q = questionMap.get(qa.questionId.toString());
      if (qa.isCorrect) {
        correctCount++;
      } else if (q) {
        wrongSummary += `\nQuestion ${idx + 1}: "${q.text}"\n  Selected: "${qa.selectedOption >= 0 ? q.options[qa.selectedOption] : 'Skipped'}"\n  Should be: "${q.options[q.correctIndex]}"\n`;
      }
    });

    const prompt = `Analyze a student's quiz submission and provide customized study guide feedback.
    Quiz Topic Category: "${quiz.category}"
    Difficulty: "${quiz.difficulty}"
    Score: ${attempt.score} points out of ${questions.length * 10}.
    Total Time Taken: ${attempt.timeTaken} seconds.
    Number of Correct Answers: ${correctCount}/${attempt.questionsAttempted.length}.
    
    Here is a log of questions they got WRONG (if any):
    ${wrongSummary || 'None (Perfect Score!)'}
    
    Please provide:
    1. A brief summary of their performance.
    2. Identify specific weak areas (specific concepts based on the questions they missed).
    3. Three specific, actionable study recommendations or topics to read.
    4. A short, highly motivating concluding tip.
    Keep the tone friendly, encouraging, and highly technical. Return a clean, well-spaced Markdown block.`;

    try {
      const resultText = await withGeminiFailover(async (ai) => {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return response.text;
      });
      aiFeedback = resultText || '';
      attempt.aiFeedback = aiFeedback;
      await attempt.save();
    } catch (err) {
      console.error('Gemini call during PDF compilation failed:', err);
      aiFeedback = '*Unable to load Gemini AI feedback. Standard feedback applies.*';
    }
  }

  // 3. Render HTML structure
  const formattedFeedbackHtml = parseMarkdownToHtml(aiFeedback);

  // Compile detailed audits for incorrect answers
  let wrongAnswersAuditHtml = '';
  attempt.questionsAttempted.forEach((qa, idx) => {
    const q = questionMap.get(qa.questionId.toString());
    if (q) {
      const statusClass = qa.isCorrect ? 'correct-card' : 'incorrect-card';
      const statusIcon = qa.isCorrect ? '✓' : '✗';
      wrongAnswersAuditHtml += `
        <div class="audit-card ${statusClass}">
          <div class="audit-question">
            <strong>Question ${idx + 1}:</strong> ${q.text}
          </div>
          <div class="options-list">
            <div class="${q.correctIndex === 0 ? 'correct-opt' : ''} ${selectedOptClass(qa.selectedOption, 0, q.correctIndex)}">1. ${q.options[0]}</div>
            <div class="${q.correctIndex === 1 ? 'correct-opt' : ''} ${selectedOptClass(qa.selectedOption, 1, q.correctIndex)}">2. ${q.options[1]}</div>
            <div class="${q.correctIndex === 2 ? 'correct-opt' : ''} ${selectedOptClass(qa.selectedOption, 2, q.correctIndex)}">3. ${q.options[2]}</div>
            <div class="${q.correctIndex === 3 ? 'correct-opt' : ''} ${selectedOptClass(qa.selectedOption, 3, q.correctIndex)}">4. ${q.options[3]}</div>
          </div>
          <div class="audit-explanation">
            <strong>Explanation:</strong> ${q.explanation}
          </div>
        </div>
      `;
    }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>TechQuiz AI - Study Notes Guide</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          margin: 40px;
          line-height: 1.5;
        }
        .header {
          border-bottom: 2px solid #6366f1;
          padding-bottom: 20px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-size: 28px;
          font-weight: 800;
          color: #4f46e5;
          letter-spacing: 1px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 5px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .meta-item {
          font-size: 14px;
        }
        .meta-item strong {
          color: #475569;
        }
        h2 {
          font-size: 18px;
          color: #4f46e5;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
          margin-top: 30px;
          margin-bottom: 15px;
        }
        .feedback-section {
          background-color: #f1f5f9;
          border-left: 4px solid #8b5cf6;
          padding: 20px;
          border-radius: 0 8px 8px 0;
          font-size: 14px;
          color: #334155;
          margin-bottom: 30px;
        }
        .audit-card {
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }
        .correct-card {
          border-left: 4px solid #10b981;
          background-color: #f0fdf4;
        }
        .incorrect-card {
          border-left: 4px solid #ef4444;
          background-color: #fef2f2;
        }
        .audit-question {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .options-list {
          font-size: 13px;
          margin-left: 15px;
          margin-bottom: 10px;
        }
        .options-list div {
          padding: 4px 8px;
          border-radius: 4px;
          margin-bottom: 2px;
        }
        .correct-opt {
          background-color: #d1fae5;
          color: #065f46;
          font-weight: 600;
        }
        .wrong-opt {
          background-color: #fee2e2;
          color: #991b1b;
          text-decoration: line-through;
        }
        .audit-explanation {
          font-size: 13px;
          color: #475569;
          background-color: #ffffff;
          padding: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          margin-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">TechQuiz AI</div>
          <div class="title">Personalized Study Guide</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><strong>Quiz Title:</strong> ${quiz.title}</div>
        <div class="meta-item"><strong>Topic Category:</strong> ${quiz.category}</div>
        <div class="meta-item"><strong>Quiz Difficulty:</strong> ${quiz.difficulty}</div>
        <div class="meta-item"><strong>Score Earned:</strong> ${attempt.score} / ${questions.length * 10}</div>
        <div class="meta-item"><strong>Time Taken:</strong> ${attempt.timeTaken} seconds</div>
      </div>

      <h2>AI Performance Summary &amp; Guidance</h2>
      <div class="feedback-section">
        ${formattedFeedbackHtml}
      </div>

      <h2>Question-Level Explanations &amp; Audit</h2>
      <div>
        ${wrongAnswersAuditHtml}
      </div>
    </body>
    </html>
  `;

  // 4. Launch Puppeteer to generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

// Helper to check what styling to put on choices
const selectedOptClass = (selected: number, current: number, correct: number): string => {
  if (selected === current && selected !== correct) {
    return 'wrong-opt';
  }
  return '';
};
