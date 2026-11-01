import React from 'react';
import { ComputedCharacterStats } from '../../types/cof2';
import { Shield, Zap, Swords, Crosshair, Wand2 } from 'lucide-react';

interface CombatDefensesCardProps {
  stats: ComputedCharacterStats;
}

export const CombatDefensesCard: React.FC<CombatDefensesCardProps> = ({ stats }) => {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow space-y-3">
      <h3 className="font-serif font-bold text-amber-200 text-base border-b border-stone-800 pb-2">
        Combat & Défenses
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Defense */}
        <div className="bg-stone-950/70 border border-stone-800 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center space-x-1 text-xs text-amber-300 font-semibold mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>DÉFENSE</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-100 font-mono">
            {stats.defense}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            10 + {stats.defenseStat || 'AGI'}(
            {stats.effectiveAgi >= 0 ? `+${stats.effectiveAgi}` : stats.effectiveAgi}
            {stats.defenseStatSource ? ` [${stats.defenseStatSource}]` : ''})
            {stats.armorDefense > 0 && ` + Armure(+${stats.armorDefense})`}
            {stats.shieldDefense > 0 && ` + Bouclier(+${stats.shieldDefense})`}
            {stats.pathBonusDefense > 0 && ` + Voies(+${stats.pathBonusDefense})`}
          </div>
        </div>

        {/* Initiative */}
        <div className="bg-stone-950/70 border border-stone-800 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center space-x-1 text-xs text-amber-300 font-semibold mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>INITIATIVE</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-100 font-mono">
            {stats.initiative}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            10 + PER({stats.finalStats.PER >= 0 ? `+${stats.finalStats.PER}` : stats.finalStats.PER})
            {stats.pathBonusInitiative > 0 && ` + Voies(+${stats.pathBonusInitiative})`}
          </div>
        </div>
      </div>

      {/* Attack values */}
      <div className="space-y-2 pt-2 border-t border-stone-800">
        <div className="flex items-center justify-between text-xs bg-stone-950/40 p-2 rounded border border-stone-800">
          <div className="flex items-center space-x-2 text-stone-300">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>Attaque au Contact :</span>
          </div>
          <div className="font-mono font-bold text-amber-300">
            d20 {stats.attacks.contact >= 0 ? `+ ${stats.attacks.contact}` : `- ${Math.abs(stats.attacks.contact)}`}
            <span className="text-stone-500 font-normal ml-1 text-[10px]">
              (Niv + {stats.contactAttackStat || 'FOR'}
              {stats.contactAttackStatSource ? ` [${stats.contactAttackStatSource}]` : ''}
              {stats.pathBonusAttacks.contact > 0 ? ` +${stats.pathBonusAttacks.contact} voie` : ''})
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs bg-stone-950/40 p-2 rounded border border-stone-800">
          <div className="flex items-center space-x-2 text-stone-300">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span>Attaque à Distance :</span>
          </div>
          <div className="font-mono font-bold text-emerald-300">
            d20 {stats.attacks.distance >= 0 ? `+ ${stats.attacks.distance}` : `- ${Math.abs(stats.attacks.distance)}`}
            <span className="text-stone-500 font-normal ml-1 text-[10px]">
              (Niv + {stats.distanceAttackStat || 'AGI'}
              {stats.distanceAttackStatSource ? ` [${stats.distanceAttackStatSource}]` : ''}
              {stats.pathBonusAttacks.distance > 0 ? ` +${stats.pathBonusAttacks.distance} voie` : ''})
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs bg-stone-950/40 p-2 rounded border border-stone-800">
          <div className="flex items-center space-x-2 text-stone-300">
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Attaque Magique :</span>
          </div>
          <div className="font-mono font-bold text-purple-300">
            d20 {stats.attacks.magique >= 0 ? `+ ${stats.attacks.magique}` : `- ${Math.abs(stats.attacks.magique)}`}
            <span className="text-stone-500 font-normal ml-1 text-[10px]">
              (Niv + VOL{stats.pathBonusAttacks.magique > 0 ? ` +${stats.pathBonusAttacks.magique} voie` : ''})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

