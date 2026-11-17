import React, { useEffect, useState } from 'react';
import {
  commands,
  type ResolvedExternalGrant,
  type ResolvedHumanDiversity,
} from '../../../bindings';
import {
  CharacterSheet,
  ComputedCharacterStats,
  PeopleData,
  ProfileData,
  StatCode,
} from '../../../types/cof2';
import {
  ALL_STAT_CODES,
  STAT_NAMES,
  getPathById,
  getProfileById,
  getArmorById,
  getDeityByDomainPathId,
  isDomainPath,
} from '../../../engine/compendium';
import { CheckCircle2, Shield, Swords, Sparkles, User, Coins, BookOpen } from 'lucide-react';
import { HUMAN_DIVERSITY_PATH_ID } from '../../../utils/uiConstants';

interface Step7SummaryProps {
  character: CharacterSheet;
  computed: ComputedCharacterStats;
  selectedPeople?: PeopleData;
  selectedProfile?: ProfileData;
  handleFinishWizard: () => void;
}

function formatSigned(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`;
}

export const Step7Summary: React.FC<Step7SummaryProps> = ({
  character,
  computed,
  selectedPeople,
  selectedProfile,
  handleFinishWizard,
}) => {
  const secondaryProfile =
    character.isHybrid && character.secondaryProfileId
      ? getProfileById(character.secondaryProfileId)
      : undefined;

  const armor = character.equippedArmorId ? getArmorById(character.equippedArmorId) : undefined;
  const shield = character.equippedShieldId ? getArmorById(character.equippedShieldId) : undefined;

  // Detail formulas for the 4 main panels
  const hpBaseLabel =
    secondaryProfile && selectedProfile
      ? `${selectedProfile.hpPerLevel} (${selectedProfile.name}) + ${secondaryProfile.hpPerLevel} (${secondaryProfile.name})`
      : selectedProfile
        ? `2 × ${selectedProfile.hpPerLevel} (${selectedProfile.name})`
        : 'Base';
  const hpParts = [hpBaseLabel, `${formatSigned(computed.finalStats.CON)} (CON)`];
  if (computed.pathBonusHp !== 0) {
    hpParts.push(`${formatSigned(computed.pathBonusHp)} (Voies)`);
  }
  if ((character.maxHpBonus || 0) !== 0) {
    hpParts.push(`${formatSigned(character.maxHpBonus || 0)} (Bonus)`);
  }

  const drParts = ['2 (Base)', `${formatSigned(computed.finalStats.CON)} (CON)`];
  const drFamilyBonus =
    computed.effectiveFamily === 'Mystiques' ? 1 : selectedProfile?.bonusDR || 0;
  if (drFamilyBonus > 0) {
    drParts.push(`+${drFamilyBonus} (${computed.effectiveFamily})`);
  }
  const drPathDiff = computed.maxDr - Math.max(0, 2 + computed.finalStats.CON + drFamilyBonus);
  if (drPathDiff !== 0) {
    drParts.push(`${formatSigned(drPathDiff)} (Voies)`);
  }

  const pcParts = ['2 (Base)', `${formatSigned(computed.finalStats.CHA)} (CHA)`];
  const pcFamilyBonus =
    computed.effectiveFamily === 'Aventuriers' ? 1 : selectedProfile?.bonusPC || 0;
  if (pcFamilyBonus > 0) {
    pcParts.push(`+${pcFamilyBonus} (${computed.effectiveFamily})`);
  }
  const pcPathDiff = computed.maxPc - Math.max(0, 2 + computed.finalStats.CHA + pcFamilyBonus);
  if (pcPathDiff !== 0) {
    pcParts.push(`${formatSigned(pcPathDiff)} (Voies)`);
  }

  const defParts = [
    '10 (Base)',
    `${formatSigned(computed.effectiveAgi)} (${computed.defenseStat} eff.)`,
  ];
  if (computed.armorDefense !== 0) {
    defParts.push(`+${computed.armorDefense} (${armor?.name || 'Armure'})`);
  }
  if (computed.shieldDefense !== 0) {
    defParts.push(`+${computed.shieldDefense} (${shield?.name || 'Bouclier'})`);
  }
  if (computed.pathBonusDefense !== 0) {
    defParts.push(`${formatSigned(computed.pathBonusDefense)} (Voies)`);
  }

  // Racial modifiers split
  const racialEntries = ALL_STAT_CODES.map(code => ({
    code,
    val: computed.racialBonusStats[code] || 0,
  })).filter(e => e.val !== 0);
  const racialBonuses = racialEntries.filter(e => e.val > 0);
  const racialMaluses = racialEntries.filter(e => e.val < 0);

  // Cultural heritage if selectable racial path
  const heritagePath = selectedPeople?.selectableRacialPaths
    ? character.selectedPathIds
        .filter(id => selectedPeople.selectableRacialPaths?.includes(id))
        .map(id => getPathById(id)?.name || id)[0]
    : undefined;

  // Group acquired abilities by path (keeping order of selectedPathIds + any preserved racial)
  const pathIdsToDisplay = Array.from(
    new Set([
      ...character.selectedPathIds,
      ...character.acquiredAbilities.map(a => a.pathId),
    ]),
  );
  const [externalGrants, setExternalGrants] = useState<ResolvedExternalGrant[]>([]);
  const [resolvedDiversity, setResolvedDiversity] = useState<ResolvedHumanDiversity | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      commands.resolveExternalGrantsCharacter(character),
      commands.resolveHumanDiversityChoice(character.humanDiversity ?? null),
    ]).then(([grants, div]) => {
      if (!cancelled) {
        setExternalGrants(grants);
        setResolvedDiversity(div);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [character]);

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <h3 className="font-serif font-bold text-lg text-amber-200">
          Étape 7 : Bilan du Héros (Niveau 1)
        </h3>
        <p className="text-xs text-stone-400">
          Récapitulatif complet de votre personnage avant son ouverture sur la fiche interactive. Utilisez « Précédent » pour modifier un choix.
        </p>
      </div>

      {/* 4 Main Computed Panels with Calculation Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-950 p-3.5 rounded-xl border border-red-900/40 space-y-1.5">
          <div className="text-xs text-red-400 font-semibold text-center">Points de Vigueur</div>
          <div className="text-2xl font-bold font-mono text-red-200 text-center">{computed.maxHp} PV</div>
          <div className="text-[11px] text-stone-400 text-center font-mono leading-snug pt-1 border-t border-stone-800/80">
            {hpParts.join(' ')}
          </div>
        </div>

        <div className="bg-stone-950 p-3.5 rounded-xl border border-blue-900/40 space-y-1.5">
          <div className="text-xs text-blue-400 font-semibold text-center">Dés de Récupération</div>
          <div className="text-2xl font-bold font-mono text-blue-200 text-center">
            {computed.maxDr} {computed.drDice}
          </div>
          <div className="text-[11px] text-stone-400 text-center font-mono leading-snug pt-1 border-t border-stone-800/80">
            {drParts.join(' ')}
          </div>
        </div>

        <div className="bg-stone-950 p-3.5 rounded-xl border border-amber-900/40 space-y-1.5">
          <div className="text-xs text-amber-400 font-semibold text-center">Points de Chance</div>
          <div className="text-2xl font-bold font-mono text-amber-200 text-center">{computed.maxPc} PC</div>
          <div className="text-[11px] text-stone-400 text-center font-mono leading-snug pt-1 border-t border-stone-800/80">
            {pcParts.join(' ')}
          </div>
        </div>

        <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-700 space-y-1.5">
          <div className="text-xs text-amber-300 font-semibold text-center">Défense</div>
          <div className="text-2xl font-bold font-mono text-stone-100 text-center">{computed.defense}</div>
          <div className="text-[11px] text-stone-400 text-center font-mono leading-snug pt-1 border-t border-stone-800/80">
            {defParts.join(' ')}
          </div>
        </div>
      </div>

      {/* People & Profile(s) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2.5">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Peuple & Modificateurs raciaux</span>
          </div>
          <div className="text-sm font-serif font-bold text-stone-100">
            {selectedPeople?.name || '—'}
            {heritagePath && (
              <span className="ml-2 text-xs font-sans font-normal text-amber-300">
                ({heritagePath})
              </span>
            )}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase text-stone-400 font-semibold w-12">Bonus :</span>
              {racialBonuses.length > 0 ? (
                racialBonuses.map(({ code, val }) => (
                  <span
                    key={`sum_rb_${code}`}
                    className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/70 font-mono text-[11px]"
                  >
                    +{val} {STAT_NAMES[code]} ({code})
                  </span>
                ))
              ) : (
                <span className="text-stone-500 italic">Aucun</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase text-stone-400 font-semibold w-12">Malus :</span>
              {racialMaluses.length > 0 ? (
                racialMaluses.map(({ code, val }) => (
                  <span
                    key={`sum_rm_${code}`}
                    className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/70 font-mono text-[11px]"
                  >
                    {val} {STAT_NAMES[code]} ({code})
                  </span>
                ))
              ) : (
                <span className="text-stone-500 italic">Aucun</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2.5">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{secondaryProfile ? 'Profils (Hybride)' : 'Profil'}</span>
          </div>
          {secondaryProfile ? (
            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-stone-400">Principal : </span>
                <strong className="text-stone-100 font-serif text-sm">{selectedProfile?.name}</strong>
                <span className="text-stone-400 ml-1.5">({computed.effectiveFamily})</span>
              </div>
              <div>
                <span className="text-stone-400">Secondaire : </span>
                <strong className="text-purple-200 font-serif text-sm">{secondaryProfile.name}</strong>
                <span className="text-stone-400 ml-1.5">({secondaryProfile.family})</span>
              </div>
            </div>
          ) : (
            <div className="text-sm font-serif font-bold text-stone-100">
              {selectedProfile?.name || '—'}
              {selectedProfile && (
                <span className="ml-2 text-xs font-sans font-normal text-amber-300">
                  ({computed.effectiveFamily})
                </span>
              )}
            </div>
          )}
          <div className="text-xs text-stone-400 font-mono">
            Initiative : <strong className="text-stone-200">{computed.initiative}</strong>
            {computed.maxPm > 0 && (
              <>
                {' • '}
                {computed.energyType} : <strong className="text-cyan-300">{computed.maxPm}</strong>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Characteristics Detail */}
      <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-3">
        <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
          Caractéristiques & Détails
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {ALL_STAT_CODES.map((code: StatCode) => {
            const total = computed.finalStats[code];
            const base = computed.baseStats[code] ?? 0;
            const racial = computed.racialBonusStats[code] ?? 0;
            const other = computed.otherBonusStats[code] ?? 0;
            return (
              <div
                key={`sum_stat_${code}`}
                className="bg-stone-900 border border-stone-800 rounded-lg p-2.5 text-center space-y-1"
              >
                <div className="text-[11px] font-bold text-stone-300">{code}</div>
                <div className={`text-lg font-black font-mono ${total >= 0 ? 'text-amber-300' : 'text-red-400'}`}>
                  {formatSigned(total)}
                </div>
                <div className="text-[10px] text-stone-400 font-mono leading-tight">
                  Base {formatSigned(base)}
                  {racial !== 0 && ` • Peuple ${formatSigned(racial)}`}
                  {other !== 0 && ` • Autres ${formatSigned(other)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paths & Ranks (Titles only, no descriptions) */}
      <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-3">
        <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Voies & Rangs choisis</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pathIdsToDisplay.map(pid => {
            const pathObj = getPathById(pid);
            if (!pathObj) return null;
            const deity = isDomainPath(pid) ? getDeityByDomainPathId(pid) : undefined;
            const ranksInPath = character.acquiredAbilities
              .filter(a => a.pathId === pid)
              .sort((a, b) => a.rank - b.rank);

            return (
              <div
                key={`sum_path_${pid}`}
                className="bg-stone-900 border border-stone-800 rounded-lg p-3 space-y-2"
              >
                <div>
                  <div className="font-serif font-bold text-xs text-amber-200">{pathObj.name}</div>
                  {deity && (
                    <div className="text-[10px] text-stone-400">
                      Divinité : {deity.name}
                    </div>
                  )}
                </div>
                <ul className="space-y-1">
                  {ranksInPath.map(acq => {
                    const rankData = pathObj.ranks.find(r => r.rank === acq.rank);
                    if (!rankData) return null;
                    const choiceKey = `${pid}_${acq.rank}`;
                    const chosenOptId = character.pathRankChoices?.[choiceKey];
                    const chosenOpt = rankData.modifiers?.choiceOptions?.find(
                      o => o.id === chosenOptId,
                    );
                    const extGrant = externalGrants.find(g => g.sourceKey === choiceKey);
                    const extPath = extGrant?.ability ? getPathById(extGrant.ability.pathId) : undefined;
                    const extRank = extPath?.ranks.find(r => r.rank === extGrant?.ability?.rank);
                    const diversityResolved =
                      pid === HUMAN_DIVERSITY_PATH_ID && acq.rank === 1
                        ? resolvedDiversity
                        : null;

                    return (
                      <li key={`${pid}_${acq.rank}`} className="text-xs text-stone-200 flex items-start gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono text-[10px] shrink-0 mt-0.5">
                          R{acq.rank}
                        </span>
                        <div>
                          <span className="font-medium">{rankData.title}</span>
                          {chosenOpt && (
                            <span className="text-[10px] text-emerald-300 ml-1.5">
                              ({chosenOpt.label})
                            </span>
                          )}
                          {diversityResolved && (
                            <span className="text-[10px] text-emerald-300 ml-1.5">
                              ({diversityResolved.originLabel} : {diversityResolved.effectiveDomains.filter(Boolean).join(', ')})
                            </span>
                          )}
                          {extRank && (
                            <span className="text-[10px] text-indigo-300 ml-1.5">
                              → {extRank.title}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipment & Purse */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2.5">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Équipement & Armes</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-stone-900 p-2 rounded border border-stone-800">
              <span className="text-[10px] text-stone-400 block">Armure</span>
              <span className="text-stone-200 font-medium">
                {armor ? `${armor.name} (DEF +${armor.def})` : 'Aucune'}
              </span>
            </div>
            <div className="bg-stone-900 p-2 rounded border border-stone-800">
              <span className="text-[10px] text-stone-400 block">Bouclier</span>
              <span className="text-stone-200 font-medium">
                {shield ? `${shield.name} (DEF +${shield.def})` : 'Aucun'}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-stone-400 uppercase font-semibold flex items-center gap-1">
              <Swords className="w-3 h-3" /> Armes ({character.weapons.length})
            </span>
            {character.weapons.length === 0 ? (
              <div className="text-xs text-stone-500 italic">Aucune arme équipée</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {character.weapons.map(w => (
                  <span
                    key={w.id}
                    className="text-xs bg-stone-900 border border-stone-800 px-2.5 py-1 rounded text-stone-200"
                  >
                    <strong>{w.name}</strong> ({w.damage}
                    {w.range ? ` • ${w.range}` : ''})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2.5">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5" />
            <span>Bourse & Identité</span>
          </div>
          <div className="text-xs text-stone-200">
            Bourse de départ :{' '}
            <strong className="text-amber-300 font-mono">
              {character.coins.pa} pa
              {character.coins.po > 0 ? ` • ${character.coins.po} po` : ''}
              {character.coins.pc > 0 ? ` • ${character.coins.pc} pc` : ''}
            </strong>
          </div>
          <div className="text-xs text-stone-300 space-y-1 pt-1 border-t border-stone-800/80">
            <div>
              <strong>{character.name}</strong> ({character.sex}) — Joueur :{' '}
              <strong>{character.playerName}</strong>
            </div>
            <div className="text-stone-400">
              Âge : {character.age || selectedPeople?.startingAge || '—'} • Taille : {character.height} • Poids : {character.weight}
            </div>
            {(character.ideal || character.flaw) && (
              <div className="text-stone-400">
                Idéal : <span className="text-stone-200">{character.ideal || '—'}</span> • Travers :{' '}
                <span className="text-stone-200">{character.flaw || '—'}</span>
              </div>
            )}
            <div className="text-stone-400">
              Langues :{' '}
              <span className="text-amber-200">
                {[...computed.languagesInfo.automaticLanguages, ...(character.languages || [])].join(', ')}
              </span>
              {(character.secondaryTalents?.length || 0) > 0 && (
                <>
                  {' • '}Talents : <span className="text-indigo-200">{character.secondaryTalents?.join(', ')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={handleFinishWizard}
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold px-6 py-3 rounded-xl shadow-lg transition text-base"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Terminer la création et ouvrir la Fiche</span>
        </button>
      </div>
    </div>
  );
};
