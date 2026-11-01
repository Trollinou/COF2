import React from 'react';
import { Zap } from 'lucide-react';
import { ActionRank } from '../../types/cof2';

interface ActionBadgesProps {
  rank: Pick<ActionRank, 'actionType' | 'isSpell'> & Partial<Pick<ActionRank, 'isLimited' | 'isAttack' | 'isMovement' | 'isFreeAction' | 'isPassive'>>;
  compact?: boolean;
  variant?: 'dark' | 'print';
}

export const ActionBadges: React.FC<ActionBadgesProps> = ({ rank, compact = false, variant = 'dark' }) => {
  const hasLimited = rank.isLimited ?? (rank.actionType === 'Limitée');
  const hasAttack = rank.isAttack ?? (rank.actionType === 'Attaque');
  const hasMovement = rank.isMovement ?? (rank.actionType === 'Mouvement');
  const hasFree = rank.isFreeAction ?? (rank.actionType === 'Gratuite');
  const isSpell = Boolean(rank.isSpell);

  const hasAnyActiveAction = hasLimited || hasAttack || hasMovement || hasFree;
  const isPassive = rank.isPassive ?? (!hasAnyActiveAction && rank.actionType === 'Action');

  if (variant === 'print') {
    return (
      <span className="inline-flex items-center flex-wrap gap-1 font-sans">
        {hasLimited && (
          <span className="text-[9px] bg-amber-50 text-amber-900 border border-amber-300 px-1 py-0.2 rounded font-bold">
            [L]
          </span>
        )}
        {hasAttack && (
          <span className="text-[9px] bg-rose-50 text-rose-900 border border-rose-300 px-1 py-0.2 rounded font-bold">
            [A]
          </span>
        )}
        {hasMovement && (
          <span className="text-[9px] bg-sky-50 text-sky-900 border border-sky-300 px-1 py-0.2 rounded font-bold">
            [M]
          </span>
        )}
        {hasFree && (
          <span className="text-[9px] bg-emerald-50 text-emerald-900 border border-emerald-300 px-1 py-0.2 rounded font-bold">
            [G]
          </span>
        )}
        {isSpell && (
          <span className="text-[9px] bg-purple-50 text-purple-900 border border-purple-300 px-1 py-0.2 rounded font-bold">
            Sort *
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center flex-wrap gap-1">
      {hasLimited && (
        <span className="text-[10px] bg-amber-950/70 text-amber-300 border border-amber-700/60 px-1.5 py-0.5 rounded font-medium">
          {compact ? '[L]' : '[L] Limitée'}
        </span>
      )}
      {hasAttack && (
        <span className="text-[10px] bg-rose-950/70 text-rose-300 border border-rose-700/60 px-1.5 py-0.5 rounded font-medium">
          {compact ? '[A]' : "[A] Attaque"}
        </span>
      )}
      {hasMovement && (
        <span className="text-[10px] bg-sky-950/70 text-sky-300 border border-sky-700/60 px-1.5 py-0.5 rounded font-medium">
          {compact ? '[M]' : '[M] Mouvement'}
        </span>
      )}
      {hasFree && (
        <span className="text-[10px] bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded font-medium">
          {compact ? '[G]' : '[G] Gratuite'}
        </span>
      )}
      {isPassive && !hasAnyActiveAction && (
        <span className="text-[10px] bg-stone-800/80 text-stone-400 border border-stone-700/50 px-1.5 py-0.5 rounded">
          Passif
        </span>
      )}
      {isSpell && (
        <span className="text-[10px] bg-purple-950/70 text-purple-300 border border-purple-700/60 px-1.5 py-0.5 rounded font-medium flex items-center space-x-0.5">
          <Zap className="w-2.5 h-2.5 mr-0.5" />
          <span>Sort *</span>
        </span>
      )}
    </span>
  );
};
