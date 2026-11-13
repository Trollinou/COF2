import React from 'react';
import { CharacterSheet, StatCode, ProfileData, PeopleData, ComputedCharacterStats } from '../../../types/cof2';
import {
  STAT_NAMES,
  POINT_BUY_COSTS,
  POINT_BUY_MAX_WEAK_STATS,
  evaluatePointBuyStats,
} from '../../../engine/rulesEngine';
import tablesData from '../../../data/tables.json';
import { Target, Wand, RotateCcw } from 'lucide-react';

interface Step4StatsProps {
  character: CharacterSheet;
  selectedProfile: ProfileData;
  selectedPeople: PeopleData;
  computed: ComputedCharacterStats;
  arrayPreset: string;
  setArrayPreset: (preset: string) => void;
  handleAutoAssignStats: (presetId?: string) => void;
  handleSetStatValue: (stat: StatCode, val: number) => void;
  handleSelectArrayPreset?: (preset: string) => void;
  handleResetPointBuy?: () => void;
}

export const Step4Stats: React.FC<Step4StatsProps> = ({
  character,
  selectedProfile,
  selectedPeople,
  computed,
  arrayPreset,
  setArrayPreset,
  handleAutoAssignStats,
  handleSetStatValue,
  handleSelectArrayPreset,
  handleResetPointBuy,
}) => {
  const isPointBuy = arrayPreset === 'achat' || arrayPreset === 'libre';
  const pointBuy = isPointBuy
    ? evaluatePointBuyStats(computed.baseStats ?? character.baseStats)
    : null;

  const formatPointBuyOptionLabel = (v: number): string => {
    const valStr = v >= 0 ? `+${v}` : `${v}`;
    if (v === -1) return `${valStr} (+1 pt)`;
    if (v === 0) return `${valStr} (0 pt)`;
    const cost = POINT_BUY_COSTS[v];
    if (cost === undefined) return valStr;
    return `${valStr} (${cost} ${cost > 1 ? 'pts' : 'pt'})`;
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <h3 className="font-serif font-bold text-lg text-amber-200">
          Étape 4 : Caractéristiques
        </h3>
        <p className="text-xs text-stone-400">
          Choisissez une série de valeurs officielle ou la méthode par achat de l'Atlas. Vos modificateurs de peuple s'ajoutent ensuite automatiquement.
        </p>
      </div>

      {/* Context Reminder Banner: Profile Key Stats & Race Modifiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Profile's Preferred Stats */}
        <div className="bg-stone-950 p-4 rounded-xl border border-amber-900/60 space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
            <Target className="w-4 h-4 text-amber-400" />
            <span>Caracs privilégiées pour {selectedProfile.name} :</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedProfile.primaryStats.map((st, idx) => (
              <span
                key={st}
                className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700 text-xs font-mono font-semibold"
              >
                #{idx + 1} {st} ({STAT_NAMES[st]})
              </span>
            ))}
          </div>
          <div className="text-[11px] text-stone-400 leading-tight">
            Privilégiez vos valeurs les plus fortes (+4, +3, +2) sur ces 3 caractéristiques.
          </div>
        </div>

        {/* Racial Modifiers */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
          <div className="text-xs font-bold text-stone-200">
            Modificateurs raciaux ({selectedPeople.name}) :
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {Object.entries(computed.racialBonusStats)
              .filter(([, val]) => val !== 0)
              .map(([code, val]) => (
                <span
                  key={`r_${code}`}
                  className={`${val > 0 ? 'text-emerald-400' : 'text-red-400'} font-semibold flex items-center space-x-1`}
                >
                  <span>
                    {val > 0 ? `+${val}` : val} en {STAT_NAMES[code as StatCode]} ({code})
                  </span>
                </span>
              ))}
          </div>
          <div className="text-[11px] text-stone-400 leading-tight">
            Appliqués automatiquement en temps réel sur le total final de vos caractéristiques.
          </div>
        </div>
      </div>

      {/* Array Preset Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Choix de la série de valeurs :
          </span>
          <button
            type="button"
            onClick={() => handleAutoAssignStats(arrayPreset)}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold px-3 py-1 rounded-md text-xs shadow transition"
          >
            <Wand className="w-3.5 h-3.5" />
            <span>Répartir automatiquement selon le Profil</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {tablesData.characteristicArrays.map(arr => (
            <button
              key={arr.id}
              onClick={() => {
                if (arrayPreset !== arr.id) {
                  if (handleSelectArrayPreset) {
                    handleSelectArrayPreset(arr.id);
                  } else {
                    setArrayPreset(arr.id);
                    handleAutoAssignStats(arr.id);
                  }
                }
              }}
              className={`p-3 rounded-lg border text-left transition ${
                arrayPreset === arr.id
                  ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500'
                  : 'bg-stone-950 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="font-semibold text-sm text-stone-200">{arr.name}</div>
              <div className="font-mono text-xs text-amber-300 my-1 font-bold">
                {arr.values.map(v => (v >= 0 ? `+${v}` : v)).join(', ')}
              </div>
              <div className="text-[11px] text-stone-400">{arr.description}</div>
            </button>
          ))}

          {/* Point-buy option (Atlas advanced rules) */}
          <button
            onClick={() => {
              if (!isPointBuy) {
                if (handleSelectArrayPreset) {
                  handleSelectArrayPreset('achat');
                } else {
                  setArrayPreset('achat');
                }
              }
            }}
            className={`p-3 rounded-lg border text-left transition ${
              isPointBuy
                ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500'
                : 'bg-stone-950 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="font-semibold text-sm text-stone-200">Méthode par achat</div>
            <div className="font-mono text-xs text-amber-300 my-1 font-bold">
              7 pts (+1 par -1, max 2)
            </div>
            <div className="text-[11px] text-stone-400">
              Règle avancée de l'Atlas : achetez vos valeurs de -1 à +4.
            </div>
          </button>
        </div>
      </div>

      {/* Characteristics Inputs with Permutation / Swapping or Point-Buy */}
      <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
          <h4 className="font-serif font-bold text-sm text-amber-300">
            Attribution des 7 Caractéristiques
          </h4>
          <div className="text-xs text-stone-400">
            {!isPointBuy ? (
              <span>
                Série active : <strong className="text-amber-300 font-mono">
                  {tablesData.characteristicArrays.find(a => a.id === arrayPreset)?.values.map(v => (v >= 0 ? `+${v}` : v)).join(', ')}
                </strong> (échange automatique lors de la sélection)
              </span>
            ) : (
              <span>Méthode par achat (valeurs de -1 à +4)</span>
            )}
          </div>
        </div>

        {isPointBuy && pointBuy && (
          <div className="bg-stone-900/90 border border-stone-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="text-stone-400">Points restants :</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded border ${
                    pointBuy.remaining === 0 && pointBuy.isValid
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                      : pointBuy.remaining > 0 && pointBuy.isValid
                      ? 'bg-amber-950/60 text-amber-300 border-amber-700'
                      : 'bg-red-950/60 text-red-300 border-red-700'
                  }`}
                >
                  {pointBuy.remaining} / {pointBuy.totalBudget}
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-stone-400">Faiblesses (-1) :</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded border ${
                    pointBuy.tooManyWeakStats
                      ? 'bg-red-950/60 text-red-300 border-red-700'
                      : 'bg-stone-950 text-stone-200 border-stone-700'
                  }`}
                >
                  {pointBuy.weakCount} / {POINT_BUY_MAX_WEAK_STATS} max
                </span>
              </div>

              <span className="text-[11px] text-stone-400 font-mono">
                Barème : -1 (+1 pt) · 0 (0) · +1 (1) · +2 (2) · +3 (4) · +4 (6)
              </span>
            </div>

            {handleResetPointBuy && (
              <button
                type="button"
                onClick={handleResetPointBuy}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réinitialiser à 0</span>
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'] as StatCode[]).map(code => {
            const total = computed.finalStats[code];
            const base = computed.baseStats?.[code] ?? character.baseStats[code] ?? 0;
            const isPrimary = selectedProfile.primaryStats.includes(code);
            const primaryIndex = selectedProfile.primaryStats.indexOf(code);
            const racialMod = computed.racialBonusStats[code] || 0;
            const otherMod =
              computed.otherBonusStats?.[code] ??
              (computed.pathBonusStats?.[code] ?? 0) + (computed.manualBonusStats?.[code] ?? 0);

            // Possible choices in dropdown
            const currentArray = tablesData.characteristicArrays.find(a => a.id === arrayPreset);
            const baseChoices = isPointBuy || !currentArray
              ? [-1, 0, 1, 2, 3, 4]
              : Array.from(new Set(currentArray.values));
            if (!baseChoices.includes(base)) {
              baseChoices.push(base);
            }
            const options = baseChoices.sort((a, b) => b - a);

            const isOptionDisabled = (v: number): boolean => {
              if (!isPointBuy || !pointBuy || v === base) return false;
              if (v === 0) return false; // Always allow resetting a stat to 0
              if (v === -1) {
                return pointBuy.weakCount >= POINT_BUY_MAX_WEAK_STATS;
              }
              if (v > 0) {
                const currentCost = base > 0 ? (POINT_BUY_COSTS[base] ?? 0) : 0;
                const newCost = POINT_BUY_COSTS[v];
                if (newCost === undefined) return true;
                const effectiveRemaining = pointBuy.remaining - (base === -1 ? 1 : 0);
                return newCost - currentCost > effectiveRemaining;
              }
              return true;
            };

            return (
              <div
                key={code}
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  isPrimary
                    ? 'bg-stone-900/90 border-amber-800/60 shadow-sm ring-1 ring-amber-600/30'
                    : 'bg-stone-900 border-stone-800'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-stone-100 text-sm">
                      {STAT_NAMES[code]} ({code})
                    </span>
                    {isPrimary && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono">
                        Clé #{primaryIndex + 1}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="w-11 h-10 rounded-lg bg-stone-950 border-2 border-amber-500/70 flex flex-col items-center justify-center font-mono shrink-0">
                      <span className="text-[7px] uppercase text-amber-300/80 font-bold leading-none">TOTAL</span>
                      <span className={`text-sm font-black leading-tight ${total >= 0 ? 'text-amber-300' : 'text-red-400'}`}>
                        {total >= 0 ? `+${total}` : total}
                      </span>
                    </div>
                    <div className="w-10 h-8 rounded bg-stone-950/90 border border-stone-700/80 flex flex-col items-center justify-center font-mono shrink-0">
                      <span className="text-[7px] text-stone-400 uppercase leading-none">Init.</span>
                      <span className="text-[11px] font-bold text-stone-200 leading-tight">
                        {base >= 0 ? `+${base}` : base}
                      </span>
                    </div>
                    <div className="w-10 h-8 rounded bg-stone-950/90 border border-stone-700/80 flex flex-col items-center justify-center font-mono shrink-0">
                      <span className="text-[7px] text-stone-400 uppercase leading-none">Peuple</span>
                      <span
                        className={`text-[11px] font-bold leading-tight ${
                          racialMod > 0 ? 'text-emerald-400' : racialMod < 0 ? 'text-red-400' : 'text-stone-500'
                        }`}
                      >
                        {racialMod > 0 ? `+${racialMod}` : racialMod}
                      </span>
                    </div>
                    <div className="w-10 h-8 rounded bg-stone-950/90 border border-stone-700/80 flex flex-col items-center justify-center font-mono shrink-0">
                      <span className="text-[7px] text-stone-400 uppercase leading-none">Autres</span>
                      <span
                        className={`text-[11px] font-bold leading-tight ${
                          otherMod > 0 ? 'text-amber-300' : otherMod < 0 ? 'text-red-400' : 'text-stone-500'
                        }`}
                      >
                        {otherMod > 0 ? `+${otherMod}` : otherMod}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-stone-400 font-medium">Base :</span>
                  <select
                    value={base}
                    onChange={e => handleSetStatValue(code, parseInt(e.target.value, 10))}
                    className="bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
                  >
                    {options.map(v => (
                      <option key={v} value={v} disabled={isOptionDisabled(v)}>
                        {isPointBuy ? formatPointBuyOptionLabel(v) : v >= 0 ? `+${v}` : v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
