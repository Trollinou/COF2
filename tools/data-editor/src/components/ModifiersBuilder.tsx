import React, { useState } from 'react';
import type {
  RankModifiers,
  StatCode,
  BonusTarget,
  WeaponTag,
  ScalingBonusRule,
  StatSubstitutionRule,
  WeaponModifierRule,
  ExternalAbilityGrantRule,
  RankChoiceOption,
  ActionRank,
} from '../../../../src/types/cof2.ts';
import {
  Shield,
  Plus,
  Trash2,
  Code,
  Layout,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Zap,
  Sword,
  Target,
  RefreshCw,
  FileText,
  UserCheck,
  ChevronDown,
} from 'lucide-react';

interface ModifiersBuilderProps {
  modifiers?: RankModifiers;
  rank: ActionRank;
  onChange: (updated?: RankModifiers) => void;
}

const STATS: StatCode[] = ['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'];

const BONUS_TARGETS: Array<{ value: BonusTarget; label: string }> = [
  { value: 'defense', label: 'Défense (DEF)' },
  { value: 'hp', label: 'Points de Vie (PV)' },
  { value: 'initiative', label: 'Initiative (INIT)' },
  { value: 'pc', label: 'Points de Chance (PC)' },
  { value: 'dr', label: 'Dés de Récupération (DR)' },
  { value: 'pm', label: 'Points de Mana (PM)' },
  { value: 'damageReduction', label: 'Réduction des Dégâts (RD)' },
  { value: 'atkContact', label: 'Attaque au Contact' },
  { value: 'atkDistance', label: 'Attaque à Distance' },
  { value: 'atkMagic', label: 'Attaque Magique' },
  { value: 'dmContact', label: 'Dégâts Contact' },
  { value: 'dmDistance', label: 'Dégâts Distance' },
  { value: 'dmMagic', label: 'Dégâts Magiques' },
  { value: 'critRange', label: 'Plage de Critique Globale' },
];

const WEAPON_TAGS: WeaponTag[] = [
  'legere', 'lancer', 'allonge', 'deux-mains', 'polyvalente',
  'epee', 'sabre', 'hache', 'marteau', 'masse', 'lance',
  'baton', 'arc', 'arbalete', 'poudre', 'fronde', 'mains-nues',
  'escrime', 'duelliste', 'danseur', 'outil',
];

const formatAtRank = (atRank?: Record<string, number>): string => {
  if (!atRank) return '';
  return Object.entries(atRank)
    .map(([r, v]) => `${r}:${v}`)
    .join(', ');
};

