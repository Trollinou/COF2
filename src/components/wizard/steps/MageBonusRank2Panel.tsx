import React from 'react';
import { CharacterSheet } from '../../../types/cof2';
import { getMageCreationRank2Ability, getPathById } from '../../../engine/rulesEngine';
import { Sparkles, Check } from 'lucide-react';
import { ActionBadges } from '../../sheet/ActionBadges';

interface MageBonusRank2PanelProps {
  character: CharacterSheet;
  onChange: (updated: CharacterSheet) => void;
  selectedProfilePaths: string[];
  isVoieDuMageActive: boolean;
}

export const MageBonusRank2Panel: React.FC<MageBonusRank2PanelProps> = ({
  character,
  onChange,
  selectedProfilePaths,
  isVoieDuMageActive,
}) => {
  const eligiblePathIds = [
    ...selectedProfilePaths,
    ...(isVoieDuMageActive ? ['voie-du-mage'] : []),
  ];

  const selectedRank2 = getMageCreationRank2Ability(character);

  const handleSelectRank2 = (pathId: string) => {
    const isAlreadySelected = selectedRank2?.pathId === pathId;
    const withoutRank2 = character.acquiredAbilities.filter(a => a.rank !== 2);
    const nextAcquired = isAlreadySelected
      ? withoutRank2
      : [...withoutRank2, { pathId, rank: 2 }];

    onChange({
      ...character,
      acquiredAbilities: nextAcquired,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-stone-950/80 p-4 rounded-xl border border-cyan-800/70 space-y-3 shadow">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-800">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h4 className="font-serif font-bold text-sm text-cyan-200">
            Capacité de Rang 2 Bonus (Famille des Mages)
          </h4>
        </div>
        <span
          className={`font-mono text-xs px-2.5 py-0.5 rounded font-bold border ${
            selectedRank2
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
              : 'bg-amber-950/80 text-amber-300 border-amber-700'
          }`}
        >
          {selectedRank2 ? '1 / 1 choisie ✓' : '0 / 1 — À choisir'}
        </span>
      </div>

      <p className="text-xs text-stone-300 leading-relaxed">
        <strong className="text-cyan-300">Règle officielle COF2 :</strong> En plus de ses capacités de rang 1, un personnage de la famille des mages obtient gratuitement dès le niveau 1 une capacité de{' '}
        <strong>rang 2</strong> au choix dans l&apos;une de ses deux voies de profil
        {isVoieDuMageActive ? ' ou le rang 2 de la Voie du Mage (Maîtrise de la magie)' : ''}.
      </p>

      {selectedProfilePaths.length < 2 && !isVoieDuMageActive && (
        <p className="text-xs text-amber-400 italic">
          Sélectionnez d&apos;abord vos 2 voies de profil ci-dessus pour voir toutes les capacités de rang 2 disponibles.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {eligiblePathIds.map(pathId => {
          const pathData = getPathById(pathId);
          const rank2 = pathData?.ranks.find(r => r.rank === 2);
          if (!pathData || !rank2) return null;

          const isSelected = selectedRank2?.pathId === pathId;
          const isMagePath = pathId === 'voie-du-mage';

          return (
            <button
              key={pathId}
              type="button"
              onClick={() => handleSelectRank2(pathId)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400 shadow-md'
                  : 'bg-stone-900/70 border-stone-800 hover:border-stone-600 hover:bg-stone-900'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
                    {pathData.name}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      isMagePath
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : 'bg-stone-800 text-stone-300 border border-stone-700'
                    }`}
                  >
                    {isMagePath ? 'Voie du Mage' : 'Voie de Profil'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`w-5 h-5 rounded-full text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-cyan-400 text-stone-950'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    2
                  </span>
                  <span className="font-semibold text-stone-100 text-xs">
                    {rank2.title}
                  </span>
                  <ActionBadges rank={rank2} />
                </div>

                <p className="text-xs text-stone-400 leading-relaxed">
                  {rank2.description}
                </p>
              </div>

              <div className="pt-1 flex items-center justify-end">
                {isSelected ? (
                  <span className="inline-flex items-center space-x-1 text-[11px] bg-cyan-500 text-stone-950 font-bold px-2.5 py-0.5 rounded">
                    <Check className="w-3 h-3" />
                    <span>Capacité Choisie</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-cyan-400/80 font-medium">
                    Cliquer pour choisir ce rang 2
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
