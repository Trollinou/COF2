import React from 'react';
import { STAT_NAMES } from '../../engine/compendium';
import type {
  CharacterSheet,
  ComputedCharacterStats,
  ProfileData,
  StatCode,
} from '../../types/cof2';

const STAT_DISPLAY_ORDER: StatCode[] = [
  'AGI',
  'CON',
  'FOR',
  'PER',
  'CHA',
  'INT',
  'VOL',
];

interface PrintableLeftColumnProps {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  profile?: ProfileData | null;
  secondaryProfile?: ProfileData | null;
}

export const PrintableLeftColumn: React.FC<PrintableLeftColumnProps> = ({
  character,
  stats,
  profile,
  secondaryProfile,
}) => {
  return (
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
          {STAT_DISPLAY_ORDER.map((code) => {
            const mod = stats.finalStats[code];
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            const baseVal =
              stats.baseStats?.[code] ?? character.baseStats[code] ?? 0;
            const racialMod = stats.racialBonusStats?.[code] ?? 0;
            const otherMod =
              stats.otherBonusStats?.[code] ??
              (stats.pathBonusStats?.[code] ?? 0) +
                (character.manualStatBonuses?.[code] ?? 0);

            return (
              <div
                key={code}
                className="grid grid-cols-12 items-center py-0.5 px-1 text-center"
              >
                <span
                  className="col-span-3 text-left pl-0.5 font-bold text-[8.5px] text-stone-800"
                  title={STAT_NAMES[code]}
                >
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
          <span className="font-bold text-amber-950 uppercase text-[7.5px] block">
            Famille
          </span>
          <div className="font-semibold text-stone-900 truncate">
            {character.profileFamily || profile?.family || '—'}
          </div>
        </div>
        <div>
          <span className="font-bold text-amber-950 uppercase text-[7.5px] block">
            Profil
          </span>
          <div className="font-bold text-stone-900 truncate">
            {profile?.name || '—'}
            {secondaryProfile && ` / ${secondaryProfile.name}`}
          </div>
        </div>
        <div>
          <span className="font-bold text-amber-950 uppercase text-[7.5px] block">
            Idéal Héroïque
          </span>
          <div
            className="text-stone-800 italic truncate"
            title={character.ideal || '—'}
          >
            {character.ideal || '—'}
          </div>
        </div>
        <div>
          <span className="font-bold text-amber-950 uppercase text-[7.5px] block">
            Travers
          </span>
          <div
            className="text-stone-800 italic truncate"
            title={character.flaw || '—'}
          >
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
          <div className="grid grid-cols-12 items-center py-0.5 px-1 text-center">
            <span className="col-span-4 text-left pl-1 font-bold text-stone-800">
              Contact
            </span>
            <span className="col-span-4 font-mono font-black text-[11px] text-stone-900 bg-amber-50 border border-amber-300 rounded mx-0.5">
              {stats.attacks.contact >= 0
                ? `+${stats.attacks.contact}`
                : stats.attacks.contact}
            </span>
            <span className="col-span-4 font-mono text-[7.5px] text-stone-600">
              +{stats.bab} {stats.contactAttackStat || 'FOR'}
            </span>
          </div>

          <div className="grid grid-cols-12 items-center py-0.5 px-1 text-center">
            <span className="col-span-4 text-left pl-1 font-bold text-stone-800">
              Distance
            </span>
            <span className="col-span-4 font-mono font-black text-[11px] text-stone-900 bg-amber-50 border border-amber-300 rounded mx-0.5">
              {stats.attacks.distance >= 0
                ? `+${stats.attacks.distance}`
                : stats.attacks.distance}
            </span>
            <span className="col-span-4 font-mono text-[7.5px] text-stone-600">
              +{stats.bab} {stats.distanceAttackStat || 'AGI'}
            </span>
          </div>

          <div className="grid grid-cols-12 items-center py-0.5 px-1 text-center">
            <span className="col-span-4 text-left pl-1 font-bold text-stone-800">
              Magique
            </span>
            <span className="col-span-4 font-mono font-black text-[11px] text-stone-900 bg-amber-50 border border-amber-300 rounded mx-0.5">
              {stats.attacks.magique >= 0
                ? `+${stats.attacks.magique}`
                : stats.attacks.magique}
            </span>
            <span className="col-span-4 font-mono text-[7.5px] text-stone-600">
              +{stats.bab} VOL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
