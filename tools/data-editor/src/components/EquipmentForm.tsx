import React, { useState } from 'react';
import type { ArmorItem, WeaponItem, WeaponTag } from '../../../../src/types/cof2.ts';
import { Shield, Sword, ArrowUp, ArrowDown, Plus, Trash2, ListOrdered } from 'lucide-react';

interface EquipmentData {
  armorHierarchy: string[];
  armors: ArmorItem[];
  weapons: WeaponItem[];
  startingAdventurerKit?: any[];
}

interface EquipmentFormProps {
  equipment: EquipmentData;
  selectedSubId?: string;
  selectedSubType?: 'armor' | 'weapon' | 'hierarchy';
  onChange: (updated: EquipmentData) => void;
}

const WEAPON_TAGS: WeaponTag[] = [
  'legere', 'lancer', 'allonge', 'deux-mains', 'polyvalente',
  'epee', 'sabre', 'hache', 'marteau', 'masse', 'lance',
  'baton', 'arc', 'arbalete', 'poudre', 'fronde', 'mains-nues',
  'escrime', 'duelliste', 'danseur', 'outil'
];

export const EquipmentForm: React.FC<EquipmentFormProps> = ({
  equipment,
  selectedSubId,
  selectedSubType = 'armor',
  onChange,
}) => {
  const [tab, setTab] = useState<'armors' | 'weapons' | 'hierarchy'>(
    selectedSubType === 'weapon' ? 'weapons' : selectedSubType === 'hierarchy' ? 'hierarchy' : 'armors'
  );

  const moveHierarchy = (index: number, direction: 'up' | 'down') => {
    const list = [...(equipment.armorHierarchy || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    onChange({ ...equipment, armorHierarchy: list });
  };

  const currentArmor = equipment.armors?.find(a => a.id === selectedSubId) || equipment.armors?.[0];
  const currentWeapon = equipment.weapons?.find(w => w.id === selectedSubId) || equipment.weapons?.[0];

  const updateArmor = (armorId: string, patch: Partial<ArmorItem>) => {
    const nextArmors = (equipment.armors || []).map(a => a.id === armorId ? { ...a, ...patch } : a);
    onChange({ ...equipment, armors: nextArmors });
  };

  const updateWeapon = (weaponId: string, patch: Partial<WeaponItem>) => {
    const nextWeapons = (equipment.weapons || []).map(w => w.id === weaponId ? { ...w, ...patch } : w);
    onChange({ ...equipment, weapons: nextWeapons });
  };

  const toggleWeaponTag = (weapon: WeaponItem, tag: WeaponTag) => {
    const tags = weapon.tags || [];
    const nextTags = tags.includes(tag) ? tags.filter((t: WeaponTag) => t !== tag) : [...tags, tag];
    updateWeapon(weapon.id, { tags: nextTags });
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Sub Navigation */}
      <div className="flex items-center gap-3 border-b border-stone-800 pb-3">
        <button
          onClick={() => setTab('armors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'armors' ? 'bg-amber-600 text-stone-950 shadow' : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
          }`}
        >
          <Shield className="w-4 h-4" /> Armures & Boucliers ({equipment.armors?.length || 0})
        </button>
        <button
          onClick={() => setTab('weapons')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'weapons' ? 'bg-amber-600 text-stone-950 shadow' : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
          }`}
        >
          <Sword className="w-4 h-4" /> Armes ({equipment.weapons?.length || 0})
        </button>
        <button
          onClick={() => setTab('hierarchy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'hierarchy' ? 'bg-amber-600 text-stone-950 shadow' : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
          }`}
        >
          <ListOrdered className="w-4 h-4" /> Hiérarchie d'Armures ({equipment.armorHierarchy?.length || 0})
        </button>
      </div>

      {/* Armors Tab */}
      {tab === 'armors' && currentArmor && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" /> {currentArmor.name}
            </h3>
            <span className="text-xs px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono">
              {currentArmor.id}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Identifiant</label>
              <input
                type="text"
                value={currentArmor.id}
                onChange={e => updateArmor(currentArmor.id, { id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm font-mono text-amber-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Nom</label>
              <input
                type="text"
                value={currentArmor.name}
                onChange={e => updateArmor(currentArmor.id, { name: e.target.value })}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Bonus de Défense (+DEF)</label>
              <input
                type="number"
                value={currentArmor.def}
                onChange={e => updateArmor(currentArmor.id, { def: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Bonus Max AGI (null si illimité)</label>
              <input
                type="number"
                value={currentArmor.maxAgi === null ? '' : currentArmor.maxAgi}
                onChange={e => updateArmor(currentArmor.id, { maxAgi: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                placeholder="Illimité"
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Type de pièce</label>
              <select
                value={currentArmor.type}
                onChange={e => updateArmor(currentArmor.id, { type: e.target.value as 'armor' | 'shield' })}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100"
              >
                <option value="armor">Armure corporelle</option>
                <option value="shield">Bouclier</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Prix</label>
              <input
                type="text"
                value={currentArmor.price || ''}
                onChange={e => updateArmor(currentArmor.id, { price: e.target.value })}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Weapons Tab */}
      {tab === 'weapons' && currentWeapon && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Sword className="w-5 h-5 text-amber-500" /> {currentWeapon.name}
            </h3>
            <span className="text-xs px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono">
              {currentWeapon.id}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Identifiant</label>
              <input
                type="text"
                value={currentWeapon.id}
                onChange={e => updateWeapon(currentWeapon.id, { id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm font-mono text-amber-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Nom</label>
              <input
                type="text"
                value={currentWeapon.name}
                onChange={e => updateWeapon(currentWeapon.id, { name: e.target.value })}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Catégorie</label>
              <select
                value={currentWeapon.category}
                onChange={e => updateWeapon(currentWeapon.id, { category: e.target.value as any })}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100"
              >
                <option value="contact">Contact</option>
                <option value="distance">Distance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Dégâts (formule dice)</label>
              <input
                type="text"
                value={currentWeapon.damage || ''}
                onChange={e => updateWeapon(currentWeapon.id, { damage: e.target.value })}
                placeholder="ex: 1d6, 1d8+1"
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Mains (1 ou 2)</label>
              <input
                type="number"
                value={currentWeapon.hands || 1}
                onChange={e => updateWeapon(currentWeapon.id, { hands: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Portée (si distance)</label>
              <input
                type="text"
                value={currentWeapon.range || ''}
                onChange={e => updateWeapon(currentWeapon.id, { range: e.target.value })}
                placeholder="ex: 30 m, Contact"
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wider">
              Tags d'Arme COF2 (Sélectionner les propriétés applicables)
            </label>
            <div className="flex flex-wrap gap-2">
              {WEAPON_TAGS.map(t => {
                const active = currentWeapon.tags?.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleWeaponTag(currentWeapon, t)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                      active ? 'bg-amber-600 text-stone-950 font-bold' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                    }`}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hierarchy Tab */}
      {tab === 'hierarchy' && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-stone-800 pb-3">
            <h3 className="text-base font-bold text-stone-100">Ordre de Maîtrise des Armures (De la plus légère à la plus lourde)</h3>
            <p className="text-xs text-stone-400 mt-1">
              Lorsqu'un profil autorise une armure max (ex: cuir-renforce), le moteur autorise automatiquement toutes les armures situées avant dans cette liste.
            </p>
          </div>

          <div className="space-y-2">
            {(equipment.armorHierarchy || []).map((id, idx) => {
              const armor = equipment.armors?.find(a => a.id === id);
              return (
                <div
                  key={id}
                  className="p-3 bg-stone-950 border border-stone-800 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-stone-200">{armor?.name || id}</span>
                    <span className="text-xs text-stone-400 font-mono">({id})</span>
                    {armor && <span className="text-xs text-amber-400 font-bold">+{armor.def} DEF</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => moveHierarchy(idx, 'up')}
                      className="p-1 text-stone-400 hover:text-stone-100 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      disabled={idx === equipment.armorHierarchy.length - 1}
                      onClick={() => moveHierarchy(idx, 'down')}
                      className="p-1 text-stone-400 hover:text-stone-100 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
