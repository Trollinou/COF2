import React from 'react';
import { CharacterSheet, StatCode, ProfileData, PeopleData, ComputedCharacterStats } from '../../../types/cof2';
import { STAT_NAMES } from '../../../engine/rulesEngine';
import tablesData from '../../../data/tables.json';
import { Target, Wand } from 'lucide-react';

interface Step4StatsProps {
  character: CharacterSheet;
  selectedProfile: ProfileData;
  selectedPeople: PeopleData;
  computed: ComputedCharacterStats;
  arrayPreset: string;
  setArrayPreset: (preset: string) => void;
  handleAutoAssignStats: (presetId?: string) => void;
  handleSetStatValue: (stat: StatCode, val: number) => void;
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
}) => {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <h3 className="font-serif font-bold text-lg text-amber-200">
          Étape 4 : Caractéristiques
        </h3>
        <p className="text-xs text-stone-400">
          Choisissez votre série de valeurs officielle, puis attribuez les valeurs du pool sans doublons. Vos modificateurs de peuple s'ajoutent ensuite automatiquement.
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
            {(() => {
              const bonusCounts: Partial<Record<StatCode, number>> = {};
              (character.selectedRacialBonuses && character.selectedRacialBonuses.length > 0
                ? character.selectedRacialBonuses
                : character.selectedRacialBonus ? [character.selectedRacialBonus] : []
              ).forEach(code => {
                bonusCounts[code] = (bonusCounts[code] || 0) + 1;
              });

              const malusCounts: Partial<Record<StatCode, number>> = {};
              (character.selectedRacialMaluses && character.selectedRacialMaluses.length > 0
                ? character.selectedRacialMaluses
                : character.selectedRacialMalus ? [character.selectedRacialMalus] : []
              ).forEach(code => {
                malusCounts[code] = (malusCounts[code] || 0) + 1;
              });

              return (
                <>
                  {Object.entries(bonusCounts).map(([code, count]) => (
                    <span key={`b_${code}`} className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <span>+{count} en {STAT_NAMES[code as StatCode]} ({code})</span>
                    </span>
                  ))}
                  {Object.entries(malusCounts).map(([code, count]) => (
                    <span key={`m_${code}`} className="text-red-400 font-semibold flex items-center space-x-1">
                      <span>-{count} en {STAT_NAMES[code as StatCode]} ({code})</span>
                    </span>
                  ))}
                </>
              );
            })()}
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
                setArrayPreset(arr.id);
                handleAutoAssignStats(arr.id);
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

          {/* Freeform option */}
          <button
            onClick={() => setArrayPreset('libre')}
            className={`p-3 rounded-lg border text-left transition ${
              arrayPreset === 'libre'
                ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500'
                : 'bg-stone-950 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="font-semibold text-sm text-stone-200">Saisie libre</div>
            <div className="font-mono text-xs text-stone-400 my-1">Personnalisé</div>
            <div className="text-[11px] text-stone-400">Tirages aux dés ou attribution libre selon accord MJ.</div>
          </button>
        </div>
      </div>

      {/* Characteristics Inputs with Permutation / Swapping */}
      <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <h4 className="font-serif font-bold text-sm text-amber-300">
            Attribution des 7 Caractéristiques
          </h4>
          <div className="text-xs text-stone-400">
            {arrayPreset !== 'libre' ? (
              <span>
                Série active : <strong className="text-amber-300 font-mono">
                  {tablesData.characteristicArrays.find(a => a.id === arrayPreset)?.values.map(v => (v >= 0 ? `+${v}` : v)).join(', ')}
                </strong> (échange automatique lors de la sélection)
              </span>
            ) : (
              <span>Mode libre (toutes valeurs permises)</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'] as StatCode[]).map(code => {
            const total = computed.finalStats[code];
            const base = character.baseStats[code] ?? 0;
            const isPrimary = selectedProfile.primaryStats.includes(code);
            const primaryIndex = selectedProfile.primaryStats.indexOf(code);
            const racialBonusCount = (character.selectedRacialBonuses || []).filter(c => c === code).length || (character.selectedRacialBonus === code ? 1 : 0);
            const racialMalusCount = (character.selectedRacialMaluses || []).filter(c => c === code).length || (character.selectedRacialMalus === code ? 1 : 0);
            const racialMod = racialBonusCount - racialMalusCount;

            // Possible choices in dropdown
            const currentArray = tablesData.characteristicArrays.find(a => a.id === arrayPreset);
            const options = arrayPreset === 'libre' || !currentArray
              ? [-3, -2, -1, 0, 1, 2, 3, 4, 5]
              : Array.from(new Set(currentArray.values)).sort((a, b) => b - a);

            return (
              <div
                key={code}
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  isPrimary
                    ? 'bg-stone-900/90 border-amber-800/60 shadow-sm ring-1 ring-amber-600/30'
                    : 'bg-stone-900 border-stone-800'
                }`}
              >
                <div className="space-y-0.5">
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

                  <div className="text-[11px] text-stone-400 flex items-center space-x-2">
                    <span>Total final : <strong className={`font-mono text-sm ${total >= 0 ? 'text-amber-300' : 'text-red-400'}`}>
                      {total >= 0 ? `+${total}` : total}
                    </strong></span>
                    {racialMod > 0 && <span className="text-emerald-400 font-semibold">(+{racialMod} peuple)</span>}
                    {racialMod < 0 && <span className="text-red-400 font-semibold">({racialMod} peuple)</span>}
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
                      <option key={v} value={v}>
                        {v >= 0 ? `+${v}` : v}
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
