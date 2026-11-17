import { useEffect, useMemo, useState } from 'react';
import {
  commands,
  type LevelUpContext,
  type LevelUpHpGainResult,
} from '../bindings';
import {
  getPathById,
  getProfileAllPoolPathIds,
  getProfileById,
  PROFILES,
} from '../engine/compendium';
import { applyLevelUpAsync, rollbackLevelAsync } from '../engine/rustBridge';
import type {
  AbilityRef,
  CharacterSheet,
  LevelProgressionStep,
  PathData,
  ProfileFamily,
} from '../types/cof2';
import {
  getRankLevelRequirement,
  getRankPointCost,
  isSameLanguage,
} from '../utils/uiConstants';
import { useComputedSheet } from './useComputedSheet';

interface UseLevelUpStateParams {
  character: CharacterSheet;
  isOpen: boolean;
  onClose: () => void;
  onApply: (updated: CharacterSheet) => void;
}

export function useLevelUpState({
  character,
  isOpen,
  onClose,
  onApply,
}: UseLevelUpStateParams) {
  const profile = useMemo(
    () => getProfileById(character.profileId) || PROFILES[0],
    [character.profileId],
  );
  const oldStats = useComputedSheet(character);
  const newLevel = (character.level || 1) + 1;

  const [acquired, setAcquired] = useState<
    Array<{ pathId: string; rank: number }>
  >(character.acquiredAbilities || []);
  const [draftPathRankChoices, setDraftPathRankChoices] = useState<
    Partial<Record<string, string>>
  >(character.pathRankChoices || {});
  const [draftExternalChoices, setDraftExternalChoices] = useState<
    Partial<Record<string, AbilityRef>>
  >(character.externalAbilityChoices || {});
  const [languagesLearned, setLanguagesLearned] = useState<string[]>([]);
  const [talentsLearned, setTalentsLearned] = useState<string[]>([]);

  const draftCharacter = useMemo<CharacterSheet>(
    () => ({
      ...character,
      level: newLevel,
      acquiredAbilities: acquired,
      pathRankChoices: draftPathRankChoices,
      externalAbilityChoices: draftExternalChoices,
      languages: [...(character.languages || []), ...languagesLearned],
      secondaryTalents: [
        ...(character.secondaryTalents || []),
        ...talentsLearned,
      ],
    }),
    [
      character,
      newLevel,
      acquired,
      draftPathRankChoices,
      draftExternalChoices,
      languagesLearned,
      talentsLearned,
    ],
  );

  const projectedStats = useComputedSheet(draftCharacter);

  const showLanguageSection =
    Boolean(
      projectedStats &&
        oldStats &&
        (projectedStats.languagesInfo.bonusLanguageSlots >
          projectedStats.languagesInfo.usedBonusSlots ||
          projectedStats.languagesInfo.automaticLanguages.length >
            oldStats.languagesInfo.automaticLanguages.length ||
          projectedStats.languagesInfo.literacy !==
            oldStats.languagesInfo.literacy),
    ) ||
    languagesLearned.length > 0 ||
    talentsLearned.length > 0;

  const [levelUpContext, setLevelUpContext] = useState<LevelUpContext | null>(
    null,
  );
  const [modalPathIds, setModalPathIds] = useState<string[]>(
    () => character.selectedPathIds,
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    commands
      .getLevelUpContextCharacter(character, newLevel)
      .then((ctx) => {
        if (cancelled) return;
        setLevelUpContext(ctx);
        setModalPathIds((prev) =>
          Array.from(
            new Set([
              ...character.selectedPathIds,
              ...ctx.accessiblePathIds,
              ...prev,
            ]),
          ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [character, isOpen, newLevel]);

  const [selectedPrestigeId, setSelectedPrestigeId] = useState<string>('');
  const [selectedHybridProfileId, setSelectedHybridProfileId] =
    useState<string>('');
  const [selectedHybridPathId, setSelectedHybridPathId] = useState<string>('');
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>(
    {},
  );
  const [pointsToSpend, setPointsToSpend] = useState<number>(2);

  const effectiveFamily: ProfileFamily =
    character.profileId === 'psionique' && character.profileFamily
      ? character.profileFamily
      : profile.family;

  const prestigePathId = modalPathIds.find(
    (pid) => getPathById(pid)?.type === 'prestige',
  );
  const hasPrestige = Boolean(prestigePathId);

  const newlyAcquired = useMemo(
    () =>
      acquired.filter(
        (a) =>
          !character.acquiredAbilities.some(
            (old) => old.pathId === a.pathId && old.rank === a.rank,
          ),
      ),
    [acquired, character.acquiredAbilities],
  );

  const [levelUpHpResult, setLevelUpHpResult] = useState<LevelUpHpGainResult>({
    hpGain: profile.hpPerLevel,
    baseHp: profile.hpPerLevel,
    conBonus: 0,
    newHalfHpPending: Boolean(character.halfHpPending),
    details: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    commands
      .calculateLevelUpHpGainCharacter(
        character,
        newlyAcquired,
        Boolean(character.halfHpPending),
      )
      .then((res) => {
        if (!cancelled && res.status === 'ok') {
          setLevelUpHpResult(res.data);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [character, isOpen, newlyAcquired]);

  const hybridEligibility = levelUpContext?.hybridEligibility
    ? {
        eligible: levelUpContext.hybridEligibility.eligible,
        reason: levelUpContext.hybridEligibility.reason ?? undefined,
      }
    : { eligible: true };
  const nonRacialCount = levelUpContext?.nonRacialActivePathsCount ?? 0;

  const toggleExpand = (pathId: string) => {
    setExpandedPaths((prev) => ({
      ...prev,
      [pathId]: !prev[pathId],
    }));
  };

  const handleToggleExpandAll = () => {
    const allExp = modalPathIds.every((id) => expandedPaths[id]);
    const nextState: Record<string, boolean> = {};
    for (const id of modalPathIds) {
      nextState[id] = !allExp;
    }
    setExpandedPaths(nextState);
  };

  const handleAddPrestigePath = () => {
    if (!selectedPrestigeId || modalPathIds.includes(selectedPrestigeId)) return;
    setModalPathIds((prev) => [...prev, selectedPrestigeId]);
    setExpandedPaths((prev) => ({ ...prev, [selectedPrestigeId]: true }));
    setSelectedPrestigeId('');
  };

  const handleRemovePrestigePath = (pid: string) => {
    if (acquired.some((a) => a.pathId === pid)) {
      alert(
        'Vous devez désapprendre les capacités de cette voie de prestige avant de pouvoir la retirer.',
      );
      return;
    }
    setModalPathIds((prev) => prev.filter((id) => id !== pid));
  };

  const handleAddHybridPath = async () => {
    if (!selectedHybridPathId || modalPathIds.includes(selectedHybridPathId))
      return;

    const check = await commands.checkHybridPathEligibility(
      character,
      selectedHybridPathId,
    );
    if (!check.eligible) {
      alert(check.reason ?? 'Hybridation non autorisée.');
      return;
    }

    setModalPathIds((prev) => [...prev, selectedHybridPathId]);
    setExpandedPaths((prev) => ({ ...prev, [selectedHybridPathId]: true }));
    setSelectedHybridPathId('');
  };

  const handleRemoveHybridPath = (pid: string) => {
    if (acquired.some((a) => a.pathId === pid)) {
      alert(
        'Vous devez désapprendre les capacités de cette voie hybride avant de pouvoir la retirer.',
      );
      return;
    }
    setModalPathIds((prev) => prev.filter((id) => id !== pid));
  };

  const toggleAbility = (pathId: string, rank: number) => {
    const isAlreadyAcquiredBefore = character.acquiredAbilities.some(
      (a) => a.pathId === pathId && a.rank === rank,
    );
    if (isAlreadyAcquiredBefore) return;

    const isNewlyAcquired = acquired.some(
      (a) => a.pathId === pathId && a.rank === rank,
    );
    const pathData = getPathById(pathId);
    const isPrestige = pathData?.type === 'prestige';
    const minRank = isPrestige ? pathData?.ranks[0]?.rank || 4 : 1;
    const reqLevel = getRankLevelRequirement(isPrestige, rank, pathId);
    const cost = getRankPointCost(rank);

    if (isNewlyAcquired) {
      const toRemove = acquired.filter(
        (a) => a.pathId === pathId && a.rank >= rank,
      );
      let refundedPoints = 0;
      for (const a of toRemove) {
        refundedPoints += getRankPointCost(a.rank);
      }
      setAcquired((prev) =>
        prev.filter((a) => !(a.pathId === pathId && a.rank >= rank)),
      );
      setPointsToSpend((prev) => prev + refundedPoints);
    } else {
      if (newLevel < reqLevel) {
        alert(`Le rang ${rank} requiert le niveau ${reqLevel} !`);
        return;
      }
      if (
        rank > minRank &&
        !acquired.some((a) => a.pathId === pathId && a.rank === rank - 1)
      ) {
        alert(
          `Vous devez d'abord posséder le rang ${rank - 1} de cette voie !`,
        );
        return;
      }
      if (pointsToSpend < cost) {
        alert(
          `Pas assez de points de capacité ! Ce rang coûte ${cost} point(s).`,
        );
        return;
      }
      setAcquired((prev) => [...prev, { pathId, rank }]);
      setPointsToSpend((prev) => prev - cost);
    }
  };

  const handleConfirm = async () => {
    const nextSelectedPathIds = Array.from(
      new Set([
        ...character.selectedPathIds,
        ...modalPathIds.filter((pid) => acquired.some((a) => a.pathId === pid)),
        ...(prestigePathId ? [prestigePathId] : []),
      ]),
    );

    const hasHybridAbility = acquired.some((a) => {
      const pth = getPathById(a.pathId);
      return (
        pth &&
        pth.type === 'profile' &&
        !profile.paths.includes(a.pathId) &&
        !(profile.optionalPaths || []).includes(a.pathId)
      );
    });

    const step: LevelProgressionStep = {
      level: newLevel,
      hpGain: levelUpHpResult.hpGain,
      abilitiesLearned: newlyAcquired,
      selectedPathIds: nextSelectedPathIds,
      pathRankChoices: draftPathRankChoices,
      languagesLearned,
      secondaryTalentsLearned: talentsLearned,
      timestamp: new Date().toISOString(),
    };

    const baseCharForRust: CharacterSheet = {
      ...character,
      isHybrid: character.isHybrid || hasHybridAbility,
      halfHpPending: levelUpHpResult.newHalfHpPending,
      externalAbilityChoices: draftExternalChoices,
      updatedAt: new Date().toISOString(),
    };

    const updated = await applyLevelUpAsync(baseCharForRust, step);
    onApply(updated);
    onClose();
  };

  const handleRollback = async () => {
    if (character.level <= 1) return;
    const targetLevel = character.level - 1;
    if (
      !window.confirm(
        `Voulez-vous vraiment revenir en arrière et rétrograder ce personnage au niveau ${targetLevel} ? Les capacités et gains du niveau ${character.level} seront révoqués.`,
      )
    ) {
      return;
    }
    const updated = await rollbackLevelAsync(character, targetLevel);
    onApply(updated);
    onClose();
  };

  const handleAddLanguage = (lang: string) => {
    if (!projectedStats) return;
    const existing = [...(character.languages || []), ...languagesLearned];
    if (existing.some((l) => isSameLanguage(l, lang))) return;
    if (
      projectedStats.languagesInfo.automaticLanguages.some((l) =>
        isSameLanguage(l, lang),
      )
    )
      return;
    setLanguagesLearned((prev) => [...prev, lang]);
  };

  const handleRemoveLanguage = (lang: string) => {
    if (languagesLearned.some((l) => isSameLanguage(l, lang))) {
      setLanguagesLearned((prev) =>
        prev.filter((l) => !isSameLanguage(l, lang)),
      );
    }
  };

  const handleAddTalent = (talent: string) => {
    const existing = [...(character.secondaryTalents || []), ...talentsLearned];
    if (existing.some((t) => t.toLowerCase() === talent.toLowerCase())) return;
    setTalentsLearned((prev) => [...prev, talent]);
  };

  const handleRemoveTalent = (talent: string) => {
    if (
      talentsLearned.some((t) => t.toLowerCase() === talent.toLowerCase())
    ) {
      setTalentsLearned((prev) =>
        prev.filter((t) => t.toLowerCase() !== talent.toLowerCase()),
      );
    }
  };

  const allExpanded =
    modalPathIds.length > 0 && modalPathIds.every((id) => expandedPaths[id]);

  const hybridProfileData = selectedHybridProfileId
    ? getProfileById(selectedHybridProfileId)
    : undefined;
  const availableHybridPaths = hybridProfileData
    ? getProfileAllPoolPathIds(hybridProfileData)
        .map((pid) => getPathById(pid))
        .filter(
          (p): p is PathData => p !== undefined && !modalPathIds.includes(p.id),
        )
    : [];

  return {
    profile,
    newLevel,
    acquired,
    draftCharacter,
    projectedStats,
    showLanguageSection,
    modalPathIds,
    selectedPrestigeId,
    setSelectedPrestigeId,
    selectedHybridProfileId,
    setSelectedHybridProfileId,
    selectedHybridPathId,
    setSelectedHybridPathId,
    expandedPaths,
    pointsToSpend,
    effectiveFamily,
    hasPrestige,
    levelUpHpResult,
    hybridEligibility,
    nonRacialCount,
    languagesLearned,
    talentsLearned,
    allExpanded,
    availableHybridPaths,
    setDraftPathRankChoices,
    setDraftExternalChoices,
    toggleExpand,
    handleToggleExpandAll,
    handleAddPrestigePath,
    handleRemovePrestigePath,
    handleAddHybridPath,
    handleRemoveHybridPath,
    toggleAbility,
    handleConfirm,
    handleRollback,
    handleAddLanguage,
    handleRemoveLanguage,
    handleAddTalent,
    handleRemoveTalent,
  };
}
