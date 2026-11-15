import React from 'react';
import { getAllKnownLanguages } from '../../utils/languageUtils';
import { HUMAN_DIVERSITY_PATH_ID, resolveHumanDiversity } from '../../utils/humanDiversity';
import type {
  ActionRank,
  ArmorItem,
  CharacterSheet,
  CharacterWeaponInstance,
  ComputedCharacterStats,
  PathData,
  PeopleData,
  ProfileData,
  StatCode,
} from '../../types/cof2';
import { STAT_NAMES, getWeaponAttackInfo } from '../../engine/rulesEngine';
import { ActionBadges } from '../sheet/ActionBadges';
import { PrintableVitalsColumn } from './PrintableVitalsColumn';

const STAT_DISPLAY_ORDER: StatCode[] = ['AGI', 'CON', 'FOR', 'PER', 'CHA', 'INT', 'VOL'];

interface PrintablePage1Props {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  people?: PeopleData | null;
  profile?: ProfileData | null;
  secondaryProfile?: ProfileData | null;
  armor?: ArmorItem | null;
  shield?: ArmorItem | null;
  racialPath?: PathData | null;
  replacedRacial: { path: PathData; rank1: ActionRank } | null;
  filledWeapons: CharacterWeaponInstance[];
  emptyWeaponsCount: number;
}

