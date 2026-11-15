import React from 'react';
import type { CharacterSheet, PathData } from '../../types/cof2';
import { PROFILES } from '../../engine/rulesEngine';
import { AlertCircle, Plus, Shuffle } from 'lucide-react';

interface LevelUpHybridSectionProps {
  character: CharacterSheet;
  nonRacialCount: number;
  hybridEligibility: { eligible: boolean; reason?: string };
  selectedHybridProfileId: string;
  setSelectedHybridProfileId: (id: string) => void;
  selectedHybridPathId: string;
  setSelectedHybridPathId: (id: string) => void;
  availableHybridPaths: PathData[];
  handleAddHybridPath: () => void;
}

export const LevelUpHybridSection: React.FC<LevelUpHybridSectionProps> = ({
  character,
  nonRacialCount,
  hybridEligibility,
  selectedHybridProfileId,
  setSelectedHybridProfileId,
  selectedHybridPathId,
  setSelectedHybridPathId,
  availableHybridPaths,
  handleAddHybridPath,
}) => {
  return (
          <div className="bg-gradient-to-r from-indigo-950/40 via-stone-950 to-indigo-950/40 border border-indigo-800/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shuffle className="w-4 h-4 text-indigo-400" />
                <h4 className="font-serif font-bold text-sm text-indigo-200">
                  Option Hybridation : Ouvrir une Voie d'un Autre Profil
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 uppercase font-semibold">
                {nonRacialCount} / 6 voies max
              </span>
            </div>

            {!hybridEligibility.eligible ? (
              <div className="flex items-start space-x-2 p-2.5 rounded bg-stone-900/80 border border-stone-800 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{hybridEligibility.reason}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-stone-300">
                  Tant qu'au moins une des 5 voies de votre profil principal n'a aucun rang investi, vous pouvez adopter une voie d'un autre profil.
                </p>

                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <select
                    value={selectedHybridProfileId}
                    onChange={e => {
                      setSelectedHybridProfileId(e.target.value);
                      setSelectedHybridPathId('');
                    }}
                    className="w-full sm:w-1/2 bg-stone-900 border border-indigo-700/60 rounded-lg px-3 py-1.5 text-xs text-indigo-100 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">-- Choisir un profil --</option>
                    {PROFILES.filter(p => p.id !== character.profileId).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.family})
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedHybridPathId}
                    onChange={e => setSelectedHybridPathId(e.target.value)}
                    disabled={!selectedHybridProfileId}
                    className="w-full sm:w-1/2 bg-stone-900 border border-indigo-700/60 rounded-lg px-3 py-1.5 text-xs text-indigo-100 focus:outline-none focus:border-indigo-400 disabled:opacity-50"
                  >
                    <option value="">-- Choisir une voie --</option>
                    {availableHybridPaths.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedHybridPathId}
                    onClick={handleAddHybridPath}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
  );
};
