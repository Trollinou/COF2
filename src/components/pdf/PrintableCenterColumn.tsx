import React from 'react';
import type {
  ActionRank,
  ArmorItem,
  CharacterSheet,
  CharacterWeaponInstance,
  ComputedCharacterStats,
  PathData,
  PeopleData,
  StatCode,
} from '../../types/cof2';
import { HUMAN_DIVERSITY_PATH_ID } from '../../utils/uiConstants';
import { ActionBadges } from '../sheet/ActionBadges';

interface PrintableCenterColumnProps {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  people?: PeopleData | null;
  armor?: ArmorItem | null;
  shield?: ArmorItem | null;
  racialPath?: PathData | null;
  replacedRacial: { path: PathData; rank1: ActionRank } | null;
  filledWeapons: CharacterWeaponInstance[];
  emptyWeaponsCount: number;
}

export const PrintableCenterColumn: React.FC<PrintableCenterColumnProps> = ({
  character,
  stats,
  people,
  armor,
  shield,
  racialPath,
  replacedRacial,
  filledWeapons,
  emptyWeaponsCount,
}) => {
  const resolvedDiversity = stats.resolvedHumanDiversity ?? null;
  const allKnownLanguages = Array.from(
    new Set([
      ...stats.languagesInfo.automaticLanguages,
      ...(character.languages || []),
    ]),
  );

  return (
    <div className="col-span-6 flex flex-col justify-between gap-1 overflow-hidden">
      {/* Voie du Peuple */}
      <div className="border border-stone-700 rounded overflow-hidden bg-white flex-shrink-0">
        <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider px-2 py-0.5 uppercase flex items-center justify-between">
          <span>
            VOIE DU PEUPLE :{' '}
            {racialPath?.name.toUpperCase() ||
              people?.name.toUpperCase() ||
              '—'}
          </span>
          <span className="text-[7.5px] font-sans font-normal opacity-90">
            Peuple : {people?.name || '—'}
          </span>
        </div>

        <div className="p-1 space-y-0.5 text-[7.5px] leading-[1.2]">
          {racialPath?.ranks.map((r) => {
            const isAcquired = character.acquiredAbilities.some(
              (a) => a.pathId === racialPath.id && a.rank === r.rank,
            );
            return (
              <div key={r.rank} className="flex items-start gap-1">
                <span
                  className={`w-3 h-3 flex-shrink-0 flex items-center justify-center border border-stone-800 rounded-2xs text-[7px] font-bold ${
                    isAcquired
                      ? 'bg-amber-700 text-white'
                      : 'bg-white text-transparent'
                  }`}
                >
                  {isAcquired ? '✓' : ''}
                </span>
                <div className="flex-1">
                  <strong className="text-stone-900">
                    {r.rank}. {r.title}
                  </strong>{' '}
                  <ActionBadges rank={r} variant="print" />
                  <span className="text-stone-700"> : {r.description}</span>
                  {racialPath.id === HUMAN_DIVERSITY_PATH_ID &&
                    r.rank === 1 &&
                    resolvedDiversity && (
                      <span className="text-amber-900 font-semibold">
                        {' '}
                        [{resolvedDiversity.originLabel} :{' '}
                        {resolvedDiversity.effectiveDomains
                          .filter(Boolean)
                          .join(', ')}{' '}
                        (+3)]
                      </span>
                    )}
                  {r.companions && r.companions.length > 0 && (
                    <div className="mt-0.5 text-[6.5px] text-amber-950 font-mono bg-amber-50/70 p-0.5 rounded border border-amber-200">
                      {r.companions.map((comp, cIdx) => (
                        <div key={cIdx}>
                          <strong>🐾 {comp.name}</strong>{' '}
                          {comp.category ? `(${comp.category}) ` : ''}
                          {comp.hp ? `• PV: ${comp.hp} ` : ''}
                          {comp.defense ? `• DEF: ${comp.defense} ` : ''}
                          {comp.initiative ? `• Init: ${comp.initiative} ` : ''}
                          {comp.attacks &&
                            comp.attacks.length > 0 &&
                            `• Atk: ${comp.attacks
                              .map((a) => `${a.name} [DM ${a.damage}]`)
                              .join(', ')}`}
                        </div>
                      ))}
                    </div>
                  )}
                  {r.rank === 1 && replacedRacial && (
                    <div className="mt-0.5 p-0.5 bg-emerald-50 border border-emerald-300 rounded text-[7px] text-stone-800">
                      <strong className="text-emerald-900">
                        Capacité ({replacedRacial.path.name} •{' '}
                        {replacedRacial.rank1.title}) :{' '}
                      </strong>
                      {replacedRacial.rank1.description}
                      {replacedRacial.path.id === HUMAN_DIVERSITY_PATH_ID &&
                        resolvedDiversity && (
                          <span className="text-emerald-900 font-semibold">
                            {' '}
                            [{resolvedDiversity.originLabel} :{' '}
                            {resolvedDiversity.effectiveDomains
                              .filter(Boolean)
                              .join(', ')}{' '}
                            (+3)]
                          </span>
                        )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Initiative & Defense Breakdown */}
      <div className="grid grid-cols-12 gap-1 flex-shrink-0">
        <div className="col-span-4 border border-stone-700 rounded p-1 bg-white text-center">
          <div className="text-[7.5px] font-bold uppercase text-stone-600">
            INITIATIVE
          </div>
          <div className="font-mono font-black text-sm text-stone-900 leading-tight">
            {stats.initiative}
          </div>
          <div className="text-[7px] text-stone-500">
            10 + PER (
            {stats.finalStats.PER >= 0
              ? `+${stats.finalStats.PER}`
              : stats.finalStats.PER}
            )
          </div>
        </div>

        <div className="col-span-8 border border-stone-700 rounded p-1 bg-white">
          <div className="grid grid-cols-5 text-center items-center">
            <div>
              <div className="text-[7.5px] font-bold uppercase text-stone-600">
                DÉFENSE
              </div>
              <div className="font-mono font-black text-sm text-stone-900 leading-tight">
                {stats.defense}
              </div>
            </div>
            <div>
              <div className="text-[7px] font-semibold text-stone-500 uppercase">
                {stats.defenseStat || 'AGI'}
              </div>
              <div className="font-mono text-xs font-bold text-stone-800">
                {stats.effectiveAgi >= 0
                  ? `+${stats.effectiveAgi}`
                  : stats.effectiveAgi}
              </div>
            </div>
            <div>
              <div className="text-[7px] font-semibold text-stone-500 uppercase">
                ARMURE
              </div>
              <div
                className="font-mono text-xs font-bold text-stone-800 truncate"
                title={armor ? `${armor.name} (+${armor.def})` : '0'}
              >
                {armor ? `+${armor.def}` : '0'}
              </div>
            </div>
            <div>
              <div className="text-[7px] font-semibold text-stone-500 uppercase">
                BOUCLIER
              </div>
              <div
                className="font-mono text-xs font-bold text-stone-800 truncate"
                title={shield ? `${shield.name} (+${shield.def})` : '0'}
              >
                {shield ? `+${shield.def}` : '0'}
              </div>
            </div>
            <div>
              <div className="text-[7px] font-semibold text-stone-500 uppercase">
                VOIES/DIV.
              </div>
              <div className="font-mono text-xs font-bold text-stone-800">
                {stats.pathBonusDefense >= 0
                  ? `+${stats.pathBonusDefense}`
                  : stats.pathBonusDefense}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weapons Table */}
      <div className="border border-stone-700 rounded overflow-hidden bg-white flex-shrink-0">
        <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider px-2 py-0.5 uppercase">
          ARMES & ATTAQUES
        </div>
        <table className="w-full text-[8px] border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-400 text-center font-bold">
              <th className="py-0.5 px-1 text-left w-5/12">Arme</th>
              <th className="py-0.5 px-1 w-3/12">Attaque</th>
              <th className="py-0.5 px-1 w-4/12">Dommages & Portée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {filledWeapons.map((w) => {
              const atkInfo = stats.computedWeapons?.find(
                (cw) => cw.weaponId === w.id,
              ) ?? {
                atkBonus:
                  w.category === 'contact'
                    ? stats.attacks.contact
                    : stats.attacks.distance,
                statUsed: (w.category === 'contact'
                  ? 'FOR'
                  : 'AGI') as StatCode,
                isSubstituted: false,
                dmBonus: '',
              };
              return (
                <tr key={w.id} className="text-stone-900">
                  <td className="py-0.5 px-1 font-semibold text-left">
                    {w.name}
                    {atkInfo.isSubstituted && (
                      <span className="ml-1 text-[7px] bg-stone-200 text-stone-800 px-1 py-0.2 rounded font-mono">
                        {atkInfo.statUsed}
                      </span>
                    )}
                  </td>
                  <td className="py-0.5 px-1 text-center font-mono font-bold">
                    1d20{' '}
                    {atkInfo.atkBonus >= 0
                      ? `+ ${atkInfo.atkBonus}`
                      : `${atkInfo.atkBonus}`}
                  </td>
                  <td className="py-0.5 px-1 text-center font-mono">
                    <strong>
                      {w.damage} {atkInfo.dmBonus}
                    </strong>
                    {w.range && (
                      <span className="ml-1 text-[7.5px] text-stone-600 font-sans">
                        ({w.range})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {Array.from({ length: emptyWeaponsCount }).map((_, i) => (
              <tr key={`empty-${i}`} className="text-stone-400 h-5">
                <td className="py-0.5 px-1 border-b border-stone-200" />
                <td className="py-0.5 px-1 text-center font-mono text-stone-400 border-b border-stone-200">
                  1d20 +
                </td>
                <td className="py-0.5 px-1 border-b border-stone-200" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Equipment & Inventory Box */}
      <div className="border border-stone-700 rounded overflow-hidden bg-white flex-shrink-0">
        <div className="bg-amber-800 text-white font-serif font-bold text-[8.5px] tracking-wider px-2 py-0.5 uppercase">
          ÉQUIPEMENT & INVENTAIRE
        </div>
        <div className="p-1 text-[8px] text-stone-800 leading-snug">
          <span className="font-bold">Armure :</span>{' '}
          {armor ? `${armor.name} (DEF +${armor.def})` : 'Aucune'}
          {shield ? `, ${shield.name} (DEF +${shield.def})` : ''}.{' '}
          <span className="font-bold">Sac :</span>{' '}
          {character.inventory && character.inventory.length > 0
            ? character.inventory
                .map(
                  (item) =>
                    `${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`,
                )
                .join(', ')
            : 'Équipement de départ standard.'}
        </div>
      </div>

      {/* Description & Mensurations Block */}
      <div className="border border-stone-700 rounded p-1 bg-stone-50 text-[7.5px] text-stone-800 leading-tight flex-shrink-0">
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          <span>
            <strong>Âge :</strong>{' '}
            {character.age || people?.startingAge || '—'}
          </span>
          <span>
            <strong>Taille :</strong>{' '}
            {character.height || people?.heightRange || '—'}
          </span>
          <span>
            <strong>Poids :</strong>{' '}
            {character.weight || people?.weightRange || '—'}
          </span>
          <span>
            <strong>Sexe :</strong> {character.sex || '—'}
          </span>
          <span>
            <strong>Langues :</strong>{' '}
            {allKnownLanguages.join(', ') || 'Commun'}
            {stats.languagesInfo.literacy === 'illiterate' && ' (illettré)'}
          </span>
          {(character.secondaryTalents?.length || 0) > 0 && (
            <span>
              <strong>Talents sec. (+3) :</strong>{' '}
              {character.secondaryTalents?.join(', ')}
            </span>
          )}
        </div>
        {(character.physicalTraits || people?.physicalTraits) && (
          <div className="mt-0.5 italic text-stone-600 truncate">
            {character.physicalTraits || people?.physicalTraits}
          </div>
        )}
      </div>
    </div>
  );
};
