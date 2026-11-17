import React from 'react';
import type {
  ActionRank,
  ArmorItem,
  CharacterSheet,
  CharacterWeaponInstance,
  ComputedCharacterStats,
  PathData,
  PeopleData,
  ProfileData,
} from '../../types/cof2';
import { PrintableCenterColumn } from './PrintableCenterColumn';
import { PrintableLeftColumn } from './PrintableLeftColumn';
import { PrintableVitalsColumn } from './PrintableVitalsColumn';

interface PrintablePage1Props {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  people?: PeopleData | null;
  profile?: ProfileData | null;
  secondaryProfile?: ProfileData | null;
  armor?: ArmorItem | null;
  shield?: ArmorItem | null;
  racialPath?: PathData | null;
  replacedRacial: { path: PathData; rank1: ActionRank } | null;
  filledWeapons: CharacterWeaponInstance[];
  emptyWeaponsCount: number;
}

export const PrintablePage1: React.FC<PrintablePage1Props> = ({
  character,
  stats,
  people,
  profile,
  secondaryProfile,
  armor,
  shield,
  racialPath,
  replacedRacial,
  filledWeapons,
  emptyWeaponsCount,
}) => {
  return (
    <div className="print-page flex flex-col justify-start font-sans select-text">
      <div className="w-full h-[288mm] max-h-[288mm] border-2 border-amber-800 p-1.5 flex flex-col justify-between bg-white overflow-hidden">
        <div className="w-full h-full border border-stone-700 p-1.5 flex flex-col justify-between overflow-hidden">
          {/* Header Block (Height: ~22mm) */}
          <div className="flex items-stretch justify-between gap-3 pb-1 border-b-2 border-amber-900 flex-shrink-0">
            <div className="w-44 flex flex-col justify-center text-center">
              <span className="font-serif font-black text-[11px] tracking-[0.2em] text-amber-900 uppercase">
                CHRONIQUES OUBLIÉES
              </span>
              <span className="font-serif font-extrabold text-base tracking-[0.28em] text-stone-900 uppercase -mt-0.5">
                FANTASY
              </span>
              <div className="w-20 h-0.5 bg-amber-700 mx-auto mt-0.5" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center border-2 border-stone-800 bg-amber-50/40 px-3 py-0.5 rounded">
              <span className="font-serif font-black text-lg text-stone-900 tracking-wide uppercase truncate max-w-full">
                {character.name || 'Héros sans nom'}
              </span>
              <span className="text-[8.5px] font-bold tracking-widest text-amber-900 uppercase -mt-0.5">
                NOM DU PERSONNAGE
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="border border-stone-700 px-2.5 py-0.5 text-center bg-white rounded">
                <div className="text-[7.5px] font-bold uppercase text-stone-600">
                  Joueur
                </div>
                <div className="text-xs font-semibold text-stone-900 truncate max-w-[90px]">
                  {character.playerName || '—'}
                </div>
              </div>

              <div className="w-12 h-12 border-2 border-amber-800 rounded-full flex flex-col items-center justify-center bg-amber-50 text-stone-900 shadow-sm flex-shrink-0">
                <span className="text-[7.5px] font-extrabold text-amber-900 uppercase leading-none">
                  NIV.
                </span>
                <span className="font-mono font-black text-xl leading-none text-stone-900">
                  {character.level}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Columns Main Body */}
          <div className="flex-1 grid grid-cols-12 gap-2 text-stone-900 py-1 overflow-hidden">
            <PrintableLeftColumn
              character={character}
              stats={stats}
              profile={profile}
              secondaryProfile={secondaryProfile}
            />
            <PrintableCenterColumn
              character={character}
              stats={stats}
              people={people}
              armor={armor}
              shield={shield}
              racialPath={racialPath}
              replacedRacial={replacedRacial}
              filledWeapons={filledWeapons}
              emptyWeaponsCount={emptyWeaponsCount}
            />
            <PrintableVitalsColumn character={character} stats={stats} />
          </div>

          {/* Official Sheet Footer Line */}
          <div className="border-t border-stone-400 pt-0.5 flex items-center justify-between text-[7px] text-stone-500 flex-shrink-0">
            <span>
              Chroniques Oubliées Fantasy 2 • Fiche de Héros Officielle
            </span>
            <span>
              Photocopie autorisée pour usage personnel uniquement - © Black Book Éditions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
