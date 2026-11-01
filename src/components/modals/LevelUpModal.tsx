import React, { useState, useMemo } from 'react';
import { CharacterSheet, ProfileFamily, PathData } from '../../types/cof2';
import {
  getProfileById,
  getPathById,
  computeCharacterStats,
  PROFILES,
  getAccessiblePathsForLevelUp,
  getReplacedRacialPath,
  isRacialReplacementPath,
  getRankLevelRequirement,
  getRankPointCost,
  canCharacterAdoptHybridPath,
  getNonRacialActivePathsCount,
  calculateLevelUpHpGain,
} from '../../engine/rulesEngine';
import {
  TrendingUp,
  X,
  Heart,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { LevelUpPathCard } from './LevelUpPathCard';
import { PrestigePathSelector } from './PrestigePathSelector';

interface LevelUpModalProps {
  character: CharacterSheet;
  isOpen: boolean;
  onClose: () => void;
  onApply: (updated: CharacterSheet) => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  character,
  isOpen,
  onClose,
  onApply,
}) => {
  if (!isOpen) return null;

  const profile = useMemo(
    () => getProfileById(character.profileId) || PROFILES[0],
    [character.profileId]
  );
  const oldStats = useMemo(() => computeCharacterStats(character), [character]);
  const newLevel = (character.level || 1) + 1;

  // Working copy of acquired abilities in the modal
  const [acquired, setAcquired] = useState<Array<{ pathId: string; rank: number }>>(
    [...character.acquiredAbilities]
  );

  // Available accessible paths: all 5 profile paths + racial/domain/prestige
  const initialAccessiblePaths = useMemo(() => {
    return getAccessiblePathsForLevelUp(character);
  }, [character]);

  // Working copy of selected/accessible path IDs in modal
  const [modalPathIds, setModalPathIds] = useState<string[]>(() => {
    const ids = initialAccessiblePaths.map(p => p.id);
    return Array.from(new Set([...character.selectedPathIds, ...ids]));
  });

  // Selected prestige path dropdown value for consultation/preview
  const [selectedPrestigeId, setSelectedPrestigeId] = useState<string>('');

  // Selected hybrid profile and path
  const [selectedHybridProfileId, setSelectedHybridProfileId] = useState<string>('');
  const [selectedHybridPathId, setSelectedHybridPathId] = useState<string>('');

  // Expand/collapse states for detailed descriptions
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});

  // Available points: 2 points for the level
  const [pointsToSpend, setPointsToSpend] = useState<number>(2);

  const effectiveFamily: ProfileFamily =
    character.profileId === 'psionique' && character.profileFamily
      ? character.profileFamily
      : profile.family;

  // Find adopted prestige path if present
  const prestigePathId = modalPathIds.find(pid => getPathById(pid)?.type === 'prestige');
  const hasPrestige = Boolean(prestigePathId);

  // Newly acquired ranks in this modal session
  const newlyAcquired = useMemo(() => {
    return acquired.filter(
      a => !character.acquiredAbilities.some(old => old.pathId === a.pathId && old.rank === a.rank)
    );
  }, [acquired, character.acquiredAbilities]);

  // Dynamic Level-up HP calculation
  const levelUpHpResult = useMemo(() => {
    return calculateLevelUpHpGain(character, newlyAcquired, character.halfHpPending);
  }, [character, newlyAcquired]);

  // Hybrid eligibility & active paths count
  const hybridEligibility = useMemo(() => {
    return canCharacterAdoptHybridPath(character);
  }, [character]);

  const nonRacialCount = useMemo(() => {
    return getNonRacialActivePathsCount(character);
  }, [character]);

  const toggleExpand = (pathId: string) => {
    setExpandedPaths(prev => ({
      ...prev,
      [pathId]: !prev[pathId],
    }));
  };

  const handleToggleExpandAll = () => {
    const allExpanded = modalPathIds.every(id => expandedPaths[id]);
    const nextState: Record<string, boolean> = {};
    modalPathIds.forEach(id => {
      nextState[id] = !allExpanded;
    });
    setExpandedPaths(nextState);
  };

  const handleAddPrestigePath = () => {
    if (!selectedPrestigeId) return;
    if (modalPathIds.includes(selectedPrestigeId)) return;
    setModalPathIds(prev => [...prev, selectedPrestigeId]);
    setExpandedPaths(prev => ({ ...prev, [selectedPrestigeId]: true }));
    setSelectedPrestigeId('');
  };

  const handleRemovePrestigePath = (pid: string) => {
    const hasAcquired = acquired.some(a => a.pathId === pid);
    if (hasAcquired) {
      alert(
        'Vous devez désapprendre les capacités de cette voie de prestige avant de pouvoir la retirer.'
      );
      return;
    }
    setModalPathIds(prev => prev.filter(id => id !== pid));
  };

  const handleAddHybridPath = () => {
    if (!selectedHybridPathId) return;
    if (modalPathIds.includes(selectedHybridPathId)) return;

    const check = canCharacterAdoptHybridPath(character, selectedHybridPathId);
    if (!check.eligible) {
      alert(check.reason);
      return;
    }

    setModalPathIds(prev => [...prev, selectedHybridPathId]);
    setExpandedPaths(prev => ({ ...prev, [selectedHybridPathId]: true }));
    setSelectedHybridPathId('');
  };

  const handleRemoveHybridPath = (pid: string) => {
    const hasAcquired = acquired.some(a => a.pathId === pid);
    if (hasAcquired) {
      alert(
        'Vous devez désapprendre les capacités de cette voie hybride avant de pouvoir la retirer.'
      );
      return;
    }
    setModalPathIds(prev => prev.filter(id => id !== pid));
  };

  const toggleAbility = (pathId: string, rank: number) => {
    const isAlreadyAcquiredBefore = character.acquiredAbilities.some(
      a => a.pathId === pathId && a.rank === rank
    );
    if (isAlreadyAcquiredBefore) return;

    const isNewlyAcquired = acquired.some(
      a => a.pathId === pathId && a.rank === rank
    );
    const pathData = getPathById(pathId);
    const isPrestige = pathData?.type === 'prestige';
    const minRank = isPrestige ? (pathData?.ranks[0]?.rank || 4) : 1;
    const reqLevel = getRankLevelRequirement(isPrestige, rank, pathId);
    const cost = getRankPointCost(rank);

    if (isNewlyAcquired) {
      // Remove this rank and any higher ranks
      const toRemove = acquired.filter(a => a.pathId === pathId && a.rank >= rank);
      let refundedPoints = 0;
      toRemove.forEach(a => {
        refundedPoints += getRankPointCost(a.rank);
      });

      setAcquired(prev => prev.filter(a => !(a.pathId === pathId && a.rank >= rank)));
      setPointsToSpend(prev => prev + refundedPoints);
    } else {
      if (newLevel < reqLevel) {
        alert(`Le rang ${rank} requiert le niveau ${reqLevel} !`);
        return;
      }

      if (rank > minRank && !acquired.some(a => a.pathId === pathId && a.rank === rank - 1)) {
        alert(`Vous devez d'abord posséder le rang ${rank - 1} de cette voie !`);
        return;
      }

      if (pointsToSpend < cost) {
        alert(`Pas assez de points de capacité ! Ce rang coûte ${cost} point(s).`);
        return;
      }

      setAcquired(prev => [...prev, { pathId, rank }]);
      setPointsToSpend(prev => prev - cost);
    }
  };

  const handleConfirm = () => {
    // Keep previously selected paths + any path that now has acquired abilities + prestige path if adopted
    const nextSelectedPathIds = Array.from(
      new Set([
        ...character.selectedPathIds,
        ...modalPathIds.filter(pid => acquired.some(a => a.pathId === pid)),
        ...(prestigePathId ? [prestigePathId] : []),
      ])
    );

    const hasHybridAbility = acquired.some(a => {
      const pth = getPathById(a.pathId);
      return pth && pth.type === 'profile' && !profile.paths.includes(a.pathId);
    });

    const updated: CharacterSheet = {
      ...character,
      level: newLevel,
      isHybrid: character.isHybrid || hasHybridAbility,
      currentHp: (character.currentHp || oldStats.maxHp) + levelUpHpResult.hpGain,
      levelUpHpGains: [
        ...(character.levelUpHpGains || [oldStats.maxHp - ((character.level || 1) * oldStats.finalStats.CON)]),
        levelUpHpResult.baseHp,
      ],
      halfHpPending: levelUpHpResult.newHalfHpPending,
      selectedPathIds: nextSelectedPathIds,
      acquiredAbilities: acquired,
      updatedAt: new Date().toISOString(),
    };

    onApply(updated);
    onClose();
  };

  const allExpanded = modalPathIds.length > 0 && modalPathIds.every(id => expandedPaths[id]);

  // Candidate paths for the chosen hybrid profile
  const hybridProfileData = selectedHybridProfileId ? getProfileById(selectedHybridProfileId) : undefined;
  const availableHybridPaths = hybridProfileData
    ? hybridProfileData.paths
        .map(pid => getPathById(pid))
        .filter((p): p is PathData => Boolean(p) && !modalPathIds.includes((p as PathData).id))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-amber-800/80 rounded-2xl max-w-4xl xl:max-w-5xl 2xl:max-w-6xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 p-5 border-b border-amber-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 shadow-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-amber-200 flex items-center space-x-2">
                <span>Progression : Passage au Niveau {newLevel}</span>
                {character.isHybrid && (
                  <span className="text-[10px] bg-indigo-900/80 text-indigo-200 border border-indigo-700 px-2 py-0.5 rounded font-mono uppercase">
                    Profil Hybride
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-400">
                {character.name} ({profile.name} • {effectiveFamily})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Gains Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-stone-950 p-4 rounded-xl border border-red-900/40 flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-red-950/60 text-red-400 border border-red-800/50">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-400">Gain de Vigueur</div>
                <div className="font-mono font-bold text-lg text-red-200">
                  +{levelUpHpResult.hpGain} PV
                </div>
                <div className="text-[11px] text-stone-400">
                  {levelUpHpResult.details}
                </div>
              </div>
            </div>

            <div className="bg-stone-950 p-4 rounded-xl border border-amber-900/40 flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/50">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-400">Points de Capacité</div>
                <div className="font-mono font-bold text-lg text-amber-300">
                  {pointsToSpend} point(s) à dépenser
                </div>
              </div>
            </div>
          </div>

          {/* Prestige Path Option: available from Level 5+ (or Level 3+ for familier fantastique) */}
          {newLevel >= 3 && !hasPrestige && (
            <PrestigePathSelector
              character={character}
              newLevel={newLevel}
              acquired={acquired}
              selectedPrestigeId={selectedPrestigeId}
              onPrestigeIdChange={setSelectedPrestigeId}
              onAdoptPrestigePath={handleAddPrestigePath}
            />
          )}

          {/* Hybrid Path Option (COF2 chap. 9) */}
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

          {/* Paths & Rank Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif font-semibold text-sm text-amber-200">
                  Voies & Capacités accessibles :
                </h4>
                <p className="text-xs text-stone-400">
                  Vous pouvez investir vos points dans vos voies habituelles ou nouvelles voies hybrides ouvertes.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="flex items-center space-x-1 text-xs text-stone-300 hover:text-amber-200 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-stone-700 transition"
              >
                {allExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Réduire tous les détails</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Afficher tous les détails</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {modalPathIds.map(pathId => {
                const pathData = getPathById(pathId);
                if (!pathData) return null;

                const isPrestige = pathData.type === 'prestige';
                const canRemovePrestige =
                  isPrestige &&
                  !character.selectedPathIds.includes(pathId) &&
                  !acquired.some(a => a.pathId === pathId);

                const isHybrid = pathData.type === 'profile' && !profile.paths.includes(pathId);
                const canRemoveHybrid =
                  isHybrid &&
                  !character.selectedPathIds.includes(pathId) &&
                  !acquired.some(a => a.pathId === pathId);

                const replacedRacial = isRacialReplacementPath(pathId)
                  ? getReplacedRacialPath(character)
                  : null;

                return (
                  <LevelUpPathCard
                    key={pathId}
                    pathData={pathData}
                    character={character}
                    acquired={acquired}
                    newLevel={newLevel}
                    pointsToSpend={pointsToSpend}
                    onToggleAbility={toggleAbility}
                    isPrestige={isPrestige}
                    onRemovePrestige={handleRemovePrestigePath}
                    canRemovePrestige={canRemovePrestige}
                    isHybrid={isHybrid}
                    onRemoveHybrid={handleRemoveHybridPath}
                    canRemoveHybrid={canRemoveHybrid}
                    replacedRacial={replacedRacial}
                    expanded={Boolean(expandedPaths[pathId])}
                    onToggleExpand={() => toggleExpand(pathId)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <div className="text-xs text-stone-400">
            {pointsToSpend > 0 ? (
              <span className="text-amber-400">
                Il vous reste {pointsToSpend} point(s) de capacité à allouer.
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">
                Tous les points ont été alloués avec succès !
              </span>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Valider le Niveau {newLevel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
