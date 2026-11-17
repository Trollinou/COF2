import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ResolvedExternalGrant } from '../../../bindings';
import type { CharacterSheet, PathData } from '../../../types/cof2';
import { ExternalAbilitySelector } from '../../shared/ExternalAbilitySelector';
import { RankChoiceSelector } from '../../shared/RankChoiceSelector';
import { ActionBadges } from '../../sheet/ActionBadges';
import { CompanionCard } from '../../sheet/CompanionCard';

interface WizardProfilePathCardProps {
  pathData: PathData;
  character: CharacterSheet;
  externalGrants?: ResolvedExternalGrant[];
  isSelected: boolean;
  isExpanded: boolean;
  isOptional?: boolean;
  variant?: 'amber' | 'purple';
  togglePathPreview: (pathId: string) => void;
  toggleProfilePath: (pathId: string) => void;
  handleUpdatePartial: (partial: Partial<CharacterSheet>) => void;
  handleRankChoice: (choiceKey: string, optionId: string) => void;
}

const CARD_THEMES = {
  amber: {
    selectedCard: 'bg-stone-950 border-amber-500 ring-1 ring-amber-500',
    symbol: 'text-amber-400',
    selectedBadge: 'bg-amber-500 text-stone-950',
    rank1Title: 'text-amber-200',
    selectedButton: 'bg-amber-600 text-stone-950 hover:bg-amber-500',
    rank1Circle: 'bg-amber-500 text-stone-950',
    rank1Status: 'text-amber-400',
  },
  purple: {
    selectedCard: 'bg-stone-950 border-purple-500 ring-1 ring-purple-500',
    symbol: 'text-purple-400',
    selectedBadge: 'bg-purple-600 text-stone-950',
    rank1Title: 'text-purple-200',
    selectedButton: 'bg-purple-600 text-stone-950 hover:bg-purple-500',
    rank1Circle: 'bg-purple-500 text-stone-950',
    rank1Status: 'text-purple-400',
  },
} as const;

export const WizardProfilePathCard: React.FC<WizardProfilePathCardProps> = ({
  pathData,
  character,
  externalGrants,
  isSelected,
  isExpanded,
  isOptional = false,
  variant = 'amber',
  togglePathPreview,
  toggleProfilePath,
  handleUpdatePartial,
  handleRankChoice,
}) => {
  const theme = CARD_THEMES[variant];
  const rank1 = pathData.ranks[0];

  return (
    <div
      className={`rounded-xl border transition overflow-hidden shadow ${
        isSelected
          ? theme.selectedCard
          : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
      }`}
    >
      {/* Path Card Header */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <span className={`${theme.symbol} font-serif font-black text-lg`}>
            {variant === 'amber' ? pathData.symbol || '▲' : '▲'}
          </span>
          <div>
            <div className="font-serif font-bold text-base text-stone-100 flex items-center flex-wrap gap-2">
              <span>{pathData.name}</span>
              {isOptional && (
                <span className="text-[10px] bg-sky-950/90 text-sky-300 border border-sky-800 px-2 py-0.5 rounded font-semibold uppercase tracking-wide">
                  Atlas
                </span>
              )}
              {isSelected && (
                <span
                  className={`text-[10px] ${theme.selectedBadge} px-2 py-0.5 rounded font-bold uppercase tracking-wide`}
                >
                  Choisie ✓
                </span>
              )}
            </div>
            <div className="text-xs text-stone-400">
              Rang 1 initial :{' '}
              <strong className={theme.rank1Title}>{rank1?.title}</strong> (
              {rank1?.actionType})
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => togglePathPreview(pathData.id)}
            className="flex items-center space-x-1 text-xs bg-stone-900 hover:bg-stone-800 text-stone-300 px-3 py-1.5 rounded border border-stone-700 transition"
          >
            <span>{isExpanded ? 'Réduire' : 'Voir les 5 rangs'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleProfilePath(pathData.id)}
            className={`px-4 py-1.5 rounded text-xs font-bold transition shadow ${
              isSelected
                ? theme.selectedButton
                : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-600'
            }`}
          >
            {isSelected ? 'Voie Choisie ✓' : 'Choisir cette voie'}
          </button>
        </div>
      </div>

      {/* Preview of Rank 1 always visible, ranks 2-5 when expanded */}
      <div className="px-4 pb-4 pt-1 border-t border-stone-800/80 space-y-2 bg-stone-900/30">
        <div className="p-2.5 rounded bg-stone-900/70 border border-stone-800">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span
                className={`w-5 h-5 rounded-full ${theme.rank1Circle} text-xs font-mono font-bold flex items-center justify-center`}
              >
                1
              </span>
              <span className="font-semibold text-stone-200 text-xs">
                {rank1?.title}
              </span>
              {rank1 && <ActionBadges rank={rank1} />}
            </div>
            <span className={`text-[10px] ${theme.rank1Status} font-semibold`}>
              {isSelected ? 'Acquis au Niv. 1' : 'Disponible au Niv. 1'}
            </span>
          </div>
          <p className="text-xs text-stone-400 pl-7 leading-relaxed">
            {rank1?.description}
          </p>
          {isSelected && rank1 && (
            <>
              <ExternalAbilitySelector
                character={character}
                pathId={pathData.id}
                rank={rank1}
                externalGrants={externalGrants}
                updateCharacter={handleUpdatePartial}
              />
              <RankChoiceSelector
                character={character}
                pathId={pathData.id}
                rank={rank1}
                onChangeChoice={handleRankChoice}
                requireExplicitChoice
              />
            </>
          )}
        </div>

        {isExpanded && (
          <div className="space-y-2 pt-2 border-t border-stone-800/60">
            {pathData.ranks.slice(1).map((r) => (
              <div
                key={r.rank}
                className="p-2.5 rounded bg-stone-900/40 border border-stone-800/60 text-xs"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 text-xs font-mono font-bold flex items-center justify-center">
                    {r.rank}
                  </span>
                  <span className="font-semibold text-stone-200">{r.title}</span>
                  <ActionBadges rank={r} />
                </div>
                <p className="text-stone-400 pl-7 leading-relaxed">
                  {r.description}
                </p>
                {r.companions && r.companions.length > 0 && (
                  <div className="pl-7 space-y-2 mt-2">
                    {r.companions.map((comp, cIdx) => (
                      <CompanionCard key={cIdx} companion={comp} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
