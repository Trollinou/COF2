import React, { useState, useMemo } from 'react';
import {
  CharacterSheet,
  CharacterWeaponInstance,
} from '../../types/cof2';
import {
  computeCharacterStats,
  getPeopleById,
  getProfileById,
  getPathById,
  WEAPONS,
  calculateCapabilityPoints,
  checkWeaponProficiency,
} from '../../engine/rulesEngine';
import { HeroBanner } from './HeroBanner';
import { CharacteristicsCard } from './CharacteristicsCard';
import { CombatDefensesCard } from './CombatDefensesCard';
import { CombatTab } from './tabs/CombatTab';
import { AbilitiesTab } from './tabs/AbilitiesTab';
import { InventoryTab } from './tabs/InventoryTab';
import { BioTab } from './tabs/BioTab';

interface CharacterSheetViewProps {
  character: CharacterSheet;
  onChange: (updated: CharacterSheet) => void;
  onOpenLevelUp: () => void;
}

export const CharacterSheetView: React.FC<CharacterSheetViewProps> = ({
  character,
  onChange,
  onOpenLevelUp,
}) => {
  const stats = useMemo(() => computeCharacterStats(character), [character]);
  const people = useMemo(() => getPeopleById(character.peopleId), [character.peopleId]);
  const profile = useMemo(() => getProfileById(character.profileId), [character.profileId]);
  const capabilityBudget = useMemo(() => calculateCapabilityPoints(character), [character]);

  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({
    [character.selectedPathIds[0] || '']: true,
  });

  // activeTab is used for mobile / standard screens (< 2xl).
  // centerTab is used for the center column in 3-column mode (>= 2xl).
  const [activeTab, setActiveTab] = useState<'combat' | 'abilities' | 'inventory' | 'bio'>('combat');
  const [centerTab, setCenterTab] = useState<'combat' | 'inventory' | 'bio'>('combat');

  const togglePathExpand = (pathId: string) => {
    setExpandedPaths(prev => ({ ...prev, [pathId]: !prev[pathId] }));
  };

  // Auto-clamp resources if max changed or invalid
  React.useEffect(() => {
    let needsUpdate = false;
    const patch: Partial<CharacterSheet> = {};
    if (character.currentDr !== undefined && character.currentDr > stats.maxDr) {
      patch.currentDr = stats.maxDr;
      needsUpdate = true;
    }
    if (character.currentHp !== undefined && character.currentHp > stats.maxHp) {
      patch.currentHp = stats.maxHp;
      needsUpdate = true;
    }
    if (character.currentPc !== undefined && character.currentPc > stats.maxPc) {
      patch.currentPc = stats.maxPc;
      needsUpdate = true;
    }
    if (character.currentPm !== undefined && character.currentPm > stats.maxPm) {
      patch.currentPm = stats.maxPm;
      needsUpdate = true;
    }
    if (needsUpdate) {
      updateCharacter(patch);
    }
  }, [stats.maxDr, stats.maxHp, stats.maxPc, stats.maxPm]);

  const updateCharacter = (partial: Partial<CharacterSheet>) => {
    onChange({
      ...character,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  };

  // Live resource adjustments
  const adjustHp = (amount: number) => {
    const current = character.currentHp !== undefined ? Math.min(character.currentHp, stats.maxHp) : stats.maxHp;
    const next = Math.min(stats.maxHp, Math.max(0, current + amount));
    updateCharacter({ currentHp: next });
  };

  const adjustDr = (amount: number) => {
    const current = character.currentDr !== undefined ? Math.min(character.currentDr, stats.maxDr) : stats.maxDr;
    const next = Math.min(stats.maxDr, Math.max(0, current + amount));
    updateCharacter({ currentDr: next });
  };

  const adjustPc = (amount: number) => {
    const current = character.currentPc !== undefined ? Math.min(character.currentPc, stats.maxPc) : stats.maxPc;
    const next = Math.min(stats.maxPc, Math.max(0, current + amount));
    updateCharacter({ currentPc: next });
  };

  const adjustPm = (amount: number) => {
    const current = character.currentPm !== undefined ? Math.min(character.currentPm, stats.maxPm) : stats.maxPm;
    const next = Math.min(stats.maxPm, Math.max(0, current + amount));
    updateCharacter({ currentPm: next });
  };

  // Toggle ability acquisition
  const toggleAbility = (pathId: string, rank: number) => {
    const exists = character.acquiredAbilities.some(a => a.pathId === pathId && a.rank === rank);
    let nextAbilities = [...character.acquiredAbilities];

    if (exists) {
      nextAbilities = nextAbilities.filter(a => !(a.pathId === pathId && a.rank >= rank));
    } else {
      const pth = getPathById(pathId);
      const minRank = pth?.type === 'prestige' ? (pth.ranks[0]?.rank || 4) : 1;
      for (let r = minRank; r <= rank; r++) {
        if (!nextAbilities.some(a => a.pathId === pathId && a.rank === r)) {
          nextAbilities.push({ pathId, rank: r });
        }
      }
    }
    updateCharacter({ acquiredAbilities: nextAbilities });
  };

  // Add weapon from library with rule validation
  const addWeapon = (weaponRefId: string) => {
    const ref = WEAPONS.find(w => w.id === weaponRefId);
    if (!ref) return;
    const check = checkWeaponProficiency(ref.id, character.profileId, character.peopleId);
    if (!check.allowed) return;

    const newW: CharacterWeaponInstance = {
      id: 'w_' + Date.now(),
      weaponRefId: ref.id,
      name: ref.name,
      damage: ref.damage,
      range: ref.range,
      category: ref.category as 'contact' | 'distance',
      bonusAttack: 0,
      bonusDamage: 0,
      requiresTwoHands: check.requiresTwoHands,
    };
    updateCharacter({ weapons: [...character.weapons, newW] });
  };

  const removeWeapon = (id: string) => {
    updateCharacter({ weapons: character.weapons.filter(w => w.id !== id) });
  };

  const handleSelectTab = (tab: 'combat' | 'abilities' | 'inventory' | 'bio') => {
    setActiveTab(tab);
    if (tab !== 'abilities') {
      setCenterTab(tab);
    }
  };

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Hero Card */}
      <HeroBanner
        character={character}
        stats={stats}
        people={people}
        profile={profile}
        updateCharacter={updateCharacter}
        adjustHp={adjustHp}
        adjustDr={adjustDr}
        adjustPc={adjustPc}
        adjustPm={adjustPm}
      />

      {/* Main Content Layout: 1 col on mobile, 2 cols on lg, 3 cols on 2xl */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMN 1: Characteristics (and Combat & Defenses on < 2xl) */}
        <div className="lg:col-span-4 2xl:col-span-3 space-y-6">
          <CharacteristicsCard
            character={character}
            stats={stats}
            updateCharacter={updateCharacter}
          />

          {/* Combat & Defenses is here on screens < 2xl */}
          <div className="2xl:hidden">
            <CombatDefensesCard stats={stats} />
          </div>
        </div>

        {/* COLUMN 2: Combat Defenses (on 2xl+) + Center Tabs */}
        <div className="lg:col-span-8 2xl:col-span-4 space-y-6">
          {/* Combat & Defenses is moved to Column 2 header on 2xl+ */}
          <div className="hidden 2xl:block">
            <CombatDefensesCard stats={stats} />
          </div>

          {/* Tab selector */}
          <div className="flex border-b border-stone-800 space-x-2">
            <button
              onClick={() => handleSelectTab('combat')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === 'combat' || (activeTab === 'abilities' && centerTab === 'combat')
                  ? 'border-amber-500 text-amber-200'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Armes & Armures
            </button>

            {/* Voies & Capacités tab button is only shown on screens < 2xl because on 2xl it is permanently in Column 3 */}
            <button
              onClick={() => handleSelectTab('abilities')}
              className={`2xl:hidden px-4 py-2 text-sm font-medium border-b-2 transition flex items-center space-x-2 ${
                activeTab === 'abilities'
                  ? 'border-amber-500 text-amber-200'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>Voies & Capacités</span>
              <span className="bg-stone-800 text-amber-300 text-xs px-1.5 py-0.2 rounded font-mono">
                {character.acquiredAbilities.length}
              </span>
            </button>

            <button
              onClick={() => handleSelectTab('inventory')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === 'inventory' || (activeTab === 'abilities' && centerTab === 'inventory')
                  ? 'border-amber-500 text-amber-200'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Équipement & Bourse
            </button>

            <button
              onClick={() => handleSelectTab('bio')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === 'bio' || (activeTab === 'abilities' && centerTab === 'bio')
                  ? 'border-amber-500 text-amber-200'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Biographie & Traits
            </button>
          </div>

          {/* Active Tab rendering */}
          {/* On screens < 2xl, if activeTab is 'abilities', render AbilitiesTab here */}
          <div className="2xl:hidden">
            {activeTab === 'abilities' && (
              <AbilitiesTab
                character={character}
                stats={stats}
                capabilityBudget={capabilityBudget}
                expandedPaths={expandedPaths}
                togglePathExpand={togglePathExpand}
                toggleAbility={toggleAbility}
                updateCharacter={updateCharacter}
                onOpenLevelUp={onOpenLevelUp}
              />
            )}
          </div>

          {/* Tab 1: Combat (Armes & Armures) */}
          <div className={activeTab === 'combat' ? 'block' : centerTab === 'combat' ? 'hidden 2xl:block' : 'hidden'}>
            <CombatTab
              character={character}
              stats={stats}
              people={people}
              profile={profile}
              updateCharacter={updateCharacter}
              addWeapon={addWeapon}
              removeWeapon={removeWeapon}
            />
          </div>

          {/* Tab 3: Inventory */}
          <div className={activeTab === 'inventory' ? 'block' : centerTab === 'inventory' ? 'hidden 2xl:block' : 'hidden'}>
            <InventoryTab
              character={character}
              updateCharacter={updateCharacter}
            />
          </div>

          {/* Tab 4: Bio */}
          <div className={activeTab === 'bio' ? 'block' : centerTab === 'bio' ? 'hidden 2xl:block' : 'hidden'}>
            <BioTab
              character={character}
              stats={stats}
              people={people}
              updateCharacter={updateCharacter}
            />
          </div>
        </div>

        {/* COLUMN 3: Voies & Capacités (Permanently displayed on 2xl+) */}
        <div className="hidden 2xl:block 2xl:col-span-5 space-y-4">
          <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-serif font-bold text-amber-200 text-sm">Voies & Capacités du Héros</h3>
              <span className="bg-stone-800 text-amber-300 text-xs px-2 py-0.5 rounded font-mono">
                {character.acquiredAbilities.length} acquise{character.acquiredAbilities.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-xs text-stone-400">
              Budget : <span className="font-mono text-amber-300 font-bold">{capabilityBudget.spent} / {capabilityBudget.totalEarned}</span>
            </div>
          </div>

          <AbilitiesTab
            character={character}
            stats={stats}
            capabilityBudget={capabilityBudget}
            expandedPaths={expandedPaths}
            togglePathExpand={togglePathExpand}
            toggleAbility={toggleAbility}
            updateCharacter={updateCharacter}
            onOpenLevelUp={onOpenLevelUp}
          />
        </div>
      </div>
    </div>
  );
};
