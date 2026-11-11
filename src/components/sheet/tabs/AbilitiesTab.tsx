import React from 'react';
import {
  CharacterSheet,
  ComputedCharacterStats,
  RankModifiers,
} from '../../../types/cof2';
import {
  getPathById,
  isRacialReplacementPath,
  getReplacedRacialPath,
  getProfileById,
  calculateArmorSpellManaCost,
} from '../../../engine/rulesEngine';
import {
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Shield,
} from 'lucide-react';
import { ActionBadges } from '../ActionBadges';
import { CompanionCard } from '../CompanionCard';
import { ExternalAbilitySelector } from '../ExternalAbilitySelector';

const TARGET_LABELS: Record<string, string> = {
  defense: 'DEF',
  hp: 'PV',
  initiative: 'Init',
  pc: 'PC',
  dr: 'DR',
  pm: 'PM',
  damageReduction: 'RD',
  atkContact: 'ATQ Contact',
  atkDistance: 'ATQ Distance',
  atkMagic: 'ATQ Magique',
  dmContact: 'DM Contact',
  dmDistance: 'DM Distance',
  dmMagic: 'DM Magique',
  critRange: 'Crit',
};

function renderModifierBadges(modifiers?: RankModifiers) {
  if (!modifiers) return null;
  const hasStats = modifiers.stats && Object.keys(modifiers.stats).length > 0;
  const hasBonuses = modifiers.bonuses && modifiers.bonuses.length > 0;
  const hasWeapons =
    modifiers.weaponModifiers && modifiers.weaponModifiers.length > 0;

  if (!hasStats && !hasBonuses && !hasWeapons) return null;

  return (
    <div className="mt-2 ml-7 flex flex-wrap items-center gap-1.5 text-[10px]">
      {modifiers.stats &&
        Object.entries(modifiers.stats).map(([st, v]) => (
          <span
            key={st}
            className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-200 border border-purple-800/60 font-mono font-bold"
          >
            +{v} {st}
          </span>
        ))}
      {modifiers.bonuses?.map((b, idx) => {
        const label = TARGET_LABELS[b.target] || b.target;
        const parts: string[] = [];
        if (b.flat) parts.push(`+${b.flat}`);
        if (b.perRank) parts.push(`+${b.perRank}/rang`);
        if (b.perLevel) parts.push(`+${b.perLevel}/niv`);
        if (b.stat) parts.push(`+${b.stat}`);
        if (b.atRank) {
          const vals = Object.values(b.atRank);
          parts.push(`+${vals.join('/')}`);
        }
        const valText = parts.join(' ') || '+1';
        const condText =
          b.condition === 'noArmor' ? ' (sans armure)' : '';
        const colorClass =
          b.target === 'defense' || b.target === 'dr'
            ? 'bg-blue-950/80 text-blue-200 border-blue-800/60'
            : b.target === 'hp'
              ? 'bg-red-950/80 text-red-200 border-red-800/60'
              : b.target === 'critRange'
                ? 'bg-rose-950/80 text-rose-200 border-rose-800/60'
                : 'bg-amber-950/80 text-amber-200 border-amber-800/60';

        return (
          <span
            key={`b_${idx}`}
            className={`px-1.5 py-0.5 rounded border font-mono font-bold ${colorClass}`}
          >
            {valText} {label}
            {condText}
          </span>
        );
      })}
      {modifiers.weaponModifiers?.map((wm, idx) => (
        <span
          key={`wm_${idx}`}
          className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-200 border border-emerald-800/60 font-mono font-bold"
        >
          {wm.note || wm.sourceName || 'Bonus d’arme'}
        </span>
      ))}
    </div>
  );
}

interface AbilitiesTabProps {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  capabilityBudget: { spent: number; totalEarned: number; available: number };
  expandedPaths: Record<string, boolean>;
  togglePathExpand: (pathId: string) => void;
  toggleAbility: (pathId: string, rank: number) => void;
  updateCharacter: (partial: Partial<CharacterSheet>) => void;
  onOpenLevelUp: () => void;
}

