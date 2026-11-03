import React from 'react';
import {
  BookOpen,
  User,
  Users,
  Shield,
  Sword,
  Database,
  Plus,
  Search,
} from 'lucide-react';

export type Category = 'paths' | 'profiles' | 'peoples' | 'armors' | 'weapons' | 'tables';

interface SidebarProps {
  currentCategory: Category;
  onSelectCategory: (category: Category) => void;
  items: Array<{ id: string; name: string; subtitle?: string; badge?: string }>;
  selectedId: string;
  onSelectItem: (id: string) => void;
  onAddNew: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  counts: Record<Category, number>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentCategory,
  onSelectCategory,
  items,
  selectedId,
  onSelectItem,
  onAddNew,
  search,
  onSearchChange,
  counts,
}) => {
  const categories: Array<{ id: Category; label: string; icon: React.ReactNode }> = [
    { id: 'paths', label: 'Voies', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'profiles', label: 'Profils', icon: <User className="w-4 h-4" /> },
    { id: 'peoples', label: 'Peuples', icon: <Users className="w-4 h-4" /> },
    { id: 'armors', label: 'Armures', icon: <Shield className="w-4 h-4" /> },
    { id: 'weapons', label: 'Armes', icon: <Sword className="w-4 h-4" /> },
    { id: 'tables', label: 'Tables', icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-80 border-r border-stone-800 bg-stone-950 flex flex-col h-full shrink-0">
      {/* Category Tabs */}
      <div className="p-3 border-b border-stone-800 grid grid-cols-3 gap-1 bg-stone-900/40">
        {categories.map(c => {
          const active = currentCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelectCategory(c.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-semibold transition-all ${
                active
                  ? 'bg-amber-600/90 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {c.icon}
                <span>{counts[c.id]}</span>
              </div>
              <span className="text-[10px] mt-0.5">{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Actions */}
      <div className="p-3 border-b border-stone-800 space-y-2 bg-stone-900/20">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={`Rechercher ${currentCategory}...`}
            className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {currentCategory !== 'tables' && (
          <button
            onClick={onAddNew}
            className="w-full py-1.5 px-3 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/60 text-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter un élément
          </button>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-stone-900">
        {items.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-500">
            Aucun élément trouvé.
          </div>
        ) : (
          items.map(item => {
            const active = selectedId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`w-full text-left p-3 text-xs transition-colors block ${
                  active
                    ? 'bg-amber-950/40 border-l-4 border-amber-500 text-stone-100 font-semibold'
                    : 'text-stone-300 hover:bg-stone-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{item.name || item.id}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.subtitle && (
                  <div className="text-[11px] text-stone-500 truncate mt-0.5">
                    {item.subtitle}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

