import React from 'react';
import { PathData, CharacterSheet, ActionRank } from '../../types/cof2';
import {
  getRankLevelRequirement,
  getRankPointCost,
} from '../../engine/rulesEngine';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { ActionBadges } from '../sheet/ActionBadges';

interface LevelUpPathCardProps {
  pathData: PathData;
  character: CharacterSheet;
  acquired: Array<{ pathId: string; rank: number }>;
  newLevel: number;
  pointsToSpend: number;
  onToggleAbility: (pathId: string, rank: number) => void;
  isPrestige?: boolean;
  onRemovePrestige?: (pathId: string) => void;
  canRemovePrestige?: boolean;
  isHybrid?: boolean;
  onRemoveHybrid?: (pathId: string) => void;
  canRemoveHybrid?: boolean;
  replacedRacial?: { path: PathData; rank1: ActionRank } | null;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export const LevelUpPathCard: React.FC<LevelUpPathCardProps> = ({
  pathData,
  character,
  acquired,
  newLevel,
  pointsToSpend,
  onToggleAbility,
  isPrestige = false,
  onRemovePrestige,
  canRemovePrestige = false,
  isHybrid = false,
  onRemoveHybrid,
  canRemoveHybrid = false,
  replacedRacial,
  expanded = false,
  onToggleExpand,
}) => {
  const minRank = pathData.ranks[0]?.rank || 1;
  const acquiredCount = pathData.ranks.filter(r =>
    acquired.some(a => a.pathId === pathData.id && a.rank === r.rank)
  ).length;

  return (
    <div
      className={`rounded-xl border transition overflow-hidden shadow-sm ${
        isPrestige
          ? 'bg-purple-950/20 border-purple-800/60'
          : acquiredCount > 0
          ? 'bg-stone-950/80 border-amber-900/40'
          : 'bg-stone-950/40 border-stone-800 hover:border-stone-700'
      }`}
    >
      {/* Path Header */}
      <div className="p-3 bg-stone-900/60 border-b border-stone-800/80 flex items-center justify-between gap-2">
        <div
          onClick={onToggleExpand}
          className="flex items-center space-x-2 flex-wrap gap-y-1 cursor-pointer flex-1"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
          )}

          <span
            className={`font-serif font-bold text-sm ${
              isPrestige ? 'text-purple-200' : 'text-amber-200'
            }`}
          >
            {pathData.name}
          </span>

