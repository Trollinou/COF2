import React, { useMemo } from 'react';
import { CharacterSheet, ProfileFamily } from '../../types/cof2';
import {
  getEligiblePrestigePaths,
  getPathById,
  getProfileById,
  PROFILES,
} from '../../engine/rulesEngine';
import {
  Sparkles,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { ActionBadges } from '../sheet/ActionBadges';

interface PrestigePathSelectorProps {
  character: CharacterSheet;
  newLevel: number;
  acquired: Array<{ pathId: string; rank: number }>;
  selectedPrestigeId: string;
  onPrestigeIdChange: (pathId: string) => void;
  onAdoptPrestigePath: () => void;
}

export const PrestigePathSelector: React.FC<PrestigePathSelectorProps> = ({
  character,
  newLevel,
  acquired,
  selectedPrestigeId,
  onPrestigeIdChange,
  onAdoptPrestigePath,
}) => {
  const profile = useMemo(() => getProfileById(character.profileId) || PROFILES[0], [character.profileId]);
  const effectiveFamily: ProfileFamily = (character.profileId === 'psionique' && character.profileFamily)
    ? character.profileFamily
    : profile.family;

  const prestigeCandidates = useMemo(() => {
    return getEligiblePrestigePaths(character, newLevel, acquired);
  }, [character, newLevel, acquired]);

  const selectedCandidate = useMemo(() => {
    return prestigeCandidates.find(c => c.path.id === selectedPrestigeId);
  }, [prestigeCandidates, selectedPrestigeId]);

  const previewPath = useMemo(() => {
    return selectedPrestigeId ? getPathById(selectedPrestigeId) : null;
  }, [selectedPrestigeId]);

  return (
    <div className="bg-gradient-to-r from-purple-950/40 via-stone-950 to-purple-950/40 border border-purple-800/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h4 className="font-serif font-bold text-sm text-purple-200">
            Voie de Prestige disponible (Niveau {newLevel} {newLevel >= 5 ? '≥ 5' : '— Exception'})
          </h4>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50 uppercase font-semibold">
          1 seule voie de prestige autorisée
        </span>
      </div>

      <p className="text-xs text-stone-300">
        À partir du niveau 5 (ou niveau 3 pour le familier fantastique), vous pouvez choisir une voie de prestige adaptée à votre profil (famille <strong>{effectiveFamily}</strong>) ou générique :
      </p>

      {/* Dropdown & Adopt Button */}
      <div className="flex gap-2">
        <select
          value={selectedPrestigeId}
          onChange={e => onPrestigeIdChange(e.target.value)}
          className="flex-1 bg-stone-900 border border-purple-700/60 rounded-lg px-3 py-1.5 text-xs text-purple-100 focus:outline-none focus:border-purple-400"
        >
          <option value="">-- Choisir une voie de prestige pour consultation --</option>
          <optgroup label={`Voies de votre famille (${effectiveFamily}) & Génériques éligibles`}>
            {prestigeCandidates
              .filter(c => c.eligible)
              .map(c => (
                <option key={c.path.id} value={c.path.id}>
                  {c.path.name} ({c.path.owner || 'Prestige'})
                </option>
              ))}
          </optgroup>
          <optgroup label="Autres voies de prestige (prérequis manquants)">
            {prestigeCandidates
              .filter(c => !c.eligible)
              .map(c => (
                <option key={c.path.id} value={c.path.id}>
                  {c.path.name} ({c.path.owner || 'Prestige'}) [Non éligible]
                </option>
              ))}
          </optgroup>
        </select>

        <button
          type="button"
          disabled={!selectedPrestigeId || !selectedCandidate?.eligible}
          onClick={onAdoptPrestigePath}
          className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-stone-950 font-bold text-xs flex items-center space-x-1 transition shadow shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Adopter cette voie</span>
        </button>
      </div>

      {/* Selected Prestige Path Detail Preview */}
      {previewPath && (
        <div className="mt-3 p-3.5 bg-stone-900/80 border border-purple-800/50 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-purple-900/40 pb-2">
            <div>
              <div className="font-serif font-bold text-sm text-purple-200">
                {previewPath.name}
              </div>
              <div className="text-[11px] text-purple-400">
                Famille : {previewPath.owner || 'Prestige'}
              </div>
            </div>

            {selectedCandidate?.eligible ? (
              <span className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Conditions remplies</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-xs text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{selectedCandidate?.reason || 'Prérequis non rempli'}</span>
              </span>
            )}
          </div>

          {/* Ranks Preview */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex items-center space-x-1">
              <Info className="w-3 h-3 text-purple-400" />
              <span>Détail des capacités de la voie :</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {previewPath.ranks.map(r => (
                <div
                  key={r.rank}
                  className="p-2.5 rounded bg-stone-950/60 border border-stone-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="w-4 h-4 rounded-full bg-purple-900 text-purple-200 text-[10px] font-mono font-bold flex items-center justify-center">
                        {r.rank}
                      </span>
                      <strong className="text-stone-200 text-xs">{r.title}</strong>
                      <ActionBadges rank={r} compact />
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed whitespace-pre-line pl-5">
                    {r.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

