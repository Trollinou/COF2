import React from 'react';
import { Sparkles } from 'lucide-react';
import { ActionRank, CharacterSheet } from '../../types/cof2';

interface RankChoiceSelectorProps {
  character: CharacterSheet;
  pathId: string;
  rank: ActionRank;
  onChangeChoice?: (choiceKey: string, optionId: string) => void;
  readOnly?: boolean;
  variant?: 'amber' | 'emerald';
}

export const RankChoiceSelector: React.FC<RankChoiceSelectorProps> = ({
  character,
  pathId,
  rank,
  onChangeChoice,
  readOnly = false,
  variant = 'amber',
}) => {
  const options = rank.modifiers?.choiceOptions;
  if (!options || options.length === 0) return null;

  const choiceKey = `${pathId}_${rank.rank}`;
  const chosenId = character.pathRankChoices?.[choiceKey] || options[0]?.id;
  const chosenOption = options.find(o => o.id === chosenId) || options[0];

  const isEmerald = variant === 'emerald';
  const containerClass = isEmerald
    ? 'mt-2.5 ml-7 pt-2 border-t border-emerald-900/60 space-y-1'
    : 'mt-2.5 ml-7 p-2.5 bg-stone-900 border border-amber-800/50 rounded-lg space-y-1.5';
  const headerClass = isEmerald
    ? 'text-[11px] font-semibold text-emerald-300'
    : 'text-[11px] font-semibold text-amber-300 flex items-center space-x-1';

  if (readOnly) {
    return (
      <div className={containerClass}>
        <div className={headerClass}>
          {!isEmerald && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
          <span>Option d&apos;application choisie :</span>
          <span
            className={`ml-1.5 px-2 py-0.5 rounded text-xs font-bold border ${
              isEmerald
                ? 'bg-emerald-900/60 text-emerald-200 border-emerald-700/60'
                : 'bg-amber-950/70 text-amber-200 border-amber-700/60'
            }`}
          >
            {chosenOption?.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className={headerClass}>
        {!isEmerald && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
        <span>Option d&apos;application choisie pour ce rang :</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const isChosen = chosenId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeChoice?.(choiceKey, opt.id)}
              className={`px-2.5 py-1 rounded text-xs transition border ${
                isChosen
                  ? isEmerald
                    ? 'bg-emerald-600 text-stone-950 font-bold border-emerald-500 shadow'
                    : 'bg-amber-600 text-stone-950 font-bold border-amber-500 shadow'
                  : isEmerald
                    ? 'bg-stone-950 text-stone-300 border-stone-800 hover:border-emerald-700'
                    : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-amber-700'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
