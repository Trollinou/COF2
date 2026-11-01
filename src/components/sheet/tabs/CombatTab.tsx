import React from 'react';
import {
  CharacterSheet,
  ComputedCharacterStats,
  PeopleData,
  ProfileData,
} from '../../../types/cof2';
import {
  PROFILE_EQUIPMENT_RULES,
  getAllowedArmors,
  getAllowedShields,
  getAllowedWeapons,
  getWeaponAttackInfo,
  WEAPONS,
} from '../../../engine/rulesEngine';
import {
  AlertTriangle,
  Swords,
  Crosshair,
  Trash2,
} from 'lucide-react';

interface CombatTabProps {
  character: CharacterSheet;
  stats: ComputedCharacterStats;
  people?: PeopleData;
  profile?: ProfileData;
  updateCharacter: (partial: Partial<CharacterSheet>) => void;
  addWeapon: (weaponId: string) => void;
  removeWeapon: (instanceId: string) => void;
}

export const CombatTab: React.FC<CombatTabProps> = ({
  character,
  stats,
  people,
  profile,
  updateCharacter,
  addWeapon,
  removeWeapon,
}) => {
  const profileRule = PROFILE_EQUIPMENT_RULES[character.profileId] || {
    maxArmorId: 'chemise-mailles',
    shieldPermission: 'any',
    summaryArmor: 'Armure standard',
    summaryShield: 'Boucliers autorisés',
    summaryWeapons: 'Armes courantes',
  };
  const allowedArmors = getAllowedArmors(character.profileId);
  const allowedShields = getAllowedShields(character.profileId);
  const allowedWeapons = getAllowedWeapons(character.profileId, character.peopleId);
  const hasTwoHandedWeapon = character.weapons.some(w => w.requiresTwoHands);
  const hasShield = !!character.equippedShieldId;

  return (
    <div className="space-y-6">
      {/* Armors selection */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-2">
          <h4 className="font-serif font-bold text-amber-200 text-sm">
            Armure et Bouclier équipés
          </h4>
          <span className="text-xs text-stone-400">
            Règles : <strong className="text-amber-300">{profileRule.summaryArmor}</strong> • <strong className="text-amber-300">{profileRule.summaryShield}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Armor Selector */}
          <div>
            <label className="block text-xs text-stone-400 mb-1">Armure portée</label>
            {allowedArmors.length === 0 ? (
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 text-xs text-stone-400 italic">
                Aucune armure permise pour le profil {profile?.name || 'choisi'}.
              </div>
            ) : (
              <>
                <select
                  value={character.equippedArmorId || ''}
                  onChange={e => updateCharacter({ equippedArmorId: e.target.value || undefined })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-md px-3 py-2 text-sm text-stone-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Aucune armure (DEF +0)</option>
                  {allowedArmors.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} (DEF +{a.def}, AGI max {a.maxAgi ?? '—'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-stone-400 block mt-1">
                  Limite profil : {profileRule.summaryArmor}
                </span>
              </>
            )}
          </div>

          {/* Shield Selector */}
          <div>
            <label className="block text-xs text-stone-400 mb-1">Bouclier porté</label>
            {allowedShields.length === 0 ? (
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 text-xs text-stone-400 italic">
                Aucun bouclier permis pour le profil {profile?.name || 'choisi'}.
              </div>
            ) : (
              <>
                <select
                  value={character.equippedShieldId || ''}
                  onChange={e => updateCharacter({ equippedShieldId: e.target.value || undefined })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-md px-3 py-2 text-sm text-stone-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Aucun bouclier (DEF +0)</option>
                  {allowedShields.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} (DEF +{a.def})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-stone-400 block mt-1">
                  Limite profil : {profileRule.summaryShield}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Warning if 2-handed weapon and shield */}
        {hasShield && hasTwoHandedWeapon && (
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-center space-x-2 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Attention combat :</strong> Vous avez équipé un bouclier et au moins une arme à deux mains. Le bonus de bouclier ne s'applique pas lorsqu'une arme est maniée à deux mains.
            </span>
          </div>
        )}
      </div>

      {/* Weapons list */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-serif font-bold text-amber-200 text-sm">Armes du personnage</h4>
            <p className="text-[11px] text-stone-400">
              Maîtrise : {profileRule.summaryWeapons}
            </p>
          </div>

          {/* Quick Add Dropdown */}
          <div className="flex items-center space-x-2">
            <select
              onChange={e => {
                if (e.target.value) {
                  addWeapon(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-stone-800 border border-stone-700 text-xs text-stone-200 rounded px-2 py-1.5 focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>+ Ajouter une arme maîtrisée...</option>
              <optgroup label="Armes de contact autorisées">
                {allowedWeapons.filter(w => w.category === 'contact').map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.damage}) {w.requiresTwoHands && people?.equipmentRules?.twoHandedMinDamageDice ? ` [2 mains ${people.name}]` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Armes à distance autorisées">
                {allowedWeapons.filter(w => w.category === 'distance').map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.damage}) {w.requiresTwoHands && people?.equipmentRules?.twoHandedMinDamageDice ? ` [2 mains ${people.name}]` : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Racial reminder if size restrictions */}
        {people?.equipmentRules?.summary && (
          <div className="p-2.5 rounded bg-stone-950 border border-amber-900/40 text-[11px] text-stone-300 space-y-1">
            <div className="text-amber-300 font-semibold flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Règles morphologiques ({people.name}) :</span>
            </div>
            <p className="text-stone-400">
              {people.equipmentRules.summary}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {character.weapons.length === 0 ? (
            <div className="text-center py-6 text-stone-500 text-sm italic">
              Aucune arme équipée. Ajoutez une arme depuis le menu déroulant ci-dessus.
            </div>
          ) : (
            character.weapons.map(w => {
              const isContact = w.category === 'contact';
              const atkInfo = getWeaponAttackInfo(w, stats);
              const baseW = WEAPONS.find(item => item.id === w.weaponRefId);
              const isRacial2H = !!people?.equipmentRules?.twoHandedMinDamageDice && w.requiresTwoHands && baseW?.hands === 1;

              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-stone-950/70 border border-stone-800 hover:border-amber-700/50 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded bg-stone-900 border border-stone-700 text-amber-400">
                      {isContact ? <Swords className="w-4 h-4" /> : <Crosshair className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-stone-100 text-sm">{w.name}</span>
                        {isRacial2H ? (
                          <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded font-medium">
                            2 mains ({people?.name})
                          </span>
                        ) : w.requiresTwoHands ? (
                          <span className="text-[10px] bg-stone-800 text-stone-300 border border-stone-700 px-1.5 py-0.5 rounded font-medium">
                            2 mains
                          </span>
                        ) : null}
                        {atkInfo.isSubstituted && atkInfo.sourceName && (
                          <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/70 px-1.5 py-0.5 rounded font-medium">
                            {atkInfo.statUsed} [{atkInfo.sourceName}]
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-400">
                        Portée : {w.range || 'Contact'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right font-mono">
                      <div className="text-xs text-amber-400 font-bold">
                        Attaque : d20 {atkInfo.atkBonus >= 0 ? `+ ${atkInfo.atkBonus}` : `- ${Math.abs(atkInfo.atkBonus)}`}
                        {atkInfo.isSubstituted ? (
                          <span className="text-stone-400 font-normal ml-1 text-[10px]">
                            ({atkInfo.statUsed})
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-stone-300">
                        Dommages : <span className="font-semibold">{w.damage}</span> {atkInfo.dmBonus}
                      </div>
                    </div>

                    <button
                      onClick={() => removeWeapon(w.id)}
                      className="text-stone-500 hover:text-red-400 p-1 rounded"
                      title="Supprimer cette arme"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

