import React from 'react';
import {
  CheckCircle2,
  Coins,
  Shield,
  Sparkles,
  Swords,
  User,
} from 'lucide-react';
import {
  ALL_STAT_CODES,
  STAT_NAMES,
  getArmorById,
  getPathById,
  getProfileById,
} from '../../../engine/compendium';
import type {
  CharacterSheet,
  ComputedCharacterStats,
  PeopleData,
  ProfileData,
} from '../../../types/cof2';
import { Step7PathsSection } from './Step7PathsSection';
import { Step7VitalsAndStats } from './Step7VitalsAndStats';

interface Step7SummaryProps {
  character: CharacterSheet;
  computed: ComputedCharacterStats;
  selectedPeople?: PeopleData;
  selectedProfile?: ProfileData;
  handleFinishWizard: () => void;
}

export const Step7Summary: React.FC<Step7SummaryProps> = ({
  character,
  computed,
  selectedPeople,
  selectedProfile,
  handleFinishWizard,
}) => {
  const secondaryProfile =
    character.isHybrid && character.secondaryProfileId
      ? getProfileById(character.secondaryProfileId)
      : undefined;

  const armor = character.equippedArmorId
    ? getArmorById(character.equippedArmorId)
    : undefined;
  const shield = character.equippedShieldId
    ? getArmorById(character.equippedShieldId)
    : undefined;

  const racialEntries = ALL_STAT_CODES.map((code) => ({
    code,
    val: computed.racialBonusStats[code] || 0,
  })).filter((e) => e.val !== 0);
  const racialBonuses = racialEntries.filter((e) => e.val > 0);
  const racialMaluses = racialEntries.filter((e) => e.val < 0);

  const heritagePath = selectedPeople?.selectableRacialPaths
    ? character.selectedPathIds
        .filter((id) => selectedPeople.selectableRacialPaths?.includes(id))
        .map((id) => getPathById(id)?.name || id)[0]
    : undefined;

  const pathIdsToDisplay = Array.from(
    new Set([
      ...character.selectedPathIds,
      ...character.acquiredAbilities.map((a) => a.pathId),
    ]),
  );

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <h3 className="font-serif font-bold text-lg text-amber-200">
          Étape 7 : Bilan du Héros (Niveau 1)
        </h3>
        <p className="text-xs text-stone-400">
          Récapitulatif complet de votre personnage avant son ouverture sur la fiche interactive. Utilisez « Précédent » pour modifier un choix.
        </p>
      </div>

      <Step7VitalsAndStats
        character={character}
        computed={computed}
        selectedProfile={selectedProfile}
        secondaryProfile={secondaryProfile}
        armor={armor}
        shield={shield}
      />

      {/* People & Profile(s) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2.5">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Peuple & Modificateurs raciaux</span>
          </div>
          <div className="text-sm font-serif font-bold text-stone-100">
            {selectedPeople?.name || '—'}
            {heritagePath && (
              <span className="ml-2 text-xs font-sans font-normal text-amber-300">
                ({heritagePath})
              </span>
            )}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase text-stone-400 font-semibold w-12">
                Bonus :
              </span>
              {racialBonuses.length > 0 ? (
                racialBonuses.map(({ code, val }) => (
                  <span
                    key={`sum_rb_${code}`}
                    className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/70 font-mono text-[11px]"
                  >
                    +{val} {STAT_NAMES[code]} ({code})
                  </span>
                ))
              ) : (
                <span className="text-stone-500 italic">Aucun</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase text-stone-400 font-semibold w-12">
                Malus :
              </span>
              {racialMaluses.length > 0 ? (
                racialMaluses.map(({ code, val }) => (
                  <span
                    key={`sum_rm_${code}`}
                    className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/70 font-mono text-[11px]"
                  >
                    {val} {STAT_NAMES[code]} ({code})
                  </span>
                ))
              ) : (
                <span className="text-stone-500 italic">Aucun</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2.5">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{secondaryProfile ? 'Profils (Hybride)' : 'Profil'}</span>
          </div>
          {secondaryProfile ? (
            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-stone-400">Principal : </span>
                <strong className="text-stone-100 font-serif text-sm">
                  {selectedProfile?.name}
                </strong>
                <span className="text-stone-400 ml-1.5">
                  ({computed.effectiveFamily})
                </span>
              </div>
              <div>
                <span className="text-stone-400">Secondaire : </span>
                <strong className="text-purple-200 font-serif text-sm">
                  {secondaryProfile.name}
                </strong>
                <span className="text-stone-400 ml-1.5">
                  ({secondaryProfile.family})
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm font-serif font-bold text-stone-100">
              {selectedProfile?.name || '—'}
              {selectedProfile && (
                <span className="ml-2 text-xs font-sans font-normal text-amber-300">
                  ({computed.effectiveFamily})
                </span>
              )}
            </div>
          )}
          <div className="text-xs text-stone-400 font-mono">
            Initiative :{' '}
            <strong className="text-stone-200">{computed.initiative}</strong>
            {computed.maxPm > 0 && (
              <>
                {' • '}
                {computed.energyType} :{' '}
                <strong className="text-cyan-300">{computed.maxPm}</strong>
              </>
            )}
          </div>
        </div>
      </div>

      <Step7PathsSection
        character={character}
        pathIdsToDisplay={pathIdsToDisplay}
        externalGrants={computed.externalGrants ?? []}
        resolvedDiversity={computed.resolvedHumanDiversity ?? null}
      />

      {/* Equipment & Purse */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2.5">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Équipement & Armes</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-stone-900 p-2 rounded border border-stone-800">
              <span className="text-[10px] text-stone-400 block">Armure</span>
              <span className="text-stone-200 font-medium">
                {armor ? `${armor.name} (DEF +${armor.def})` : 'Aucune'}
              </span>
            </div>
            <div className="bg-stone-900 p-2 rounded border border-stone-800">
              <span className="text-[10px] text-stone-400 block">
                Bouclier
              </span>
              <span className="text-stone-200 font-medium">
                {shield ? `${shield.name} (DEF +${shield.def})` : 'Aucun'}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-stone-400 uppercase font-semibold flex items-center gap-1">
              <Swords className="w-3 h-3" /> Armes ({character.weapons.length})
            </span>
            {character.weapons.length === 0 ? (
              <div className="text-xs text-stone-500 italic">
                Aucune arme équipée
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {character.weapons.map((w) => (
                  <span
                    key={w.id}
                    className="text-xs bg-stone-900 border border-stone-800 px-2.5 py-1 rounded text-stone-200"
                  >
                    <strong>{w.name}</strong> ({w.damage}
                    {w.range ? ` • ${w.range}` : ''})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2.5">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5" />
            <span>Bourse & Identité</span>
          </div>
          <div className="text-xs text-stone-200">
            Bourse de départ :{' '}
            <strong className="text-amber-300 font-mono">
              {character.coins.pa} pa
              {character.coins.po > 0 ? ` • ${character.coins.po} po` : ''}
              {character.coins.pc > 0 ? ` • ${character.coins.pc} pc` : ''}
            </strong>
          </div>
          <div className="text-xs text-stone-300 space-y-1 pt-1 border-t border-stone-800/80">
            <div>
              <strong>{character.name}</strong> ({character.sex}) — Joueur :{' '}
              <strong>{character.playerName}</strong>
            </div>
            <div className="text-stone-400">
              Âge : {character.age || selectedPeople?.startingAge || '—'} • Taille :{' '}
              {character.height} • Poids : {character.weight}
            </div>
            {(character.ideal || character.flaw) && (
              <div className="text-stone-400">
                Idéal :{' '}
                <span className="text-stone-200">{character.ideal || '—'}</span>{' '}
                • Travers :{' '}
                <span className="text-stone-200">{character.flaw || '—'}</span>
              </div>
            )}
            <div className="text-stone-400">
              Langues :{' '}
              <span className="text-amber-200">
                {[
                  ...computed.languagesInfo.automaticLanguages,
                  ...(character.languages || []),
                ].join(', ')}
              </span>
              {(character.secondaryTalents?.length || 0) > 0 && (
                <>
                  {' • '}Talents :{' '}
                  <span className="text-indigo-200">
                    {character.secondaryTalents?.join(', ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={handleFinishWizard}
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold px-6 py-3 rounded-xl shadow-lg transition text-base"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Terminer la création et ouvrir la Fiche</span>
        </button>
      </div>
    </div>
  );
};
