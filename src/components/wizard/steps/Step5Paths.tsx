import React, { useState } from 'react';
import { CharacterSheet, ProfileData, PeopleData } from '../../../types/cof2';
import {
  getPathById,
  getRacialPathId,
  applyRacialDefaults,
  PRIEST_DEITIES,
  isDomainPath,
  canUseVoieDuMage,
  hasMageCreationBonus,
  isRacialReplacementPath,
  getDomainPathForDeity,
  getDeityByDomainPathId,
  getProfileById,
} from '../../../engine/rulesEngine';
import { ChevronDown, ChevronUp, Sparkles, Shield, BookOpen, Shuffle } from 'lucide-react';
import { ActionBadges } from '../../sheet/ActionBadges';
import { CompanionCard } from '../../sheet/CompanionCard';
import { MageBonusRank2Panel } from './MageBonusRank2Panel';

interface Step5PathsProps {
  character: CharacterSheet;
  onChange: (updated: CharacterSheet) => void;
  selectedProfile: ProfileData;
  selectedPeople: PeopleData;
  expandedPaths: Record<string, boolean>;
  togglePathPreview: (pathId: string) => void;
  toggleProfilePath: (pathId: string) => void;
}

export const Step5Paths: React.FC<Step5PathsProps> = ({
  character,
  onChange,
  selectedProfile,
  selectedPeople,
  expandedPaths,
  togglePathPreview,
  toggleProfilePath,
}) => {
  const secondaryProfile = character.isHybrid && character.secondaryProfileId
    ? getProfileById(character.secondaryProfileId)
    : undefined;
  const isHybrid = Boolean(character.isHybrid && secondaryProfile);
  const allProfilePathIds = isHybrid && secondaryProfile
    ? [...selectedProfile.paths, ...secondaryProfile.paths]
    : selectedProfile.paths;

  const selectedProfilePaths = character.selectedPathIds.filter(id => allProfilePathIds.includes(id));
  const isPriest = selectedProfile.id === 'pretre' || secondaryProfile?.id === 'pretre';
  const isMage = canUseVoieDuMage(character);
  const hasMageBonus = hasMageCreationBonus(character);
  const defaultRacialPathId = getRacialPathId(character.peopleId);
  const defaultRacialPath = getPathById(defaultRacialPathId);

  const currentThirdPathId = character.selectedPathIds.find(id => !allProfilePathIds.includes(id))
    || defaultRacialPathId;
  const isDomainActive = isDomainPath(currentThirdPathId);
  const isVoieDuMageActive = currentThirdPathId === 'voie-du-mage';
  const isReplacementActive = isDomainActive || isVoieDuMageActive;
  const currentThirdPath = getPathById(currentThirdPathId);
  const currentDeityInfo = getDeityByDomainPathId(currentThirdPathId);

  const [domainFilter, setDomainFilter] = useState('');

  const handleSelectDomain = (deityName: string) => {
    const dPath = getDomainPathForDeity(deityName);
    if (!dPath) return;
    const p1 = selectedProfilePaths[0] || selectedProfile.paths[0];
    const p2 = selectedProfilePaths[1] || (secondaryProfile ? secondaryProfile.paths[0] : selectedProfile.paths[1]);

    const nextSelected = [p1, p2, dPath.id];
    const nextAcquired = character.acquiredAbilities.filter(
      a => a.pathId === p1 || a.pathId === p2 || a.pathId === defaultRacialPathId
    );
    if (!nextAcquired.some(a => a.pathId === defaultRacialPathId && a.rank === 1)) {
      nextAcquired.push({ pathId: defaultRacialPathId, rank: 1 });
    }
    if (!nextAcquired.some(a => a.pathId === dPath.id && a.rank === 1)) {
      nextAcquired.push({ pathId: dPath.id, rank: 1 });
    }

    onChange({
      ...character,
      deity: deityName,
      selectedPathIds: nextSelected,
      acquiredAbilities: nextAcquired,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSelectVoieDuMage = () => {
    const p1 = selectedProfilePaths[0] || selectedProfile.paths[0];
    const p2 = selectedProfilePaths[1] || (secondaryProfile ? secondaryProfile.paths[0] : selectedProfile.paths[1]);

    const nextSelected = [p1, p2, 'voie-du-mage'];
    const nextAcquired = character.acquiredAbilities.filter(
      a => a.pathId === p1 || a.pathId === p2 || a.pathId === defaultRacialPathId
    );
    if (!nextAcquired.some(a => a.pathId === defaultRacialPathId && a.rank === 1)) {
      nextAcquired.push({ pathId: defaultRacialPathId, rank: 1 });
    }
    if (!nextAcquired.some(a => a.pathId === 'voie-du-mage' && a.rank === 1)) {
      nextAcquired.push({ pathId: 'voie-du-mage', rank: 1 });
    }

    onChange({
      ...character,
      selectedPathIds: nextSelected,
      acquiredAbilities: nextAcquired,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSelectRacial = (targetRacialId?: string) => {
    const rId = targetRacialId || defaultRacialPathId;
    const p1 = selectedProfilePaths[0] || selectedProfile.paths[0];
    const p2 = selectedProfilePaths[1] || (secondaryProfile ? secondaryProfile.paths[0] : selectedProfile.paths[1]);

    const nextSelected = [p1, p2, rId];
    const nextAcquired = character.acquiredAbilities.filter(
      a => a.pathId === p1 || a.pathId === p2 || a.pathId === rId
    );
    if (!nextAcquired.some(a => a.pathId === rId && a.rank === 1)) {
      nextAcquired.push({ pathId: rId, rank: 1 });
    }

    onChange({
      ...character,
      deity: undefined,
      selectedPathIds: nextSelected,
      acquiredAbilities: nextAcquired,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <h3 className="font-serif font-bold text-lg text-amber-200">
          Étape 5 : Voies & Capacités de Départ (Niveau 1)
        </h3>
        <p className="text-xs text-stone-400">
          Consultez le contenu détaillé des 5 voies de votre profil et choisissez les <strong>2 voies de départ</strong> pour votre héros. Le rang 1 de chaque voie choisie ainsi que votre voie de peuple sont immédiatement acquis !
        </p>
      </div>

      {/* Counter Bar */}
      <div className="flex items-center justify-between bg-stone-950 p-3.5 rounded-xl border border-stone-800">
        <div className="flex items-center space-x-3 text-xs text-stone-300">
          <span>Voies de profil sélectionnées :</span>
          <strong className={`font-mono text-sm px-2 py-0.5 rounded ${
            selectedProfilePaths.length === 2
              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
              : 'bg-stone-800 text-stone-300 border border-stone-700'
          }`}>
            {selectedProfilePaths.length} / 2
          </strong>
          {selectedProfilePaths.length < 2 && (
            <span className="text-amber-400 font-medium">
              (Choisissez encore {2 - selectedProfilePaths.length} voie{2 - selectedProfilePaths.length > 1 ? 's' : ''})
            </span>
          )}
        </div>
        <div className="text-xs text-stone-400">
          Cliquez sur une carte pour lire tous ses rangs et faire votre choix.
        </div>
      </div>

      {/* The 5 Profile Paths as Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-serif font-semibold text-sm text-amber-300 uppercase tracking-wider">
            {isHybrid ? `Voies du profil principal (${selectedProfile.name}) :` : `Les 5 Voies du profil ${selectedProfile.name} :`}
          </h4>
          {isHybrid && (
            <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800 uppercase font-semibold">
              Profil Principal
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {selectedProfile.paths.map(pathId => {
            const pathData = getPathById(pathId);
            if (!pathData) return null;

            const isSelected = selectedProfilePaths.includes(pathId);
            const isExpanded = expandedPaths[pathId] ?? false;

            return (
              <div
                key={pathId}
                className={`rounded-xl border transition overflow-hidden shadow ${
                  isSelected
                    ? 'bg-stone-950 border-amber-500 ring-1 ring-amber-500'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                }`}
              >
                {/* Path Card Header */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-amber-400 font-serif font-black text-lg">▲</span>
                    <div>
                      <div className="font-serif font-bold text-base text-stone-100 flex items-center space-x-2">
                        <span>{pathData.name}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-amber-500 text-stone-950 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                            Choisie ✓
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-400">
                        Rang 1 initial : <strong className="text-amber-200">{pathData.ranks[0]?.title}</strong> ({pathData.ranks[0]?.actionType})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => togglePathPreview(pathId)}
                      className="flex items-center space-x-1 text-xs bg-stone-900 hover:bg-stone-800 text-stone-300 px-3 py-1.5 rounded border border-stone-700 transition"
                    >
                      <span>{isExpanded ? 'Réduire' : 'Voir les 5 rangs'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleProfilePath(pathId)}
                      className={`px-4 py-1.5 rounded text-xs font-bold transition shadow ${
                        isSelected
                          ? 'bg-amber-600 text-stone-950 hover:bg-amber-500'
                          : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-600'
                      }`}
                    >
                      {isSelected ? 'Voie Choisie ✓' : 'Choisir cette voie'}
                    </button>
                  </div>
                </div>

                {/* Preview of Rank 1 always visible, ranks 2-5 when expanded */}
                <div className="px-4 pb-4 pt-1 border-t border-stone-800/80 space-y-2 bg-stone-900/30">
                  {/* Rank 1 highlight */}
                  <div className="p-2.5 rounded bg-stone-900/70 border border-stone-800">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-xs font-mono font-bold flex items-center justify-center">
                          1
                        </span>
                        <span className="font-semibold text-stone-200 text-xs">
                          {pathData.ranks[0]?.title}
                        </span>
                        {pathData.ranks[0] && <ActionBadges rank={pathData.ranks[0]} />}
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold">
                        {isSelected ? 'Acquis au Niv. 1' : 'Disponible au Niv. 1'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 pl-7 leading-relaxed">
                      {pathData.ranks[0]?.description}
                    </p>
                  </div>

                  {/* Extended Ranks 2-5 when expanded */}
                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t border-stone-800/60">
                      {pathData.ranks.slice(1).map(r => (
                        <div key={r.rank} className="p-2.5 rounded bg-stone-900/40 border border-stone-800/60 text-xs">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 text-xs font-mono font-bold flex items-center justify-center">
                              {r.rank}
                            </span>
                            <span className="font-semibold text-stone-200">
                              {r.title}
                            </span>
                            <ActionBadges rank={r} />
                          </div>
                          <p className="text-stone-400 pl-7 leading-relaxed">
                            {r.description}
                          </p>
                          {r.companions && r.companions.length > 0 && (
                            <div className="pl-7 space-y-2 mt-2">
                              {r.companions.map((comp, cIdx) => (
                                <CompanionCard key={cIdx} companion={comp} />
                              ))}
                            </div>
                          )}
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

      {/* Secondary Profile Paths for Hybrid Characters */}
      {isHybrid && secondaryProfile && (
        <div className="space-y-4 pt-4 border-t border-stone-800">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-semibold text-sm text-purple-300 uppercase tracking-wider flex items-center space-x-2">
              <Shuffle className="w-4 h-4 text-purple-400" />
              <span>Voies du profil secondaire ({secondaryProfile.name}) :</span>
            </h4>
            <span className="text-[10px] bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-800 uppercase font-semibold">
              Profil Secondaire
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {secondaryProfile.paths.map(pathId => {
              const pathData = getPathById(pathId);
              if (!pathData) return null;

              const isSelected = selectedProfilePaths.includes(pathId);
              const isExpanded = expandedPaths[pathId] ?? false;

              return (
                <div
                  key={pathId}
                  className={`rounded-xl border transition overflow-hidden shadow ${
                    isSelected
                      ? 'bg-stone-950 border-purple-500 ring-1 ring-purple-500'
                      : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {/* Path Card Header */}
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-purple-400 font-serif font-black text-lg">▲</span>
                      <div>
                        <div className="font-serif font-bold text-base text-stone-100 flex items-center space-x-2">
                          <span>{pathData.name}</span>
                          {isSelected && (
                            <span className="text-[10px] bg-purple-600 text-stone-950 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                              Choisie ✓
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400">
                          Rang 1 initial : <strong className="text-purple-200">{pathData.ranks[0]?.title}</strong> ({pathData.ranks[0]?.actionType})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => togglePathPreview(pathId)}
                        className="flex items-center space-x-1 text-xs bg-stone-900 hover:bg-stone-800 text-stone-300 px-3 py-1.5 rounded border border-stone-700 transition"
                      >
                        <span>{isExpanded ? 'Réduire' : 'Voir les 5 rangs'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleProfilePath(pathId)}
                        className={`px-4 py-1.5 rounded text-xs font-bold transition shadow ${
                          isSelected
                            ? 'bg-purple-600 text-stone-950 hover:bg-purple-500'
                            : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-600'
                        }`}
                      >
                        {isSelected ? 'Voie Choisie ✓' : 'Choisir cette voie'}
                      </button>
                    </div>
                  </div>

                  {/* Preview of Rank 1 always visible, ranks 2-5 when expanded */}
                  <div className="px-4 pb-4 pt-1 border-t border-stone-800/80 space-y-2 bg-stone-900/30">
                    <div className="p-2.5 rounded bg-stone-900/70 border border-stone-800">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-purple-500 text-stone-950 text-xs font-mono font-bold flex items-center justify-center">
                            1
                          </span>
                          <span className="font-semibold text-stone-200 text-xs">
                            {pathData.ranks[0]?.title}
                          </span>
                          {pathData.ranks[0] && <ActionBadges rank={pathData.ranks[0]} />}
                        </div>
                        <span className="text-[10px] text-purple-400 font-semibold">
                          {isSelected ? 'Acquis au Niv. 1' : 'Disponible au Niv. 1'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 pl-7 leading-relaxed">
                        {pathData.ranks[0]?.description}
                      </p>
                    </div>

                    {isExpanded && (
                      <div className="space-y-2 pt-2 border-t border-stone-800/60">
                        {pathData.ranks.slice(1).map(r => (
                          <div key={r.rank} className="p-2.5 rounded bg-stone-900/40 border border-stone-800/60 text-xs">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 text-xs font-mono font-bold flex items-center justify-center">
                                {r.rank}
                              </span>
                              <span className="font-semibold text-stone-200">
                                {r.title}
                              </span>
                              <ActionBadges rank={r} />
                            </div>
                            <p className="text-stone-400 pl-7 leading-relaxed">
                              {r.description}
                            </p>
                            {r.companions && r.companions.length > 0 && (
                              <div className="pl-7 space-y-2 mt-2">
                                {r.companions.map((comp, cIdx) => (
                                  <CompanionCard key={cIdx} companion={comp} />
                                ))}
                              </div>
                            )}
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
      )}

      {/* Racial / Domain Path Section */}
      <div className="pt-4 border-t border-stone-800 space-y-4">
        {isPriest && (
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-serif font-bold text-xs text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Option Compagnon : Voie de Domaine de Prêtre</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Un prêtre peut choisir de consacrer son sacerdoce à une divinité tutélaire et remplacer sa voie de peuple par sa Voie de Domaine.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSelectRacial()}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  !isDomainActive
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                }`}
              >
                Voie de Peuple ({selectedPeople.name})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isDomainActive) {
                    handleSelectDomain(character.deity || PRIEST_DEITIES[0].name);
                  }
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center space-x-1 ${
                  isDomainActive
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                }`}
              >
                <span>Voie de Domaine</span>
                <span className="text-[10px] bg-stone-800/80 px-1 rounded ml-1 text-amber-300 border border-stone-700">
                  {PRIEST_DEITIES.length} dieux
                </span>
              </button>
            </div>
          </div>
        )}

        {isMage && (
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-serif font-bold text-xs text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Option Mage : Voie du Mage</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Un profil de la famille des mages peut choisir d'obtenir la Voie du Mage en remplacement de sa voie de peuple.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSelectRacial()}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  !isVoieDuMageActive
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                }`}
              >
                Voie de Peuple ({selectedPeople.name})
              </button>
              <button
                type="button"
                onClick={() => handleSelectVoieDuMage()}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center space-x-1 ${
                  isVoieDuMageActive
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                }`}
              >
                <span>Voie du Mage</span>
              </button>
            </div>
          </div>
        )}

        {isReplacementActive ? (
          /* Replacement Path Active View (Domain or Voie du Mage) */
          <div className="space-y-4 bg-stone-950/70 p-4 rounded-xl border border-amber-800/70">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-800">
              <div>
                <h4 className="font-serif font-bold text-sm text-amber-200 flex items-center space-x-2">
                  <span>
                    {isDomainActive ? 'Voie de Domaine active' : 'Voie de Mage active'} : {currentThirdPath?.name}
                  </span>
                  <span className="text-[10px] bg-amber-500 text-stone-950 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                    {isDomainActive ? 'Compagnon' : 'Mage'}
                  </span>
                </h4>
                {isDomainActive && currentDeityInfo && (
                  <div className="text-xs text-stone-400 mt-1">
                    Divinité : <strong className="text-stone-200">{currentDeityInfo?.name}</strong> ({currentDeityInfo?.domainTitle})
                    {' • '}Arme sacrée : <strong className="text-amber-300">{currentDeityInfo?.sacredWeapon}</strong>
                    {' • '}Symbole : <span className="italic text-stone-300">{currentDeityInfo?.symbolDesc}</span>
                  </div>
                )}
                {isVoieDuMageActive && (
                  <div className="text-xs text-stone-400 mt-1">
                    Remplacement de voie de peuple pour la famille des mages • Érudition et puissance magique
                  </div>
                )}
              </div>

              {/* Deity selector for Priest */}
              {isDomainActive && (
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-stone-400">Changer de divinité :</label>
                  <select
                    value={currentDeityInfo?.name || PRIEST_DEITIES[0].name}
                    onChange={e => handleSelectDomain(e.target.value)}
                    className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
                  >
                    {PRIEST_DEITIES.map(d => (
                      <option key={d.domainPathId} value={d.name}>
                        {d.name} — {d.domainTitle} ({d.sacredWeapon})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Explanatory Rule Banner */}
            <div className="text-xs bg-amber-950/40 p-3 rounded-lg border border-amber-900/60 text-amber-200/90 leading-relaxed">
              <strong>Règle officielle COF2 :</strong>{' '}
              {isDomainActive
                ? 'La voie de domaine remplace la voie de peuple pour la progression sacerdotale.'
                : 'La voie du mage remplace la voie de peuple pour se consacrer aux arts occultes.'}{' '}
              Votre héros <strong>conserve la capacité originale de son peuple</strong> ({defaultRacialPath?.name} : <em>« {defaultRacialPath?.ranks[0]?.title} »</em>) et ajoute dès le rang 1{' '}
              {isDomainActive ? 'le bonus de compétence spécifique de sa divinité' : "l'Occultisme"} !
            </div>

            {/* Path Card */}
            {currentThirdPath && (
              <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow">
                <div className="p-3.5 bg-stone-950/80 flex items-center justify-between border-b border-stone-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400 font-serif font-black">■</span>
                    <span className="font-serif font-bold text-stone-200 text-sm">
                      {currentThirdPath.name}
                    </span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 font-mono">
                      Rang 1 acquis gratuitement
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePathPreview(currentThirdPath.id)}
                    className="flex items-center space-x-1 text-xs bg-stone-900 hover:bg-stone-800 text-stone-300 px-3 py-1 rounded border border-stone-700 transition"
                  >
                    <span>{expandedPaths[currentThirdPath.id] ? 'Réduire' : 'Voir les 5 rangs'}</span>
                    {expandedPaths[currentThirdPath.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="p-3.5 space-y-2.5">
                  {/* Rank 1 highlight */}
                  <div className="p-3 rounded-lg bg-stone-950/70 border border-amber-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-xs font-mono font-bold flex items-center justify-center">
                          1
                        </span>
                        <span className="font-semibold text-stone-200 text-xs">
                          {currentThirdPath.ranks[0]?.title}
                        </span>
                        {currentThirdPath.ranks[0] && <ActionBadges rank={currentThirdPath.ranks[0]} />}
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold">
                        Acquis au Niv. 1
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 pl-7 leading-relaxed">
                      {currentThirdPath.ranks[0]?.description}
                    </p>

                    {/* Prominent Reminder for the retained racial ability */}
                    <div className="mt-2.5 ml-7 p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/50 space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-300">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Rappel : Capacité originale de peuple conservée ({defaultRacialPath?.name} • Rang 1)</span>
                      </div>
                      <div className="font-semibold text-stone-100 text-xs flex items-center space-x-2">
                        <span>{defaultRacialPath?.ranks[0]?.title}</span>
                        {defaultRacialPath?.ranks[0] && <ActionBadges rank={defaultRacialPath.ranks[0]} />}
                      </div>
                      <p className="text-xs text-stone-300 pl-2 border-l border-emerald-800/60 leading-relaxed">
                        {defaultRacialPath?.ranks[0]?.description}
                      </p>
                    </div>
                  </div>

                  {/* Extended ranks 2-5 if expanded */}
                  {expandedPaths[currentThirdPath.id] && (
                    <div className="space-y-2 pt-2 border-t border-stone-800/60">
                      {currentThirdPath.ranks.slice(1).map(r => (
                        <div key={r.rank} className="p-2.5 rounded bg-stone-950/40 border border-stone-800/60 text-xs">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 text-xs font-mono font-bold flex items-center justify-center">
                              {r.rank}
                            </span>
                            <span className="font-semibold text-stone-200">
                              {r.title}
                            </span>
                            <ActionBadges rank={r} />
                          </div>
                          <p className="text-stone-400 pl-7 leading-relaxed">
                            {r.description}
                          </p>
                          {r.companions && r.companions.length > 0 && (
                            <div className="pl-7 space-y-2 mt-2">
                              {r.companions.map((comp, cIdx) => (
                                <CompanionCard key={cIdx} companion={comp} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Standard Racial Path View */
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <h4 className="font-serif font-semibold text-sm text-amber-300 uppercase tracking-wider">
                  Voie de Peuple ({selectedPeople.name}) :
                </h4>
                <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800 uppercase font-semibold">
                  {selectedPeople.selectableRacialPaths ? 'Héritage au choix' : 'Acquis au Niv. 1'}
                </span>
              </div>
              {selectedPeople.selectableRacialPaths ? (
                <span className="text-xs text-stone-400">
                  En tant que demi-elfe, vous pouvez choisir parmi 4 héritages culturels ci-dessous :
                </span>
              ) : (
                <span className="text-xs text-stone-400">
                  Votre voie de peuple est automatiquement acquise au rang 1 dès la création.
                </span>
              )}
            </div>

            {/* Demi-elfe: 4 selectable heritage path buttons in 4 columns */}
            {selectedPeople.selectableRacialPaths && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedPeople.selectableRacialPaths.map(pid => {
                  const pth = getPathById(pid);
                  const isChosen = currentThirdPathId === pid;
                  const heritageLabel = pid.includes('humain')
                    ? 'Héritage humain'
                    : pid.includes('haut')
                    ? 'Héritage elfe haut'
                    : pid.includes('sylvain')
                    ? 'Héritage elfe sylvain'
                    : 'Voie du demi-elfe (métis)';

                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => {
                        const updated = applyRacialDefaults(character, 'demi-elfe', pid);
                        onChange(updated);
                      }}
                      className={`p-3.5 rounded-xl border text-left text-xs transition relative flex flex-col justify-between ${
                        isChosen
                          ? 'bg-amber-950/70 border-amber-500 shadow-md ring-1 ring-amber-500'
                          : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 hover:bg-stone-900/60'
                      }`}
                    >
                      <div>
                        <div className="font-serif font-bold text-stone-100 text-sm">{pth?.name}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">{heritageLabel}</div>
                      </div>
                      <div className="mt-2.5">
                        {isChosen ? (
                          <span className="inline-flex items-center text-[10px] bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded shadow">
                            Voie Active ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500 hover:text-stone-300">
                            Cliquer pour choisir
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Preview of the racial path with ALL 5 RANKS previewable */}
            {currentThirdPath && (
              <div className="bg-stone-950/80 rounded-xl border border-stone-800 overflow-hidden shadow">
                {/* Header with expand/collapse toggle */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-stone-900/40 border-b border-stone-800/80">
                  <div className="flex items-center space-x-3">
                    <span className="text-amber-400 font-serif font-black text-lg">■</span>
                    <div>
                      <div className="font-serif font-bold text-base text-stone-100 flex items-center space-x-2">
                        <span>{currentThirdPath.name}</span>
                        <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800 uppercase font-semibold">
                          Rang 1 acquis immédiatement
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        Voie raciale ({selectedPeople.name}) • 5 rangs disponibles au fil des niveaux
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePathPreview(currentThirdPath.id)}
                    className="flex items-center space-x-1.5 text-xs text-stone-300 hover:text-amber-200 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 hover:border-amber-500/50 transition"
                  >
                    {expandedPaths[currentThirdPath.id] ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-amber-400" />
                        <span>Masquer les rangs 2 à 5</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-amber-400" />
                        <span>Voir tous les rangs (1 à 5)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Content: Rank 1 always visible */}
                <div className="p-4 space-y-3">
                  <div className="p-3 rounded-lg bg-stone-900/70 border border-stone-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-xs font-mono font-bold flex items-center justify-center">
                          1
                        </span>
                        <span className="font-semibold text-stone-200 text-xs">
                          {currentThirdPath.ranks[0]?.title}
                        </span>
                        {currentThirdPath.ranks[0] && <ActionBadges rank={currentThirdPath.ranks[0]} />}
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold">
                        Acquis au Niv. 1
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 pl-7 leading-relaxed">
                      {currentThirdPath.ranks[0]?.description}
                    </p>
                  </div>

                  {/* Extended Ranks 2-5 when expanded */}
                  {expandedPaths[currentThirdPath.id] && (
                    <div className="space-y-2 pt-2 border-t border-stone-800/60">
                      <div className="text-xs text-stone-400 font-medium">
                        Rangs suivants (accessibles lors des montées de niveau) :
                      </div>
                      {currentThirdPath.ranks.slice(1).map(r => (
                        <div key={r.rank} className="p-2.5 rounded bg-stone-900/40 border border-stone-800/60 text-xs">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 text-xs font-mono font-bold flex items-center justify-center">
                              {r.rank}
                            </span>
                            <span className="font-semibold text-stone-200">
                              {r.title}
                            </span>
                            <ActionBadges rank={r} />
                          </div>
                          <p className="text-stone-400 pl-7 leading-relaxed">
                            {r.description}
                          </p>
                          {r.companions && r.companions.length > 0 && (
                            <div className="pl-7 space-y-2 mt-2">
                              {r.companions.map((comp, cIdx) => (
                                <CompanionCard key={cIdx} companion={comp} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mage Family Bonus Rank 2 Capability at Level 1 */}
      {hasMageBonus && (
        <MageBonusRank2Panel
          character={character}
          onChange={onChange}
          selectedProfilePaths={selectedProfilePaths}
          isVoieDuMageActive={isVoieDuMageActive}
        />
      )}
    </div>
  );
};
