import React from 'react';
import { CompanionStatBlock, StatCode } from '../../types/cof2';
import { PawPrint, Shield, Heart, Zap, Swords, Sparkles } from 'lucide-react';

interface CompanionCardProps {
  companion: CompanionStatBlock;
  compact?: boolean;
}

const STAT_ORDER: StatCode[] = ['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'];

export const CompanionCard: React.FC<CompanionCardProps> = ({ companion, compact = false }) => {
  return (
    <div className="bg-stone-950/80 border border-amber-800/40 rounded-xl p-3.5 my-2.5 shadow-lg space-y-2.5 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-900/30 pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-amber-950/80 border border-amber-700/50 flex items-center justify-center text-amber-300">
            <PawPrint className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-amber-200 text-sm tracking-wide">
              {companion.name}
            </h4>
            {companion.category && (
              <span className="text-[10px] text-stone-400 font-sans uppercase tracking-wider block">
                {companion.category}
              </span>
            )}
          </div>
        </div>

        {/* Vital stats badges: HP / DEF / Init */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          {companion.hp && (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-red-950/80 text-red-200 border border-red-800/50 font-bold" title="Points de vie / vigueur">
              <Heart className="w-3 h-3 text-red-400 inline" />
              <span>{companion.hp}</span>
            </span>
          )}
          {companion.defense && (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-950/80 text-blue-200 border border-blue-800/50 font-bold" title="Défense">
              <Shield className="w-3 h-3 text-blue-400 inline" />
              <span>DEF {companion.defense}</span>
            </span>
          )}
          {companion.initiative && (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-950/80 text-amber-200 border border-amber-800/50 font-bold" title="Initiative">
              <Zap className="w-3 h-3 text-amber-400 inline" />
              <span>Init {companion.initiative}</span>
            </span>
          )}
        </div>
      </div>

      {/* 7 Characteristics Grid */}
      {companion.stats && (
        <div className="grid grid-cols-7 gap-1 bg-stone-900/60 p-1.5 rounded-lg border border-stone-800/80 text-center">
          {STAT_ORDER.map(st => {
            const val = companion.stats?.[st];
            return (
              <div key={st} className="flex flex-col">
                <span className="text-[9px] font-semibold text-stone-400">{st}</span>
                <span className="font-mono font-bold text-xs text-amber-100">
                  {val ?? '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Attacks */}
      {companion.attacks && companion.attacks.length > 0 && (
        <div className="space-y-1 bg-stone-900/40 p-2 rounded-lg border border-stone-800/60">
          <div className="text-[10px] font-semibold text-amber-400/90 uppercase tracking-wider flex items-center space-x-1">
            <Swords className="w-3 h-3 text-amber-400" />
            <span>Attaques</span>
          </div>
          <div className="space-y-1">
            {companion.attacks.map((atk, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between text-[11px] text-stone-300">
                <span className="font-semibold text-stone-200">{atk.name}</span>
                <div className="font-mono space-x-2 text-stone-300">
                  {atk.attackBonus && (
                    <span className="text-amber-300">[{atk.attackBonus}]</span>
                  )}
                  <span className="text-rose-300 font-bold">DM {atk.damage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special features & notes */}
      {companion.specialFeatures && companion.specialFeatures.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-stone-800/50">
          <div className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Capacités & Pouvoirs</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-stone-300 space-y-0.5 leading-relaxed">
            {companion.specialFeatures.map((feat, idx) => (
              <li key={idx} className="text-stone-300">
                {feat}
              </li>
            ))}
          </ul>
        </div>
      )}

      {companion.notes && companion.notes.length > 0 && (
        <div className="text-[10px] text-stone-400 italic pt-1">
          {companion.notes.map((n, idx) => (
            <p key={idx}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
};

