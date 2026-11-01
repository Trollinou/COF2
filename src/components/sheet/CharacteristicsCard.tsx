import React from 'react';
import { CharacterSheet, ComputedCharacterStats, StatCode } from '../../types/cof2';
import { STAT_NAMES } from '../../engine/rulesEngine';

interface CharacteristicsCardProps {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  updateCharacter: (partial: Partial<CharacterSheet>) => void;
}

export const CharacteristicsCard: React.FC<CharacteristicsCardProps> = ({
  character,
  stats,
  updateCharacter,
}) => {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow space-y-3">
      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
        <h3 className="font-serif font-bold text-amber-200 text-base">Caractéristiques</h3>
        <span className="text-xs text-stone-400">Modificateurs COF2</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {(['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'] as StatCode[]).map(code => {
          const totalMod = stats.finalStats[code];
          const baseVal = character.baseStats[code] ?? 0;
          const racialBonusCount =
            (character.selectedRacialBonuses || []).filter(c => c === code).length ||
            (character.selectedRacialBonus === code ? 1 : 0);
          const racialMalusCount =
            (character.selectedRacialMaluses || []).filter(c => c === code).length ||
            (character.selectedRacialMalus === code ? 1 : 0);
          const racialMod = racialBonusCount - racialMalusCount;

          return (
            <div
              key={code}
              className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-stone-800/80 hover:border-amber-600/50 transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-lg bg-stone-900 border border-stone-700 flex flex-col items-center justify-center font-mono shrink-0">
                  <span className="text-[10px] text-stone-400 leading-none">{code}</span>
                  <span className={`text-lg font-black ${totalMod >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {totalMod >= 0 ? `+${totalMod}` : totalMod}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-stone-200 text-sm">{STAT_NAMES[code]}</div>
                  <div className="text-[11px] text-stone-400 flex items-center space-x-1.5 flex-wrap">
                    <span>Base: {baseVal >= 0 ? `+${baseVal}` : baseVal}</span>
                    {racialMod > 0 && <span className="text-emerald-400 font-semibold">+{racialMod} peuple</span>}
                    {racialMod < 0 && <span className="text-red-400 font-semibold">{racialMod} peuple</span>}
                    {(stats.pathBonusStats?.[code] || 0) > 0 && (
                      <span className="text-purple-300 font-semibold bg-purple-950/80 px-1 rounded border border-purple-800/60">
                        +{stats.pathBonusStats[code]} voie
                      </span>
                    )}
                    {(character.manualStatBonuses?.[code] || 0) !== 0 && (
                      <span className="text-amber-300 font-semibold">
                        {(character.manualStatBonuses?.[code] || 0) > 0
                          ? `+${character.manualStatBonuses?.[code]}`
                          : character.manualStatBonuses?.[code]}{' '}
                        man.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Manual adjustment button */}
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  title="Ajustement manuel (-1)"
                  onClick={() => {
                    const curr = character.manualStatBonuses?.[code] || 0;
                    updateCharacter({
                      manualStatBonuses: {
                        ...character.manualStatBonuses,
                        [code]: curr - 1,
                      },
                    });
                  }}
                  className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs font-bold"
                >
                  -
                </button>
                <button
                  title="Ajustement manuel (+1)"
                  onClick={() => {
                    const curr = character.manualStatBonuses?.[code] || 0;
                    updateCharacter({
                      manualStatBonuses: {
                        ...character.manualStatBonuses,
                        [code]: curr + 1,
                      },
                    });
                  }}
                  className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

