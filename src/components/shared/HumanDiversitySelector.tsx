import React from 'react';
import { Sparkles } from 'lucide-react';
import { CharacterSheet, HumanDiversityChoice } from '../../types/cof2';
import {
  HUMAN_DIVERSITY_PATH_ID,
  HUMAN_ORIGINS,
  HUMAN_TRADE_SUGGESTIONS,
  resolveHumanDiversity,
} from '../../utils/humanDiversity';

interface HumanDiversitySelectorProps {
  character: CharacterSheet;
  pathId: string;
  rankNumber: number;
  onChange?: (choice: HumanDiversityChoice) => void;
  readOnly?: boolean;
  variant?: 'amber' | 'emerald';
}

export const HumanDiversitySelector: React.FC<HumanDiversitySelectorProps> = ({
  character,
  pathId,
  rankNumber,
  onChange,
  readOnly = false,
  variant = 'amber',
}) => {
  if (pathId !== HUMAN_DIVERSITY_PATH_ID || rankNumber !== 1) return null;

  const choice = character.humanDiversity;
  const resolved = resolveHumanDiversity(choice);
  const isEmerald = variant === 'emerald';

  const containerClass = isEmerald
    ? 'mt-2.5 ml-7 pt-2 border-t border-emerald-900/60 space-y-2'
    : 'mt-2.5 ml-7 p-3 bg-stone-900 border border-amber-800/50 rounded-lg space-y-2.5';

  const headerClass = isEmerald
    ? 'text-[11px] font-semibold text-emerald-300 flex items-center space-x-1.5'
    : 'text-[11px] font-semibold text-amber-300 flex items-center space-x-1.5';

  if (readOnly) {
    if (!resolved) return null;
    return (
      <div className={containerClass}>
        <div className={headerClass}>
          <Sparkles className={`w-3.5 h-3.5 ${isEmerald ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>Origine choisie :</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold border ${
              isEmerald
                ? 'bg-emerald-900/60 text-emerald-200 border-emerald-700/60'
                : 'bg-amber-950/70 text-amber-200 border-amber-700/60'
            }`}
          >
            {resolved.originLabel}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-5">
          {resolved.effectiveDomains.map((domain, idx) => {
            if (!domain) return null;
            const isTrade = resolved.replacedDomainIndex === idx;
            return (
              <span
                key={`${idx}-${domain}`}
                className={`px-2 py-0.5 rounded text-[11px] border ${
                  isTrade
                    ? 'bg-indigo-950/60 text-indigo-200 border-indigo-700/60'
                    : isEmerald
                      ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/60'
                      : 'bg-stone-950 text-stone-200 border-stone-700'
                }`}
              >
                {domain} (+3){isTrade ? ' • gagne-pain' : ''}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  const currentOriginId = choice?.originId || '';
  const isCustomOrigin = currentOriginId === 'custom';
  const replacedIdx =
    choice?.replacedDomainIndex === 0 || choice?.replacedDomainIndex === 1
      ? choice.replacedDomainIndex
      : undefined;

  const updateChoice = (patch: Partial<HumanDiversityChoice>) => {
    if (!onChange) return;
    onChange({
      originId: currentOriginId || 'montagnard',
      ...choice,
      ...patch,
    });
  };

  const handleSelectOrigin = (originId: string) => {
    if (!onChange) return;
    onChange({
      ...choice,
      originId,
    });
  };

  const selectedPreset = HUMAN_ORIGINS.find(o => o.id === currentOriginId);
  const domain1Label = isCustomOrigin
    ? choice?.customDomain1?.trim() || 'Domaine 1'
    : selectedPreset?.domains[0] || 'Domaine 1';
  const domain2Label = isCustomOrigin
    ? choice?.customDomain2?.trim() || 'Domaine 2'
    : selectedPreset?.domains[1] || 'Domaine 2';

  const activeBtnClass = isEmerald
    ? 'bg-emerald-600 text-stone-950 font-bold border-emerald-500 shadow'
    : 'bg-amber-600 text-stone-950 font-bold border-amber-500 shadow';
  const idleBtnClass = isEmerald
    ? 'bg-stone-950 text-stone-300 border-stone-800 hover:border-emerald-700'
    : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-amber-700';

  return (
    <div className={containerClass}>
      <div className={headerClass}>
        <Sparkles className={`w-3.5 h-3.5 ${isEmerald ? 'text-emerald-400' : 'text-amber-400'}`} />
        <span>Origine géographique ou sociale (+3 aux tests de 2 domaines) :</span>
      </div>

      {/* Choix de l'origine */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {HUMAN_ORIGINS.map(origin => {
          const isChosen = currentOriginId === origin.id;
          return (
            <button
              key={origin.id}
              type="button"
              onClick={() => handleSelectOrigin(origin.id)}
              className={`px-2.5 py-1.5 rounded text-left text-xs transition border ${
                isChosen ? activeBtnClass : idleBtnClass
              }`}
            >
              <div className="font-semibold">{origin.label}</div>
              <div className={`text-[10px] ${isChosen ? 'text-stone-900/90' : 'text-stone-400'}`}>
                {origin.domains[0]} • {origin.domains[1]}
              </div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => handleSelectOrigin('custom')}
          className={`px-2.5 py-1.5 rounded text-left text-xs transition border sm:col-span-2 ${
            isCustomOrigin ? activeBtnClass : idleBtnClass
          }`}
        >
          <div className="font-semibold">Origine personnalisée (validation MJ)</div>
          <div className={`text-[10px] ${isCustomOrigin ? 'text-stone-900/90' : 'text-stone-400'}`}>
            Définir une culture locale et ses deux domaines (troglodyte, marais, etc.)
          </div>
        </button>
      </div>

      {/* Champs personnalisés si origine MJ */}
      {isCustomOrigin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <input
            type="text"
            value={choice?.customOriginName || ''}
            onChange={e => updateChoice({ originId: 'custom', customOriginName: e.target.value })}
            placeholder="Nom de l'origine (ex: Marais)"
            className="bg-stone-950 border border-stone-700 rounded px-2.5 py-1 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
          />
          <input
            type="text"
            value={choice?.customDomain1 || ''}
            onChange={e => updateChoice({ originId: 'custom', customDomain1: e.target.value })}
            placeholder="Domaine 1 (ex: Discrétion)"
            disabled={replacedIdx === 0}
            className="bg-stone-950 border border-stone-700 rounded px-2.5 py-1 text-xs text-stone-200 focus:border-amber-500 focus:outline-none disabled:opacity-40"
          />
          <input
            type="text"
            value={choice?.customDomain2 || ''}
            onChange={e => updateChoice({ originId: 'custom', customDomain2: e.target.value })}
            placeholder="Domaine 2 (ex: Orientation)"
            disabled={replacedIdx === 1}
            className="bg-stone-950 border border-stone-700 rounded px-2.5 py-1 text-xs text-stone-200 focus:border-amber-500 focus:outline-none disabled:opacity-40"
          />
        </div>
      )}

      {/* Remplacement optionnel par un gagne-pain / origine sociale */}
      {currentOriginId && (
        <div className="pt-2 border-t border-stone-800/80 space-y-2">
          <div className="text-[11px] text-stone-300 font-medium">
            Remplacement optionnel par un gagne-pain ou une origine sociale :
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                updateChoice({ replacedDomainIndex: undefined, replacementTrade: undefined })
              }
              className={`px-2 py-1 rounded text-[11px] transition border ${
                replacedIdx === undefined ? activeBtnClass : idleBtnClass
              }`}
            >
              Conserver les 2 domaines
            </button>
            <button
              type="button"
              onClick={() => updateChoice({ replacedDomainIndex: 0 })}
              className={`px-2 py-1 rounded text-[11px] transition border ${
                replacedIdx === 0 ? activeBtnClass : idleBtnClass
              }`}
            >
              Remplacer « {domain1Label} »
            </button>
            <button
              type="button"
              onClick={() => updateChoice({ replacedDomainIndex: 1 })}
              className={`px-2 py-1 rounded text-[11px] transition border ${
                replacedIdx === 1 ? activeBtnClass : idleBtnClass
              }`}
            >
              Remplacer « {domain2Label} »
            </button>
          </div>

          {replacedIdx !== undefined && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1">
                {HUMAN_TRADE_SUGGESTIONS.map(trade => {
                  const isSelected =
                    choice?.replacementTrade?.trim().toLowerCase() === trade.toLowerCase();
                  return (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => updateChoice({ replacementTrade: trade })}
                      className={`px-2 py-0.5 rounded text-[10px] transition border ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-semibold border-indigo-500'
                          : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-indigo-700'
                      }`}
                    >
                      {trade}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={choice?.replacementTrade || ''}
                onChange={e => updateChoice({ replacementTrade: e.target.value })}
                placeholder="Saisir un gagne-pain ou une origine sociale..."
                className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1 text-xs text-stone-200 focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[10px] text-stone-400">
                Le gagne-pain ne peut pas être un profil et le bonus de +3 ne s&apos;applique jamais aux tests de combat.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
