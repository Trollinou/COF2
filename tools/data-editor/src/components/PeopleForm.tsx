import React, { useState } from 'react';
import type {
  PeopleData,
  PathData,
  ArmorItem,
  WeaponItem,
  StatCode,
  BookSource,
  PeopleEquipmentRules,
} from '../../../../src/types/cof2.ts';
import {
  Users,
  BookOpen,
  Shield,
  Sparkles,
  Plus,
  Trash2,
  FileText,
  Bookmark,
  Sword,
  MessageSquare,
} from 'lucide-react';

interface PeopleFormProps {
  people: PeopleData;
  allPaths: PathData[];
  allArmors: ArmorItem[];
  allWeapons: WeaponItem[];
  onChange: (updated: PeopleData) => void;
}

const STATS: StatCode[] = ['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'];

export const PeopleForm: React.FC<PeopleFormProps> = ({
  people,
  allPaths,
  allArmors,
  allWeapons,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'equipment' | 'lore' | 'names'>('stats');

  const updateField = <K extends keyof PeopleData>(field: K, value: PeopleData[K]) => {
    onChange({ ...people, [field]: value });
  };

  const racialPaths = allPaths.filter(p => p.type === 'racial');

  // Bonus Options manipulation
  const updateBonusGroup = (groupIndex: number, stat: StatCode) => {
    const nextBonus = [...(people.bonusOptions || [])];
    const group = nextBonus[groupIndex] || [];
    const exists = group.includes(stat);
    const nextGroup = exists ? group.filter(s => s !== stat) : [...group, stat];
    nextBonus[groupIndex] = nextGroup;
    updateField('bonusOptions', nextBonus);
  };

  const addBonusGroup = () => {
    const nextBonus = [...(people.bonusOptions || []), ['FOR']];
    updateField('bonusOptions', nextBonus);
  };

  const removeBonusGroup = (groupIndex: number) => {
    const nextBonus = (people.bonusOptions || []).filter((_, i) => i !== groupIndex);
    updateField('bonusOptions', nextBonus);
  };

  // Malus Options manipulation
  const updateMalusGroup = (groupIndex: number, stat: StatCode) => {
    const nextMalus = [...(people.malusOptions || [])];
    const group = nextMalus[groupIndex] || [];
    const exists = group.includes(stat);
    const nextGroup = exists ? group.filter(s => s !== stat) : [...group, stat];
    nextMalus[groupIndex] = nextGroup;
    updateField('malusOptions', nextMalus);
  };

  const addMalusGroup = () => {
    const nextMalus = [...(people.malusOptions || []), ['FOR']];
    updateField('malusOptions', nextMalus);
  };

  const removeMalusGroup = (groupIndex: number) => {
    const nextMalus = (people.malusOptions || []).filter((_, i) => i !== groupIndex);
    updateField('malusOptions', nextMalus);
  };

  // Equipment Rules helpers
  const updateEquipmentRule = <K extends keyof PeopleEquipmentRules>(
    field: K,
    val: PeopleEquipmentRules[K]
  ) => {
    const current = people.equipmentRules || {};
    updateField('equipmentRules', { ...current, [field]: val });
  };

  // Names helper
  const parseNamesText = (text: string): string[] => {
    return text
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  // Synchronize Reperes Markdown
  const generateReperes = () => {
    const lines = [
      `**Âge de départ :** ${people.startingAge || '—'}`,
      '',
      `**Espérance de vie :** ${people.lifeExpectancy || '—'}`,
      '',
      `**Taille :** ${people.heightRange || '—'}`,
      '',
      `**Poids :** ${people.weightRange || '—'}`,
      '',
      `**Traits :** ${people.physicalTraits || '—'}`,
    ];
    updateField('reperes', lines.join('\n'));
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Identity Card Header */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-stone-100">Peuple : {people.name || '(Sans nom)'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono">
              {people.id}
            </span>
            <span className="text-xs px-2.5 py-1 rounded bg-stone-800 border border-stone-700 text-stone-300 font-mono uppercase">
              {people.source || 'base'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wider">
              Ouvrage Source
            </label>
            <select
              value={people.source || 'base'}
              onChange={e => updateField('source', e.target.value as BookSource)}
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            >
              <option value="base">Livre de Base (base)</option>
              <option value="compagnon">Compagnon (compagnon)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-stone-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'stats'
              ? 'bg-amber-600 text-stone-950 shadow'
              : 'bg-stone-900/80 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Caractéristiques & Voies</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('equipment')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'equipment'
              ? 'bg-amber-600 text-stone-950 shadow'
              : 'bg-stone-900/80 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>2. Équipement & Taille {people.equipmentRules ? '(Règles actives)' : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lore')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'lore'
              ? 'bg-amber-600 text-stone-950 shadow'
              : 'bg-stone-900/80 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. Lore, Morphologie & RP</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('names')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'names'
              ? 'bg-amber-600 text-stone-950 shadow'
              : 'bg-stone-900/80 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>4. Banque de Noms</span>
        </button>
      </div>

      {/* TAB 1: CARACTÉRISTIQUES & VOIES RACIALES */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Bonus Options (+1) */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div>
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>+1</span> Bonus Racial de Caractéristique (`bonusOptions`)
                </h4>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Chaque groupe accorde un bonus de <strong>+1</strong>. Si plusieurs caractéristiques sont cochées, le joueur choisira <strong>une seule</strong> caractéristique parmi cette liste (ex: <em>+1 INT ou PER</em> pour le Gnome).
                </p>
              </div>
              <button
                type="button"
                onClick={addBonusGroup}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/70"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter un choix +1
              </button>
            </div>

            <div className="space-y-3">
              {(people.bonusOptions || []).length === 0 ? (
                <div className="text-xs text-stone-500 italic py-2">
                  Aucun bonus racial défini (ex: peuples neutres).
                </div>
              ) : (
                people.bonusOptions.map((group, gIdx) => {
                  const summaryText =
                    group.length === 0
                      ? 'Aucune caractéristique sélectionnée'
                      : group.length === STATS.length
                      ? '+1 à n\'importe quelle caractéristique (au choix libre)'
                      : group.length === 1
                      ? `Fixe : +1 ${group[0]}`
                      : `Au choix : +1 ${group.join(' ou +1 ')}`;

                  return (
                    <div
                      key={gIdx}
                      className="p-3 bg-stone-950/70 border border-emerald-950/80 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            Bonus {gIdx + 1} (+1) :
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-200">
                            {summaryText}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeBonusGroup(gIdx)}
                          className="text-stone-500 hover:text-red-400 p-1"
                          title="Supprimer ce groupe de bonus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-stone-400 mr-1 uppercase font-semibold">
                          Cocher les options éligibles :
                        </span>
                        {STATS.map(stat => {
                          const active = group.includes(stat);
                          return (
                            <button
                              key={stat}
                              type="button"
                              onClick={() => updateBonusGroup(gIdx, stat)}
                              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                active
                                  ? 'bg-emerald-600 text-stone-950 shadow-md scale-105 ring-2 ring-emerald-400'
                                  : 'bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                              }`}
                            >
                              {active ? `✓ ${stat}` : stat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Malus Options (-1) */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div>
                <h4 className="text-sm font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>-1</span> Malus Racial de Caractéristique (`malusOptions`)
                </h4>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Chaque groupe applique un malus de <strong>-1</strong>. Si plusieurs caractéristiques sont cochées, le joueur choisit celle qui reçoit le malus (ex: <em>-1 INT ou CHA</em> pour le Demi-Orque).
                </p>
              </div>
              <button
                type="button"
                onClick={addMalusGroup}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-red-950/70 border border-red-800/80 text-red-300 hover:bg-red-900/70"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter un choix -1
              </button>
            </div>

            <div className="space-y-3">
              {(people.malusOptions || []).length === 0 ? (
                <div className="text-xs text-stone-500 italic py-2">
                  Aucun malus racial défini pour ce peuple.
                </div>
              ) : (
                people.malusOptions.map((group, gIdx) => {
                  const summaryText =
                    group.length === 0
                      ? 'Aucune caractéristique sélectionnée'
                      : group.length === STATS.length
                      ? '-1 à n\'importe quelle caractéristique (au choix)'
                      : group.length === 1
                      ? `Fixe : -1 ${group[0]}`
                      : `Au choix : -1 ${group.join(' ou -1 ')}`;

                  return (
                    <div
                      key={gIdx}
                      className="p-3 bg-stone-950/70 border border-red-950/80 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-400 font-mono">
                            Malus {gIdx + 1} (-1) :
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-200">
                            {summaryText}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeMalusGroup(gIdx)}
                          className="text-stone-500 hover:text-red-400 p-1"
                          title="Supprimer ce groupe de malus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-stone-400 mr-1 uppercase font-semibold">
                          Cocher les options éligibles :
                        </span>
                        {STATS.map(stat => {
                          const active = group.includes(stat);
                          return (
                            <button
                              key={stat}
                              type="button"
                              onClick={() => updateMalusGroup(gIdx, stat)}
                              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                active
                                  ? 'bg-red-600 text-stone-950 shadow-md scale-105 ring-2 ring-red-400'
                                  : 'bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                              }`}
                            >
                              {active ? `✓ ${stat}` : stat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
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
                  Voies Raciales Sélectionnables (si choix multiples, ex: Demi-Elfe)
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
        </div>
      )}

      {/* TAB 2: ÉQUIPEMENT & RÈGLES DE TAILLE */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-stone-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-500" />
                  Règles d'Équipement & Morphologie de Taille (`equipmentRules`)
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Indispensable pour les petites races (Halfelins, Gnomes, Gobelins, Fées, etc.) qui ont des restrictions d'armes ou un bonus de DEF de taille.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-400 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
                <input
                  type="checkbox"
                  checked={people.equipmentRules !== null && people.equipmentRules !== undefined}
                  onChange={e => {
                    if (e.target.checked) {
                      updateField('equipmentRules', {
                        forbiddenWeaponIds: [],
                        twoHandedWeaponIds: [],
                        summary: '',
                      });
                    } else {
                      updateField('equipmentRules', null);
                    }
                  }}
                  className="rounded border-stone-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Activer les règles spéciales</span>
              </label>
            </div>

            {people.equipmentRules ? (
              <div className="space-y-4 pt-2">
                {/* Armure de prédilection & Bonus DEF de taille */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      Armure de Prédilection (`preferredArmorId`, ex: cotte d'écorce)
                    </label>
                    <select
                      value={people.equipmentRules.preferredArmorId || ''}
                      onChange={e => updateEquipmentRule('preferredArmorId', e.target.value || undefined)}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Aucune</option>
                      {allArmors.filter(a => a.type === 'armor').map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      Bonus de DEF de Taille (`sizeDefenseBonus`, ex: +2 pour très petite taille)
                    </label>
                    <input
                      type="number"
                      value={people.equipmentRules.sizeDefenseBonus ?? ''}
                      onChange={e =>
                        updateEquipmentRule(
                          'sizeDefenseBonus',
                          e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                        )
                      }
                      placeholder="ex: 2"
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Plafonds de dés de dégâts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      Dé max global (`maxDamageDice`, ex: 10 pour d10)
                    </label>
                    <input
                      type="number"
                      value={people.equipmentRules.maxDamageDice ?? ''}
                      onChange={e =>
                        updateEquipmentRule(
                          'maxDamageDice',
                          e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                        )
                      }
                      placeholder="ex: 10"
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      Dé max arme 1 main (`maxOneHandedDamageDice`, ex: 4 pour d4)
                    </label>
                    <input
                      type="number"
                      value={people.equipmentRules.maxOneHandedDamageDice ?? ''}
                      onChange={e =>
                        updateEquipmentRule(
                          'maxOneHandedDamageDice',
                          e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                        )
                      }
                      placeholder="ex: 4"
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      Seuil imposé 2 mains (`twoHandedMinDamageDice`, ex: 8 pour d8)
                    </label>
                    <input
                      type="number"
                      value={people.equipmentRules.twoHandedMinDamageDice ?? ''}
                      onChange={e =>
                        updateEquipmentRule(
                          'twoHandedMinDamageDice',
                          e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                        )
                      }
                      placeholder="ex: 8"
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                    />
                  </div>
                </div>

                {/* Armes interdites & Armes imposées à deux mains */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      Armes Interdites (`forbiddenWeaponIds`, ex: rapière, arc long...)
                    </label>
                    <select
                      multiple
                      value={people.equipmentRules.forbiddenWeaponIds || []}
                      onChange={e => {
                        const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                        updateEquipmentRule('forbiddenWeaponIds', selected.length > 0 ? selected : undefined);
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 h-32 focus:outline-none focus:border-amber-500"
                    >
                      {allWeapons.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      Armes Imposées à Deux Mains (`twoHandedWeaponIds`)
                    </label>
                    <select
                      multiple
                      value={people.equipmentRules.twoHandedWeaponIds || []}
                      onChange={e => {
                        const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                        updateEquipmentRule('twoHandedWeaponIds', selected.length > 0 ? selected : undefined);
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 h-32 focus:outline-none focus:border-amber-500"
                    >
                      {allWeapons.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Résumé textuel */}
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">
                    Résumé officiel des règles d'équipement (`summary`)
                  </label>
                  <textarea
                    rows={2}
                    value={people.equipmentRules.summary || ''}
                    onChange={e => updateEquipmentRule('summary', e.target.value || undefined)}
                    placeholder="ex: Taille Halfelin : Armes 1d8 à 1d10 DM obligatoirement à deux mains..."
                    className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-stone-500 bg-stone-950/40 rounded-lg">
                Ce peuple utilise les règles d'équipement standards (taille moyenne sans interdiction d'arme).
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LORE, MORPHOLOGIE & RP */}
      {activeTab === 'lore' && (
        <div className="space-y-6">
          {/* Lore & Conseils RP */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
            <h4 className="text-base font-bold text-stone-100 border-b border-stone-800 pb-2">
              Lore & Conseils de Roleplay
            </h4>

            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">
                Description & Histoire générale (`description`)
              </label>
              <textarea
                rows={4}
                value={people.description || ''}
                onChange={e => updateField('description', e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                Conseils d'Interprétation (`interpretationTip`)
              </label>
              <textarea
                rows={3}
                value={people.interpretationTip || ''}
                onChange={e => updateField('interpretationTip', e.target.value || undefined)}
                placeholder="ex: Joyeux, optimiste, curieux de tout et intarissable sur ses passions insolites..."
                className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Morphologie */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
            <h4 className="text-base font-bold text-stone-100 border-b border-stone-800 pb-2">
              Données Morphologiques
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">Âge de départ</label>
                <input
                  type="text"
                  value={people.startingAge || ''}
                  onChange={e => updateField('startingAge', e.target.value)}
                  placeholder="ex: 18 ans"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">Espérance de vie</label>
                <input
                  type="text"
                  value={people.lifeExpectancy || ''}
                  onChange={e => updateField('lifeExpectancy', e.target.value)}
                  placeholder="ex: 80 ans"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">Taille</label>
                <input
                  type="text"
                  value={people.heightRange || ''}
                  onChange={e => updateField('heightRange', e.target.value)}
                  placeholder="ex: 1,60 m à 1,90 m"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">Poids</label>
                <input
                  type="text"
                  value={people.weightRange || ''}
                  onChange={e => updateField('weightRange', e.target.value)}
                  placeholder="ex: 60 à 90 kg"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Langues par défaut (`defaultLanguages`)
                </label>
                <input
                  type="text"
                  value={people.defaultLanguages || ''}
                  onChange={e => updateField('defaultLanguages', e.target.value)}
                  placeholder="ex: Commun, Elfique"
                  className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Traits physiques concis (`physicalTraits`)
                </label>
                <input
                  type="text"
                  value={people.physicalTraits || ''}
                  onChange={e => updateField('physicalTraits', e.target.value)}
                  placeholder="ex: Fin et élancé, oreilles pointues..."
                  className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                />
              </div>
            </div>

            {/* Repères Markdown avec bouton magique de génération */}
            <div className="pt-2 border-t border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Fiche de Repères Markdown (`reperes`)
                </label>
                <button
                  type="button"
                  onClick={generateReperes}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-amber-950/70 border border-amber-800/80 text-amber-300 hover:bg-amber-900/70"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>✨ Générer / Synchroniser depuis la morphologie</span>
                </button>
              </div>

              <textarea
                rows={6}
                value={people.reperes || ''}
                onChange={e => updateField('reperes', e.target.value)}
                placeholder="**Âge de départ :** ...&#10;**Taille :** ..."
                className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-xs font-mono text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BANQUE DE NOMS */}
      {activeTab === 'names' && (
        <div className="space-y-6">
          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
            <h4 className="text-base font-bold text-stone-100 border-b border-stone-800 pb-2">
              Banque de Noms & Suggestions
            </h4>

            {/* Naming Tip */}
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">
                Conseils & Règles de Nommage (`names.namingTip`)
              </label>
              <textarea
                rows={2}
                value={people.names?.namingTip || ''}
                onChange={e => {
                  const currentNames = people.names || { masculine: [], feminine: [], namingTip: '' };
                  updateField('names', { ...currentNames, namingTip: e.target.value });
                }}
                placeholder="ex: Terminaisons masculines en -din, -dor ; voyelles doublées chez les femmes..."
                className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Listes de Noms Masculins et Féminins */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Masculin */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-300">
                    Prénoms Masculins ({(people.names?.masculine || []).length})
                  </label>
                  <span className="text-[10px] text-stone-500">1 par ligne ou virgules</span>
                </div>
                <textarea
                  rows={10}
                  value={(people.names?.masculine || []).join('\n')}
                  onChange={e => {
                    const parsed = parseNamesText(e.target.value);
                    const currentNames = people.names || { masculine: [], feminine: [], namingTip: '' };
                    updateField('names', { ...currentNames, masculine: parsed });
                  }}
                  placeholder="Thorin&#10;Balin&#10;Gloin"
                  className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-xs font-sans text-stone-200 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              {/* Féminin */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-pink-300">
                    Prénoms Féminins ({(people.names?.feminine || []).length})
                  </label>
                  <span className="text-[10px] text-stone-500">1 par ligne ou virgules</span>
                </div>
                <textarea
                  rows={10}
                  value={(people.names?.feminine || []).join('\n')}
                  onChange={e => {
                    const parsed = parseNamesText(e.target.value);
                    const currentNames = people.names || { masculine: [], feminine: [], namingTip: '' };
                    updateField('names', { ...currentNames, feminine: parsed });
                  }}
                  placeholder="Disa&#10;Kari&#10;Helga"
                  className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-xs font-sans text-stone-200 focus:outline-none focus:border-pink-500 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
