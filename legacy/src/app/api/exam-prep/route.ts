import { NextRequest, NextResponse } from 'next/server';

export interface Flashcard {
  id: string;
  subject: string;
  chapter: string;
  question: string;
  answer: string;
  mnemonicOrFormula?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface QuizQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  studyTip: string;
}

const flashcardsData: Flashcard[] = [
  {
    id: 'fc-1',
    subject: 'Mathematics',
    chapter: 'Quadratic Equations',
    question: 'What is the Discriminant formula, and how does it determine nature of roots?',
    answer: 'D = b² - 4ac.\n• If D > 0: Two distinct real roots\n• If D = 0: Two equal real roots (-b/2a)\n• If D < 0: No real roots (roots are complex).',
    mnemonicOrFormula: 'D = b² - 4ac (Nature of Roots Detector)',
    difficulty: 'EASY',
  },
  {
    id: 'fc-2',
    subject: 'Mathematics',
    chapter: 'Trigonometry',
    question: 'State the 3 fundamental Pythagorean trigonometric identities.',
    answer: '1. sin²θ + cos²θ = 1\n2. 1 + tan²θ = sec²θ\n3. 1 + cot²θ = cosec²θ',
    mnemonicOrFormula: 'sin² + cos² = 1; 1 + tan² = sec²; 1 + cot² = csc²',
    difficulty: 'MEDIUM',
  },
  {
    id: 'fc-3',
    subject: 'Science',
    chapter: 'Light - Reflection & Refraction',
    question: 'What is Snell\'s Law of Refraction?',
    answer: 'The ratio of the sine of the angle of incidence to the sine of the angle of refraction is constant for light of a given color and for a given pair of media:\n(sin i) / (sin r) = n₂₁ (refractive index of medium 2 with respect to 1).',
    mnemonicOrFormula: 'n₁ sin(θ₁) = n₂ sin(θ₂)',
    difficulty: 'MEDIUM',
  },
  {
    id: 'fc-4',
    subject: 'Science',
    chapter: 'Chemical Reactions',
    question: 'What is Redox Reaction? Give an example equation.',
    answer: 'A reaction where Oxidation (loss of electrons / gain of oxygen) and Reduction (gain of electrons / loss of oxygen) occur simultaneously.\nExample: CuO + H₂ → Cu + H₂O (CuO is reduced to Cu; H₂ is oxidized to H₂O).',
    mnemonicOrFormula: 'OIL RIG (Oxidation Is Loss, Reduction Is Gain of electrons)',
    difficulty: 'EASY',
  },
  {
    id: 'fc-5',
    subject: 'Social Science',
    chapter: 'Rise of Nationalism in Europe',
    question: 'What was the Zollverein and what was its significance?',
    answer: 'A customs union formed in 1834 at the initiative of Prussia. It abolished tariff barriers and reduced the number of currencies from over thirty to two, creating national economic unity.',
    mnemonicOrFormula: '1834: Prussian Customs Union unifying trade & currency',
    difficulty: 'HARD',
  },
  {
    id: 'fc-6',
    subject: 'Computer Science',
    chapter: 'Python & Algorithms',
    question: 'What is the time complexity of Binary Search compared to Linear Search?',
    answer: 'Linear Search: O(n) worst-case (checks every element).\nBinary Search: O(log n) worst-case (requires sorted array, halves search space each step).',
    mnemonicOrFormula: 'Binary = O(log n) | Linear = O(n)',
    difficulty: 'MEDIUM',
  }
];

