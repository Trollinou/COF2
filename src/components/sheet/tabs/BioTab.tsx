import React from 'react';
import { LanguageSelectorPanel } from '../../shared/LanguageSelectorPanel';
import {
  CharacterSheet,
  ComputedCharacterStats,
  PeopleData,
} from '../../../types/cof2';
import {
  getPathById,
  getRacialPathId,
  isDomainPath,
  getDeityByDomainPathId,
} from '../../../engine/compendium';
import { Sparkles } from 'lucide-react';
import { isSameLanguage } from '../../../utils/uiConstants';

interface BioTabProps {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  people?: PeopleData;
  updateCharacter: (partial: Partial<CharacterSheet>) => void;
}

export const BioTab: React.FC<BioTabProps> = ({
  character,
  stats,
  people,
  updateCharacter,
}) => {
  return (
    <div className="space-y-6">
      {/* Racial Heritage & Benchmark Card */}
      {people && (
        <div className="bg-stone-900 border border-amber-800/60 rounded-xl p-5 shadow space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
            <div className="flex items-center space-x-2">
              <span className="font-serif font-bold text-amber-200 text-base">
                Héritage & Repères du Peuple : {people.name}
              </span>
              <span className="text-xs font-mono bg-amber-950/70 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                Espérance : {people.lifeExpectancy}
              </span>
            </div>
          </div>

          {/* Racial Benchmarks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-950/70 p-3 rounded-lg border border-stone-800 text-xs">
            <div>
              <span className="text-stone-400 block font-semibold">Âge moyen de départ :</span>
              <span className="text-stone-200">{people.startingAge} (max ~{people.lifeExpectancy})</span>
            </div>
            <div>
              <span className="text-stone-400 block font-semibold">Fourchette de taille :</span>
              <span className="text-stone-200">{people.heightRange}</span>
            </div>
            <div>
              <span className="text-stone-400 block font-semibold">Fourchette de poids :</span>
              <span className="text-stone-200">{people.weightRange}</span>
            </div>
          </div>

          {/* Racial Physical Traits description from rules */}
          <div>
            <span className="text-xs font-semibold text-amber-400 block mb-1">
              Traits physiques distinctifs du peuple :
            </span>
            <p className="text-xs text-stone-300 italic bg-stone-950/50 p-2.5 rounded border border-stone-800">
              « {people.physicalTraits} »
            </p>
          </div>

          {/* Roleplaying tips from rules */}
          {people.interpretationTip && (
            <div>
              <span className="text-xs font-semibold text-amber-300 block mb-1">
                Conseils d'interprétation pour {people.name} :
              </span>
              <p className="text-xs text-stone-400 leading-relaxed bg-stone-950/40 p-2.5 rounded border border-stone-800">
                {people.interpretationTip}
              </p>
            </div>
          )}

          {/* Selectable Racial Path for Demi-elfe (read-only on sheet) */}
          {people.selectableRacialPaths && (
            <div className="bg-stone-950/70 p-3 rounded-lg border border-amber-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-semibold text-amber-300 block">
                  Voie de Peuple active (Héritage culturel du Demi-elfe) :
                </span>
                <span className="text-stone-400 text-[11px]">
                  Règles COF2 & Compagnon : choix défini lors de la création
                </span>
              </div>
              <span className="bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-xs font-semibold text-amber-300">
                {getPathById(character.selectedPathIds[2])?.name || character.selectedPathIds[2]}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Priest Religion & Domain Path Card (read-only on sheet) */}
      {character.profileId === 'pretre' && (() => {
        const defaultRacialId = getRacialPathId(character.peopleId);
        const defaultRacial = getPathById(defaultRacialId);
        const domainPathId = character.selectedPathIds.find(pid => isDomainPath(pid));
        const activeDomain = domainPathId ? getPathById(domainPathId) : undefined;
        const deityInfo = domainPathId ? getDeityByDomainPathId(domainPathId) : undefined;

        return (
          <div className="bg-stone-900 border border-amber-800/80 rounded-xl p-5 shadow space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-serif font-bold text-amber-200 text-base">
                  Sacerdoce & Voie de Domaine (Compagnon COF2)
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-800">
                {activeDomain ? 'Voie de Domaine Active' : `Voie de Peuple (${people?.name})`}
              </span>
            </div>

            {activeDomain && deityInfo ? (
              <div className="space-y-3 bg-stone-950/70 p-3.5 rounded-lg border border-amber-900/60">
                <div>
                  <span className="font-serif font-bold text-amber-300 text-sm">
                    {activeDomain.name}
                  </span>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Divinité : <strong className="text-stone-200">{deityInfo.name}</strong> ({deityInfo.domainTitle})
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-800/80">
                  <div>
                    <span className="text-stone-400">Arme sacrée de la religion : </span>
                    <strong className="text-amber-300">{deityInfo.sacredWeapon}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400">Symbole divin : </span>
                    <span className="text-stone-300 italic">{deityInfo.symbolDesc}</span>
                  </div>
                </div>

                <div className="text-[11px] text-stone-400 italic bg-amber-950/30 p-2 rounded border border-amber-900/40">
                  ℹ️ Cette voie de domaine remplace la voie de peuple pour la progression sacerdotale.
                  La capacité originale de rang 1 du peuple (<em>{defaultRacial?.ranks[0]?.title}</em>) reste active !
                </div>
              </div>
            ) : (
              <div className="text-xs text-stone-400 bg-stone-950/40 p-3 rounded-lg border border-stone-800">
                Ce prêtre suit actuellement la <strong>Voie de Peuple</strong> de son peuple d&apos;origine ({people?.name}).
              </div>
            )}
          </div>
        );
      })()}

      {/* Bio & Appearance Custom Fields */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow space-y-4">
        <h4 className="font-serif font-bold text-amber-200 text-base border-b border-stone-800 pb-2">
          Mensurations & Traits Personnels
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Âge</label>
            <input
              type="text"
              value={character.age || ''}
              onChange={e => updateCharacter({ age: e.target.value })}
              placeholder={people?.startingAge}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Sexe</label>
            <input
              type="text"
              value={character.sex || ''}
              onChange={e => updateCharacter({ sex: e.target.value })}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Taille</label>
            <input
              type="text"
              value={character.height || ''}
              onChange={e => updateCharacter({ height: e.target.value })}
              placeholder={people?.heightRange}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Poids</label>
            <input
              type="text"
              value={character.weight || ''}
              onChange={e => updateCharacter({ weight: e.target.value })}
              placeholder={people?.weightRange}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-stone-400 mb-1">
            Description physique & Particularités
          </label>
          <textarea
            rows={2}
            value={character.physicalTraits || ''}
            onChange={e => updateCharacter({ physicalTraits: e.target.value })}
            placeholder="Traits du visage, couleur des yeux, cicatrices, coiffure..."
            className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Idéal héroïque</label>
            <input
              type="text"
              value={character.ideal || ''}
              onChange={e => updateCharacter({ ideal: e.target.value })}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200"
              placeholder="Ex: Justice, Courage, Compassion..."
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Travers / Défaut</label>
            <input
              type="text"
              value={character.flaw || ''}
              onChange={e => updateCharacter({ flaw: e.target.value })}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200"
              placeholder="Ex: Impulsif, Cupide, Superstitieux..."
            />
          </div>
        </div>

        {/* Languages & Secondary Talents */}
        <LanguageSelectorPanel
          automaticLanguages={stats.languagesInfo.automaticLanguages}
          selectedLanguages={character.languages || []}
          secondaryTalents={character.secondaryTalents || []}
          bonusLanguageSlots={stats.languagesInfo.bonusLanguageSlots}
          usedBonusSlots={stats.languagesInfo.usedBonusSlots}
          argotienSlotCost={stats.languagesInfo.argotienSlotCost}
          literacy={stats.languagesInfo.literacy}
          intNote={stats.languagesInfo.intNote}
          onAddLanguage={lang => {
            const current = character.languages || [];
            if (current.some(l => isSameLanguage(l, lang))) return;
            if (stats.languagesInfo.automaticLanguages.some(l => isSameLanguage(l, lang))) return;
            updateCharacter({ languages: [...current, lang] });
          }}
          onRemoveLanguage={lang => {
            updateCharacter({ languages: (character.languages || []).filter(l => l !== lang) });
          }}
          onAddSecondaryTalent={talent => {
            const current = character.secondaryTalents || [];
            if (current.some(t => t.toLowerCase() === talent.toLowerCase())) return;
            updateCharacter({ secondaryTalents: [...current, talent] });
          }}
          onRemoveSecondaryTalent={talent => {
            updateCharacter({
              secondaryTalents: (character.secondaryTalents || []).filter(t => t !== talent),
            });
          }}
        />

        <div>
          <label className="block text-xs text-stone-400 mb-1">
            Historique & Notes de campagne
          </label>
          <textarea
            rows={4}
            value={character.notes || ''}
            onChange={e => updateCharacter({ notes: e.target.value })}
            placeholder="Origines, famille, serments, aventures marquantes..."
            className="w-full bg-stone-950 border border-stone-700 rounded p-3 text-xs text-stone-200 leading-relaxed focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
