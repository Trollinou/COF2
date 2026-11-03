import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { AuditIssue } from '../audit';

interface AuditDashboardProps {
  issues: AuditIssue[];
  onSelectTarget: (category: AuditIssue['category'], targetId: string) => void;
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({ issues, onSelectTarget }) => {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-amber-400 flex items-center gap-2">
            🛡️ Tableau de Bord d'Audit & Cohérence COF2
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Vérification de l'intégrité relationnelle et de la validité structurelle des 5 fichiers de données.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-sm font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.length} Erreur{errors.length > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>{warnings.length} Avertissement{warnings.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="p-8 text-center bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-emerald-300">Intégrité Parfaite !</h3>
          <p className="text-stone-400 text-sm">
            Aucune anomalie détectée. Tous les identifiants croisés, voies, profils, armes et rangs sont parfaitement synchronisés.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {errors.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Erreurs Critiques ({errors.length})
              </h3>
              <div className="space-y-2">
                {errors.map(issue => (
                  <div
                    key={issue.id}
                    className="p-3.5 bg-red-950/30 border border-red-900/60 rounded-lg flex items-center justify-between hover:bg-red-950/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase px-2 py-0.5 rounded bg-red-900/80 text-red-200 font-mono">
                          {issue.category}
                        </span>
                        <span className="font-semibold text-stone-200">{issue.targetName}</span>
                        <span className="text-xs text-stone-400 font-mono">({issue.targetId})</span>
                        <span className="text-xs text-stone-500">• champ: <code className="text-stone-300">{issue.field}</code></span>
                      </div>
                      <p className="text-sm text-red-200">{issue.message}</p>
                    </div>
                    <button
                      onClick={() => onSelectTarget(issue.category, issue.targetId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-100 rounded text-xs font-medium transition-colors"
                    >
                      Corriger <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Avertissements ({warnings.length})
              </h3>
              <div className="space-y-2">
                {warnings.map(issue => (
                  <div
                    key={issue.id}
                    className="p-3.5 bg-amber-950/20 border border-amber-900/40 rounded-lg flex items-center justify-between hover:bg-amber-950/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 font-mono">
                          {issue.category}
                        </span>
                        <span className="font-semibold text-stone-200">{issue.targetName}</span>
                        <span className="text-xs text-stone-400 font-mono">({issue.targetId})</span>
                        <span className="text-xs text-stone-500">• champ: <code className="text-stone-300">{issue.field}</code></span>
                      </div>
                      <p className="text-sm text-amber-200">{issue.message}</p>
                    </div>
                    <button
                      onClick={() => onSelectTarget(issue.category, issue.targetId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800/80 text-amber-100 rounded text-xs font-medium transition-colors"
                    >
                      Inspecter <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

