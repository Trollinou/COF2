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
          const baseVal = stats.baseStats?.[code] ?? character.baseStats[code] ?? 0;
          const racialMod = stats.racialBonusStats?.[code] ?? 0;
          const pathMod = stats.pathBonusStats?.[code] ?? 0;
          const manualMod = stats.manualBonusStats?.[code] ?? character.manualStatBonuses?.[code] ?? 0;
          const otherMod = stats.otherBonusStats?.[code] ?? (pathMod + manualMod);

          const formatSigned = (v: number) => (v > 0 ? `+${v}` : `${v}`);
          const otherTitle = `Voies: ${formatSigned(pathMod)} | Manuel: ${formatSigned(manualMod)}`;

          return (
            <div
              key={code}
              className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-stone-950/60 border border-stone-800/80 hover:border-amber-600/50 transition"
            >
              {/* Left: Stat Code & Name */}
              <div className="w-[84px] shrink-0">
                <div className="font-mono text-[10px] font-bold text-amber-300/80 leading-none">{code}</div>
                <div className="font-medium text-stone-200 text-xs truncate">{STAT_NAMES[code]}</div>
              </div>

              {/* Center: Main Total box + 3 smaller detail boxes (Init., Peuple, Autres) */}
              <div className="flex items-center gap-1">
                {/* Main Total box */}
                <div className="w-11 h-11 rounded-lg bg-stone-900 border-2 border-amber-500/70 flex flex-col items-center justify-center font-mono shrink-0 shadow-sm">
                  <span className="text-[7px] uppercase text-amber-300/80 font-bold leading-none">TOTAL</span>
                  <span className={`text-base font-black leading-tight ${totalMod >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {totalMod >= 0 ? `+${totalMod}` : totalMod}
                  </span>
                </div>

                {/* Small box: Initial chosen value */}
                <div
                  title="Valeur initiale choisie"
                  className="w-[38px] h-8 rounded bg-stone-900/90 border border-stone-700/80 flex flex-col items-center justify-center font-mono shrink-0"
                >
                  <span className="text-[6.5px] text-stone-400 uppercase leading-none">Init.</span>
                  <span className="text-[11px] font-bold text-stone-200 leading-tight">
                    {baseVal >= 0 ? `+${baseVal}` : baseVal}
                  </span>
                </div>

                {/* Small box: Racial modifier */}
                <div
                  title="Modificateur de peuple"
                  className="w-[38px] h-8 rounded bg-stone-900/90 border border-stone-700/80 flex flex-col items-center justify-center font-mono shrink-0"
                >
                  <span className="text-[6.5px] text-stone-400 uppercase leading-none">Peuple</span>
                  <span
                    className={`text-[11px] font-bold leading-tight ${
                      racialMod > 0 ? 'text-emerald-400' : racialMod < 0 ? 'text-red-400' : 'text-stone-500'
                    }`}
                  >
                    {racialMod > 0 ? `+${racialMod}` : racialMod}
                  </span>
                </div>

                {/* Small box: Other modifiers (paths + manual) */}
                <div
                  title={otherTitle}
                  className="w-[38px] h-8 rounded bg-stone-900/90 border border-stone-700/80 flex flex-col items-center justify-center font-mono shrink-0"
                >
                  <span className="text-[6.5px] text-stone-400 uppercase leading-none">Autres</span>
                  <span
                    className={`text-[11px] font-bold leading-tight ${
                      otherMod > 0 ? 'text-amber-300' : otherMod < 0 ? 'text-red-400' : 'text-stone-500'
                    }`}
                  >
                    {otherMod > 0 ? `+${otherMod}` : otherMod}
                  </span>
                </div>
              </div>

              {/* Manual adjustment buttons (stacked vertically to save horizontal space) */}
              <div className="flex flex-col gap-1 shrink-0">
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
                  className="w-6 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold leading-none flex items-center justify-center"
                >
                  +
                </button>
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
                  className="w-6 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold leading-none flex items-center justify-center"
                >
                  -
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

