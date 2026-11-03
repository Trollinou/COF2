import React from 'react';
import type { PeopleData, PathData, ArmorItem, WeaponItem } from '../../../../src/types/cof2.ts';
import { Users, BookOpen, Shield } from 'lucide-react';

interface PeopleFormProps {
  people: PeopleData;
  allPaths: PathData[];
  allArmors: ArmorItem[];
  allWeapons: WeaponItem[];
  onChange: (updated: PeopleData) => void;
}

export const PeopleForm: React.FC<PeopleFormProps> = ({
  people,
  allPaths,
  allArmors,
  allWeapons,
  onChange,
}) => {
  const updateField = <K extends keyof PeopleData>(field: K, value: PeopleData[K]) => {
    onChange({ ...people, [field]: value });
  };

  const racialPaths = allPaths.filter(p => p.type === 'racial');

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Identity Card */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-stone-100">Peuple : {people.name || '(Sans nom)'}</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono">
            {people.id}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Identifiant (kebab-case)
            </label>
            <input
              type="text"
              value={people.id}
              onChange={e => updateField('id', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Nom du Peuple
            </label>
            <input
              type="text"
              value={people.name}
              onChange={e => updateField('name', e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1">Description / Lore</label>
          <textarea
            rows={3}
            value={people.description || ''}
            onChange={e => updateField('description', e.target.value)}
            className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Racial Paths */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-stone-100">Voies Raciales COF2</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">
              Voie Raciale par Défaut (`racialPathId`)
            </label>
            <select
              value={people.racialPathId || ''}
              onChange={e => updateField('racialPathId', e.target.value || null)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">Aucune</option>
              {racialPaths.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">
              Voies Raciales Sélectionnables (si choix multiples)
            </label>
            <select
              multiple
              value={people.selectableRacialPaths || []}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                updateField('selectableRacialPaths', selected.length > 0 ? selected : undefined);
              }}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 h-28 focus:outline-none focus:border-amber-500"
            >
              {racialPaths.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Physical & Morphological Attributes */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
        <h3 className="text-base font-bold text-stone-100 border-b border-stone-800 pb-3">
          Morphologie & Données Physiques
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Taille</label>
            <input
              type="text"
              value={people.heightRange || ''}
              onChange={e => updateField('heightRange', e.target.value)}
              placeholder="ex: 1m60 - 1m90"
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Poids</label>
            <input
              type="text"
              value={people.weightRange || ''}
              onChange={e => updateField('weightRange', e.target.value)}
              placeholder="ex: 60 - 90 kg"
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Âge de départ</label>
            <input
              type="text"
              value={people.startingAge || ''}
              onChange={e => updateField('startingAge', e.target.value)}
              placeholder="ex: 18 ans"
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Espérance de vie</label>
            <input
              type="text"
              value={people.lifeExpectancy || ''}
              onChange={e => updateField('lifeExpectancy', e.target.value)}
              placeholder="ex: 80 ans"
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1">Langues par défaut</label>
          <input
            type="text"
            value={people.defaultLanguages || ''}
            onChange={e => updateField('defaultLanguages', e.target.value)}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>
    </div>
  );
};