export const PrintablePage1: React.FC<PrintablePage1Props> = ({
  character,
  stats,
  people,
  profile,
  secondaryProfile,
  armor,
  shield,
  racialPath,
  replacedRacial,
  filledWeapons,
  emptyWeaponsCount,
}) => {
  return (
      <div className="print-page flex flex-col justify-start font-sans select-text">
        <div className="w-full h-[288mm] max-h-[288mm] border-2 border-amber-800 p-1.5 flex flex-col justify-between bg-white overflow-hidden">
          <div className="w-full h-full border border-stone-700 p-1.5 flex flex-col justify-between overflow-hidden">
            {/* Header Block (Height: ~22mm) */}
            <div className="flex items-stretch justify-between gap-3 pb-1 border-b-2 border-amber-900 flex-shrink-0">
              {/* Logo / Title Area */}
              <div className="w-44 flex flex-col justify-center text-center">
                <span className="font-serif font-black text-[11px] tracking-[0.2em] text-amber-900 uppercase">
                  CHRONIQUES OUBLIÉES
                </span>
                <span className="font-serif font-extrabold text-base tracking-[0.28em] text-stone-900 uppercase -mt-0.5">
                  FANTASY
                </span>
                <div className="w-20 h-0.5 bg-amber-700 mx-auto mt-0.5" />
              </div>

              {/* Character Name Box */}
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-stone-800 bg-amber-50/40 px-3 py-0.5 rounded">
                <span className="font-serif font-black text-lg text-stone-900 tracking-wide uppercase truncate max-w-full">
                  {character.name || 'Héros sans nom'}
                </span>
                <span className="text-[8.5px] font-bold tracking-widest text-amber-900 uppercase -mt-0.5">
                  NOM DU PERSONNAGE
                </span>
              </div>

              {/* Player & Level Badges */}
              <div className="flex items-center gap-2">
                <div className="border border-stone-700 px-2.5 py-0.5 text-center bg-white rounded">
                  <div className="text-[7.5px] font-bold uppercase text-stone-600">Joueur</div>
                  <div className="text-xs font-semibold text-stone-900 truncate max-w-[90px]">
                    {character.playerName || '—'}
                  </div>
                </div>

                <div className="w-12 h-12 border-2 border-amber-800 rounded-full flex flex-col items-center justify-center bg-amber-50 text-stone-900 shadow-sm flex-shrink-0">
                  <span className="text-[7.5px] font-extrabold text-amber-900 uppercase leading-none">NIV.</span>
                  <span className="font-mono font-black text-xl leading-none text-stone-900">
                    {character.level}
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Columns Main Body (Height: ~250mm) */}
            <div className="flex-1 grid grid-cols-12 gap-2 text-stone-900 py-1 overflow-hidden">
              {/* ------------------------------------------------------------- */}
              {/* LEFT COLUMN: Stats, Identity, Attacks (3 cols)               */}
              {/* ------------------------------------------------------------- */}
              <div className="col-span-3 flex flex-col justify-between gap-1 overflow-hidden">
                {/* Characteristics Table */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider text-center py-0.5 uppercase">
                    CARACTÉRISTIQUES
                  </div>
                  <div className="grid grid-cols-12 bg-stone-100 text-[7px] font-bold text-stone-600 border-b border-stone-400 py-0.5 px-1 text-center">
                    <span className="col-span-3 text-left pl-0.5">CARAC</span>
                    <span className="col-span-3">TOTAL</span>
                    <span className="col-span-2">INIT.</span>
                    <span className="col-span-2">RAC.</span>
                    <span className="col-span-2">AUT.</span>
                  </div>
                  <div className="divide-y divide-stone-200">
                    {STAT_DISPLAY_ORDER.map(code => {
                      const mod = stats.finalStats[code];
                      const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                      const baseVal = stats.baseStats?.[code] ?? character.baseStats[code] ?? 0;
                      const racialMod = stats.racialBonusStats?.[code] ?? 0;
                      const otherMod =
                        stats.otherBonusStats?.[code] ??
                        (stats.pathBonusStats?.[code] ?? 0) + (character.manualStatBonuses?.[code] ?? 0);

                      return (
                        <div key={code} className="grid grid-cols-12 items-center py-0.5 px-1 text-center">
                          <span className="col-span-3 text-left pl-0.5 font-bold text-[8.5px] text-stone-800" title={STAT_NAMES[code]}>
                            {code}
                          </span>
                          <span className="col-span-3 font-mono font-black text-xs text-stone-950 bg-amber-50/70 border border-amber-800 rounded mx-0.5 leading-tight">
                            {modStr}
                          </span>
                          <span className="col-span-2 font-mono font-semibold text-[8px] text-stone-700 bg-stone-50 border border-stone-300 rounded mx-[1px] leading-tight">
                            {baseVal >= 0 ? `+${baseVal}` : `${baseVal}`}
                          </span>
                          <span className="col-span-2 font-mono font-semibold text-[8px] text-stone-700 bg-stone-50 border border-stone-300 rounded mx-[1px] leading-tight">
                            {racialMod > 0 ? `+${racialMod}` : `${racialMod}`}
                          </span>
                          <span className="col-span-2 font-mono font-semibold text-[8px] text-stone-700 bg-stone-50 border border-stone-300 rounded mx-[1px] leading-tight">
                            {otherMod > 0 ? `+${otherMod}` : `${otherMod}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Identity / Profile Box */}
                <div className="border border-stone-700 rounded p-1.5 bg-white text-[8px] space-y-1 flex-shrink-0">
                  <div>
                    <span className="font-bold text-amber-950 uppercase text-[7.5px] block">Famille</span>
                    <div className="font-semibold text-stone-900 truncate">
                      {character.profileFamily || profile?.family || '—'}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-amber-950 uppercase text-[7.5px] block">Profil</span>
                    <div className="font-bold text-stone-900 truncate">
                      {profile?.name || '—'}
                      {secondaryProfile && ` / ${secondaryProfile.name}`}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-amber-950 uppercase text-[7.5px] block">Idéal Héroïque</span>
                    <div className="text-stone-800 italic truncate" title={character.ideal || '—'}>
                      {character.ideal || '—'}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-amber-950 uppercase text-[7.5px] block">Travers</span>
                    <div className="text-stone-800 italic truncate" title={character.flaw || '—'}>
                      {character.flaw || '—'}
                    </div>
                  </div>
                </div>

                {/* Attacks Box */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider text-center py-0.5 uppercase">
                    ATTAQUES
                  </div>
                  <div className="grid grid-cols-12 bg-stone-100 text-[7.5px] font-bold text-stone-600 border-b border-stone-400 py-0.5 px-1 text-center">
                    <span className="col-span-4 text-left pl-1">TYPE</span>
                    <span className="col-span-4">TOTAL</span>
                    <span className="col-span-4">BASE</span>
                  </div>
                  <div className="divide-y divide-stone-200 text-[8.5px]">
                    {/* Contact */}
                    <div className="grid grid-cols-12 items-center py-0.5 px-1 text-center">
                      <span className="col-span-4 text-left pl-1 font-bold text-stone-800">
                        Contact
                      </span>
                      <span className="col-span-4 font-mono font-black text-[11px] text-stone-900 bg-amber-50 border border-amber-300 rounded mx-0.5">
                        {stats.attacks.contact >= 0 ? `+${stats.attacks.contact}` : stats.attacks.contact}
                      </span>
                      <span className="col-span-4 font-mono text-[7.5px] text-stone-600">
                        +{stats.bab} {stats.contactAttackStat || 'FOR'}
                      </span>
                    </div>

                    {/* Distance */}
                    <div className="grid grid-cols-12 items-center py-0.5 px-1 text-center">
                      <span className="col-span-4 text-left pl-1 font-bold text-stone-800">
                        Distance
                      </span>
                      <span className="col-span-4 font-mono font-black text-[11px] text-stone-900 bg-amber-50 border border-amber-300 rounded mx-0.5">
                        {stats.attacks.distance >= 0 ? `+${stats.attacks.distance}` : stats.attacks.distance}
                      </span>
                      <span className="col-span-4 font-mono text-[7.5px] text-stone-600">
                        +{stats.bab} {stats.distanceAttackStat || 'AGI'}
                      </span>
                    </div>

                    {/* Magique */}
                    <div className="grid grid-cols-12 items-center py-0.5 px-1 text-center">
                      <span className="col-span-4 text-left pl-1 font-bold text-stone-800">
                        Magique
                      </span>
                      <span className="col-span-4 font-mono font-black text-[11px] text-stone-900 bg-amber-50 border border-amber-300 rounded mx-0.5">
                        {stats.attacks.magique >= 0 ? `+${stats.attacks.magique}` : stats.attacks.magique}
                      </span>
                      <span className="col-span-4 font-mono text-[7.5px] text-stone-600">
                        +{stats.bab} VOL
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CENTER COLUMN: Racial Path, Init/Def, Weapons, Gear (6 cols) */}
              {/* ------------------------------------------------------------- */}
              <div className="col-span-6 flex flex-col justify-between gap-1 overflow-hidden">
                {/* Voie du Peuple */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider px-2 py-0.5 uppercase flex items-center justify-between">
                    <span>
                      VOIE DU PEUPLE : {racialPath?.name.toUpperCase() || people?.name.toUpperCase() || '—'}
                    </span>
                    <span className="text-[7.5px] font-sans font-normal opacity-90">
                      Peuple : {people?.name || '—'}
                    </span>
                  </div>

                  <div className="p-1 space-y-0.5 text-[7.5px] leading-[1.2]">
                    {racialPath?.ranks.map(r => {
                      const isAcquired = character.acquiredAbilities.some(
                        a => a.pathId === racialPath.id && a.rank === r.rank
                      );
                      return (
                        <div key={r.rank} className="flex items-start gap-1">
                          <span className={`w-3 h-3 flex-shrink-0 flex items-center justify-center border border-stone-800 rounded-2xs text-[7px] font-bold ${
                            isAcquired ? 'bg-amber-700 text-white' : 'bg-white text-transparent'
                          }`}>
                            {isAcquired ? '✓' : ''}
                          </span>
                          <div className="flex-1">
                            <strong className="text-stone-900">
                              {r.rank}. {r.title}
                            </strong>{' '}
                            <ActionBadges rank={r} variant="print" />
                            <span className="text-stone-700"> : {r.description}</span>
                            {racialPath.id === HUMAN_DIVERSITY_PATH_ID && r.rank === 1 && (() => {
                              const div = resolveHumanDiversity(character.humanDiversity);
                              if (!div) return null;
                              return (
                                <span className="text-amber-900 font-semibold">
                                  {' '}[{div.originLabel} : {div.effectiveDomains.filter(Boolean).join(', ')} (+3)]
                                </span>
                              );
                            })()}
                            {r.companions && r.companions.length > 0 && (
                              <div className="mt-0.5 text-[6.5px] text-amber-950 font-mono bg-amber-50/70 p-0.5 rounded border border-amber-200">
                                {r.companions.map((comp, cIdx) => (
                                  <div key={cIdx}>
                                    <strong>🐾 {comp.name}</strong> {comp.category ? `(${comp.category}) ` : ''}
                                    {comp.hp ? `• PV: ${comp.hp} ` : ''}
                                    {comp.defense ? `• DEF: ${comp.defense} ` : ''}
                                    {comp.initiative ? `• Init: ${comp.initiative} ` : ''}
                                    {comp.attacks && comp.attacks.length > 0 && `• Atk: ${comp.attacks.map(a => `${a.name} [DM ${a.damage}]`).join(', ')}`}
                                  </div>
                                ))}
                              </div>
                            )}
                            {r.rank === 1 && replacedRacial && (
                              <div className="mt-0.5 p-0.5 bg-emerald-50 border border-emerald-300 rounded text-[7px] text-stone-800">
                                <strong className="text-emerald-900">
                                  Capacité ({replacedRacial.path.name} • {replacedRacial.rank1.title}) :{' '}
                                </strong>
                                {replacedRacial.rank1.description}
                                {replacedRacial.path.id === HUMAN_DIVERSITY_PATH_ID && (() => {
                                  const div = resolveHumanDiversity(character.humanDiversity);
                                  if (!div) return null;
                                  return (
                                    <span className="text-emerald-900 font-semibold">
                                      {' '}[{div.originLabel} : {div.effectiveDomains.filter(Boolean).join(', ')} (+3)]
                                    </span>
                                  );
                                })()}
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
                  {/* Init */}
                  <div className="col-span-4 border border-stone-700 rounded p-1 bg-white text-center">
                    <div className="text-[7.5px] font-bold uppercase text-stone-600">INITIATIVE</div>
                    <div className="font-mono font-black text-sm text-stone-900 leading-tight">
                      {stats.initiative}
                    </div>
                    <div className="text-[7px] text-stone-500">
                      10 + PER ({stats.finalStats.PER >= 0 ? `+${stats.finalStats.PER}` : stats.finalStats.PER})
                    </div>
                  </div>

                  {/* Defense */}
                  <div className="col-span-8 border border-stone-700 rounded p-1 bg-white">
                    <div className="grid grid-cols-5 text-center items-center">
                      <div>
                        <div className="text-[7.5px] font-bold uppercase text-stone-600">DÉFENSE</div>
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
                        <div className="text-[7px] font-semibold text-stone-500 uppercase">ARMURE</div>
                        <div className="font-mono text-xs font-bold text-stone-800 truncate" title={armor ? `${armor.name} (+${armor.def})` : '0'}>
                          {armor ? `+${armor.def}` : '0'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[7px] font-semibold text-stone-500 uppercase">BOUCLIER</div>
                        <div className="font-mono text-xs font-bold text-stone-800 truncate" title={shield ? `${shield.name} (+${shield.def})` : '0'}>
                          {shield ? `+${shield.def}` : '0'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[7px] font-semibold text-stone-500 uppercase">VOIES/DIV.</div>
                        <div className="font-mono text-xs font-bold text-stone-800">
                          {stats.pathBonusDefense >= 0 ? `+${stats.pathBonusDefense}` : stats.pathBonusDefense}
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
                      {filledWeapons.map(w => {
                        const atkInfo = getWeaponAttackInfo(w, stats);
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
                              1d20 {atkInfo.atkBonus >= 0 ? `+ ${atkInfo.atkBonus}` : `${atkInfo.atkBonus}`}
                            </td>
                            <td className="py-0.5 px-1 text-center font-mono">
                              <strong>{w.damage} {atkInfo.dmBonus}</strong>
                              {w.range && <span className="ml-1 text-[7.5px] text-stone-600 font-sans">({w.range})</span>}
                            </td>
                          </tr>
                        );
                      })}
                      {Array.from({ length: emptyWeaponsCount }).map((_, i) => (
                        <tr key={`empty-${i}`} className="text-stone-400 h-5">
                          <td className="py-0.5 px-1 border-b border-stone-200"></td>
                          <td className="py-0.5 px-1 text-center font-mono text-stone-400 border-b border-stone-200">1d20 +</td>
                          <td className="py-0.5 px-1 border-b border-stone-200"></td>
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
                    <span className="font-bold">Armure :</span> {armor ? `${armor.name} (DEF +${armor.def})` : 'Aucune'}
                    {shield ? `, ${shield.name} (DEF +${shield.def})` : ''}.{' '}
                    <span className="font-bold">Sac :</span>{' '}
                    {character.inventory && character.inventory.length > 0
                      ? character.inventory.map(item => `${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`).join(', ')
                      : 'Équipement de départ standard.'}
                  </div>
                </div>

                {/* Description & Mensurations Block */}
                <div className="border border-stone-700 rounded p-1 bg-stone-50 text-[7.5px] text-stone-800 leading-tight flex-shrink-0">
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    <span><strong>Âge :</strong> {character.age || people?.startingAge || '—'}</span>
                    <span><strong>Taille :</strong> {character.height || people?.heightRange || '—'}</span>
                    <span><strong>Poids :</strong> {character.weight || people?.weightRange || '—'}</span>
                    <span><strong>Sexe :</strong> {character.sex || '—'}</span>
                    <span>
                      <strong>Langues :</strong>{' '}
                      {getAllKnownLanguages(character, stats.languagesInfo).join(', ') || 'Commun'}
                      {stats.languagesInfo.literacy === 'illiterate' && ' (illettré)'}
                    </span>
                    {(character.secondaryTalents?.length || 0) > 0 && (
                      <span>
                        <strong>Talents sec. (+3) :</strong> {character.secondaryTalents?.join(', ')}
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

              {/* ------------------------------------------------------------- */}
              <PrintableVitalsColumn character={character} stats={stats} />
            </div>

            {/* Official Sheet Footer Line (Height: ~5mm) */}
            <div className="border-t border-stone-400 pt-0.5 flex items-center justify-between text-[7px] text-stone-500 flex-shrink-0">
              <span>Chroniques Oubliées Fantasy 2 • Fiche de Héros Officielle</span>
              <span>Photocopie autorisée pour usage personnel uniquement - © Black Book Éditions</span>
            </div>
          </div>
        </div>
      </div>
  );
};
