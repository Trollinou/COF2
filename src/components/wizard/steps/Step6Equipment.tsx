import React from 'react';
import { CharacterSheet, ProfileData, PeopleData } from '../../../types/cof2';
import {
  PROFILE_EQUIPMENT_RULES,
  getAllowedArmors,
  getAllowedShields,
  getAllowedWeapons,
  WEAPONS,
} from '../../../engine/rulesEngine';
import { Shield, Swords, Crosshair, AlertTriangle, Trash2, Dices } from 'lucide-react';

interface Step6EquipmentProps {
  character: CharacterSheet;
  update: (partial: Partial<CharacterSheet>) => void;
  selectedProfile: ProfileData;
  selectedPeople: PeopleData;
  handleAddWeapon: (weaponRefId: string) => void;
  handleRemoveWeapon: (weaponId: string) => void;
  rollPurse: () => void;
}

export const Step6Equipment: React.FC<Step6EquipmentProps> = ({
  character,
  update,
  selectedProfile,
  selectedPeople,
  handleAddWeapon,
  handleRemoveWeapon,
  rollPurse,
}) => {
  const profileRule = PROFILE_EQUIPMENT_RULES[character.profileId] || {
    maxArmorId: 'chemise-mailles',
    shieldPermission: 'any',
    summaryArmor: 'Armure standard',
    summaryShield: 'Boucliers autorisés',
    summaryWeapons: 'Armes courantes',
  };
  const allowedArmors = getAllowedArmors(
    character.profileId,
    character.secondaryProfileId,
    character.peopleId,
  );
  const equippedArmor = allowedArmors.find(
    a => a.id === character.equippedArmorId,
  );
  const allowedShields = getAllowedShields(character.profileId, character.secondaryProfileId);
  const allowedWeapons = getAllowedWeapons(character.profileId, character.peopleId, character.secondaryProfileId);
  const hasTwoHandedWeapon = character.weapons.some(w => w.requiresTwoHands);
  const hasShield = !!character.equippedShieldId;

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <h3 className="font-serif font-bold text-lg text-amber-200">
          Étape 6 : Équipement & Armes de Départ
        </h3>
        <p className="text-xs text-stone-400">
          Sélectionnez vos armes et armures selon les limitations strictes de votre profil et de votre peuple.
        </p>
      </div>

      {/* Profile & Racial Restrictions Banner */}
      <div className="bg-stone-950 p-4 rounded-xl border border-amber-900/40 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
          <Shield className="w-4 h-4 text-amber-400" />
          <span>Règles d'équipement du profil ({selectedProfile.name}) :</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded bg-stone-900/80 border border-stone-800">
            <span className="text-stone-400 block text-[10px] uppercase font-semibold">Armure autorisée</span>
            <span className="text-amber-200 font-medium">{profileRule.summaryArmor}</span>
          </div>
          <div className="p-2.5 rounded bg-stone-900/80 border border-stone-800">
            <span className="text-stone-400 block text-[10px] uppercase font-semibold">Bouclier autorisé</span>
            <span className="text-amber-200 font-medium">{profileRule.summaryShield}</span>
          </div>
          <div className="p-2.5 rounded bg-stone-900/80 border border-stone-800">
            <span className="text-stone-400 block text-[10px] uppercase font-semibold">Maîtrise d'armes</span>
            <span className="text-stone-300 font-medium">{profileRule.summaryWeapons}</span>
          </div>
        </div>

        {/* Special racial restrictions */}
        {selectedPeople.equipmentRules?.summary && (
          <div className="mt-3 p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 flex items-start space-x-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-amber-300 block">Limitations morphologiques ({selectedPeople.name}) :</strong>
              <p className="text-stone-300 text-[11px] leading-relaxed">
                {selectedPeople.equipmentRules.summary}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Armor & Shield Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Armor Select */}
        <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 space-y-2">
          <label className="block text-xs font-semibold text-stone-300">
            Armure portée
          </label>
          {allowedArmors.length === 0 ? (
            <div className="p-2.5 rounded bg-red-950/20 border border-red-900/40 text-xs text-red-300">
              Aucune armure permise pour le profil <strong>{selectedProfile.name}</strong> (interdit par les voies).
            </div>
          ) : (
            <>
              <select
                value={character.equippedArmorId || ''}
                onChange={e => update({ equippedArmorId: e.target.value || undefined })}
                className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="">Aucune armure (DEF +0)</option>
                {allowedArmors.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} (DEF +{a.def}, AGI max {a.maxAgi ?? '—'})
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-stone-400">
                Limite profil : <span className="text-amber-300">{profileRule.summaryArmor}</span>
              </div>
              {equippedArmor?.notes && (
                <p className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-800/50 rounded px-2.5 py-1.5 mt-1">
                  {equippedArmor.notes}
                </p>
              )}
            </>
          )}
        </div>

        {/* Shield Select */}
        <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 space-y-2">
          <label className="block text-xs font-semibold text-stone-300">
            Bouclier porté
          </label>
          {allowedShields.length === 0 ? (
            <div className="p-2.5 rounded bg-red-950/20 border border-red-900/40 text-xs text-red-300">
              Aucun bouclier permis pour le profil <strong>{selectedProfile.name}</strong> (interdit par les voies).
            </div>
          ) : (
            <>
              <select
                value={character.equippedShieldId || ''}
                onChange={e => update({ equippedShieldId: e.target.value || undefined })}
                className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="">Aucun bouclier (DEF +0)</option>
                {allowedShields.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (DEF +{s.def})
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-stone-400">
                Limite profil : <span className="text-amber-300">{profileRule.summaryShield}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Starting Weapons */}
      <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div>
            <h4 className="font-serif font-bold text-amber-200 text-sm">
              Armes de départ maîtrisées
            </h4>
            <p className="text-xs text-stone-400">
              Uniquement les armes conformes aux règles de votre profil et de votre peuple.
            </p>
          </div>

          {/* Add Weapon Select */}
          <div className="flex items-center space-x-2">
            <select
              onChange={e => {
                if (e.target.value) {
                  handleAddWeapon(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-stone-900 border border-stone-700 text-xs text-stone-200 rounded px-2.5 py-1.5 focus:border-amber-500 focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>+ Ajouter une arme maîtrisée...</option>
              <optgroup label="Armes de contact autorisées">
                {allowedWeapons.filter(w => w.category === 'contact').map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.damage}) {w.requiresTwoHands && selectedPeople.equipmentRules?.twoHandedMinDamageDice ? ` [2 mains ${selectedPeople.name}]` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Armes à distance autorisées">
                {allowedWeapons.filter(w => w.category === 'distance').map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.damage}) {w.requiresTwoHands && selectedPeople.equipmentRules?.twoHandedMinDamageDice ? ` [2 mains ${selectedPeople.name}]` : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Weapons List */}
        <div className="space-y-2">
          {character.weapons.length === 0 ? (
            <div className="text-center py-4 text-xs text-stone-500 italic">
              Aucune arme sélectionnée. Choisissez-en une dans le menu ci-dessus.
            </div>
          ) : (
            character.weapons.map(w => {
              const isContact = w.category === 'contact';
              const baseW = WEAPONS.find(item => item.id === w.weaponRefId);
              const isRacial2H = !!selectedPeople.equipmentRules?.twoHandedMinDamageDice && w.requiresTwoHands && baseW?.hands === 1;

              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-stone-900/70 border border-stone-800"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded bg-stone-950 border border-stone-700 text-amber-400">
                      {isContact ? <Swords className="w-4 h-4" /> : <Crosshair className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-stone-200 text-xs">{w.name}</span>
                        {isRacial2H ? (
                          <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded font-medium">
                            2 mains ({selectedPeople.name})
                          </span>
                        ) : w.requiresTwoHands ? (
                          <span className="text-[10px] bg-stone-800 text-stone-300 border border-stone-700 px-1.5 py-0.5 rounded font-medium">
                            2 mains
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        DM : <strong className="text-amber-300">{w.damage}</strong> • Portée : {w.range || 'Contact'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveWeapon(w.id)}
                    className="text-stone-500 hover:text-red-400 p-1.5 rounded transition"
                    title="Supprimer cette arme"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* 2-Handed Weapon vs Shield Warning */}
        {hasShield && hasTwoHandedWeapon && (
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-center space-x-2 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Attention tactique :</strong> Vous avez équipé un bouclier et au moins une arme à deux mains. En combat, vous ne pouvez pas bénéficier du bonus de bouclier pendant que vous maniez une arme à deux mains.
            </span>
          </div>
        )}
      </div>

      {/* Starting Purse */}
      <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm text-amber-200">Bourse de départ (2d6 pa)</span>
          <div className="text-xs text-stone-400">
            Pièces d'argent initiales : <strong className="text-amber-300">{character.coins.pa} pa</strong>
          </div>
        </div>
        <button
          onClick={rollPurse}
          className="flex items-center space-x-1.5 bg-amber-700 hover:bg-amber-600 text-stone-100 px-3 py-1.5 rounded text-xs font-medium transition"
        >
          <Dices className="w-4 h-4" />
          <span>Lancer 2d6</span>
        </button>
      </div>
    </div>
  );
};
