import React from 'react';
import { BookOpen } from 'lucide-react';
import type { ResolvedExternalGrant, ResolvedHumanDiversity } from '../../../bindings';
import {
  getDeityByDomainPathId,
  getPathById,
  isDomainPath,
} from '../../../engine/compendium';
import type { CharacterSheet } from '../../../types/cof2';
import { HUMAN_DIVERSITY_PATH_ID } from '../../../utils/uiConstants';

interface Step7PathsSectionProps {
  character: CharacterSheet;
  pathIdsToDisplay: string[];
  externalGrants: ResolvedExternalGrant[];
  resolvedDiversity: ResolvedHumanDiversity | null;
}

export const Step7PathsSection: React.FC<Step7PathsSectionProps> = ({
  character,
  pathIdsToDisplay,
  externalGrants,
  resolvedDiversity,
}) => {
  return (
    <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-3">
      <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5" />
        <span>Voies & Rangs choisis</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pathIdsToDisplay.map((pid) => {
          const pathObj = getPathById(pid);
          if (!pathObj) return null;
          const deity = isDomainPath(pid)
            ? getDeityByDomainPathId(pid)
            : undefined;
          const ranksInPath = character.acquiredAbilities
            .filter((a) => a.pathId === pid)
            .sort((a, b) => a.rank - b.rank);

          return (
            <div
              key={`sum_path_${pid}`}
              className="bg-stone-900 border border-stone-800 rounded-lg p-3 space-y-2"
            >
              <div>
                <div className="font-serif font-bold text-xs text-amber-200">
                  {pathObj.name}
                </div>
                {deity && (
                  <div className="text-[10px] text-stone-400">
                    Divinité : {deity.name}
                  </div>
                )}
              </div>
              <ul className="space-y-1">
                {ranksInPath.map((acq) => {
                  const rankData = pathObj.ranks.find(
                    (r) => r.rank === acq.rank,
                  );
                  if (!rankData) return null;
                  const choiceKey = `${pid}_${acq.rank}`;
                  const chosenOptId = character.pathRankChoices?.[choiceKey];
                  const chosenOpt = rankData.modifiers?.choiceOptions?.find(
                    (o) => o.id === chosenOptId,
                  );
                  const extGrant = externalGrants.find(
                    (g) => g.sourceKey === choiceKey,
                  );
                  const extPath = extGrant?.ability
                    ? getPathById(extGrant.ability.pathId)
                    : undefined;
                  const extRank = extPath?.ranks.find(
                    (r) => r.rank === extGrant?.ability?.rank,
                  );
                  const diversityResolved =
                    pid === HUMAN_DIVERSITY_PATH_ID && acq.rank === 1
                      ? resolvedDiversity
                      : null;

                  return (
                    <li
                      key={`${pid}_${acq.rank}`}
                      className="text-xs text-stone-200 flex items-start gap-1.5"
                    >
                      <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono text-[10px] shrink-0 mt-0.5">
                        R{acq.rank}
                      </span>
                      <div>
                        <span className="font-medium">{rankData.title}</span>
                        {chosenOpt && (
                          <span className="text-[10px] text-emerald-300 ml-1.5">
                            ({chosenOpt.label})
                          </span>
                        )}
                        {diversityResolved && (
                          <span className="text-[10px] text-emerald-300 ml-1.5">
                            ({diversityResolved.originLabel} :{' '}
                            {diversityResolved.effectiveDomains
                              .filter(Boolean)
                              .join(', ')}
                            )
                          </span>
                        )}
                        {extRank && (
                          <span className="text-[10px] text-indigo-300 ml-1.5">
                            → {extRank.title}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};
