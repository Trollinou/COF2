import React from 'react';
import type { CharacterSheet, PathData, ProfileData } from '../../types/cof2';
import { ActionBadges } from '../sheet/ActionBadges';

interface PrintablePage2Props {
  character: CharacterSheet;
  profile?: ProfileData | null;
  secondaryProfile?: ProfileData | null;
  learnedPaths: PathData[];
  emptySlotsCount: number;
  getPathCategoryLabel: (path: PathData) => string;
}

export const PrintablePage2: React.FC<PrintablePage2Props> = ({
  character,
  profile,
  secondaryProfile,
  learnedPaths,
  emptySlotsCount,
  getPathCategoryLabel,
}) => {
  return (
      <div className="print-page flex flex-col justify-start font-sans select-text">
        <div className="w-full h-[288mm] max-h-[288mm] border-2 border-amber-800 p-1.5 flex flex-col justify-between bg-white overflow-hidden">
          <div className="w-full h-full border border-stone-700 p-1.5 flex flex-col justify-between overflow-hidden">
            {/* Header Block Page 2 (Height: ~16mm) */}
            <div className="flex items-center justify-between border-b-2 border-amber-900 pb-1 flex-shrink-0">
              <div>
                <span className="font-serif font-bold text-[10px] text-amber-900 uppercase tracking-widest block">
                  CHRONIQUES OUBLIÉES FANTASY • VOIES & CAPACITÉS DU HÉROS
                </span>
                <span className="font-serif font-black text-lg text-stone-900 tracking-wider uppercase leading-none">
                  {character.name || 'Héros'}
                </span>
              </div>
              <div className="text-right">
                <span className="font-serif font-bold text-[11px] text-stone-800 uppercase block leading-none">
                  {profile?.name}
                  {secondaryProfile && ` / ${secondaryProfile.name}`}
                </span>
                <span className="font-mono font-bold text-[10px] text-amber-900 leading-none">
                  NIVEAU {character.level}
                </span>
              </div>
            </div>

            {/* 6 Path Slots Grid: Always exactly 3 Columns x 2 Rows (Height: ~258mm) */}
            <div className="h-[258mm] max-h-[258mm] py-1 overflow-hidden grid grid-cols-3 grid-rows-2 gap-1.5 text-stone-900">
              {/* 1. All paths actually learned/chosen */}
              {learnedPaths.map(path => {
                const badgeLabel = getPathCategoryLabel(path);
                const isPrestige = path.type === 'prestige';
                const isHybrid = secondaryProfile && secondaryProfile.paths.includes(path.id);

                return (
                  <div
                    key={path.id}
                    className="h-full max-h-full border border-stone-700 rounded overflow-hidden bg-white flex flex-col justify-between shadow-2xs"
                  >
                    {/* Path Card Banner */}
                    <div
                      className={`text-white font-serif font-bold text-[9px] tracking-wider px-1.5 py-0.5 uppercase text-center truncate flex-shrink-0 ${
                        isPrestige ? 'bg-purple-900' : isHybrid ? 'bg-amber-900' : 'bg-amber-800'
                      }`}
                    >
                      <div className="leading-tight">{path.name}</div>
                      <div className="text-[6.5px] font-sans font-normal opacity-90 tracking-normal -mt-0.5">
                        {badgeLabel}
                      </div>
                    </div>

                    {/* Ranks List */}
                    <div className="p-1 flex-1 flex flex-col justify-between divide-y divide-stone-200 overflow-hidden">
                      {path.ranks.map(r => {
                        const isAcquired = character.acquiredAbilities.some(
                          a => a.pathId === path.id && a.rank === r.rank
                        );
                        return (
                          <div key={r.rank} className="py-0.5 flex items-start gap-1 text-[7px] leading-[1.16]">
                            <span
                              className={`w-2.5 h-2.5 mt-0.5 flex-shrink-0 flex items-center justify-center border border-stone-800 rounded-2xs text-[6.5px] font-bold ${
                                isAcquired ? 'bg-amber-700 text-white' : 'bg-white text-transparent'
                              }`}
                            >
                              {isAcquired ? '✓' : ''}
                            </span>
                            <div className="flex-1">
                              <strong className="text-stone-900">
                                {r.rank}. {r.title}
                              </strong>{' '}
                              <ActionBadges rank={r} variant="print" />
                              <span className="text-stone-700"> : {r.description}</span>
                            {r.companions && r.companions.length > 0 && (
                              <div className="mt-0.5 text-[6.5px] text-amber-950 font-mono bg-amber-50/70 p-0.5 rounded border border-amber-200">
                                {r.companions.map((comp, cIdx) => (
                                  <div key={cIdx}>
                                    <strong>🐾 {comp.name}</strong> {comp.category ? `(${comp.category}) ` : ''}
                                    {comp.hp ? `• PV: ${comp.hp} ` : ''}
                                    {comp.defense ? `• DEF: ${comp.defense} ` : ''}
                                    {comp.initiative ? `• Init: ${comp.initiative} ` : ''}
                                    {comp.attacks && comp.attacks.length > 0 && `• Atk: ${comp.attacks.map(a => `${a.name} [DM ${a.damage}]`).join(', ')}`}
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
                );
              })}

              {/* 2. Empty / Free Slot Cards up to 6 total (reinforces the 6 non-racial paths limit) */}
              {Array.from({ length: emptySlotsCount }).map((_, slotIdx) => {
                const slotNumber = learnedPaths.length + slotIdx + 1;
                const isLastSlot = slotNumber === 6;

                return (
                  <div
                    key={`empty-slot-${slotIdx}`}
                    className="h-full max-h-full border border-dashed border-stone-400 rounded overflow-hidden bg-stone-50/60 flex flex-col justify-between shadow-2xs"
                  >
                    <div className="bg-stone-600 text-white font-serif font-bold text-[9px] tracking-wider px-1.5 py-0.5 uppercase text-center flex-shrink-0">
                      <div>EMPLACEMENT LIBRE • VOIE {slotNumber} / 6</div>
                      <div className="text-[6.5px] font-sans font-normal opacity-90 tracking-normal -mt-0.5">
                        {isLastSlot ? 'NOUVELLE VOIE / VOIE DE PRESTIGE' : 'NOUVELLE VOIE DE PROFIL OU HYBRIDE'}
                      </div>
                    </div>
                    <div className="p-1.5 flex-1 flex flex-col justify-around text-[8px] text-stone-500">
                      {[1, 2, 3, 4, 5].map(rank => (
                        <div key={rank} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 border border-stone-400 rounded-2xs" />
                          <span className="font-semibold text-stone-700">Rang {rank} :</span>
                          <div className="flex-1 border-b border-stone-300 h-2.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Official Sheet Footer Line (Height: ~5mm) */}
            <div className="border-t border-stone-400 pt-0.5 flex items-center justify-between text-[7px] text-stone-500 flex-shrink-0">
              <span>Chroniques Oubliées Fantasy 2 • Voies & Spécialités</span>
              <span>Impression autorisée pour usage personnel uniquement - © Black Book Éditions</span>
            </div>
          </div>
        </div>
      </div>
  );
};
