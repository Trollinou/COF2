import React from 'react';
import type {
  ProfileData,
  PathData,
  ArmorItem,
  WeaponItem,
  StatCode,
  ProfileFamily,
  ShieldPermission,
} from '../../../../src/types/cof2.ts';
import { User, Shield, Sword, BookOpen } from 'lucide-react';

interface ProfileFormProps {
  profile: ProfileData;
  allPaths: PathData[];
  allArmors: ArmorItem[];
  allWeapons: WeaponItem[];
  onChange: (updated: ProfileData) => void;
}

const STATS: StatCode[] = ['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'];
const FAMILIES: ProfileFamily[] = ['Aventuriers', 'Combattants', 'Mages', 'Mystiques'];
const SHIELD_PERMS: ShieldPermission[] = ['none', 'small', 'any'];

export const ProfileForm: React.FC<ProfileFormProps> = ({
  profile,
  allPaths,
  allArmors,
  allWeapons,
  onChange,
}) => {
  const updateField = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    onChange({ ...profile, [field]: value });
  };

  const updatePathAt = (index: number, pathId: string) => {
    const nextPaths = [...(profile.paths || [])];
    while (nextPaths.length < 5) nextPaths.push('');
    nextPaths[index] = pathId;
    updateField('paths', nextPaths);
  };

  const togglePrimaryStat = (stat: StatCode) => {
    const current = profile.primaryStats || [];
    const next = current.includes(stat) ? current.filter((s: StatCode) => s !== stat) : [...current, stat];
    updateField('primaryStats', next);
  };

  const armorsOnly = allArmors.filter(a => a.type === 'armor');
  const shieldsOnly = allArmors.filter(a => a.type === 'shield');

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Identity Card */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-stone-100">Profil : {profile.name || '(Sans nom)'}</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono">
            {profile.id}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Identifiant (kebab-case)
            </label>
            <input
              type="text"
              value={profile.id}
              onChange={e => updateField('id', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Nom du Profil
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={e => updateField('name', e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Famille de Profil
            </label>
            <select
              value={profile.family}
              onChange={e => updateField('family', e.target.value as ProfileFamily)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            >
              {FAMILIES.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Accroche (Tagline)
            </label>
            <input
              type="text"
              value={profile.tagline || ''}
              onChange={e => updateField('tagline', e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Stats and HP */}
        <div className="pt-3 border-t border-stone-800 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">PV / Niveau</label>
            <input
              type="number"
              value={profile.hpPerLevel}
              onChange={e => updateField('hpPerLevel', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Dé de Vie (HD)</label>
            <input
              type="text"
              value={profile.hd || ''}
              onChange={e => updateField('hd', e.target.value)}
              placeholder="ex: d8"
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Bonus PC</label>
            <input
              type="number"
              value={profile.bonusPC || 0}
              onChange={e => updateField('bonusPC', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Bonus DR</label>
            <input
              type="number"
              value={profile.bonusDR || 0}
              onChange={e => updateField('bonusDR', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
              <input
                type="checkbox"
                checked={!!profile.hasMageBonus}
                onChange={e => updateField('hasMageBonus', e.target.checked)}
                className="rounded border-stone-700 text-amber-500 focus:ring-amber-500"
              />
              Bonus Mage (PM)
            </label>
          </div>
        </div>

        {/* Primary Stats Checkboxes */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wider">
            Caractéristiques Clés (Sélectionner les 2-3 stats principales)
          </label>
          <div className="flex flex-wrap gap-2">
            {STATS.map(stat => {
              const active = profile.primaryStats?.includes(stat);
              return (
                <button
                  key={stat}
                  type="button"
                  onClick={() => togglePrimaryStat(stat)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    active
                      ? 'bg-amber-600 text-stone-950 shadow'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {stat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5 Paths of the Profile */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-stone-100">Les 5 Voies du Profil</h3>
          </div>
          <span className="text-xs text-stone-400">Exactement 5 voies</span>
        </div>

        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map(idx => {
            const currentPathId = profile.paths?.[idx] || '';
            const pathObj = allPaths.find(p => p.id === currentPathId);

            return (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400">
                  {idx + 1}
                </span>
                <select
                  value={currentPathId}
                  onChange={e => updatePathAt(idx, e.target.value)}
                  className={`flex-1 bg-stone-950 border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 ${
                    currentPathId && !pathObj ? 'border-red-600 text-red-300' : 'border-stone-700 text-stone-100'
                  }`}
                >
                  <option value="">-- Sélectionner une voie --</option>
                  {allPaths.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) [{p.type}]
                    </option>
                  ))}
                </select>
                {pathObj && (
                  <span className="text-xs text-stone-400 px-2 py-1 bg-stone-800/80 rounded font-mono">
                    {pathObj.ranks?.length || 0} rangs
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipment Rules & Default Equipment */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
          <Shield className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-stone-100">Règles & Équipement de Départ</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Armure Max Autorisée</label>
            <select
              value={profile.equipmentRules?.maxArmorId || ''}
              onChange={e => {
                const nextVal = e.target.value || null;
                const rules = profile.equipmentRules || ({} as any);
                updateField('equipmentRules', { ...rules, maxArmorId: nextVal });
              }}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">Aucune (Tissu / Vêtements)</option>
              {armorsOnly.map(a => (
                <option key={a.id} value={a.id}>{a.name} (+{a.def} DEF)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Autorisation Bouclier</label>
            <select
              value={profile.equipmentRules?.shieldPermission || 'none'}
              onChange={e => {
                const rules = profile.equipmentRules || ({} as any);
                updateField('equipmentRules', { ...rules, shieldPermission: e.target.value as ShieldPermission });
              }}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            >
              {SHIELD_PERMS.map(p => (
                <option key={p} value={p}>{p === 'none' ? 'Aucun' : p === 'small' ? 'Petit bouclier' : 'Tous (grand bouclier)'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Armure de départ</label>
            <select
              value={profile.defaultEquipment?.armorId || ''}
              onChange={e => {
                const defEq = profile.defaultEquipment || { armorId: null, shieldId: null, defaultWeaponIds: [] };
                updateField('defaultEquipment', { ...defEq, armorId: e.target.value || null });
              }}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">Aucune</option>
              {armorsOnly.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Bouclier de départ</label>
            <select
              value={profile.defaultEquipment?.shieldId || ''}
              onChange={e => {
                const defEq = profile.defaultEquipment || { armorId: null, shieldId: null, defaultWeaponIds: [] };
                updateField('defaultEquipment', { ...defEq, shieldId: e.target.value || null });
              }}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">Aucun</option>
              {shieldsOnly.map(s => (
                <option key={s.id} value={s.id}>{s.name} (+{s.def} DEF)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">Armes de départ (IDs)</label>
            <select
              multiple
              value={profile.defaultEquipment?.defaultWeaponIds || []}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                const defEq = profile.defaultEquipment || { armorId: null, shieldId: null, defaultWeaponIds: [] };
                updateField('defaultEquipment', { ...defEq, defaultWeaponIds: selected });
              }}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 h-28 focus:outline-none focus:border-amber-500"
            >
              {allWeapons.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
