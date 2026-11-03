import React from 'react';
import { Database } from 'lucide-react';

interface TablesFormProps {
  tables: Record<string, any>;
  onChange: (updated: Record<string, any>) => void;
}

export const TablesForm: React.FC<TablesFormProps> = ({ tables, onChange }) => {
  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
          <Database className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-stone-100">Tables Référentielles & Aléatoires (tables.json)</h3>
        </div>
        <p className="text-xs text-stone-400">
          Ce fichier contient les tables d'aide à la création (coûts des caractéristiques, idéaux, travers, etc.).
        </p>

        <textarea
          rows={24}
          value={JSON.stringify(tables, null, 2)}
          onChange={e => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(parsed);
            } catch {
              // ignore invalid json during typing
            }
          }}
          className="w-full bg-stone-950 border border-stone-700 rounded p-3 font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-500 leading-relaxed"
        />
      </div>
    </div>
  );
};

