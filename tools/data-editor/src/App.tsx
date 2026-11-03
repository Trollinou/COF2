import React, { useState, useEffect, useMemo } from 'react';
import type { FullDataset, AuditIssue } from './audit';
import { runFullAudit } from './audit';
import { Sidebar, Category } from './components/Sidebar';
import { PathForm } from './components/PathForm';
import { ProfileForm } from './components/ProfileForm';
import { PeopleForm } from './components/PeopleForm';
import { EquipmentForm } from './components/EquipmentForm';
import { TablesForm } from './components/TablesForm';
import { AuditDashboard } from './components/AuditDashboard';
import {
  Save,
  RotateCcw,
  ShieldAlert,
  Archive,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { PathData, ProfileData, PeopleData, ArmorItem, WeaponItem } from '../../../src/types/cof2.ts';

export const App: React.FC = () => {
  const [data, setData] = useState<FullDataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingFile, setSavingFile] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentCategory, setCurrentCategory] = useState<Category>('paths');
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [activeView, setActiveView] = useState<'editor' | 'audit' | 'backups'>('editor');

  // Backups modal
  const [backupsList, setBackupsList] = useState<Array<{ filename: string; size: number; createdAt: string }>>([]);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);

  // Dirty state tracking (keys: 'paths' | 'profiles' | 'peoples' | 'equipment' | 'tables')
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());

  // 1. Initial Load
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      setData(json);

      // Select first item if none selected
      if (json.paths?.length > 0) {
        setSelectedId(json.paths[0].id);
      }
    } catch (err: any) {
      setErrorMessage(`Impossible de charger les données: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Audit Run
  const auditIssues = useMemo(() => {
    if (!data) return [];
    return runFullAudit(data);
  }, [data]);

  // 3. Mark dirty helper
  const markDirty = (file: string) => {
    setDirtyFiles(prev => new Set(prev).add(file));
  };

  // 4. Save file to server
  const handleSaveFile = async (fileKey: 'paths' | 'profiles' | 'peoples' | 'equipment' | 'tables') => {
    if (!data) return;
    try {
      setSavingFile(fileKey);
      setErrorMessage(null);
      const payload = data[fileKey];

      const res = await fetch(`/api/data/${fileKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `Erreur serveur ${res.status}`);
      }

      const resJson = await res.json();
      setSaveMessage(`Fichier ${fileKey}.json enregistré avec succès ! Backup : ${resJson.backup}`);
      setTimeout(() => setSaveMessage(null), 5000);

      setDirtyFiles(prev => {
        const next = new Set(prev);
        next.delete(fileKey);
        return next;
      });
    } catch (err: any) {
      setErrorMessage(`Échec de sauvegarde (${fileKey}): ${err.message}`);
    } finally {
      setSavingFile(null);
    }
  };

  // Save all modified files
  const handleSaveAll = async () => {
    for (const f of Array.from(dirtyFiles)) {
      await handleSaveFile(f as any);
    }
  };

  // 5. Backups management
  const openBackups = async () => {
    setActiveView('backups');
    try {
      setLoadingBackups(true);
      const res = await fetch('/api/backups');
      const list = await res.json();
      setBackupsList(list);
    } catch (err: any) {
      setErrorMessage(`Impossible de lister les backups: ${err.message}`);
    } finally {
      setLoadingBackups(false);
    }
  };

  const restoreBackup = async (filename: string) => {
    if (!confirm(`Voulez-vous vraiment écraser les données actuelles par la sauvegarde "${filename}" ?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/restore/${filename}`, { method: 'POST' });
      if (!res.ok) throw new Error('Échec de la restauration');
      await loadData();
      setDirtyFiles(new Set());
      setSaveMessage(`Sauvegarde ${filename} restaurée avec succès !`);
      setTimeout(() => setSaveMessage(null), 5000);
      setActiveView('editor');
    } catch (err: any) {
      setErrorMessage(`Erreur de restauration: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 6. Delete item
  const handleDeleteCurrent = () => {
    if (!data || !selectedId) return;
    if (!confirm(`Confirmer la suppression de "${selectedId}" ?`)) return;

    if (currentCategory === 'paths') {
      const next = data.paths.filter(p => p.id !== selectedId);
      setData({ ...data, paths: next });
      markDirty('paths');
      if (next.length > 0) setSelectedId(next[0].id);
    } else if (currentCategory === 'profiles') {
      const next = data.profiles.filter(p => p.id !== selectedId);
      setData({ ...data, profiles: next });
      markDirty('profiles');
      if (next.length > 0) setSelectedId(next[0].id);
    } else if (currentCategory === 'peoples') {
      const next = data.peoples.filter(p => p.id !== selectedId);
      setData({ ...data, peoples: next });
      markDirty('peoples');
      if (next.length > 0) setSelectedId(next[0].id);
    } else if (currentCategory === 'armors') {
      const next = data.equipment.armors.filter(a => a.id !== selectedId);
      setData({ ...data, equipment: { ...data.equipment, armors: next } });
      markDirty('equipment');
      if (next.length > 0) setSelectedId(next[0].id);
    } else if (currentCategory === 'weapons') {
      const next = data.equipment.weapons.filter(w => w.id !== selectedId);
      setData({ ...data, equipment: { ...data.equipment, weapons: next } });
      markDirty('equipment');
      if (next.length > 0) setSelectedId(next[0].id);
    }
  };

  // 7. Add new item
  const handleAddNew = () => {
    if (!data) return;
    const newId = `nouveau-${Date.now().toString(36)}`;

    if (currentCategory === 'paths') {
      const newPath: PathData = {
        id: newId,
        name: 'Nouvelle Voie',
        symbol: '⚔️',
        type: 'profile',
        ranks: [1, 2, 3, 4, 5].map(r => ({
          rank: r,
          title: `Capacité ${r}`,
          actionType: 'Action',
          isSpell: false,
          description: '',
        })),
      };
      setData({ ...data, paths: [newPath, ...data.paths] });
      setSelectedId(newId);
      markDirty('paths');
    } else if (currentCategory === 'profiles') {
      const newProfile: ProfileData = {
        id: newId,
        name: 'Nouveau Profil',
        family: 'Combattants',
        source: 'base',
        tagline: '',
        primaryStats: ['FOR', 'CON'],
        hpPerLevel: 6,
        hd: 'd8',
        bonusPC: 0,
        bonusDR: 0,
        hasMageBonus: false,
        description: '',
        weaponsAndArmor: '',
        startingEquipment: '',
        paths: [],
      };
      setData({ ...data, profiles: [newProfile, ...data.profiles] });
      setSelectedId(newId);
      markDirty('profiles');
    } else if (currentCategory === 'peoples') {
      const newPeople: PeopleData = {
        id: newId,
        name: 'Nouveau Peuple',
        source: 'base',
        description: '',
        bonusOptions: [],
        malusOptions: [],
        reperes: '',
        startingAge: '18 ans',
        lifeExpectancy: '80 ans',
        heightRange: '1m70',
        weightRange: '70 kg',
        physicalTraits: '',
        defaultLanguages: 'Commun',
        racialPathId: null,
        names: { masculine: [], feminine: [], namingTip: '' },
      };
      setData({ ...data, peoples: [newPeople, ...data.peoples] });
      setSelectedId(newId);
      markDirty('peoples');
    } else if (currentCategory === 'armors') {
      const newArmor: ArmorItem = {
        id: newId,
        name: 'Nouvelle Armure',
        def: 2,
        maxAgi: null,
        price: '10 pa',
        type: 'armor',
      };
      setData({ ...data, equipment: { ...data.equipment, armors: [newArmor, ...data.equipment.armors] } });
      setSelectedId(newId);
      markDirty('equipment');
    } else if (currentCategory === 'weapons') {
      const newWeapon: WeaponItem = {
        id: newId,
        name: 'Nouvelle Arme',
        category: 'contact',
        damage: '1d6',
        maxDamageDice: 6,
        critMin: 20,
        damageType: 'contondant',
        range: 'Contact',
        hands: 1,
        tags: [],
        notes: '',
      };
      setData({ ...data, equipment: { ...data.equipment, weapons: [newWeapon, ...data.equipment.weapons] } });
      setSelectedId(newId);
      markDirty('equipment');
    }
  };

  // Helper counts
  const counts: Record<Category, number> = {
    paths: data?.paths?.length || 0,
    profiles: data?.profiles?.length || 0,
    peoples: data?.peoples?.length || 0,
    armors: data?.equipment?.armors?.length || 0,
    weapons: data?.equipment?.weapons?.length || 0,
    tables: data?.tables ? Object.keys(data.tables).length : 0,
  };

  // Filtered sidebar items
  const sidebarItems = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();

    if (currentCategory === 'paths') {
      return (data.paths || [])
        .filter(p => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
        .map(p => ({ id: p.id, name: p.name, subtitle: `${p.type} • ${p.owner || p.symbol || ''}`, badge: p.type }));
    }
    if (currentCategory === 'profiles') {
      return (data.profiles || [])
        .filter(p => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
        .map(p => ({ id: p.id, name: p.name, subtitle: p.family, badge: p.hd }));
    }
    if (currentCategory === 'peoples') {
      return (data.peoples || [])
        .filter(p => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
        .map(p => ({ id: p.id, name: p.name, subtitle: p.racialPathId || 'Sans voie raciale', badge: p.source }));
    }
    if (currentCategory === 'armors') {
      return (data.equipment?.armors || [])
        .filter(a => !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
        .map(a => ({ id: a.id, name: a.name, subtitle: `+${a.def} DEF • ${a.price}`, badge: a.type }));
    }
    if (currentCategory === 'weapons') {
      return (data.equipment?.weapons || [])
        .filter(w => !q || w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q))
        .map(w => ({ id: w.id, name: w.name, subtitle: `${w.damage} • ${w.category}`, badge: `${w.hands}M` }));
    }
    if (currentCategory === 'tables') {
      return [{ id: 'tables-root', name: 'tables.json', subtitle: 'Tables de référence globales', badge: 'JSON' }];
    }
    return [];
  }, [data, currentCategory, search]);

  if (loading && !data) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-950 text-stone-200 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <h2 className="text-xl font-bold font-serif">Chargement des Données COF2...</h2>
        <p className="text-stone-400 text-sm">Lecture des fichiers JSON dans src/data/...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-950 text-stone-200 space-y-4 p-6">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold">Erreur de chargement</h2>
        <p className="text-red-400 text-sm">{errorMessage}</p>
        <button onClick={loadData} className="px-4 py-2 bg-amber-600 rounded text-stone-950 font-bold">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-stone-950 text-stone-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <header className="h-14 border-b border-stone-800 bg-stone-900/90 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">📜</span>
          <div>
            <h1 className="text-sm font-bold font-serif tracking-wider text-amber-400 flex items-center gap-2">
              COF2 DATA EDITOR <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-mono">DEV ONLY</span>
            </h1>
          </div>
        </div>

        {/* Status messages */}
        {saveMessage && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-3 py-1 rounded-full animate-fade-in">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{saveMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/70 border border-red-800/60 px-3 py-1 rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Actions buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView(activeView === 'audit' ? 'editor' : 'audit')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              auditIssues.length > 0
                ? 'bg-amber-950/70 border border-amber-800/80 text-amber-300 hover:bg-amber-900/70'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Audit ({auditIssues.length})</span>
          </button>

          <button
            onClick={openBackups}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-semibold transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Sauvegardes</span>
          </button>

          {dirtyFiles.size > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={savingFile !== null}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold shadow-md transition-colors disabled:opacity-50"
            >
              {savingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Sauvegarder ({dirtyFiles.size})</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentCategory={currentCategory}
          onSelectCategory={cat => {
            setCurrentCategory(cat);
            setActiveView('editor');
            const items = cat === 'paths' ? data.paths : cat === 'profiles' ? data.profiles : cat === 'peoples' ? data.peoples : cat === 'armors' ? data.equipment.armors : cat === 'weapons' ? data.equipment.weapons : [];
            if (items && items.length > 0) setSelectedId(items[0].id);
          }}
          items={sidebarItems}
          selectedId={selectedId}
          onSelectItem={id => {
            setSelectedId(id);
            setActiveView('editor');
          }}
          onAddNew={handleAddNew}
          search={search}
          onSearchChange={setSearch}
          counts={counts}
        />

        {/* Center / Form / Audit View */}
        <main className="flex-1 bg-stone-950 overflow-y-auto p-6">
          {activeView === 'audit' ? (
            <AuditDashboard
              issues={auditIssues}
              onSelectTarget={(cat, targetId) => {
                if (cat === 'equipment') {
                  const isArmor = data.equipment.armors.some(a => a.id === targetId);
                  setCurrentCategory(isArmor ? 'armors' : 'weapons');
                } else {
                  setCurrentCategory(cat);
                }
                setSelectedId(targetId);
                setActiveView('editor');
              }}
            />
          ) : activeView === 'backups' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold font-serif text-amber-400 flex items-center gap-2">
                    <Archive className="w-5 h-5" /> Historique des Sauvegardes (.bak)
                  </h2>
                  <p className="text-stone-400 text-xs mt-1">
                    Chaque écriture crée automatiquement un instantané horodaté. Vous pouvez restaurer un fichier antérieur à tout moment.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('editor')}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs"
                >
                  Fermer
                </button>
              </div>

              {loadingBackups ? (
                <div className="p-8 text-center text-stone-400">Chargement des sauvegardes...</div>
              ) : backupsList.length === 0 ? (
                <div className="p-8 text-center bg-stone-900/40 border border-stone-800 rounded-xl text-stone-500 text-sm">
                  Aucun fichier de sauvegarde pour le moment.
                </div>
              ) : (
                <div className="divide-y divide-stone-800 border border-stone-800 rounded-xl bg-stone-900/40 overflow-hidden">
                  {backupsList.map(b => (
                    <div key={b.filename} className="p-3.5 flex items-center justify-between hover:bg-stone-900 transition-colors">
                      <div>
                        <div className="font-mono text-xs font-semibold text-stone-200">{b.filename}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {new Date(b.createdAt).toLocaleString()} • {(b.size / 1024).toFixed(1)} Ko
                        </div>
                      </div>
                      <button
                        onClick={() => restoreBackup(b.filename)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-800 text-amber-300 hover:bg-amber-900/60 rounded text-xs transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header of the Form */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-3 max-w-4xl">
                <div className="text-xs text-stone-400">
                  Édition en direct • Fichier : <span className="text-amber-400 font-mono">{currentCategory === 'armors' || currentCategory === 'weapons' ? 'equipment.json' : `${currentCategory}.json`}</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentCategory !== 'tables' && (
                    <button
                      onClick={handleDeleteCurrent}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded transition-colors"
                      title="Supprimer cet élément"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const fileKey = currentCategory === 'armors' || currentCategory === 'weapons' ? 'equipment' : currentCategory;
                      handleSaveFile(fileKey as any);
                    }}
                    disabled={savingFile !== null}
                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded transition-colors disabled:opacity-50"
                  >
                    {savingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Enregistrer ce fichier
                  </button>
                </div>
              </div>

              {/* Form Renderers */}
              {currentCategory === 'paths' && (() => {
                const currentPath = data.paths.find(p => p.id === selectedId) || data.paths[0];
                if (!currentPath) return null;
                return (
                  <PathForm
                    path={currentPath}
                    allWeapons={data.equipment.weapons}
                    onChange={updated => {
                      const next = data.paths.map(p => p.id === currentPath.id ? updated : p);
                      setData({ ...data, paths: next });
                      if (updated.id !== currentPath.id) setSelectedId(updated.id);
                      markDirty('paths');
                    }}
                  />
                );
              })()}

              {currentCategory === 'profiles' && (() => {
                const currentProfile = data.profiles.find(p => p.id === selectedId) || data.profiles[0];
                if (!currentProfile) return null;
                return (
                  <ProfileForm
                    profile={currentProfile}
                    allPaths={data.paths}
                    allArmors={data.equipment.armors}
                    allWeapons={data.equipment.weapons}
                    onChange={updated => {
                      const next = data.profiles.map(p => p.id === currentProfile.id ? updated : p);
                      setData({ ...data, profiles: next });
                      if (updated.id !== currentProfile.id) setSelectedId(updated.id);
                      markDirty('profiles');
                    }}
                  />
                );
              })()}

              {currentCategory === 'peoples' && (() => {
                const currentPeople = data.peoples.find(p => p.id === selectedId) || data.peoples[0];
                if (!currentPeople) return null;
                return (
                  <PeopleForm
                    people={currentPeople}
                    allPaths={data.paths}
                    allArmors={data.equipment.armors}
                    allWeapons={data.equipment.weapons}
                    onChange={updated => {
                      const next = data.peoples.map(p => p.id === currentPeople.id ? updated : p);
                      setData({ ...data, peoples: next });
                      if (updated.id !== currentPeople.id) setSelectedId(updated.id);
                      markDirty('peoples');
                    }}
                  />
                );
              })()}

              {(currentCategory === 'armors' || currentCategory === 'weapons') && (
                <EquipmentForm
                  equipment={data.equipment}
                  selectedSubId={selectedId}
                  selectedSubType={currentCategory === 'armors' ? 'armor' : 'weapon'}
                  onChange={updated => {
                    setData({ ...data, equipment: updated });
                    markDirty('equipment');
                  }}
                />
              )}

              {currentCategory === 'tables' && (
                <TablesForm
                  tables={data.tables}
                  onChange={updated => {
                    setData({ ...data, tables: updated });
                    markDirty('tables');
                  }}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
