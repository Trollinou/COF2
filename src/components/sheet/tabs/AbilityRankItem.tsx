import React from 'react';
import { Sparkles } from 'lucide-react';
import type {
  ActionRank,
  CharacterSheet,
  ComputedCharacterStats,
  PathData,
  RankModifiers,
} from '../../../types/cof2';
import { ExternalAbilitySelector } from '../../shared/ExternalAbilitySelector';
import { HumanDiversitySelector } from '../../shared/HumanDiversitySelector';
import { RankChoiceSelector } from '../../shared/RankChoiceSelector';
import { ActionBadges } from '../ActionBadges';
import { CompanionCard } from '../CompanionCard';

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
        const condText = b.condition === 'noArmor' ? ' (sans armure)' : '';
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

interface AbilityRankItemProps {
  pathId: string;
  rank: ActionRank;
  isAcquired: boolean;
  armorMalus: number;
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  replacedRacial: { path: PathData; rank1: ActionRank } | null;
}

export const AbilityRankItem: React.FC<AbilityRankItemProps> = ({
  pathId,
  rank,
  isAcquired,
  armorMalus,
  character,
  stats,
  replacedRacial,
}) => {
  return (
    <div
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

          {rank.isSpell && armorMalus > 0 && (
            <span
              className="text-[10px] bg-red-950 text-red-300 border border-red-800/80 px-2 py-0.5 rounded font-mono font-bold"
              title="Surcoût en PM pour lancer ce sort avec l'armure actuellement équipée (Règles COF2 chap. 9)"
            >
              +{armorMalus} PM (Armure)
            </span>
          )}
        </div>

        {isAcquired ? (
          <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-600/20 text-amber-300 border border-amber-600/40">
            Acquise ✓
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-stone-900 text-stone-500 border border-stone-800">
            Non acquise
          </span>
        )}
      </div>

      <p className="text-xs text-stone-400 leading-relaxed pl-7">
        {rank.description}
      </p>

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

      {renderModifierBadges(rank.modifiers)}

      {isAcquired && rank.modifiers?.grantExternalAbility && (
        <ExternalAbilitySelector
          character={character}
          pathId={pathId}
          rank={rank}
          externalGrants={stats.externalGrants}
          readOnly
        />
      )}

      {isAcquired && (
        <>
          <RankChoiceSelector
            character={character}
            pathId={pathId}
            rank={rank}
            readOnly
          />
          <HumanDiversitySelector
            character={character}
            pathId={pathId}
            rankNumber={rank.rank}
            resolvedDiversity={stats.resolvedHumanDiversity ?? null}
            readOnly
          />
        </>
      )}

      {rank.rank === 1 && replacedRacial && (
        <div className="mt-3 ml-7 p-3 rounded-xl bg-emerald-950/30 border border-emerald-700/50 shadow space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-emerald-900/60">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Rappel : Capacité de peuple conservée ({replacedRacial.path.name}{' '}
                • Rang 1)
              </span>
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

          {replacedRacial.rank1.companions &&
            replacedRacial.rank1.companions.length > 0 && (
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

          {renderModifierBadges(replacedRacial.rank1.modifiers)}

          <RankChoiceSelector
            character={character}
            pathId={replacedRacial.path.id}
            rank={replacedRacial.rank1}
            readOnly
            variant="emerald"
          />
          <HumanDiversitySelector
            character={character}
            pathId={replacedRacial.path.id}
            rankNumber={replacedRacial.rank1.rank}
            resolvedDiversity={stats.resolvedHumanDiversity ?? null}
            readOnly
            variant="emerald"
          />
        </div>
      )}
    </div>
  );
};