const parseAtRank = (str: string): Record<string, number> | undefined => {
  const trimmed = str.trim();
  if (!trimmed) return undefined;
  const result: Record<string, number> = {};
  const parts = trimmed.split(/[,;]+/);
  for (const part of parts) {
    const [r, v] = part.split(':').map(s => s.trim());
    if (r && v && !isNaN(Number(r)) && !isNaN(Number(v))) {
      result[r] = parseInt(v, 10);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

export const ModifiersBuilder: React.FC<ModifiersBuilderProps> = ({
  modifiers,
  rank,
  onChange,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState<boolean>(false);

  const currentMod: RankModifiers = modifiers || {};

  const updateModifiers = (patch: Partial<RankModifiers>) => {
    const next: RankModifiers = { ...currentMod, ...patch };
    // Clean up empty keys
    if (next.stats && Object.keys(next.stats).length === 0) delete next.stats;
    if (next.bonuses && next.bonuses.length === 0) delete next.bonuses;
    if (next.statSubstitutions && next.statSubstitutions.length === 0) delete next.statSubstitutions;
    if (next.weaponModifiers && next.weaponModifiers.length === 0) delete next.weaponModifiers;
    if (next.situationalNotes && next.situationalNotes.length === 0) delete next.situationalNotes;
    if (next.choiceOptions && next.choiceOptions.length === 0) delete next.choiceOptions;

    if (Object.keys(next).length === 0) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  };

  // Guardrails & Contextual warnings
  const warnings: string[] = [];
  if (rank.isSpell && currentMod.stats && Object.keys(currentMod.stats).length > 0) {
    warnings.push(
      "Cette capacité est marquée comme sort. En COF2, les sorts n'augmentent que très rarement une caractéristique de façon permanente."
    );
  }
  if (!rank.isPassive && currentMod.bonuses && currentMod.bonuses.length > 0) {
    warnings.push(
      "Cette capacité est active (" + rank.actionType + "). Les bonus placés dans 'bonuses' s'appliquent de manière permanente sur la fiche. S'il s'agit d'un effet temporaire durant le tour, privilégiez un 'Rappel Tactique'."
    );
  }
  const hasGlobalCrit = currentMod.bonuses?.some(b => b.target === 'critRange');
  const hasWeaponCrit = currentMod.weaponModifiers?.some(w => !!w.critRangeBonus);
  if (hasGlobalCrit && hasWeaponCrit) {
    warnings.push(
      "Dédoublement critique détecté : un bonus critique global et un bonus critique d'arme sont actifs simultanément. Vérifiez si le bonus ne doit pas cibler uniquement une catégorie d'armes."
    );
  }

  // Preset Handlers
  const applyPreset = (presetType: 'stat' | 'finesse' | 'defRank' | 'weaponTag' | 'tactical' | 'statToDef') => {
    setShowPresetsMenu(false);
    if (presetType === 'stat') {
      const stats = { ...(currentMod.stats || {}), FOR: 1 };
      updateModifiers({ stats });
    } else if (presetType === 'statToDef') {
      const bonus: ScalingBonusRule = {
        target: 'defense',
        stat: 'CHA',
        condition: 'noArmor',
        cap: 'rank',
        note: '+CHA en DEF sans armure (max rang dans la voie)',
      };
      updateModifiers({
        bonuses: [...(currentMod.bonuses || []), bonus],
      });
    } else if (presetType === 'finesse') {
      const sub: StatSubstitutionRule = {
        target: 'attackContact',
        replacementStat: 'AGI',
        baseStat: 'FOR',
        weaponFilter: 'lightWeapons',
        conditionNote: 'Avec des armes légères',
      };
      updateModifiers({
        statSubstitutions: [...(currentMod.statSubstitutions || []), sub],
      });
    } else if (presetType === 'defRank') {
      const bonus: ScalingBonusRule = {
        target: 'defense',
        perRank: 1,
        condition: 'lightArmor',
        note: '+1 DEF par rang dans la voie si armure légère',
      };
      updateModifiers({
        bonuses: [...(currentMod.bonuses || []), bonus],
      });
    } else if (presetType === 'weaponTag') {
      const rule: WeaponModifierRule = {
        tags: ['epee'],
        category: 'contact',
        attackBonus: 1,
        damageBonus: 1,
        critRangeBonus: 1,
        note: '+1 ATQ, +1 DM et critique 19-20 avec les épées',
      };
      updateModifiers({
        weaponModifiers: [...(currentMod.weaponModifiers || []), rule],
      });
    } else if (presetType === 'tactical') {
      updateModifiers({
        situationalNotes: [
          ...(currentMod.situationalNotes || []),
          'Avantage sur les tests d\'attaque en cas de supériorité numérique',
        ],
      });
    }
  };

  return (
    <div className="bg-stone-950/60 border border-stone-800 rounded-xl overflow-hidden space-y-3 p-4">
      {/* Top Bar: Title, View Switcher & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Modificateurs V2 Déclaratifs
          </span>
          {modifiers && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
              Actif
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Presets Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowPresetsMenu(!showPresetsMenu);
                setShowAddMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-stone-900 border border-stone-700 text-amber-300 hover:bg-stone-800 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Presets COF2</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showPresetsMenu && (
              <div className="absolute right-0 mt-1 w-64 bg-stone-900 border border-stone-700 rounded-lg shadow-2xl py-1 z-30 divide-y divide-stone-800 text-xs">
                <button
                  type="button"
                  onClick={() => applyPreset('stat')}
                  className="w-full text-left px-3 py-2 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <Target className="w-3.5 h-3.5 text-blue-400" />
                  <div>
                    <div className="font-semibold">+1 Caractéristique</div>
                    <div className="text-[10px] text-stone-400">+1 FOR permanent</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('finesse')}
                  className="w-full text-left px-3 py-2 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <div>
                    <div className="font-semibold">Attaque Finesse (AGI)</div>
                    <div className="text-[10px] text-stone-400">AGI au lieu de FOR au contact</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('defRank')}
                  className="w-full text-left px-3 py-2 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <div>
                    <div className="font-semibold">+1 DEF par rang</div>
                    <div className="text-[10px] text-stone-400">Avec armure légère</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('statToDef')}
                  className="w-full text-left px-3 py-2 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <div>
                    <div className="font-semibold">+ Caractéristique en DEF</div>
                    <div className="text-[10px] text-stone-400">+CHA ou +CON en DEF (max rang)</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('weaponTag')}
                  className="w-full text-left px-3 py-2 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <Sword className="w-3.5 h-3.5 text-purple-400" />
                  <div>
                    <div className="font-semibold">Spécialisation d'Arme</div>
                    <div className="text-[10px] text-stone-400">+1 ATQ, +1 DM, crit 19-20</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('tactical')}
                  className="w-full text-left px-3 py-2 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <div>
                    <div className="font-semibold">Rappel Tactique</div>
                    <div className="text-[10px] text-stone-400">Postures, conditions, avantages</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Add Effect Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAddMenu(!showAddMenu);
                setShowPresetsMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold shadow transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter un Effet</span>
              <ChevronDown className="w-3 h-3 text-stone-950" />
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-stone-900 border border-stone-700 rounded-lg shadow-2xl py-1 z-30 text-xs divide-y divide-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMenu(false);
                    const stats = { ...(currentMod.stats || {}), FOR: 1 };
                    updateModifiers({ stats });
                  }}
                  className="w-full text-left px-3 py-1.5 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <Target className="w-3.5 h-3.5 text-blue-400" />
                  <span>Caractéristique (+1 STAT)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMenu(false);
                    const newBonus: ScalingBonusRule = { target: 'defense', flat: 1 };
                    updateModifiers({ bonuses: [...(currentMod.bonuses || []), newBonus] });
                  }}
                  className="w-full text-left px-3 py-1.5 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bonus Chiffré (DEF, PV...)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMenu(false);
                    const newSub: StatSubstitutionRule = {
                      target: 'attackContact',
                      replacementStat: 'AGI',
                      baseStat: 'FOR',
                    };
                    updateModifiers({
                      statSubstitutions: [...(currentMod.statSubstitutions || []), newSub],
                    });
                  }}
                  className="w-full text-left px-3 py-1.5 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Substitution de Caractéristique</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMenu(false);
                    const newWep: WeaponModifierRule = { tags: ['legere'], attackBonus: 1 };
                    updateModifiers({
                      weaponModifiers: [...(currentMod.weaponModifiers || []), newWep],
                    });
                  }}
                  className="w-full text-left px-3 py-1.5 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <Sword className="w-3.5 h-3.5 text-purple-400" />
                  <span>Règle / Bonus d'Arme</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMenu(false);
                    updateModifiers({
                      situationalNotes: [...(currentMod.situationalNotes || []), ''],
                    });
                  }}
                  className="w-full text-left px-3 py-1.5 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Rappel Tactique / Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMenu(false);
                    const newChoice: RankChoiceOption = {
                      id: `choix-${Date.now().toString(36)}`,
                      label: '+1 INT',
                      modifiers: { stats: { INT: 1 } },
                    };
                    updateModifiers({
                      choiceOptions: [...(currentMod.choiceOptions || []), newChoice],
                    });
                  }}
                  className="w-full text-left px-3 py-1.5 text-stone-200 hover:bg-stone-800 flex items-center gap-2"
                >
                  <UserCheck className="w-3.5 h-3.5 text-orange-400" />
                  <span>Choix du Joueur</span>
                </button>
              </div>
            )}
          </div>

          {/* Toggle Visual / JSON */}
          <div className="flex items-center rounded bg-stone-900 border border-stone-800 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === 'visual'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Vue Visuelle"
            >
              <Layout className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('json')}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === 'json'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Aperçu JSON brut"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contextual Guardrails / Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((warn, i) => (
            <div
              key={i}
              className="px-3 py-2 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-200 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area: Visual or Raw JSON */}
      {viewMode === 'json' ? (
        <div className="space-y-2">
          <textarea
            rows={8}
            value={modifiers ? JSON.stringify(modifiers, null, 2) : ''}
            onChange={e => {
              try {
                const val = e.target.value.trim();
                if (!val) {
                  onChange(undefined);
                } else {
                  const parsed = JSON.parse(val);
                  onChange(parsed);
                }
              } catch {
                // allow typing
              }
            }}
            placeholder="{\n  // Aucun modificateur actif\n}"
            className="w-full bg-stone-900 border border-stone-800 rounded p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-amber-500 leading-relaxed"
          />
          <p className="text-[11px] text-stone-500">
            Édition directe en JSON. Toute modification est immédiatement synchronisée avec la vue visuelle.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Empty State */}
          {!modifiers || Object.keys(modifiers).length === 0 ? (
            <div className="text-center py-6 px-4 bg-stone-900/30 border border-dashed border-stone-800 rounded-lg space-y-2">
              <Lightbulb className="w-6 h-6 text-stone-600 mx-auto" />
              <div className="text-xs text-stone-400">Aucun modificateur mécanique sur ce rang.</div>
              <div className="text-[11px] text-stone-500">
                Cliquez sur <strong>"Ajouter un Effet"</strong> ou choisissez un <strong>"Preset COF2"</strong> ci-dessus.
              </div>
            </div>
          ) : null}

          {/* 1. Permanent Stats Card */}
          {currentMod.stats && (
            <div className="p-3.5 bg-stone-900/90 border border-blue-900/40 rounded-lg space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-stone-200">
                    Augmentation Définitive de Caractéristique (`stats`)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...currentMod };
                    delete next.stats;
                    updateModifiers(next);
                  }}
                  className="text-stone-500 hover:text-red-400 p-1"
                  title="Supprimer cette section"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {STATS.map(stat => {
                  const val = currentMod.stats?.[stat] || 0;
                  return (
                    <div
                      key={stat}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                        val > 0
                          ? 'bg-blue-950/60 border-blue-700 text-blue-200'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      <span className="font-bold">{stat}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...(currentMod.stats || {}) };
                            if (val <= 1) delete next[stat];
                            else next[stat] = val - 1;
                            updateModifiers({ stats: next });
                          }}
                          className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-200"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-stone-100">{val}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...(currentMod.stats || {}) };
                            next[stat] = val + 1;
                            updateModifiers({ stats: next });
                          }}
                          className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Scaling & Derived Bonuses Cards */}
          {currentMod.bonuses && currentMod.bonuses.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                <span>Bonus Chiffrés Dérivés ({currentMod.bonuses.length})</span>
              </div>

              {currentMod.bonuses.map((bonus, bIdx) => (
                <div
                  key={bIdx}
                  className="p-3 bg-stone-900/80 border border-stone-800 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <select
                        value={bonus.target}
                        onChange={e => {
                          const nextBonuses = [...currentMod.bonuses!];
                          nextBonuses[bIdx] = { ...bonus, target: e.target.value as BonusTarget };
                          updateModifiers({ bonuses: nextBonuses });
                        }}
                        className="bg-stone-950 border border-stone-700 rounded px-2.5 py-1 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                      >
                        {BONUS_TARGETS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>

                      {bonus.stat && (
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700 text-amber-200 text-[10px] font-bold">
                          +{bonus.stat} (Carac)
                        </span>
                      )}
                      {bonus.cap && (
                        <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-300 text-[10px] font-mono">
                          cap: {bonus.cap}
                        </span>
                      )}
                      {bonus.condition && (
                        <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-200 text-[10px]">
                          {bonus.condition}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextBonuses = currentMod.bonuses!.filter((_, i) => i !== bIdx);
                        updateModifiers({ bonuses: nextBonuses });
                      }}
                      className="text-stone-500 hover:text-red-400 p-1"
                      title="Supprimer ce bonus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Ligne 1 : Valeurs & Caractéristique */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-amber-300 mb-0.5">
                        + Caractéristique (`stat`)
                      </label>
                      <select
                        value={bonus.stat || ''}
                        onChange={e => {
                          const nextBonuses = [...currentMod.bonuses!];
                          nextBonuses[bIdx] = {
                            ...bonus,
                            stat: (e.target.value || undefined) as StatCode | undefined,
                          };
                          updateModifiers({ bonuses: nextBonuses });
                        }}
                        className="w-full bg-stone-950 border border-amber-900/60 rounded px-2 py-1 text-amber-200 font-bold focus:outline-none focus:border-amber-500"
                      >
                        <option value="">Aucune</option>
                        {STATS.map(st => (
                          <option key={st} value={st}>+{st} (Modificateur)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Bonus Fixe (`flat`)</label>
                      <input
                        type="number"
                        value={bonus.flat ?? ''}
                        onChange={e => {
                          const nextBonuses = [...currentMod.bonuses!];
                          nextBonuses[bIdx] = {
                            ...bonus,
                            flat: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                          };
                          updateModifiers({ bonuses: nextBonuses });
                        }}
                        placeholder="ex: 2"
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Par Rang (`perRank`)</label>
                      <input
                        type="number"
                        value={bonus.perRank ?? ''}
                        onChange={e => {
                          const nextBonuses = [...currentMod.bonuses!];
                          nextBonuses[bIdx] = {
                            ...bonus,
                            perRank: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                          };
                          updateModifiers({ bonuses: nextBonuses });
                        }}
                        placeholder="ex: 1"
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Par Niveau (`perLevel`)</label>
                      <input
                        type="number"
                        value={bonus.perLevel ?? ''}
                        onChange={e => {
                          const nextBonuses = [...currentMod.bonuses!];
                          nextBonuses[bIdx] = {
                            ...bonus,
                            perLevel: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                          };
                          updateModifiers({ bonuses: nextBonuses });
                        }}
                        placeholder="ex: 1"
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100"
                      />
                    </div>
                  </div>

                  {/* Ligne 2 : Condition d'armure, Plafond & Paliers atRank */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Condition d'Armure</label>
                      <select
                        value={bonus.condition || ''}
                        onChange={e => {
                          const nextBonuses = [...currentMod.bonuses!];
                          nextBonuses[bIdx] = {
                            ...bonus,
                            condition: (e.target.value || undefined) as any,
                          };
                          updateModifiers({ bonuses: nextBonuses });
                        }}
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100"
                      >
                        <option value="">Aucune</option>
                        <option value="lightArmor">Armure légère</option>
                        <option value="noArmor">Sans armure</option>
                        <option value="noShield">Sans bouclier</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Plafond (`cap`)</label>
                      <div className="flex gap-1.5">
                        <select
                          value={bonus.cap === 'rank' ? 'rank' : typeof bonus.cap === 'number' ? 'number' : ''}
                          onChange={e => {
                            const val = e.target.value;
                            const nextBonuses = [...currentMod.bonuses!];
                            let nextCap: 'rank' | number | undefined = undefined;
                            if (val === 'rank') nextCap = 'rank';
                            else if (val === 'number') nextCap = 5;
                            nextBonuses[bIdx] = { ...bonus, cap: nextCap };
                            updateModifiers({ bonuses: nextBonuses });
                          }}
                          className="flex-1 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100 text-xs"
                        >
                          <option value="">Aucun plafond</option>
                          <option value="rank">Rang atteint ('rank')</option>
                          <option value="number">Fixe (valeur)</option>
                        </select>
                        {typeof bonus.cap === 'number' && (
                          <input
                            type="number"
                            value={bonus.cap}
                            onChange={e => {
                              const nextBonuses = [...currentMod.bonuses!];
                              nextBonuses[bIdx] = {
                                ...bonus,
                                cap: parseInt(e.target.value, 10) || 1,
                              };
                              updateModifiers({ bonuses: nextBonuses });
                            }}
                            className="w-16 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100 text-xs"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">
                        Paliers par Rang (`atRank`, ex: 3:2, 5:3)
                      </label>
                      <input
                        type="text"
                        value={formatAtRank(bonus.atRank)}
                        onChange={e => {
                          const nextBonuses = [...currentMod.bonuses!];
                          nextBonuses[bIdx] = {
                            ...bonus,
                            atRank: parseAtRank(e.target.value),
                          };
                          updateModifiers({ bonuses: nextBonuses });
                        }}
                        placeholder="ex: 3:2, 5:3"
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={bonus.note || ''}
                      onChange={e => {
                        const nextBonuses = [...currentMod.bonuses!];
                        nextBonuses[bIdx] = { ...bonus, note: e.target.value || undefined };
                        updateModifiers({ bonuses: nextBonuses });
                      }}
                      placeholder="Note explicative affichée dans la fiche..."
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Stat Substitutions Cards */}
          {currentMod.statSubstitutions && currentMod.statSubstitutions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Substitutions de Caractéristiques ({currentMod.statSubstitutions.length})</span>
              </div>

              {currentMod.statSubstitutions.map((sub, sIdx) => (
                <div
                  key={sIdx}
                  className="p-3 bg-stone-900/80 border border-stone-800 rounded-lg space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-400">Pour :</span>
                      <select
                        value={sub.target}
                        onChange={e => {
                          const next = [...currentMod.statSubstitutions!];
                          next[sIdx] = { ...sub, target: e.target.value as any };
                          updateModifiers({ statSubstitutions: next });
                        }}
                        className="bg-stone-950 border border-stone-700 rounded px-2 py-1 font-bold text-emerald-300"
                      >
                        <option value="attackContact">Attaque Contact</option>
                        <option value="attackDistance">Attaque Distance</option>
                        <option value="defense">Défense</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = currentMod.statSubstitutions!.filter((_, i) => i !== sIdx);
                        updateModifiers({ statSubstitutions: next });
                      }}
                      className="text-stone-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-stone-400">Utiliser :</span>
                    <select
                      value={sub.replacementStat}
                      onChange={e => {
                        const next = [...currentMod.statSubstitutions!];
                        next[sIdx] = { ...sub, replacementStat: e.target.value as StatCode };
                        updateModifiers({ statSubstitutions: next });
                      }}
                      className="bg-stone-950 border border-stone-700 rounded px-2 py-1 font-bold text-amber-300"
                    >
                      {STATS.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>

                    <span className="text-stone-400">à la place de :</span>
                    <select
                      value={sub.baseStat}
                      onChange={e => {
                        const next = [...currentMod.statSubstitutions!];
                        next[sIdx] = { ...sub, baseStat: e.target.value as StatCode };
                        updateModifiers({ statSubstitutions: next });
                      }}
                      className="bg-stone-950 border border-stone-700 rounded px-2 py-1 font-bold text-stone-200"
                    >
                      {STATS.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={sub.conditionNote || ''}
                      onChange={e => {
                        const next = [...currentMod.statSubstitutions!];
                        next[sIdx] = { ...sub, conditionNote: e.target.value || undefined };
                        updateModifiers({ statSubstitutions: next });
                      }}
                      placeholder="Condition d'application (ex: Avec armes légères)..."
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. Weapon Modifiers Cards */}
          {currentMod.weaponModifiers && currentMod.weaponModifiers.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                <Sword className="w-3.5 h-3.5" />
                <span>Règles & Maîtrises d'Armes ({currentMod.weaponModifiers.length})</span>
              </div>

              {currentMod.weaponModifiers.map((wep, wIdx) => (
                <div
                  key={wIdx}
                  className="p-3 bg-stone-900/80 border border-stone-800 rounded-lg space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-stone-200">
                        <input
                          type="checkbox"
                          checked={!!wep.grantProficiency}
                          onChange={e => {
                            const next = [...currentMod.weaponModifiers!];
                            next[wIdx] = { ...wep, grantProficiency: e.target.checked || undefined };
                            updateModifiers({ weaponModifiers: next });
                          }}
                          className="rounded border-stone-700 text-purple-500"
                        />
                        <span>Confère la Maîtrise</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = currentMod.weaponModifiers!.filter((_, i) => i !== wIdx);
                        updateModifiers({ weaponModifiers: next });
                      }}
                      className="text-stone-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tags selector */}
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">Tags d'armes concernés :</label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEAPON_TAGS.map(t => {
                        const active = wep.tags?.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              const currentTags = wep.tags || [];
                              const nextTags = active
                                ? currentTags.filter(x => x !== t)
                                : [...currentTags, t];
                              const next = [...currentMod.weaponModifiers!];
                              next[wIdx] = { ...wep, tags: nextTags.length > 0 ? nextTags : undefined };
                              updateModifiers({ weaponModifiers: next });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              active
                                ? 'bg-purple-900 text-purple-200 font-bold border border-purple-700'
                                : 'bg-stone-950 text-stone-400 hover:bg-stone-800'
                            }`}
                          >
                            #{t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Bonus Attaque</label>
                      <input
                        type="number"
                        value={wep.attackBonus ?? ''}
                        onChange={e => {
                          const next = [...currentMod.weaponModifiers!];
                          next[wIdx] = {
                            ...wep,
                            attackBonus: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                          };
                          updateModifiers({ weaponModifiers: next });
                        }}
                        placeholder="ex: 1"
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Bonus Dégâts</label>
                      <input
                        type="number"
                        value={wep.damageBonus ?? ''}
                        onChange={e => {
                          const next = [...currentMod.weaponModifiers!];
                          next[wIdx] = {
                            ...wep,
                            damageBonus: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                          };
                          updateModifiers({ weaponModifiers: next });
                        }}
                        placeholder="ex: 2"
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Plage Critique (+1 = 19-20)</label>
                      <input
                        type="number"
                        value={wep.critRangeBonus ?? ''}
                        onChange={e => {
                          const next = [...currentMod.weaponModifiers!];
                          next[wIdx] = {
                            ...wep,
                            critRangeBonus: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                          };
                          updateModifiers({ weaponModifiers: next });
                        }}
                        placeholder="ex: 1"
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5. Situational Notes Cards */}
          {currentMod.situationalNotes && currentMod.situationalNotes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Rappels Tactiques & Situationnels ({currentMod.situationalNotes.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateModifiers({
                      situationalNotes: [...(currentMod.situationalNotes || []), ''],
                    });
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Ajouter une note
                </button>
              </div>

              <div className="space-y-1.5">
                {currentMod.situationalNotes.map((note, nIdx) => (
                  <div key={nIdx} className="flex items-center gap-2">
                    <span className="text-stone-500">•</span>
                    <input
                      type="text"
                      value={note}
                      onChange={e => {
                        const next = [...currentMod.situationalNotes!];
                        next[nIdx] = e.target.value;
                        updateModifiers({ situationalNotes: next });
                      }}
                      placeholder="ex: +2 aux tests de discrétion en forêt..."
                      className="flex-1 bg-stone-950 border border-stone-800 rounded px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = currentMod.situationalNotes!.filter((_, i) => i !== nIdx);
                        updateModifiers({ situationalNotes: next });
                      }}
                      className="text-stone-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Choice Options Cards */}
          {currentMod.choiceOptions && currentMod.choiceOptions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-orange-300 flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Choix Multiples du Joueur ({currentMod.choiceOptions.length})</span>
              </div>

              {currentMod.choiceOptions.map((choice, cIdx) => (
                <div
                  key={choice.id || cIdx}
                  className="p-3 bg-stone-900/80 border border-stone-800 rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={choice.label}
                      onChange={e => {
                        const next = [...currentMod.choiceOptions!];
                        next[cIdx] = { ...choice, label: e.target.value };
                        updateModifiers({ choiceOptions: next });
                      }}
                      placeholder="Intitulé du choix (ex: +1 INT)..."
                      className="flex-1 bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs font-bold text-orange-200 mr-2"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const next = currentMod.choiceOptions!.filter((_, i) => i !== cIdx);
                        updateModifiers({ choiceOptions: next });
                      }}
                      className="text-stone-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={JSON.stringify(choice.modifiers, null, 2)}
                    onChange={e => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        const next = [...currentMod.choiceOptions!];
                        next[cIdx] = { ...choice, modifiers: parsed };
                        updateModifiers({ choiceOptions: next });
                      } catch {
                        // ignore invalid json during typing
                      }
                    }}
                    placeholder="Sous-modificateurs JSON de cette option..."
                    className="w-full bg-stone-950 border border-stone-800 rounded p-1.5 font-mono text-[11px] text-emerald-300"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

