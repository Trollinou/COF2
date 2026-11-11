import React from 'react';
import { BookOpen, AlertTriangle } from 'lucide-react';
import { CharacterSheet, ActionRank, AbilityRef } from '../../types/cof2';
import {
  getPathById,
  resolveExternalGrants,
  PROFILES,
} from '../../engine/rulesEngine';
import { ActionBadges } from './ActionBadges';

interface ExternalAbilitySelectorProps {
  character: CharacterSheet;
  pathId: string;
  rank: ActionRank;
  updateCharacter: (partial: Partial<CharacterSheet>) => void;
}

const refKey = (a: AbilityRef) => `${a.pathId}_${a.rank}`;

/**
 * Selector for ranks granting an external ability (`grantExternalAbility`).
 * - Free mode: pick any ability among the allowed profiles.
 * - Default mode: the rank grants its default ability (shown read-only).
 * - Replacement mode: the default ability is already owned, pick a replacement.
 */
export const ExternalAbilitySelector: React.FC<ExternalAbilitySelectorProps> = ({
  character,
  pathId,
  rank,
  updateCharacter,
}) => {
  const grantRule = rank.modifiers?.grantExternalAbility;
  if (!grantRule) return null;

  const choiceKey = `${pathId}_${rank.rank}`;
  const resolved = resolveExternalGrants(character).find(g => g.sourceKey === choiceKey);
  if (!resolved) return null;

  const currentChoice = character.externalAbilityChoices?.[choiceKey];
  const setChoice = (value?: AbilityRef) => {
    const next = { ...character.externalAbilityChoices };
    if (value) next[choiceKey] = value;
    else delete next[choiceKey];
    updateCharacter({ externalAbilityChoices: next });
  };

  const grantedPath = resolved.ability ? getPathById(resolved.ability.pathId) : undefined;
  const grantedRank = grantedPath?.ranks.find(r => r.rank === resolved.ability?.rank);

  const selectClass =
    'bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 focus:border-indigo-500 outline-none';

  const renderFreeSelectors = () => {
    const eligibleProfiles = PROFILES.filter(p =>
      grantRule.allowedProfiles === 'any' ? true : grantRule.allowedProfiles.includes(p.id)
    );
    const eligiblePaths = Array.from(new Set(eligibleProfiles.flatMap(p => p.paths)))
      .map(pid => getPathById(pid))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    return (
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={currentChoice?.pathId || ''}
          onChange={e => {
            const newPathId = e.target.value;
            if (!newPathId) return setChoice(undefined);
            setChoice({
              pathId: newPathId,
              rank:
                currentChoice?.rank && currentChoice.rank <= grantRule.maxRank
                  ? currentChoice.rank
                  : 1,
            });
          }}
          className={selectClass}
        >
          <option value="">— Choisir une voie —</option>
          {eligiblePaths.map(ep => (
            <option key={ep.id} value={ep.id}>
              {ep.name} ({ep.owner})
            </option>
          ))}
        </select>

        {grantRule.maxRank > 1 && currentChoice?.pathId && (
          <select
            value={currentChoice.rank || 1}
            onChange={e =>
              setChoice({ pathId: currentChoice.pathId, rank: Number(e.target.value) || 1 })
            }
            className={selectClass}
          >
            {Array.from({ length: grantRule.maxRank }, (_, i) => i + 1).map(rk => (
              <option key={rk} value={rk}>
                Rang {rk}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  const renderReplacementSelector = () => {
    const defaultPath = defaultAbilityLabel();
    return (
      <div className="space-y-1.5">
        <div className="flex items-start space-x-1.5 text-[11px] text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Vous possédez déjà {defaultPath}. Choisissez une capacité de remplacement :
          </span>
        </div>
        <select
          value={resolved.ability ? refKey(resolved.ability) : ''}
          onChange={e => {
            const picked = resolved.options.find(o => refKey(o) === e.target.value);
            setChoice(picked);
          }}
          className={selectClass}
        >
          <option value="">— Choisir la capacité de remplacement —</option>
          {resolved.options.map(o => {
            const p = getPathById(o.pathId);
            const r = p?.ranks.find(x => x.rank === o.rank);
            return (
              <option key={refKey(o)} value={refKey(o)}>
                {r?.title} — R{o.rank} {p?.name} ({p?.owner})
              </option>
            );
          })}
        </select>
      </div>
    );
  };

  function defaultAbilityLabel(): string {
    const d = grantRule!.defaultAbility;
    if (!d) return 'cette capacité';
    const p = getPathById(d.pathId);
    const r = p?.ranks.find(x => x.rank === d.rank);
    return `« ${r?.title ?? d.pathId} »`;
  }

  return (
    <div className="mt-2.5 ml-7 p-3 bg-stone-900 border border-indigo-700/60 rounded-xl space-y-2 shadow">
      <div className="text-[11px] font-semibold text-indigo-300 flex items-center space-x-1.5">
        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
        <span>{grantRule.label || 'Capacité externe choisie :'}</span>
      </div>

      {resolved.mode === 'free' && renderFreeSelectors()}
      {resolved.mode === 'replacement' && renderReplacementSelector()}
      {resolved.mode === 'default' && (
        <div className="text-[11px] text-stone-400">
          Capacité obtenue automatiquement (non encore possédée).
        </div>
      )}

      {resolved.mode === 'replacement' && resolved.needsChoice && currentChoice && (
        <div className="text-[11px] text-red-300">
          Le choix précédent n'est plus valide, veuillez en sélectionner un nouveau.
        </div>
      )}

      {grantedPath && grantedRank && (
        <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/50 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-stone-950 text-[10px] font-mono font-bold">
              R{grantedRank.rank}
            </span>
            <span className="font-semibold text-indigo-200 text-xs">{grantedRank.title}</span>
            <span className="text-[10px] text-stone-400">({grantedPath.name})</span>
            <ActionBadges rank={grantedRank} />
          </div>
          <p className="text-xs text-stone-300 leading-relaxed">{grantedRank.description}</p>
        </div>
      )}
    </div>
  );
};
