import React from 'react';
import type { CharacterSheet, ComputedCharacterStats } from '../../types/cof2';

interface PrintableVitalsColumnProps {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
}

export const PrintableVitalsColumn: React.FC<PrintableVitalsColumnProps> = ({
  character,
  stats,
}) => {
  return (
              <div className="col-span-3 flex flex-col justify-between gap-1 overflow-hidden">
                {/* PV */}
                <div className="border-2 border-red-900 rounded overflow-hidden bg-white text-center flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider py-0.5 uppercase">
                    POINTS DE VIGUEUR
                  </div>
                  <div className="p-1.5">
                    <div className="font-mono font-black text-2xl text-red-700 leading-none">
                      {character.currentHp ?? stats.maxHp}
                    </div>
                    <div className="text-[7.5px] font-extrabold uppercase text-stone-600 mt-0.5">
                      MAX : {stats.maxHp} PV
                    </div>
                  </div>
                </div>

                {/* PC */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white text-center flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider py-0.5 uppercase">
                    POINTS DE CHANCE
                  </div>
                  <div className="p-1">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <span className="font-mono font-black text-lg text-amber-900 leading-none">
                        {character.currentPc ?? stats.maxPc}
                      </span>
                      <span className="text-[7.5px] font-bold text-stone-600 uppercase">
                        / {stats.maxPc} MAX
                      </span>
                    </div>
                    <div className="text-[7px] text-stone-500 mb-1 font-semibold">
                      +10 à un test ou éviter un coup
                    </div>
                    {/* Diamond Checkboxes (2 rows of 6) */}
                    <div className="grid grid-cols-6 gap-1 px-1">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 mx-auto border rotate-45 ${
                            i < (character.currentPc ?? stats.maxPc)
                              ? 'border-amber-800 bg-amber-50'
                              : 'border-stone-300 bg-stone-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* DR */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white text-center flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider py-0.5 uppercase">
                    DÉS DE RÉCUPÉRATION
                  </div>
                  <div className="p-1">
                    <div className="flex items-center justify-center gap-2 mb-0.5">
                      <span className="font-mono font-black text-base text-blue-900 leading-none uppercase">
                        {stats.drDice}
                      </span>
                      <span className="font-mono font-black text-base text-stone-900 leading-none">
                        × {stats.maxDr}
                      </span>
                    </div>
                    <div className="text-[7px] text-stone-600 font-medium">
                      Restauration = ({stats.drDice} + {stats.finalStats.CON >= 0 ? `+${stats.finalStats.CON}` : stats.finalStats.CON}) PV
                    </div>
                  </div>
                </div>

                {/* PM */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white text-center flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider py-0.5 uppercase">
                    {stats.energyType === 'PE' ? "POINTS D'ÉGO" : "POINTS DE MANA"}
                  </div>
                  <div className="p-1">
                    <div className="font-mono font-black text-lg text-purple-900 leading-none">
                      {stats.maxPm > 0 ? (character.currentPm ?? stats.maxPm) : '—'}
                    </div>
                    <div className="text-[7.5px] font-bold uppercase text-stone-600 mt-0.5">
                      {stats.maxPm > 0 ? `MAX : ${stats.maxPm}` : 'Aucune magie'}
                    </div>
                  </div>
                </div>

                {/* Coins */}
                <div className="border border-stone-700 rounded overflow-hidden bg-white text-center flex-shrink-0">
                  <div className="bg-amber-800 text-white font-serif font-bold text-[9px] tracking-wider py-0.5 uppercase">
                    PIÈCES & BOURSE
                  </div>
                  <div className="p-1">
                    <div className="flex justify-around items-center text-[8.5px] font-mono font-bold text-stone-900">
                      <div>
                        <span className="text-amber-800">{character.coins.po}</span>{' '}
                        <span className="font-sans text-[7px] text-stone-600">PO</span>
                      </div>
                      <div>
                        <span className="text-stone-700">{character.coins.pa}</span>{' '}
                        <span className="font-sans text-[7px] text-stone-600">PA</span>
                      </div>
                      <div>
                        <span className="text-amber-900">{character.coins.pc}</span>{' '}
                        <span className="font-sans text-[7px] text-stone-600">PC</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tactical notes */}
                {stats.situationalNotes.length > 0 && (
                  <div className="border border-stone-700 rounded overflow-hidden bg-stone-50 flex-1 flex flex-col">
                    <div className="bg-stone-200 text-stone-800 font-serif font-bold text-[8px] tracking-wider px-1.5 py-0.5 uppercase">
                      RAPPELS TACTIQUES
                    </div>
                    <div className="p-1 space-y-0.5 text-[7px] text-stone-700 leading-tight flex-1">
                      {stats.situationalNotes.map((note, idx) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="font-bold text-amber-800">•</span>
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
  );
};
