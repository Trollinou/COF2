import React from 'react';
import { CharacterSheet, ComputedCharacterStats, PeopleData, ProfileData } from '../../types/cof2';
import { getProfileById } from '../../engine/rulesEngine';
import { Heart, Dices, Sparkles, Zap } from 'lucide-react';

interface HeroBannerProps {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  people?: PeopleData;
  profile?: ProfileData;
  updateCharacter: (partial: Partial<CharacterSheet>) => void;
  adjustHp: (amount: number) => void;
  adjustDr: (amount: number) => void;
  adjustPc: (amount: number) => void;
  adjustPm: (amount: number) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  character,
  stats,
  people,
  profile,
  updateCharacter,
  adjustHp,
  adjustDr,
  adjustPc,
  adjustPm,
}) => {
  return (
    <div className="bg-stone-900 border border-amber-900/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Identity & Badges */}
        <div className="lg:col-span-5 2xl:col-span-4 space-y-2">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={character.name}
              onChange={e => updateCharacter({ name: e.target.value })}
              className="font-serif font-bold text-2xl text-amber-200 bg-transparent border-b border-dashed border-stone-700 hover:border-amber-500 focus:border-amber-400 focus:outline-none transition w-full"
              placeholder="Nom du Héros"
            />
            <span className="bg-amber-500 text-stone-950 font-black text-sm px-2.5 py-1 rounded-full whitespace-nowrap shadow">
              Niv. {character.level}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-stone-400">
            <span className="text-amber-300 font-medium">{people?.name || 'Peuple inconnu'}</span>
            <span>•</span>
            <span className="text-amber-100 font-medium">
              {profile?.name || 'Profil inconnu'}
              {character.secondaryProfileId && ` / ${getProfileById(character.secondaryProfileId)?.name || character.secondaryProfileId}`}
            </span>
            {character.isHybrid ? (
              <span className="bg-indigo-950 text-indigo-200 px-2 py-0.5 rounded text-xs border border-indigo-700 font-semibold">
                Hybride
              </span>
            ) : (
              <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded text-xs border border-stone-700">
                {character.profileFamily ? `${profile?.family} (intégré : ${character.profileFamily})` : profile?.family}
              </span>
            )}
            {character.playerName && (
              <>
                <span>•</span>
                <span>Joueur: {character.playerName}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Resource Meters */}
        <div className="lg:col-span-7 2xl:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* PV */}
          <div className="bg-stone-950/80 border border-red-900/40 rounded-lg p-3 text-center relative flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-red-400 mb-1">
              <span className="flex items-center space-x-1">
                <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                <span>VIGUEUR (PV)</span>
              </span>
              <span className="text-stone-400 text-[10px]">Max {stats.maxHp}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-red-100 my-1">
              {character.currentHp !== undefined ? Math.min(character.currentHp, stats.maxHp) : stats.maxHp}
            </div>
            <div className="flex justify-center space-x-1">
              <button
                onClick={() => adjustHp(-5)}
                className="bg-stone-800 hover:bg-stone-700 text-red-400 px-1.5 py-0.5 rounded text-xs font-mono"
              >
                -5
              </button>
              <button
                onClick={() => adjustHp(-1)}
                className="bg-stone-800 hover:bg-stone-700 text-red-400 px-1.5 py-0.5 rounded text-xs font-mono"
              >
                -1
              </button>
              <button
                onClick={() => adjustHp(+1)}
                className="bg-stone-800 hover:bg-stone-700 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono"
              >
                +1
              </button>
              <button
                onClick={() => adjustHp(+5)}
                className="bg-stone-800 hover:bg-stone-700 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono"
              >
                +5
              </button>
            </div>
          </div>

          {/* DR */}
          <div className="bg-stone-950/80 border border-blue-900/40 rounded-lg p-3 text-center relative flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-400 mb-1">
              <span className="flex items-center space-x-1">
                <Dices className="w-3.5 h-3.5 text-blue-400" />
                <span>RÉCUP. (DR)</span>
              </span>
              <span className="text-stone-400 text-[10px] font-mono">{stats.drDice}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-blue-100 my-1">
              {character.currentDr !== undefined ? Math.min(character.currentDr, stats.maxDr) : stats.maxDr} / {stats.maxDr}
            </div>
            <div className="flex justify-center space-x-1">
              <button
                onClick={() => adjustDr(-1)}
                className="bg-stone-800 hover:bg-stone-700 text-blue-300 px-2 py-0.5 rounded text-xs font-mono"
              >
                -1
              </button>
              <button
                onClick={() => adjustDr(+1)}
                className="bg-stone-800 hover:bg-stone-700 text-blue-300 px-2 py-0.5 rounded text-xs font-mono"
              >
                +1
              </button>
            </div>
          </div>

          {/* PC */}
          <div className="bg-stone-950/80 border border-amber-900/40 rounded-lg p-3 text-center relative flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-1">
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>CHANCE (PC)</span>
              </span>
              <span className="text-stone-400 text-[10px]">Max {stats.maxPc}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-100 my-1">
              {character.currentPc !== undefined ? Math.min(character.currentPc, stats.maxPc) : stats.maxPc} / {stats.maxPc}
            </div>
            <div className="flex justify-center space-x-1">
              <button
                onClick={() => adjustPc(-1)}
                className="bg-stone-800 hover:bg-stone-700 text-amber-300 px-2 py-0.5 rounded text-xs font-mono"
              >
                -1
              </button>
              <button
                onClick={() => adjustPc(+1)}
                className="bg-stone-800 hover:bg-stone-700 text-amber-300 px-2 py-0.5 rounded text-xs font-mono"
              >
                +1
              </button>
            </div>
          </div>

          {/* PM */}
          <div className="bg-stone-950/80 border border-purple-900/40 rounded-lg p-3 text-center relative flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-400 mb-1">
              <span className="flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>{stats.energyType === 'PE' ? 'ÉGO (PE)' : 'MANA (PM)'}</span>
              </span>
              <span className="text-stone-400 text-[10px]">Max {stats.maxPm}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-purple-100 my-1">
              {stats.maxPm > 0 ? `${character.currentPm !== undefined ? Math.min(character.currentPm, stats.maxPm) : stats.maxPm} / ${stats.maxPm}` : '—'}
            </div>
            <div className="flex justify-center space-x-1">
              <button
                disabled={stats.maxPm === 0}
                onClick={() => adjustPm(-1)}
                className="bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-purple-300 px-2 py-0.5 rounded text-xs font-mono"
              >
                -1
              </button>
              <button
                disabled={stats.maxPm === 0}
                onClick={() => adjustPm(+1)}
                className="bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-purple-300 px-2 py-0.5 rounded text-xs font-mono"
              >
                +1
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

