import React from 'react';
import { ALL_STAT_CODES } from '../../../engine/compendium';
import type {
  ArmorItem,
  CharacterSheet,
  ComputedCharacterStats,
  ProfileData,
  StatCode,
} from '../../../types/cof2';

interface Step7VitalsAndStatsProps {
  character: CharacterSheet;
  computed: ComputedCharacterStats;
  selectedProfile?: ProfileData;
  secondaryProfile?: ProfileData;
  armor?: ArmorItem;
  shield?: ArmorItem;
}

function formatSigned(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`;
}

export const Step7VitalsAndStats: React.FC<Step7VitalsAndStatsProps> = ({
  character,
  computed,
  selectedProfile,
  secondaryProfile,
  armor,
  shield,
}) => {
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
  const drPathDiff =
    computed.maxDr - Math.max(0, 2 + computed.finalStats.CON + drFamilyBonus);
  if (drPathDiff !== 0) {
    drParts.push(`${formatSigned(drPathDiff)} (Voies)`);
  }

  const pcParts = ['2 (Base)', `${formatSigned(computed.finalStats.CHA)} (CHA)`];
  const pcFamilyBonus =
    computed.effectiveFamily === 'Aventuriers' ? 1 : selectedProfile?.bonusPC || 0;
  if (pcFamilyBonus > 0) {
    pcParts.push(`+${pcFamilyBonus} (${computed.effectiveFamily})`);
  }
  const pcPathDiff =
    computed.maxPc - Math.max(0, 2 + computed.finalStats.CHA + pcFamilyBonus);
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

  return (
    <>
      {/* 4 Main Computed Panels with Calculation Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-950 p-3.5 rounded-xl border border-red-900/40 space-y-1.5">
          <div className="text-xs text-red-400 font-semibold text-center">
            Points de Vigueur
          </div>
          <div className="text-2xl font-bold font-mono text-red-200 text-center">
            {computed.maxHp} PV
          </div>
          <div className="text-[11px] text-stone-400 text-center font-mono leading-snug pt-1 border-t border-stone-800/80">
            {hpParts.join(' ')}
          </div>
        </div>

        <div className="bg-stone-950 p-3.5 rounded-xl border border-blue-900/40 space-y-1.5">
          <div className="text-xs text-blue-400 font-semibold text-center">
            Dés de Récupération
          </div>
          <div className="text-2xl font-bold font-mono text-blue-200 text-center">
            {computed.maxDr} {computed.drDice}
          </div>
          <div className="text-[11px] text-stone-400 text-center font-mono leading-snug pt-1 border-t border-stone-800/80">
            {drParts.join(' ')}
          </div>
        </div>

        <div className="bg-stone-950 p-3.5 rounded-xl border border-amber-900/40 space-y-1.5">
          <div className="text-xs text-amber-400 font-semibold text-center">
            Points de Chance
          </div>
          <div className="text-2xl font-bold font-mono text-amber-200 text-center">
            {computed.maxPc} PC
          </div>
          <div className="text-[11px] text-stone-400 text-center font-mono leading-snug pt-1 border-t border-stone-800/80">
            {pcParts.join(' ')}
          </div>
        </div>

        <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-700 space-y-1.5">
          <div className="text-xs text-amber-300 font-semibold text-center">
            Défense
          </div>
          <div className="text-2xl font-bold font-mono text-stone-100 text-center">
            {computed.defense}
          </div>
          <div className="text-[11px] text-stone-400 text-center font-mono leading-snug pt-1 border-t border-stone-800/80">
            {defParts.join(' ')}
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
                <div
                  className={`text-lg font-black font-mono ${
                    total >= 0 ? 'text-amber-300' : 'text-red-400'
                  }`}
                >
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
    </>
  );
};
