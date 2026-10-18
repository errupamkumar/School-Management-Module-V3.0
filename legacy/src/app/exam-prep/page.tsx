'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Zap,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RotateCw,
  Trophy,
  Award,
  ChevronRight,
  ChevronLeft,
  Flame,
  Download,
  FileText,
  Calendar,
  Layers,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Flashcard {
  id: string;
  subject: string;
  chapter: string;
  question: string;
  answer: string;
  mnemonicOrFormula?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

interface QuizQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  studyTip: string;
}

const defaultFlashcards: Flashcard[] = [
  {
    id: 'fc-1',
    subject: 'Science',
    chapter: 'Chemical Reactions & Equations',
    question: 'What is a Redox reaction? Provide one real-world example.',
    answer: 'A Redox reaction involves simultaneous oxidation (loss of electrons) and reduction (gain of electrons). Example: Rusting of iron (Fe is oxidized to Fe2O3).',
    mnemonicOrFormula: 'OIL RIG (Oxidation Is Loss, Reduction Is Gain)',
    difficulty: 'MEDIUM',
  },
  {
    id: 'fc-2',
    subject: 'Mathematics',
    chapter: 'Quadratic Equations',
    question: 'State the discriminant formula and condition for real and equal roots.',
    answer: 'Discriminant D = b² - 4ac. When D = 0, the quadratic equation has real and equal roots.',
    mnemonicOrFormula: 'D = b² - 4ac (D > 0: 2 distinct real, D = 0: 2 equal, D < 0: no real)',
    difficulty: 'EASY',
  },
  {
    id: 'fc-3',
    subject: 'Science',
    chapter: 'Light - Reflection & Refraction',
    question: 'State Snell’s Law of Refraction.',
    answer: 'The ratio of sine of angle of incidence to sine of angle of refraction is constant for a given pair of media: sin(i) / sin(r) = n (refractive index).',
    mnemonicOrFormula: 'n = sin(i) / sin(r)',
    difficulty: 'HARD',
  },
  {
    id: 'fc-4',
    subject: 'Social Science',
    chapter: 'Nationalism in India',
    question: 'Why was the Non-Cooperation Movement withdrawn by Mahatma Gandhi in 1922?',
    answer: 'It was called off following the violent Chauri Chaura incident in Gorakhpur where protestors set a police station on fire, killing 22 policemen.',
    mnemonicOrFormula: 'Feb 1922: Chauri Chaura -> Non-Violence principle breached',
    difficulty: 'MEDIUM',
  },
  {
    id: 'fc-5',
    subject: 'Computer Science',
    chapter: 'HTML5 & Cyber Ethics',
    question: 'What is the primary difference between Phishing and Malware?',
    answer: 'Phishing is a social engineering attack to trick users into revealing sensitive credentials. Malware is malicious software designed to compromise or damage systems.',
    mnemonicOrFormula: 'Phishing = Bait & Trap, Malware = Harmful Code',
    difficulty: 'EASY',
  }
];

const defaultQuizzes: QuizQuestion[] = [
  {
    id: 'qz-1',
    subject: 'Mathematics',
    question: 'If the roots of ax² + bx + c = 0 are equal, then the value of c is:',
    options: ['-b / 2a', 'b / 2a', '-b² / 4a', 'b² / 4a'],
    correctIndex: 3,
    explanation: 'For equal roots, D = b² - 4ac = 0 => 4ac = b² => c = b² / (4a).',
    studyTip: 'Remember to always isolate the target variable after setting D = 0.',
  },
  {
    id: 'qz-2',
    subject: 'Science',
    question: 'Which of the following acids is present in a bee sting?',
    options: ['Methanoic acid', 'Acetic acid', 'Tartaric acid', 'Citric acid'],
    correctIndex: 0,
    explanation: 'Bee stings inject methanoic acid (formic acid), causing burning pain. Applying a mild base like baking soda provides relief.',
    studyTip: 'Pair bee sting (methanoic acid) with wasp sting (alkaline) in your notes.',
  },
  {
    id: 'qz-3',
    subject: 'Science',
    question: 'The focal length of a concave mirror having radius of curvature 30 cm is:',
    options: ['+30 cm', '-15 cm', '+15 cm', '-60 cm'],
    correctIndex: 1,
    explanation: 'f = R / 2. By Cartesian sign convention, concave mirror focal length is negative: f = -30 / 2 = -15 cm.',
    studyTip: 'Always check the sign convention before selecting optical parameters!',
  },
  {
    id: 'qz-4',
    subject: 'Social Science',
    question: 'In which year did the Jallianwala Bagh massacre take place?',
    options: ['1917', '1918', '1919', '1920'],
    correctIndex: 2,
    explanation: 'The tragic massacre occurred on 13 April 1919 at Amritsar during the Baisakhi festival under General Dyer’s orders.',
    studyTip: 'Tie 1919 with Rowlatt Act and Jallianwala Bagh together as triggers for Non-Cooperation.',
  }
];