const mockQuizzesData: QuizQuestion[] = [
  {
    id: 'q-1',
    subject: 'Mathematics',
    question: 'If the roots of the equation x² - 6x + k = 0 are real and equal, find the value of k.',
    options: ['k = 3', 'k = 6', 'k = 9', 'k = 12'],
    correctIndex: 2,
    explanation: 'For real and equal roots, Discriminant D = 0 => b² - 4ac = 0. Here a = 1, b = -6, c = k. (-6)² - 4(1)(k) = 0 => 36 - 4k = 0 => 4k = 36 => k = 9.',
    studyTip: 'Whenever a question mentions "real and equal roots", instantly set D = b² - 4ac = 0.',
  },
  {
    id: 'q-2',
    subject: 'Science',
    question: 'Which of the following compounds is responsible for the formation of White Precipitate in the reaction between Barium Chloride and Sodium Sulphate?',
    options: ['Sodium Chloride (NaCl)', 'Barium Sulphate (BaSO₄)', 'Barium Oxide (BaO)', 'Sulphur Dioxide (SO₂)'],
    correctIndex: 1,
    explanation: 'BaCl₂ + Na₂SO₄ → BaSO₄ (white ppt) + 2NaCl. This is a classic double displacement and precipitation reaction.',
    studyTip: 'Memorize all NCERT textbook precipitate colors: BaSO₄ is insoluble white precipitate.',
  },
  {
    id: 'q-3',
    subject: 'Science',
    question: 'The focal length of a concave mirror having radius of curvature 30 cm is:',
    options: ['-15 cm', '+15 cm', '-60 cm', '+30 cm'],
    correctIndex: 0,
    explanation: 'Focal length f = R / 2. By Cartesian sign convention, the center of curvature and focus of a concave mirror lie in front of the mirror (negative x-axis), so f = -30/2 = -15 cm.',
    studyTip: 'Always verify Cartesian signs: Concave mirror focal length is always negative; convex mirror is positive.',
  },
  {
    id: 'q-4',
    subject: 'Social Science',
    question: 'Who hosted the Congress of Vienna in 1815?',
    options: ['Giuseppe Mazzini', 'Duke Metternich', 'Otto von Bismarck', 'Napoleon Bonaparte'],
    correctIndex: 1,
    explanation: 'The Congress of Vienna was hosted by the Austrian Chancellor Duke Metternich in 1815 to undo Napoleonic changes and restore conservative order in Europe.',
    studyTip: 'Connect dates with key figures: 1815 Treaty of Vienna = Austrian Chancellor Duke Metternich.',
  },
  {
    id: 'q-5',
    subject: 'Computer Science',
    question: 'Which data structure follows the Last-In-First-Out (LIFO) order of operation?',
    options: ['Queue', 'Stack', 'Array', 'Linked List'],
    correctIndex: 1,
    explanation: 'A Stack follows LIFO (Last-In-First-Out). Examples include function call stacks and browser back-button history.',
    studyTip: 'Stack = LIFO (plate stack); Queue = FIFO (movie ticket queue).',
  }
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subject = searchParams.get('subject') || 'ALL';

  let filteredCards = flashcardsData;
  let filteredQuizzes = mockQuizzesData;

  if (subject !== 'ALL') {
    filteredCards = flashcardsData.filter(f => f.subject.toLowerCase() === subject.toLowerCase());
    filteredQuizzes = mockQuizzesData.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
  }

  return NextResponse.json({
    success: true,
    data: {
      flashcards: filteredCards,
      quizzes: filteredQuizzes,
      upcomingExams: [
        { name: 'Half Yearly Examination', subject: 'Mathematics & Science', date: '2026-10-15', daysLeft: 12 },
        { name: 'CBSE Pre-Board Phase 1', subject: 'All Core Subjects', date: '2026-12-05', daysLeft: 64 },
        { name: 'National Science Olympiad (NSO)', subject: 'Science & Reasoning', date: '2026-11-20', daysLeft: 49 },
      ],
      syllabusProgress: [
        { subject: 'Mathematics', coveredChapters: 9, totalChapters: 14, percent: 64 },
        { subject: 'Science', coveredChapters: 11, totalChapters: 16, percent: 68 },
        { subject: 'English', coveredChapters: 8, totalChapters: 10, percent: 80 },
        { subject: 'Social Science', coveredChapters: 14, totalChapters: 21, percent: 66 },
        { subject: 'Computer Science', coveredChapters: 6, totalChapters: 8, percent: 75 },
      ]
    }
  });
}
