import React from 'react';
import { ChevronDown, ChevronRight, Shield, Sparkles } from 'lucide-react';
import {
  getPathById,
  getProfileById,
  getReplacedRacialPath,
  isRacialReplacementPath,
} from '../../../engine/compendium';
import type { CharacterSheet, ComputedCharacterStats } from '../../../types/cof2';
import { AbilityRankItem } from './AbilityRankItem';

interface AbilitiesTabProps {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  capabilityBudget: { spent: number; totalEarned: number; available: number };
  expandedPaths: Record<string, boolean>;
  togglePathExpand: (pathId: string) => void;
}

export const AbilitiesTab: React.FC<AbilitiesTabProps> = ({
  character,
  stats,
  capabilityBudget,
  expandedPaths,
  togglePathExpand,
}) => {
  const armorSpellCosts = stats.armorSpellCosts ?? {};
  const mainProfile = getProfileById(character.profileId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-stone-900/60 p-3 rounded-lg border border-stone-800">
        <div className="text-xs text-stone-300">
          <span className="text-amber-400 font-semibold">
            {character.acquiredAbilities.length}
          </span>{' '}
          capacités acquises. Budget points de capacités dépensés :{' '}
          <span className="font-mono text-amber-300">
            {capabilityBudget.spent} / {capabilityBudget.totalEarned}
          </span>
        </div>
      </div>

      {/* List of Character Paths */}
      {character.selectedPathIds.map((pathId) => {
        const pathData = getPathById(pathId);
        if (!pathData) return null;
        const isExpanded = !!expandedPaths[pathId];
        const replacedRacial = isRacialReplacementPath(pathId)
          ? getReplacedRacialPath(character)
          : null;
        const isHybrid =
          pathData.type === 'profile' &&
          mainProfile &&
          !mainProfile.paths.includes(pathData.id);

        return (
          <div
            key={pathId}
            className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow"
          >
            {/* Path Header */}
            <div
              onClick={() => togglePathExpand(pathId)}
              className="flex items-center justify-between p-3.5 bg-stone-950/80 cursor-pointer hover:bg-stone-800/50 transition border-b border-stone-800/80"
            >
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                )}
                <span className="font-serif font-bold text-amber-200 text-sm">
                  {pathData.name}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
                    pathData.type === 'prestige'
                      ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
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
                  {pathData.type === 'prestige'
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
                {pathData.type === 'domain' && pathData.deity && (
                  <span className="text-[11px] text-stone-400">
                    ({pathData.deity} — {pathData.domainTitle})
                  </span>
                )}
                {replacedRacial && (
                  <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/80 flex items-center space-x-1 font-medium">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                    <span>+ Peuple : {replacedRacial.rank1.title}</span>
                  </span>
                )}
              </div>

              {/* Rank Indicators */}
              <div className="flex items-center space-x-1">
                {pathData.ranks.map((r) => {
                  const acquired = character.acquiredAbilities.some(
                    (a) => a.pathId === pathId && a.rank === r.rank,
                  );
                  return (
                    <span
                      key={r.rank}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold ${
                        acquired
                          ? pathData.type === 'prestige'
                            ? 'bg-purple-500 text-stone-950 shadow'
                            : 'bg-amber-500 text-stone-950 shadow'
                          : 'bg-stone-800 text-stone-500 border border-stone-700'
                      }`}
                    >
                      {r.rank}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Path Ranks List */}
            {isExpanded && (
              <div className="divide-y divide-stone-800/60 p-2 space-y-2">
                {pathData.ranks.map((rank) => {
                  const isAcquired = character.acquiredAbilities.some(
                    (a) => a.pathId === pathId && a.rank === rank.rank,
                  );
                  return (
                    <AbilityRankItem
                      key={rank.rank}
                      pathId={pathId}
                      rank={rank}
                      isAcquired={isAcquired}
                      armorMalus={
                        armorSpellCosts[`${pathId}_${rank.rank}`] ?? 0
                      }
                      character={character}
                      stats={stats}
                      replacedRacial={rank.rank === 1 ? replacedRacial : null}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Active Situational Notes & Reminders */}
      {stats.situationalNotes.length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow space-y-2.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-300 uppercase tracking-wide border-b border-stone-800 pb-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>
              Rappels tactiques & Capacités passives actives (
              {stats.situationalNotes.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {stats.situationalNotes.map((note, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-2 bg-stone-950/60 border border-stone-800/80 rounded-lg p-2.5 text-xs text-stone-300"
              >
                <span className="text-amber-500 font-bold leading-none mt-0.5">
                  •
                </span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