const defaultUpcomingExams = [
  { name: 'CBSE Board Mathematics Pre-Board', subject: 'Mathematics (Standard)', date: 'Oct 15, 2026', daysLeft: 19 },
  { name: 'Class 10 Science Mid-Term Practical', subject: 'Physics & Chemistry', date: 'Oct 22, 2026', daysLeft: 26 },
  { name: 'Social Science Unit Assessment', subject: 'History & Civics', date: 'Nov 05, 2026', daysLeft: 40 },
  { name: 'Computer Applications Board Lab', subject: 'Information Tech', date: 'Nov 18, 2026', daysLeft: 53 },
];

const defaultSyllabusProgress = [
  { subject: 'Mathematics', coveredChapters: 12, totalChapters: 15, percent: 80 },
  { subject: 'Science (PCB)', coveredChapters: 13, totalChapters: 16, percent: 81 },
  { subject: 'Social Science', coveredChapters: 17, totalChapters: 21, percent: 81 },
  { subject: 'English Core', coveredChapters: 18, totalChapters: 20, percent: 90 },
  { subject: 'Computer Science', coveredChapters: 9, totalChapters: 10, percent: 90 },
];

export default function ExamPrepBoosterPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'STUDENT';
  const [activeTab, setActiveTab] = useState<'FLASHCARDS' | 'MOCK_TEST' | 'SYLLABUS' | 'PYQ'>('FLASHCARDS');
  const [subjectFilter, setSubjectFilter] = useState('ALL');

  // ─── ENTERPRISE RBAC PERMISSIONS ───
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  // All features accessible without permissions lockouts
  const canCreateContent = true;
  const canAttempt = true;
  const canViewScores = true;
  const canUploadPYQ = true;
  const canSetExamCountdown = true;
  const canViewClassAnalytics = true;
  const canPublishAnnouncements = true;

  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>(defaultFlashcards);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCardIds, setMasteredCardIds] = useState<string[]>([]);

  // Quiz state
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>(defaultQuizzes);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [upcomingExams, setUpcomingExams] = useState<any[]>(defaultUpcomingExams);
  const [syllabusProgress, setSyllabusProgress] = useState<any[]>(defaultSyllabusProgress);

  // Modals state
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [newCard, setNewCard] = useState({ subject: 'Science', chapter: '', question: '', answer: '', mnemonicOrFormula: '' });
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ subject: 'Mathematics', question: '', opt0: '', opt1: '', opt2: '', opt3: '', correctIndex: 0, explanation: '' });
  const [showUploadPYQModal, setShowUploadPYQModal] = useState(false);
  const [newPYQ, setNewPYQ] = useState({ title: '', subject: 'Mathematics', year: '2026', size: '2.5 MB' });
  const [pyqList, setPyqList] = useState([
    { title: 'Mathematics Standard 2025 Board Paper', size: '2.4 MB', year: '2025', subject: 'Maths' },
    { title: 'Science Theory & Practical Solutions 2025', size: '3.1 MB', year: '2025', subject: 'Science' },
    { title: 'English Language & Literature Set 1-3', size: '1.8 MB', year: '2025', subject: 'English' },
    { title: 'Social Science All India Board Paper', size: '2.9 MB', year: '2024', subject: 'Social Science' },
    { title: 'Information Technology Code 402 Model Paper', size: '1.5 MB', year: '2025', subject: 'Computers' },
    { title: 'CBSE Mathematics Exemplar Solved Bank', size: '4.5 MB', year: '2026 Edition', subject: 'Maths' },
  ]);

  useEffect(() => {
    fetch('/api/exam-prep')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          if (data.data.flashcards?.length) setFlashcards(data.data.flashcards);
          if (data.data.quizzes?.length) setQuizzes(data.data.quizzes);
          if (data.data.upcomingExams?.length) setUpcomingExams(data.data.upcomingExams);
          if (data.data.syllabusProgress?.length) setSyllabusProgress(data.data.syllabusProgress);
        }
      })
      .catch(console.error);
  }, []);

  const filteredCards = flashcards.filter(f => {
    if (subjectFilter === 'ALL') return true;
    return f.subject.toLowerCase() === subjectFilter.toLowerCase();
  });

  const currentCard = filteredCards[currentCardIndex] || filteredCards[0];

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex(prev => (prev + 1) % filteredCards.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex(prev => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const handleToggleMastered = (cardId: string) => {
    if (masteredCardIds.includes(cardId)) {
      setMasteredCardIds(masteredCardIds.filter(id => id !== cardId));
      toast('Moved to revision deck', { icon: '🔄' });
    } else {
      setMasteredCardIds([...masteredCardIds, cardId]);
      toast.success('Concept marked as mastered! 🌟');
    }
  };

  const handleQuizAnswer = (optionIdx: number) => {
    if (selectedAnswer !== null) return; // Prevent double select
    setSelectedAnswer(optionIdx);
    const q = quizzes[currentQuizIndex];
    if (optionIdx === q.correctIndex) {
      setQuizScore(prev => prev + 1);
      toast.success('Correct answer! +1 point 🎉');
    } else {
      toast.error('Incorrect. Check the explanation below.');
    }
    setAnsweredCount(prev => prev + 1);
  };

  const handleNextQuizQuestion = () => {
    if (currentQuizIndex + 1 < quizzes.length) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setIsQuizSubmitted(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setAnsweredCount(0);
    setIsQuizSubmitted(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16">
        {/* ========================================================================= */}
        {/* 1. HERO HEADER                                                            */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-yellow-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur border border-white/20 text-xs font-bold text-white">
                <Flame size={14} className="text-yellow-200 fill-yellow-300 animate-pulse" />
                <span>AI Powered Student Revision Accelerator</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Exam Prep & Knowledge Booster
              </h1>
              <p className="text-sm text-orange-100 max-w-xl">
                {isSuperAdmin
                  ? 'Full control — Create flashcard decks, design mock tests, upload PYQ papers, set exam countdowns, and monitor class-wide performance.'
                  : isTeacher
                  ? 'Create flashcards & quizzes for your subject. Preview tests before publishing and track student performance.'
                  : isParent
                  ? "Monitor your ward's exam readiness, view mock test scores, and track syllabus completion progress."
                  : 'Master core concepts with active-recall flashcards, timed mock tests, board exam countdowns, and knowledge gap diagnostics.'}
              </p>
              {canCreateContent && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setShowCreateCardModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl text-xs font-bold text-white border border-white/20 transition"
                  >
                    + Add Flashcards
                  </button>
                  <button
                    onClick={() => setShowCreateQuizModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl text-xs font-bold text-white border border-white/20 transition"
                  >
                    + Create Quiz
                  </button>
                  {canUploadPYQ && (
                    <button
                      onClick={() => setShowUploadPYQModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl text-xs font-bold text-white border border-white/20 transition"
                    >
                      Upload PYQ
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Readiness Badge */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 text-center min-w-[170px] shadow-inner">
              <p className="text-xs uppercase tracking-wider text-orange-100 font-bold">Exam Readiness</p>
              <p className="text-3xl font-black text-white mt-1">84%</p>
              <div className="w-full bg-black/20 rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-yellow-300 h-full rounded-full" style={{ width: '84%' }} />
              </div>
              <p className="text-[10px] text-orange-100 mt-1.5 font-medium">38 concepts mastered</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TAB NAVIGATION                                                         */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('FLASHCARDS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'FLASHCARDS'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <Layers size={16} />
            <span>Active Recall Flashcards</span>
          </button>

          <button
            onClick={() => setActiveTab('MOCK_TEST')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'MOCK_TEST'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <Zap size={16} />
            <span>Timed Practice Quiz</span>
          </button>

          <button
            onClick={() => setActiveTab('SYLLABUS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'SYLLABUS'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <Calendar size={16} />
            <span>Exam Countdown & Syllabus</span>
          </button>

          <button
            onClick={() => setActiveTab('PYQ')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'PYQ'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <FileText size={16} />
            <span>PYQs & Model Papers</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: 3D INTERACTIVE FLASHCARDS                                          */}
        {/* ========================================================================= */}
        {activeTab === 'FLASHCARDS' && (
          <div className="space-y-6">
            {/* Subject Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'Mathematics', 'Science', 'Social Science', 'Computer Science'].map(sub => (
                  <button
                    key={sub}
                    onClick={() => {
                      setSubjectFilter(sub);
                      setCurrentCardIndex(0);
                      setIsFlipped(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      subjectFilter === sub
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              <div className="text-xs text-gray-500 font-semibold">
                Card {filteredCards.length > 0 ? currentCardIndex + 1 : 0} of {filteredCards.length}
              </div>
            </div>

            {/* Flashcard Box */}
            {currentCard ? (
              <div className="max-w-2xl mx-auto space-y-4">
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`w-full min-h-[300px] sm:min-h-[340px] rounded-3xl p-8 border cursor-pointer transition-all duration-300 transform select-none flex flex-col justify-between shadow-xl ${
                    isFlipped
                      ? 'bg-gradient-to-br from-purple-900 to-indigo-950 text-white border-purple-800 rotate-y-180'
                      : 'bg-white text-gray-900 border-gray-200 hover:border-amber-400'
                  }`}
                >
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`px-3 py-1 rounded-full font-black uppercase tracking-wider text-[10px] ${
                        isFlipped
                          ? 'bg-purple-800/80 text-purple-200 border border-purple-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {currentCard.subject} • {currentCard.chapter}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                        currentCard.difficulty === 'EASY'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentCard.difficulty === 'MEDIUM'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {currentCard.difficulty}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="my-auto py-6 text-center space-y-3">
                    {!isFlipped ? (
                      <>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                          Challenge Question
                        </p>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-800 leading-snug">
                          {currentCard.question}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium pt-2">
                          (Click anywhere on card to reveal answer & formula)
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-purple-300 uppercase tracking-widest flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          <span>Detailed Solution & Key Concept</span>
                        </p>
                        <p className="text-base sm:text-lg font-medium text-purple-100 whitespace-pre-line leading-relaxed">
                          {currentCard.answer}
                        </p>
                        {currentCard.mnemonicOrFormula && (
                          <div className="mt-4 p-3 rounded-2xl bg-white/10 backdrop-blur border border-white/10 text-xs font-mono font-bold text-amber-300">
                            💡 Formula / Memory Key: {currentCard.mnemonicOrFormula}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Bottom hint inside card */}
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-white/10">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <RotateCw size={12} /> Click to flip
                    </span>
                    {masteredCardIds.includes(currentCard.id) && (
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} /> Mastered
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Controls */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handlePrevCard}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 shadow-sm"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={() => handleToggleMastered(currentCard.id)}
                    className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm ${
                      masteredCardIds.includes(currentCard.id)
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 size={16} className={masteredCardIds.includes(currentCard.id) ? 'text-emerald-600' : 'text-gray-400'} />
                    <span>{masteredCardIds.includes(currentCard.id) ? 'Concept Mastered' : 'Mark as Mastered'}</span>
                  </button>

                  <button
                    onClick={handleNextCard}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-md shadow-purple-600/20"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">No flashcards found for selected subject.</div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TIMED PRACTICE MOCK TEST                                           */}
        {/* ========================================================================= */}
        {activeTab === 'MOCK_TEST' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {!isQuizSubmitted && quizzes.length > 0 ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl space-y-6">
                {/* Quiz Header */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                      {currentQuizIndex + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-purple-600 uppercase">
                        Question {currentQuizIndex + 1} of {quizzes.length}
                      </p>
                      <p className="text-xs text-gray-400">{quizzes[currentQuizIndex].subject}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-xl text-amber-700 text-xs font-bold">
                    <Trophy size={14} className="text-amber-500" />
                    <span>Score: {quizScore} pts</span>
                  </div>
                </div>

                {/* Question */}
                <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                  {quizzes[currentQuizIndex].question}
                </h3>

                {/* Options */}
                <div className="space-y-3">
                  {quizzes[currentQuizIndex].options.map((option, idx) => {
                    let btnStyle = 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-purple-300';
                    if (selectedAnswer !== null) {
                      if (idx === quizzes[currentQuizIndex].correctIndex) {
                        btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold shadow-sm';
                      } else if (idx === selectedAnswer) {
                        btnStyle = 'bg-rose-50 border-rose-300 text-rose-800';
                      } else {
                        btnStyle = 'opacity-50 border-gray-200 text-gray-400';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedAnswer !== null}
                        onClick={() => handleQuizAnswer(idx)}
                        className={`w-full text-left p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-white/80 border text-[11px] font-bold flex items-center justify-center shadow-xs">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{option}</span>
                        </div>
                        {selectedAnswer !== null && idx === quizzes[currentQuizIndex].correctIndex && (
                          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                        )}
                        {selectedAnswer !== null && idx === selectedAnswer && idx !== quizzes[currentQuizIndex].correctIndex && (
                          <XCircle size={18} className="text-rose-500 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Box (Revealed after selection) */}
                {selectedAnswer !== null && (
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2 animate-in fade-in-50">
                    <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Lightbulb size={15} className="text-amber-500" />
                      <span>Conceptual Rationale:</span>
                    </p>
                    <p className="text-xs text-purple-950 leading-relaxed">
                      {quizzes[currentQuizIndex].explanation}
                    </p>
                    <div className="pt-1.5 border-t border-purple-200/60 text-[11px] text-purple-700 font-medium">
                      🎯 <strong>Pro Study Tip:</strong> {quizzes[currentQuizIndex].studyTip}
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-end pt-2">
                  {selectedAnswer !== null && (
                    <button
                      onClick={handleNextQuizQuestion}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition transform active:scale-95"
                    >
                      <span>{currentQuizIndex + 1 < quizzes.length ? 'Next Question' : 'Complete Quiz'}</span>
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            ) : isQuizSubmitted ? (
              /* Quiz Result Summary Card */
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-5">
                <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                  <Award size={44} />
                </div>
                <div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                    Practice Test Completed!
                  </span>
                  <h3 className="text-2xl font-black text-gray-900 mt-2">
                    Score: {quizScore} / {quizzes.length}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {quizScore === quizzes.length
                      ? 'Outstanding! You have mastered all tested concepts with 100% accuracy.'
                      : quizScore >= quizzes.length / 2
                      ? 'Solid performance! Review the rationale cards to strengthen minor knowledge gaps.'
                      : 'Good practice run. Go through the active recall flashcards and try again.'}
                  </p>
                </div>

                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={handleRestartQuiz}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition shadow-md"
                  >
                    <RefreshCw size={14} />
                    <span>Retake Practice Quiz</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('FLASHCARDS')}
                    className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition"
                  >
                    Review Flashcards
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">Loading quiz questions...</div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: EXAM COUNTDOWN & SMART SYLLABUS                                    */}
        {/* ========================================================================= */}
        {activeTab === 'SYLLABUS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upcoming Countdown Clocks */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-purple-600" />
                <span>Board & Term Exam Countdowns</span>
              </h3>

              <div className="space-y-3">
                {upcomingExams.map((exam, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-purple-900">{exam.name}</h4>
                      <p className="text-xs text-purple-700">{exam.subject}</p>
                      <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                        <Calendar size={12} /> {exam.date}
                      </p>
                    </div>

                    <div className="text-center px-4 py-2 bg-white rounded-xl shadow-xs border border-purple-100 min-w-[80px]">
                      <span className="text-xl font-black text-purple-700 block">{exam.daysLeft}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Days Left</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Syllabus Coverage Progress */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BookOpen size={18} className="text-emerald-600" />
                <span>Subject Syllabus Coverage</span>
              </h3>

              <div className="space-y-4">
                {syllabusProgress.map((sub, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800">{sub.subject}</span>
                      <span className="font-semibold text-gray-500">
                        {sub.coveredChapters} / {sub.totalChapters} Chapters ({sub.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          sub.percent >= 75
                            ? 'bg-emerald-500'
                            : sub.percent >= 60
                            ? 'bg-amber-500'
                            : 'bg-purple-600'
                        }`}
                        style={{ width: `${sub.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PYQs & PREVIOUS YEAR QUESTION PAPERS                               */}
        {/* ========================================================================= */}
        {activeTab === 'PYQ' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">CBSE & State Board Previous Year Papers</h3>
                <p className="text-xs text-gray-500">Download official 10-year question banks with marking schemes</p>
              </div>
              <div className="flex items-center gap-2">
                {canUploadPYQ && (
                  <button
                    onClick={() => setShowUploadPYQModal(true)}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    + Upload PYQ
                  </button>
                )}
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                  Class 10 Board Series
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pyqList.map((paper, i) => (
                <div key={i} className="p-4 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition bg-gray-50/50 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {paper.subject} • {paper.year}
                    </span>
                    <h4 className="text-xs font-bold text-gray-800 mt-2 line-clamp-2">{paper.title}</h4>
                    <p className="text-[11px] text-gray-400 mt-1">PDF Document • {paper.size}</p>
                  </div>

                  <button
                    onClick={() => toast.success(`Downloading ${paper.title}...`)}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-purple-600 hover:text-white border border-gray-200 text-purple-700 rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <Download size={13} />
                    <span>Download Paper & Key</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CREATE FLASHCARD (Admin & Teacher)                                 */}
        {/* ========================================================================= */}
        {showCreateCardModal && canCreateContent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setShowCreateCardModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <XCircle size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add New Flashcard</h3>
                  <p className="text-xs text-gray-500">Create an active-recall concept card</p>
                </div>
              </div>

              <form onSubmit={e => {
                e.preventDefault();
                if (!newCard.question || !newCard.answer) return;
                const card: Flashcard = {
                  id: `fc-${Date.now()}`,
                  subject: newCard.subject,
                  chapter: newCard.chapter || 'Core Concepts',
                  question: newCard.question,
                  answer: newCard.answer,
                  mnemonicOrFormula: newCard.mnemonicOrFormula || undefined,
                  difficulty: 'MEDIUM',
                };
                setFlashcards([card, ...flashcards]);
                toast.success('Flashcard created successfully!');
                setShowCreateCardModal(false);
                setNewCard({ subject: 'Science', chapter: '', question: '', answer: '', mnemonicOrFormula: '' });
              }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Subject</label>
                    <select value={newCard.subject} onChange={e => setNewCard({ ...newCard, subject: e.target.value })} className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50">
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="Social Science">Social Science</option>
                      <option value="Computer Science">Computer Science</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Chapter Name</label>
                    <input type="text" value={newCard.chapter} onChange={e => setNewCard({ ...newCard, chapter: e.target.value })} placeholder="e.g. Chapter 4" className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Front: Question / Concept *</label>
                  <textarea rows={2} required value={newCard.question} onChange={e => setNewCard({ ...newCard, question: e.target.value })} placeholder="Enter the prompt or question..." className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Back: Answer & Detailed Explanation *</label>
                  <textarea rows={3} required value={newCard.answer} onChange={e => setNewCard({ ...newCard, answer: e.target.value })} placeholder="Key points or complete answer..." className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Formula / Memory Trick (Optional)</label>
                  <input type="text" value={newCard.mnemonicOrFormula} onChange={e => setNewCard({ ...newCard, mnemonicOrFormula: e.target.value })} placeholder="e.g. PEMDAS or D = b² - 4ac" className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50" />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t">
                  <button type="button" onClick={() => setShowCreateCardModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md">Add Flashcard</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CREATE QUIZ QUESTION (Admin & Teacher)                             */}
        {/* ========================================================================= */}
        {showCreateQuizModal && canCreateContent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowCreateQuizModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <XCircle size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add Mock Quiz Question</h3>
                  <p className="text-xs text-gray-500">Design a 4-choice timed test item</p>
                </div>
              </div>

              <form onSubmit={e => {
                e.preventDefault();
                if (!newQuiz.question || !newQuiz.opt0 || !newQuiz.opt1) return;
                const item: QuizQuestion = {
                  id: `qz-${Date.now()}`,
                  subject: newQuiz.subject,
                  question: newQuiz.question,
                  options: [newQuiz.opt0, newQuiz.opt1, newQuiz.opt2 || 'Option C', newQuiz.opt3 || 'Option D'],
                  correctIndex: newQuiz.correctIndex,
                  explanation: newQuiz.explanation || 'Verified CBSE question key.',
                  studyTip: 'Master this concept for the upcoming term examination.',
                };
                setQuizzes([item, ...quizzes]);
                toast.success('Mock Quiz Question added!');
                setShowCreateQuizModal(false);
                setNewQuiz({ subject: 'Mathematics', question: '', opt0: '', opt1: '', opt2: '', opt3: '', correctIndex: 0, explanation: '' });
              }} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Subject</label>
                  <select value={newQuiz.subject} onChange={e => setNewQuiz({ ...newQuiz, subject: e.target.value })} className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50">
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Social Science">Social Science</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Question Statement *</label>
                  <textarea rows={2} required value={newQuiz.question} onChange={e => setNewQuiz({ ...newQuiz, question: e.target.value })} placeholder="Type question..." className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 resize-none" />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">4 Multiple-Choice Options</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" required value={newQuiz.opt0} onChange={e => setNewQuiz({ ...newQuiz, opt0: e.target.value })} placeholder="Option A *" className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50" />
                    <input type="text" required value={newQuiz.opt1} onChange={e => setNewQuiz({ ...newQuiz, opt1: e.target.value })} placeholder="Option B *" className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50" />
                    <input type="text" value={newQuiz.opt2} onChange={e => setNewQuiz({ ...newQuiz, opt2: e.target.value })} placeholder="Option C" className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50" />
                    <input type="text" value={newQuiz.opt3} onChange={e => setNewQuiz({ ...newQuiz, opt3: e.target.value })} placeholder="Option D" className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Correct Option</label>
                    <select value={newQuiz.correctIndex} onChange={e => setNewQuiz({ ...newQuiz, correctIndex: +e.target.value })} className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50">
                      <option value={0}>Option A</option>
                      <option value={1}>Option B</option>
                      <option value={2}>Option C</option>
                      <option value={3}>Option D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Explanation</label>
                    <input type="text" value={newQuiz.explanation} onChange={e => setNewQuiz({ ...newQuiz, explanation: e.target.value })} placeholder="Why is this answer correct?" className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50" />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t">
                  <button type="button" onClick={() => setShowCreateQuizModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md">Add Question</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: UPLOAD PYQ PAPER (Admin & Teacher)                                 */}
        {/* ========================================================================= */}
        {showUploadPYQModal && canUploadPYQ && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setShowUploadPYQModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <XCircle size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Upload PYQ Paper</h3>
                  <p className="text-xs text-gray-500">Add question bank for students</p>
                </div>
              </div>

              <form onSubmit={e => {
                e.preventDefault();
                if (!newPYQ.title) return;
                setPyqList([{ title: newPYQ.title, subject: newPYQ.subject, year: newPYQ.year, size: newPYQ.size }, ...pyqList]);
                toast.success(`PYQ "${newPYQ.title}" uploaded!`);
                setShowUploadPYQModal(false);
                setNewPYQ({ title: '', subject: 'Mathematics', year: '2026', size: '2.5 MB' });
              }} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Paper Title *</label>
                  <input type="text" required value={newPYQ.title} onChange={e => setNewPYQ({ ...newPYQ, title: e.target.value })} placeholder="e.g. CBSE 2026 Mathematics Set 1" className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Subject</label>
                    <select value={newPYQ.subject} onChange={e => setNewPYQ({ ...newPYQ, subject: e.target.value })} className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50">
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="Social Science">Social Science</option>
                      <option value="English">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Year</label>
                    <input type="text" value={newPYQ.year} onChange={e => setNewPYQ({ ...newPYQ, year: e.target.value })} className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50" />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t">
                  <button type="button" onClick={() => setShowUploadPYQModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">Upload Paper</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
