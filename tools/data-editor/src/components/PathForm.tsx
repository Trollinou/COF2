import React, { useState } from 'react';
import type { PathData, ActionRank, WeaponItem, ProfileFamily } from '../../../../src/types/cof2.ts';
import { Plus, Trash2, ChevronDown, ChevronRight, Shield, Zap, BookOpen } from 'lucide-react';
import { ModifiersBuilder } from './ModifiersBuilder';

interface PathFormProps {
  path: PathData;
  allWeapons: WeaponItem[];
  onChange: (updated: PathData) => void;
}

const ACTION_TYPES: ActionRank['actionType'][] = ['Action', 'Limitée', 'Attaque', 'Mouvement', 'Gratuite'];
const PATH_TYPES: PathData['type'][] = ['profile', 'racial', 'generic', 'prestige', 'domain'];
const FAMILIES: ProfileFamily[] = ['Aventuriers', 'Combattants', 'Mages', 'Mystiques'];

export const PathForm: React.FC<PathFormProps> = ({ path, allWeapons, onChange }) => {
  const [openRank, setOpenRank] = useState<number>(1);

  const updateField = <K extends keyof PathData>(field: K, value: PathData[K]) => {
    onChange({ ...path, [field]: value });
  };

  const updateRank = (index: number, patch: Partial<ActionRank>) => {
    const nextRanks = [...(path.ranks || [])];
    nextRanks[index] = { ...nextRanks[index], ...patch };
    updateField('ranks', nextRanks);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Header Info */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-stone-100">Voie : {path.name || '(Sans nom)'}</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono">
            {path.id}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Identifiant (kebab-case)
            </label>
            <input
              type="text"
              value={path.id}
              onChange={e => updateField('id', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Nom de la Voie
            </label>
            <input
              type="text"
              value={path.name}
              onChange={e => updateField('name', e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Type de Voie
            </label>
            <select
              value={path.type}
              onChange={e => updateField('type', e.target.value as PathData['type'])}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            >
              {PATH_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Symbole / Icône (ex: ⚔️, 🛡️, 🏹)
            </label>
            <input
              type="text"
              value={path.symbol || ''}
              onChange={e => updateField('symbol', e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {path.type === 'profile' && (
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
                Profil Propriétaire (optionnel)
              </label>
              <input
                type="text"
                value={path.owner || ''}
                onChange={e => updateField('owner', e.target.value || undefined)}
                placeholder="ex: barbare, barde..."
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {path.type === 'prestige' && (
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
                Restriction de Famille
              </label>
              <select
                value={path.familyRestriction || 'All'}
                onChange={e => updateField('familyRestriction', (e.target.value === 'All' ? 'All' : e.target.value) as any)}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="All">Toutes familles ('All')</option>
                {FAMILIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Domaine / Divinité if domain */}
        {path.type === 'domain' && (
          <div className="pt-3 border-t border-stone-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
                Divinité associée
              </label>
              <input
                type="text"
                value={path.deity || ''}
                onChange={e => updateField('deity', e.target.value || undefined)}
                placeholder="ex: Céres, Gorrim..."
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
                Titre du Domaine
              </label>
              <input
                type="text"
                value={path.domainTitle || ''}
                onChange={e => updateField('domainTitle', e.target.value || undefined)}
                placeholder="ex: Domaine de la Guerre..."
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
                Arme Sacrée (texte)
              </label>
              <input
                type="text"
                value={path.sacredWeapon || ''}
                onChange={e => updateField('sacredWeapon', e.target.value || undefined)}
                placeholder="ex: Épée longue"
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
                Armes Sacrées (IDs liées)
              </label>
              <select
                multiple
                value={path.sacredWeaponIds || []}
                onChange={e => {
                  const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                  updateField('sacredWeaponIds', selected.length > 0 ? selected : undefined);
                }}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 h-24 focus:outline-none focus:border-amber-500"
              >
                {allWeapons.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 5 Ranks Accordion */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Les 5 Rangs de la Voie
        </h4>

        {(path.ranks || []).map((rank: ActionRank, idx: number) => {
          const rankNum = idx + 1;
          const isOpen = openRank === rankNum;

          return (
            <div
              key={rankNum}
              className={`border rounded-xl transition-all ${
                isOpen ? 'bg-stone-900/90 border-amber-600/60 shadow-lg' : 'bg-stone-900/40 border-stone-800 hover:border-stone-700'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenRank(isOpen ? 0 : rankNum)}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-amber-950 border border-amber-700 flex items-center justify-center text-xs font-bold text-amber-300">
                    {rankNum}
                  </span>
                  <div>
                    <span className="font-semibold text-stone-100">{rank.title || `Rang ${rankNum}`}</span>
                    <span className="ml-3 text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                      {rank.actionType}
                    </span>
                    {rank.isSpell && (
                      <span className="ml-1.5 text-xs px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300">
                        Sort
                      </span>
                    )}
                    {rank.isPassive && (
                      <span className="ml-1.5 text-xs px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300">
                        Passif
                      </span>
                    )}
                  </div>
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-2 border-t border-stone-800/80 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-400 mb-1">Titre de la capacité</label>
                      <input
                        type="text"
                        value={rank.title}
                        onChange={e => updateRank(idx, { title: e.target.value })}
                        className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-400 mb-1">Type d'action</label>
                      <select
                        value={rank.actionType}
                        onChange={e => updateRank(idx, { actionType: e.target.value as ActionRank['actionType'] })}
                        className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                      >
                        {ACTION_TYPES.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="checkbox"
                        checked={!!rank.isSpell}
                        onChange={e => updateRank(idx, { isSpell: e.target.checked })}
                        className="rounded border-stone-700 text-amber-500 focus:ring-amber-500"
                      />
                      Est un sort (PM)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="checkbox"
                        checked={!!rank.isPassive}
                        onChange={e => updateRank(idx, { isPassive: e.target.checked })}
                        className="rounded border-stone-700 text-amber-500 focus:ring-amber-500"
                      />
                      Capacité passive permanente
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                      <input
                        type="checkbox"
                        checked={!!rank.isAttack}
                        onChange={e => updateRank(idx, { isAttack: e.target.checked })}
                        className="rounded border-stone-700 text-amber-500 focus:ring-amber-500"
                      />
                      Attaque spéciale
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Description complète</label>
                    <textarea
                      rows={4}
                      value={rank.description}
                      onChange={e => updateRank(idx, { description: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-sans leading-relaxed"
                    />
                  </div>

                  {/* Modifiers V2 Declarative Builder */}
                  <ModifiersBuilder
                    modifiers={rank.modifiers}
                    rank={rank}
                    onChange={mod => updateRank(idx, { modifiers: mod })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