          <span
            className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-medium ${
              isPrestige
                ? 'bg-purple-900/70 text-purple-200 border border-purple-700/60'
                : isHybrid
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                : pathData.id === 'voie-du-mage'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : pathData.type === 'domain'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : pathData.type === 'racial'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-stone-800 text-stone-400'
            }`}
          >
            {isPrestige
              ? 'Voie de Prestige'
              : isHybrid
              ? 'Voie Hybride'
              : pathData.id === 'voie-du-mage'
              ? 'Voie du Mage'
              : pathData.type === 'domain'
              ? 'Voie de Domaine'
              : pathData.type === 'racial'
              ? 'Voie de Peuple'
              : 'Voie de Profil'}
          </span>

          <span
            className={`text-[10px] px-2 py-0.5 rounded ${
              acquiredCount > 0
                ? isPrestige
                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-stone-900 text-stone-500 border border-stone-800'
            }`}
          >
            {acquiredCount > 0
              ? `${acquiredCount} rang(s) acquis`
              : 'Non ouverte (0 rang)'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="text-xs text-stone-400 hover:text-amber-300 px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 transition"
            >
              {expanded ? 'Masquer détails' : 'Détails des rangs'}
            </button>
          )}

          {canRemovePrestige && onRemovePrestige && (
            <button
              type="button"
              onClick={() => onRemovePrestige(pathData.id)}
              className="text-stone-400 hover:text-rose-400 p-1.5 rounded hover:bg-stone-800 transition"
              title="Retirer cette voie de prestige"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {canRemoveHybrid && onRemoveHybrid && (
            <button
              type="button"
              onClick={() => onRemoveHybrid(pathData.id)}
              className="text-stone-400 hover:text-rose-400 p-1.5 rounded hover:bg-stone-800 transition"
              title="Retirer cette voie hybride"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Replaced racial path reminder for Domain or Voie du Mage */}
      {replacedRacial && (
        <div className="mx-3 mt-2 text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="flex items-center space-x-1.5 flex-wrap">
            <span>
              Rappel : <strong>{replacedRacial.path.name}</strong> • <em>« {replacedRacial.rank1.title} »</em>
            </span>
            <ActionBadges rank={replacedRacial.rank1} compact />
          </span>
        </div>
      )}

      {/* Quick Rank Selector Buttons */}
      <div className="p-3">
        <div className="grid grid-cols-5 gap-2">
          {pathData.ranks.map(r => {
            const isPrior = character.acquiredAbilities.some(
              a => a.pathId === pathData.id && a.rank === r.rank
            );
            const isSelectedNow = acquired.some(
              a => a.pathId === pathData.id && a.rank === r.rank
            );
            const cost = getRankPointCost(r.rank);
            const reqLevel = getRankLevelRequirement(isPrestige, r.rank, pathData.id);
            const levelBlocked = newLevel < reqLevel;
            const prevMissing = r.rank > minRank && !acquired.some(
              a => a.pathId === pathData.id && a.rank === r.rank - 1
            );
            const notEnoughPoints = !isSelectedNow && pointsToSpend < cost;

            return (
              <button
                key={r.rank}
                disabled={isPrior || levelBlocked || prevMissing || notEnoughPoints}
                onClick={() => onToggleAbility(pathData.id, r.rank)}
                className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-between min-h-[64px] ${
                  isPrior
                    ? 'bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed'
                    : isSelectedNow
                    ? isPrestige
                      ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-md ring-1 ring-purple-400'
                      : 'bg-amber-600 border-amber-500 text-stone-950 font-bold shadow-md ring-1 ring-amber-400'
                    : levelBlocked
                    ? 'bg-stone-950/40 border-stone-800/60 text-stone-600 cursor-not-allowed opacity-60'
                    : prevMissing
                    ? 'bg-stone-950/50 border-stone-800 text-stone-600 cursor-not-allowed opacity-75'
                    : notEnoughPoints
                    ? 'bg-stone-900/80 border-stone-800 text-stone-500 cursor-not-allowed opacity-75'
                    : isPrestige
                    ? 'bg-stone-900 border-purple-800/60 text-purple-200 hover:border-purple-500 hover:bg-stone-800'
                    : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-amber-600 hover:bg-stone-800'
                }`}
                title={
                  isPrior
                    ? 'Déjà acquis'
                    : isSelectedNow
                    ? 'Cliquer pour désapprendre et récupérer les points'
                    : levelBlocked
                    ? `Niveau ${reqLevel} requis`
                    : prevMissing
                    ? `Nécessite le rang ${r.rank - 1}`
                    : notEnoughPoints
                    ? `Coûte ${cost} pt (${pointsToSpend} disponible)`
                    : `Cliquer pour acquérir le rang ${r.rank} (${cost} pt)`
                }
              >
                <span className="font-mono text-xs font-bold flex items-center space-x-1">
                  <span>Rang {r.rank}</span>
                  {(isPrior || isSelectedNow) && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span className="text-[10px] font-medium line-clamp-1 px-1">
                  {r.title}
                </span>
                <span className="text-[9px] opacity-80 font-mono">
                  {isPrior
                    ? 'Acquis'
                    : isSelectedNow
                    ? 'Choisi ✓'
                    : levelBlocked
                    ? `Niv. ${reqLevel}`
                    : prevMissing
                    ? `R.${r.rank - 1} req.`
                    : `${cost} pt`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Detailed Ranks List (Matches Wizard Step 5) */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-stone-800/80 space-y-2 bg-stone-900/40">
          {pathData.ranks.map(r => {
            const isPrior = character.acquiredAbilities.some(
              a => a.pathId === pathData.id && a.rank === r.rank
            );
            const isSelectedNow = acquired.some(
              a => a.pathId === pathData.id && a.rank === r.rank
            );
            const cost = getRankPointCost(r.rank);
            const reqLevel = getRankLevelRequirement(isPrestige, r.rank, pathData.id);
            const levelBlocked = newLevel < reqLevel;
            const prevMissing = r.rank > minRank && !acquired.some(
              a => a.pathId === pathData.id && a.rank === r.rank - 1
            );
            const notEnoughPoints = !isSelectedNow && pointsToSpend < cost;

            return (
              <div
                key={r.rank}
                className={`p-3 rounded-lg border text-xs space-y-1.5 transition ${
                  isPrior
                    ? 'bg-stone-900/40 border-stone-800/60 opacity-80'
                    : isSelectedNow
                    ? isPrestige
                      ? 'bg-purple-950/40 border-purple-700/80 shadow'
                      : 'bg-amber-950/40 border-amber-700/80 shadow'
                    : 'bg-stone-900/60 border-stone-800/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span
                      className={`w-5 h-5 rounded-full text-xs font-mono font-bold flex items-center justify-center ${
                        isPrior
                          ? 'bg-stone-800 text-stone-400'
                          : isSelectedNow
                          ? isPrestige
                            ? 'bg-purple-500 text-stone-950'
                            : 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {r.rank}
                    </span>
                    <span className="font-semibold text-stone-100 text-sm">
                      {r.title}
                    </span>
                    <ActionBadges rank={r} />
                  </div>

                  {/* Actions & Status inside detail row */}
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-stone-400">
                      Niv. {reqLevel} • Coût: {cost} pt
                    </span>

                    {isPrior ? (
                      <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-400 text-[11px] font-medium">
                        Déjà acquis
                      </span>
                    ) : isSelectedNow ? (
                      <button
                        type="button"
                        onClick={() => onToggleAbility(pathData.id, r.rank)}
                        className="px-2.5 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-[11px] font-bold border border-rose-700/60 transition shadow flex items-center space-x-1"
                      >
                        <span>Désapprendre (+{cost} pt)</span>
                      </button>
                    ) : levelBlocked ? (
                      <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-500 text-[11px]">
                        Niveau {reqLevel} requis
                      </span>
                    ) : prevMissing ? (
                      <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-500 text-[11px]">
                        Rang {r.rank - 1} requis
                      </span>
                    ) : notEnoughPoints ? (
                      <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-amber-500/80 text-[11px]">
                        {cost} pt requis
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleAbility(pathData.id, r.rank)}
                        className={`px-3 py-1 rounded text-[11px] font-bold transition shadow ${
                          isPrestige
                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                            : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                        }`}
                      >
                        Apprendre ({cost} pt)
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-stone-300 pl-7 leading-relaxed whitespace-pre-line text-[11px]">
                  {r.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

