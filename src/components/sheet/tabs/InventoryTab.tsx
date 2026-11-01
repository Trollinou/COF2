import React from 'react';
import { CharacterSheet } from '../../../types/cof2';
import { Plus, Trash2 } from 'lucide-react';

interface InventoryTabProps {
  character: CharacterSheet;
  updateCharacter: (partial: Partial<CharacterSheet>) => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  character,
  updateCharacter,
}) => {
  return (
    <div className="space-y-6">
      {/* Money Purse */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow space-y-3">
        <h4 className="font-serif font-bold text-amber-200 text-sm">Bourse & Pièces</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 text-center">
            <label className="block text-[11px] text-amber-500 font-semibold mb-1">
              Pièces d'Argent (pa)
            </label>
            <input
              type="number"
              value={character.coins.pa}
              onChange={e =>
                updateCharacter({
                  coins: { ...character.coins, pa: parseInt(e.target.value, 10) || 0 },
                })
              }
              className="w-full text-center bg-transparent font-mono text-xl font-bold text-amber-300 focus:outline-none"
            />
          </div>

          <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 text-center">
            <label className="block text-[11px] text-yellow-500 font-semibold mb-1">
              Pièces d'Or (po)
            </label>
            <input
              type="number"
              value={character.coins.po}
              onChange={e =>
                updateCharacter({
                  coins: { ...character.coins, po: parseInt(e.target.value, 10) || 0 },
                })
              }
              className="w-full text-center bg-transparent font-mono text-xl font-bold text-yellow-300 focus:outline-none"
            />
          </div>

          <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 text-center">
            <label className="block text-[11px] text-orange-400 font-semibold mb-1">
              Pièces de Cuivre (pc)
            </label>
            <input
              type="number"
              value={character.coins.pc}
              onChange={e =>
                updateCharacter({
                  coins: { ...character.coins, pc: parseInt(e.target.value, 10) || 0 },
                })
              }
              className="w-full text-center bg-transparent font-mono text-xl font-bold text-orange-300 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Items Inventory */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-serif font-bold text-amber-200 text-sm">Inventaire d'équipement</h4>
          <button
            onClick={() => {
              const newItem = {
                id: 'item_' + Date.now(),
                name: 'Nouvel objet',
                quantity: 1,
              };
              updateCharacter({ inventory: [...character.inventory, newItem] });
            }}
            className="flex items-center space-x-1 text-xs bg-stone-800 hover:bg-stone-700 text-amber-300 px-2.5 py-1 rounded border border-stone-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un objet</span>
          </button>
        </div>

        <div className="space-y-2">
          {character.inventory.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center space-x-3 p-2 rounded bg-stone-950/60 border border-stone-800"
            >
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={e => {
                  const updated = [...character.inventory];
                  updated[idx] = { ...item, quantity: parseInt(e.target.value, 10) || 1 };
                  updateCharacter({ inventory: updated });
                }}
                className="w-14 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-center font-mono text-xs text-amber-300"
              />
              <input
                type="text"
                value={item.name}
                onChange={e => {
                  const updated = [...character.inventory];
                  updated[idx] = { ...item, name: e.target.value };
                  updateCharacter({ inventory: updated });
                }}
                className="flex-1 bg-transparent border-b border-transparent hover:border-stone-700 focus:border-amber-500 px-2 py-1 text-xs text-stone-200 focus:outline-none"
              />
              <button
                onClick={() => {
                  updateCharacter({
                    inventory: character.inventory.filter((_, i) => i !== idx),
                  });
                }}
                className="text-stone-500 hover:text-red-400 p-1"
                title="Supprimer cet objet"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

