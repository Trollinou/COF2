import React, { useMemo } from 'react';
import {
  CharacterSheet,
  StatCode,
  PathData,
} from '../../types/cof2';
import {
  computeCharacterStats,
  getPeopleById,
  getProfileById,
  getPathById,
  getArmorById,
  STAT_NAMES,
  getWeaponAttackInfo,
  isRacialReplacementPath,
  getReplacedRacialPath,
  getRacialPathId,
} from '../../engine/rulesEngine';
import { Printer } from 'lucide-react';
import { ActionBadges } from '../sheet/ActionBadges';

interface PrintableCharacterSheetProps {
  character: CharacterSheet;
  onPrint: () => void;
}

const STAT_DISPLAY_ORDER: StatCode[] = ['AGI', 'CON', 'FOR', 'PER', 'CHA', 'INT', 'VOL'];

export const PrintableCharacterSheet: React.FC<PrintableCharacterSheetProps> = ({
  character,
  onPrint,
}) => {
  const stats = useMemo(() => computeCharacterStats(character), [character]);
  const people = useMemo(() => getPeopleById(character.peopleId), [character.peopleId]);
  const profile = useMemo(() => getProfileById(character.profileId), [character.profileId]);
  const secondaryProfile = useMemo(() => {
    return character.isHybrid && character.secondaryProfileId
      ? getProfileById(character.secondaryProfileId)
      : null;
  }, [character.isHybrid, character.secondaryProfileId]);

  const armor = useMemo(
    () => (character.equippedArmorId ? getArmorById(character.equippedArmorId) : null),
    [character.equippedArmorId]
  );
  const shield = useMemo(
    () => (character.equippedShieldId ? getArmorById(character.equippedShieldId) : null),
    [character.equippedShieldId]
  );

  // Determine racial / domain path for Page 1.
  const racialPath = useMemo(() => {
    const replacementId = character.selectedPathIds?.find(id => isRacialReplacementPath(id));
    if (replacementId) {
      const p = getPathById(replacementId);
      if (p) return p;
    }
    const racialIdFromList = character.selectedPathIds?.find(id => {
      const p = getPathById(id);
      return p?.type === 'racial';
    });
    if (racialIdFromList) {
      const p = getPathById(racialIdFromList);
      if (p) return p;
    }
    const defaultRacialId = getRacialPathId(character.peopleId);
    return getPathById(defaultRacialId);
  }, [character.selectedPathIds, character.peopleId]);

  const replacedRacial = useMemo(() => getReplacedRacialPath(character), [character]);

  // Determine ONLY the non-racial paths actually learned/chosen by the character for Page 2.
  const learnedPaths = useMemo(() => {
    const result: PathData[] = [];
    const seenIds = new Set<string>();

    const addPathById = (id: string) => {
      if (!id || seenIds.has(id) || id === racialPath?.id) return;
      const p = getPathById(id);
      if (p) {
        seenIds.add(id);
        result.push(p);
      }
    };

    // 1. Paths where abilities have been acquired (excluding the racial/domain path on Page 1).
    if (character.acquiredAbilities) {
      for (const acq of character.acquiredAbilities) {
        addPathById(acq.pathId);
      }
    }

    // 2. Paths that were explicitly selected by the player.
    if (character.selectedPathIds) {
      for (const id of character.selectedPathIds) {
        addPathById(id);
      }
    }

    return result;
  }, [character.acquiredAbilities, character.selectedPathIds, racialPath]);

  // Determine path category label for badge.
  const getPathCategoryLabel = (path: PathData): string => {
    if (path.type === 'prestige') return 'VOIE DE PRESTIGE';
    if (secondaryProfile && secondaryProfile.paths.includes(path.id)) {
      return `VOIE HYBRIDE (${secondaryProfile.name.toUpperCase()})`;
    }
    if (profile && profile.paths.includes(path.id)) {
      return `VOIE DE PROFIL (${profile.name.toUpperCase()})`;
    }
    if (path.type === 'domain') return 'VOIE DE DOMAINE';
    if (path.type === 'racial') return 'VOIE DE PEUPLE';
    return 'VOIE';
  };

  // Weapons with fallback blank rows.
  const filledWeapons = character.weapons || [];
  const emptyWeaponsCount = Math.max(0, 2 - filledWeapons.length);

  // Exactly 6 non-racial slots total in the official 3x2 grid (per COF2 rules).
  const TOTAL_SLOTS = 6;
  const emptySlotsCount = Math.max(0, TOTAL_SLOTS - learnedPaths.length);

  return (
    <div className="print-wrapper w-full max-w-[210mm] mx-auto py-2 print:py-0 print:my-0 print:max-w-none">
      {/* Print Trigger Button (Hidden in print) */}
      <div className="no-print mb-4 flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-lg text-stone-100">
        <div>
          <h3 className="font-serif font-bold text-base text-amber-300">
            Fiche Officielle COF2 (A4 • 2 Pages)
          </h3>
          <p className="text-xs text-stone-400">
            Mise en page exacte en 2 pages A4 sur fond blanc, affichant uniquement vos voies réellement apprises.
          </p>
        </div>
        <button
          onClick={onPrint}
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold px-5 py-2.5 rounded-lg shadow-md transition text-sm cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimer / Exporter en PDF</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1 : FICHE DE JEU OFFICIELLE                                          */}
      {/* ========================================================================= */}
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
                  <div className="grid grid-cols-12 bg-stone-100 text-[7.5px] font-bold text-stone-600 border-b border-stone-400 py-0.5 px-1 text-center">
                    <span className="col-span-4 text-left pl-1">CARAC</span>
                    <span className="col-span-4">VALEUR</span>
                    <span className="col-span-4">SCORE</span>
                  </div>
                  <div className="divide-y divide-stone-200">
                    {STAT_DISPLAY_ORDER.map(code => {
                      const mod = stats.finalStats[code];
                      const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                      return (
                        <div key={code} className="grid grid-cols-12 items-center py-0.5 px-1 text-center">
                          <span className="col-span-4 text-left pl-1 font-bold text-[9px] text-stone-800">
                            {code} <span className="text-[7px] font-normal text-stone-500">({STAT_NAMES[code]?.slice(0, 3)})</span>
                          </span>
                          <span className="col-span-4 font-mono font-black text-xs text-stone-950 bg-stone-100 border border-stone-300 rounded mx-0.5">
                            {modStr}
                          </span>
                          <span className="col-span-4 font-mono text-[9px] text-stone-600">
                            {character.baseStats[code]}
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
                    <span><strong>Langues :</strong> {character.languages || people?.defaultLanguages || 'Commun'}</span>
                  </div>
                  {(character.physicalTraits || people?.physicalTraits) && (
                    <div className="mt-0.5 italic text-stone-600 truncate">
                      {character.physicalTraits || people?.physicalTraits}
                    </div>
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* RIGHT COLUMN: Vitals (PV, PC, DR, PM, Coins) (3 cols)        */}
              {/* ------------------------------------------------------------- */}
              <div className="col-span-3 flex flex-col justify-between gap-1 overflow-hidden">
                {/* PV */}
                <div className="border-2 border-red-900 rounded overflow-hidden bg-white text-center flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider py-0.5 uppercase">
                    POINTS DE VIGUEUR
                  </div>
                  <div className="p-1.5">
                    <div className="font-mono font-black text-2xl text-red-700 leading-none">
                      {character.currentHp ?? stats.maxHp}
                    </div>
                    <div className="text-[7.5px] font-extrabold uppercase text-stone-600 mt-0.5">
                      MAX : {stats.maxHp} PV
                    </div>
                  </div>
                </div>

                {/* PC */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white text-center flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider py-0.5 uppercase">
                    POINTS DE CHANCE
                  </div>
                  <div className="p-1">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <span className="font-mono font-black text-lg text-amber-900 leading-none">
                        {character.currentPc ?? stats.maxPc}
                      </span>
                      <span className="text-[7.5px] font-bold text-stone-600 uppercase">
                        / {stats.maxPc} MAX
                      </span>
                    </div>
                    <div className="text-[7px] text-stone-500 mb-1 font-semibold">
                      +10 à un test ou éviter un coup
                    </div>
                    {/* Diamond Checkboxes (2 rows of 6) */}
                    <div className="grid grid-cols-6 gap-1 px-1">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 mx-auto border rotate-45 ${
                            i < (character.currentPc ?? stats.maxPc)
                              ? 'border-amber-800 bg-amber-50'
                              : 'border-stone-300 bg-stone-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* DR */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white text-center flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider py-0.5 uppercase">
                    DÉS DE RÉCUPÉRATION
                  </div>
                  <div className="p-1">
                    <div className="flex items-center justify-center gap-2 mb-0.5">
                      <span className="font-mono font-black text-base text-blue-900 leading-none uppercase">
                        {stats.drDice}
                      </span>
                      <span className="font-mono font-black text-base text-stone-900 leading-none">
                        × {stats.maxDr}
                      </span>
                    </div>
                    <div className="text-[7px] text-stone-600 font-medium">
                      Restauration = ({stats.drDice} + {stats.finalStats.CON >= 0 ? `+${stats.finalStats.CON}` : stats.finalStats.CON}) PV
                    </div>
                  </div>
                </div>

                {/* PM */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white text-center flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider py-0.5 uppercase">
                    {stats.energyType === 'PE' ? "POINTS D'ÉGO" : "POINTS DE MANA"}
                  </div>
                  <div className="p-1">
                    <div className="font-mono font-black text-lg text-purple-900 leading-none">
                      {stats.maxPm > 0 ? (character.currentPm ?? stats.maxPm) : '—'}
                    </div>
                    <div className="text-[7.5px] font-bold uppercase text-stone-600 mt-0.5">
                      {stats.maxPm > 0 ? `MAX : ${stats.maxPm}` : 'Aucune magie'}
                    </div>
                  </div>
                </div>

                {/* Coins */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white text-center flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider py-0.5 uppercase">
                    PIÈCES & BOURSE
                  </div>
                  <div className="p-1">
                    <div className="flex justify-around items-center text-[8.5px] font-mono font-bold text-stone-900">
                      <div>
                        <span className="text-amber-800">{character.coins.po}</span>{' '}
                        <span className="font-sans text-[7px] text-stone-600">PO</span>
                      </div>
                      <div>
                        <span className="text-stone-700">{character.coins.pa}</span>{' '}
                        <span className="font-sans text-[7px] text-stone-600">PA</span>
                      </div>
                      <div>
                        <span className="text-amber-900">{character.coins.pc}</span>{' '}
                        <span className="font-sans text-[7px] text-stone-600">PC</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tactical notes */}
                {stats.pathSituationalNotes.length > 0 && (
                  <div className="border border-stone-700 rounded overflow-hidden bg-stone-50 flex-1 flex flex-col">
                    <div className="bg-stone-200 text-stone-800 font-serif font-bold text-[8px] tracking-wider px-1.5 py-0.5 uppercase">
                      RAPPELS TACTIQUES
                    </div>
                    <div className="p-1 space-y-0.5 text-[7px] text-stone-700 leading-tight flex-1">
                      {stats.pathSituationalNotes.map((note, idx) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="font-bold text-amber-800">•</span>
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Official Sheet Footer Line (Height: ~5mm) */}
            <div className="border-t border-stone-400 pt-0.5 flex items-center justify-between text-[7px] text-stone-500 flex-shrink-0">
              <span>Chroniques Oubliées Fantasy 2 • Fiche de Héros Officielle</span>
              <span>Photocopie autorisée pour usage personnel uniquement - © Black Book Éditions</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2 : VOIES APPRISES & CAPACITÉS DU PERSONNAGE                          */}
      {/* ========================================================================= */}
      <div className="print-page flex flex-col justify-start font-sans select-text">
        <div className="w-full h-[288mm] max-h-[288mm] border-2 border-amber-800 p-1.5 flex flex-col justify-between bg-white overflow-hidden">
          <div className="w-full h-full border border-stone-700 p-1.5 flex flex-col justify-between overflow-hidden">
            {/* Header Block Page 2 (Height: ~16mm) */}
            <div className="flex items-center justify-between border-b-2 border-amber-900 pb-1 flex-shrink-0">
              <div>
                <span className="font-serif font-bold text-[10px] text-amber-900 uppercase tracking-widest block">
                  CHRONIQUES OUBLIÉES FANTASY • VOIES & CAPACITÉS DU HÉROS
                </span>
                <span className="font-serif font-black text-lg text-stone-900 tracking-wider uppercase leading-none">
                  {character.name || 'Héros'}
                </span>
              </div>
              <div className="text-right">
                <span className="font-serif font-bold text-[11px] text-stone-800 uppercase block leading-none">
                  {profile?.name}
                  {secondaryProfile && ` / ${secondaryProfile.name}`}
                </span>
                <span className="font-mono font-bold text-[10px] text-amber-900 leading-none">
                  NIVEAU {character.level}
                </span>
              </div>
            </div>

            {/* 6 Path Slots Grid: Always exactly 3 Columns x 2 Rows (Height: ~258mm) */}
            <div className="h-[258mm] max-h-[258mm] py-1 overflow-hidden grid grid-cols-3 grid-rows-2 gap-1.5 text-stone-900">
              {/* 1. All paths actually learned/chosen */}
              {learnedPaths.map(path => {
                const badgeLabel = getPathCategoryLabel(path);
                const isPrestige = path.type === 'prestige';
                const isHybrid = secondaryProfile && secondaryProfile.paths.includes(path.id);

                return (
                  <div
                    key={path.id}
                    className="h-full max-h-full border border-stone-700 rounded overflow-hidden bg-white flex flex-col justify-between shadow-2xs"
                  >
                    {/* Path Card Banner */}
                    <div
                      className={`text-white font-serif font-bold text-[9px] tracking-wider px-1.5 py-0.5 uppercase text-center truncate flex-shrink-0 ${
                        isPrestige ? 'bg-purple-900' : isHybrid ? 'bg-amber-900' : 'bg-amber-800'
                      }`}
                    >
                      <div className="leading-tight">{path.name}</div>
                      <div className="text-[6.5px] font-sans font-normal opacity-90 tracking-normal -mt-0.5">
                        {badgeLabel}
                      </div>
                    </div>

                    {/* Ranks List */}
                    <div className="p-1 flex-1 flex flex-col justify-between divide-y divide-stone-200 overflow-hidden">
                      {path.ranks.map(r => {
                        const isAcquired = character.acquiredAbilities.some(
                          a => a.pathId === path.id && a.rank === r.rank
                        );
                        return (
                          <div key={r.rank} className="py-0.5 flex items-start gap-1 text-[7px] leading-[1.16]">
                            <span
                              className={`w-2.5 h-2.5 mt-0.5 flex-shrink-0 flex items-center justify-center border border-stone-800 rounded-2xs text-[6.5px] font-bold ${
                                isAcquired ? 'bg-amber-700 text-white' : 'bg-white text-transparent'
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
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* 2. Empty / Free Slot Cards up to 6 total (reinforces the 6 non-racial paths limit) */}
              {Array.from({ length: emptySlotsCount }).map((_, slotIdx) => {
                const slotNumber = learnedPaths.length + slotIdx + 1;
                const isLastSlot = slotNumber === 6;

                return (
                  <div
                    key={`empty-slot-${slotIdx}`}
                    className="h-full max-h-full border border-dashed border-stone-400 rounded overflow-hidden bg-stone-50/60 flex flex-col justify-between shadow-2xs"
                  >
                    <div className="bg-stone-600 text-white font-serif font-bold text-[9px] tracking-wider px-1.5 py-0.5 uppercase text-center flex-shrink-0">
                      <div>EMPLACEMENT LIBRE • VOIE {slotNumber} / 6</div>
                      <div className="text-[6.5px] font-sans font-normal opacity-90 tracking-normal -mt-0.5">
                        {isLastSlot ? 'NOUVELLE VOIE / VOIE DE PRESTIGE' : 'NOUVELLE VOIE DE PROFIL OU HYBRIDE'}
                      </div>
                    </div>
                    <div className="p-1.5 flex-1 flex flex-col justify-around text-[8px] text-stone-500">
                      {[1, 2, 3, 4, 5].map(rank => (
                        <div key={rank} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 border border-stone-400 rounded-2xs" />
                          <span className="font-semibold text-stone-700">Rang {rank} :</span>
                          <div className="flex-1 border-b border-stone-300 h-2.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Official Sheet Footer Line (Height: ~5mm) */}
            <div className="border-t border-stone-400 pt-0.5 flex items-center justify-between text-[7px] text-stone-500 flex-shrink-0">
              <span>Chroniques Oubliées Fantasy 2 • Voies & Spécialités</span>
              <span>Impression autorisée pour usage personnel uniquement - © Black Book Éditions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