export const AbilitiesTab: React.FC<AbilitiesTabProps> = ({
  character,
  stats,
  capabilityBudget,
  expandedPaths,
  togglePathExpand,
  toggleAbility,
  updateCharacter,
  onOpenLevelUp,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-stone-900/60 p-3 rounded-lg border border-stone-800">
        <div className="text-xs text-stone-300">
          <span className="text-amber-400 font-semibold">{character.acquiredAbilities.length}</span> capacités acquises.
          Budget points de capacités dépensés : <span className="font-mono text-amber-300">{capabilityBudget.spent} / {capabilityBudget.totalEarned}</span>
        </div>
        <button
          onClick={onOpenLevelUp}
          className="flex items-center space-x-1 text-xs bg-amber-600 hover:bg-amber-500 text-stone-950 px-2.5 py-1 rounded font-semibold transition"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Gérer la progression</span>
        </button>
      </div>

      {/* List of Character Paths */}
      {character.selectedPathIds.map(pathId => {
        const pathData = getPathById(pathId);
        if (!pathData) return null;
        const isExpanded = !!expandedPaths[pathId];
        const replacedRacial = isRacialReplacementPath(pathId) ? getReplacedRacialPath(character) : null;
        const mainProfile = getProfileById(character.profileId);
        const isHybrid = pathData.type === 'profile' && mainProfile && !mainProfile.paths.includes(pathData.id);

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
                <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
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
                }`}>
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
                {pathData.ranks.map(r => {
                  const acquired = character.acquiredAbilities.some(
                    a => a.pathId === pathId && a.rank === r.rank
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
                {pathData.ranks.map(rank => {
                  const isAcquired = character.acquiredAbilities.some(
                    a => a.pathId === pathId && a.rank === rank.rank
                  );

                  return (
                    <div
                      key={rank.rank}
                      className={`p-3 rounded-lg transition border ${
                        isAcquired
                          ? 'bg-amber-950/20 border-amber-800/40'
                          : 'bg-stone-950/40 border-stone-800/60 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-bold ${
                              isAcquired
                                ? 'bg-amber-500 text-stone-950'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {rank.rank}
                          </span>
                          <span className="font-semibold text-stone-200 text-sm">
                            {rank.title}
                          </span>

                          <ActionBadges rank={rank} />

                          {rank.isSpell && (() => {
                            const armorMalus = calculateArmorSpellManaCost(character, pathId, rank.rank);
                            if (armorMalus > 0) {
                              return (
                                <span
                                  className="text-[10px] bg-red-950 text-red-300 border border-red-800/80 px-2 py-0.5 rounded font-mono font-bold"
                                  title="Surcoût en PM pour lancer ce sort avec l'armure actuellement équipée (Règles COF2 chap. 9)"
                                >
                                  +{armorMalus} PM (Armure)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        <button
                          onClick={() => toggleAbility(pathId, rank.rank)}
                          className={`px-2.5 py-0.5 rounded text-xs font-semibold transition ${
                            isAcquired
                              ? 'bg-amber-600/30 text-amber-300 border border-amber-600/50 hover:bg-red-950/40 hover:text-red-300 hover:border-red-700'
                              : 'bg-stone-800 text-stone-300 hover:bg-amber-600 hover:text-stone-950'
                          }`}
                        >
                          {isAcquired ? 'Acquise ✓' : 'Débloquer'}
                        </button>
                      </div>

                      <p className="text-xs text-stone-400 leading-relaxed pl-7">
                        {rank.description}
                      </p>

                      {/* Companion / Creature stat cards */}
                      {rank.companions && rank.companions.length > 0 && (
                        <div className="pl-7 space-y-2">
                          {rank.companions.map((comp, idx) => (
                            <CompanionCard
                              key={idx}
                              companion={comp}
                              character={character}
                              stats={stats}
                              pathId={pathId}
                            />
                          ))}
                        </div>
                      )}

                      {/* Passive bonus indicator pill */}
                      {renderModifierBadges(rank.modifiers)}

                      {/* External ability selector (free choice or replacement if already owned) */}
                      {isAcquired && rank.modifiers?.grantExternalAbility && (
                        <ExternalAbilitySelector
                          character={character}
                          pathId={pathId}
                          rank={rank}
                          updateCharacter={updateCharacter}
                        />
                      )}

                      {/* Interactive Choice Selector if acquired */}
                      {isAcquired && rank.modifiers?.choiceOptions && rank.modifiers.choiceOptions.length > 0 && (
                        <div className="mt-2.5 ml-7 p-2.5 bg-stone-900 border border-amber-800/50 rounded-lg space-y-1.5">
                          <div className="text-[11px] font-semibold text-amber-300 flex items-center space-x-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Option d'application choisie pour ce rang :</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {rank.modifiers.choiceOptions.map(opt => {
                              const choiceKey = `${pathId}_${rank.rank}`;
                              const isChosen = (character.pathRankChoices?.[choiceKey] || rank.modifiers?.choiceOptions?.[0]?.id) === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    updateCharacter({
                                      pathRankChoices: {
                                        ...character.pathRankChoices,
                                        [choiceKey]: opt.id,
                                      },
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded text-xs transition border ${
                                    isChosen
                                      ? 'bg-amber-600 text-stone-950 font-bold border-amber-500 shadow'
                                      : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-amber-700'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Reminder for Replaced Racial Path Rank 1 Ability */}
                      {rank.rank === 1 && replacedRacial && (
                        <div className="mt-3 ml-7 p-3 rounded-xl bg-emerald-950/30 border border-emerald-700/50 shadow space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-emerald-900/60">
                            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-300">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Rappel : Capacité de peuple conservée ({replacedRacial.path.name} • Rang 1)</span>
                            </div>
                            <span className="text-[10px] bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded border border-emerald-600/50 font-semibold font-mono">
                              Rang 1 acquis ✓
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-stone-950 text-xs font-mono font-bold flex items-center justify-center">
                              1
                            </span>
                            <span className="font-semibold text-stone-100 text-xs">
                              {replacedRacial.rank1.title}
                            </span>
                            <ActionBadges rank={replacedRacial.rank1} />
                          </div>

                          <p className="text-xs text-stone-300 pl-7 leading-relaxed">
                            {replacedRacial.rank1.description}
                          </p>

                          {replacedRacial.rank1.companions && replacedRacial.rank1.companions.length > 0 && (
                            <div className="pl-7 space-y-2">
                              {replacedRacial.rank1.companions.map((comp, idx) => (
                                <CompanionCard
                                  key={idx}
                                  companion={comp}
                                  character={character}
                                  stats={stats}
                                  pathId={replacedRacial.path.id}
                                />
                              ))}
                            </div>
                          )}

                          {/* Passive modifiers for racial rank 1 */}
                          {renderModifierBadges(replacedRacial.rank1.modifiers)}

                          {/* Interactive choice selector for racial rank 1 if any */}
                          {replacedRacial.rank1.modifiers?.choiceOptions && replacedRacial.rank1.modifiers.choiceOptions.length > 0 && (
                            <div className="ml-7 pt-2 border-t border-emerald-900/60 space-y-1">
                              <div className="text-[11px] font-semibold text-emerald-300">
                                Option choisie pour cette capacité de peuple :
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {replacedRacial.rank1.modifiers.choiceOptions.map((opt: { id: string; label: string }) => {
                                  const choiceKey = `${replacedRacial.path.id}_1`;
                                  const isChosen = (character.pathRankChoices?.[choiceKey] || replacedRacial.rank1.modifiers?.choiceOptions?.[0]?.id) === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => {
                                        updateCharacter({
                                          pathRankChoices: {
                                            ...character.pathRankChoices,
                                            [choiceKey]: opt.id,
                                          },
                                        });
                                      }}
                                      className={`px-2 py-0.5 rounded text-xs transition border ${
                                        isChosen
                                          ? 'bg-emerald-600 text-stone-950 font-bold border-emerald-500 shadow'
                                          : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-emerald-700'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Active Situational Notes & Reminders */}
      {stats.pathSituationalNotes.length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow space-y-2.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-300 uppercase tracking-wide border-b border-stone-800 pb-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Rappels tactiques & Capacités passives actives ({stats.pathSituationalNotes.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {stats.pathSituationalNotes.map((note, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-2 bg-stone-950/60 border border-stone-800/80 rounded-lg p-2.5 text-xs text-stone-300"
              >
                <span className="text-amber-500 font-bold leading-none mt-0.5">•</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

