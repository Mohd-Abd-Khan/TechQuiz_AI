import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  Rocket,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types — must match StudyRecommendation on the backend
// ─────────────────────────────────────────────────────────────────────────────

export type Priority = 'Critical' | 'Needs Improvement' | 'Good';

export interface StudyRecommendation {
  priority: Priority;
  icon: string;         // single emoji
  title: string;        // ≤ 5 words
  score: number;        // 0–100
  description: string;  // ≤ 15 words
  action: string;       // ≤ 10 words
}

interface AIStudyRecommendationsProps {
  recommendations: StudyRecommendation[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  hasAttempts: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Priority config — colours, icons, labels
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  {
    label: string;
    badgeClass: string;
    borderClass: string;
    glowClass: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  Critical: {
    label: 'Critical',
    badgeClass: 'bg-red-500/15 border border-red-500/30 text-red-400',
    borderClass: 'border-red-500/20 hover:border-red-500/40',
    glowClass: 'bg-red-500/5',
    Icon: AlertTriangle,
  },
  'Needs Improvement': {
    label: 'Needs Improvement',
    badgeClass: 'bg-amber-500/15 border border-amber-500/30 text-amber-400',
    borderClass: 'border-amber-500/20 hover:border-amber-500/40',
    glowClass: 'bg-amber-500/5',
    Icon: TrendingUp,
  },
  Good: {
    label: 'Good',
    badgeClass: 'bg-green-500/15 border border-green-500/30 text-green-400',
    borderClass: 'border-green-500/20 hover:border-green-500/40',
    glowClass: 'bg-green-500/5',
    Icon: CheckCircle2,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Score pill — colour shifts by value
// ─────────────────────────────────────────────────────────────────────────────

const ScorePill: React.FC<{ score: number }> = ({ score }) => {
  const colour =
    score < 40
      ? 'text-red-400 bg-red-500/10 border-red-500/25'
      : score < 70
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
      : 'text-green-400 bg-green-500/10 border-green-500/25';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${colour}`}
    >
      {score}%
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader — three pulsing placeholder cards
// ─────────────────────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="rounded-xl border border-white/5 bg-white/2 p-4 animate-pulse space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 bg-white/5 rounded-full" />
      <div className="h-4 w-10 bg-white/5 rounded-full" />
    </div>
    <div className="h-3 w-3/4 bg-white/5 rounded-full" />
    <div className="h-8 w-full bg-white/5 rounded-lg" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Individual recommendation card
// ─────────────────────────────────────────────────────────────────────────────

const RecommendationCard: React.FC<{
  rec: StudyRecommendation;
  index: number;
}> = ({ rec, index }) => {
  const cfg = PRIORITY_CONFIG[rec.priority];
  const PriorityIcon = cfg.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.07 }}
      className={`relative rounded-xl border ${cfg.borderClass} ${cfg.glowClass} p-4 transition-all duration-200 group`}
    >
      {/* Header row: emoji + title + score pill */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Topic emoji */}
          <span className="text-lg leading-none flex-shrink-0" aria-hidden>
            {rec.icon}
          </span>
          {/* Title */}
          <h4 className="text-sm font-bold text-white truncate leading-tight">
            {rec.title}
          </h4>
        </div>

        {/* Score pill — right-aligned */}
        <ScorePill score={rec.score} />
      </div>

      {/* Priority badge */}
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-2 ${cfg.badgeClass}`}
      >
        <PriorityIcon className="w-2.5 h-2.5" />
        {cfg.label}
      </span>

      {/* Description */}
      <p className="text-[11px] text-gray-400 leading-relaxed mb-3 line-clamp-2">
        {rec.description}
      </p>

      {/* Action row */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold min-w-0">
          <Rocket className="w-3 h-3 text-indigo-400 flex-shrink-0" />
          <span className="truncate">{rec.action}</span>
        </div>
        <button
          className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors duration-150 group-hover:translate-x-0.5 transition-transform"
          aria-label={`Start learning ${rec.title}`}
        >
          Start Learning <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const AIStudyRecommendations: React.FC<AIStudyRecommendationsProps> = ({
  recommendations,
  loading,
  refreshing,
  onRefresh,
  hasAttempts,
}) => {
  const isEmpty = !loading && recommendations.length === 0;

  return (
    <div className="glass-card border-t-4 border-t-indigo-500 flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 p-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <h3 className="font-bold text-white text-sm">AI Study Plan</h3>
          {!loading && recommendations.length > 0 && (
            <span className="text-[9px] bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {recommendations.length} cards
            </span>
          )}
        </div>

        {/* Generate New Plan button */}
        <button
          onClick={onRefresh}
          disabled={refreshing || loading || !hasAttempts}
          className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Generate a new study plan"
          id="generate-new-plan-btn"
        >
          <RefreshCw
            className={`w-3 h-3 ${refreshing ? 'animate-spin text-indigo-400' : ''}`}
          />
          {refreshing ? 'Generating…' : 'New Plan'}
        </button>
      </div>

      {/* ── Scrollable card list (capped at 400px) ── */}
      <div
        className="flex-1 overflow-y-auto px-5 pb-5 space-y-3 scroll-smooth"
        style={{ maxHeight: '340px' }}
      >
        <AnimatePresence mode="wait">
          {/* Loading skeletons */}
          {loading && (
            <motion.div
              key="skeletons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </motion.div>
          )}

          {/* Refreshing overlay */}
          {refreshing && !loading && (
            <motion.div
              key="refreshing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 gap-3"
            >
              <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-[11px] text-gray-500">
                Gemini is generating your plan…
              </p>
            </motion.div>
          )}

          {/* Empty state — no attempts yet */}
          {isEmpty && !hasAttempts && (
            <motion.div
              key="no-attempts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 gap-3 text-center"
            >
              <BookOpen className="w-8 h-8 text-gray-600" />
              <p className="text-xs text-gray-500 max-w-[180px] leading-relaxed">
                Attempt your first quiz to unlock your personalised study plan.
              </p>
            </motion.div>
          )}

          {/* Empty state — has attempts but no recs (edge case) */}
          {isEmpty && hasAttempts && (
            <motion.div
              key="empty-recs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 gap-3 text-center"
            >
              <CheckCircle2 className="w-8 h-8 text-green-500/60" />
              <p className="text-xs text-gray-500 max-w-[180px] leading-relaxed">
                Great work! No weak areas detected. Keep challenging yourself!
              </p>
            </motion.div>
          )}

          {/* Recommendation cards */}
          {!loading && !refreshing && recommendations.length > 0 && (
            <motion.div
              key="recommendations"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {recommendations.map((rec, i) => (
                <RecommendationCard key={`${rec.title}-${i}`} rec={rec} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIStudyRecommendations;
