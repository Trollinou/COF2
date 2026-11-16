import React, { useMemo } from 'react';
import type { CharacterSheet, PathData } from '../../types/cof2';
import {
  getPeopleById,
  getProfileById,
  getPathById,
  getArmorById,
  isRacialReplacementPath,
  getReplacedRacialPath,
  getRacialPathId,
} from '../../engine/compendium';
import { useComputedSheet } from '../../hooks/useComputedSheet';
import { Printer } from 'lucide-react';
import { PrintablePage1 } from './PrintablePage1';
import { PrintablePage2 } from './PrintablePage2';

interface PrintableCharacterSheetProps {
  character: CharacterSheet;
  onPrint: () => void;
}

export const PrintableCharacterSheet: React.FC<PrintableCharacterSheetProps> = ({
  character,
  onPrint,
}) => {
  const stats = useComputedSheet(character);
  const people = useMemo(() => getPeopleById(character.peopleId), [character.peopleId]);
  const profile = useMemo(() => getProfileById(character.profileId), [character.profileId]);
  const secondaryProfile = useMemo(() => {
    return character.isHybrid && character.secondaryProfileId
      ? getProfileById(character.secondaryProfileId)
      : null;
  }, [character.isHybrid, character.secondaryProfileId]);

  const armor = useMemo(
    () => (character.equippedArmorId ? getArmorById(character.equippedArmorId) : null),
    [character.equippedArmorId]
  );
  const shield = useMemo(
    () => (character.equippedShieldId ? getArmorById(character.equippedShieldId) : null),
    [character.equippedShieldId]
  );

  // Determine racial / domain path for Page 1.
  const racialPath = useMemo(() => {
    const replacementId = character.selectedPathIds?.find(id => isRacialReplacementPath(id));
    if (replacementId) {
      const p = getPathById(replacementId);
      if (p) return p;
    }
    const racialIdFromList = character.selectedPathIds?.find(id => {
      const p = getPathById(id);
      return p?.type === 'racial';
    });
    if (racialIdFromList) {
      const p = getPathById(racialIdFromList);
      if (p) return p;
    }
    const defaultRacialId = getRacialPathId(character.peopleId);
    return getPathById(defaultRacialId);
  }, [character.selectedPathIds, character.peopleId]);

  const replacedRacial = useMemo(() => getReplacedRacialPath(character), [character]);

  // Determine ONLY the non-racial paths actually learned/chosen by the character for Page 2.
  const learnedPaths = useMemo(() => {
    const result: PathData[] = [];
    const seenIds = new Set<string>();

    const addPathById = (id: string) => {
      if (!id || seenIds.has(id) || id === racialPath?.id) return;
      const p = getPathById(id);
      if (p) {
        seenIds.add(id);
        result.push(p);
      }
    };

    if (character.acquiredAbilities) {
      for (const acq of character.acquiredAbilities) {
        addPathById(acq.pathId);
      }
    }

    if (character.selectedPathIds) {
      for (const id of character.selectedPathIds) {
        addPathById(id);
      }
    }

    return result;
  }, [character.acquiredAbilities, character.selectedPathIds, racialPath]);

  const getPathCategoryLabel = (path: PathData): string => {
    if (path.type === 'prestige') return 'VOIE DE PRESTIGE';
    if (secondaryProfile && secondaryProfile.paths.includes(path.id)) {
      return `VOIE HYBRIDE (${secondaryProfile.name.toUpperCase()})`;
    }
    if (profile && profile.paths.includes(path.id)) {
      return `VOIE DE PROFIL (${profile.name.toUpperCase()})`;
    }
    if (path.type === 'domain') return 'VOIE DE DOMAINE';
    if (path.type === 'racial') return 'VOIE DE PEUPLE';
    return 'VOIE';
  };

  const filledWeapons = character.weapons || [];
  const emptyWeaponsCount = Math.max(0, 2 - filledWeapons.length);
  const TOTAL_SLOTS = 6;
  const emptySlotsCount = Math.max(0, TOTAL_SLOTS - learnedPaths.length);

  if (!stats) return null;

  return (
    <div className="print-wrapper w-full max-w-[210mm] mx-auto py-2 print:py-0 print:my-0 print:max-w-none">
      {/* Print Trigger Button (Hidden in print) */}
      <div className="no-print mb-4 flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-lg text-stone-100">
        <div>
          <h3 className="font-serif font-bold text-base text-amber-300">
            Fiche Officielle COF2 (A4 • 2 Pages)
          </h3>
          <p className="text-xs text-stone-400">
            Mise en page exacte en 2 pages A4 sur fond blanc, affichant uniquement vos voies réellement apprises.
          </p>
        </div>
        <button
          onClick={onPrint}
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold px-5 py-2.5 rounded-lg shadow-md transition text-sm cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimer / Exporter en PDF</span>
        </button>
      </div>

      <PrintablePage1
        character={character}
        stats={stats}
        people={people}
        profile={profile}
        secondaryProfile={secondaryProfile}
        armor={armor}
        shield={shield}
        racialPath={racialPath}
        replacedRacial={replacedRacial}
        filledWeapons={filledWeapons}
        emptyWeaponsCount={emptyWeaponsCount}
      />

      <PrintablePage2
        character={character}
        profile={profile}
        secondaryProfile={secondaryProfile}
        learnedPaths={learnedPaths}
        emptySlotsCount={emptySlotsCount}
        getPathCategoryLabel={getPathCategoryLabel}
      />
    </div>
  );
};
