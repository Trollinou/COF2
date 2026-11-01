import React from 'react';
import { CharacterSheet, ProfileData, ProfileFamily } from '../../../types/cof2';
import { PROFILES, STAT_NAMES, getPathById, getProfileById } from '../../../engine/rulesEngine';
import { Search, CheckCircle2, ChevronRight, Sparkles, Target, Shuffle, Heart, Shield } from 'lucide-react';

interface Step3ProfilesProps {
  character: CharacterSheet;
  update: (partial: Partial<CharacterSheet>) => void;
  selectedProfile: ProfileData;
  handleSelectProfile: (profileId: string) => void;
  profileFamilyFilter: ProfileFamily | 'all';
  setProfileFamilyFilter: (filter: ProfileFamily | 'all') => void;
  profileSearch: string;
  setProfileSearch: (search: string) => void;
  filteredProfiles: ProfileData[];
}

export const Step3Profiles: React.FC<Step3ProfilesProps> = ({
  character,
  update,
  selectedProfile,
  handleSelectProfile,
  profileFamilyFilter,
  setProfileFamilyFilter,
  profileSearch,
  setProfileSearch,
  filteredProfiles,
}) => {
  const isHybrid = Boolean(character.isHybrid);
  const secondaryProfile = character.secondaryProfileId ? getProfileById(character.secondaryProfileId) : undefined;

  const handleToggleHybrid = (enable: boolean) => {
    if (enable) {
      // Pick a default secondary profile different from the primary profile
      const defaultSec = PROFILES.find(p => p.id !== character.profileId)?.id || 'druide';
      update({
        isHybrid: true,
        secondaryProfileId: character.secondaryProfileId || defaultSec,
      });
    } else {
      update({
        isHybrid: false,
        secondaryProfileId: undefined,
      });
    }
  };

  const handleSelectSecondaryProfile = (secId: string) => {
    if (secId === character.profileId) return;
    update({ secondaryProfileId: secId });
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow space-y-5">
      <div className="border-b border-stone-800 pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-serif font-bold text-lg text-amber-200">
            Étape 3 : Choix du Profil (Classe)
          </h3>
          <p className="text-xs text-stone-400">
            Sélectionnez votre profil dans la liste à gauche. Sa description, ses caractéristiques clés et son équipement s'affichent instantanément à droite.
          </p>
        </div>
        <div className="text-xs font-mono text-stone-400">
          {filteredProfiles.length} profil{filteredProfiles.length > 1 ? 's' : ''} disponible{filteredProfiles.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Mode Switcher: Profil Standard vs Profil Hybride */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950 p-3 rounded-xl border border-stone-800">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-stone-300 font-semibold">Mode de profil :</span>
          <div className="flex rounded-lg bg-stone-900 p-0.5 border border-stone-800 text-xs">
            <button
              type="button"
              onClick={() => handleToggleHybrid(false)}
              className={`px-3 py-1 rounded font-medium transition ${
                !isHybrid
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Profil Standard
            </button>
            <button
              type="button"
              onClick={() => handleToggleHybrid(true)}
              className={`px-3 py-1 rounded font-medium transition flex items-center space-x-1.5 ${
                isHybrid
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Profil Hybride (Avancé)</span>
            </button>
          </div>
        </div>

        {isHybrid && (
          <span className="text-[11px] text-amber-300/90 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-900/60">
            Règles COF2 chap. 9 : 1 Profil Principal + 1 Profil Secondaire
          </span>
        )}
      </div>

      {/* Hybrid Configuration Banner */}
      {isHybrid && (
        <div className="bg-gradient-to-r from-amber-950/50 via-stone-950 to-amber-950/50 p-4 rounded-xl border border-amber-800/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/40 pb-2">
            <div className="flex items-center space-x-2">
              <Shuffle className="w-4 h-4 text-amber-400" />
              <h4 className="font-serif font-bold text-sm text-amber-200">
                Configuration du Profil Hybride (Niveau 1)
              </h4>
            </div>
            <div className="text-xs text-amber-300 font-mono">
              PV Niv 1 = {selectedProfile.hpPerLevel} ({selectedProfile.name}) + {secondaryProfile?.hpPerLevel || 4} ({secondaryProfile?.name || 'Secondaire'}) + CON
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="bg-stone-900/80 p-3 rounded-lg border border-amber-900/40 space-y-1">
              <div className="text-[10px] uppercase font-bold text-amber-400">Profil Principal :</div>
              <div className="text-xs text-stone-200 font-semibold">
                {selectedProfile.name} ({selectedProfile.family})
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Fixe le Dé de Récupération (<strong>{selectedProfile.hd}</strong>), les avantages de famille et l'équipement par défaut. Choisissez-le dans la liste de gauche.
              </p>
            </div>

            <div className="bg-stone-900/80 p-3 rounded-lg border border-amber-900/40 space-y-2">
              <div className="text-[10px] uppercase font-bold text-amber-400">Profil Secondaire :</div>
              <select
                value={character.secondaryProfileId || ''}
                onChange={e => handleSelectSecondaryProfile(e.target.value)}
                className="w-full bg-stone-950 border border-amber-700/60 rounded px-2.5 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
              >
                {PROFILES.filter(p => p.id !== character.profileId).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.family} • {p.hpPerLevel} PV/niv)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Apporte 5 voies supplémentaires accessibles et la maîtrise de toutes ses armes & armures dès le niveau 1.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* GAUCHE : LISTE DES PROFILS */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-2.5">
          {/* Filtres par famille & Recherche */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-[11px]">
              {(['all', 'Aventuriers', 'Combattants', 'Mages', 'Mystiques'] as const).map(fam => (
                <button
                  key={fam}
                  type="button"
                  onClick={() => setProfileFamilyFilter(fam)}
                  className={`py-1 px-1 rounded text-center font-medium transition truncate ${
                    profileFamilyFilter === fam
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {fam === 'all' ? `Tous (${PROFILES.length})` : fam.slice(0, 5) + '.'}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={profileSearch}
                onChange={e => setProfileSearch(e.target.value)}
                placeholder="Filtrer les profils..."
                className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:border-amber-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Liste défilante des profils */}
          <div className="max-h-[620px] overflow-y-auto space-y-1.5 pr-1.5">
            {filteredProfiles.map(prof => {
              const isSelected = prof.id === character.profileId;
              const isSecondary = isHybrid && prof.id === character.secondaryProfileId;

              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => handleSelectProfile(prof.id)}
                  className={`w-full p-2.5 rounded-lg border text-left transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500'
                      : isSecondary
                      ? 'bg-purple-950/40 border-purple-500/80 hover:border-purple-400'
                      : 'bg-stone-950/70 border-stone-800/80 hover:border-stone-700 hover:bg-stone-900/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-serif font-bold text-sm truncate ${isSelected ? 'text-amber-200' : isSecondary ? 'text-purple-200' : 'text-stone-200'}`}>
                        {prof.name}
                      </span>
                      {isSecondary && (
                        <span className="text-[9px] bg-purple-900 text-purple-200 px-1.5 py-0.2 rounded font-bold uppercase">
                          Secondaire
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-stone-400 shrink-0">
                        {prof.hpPerLevel} PV • {prof.hd}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-400 truncate mt-0.5">
                      {prof.tagline}
                    </div>

                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] text-stone-500 uppercase font-semibold">Clés :</span>
                      {prof.primaryStats.map((st, idx) => (
                        <span
                          key={st}
                          className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
                            idx === 0
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-stone-900 text-stone-400 border border-stone-800'
                          }`}
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                  )}
                </button>
              );
            })}

            {filteredProfiles.length === 0 && (
              <div className="text-center py-8 text-xs text-stone-500 italic">
                Aucun profil ne correspond à votre recherche.
              </div>
            )}
          </div>
        </div>

        {/* DROITE : DÉTAIL DU PROFIL SÉLECTIONNÉ */}
        {selectedProfile && (
          <div className="lg:col-span-8 xl:col-span-8 space-y-4">
            {/* PARTIE DROITE SUPÉRIEURE : PRÉSENTATION & CARACS CLÉS */}
            <div className="bg-stone-950 p-4 sm:p-5 rounded-xl border border-stone-800 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif font-bold text-amber-200 text-base">
                    {selectedProfile.name}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-medium">
                    Famille : {selectedProfile.isFamilySelectable ? (character.profileFamily || selectedProfile.family) + ' (au choix)' : selectedProfile.family}
                  </span>
                </div>
                <div className="text-xs text-stone-400 font-mono">
                  {selectedProfile.hpPerLevel} PV/niv • DR : {selectedProfile.isFamilySelectable && character.profileFamily ? (character.profileFamily === 'Combattants' ? 'd10' : character.profileFamily === 'Mages' ? 'd6' : 'd8') : selectedProfile.hd}
                  {selectedProfile.bonusPC > 0 && ` • +${selectedProfile.bonusPC} PC`}
                </div>
              </div>

              {selectedProfile.isFamilySelectable && (
                <div className="bg-purple-950/40 border border-purple-800/70 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Famille d'intégration du Psionique :</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 font-mono">
                      {character.profileFamily || selectedProfile.family}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    Le Psionique ne dépend d'aucune famille par défaut. Votre choix détermine votre dé de récupération (DR), vos bonus éventuels et vos voies de prestige accessibles dès le niveau 5 :
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Aventuriers', 'Combattants', 'Mages', 'Mystiques'] as const).map(fam => {
                      const isChosen = (character.profileFamily || selectedProfile.family) === fam;
                      return (
                        <button
                          key={fam}
                          type="button"
                          onClick={() => update({ profileFamily: fam })}
                          className={`p-2 rounded-lg border text-left transition ${
                            isChosen
                              ? 'bg-purple-900/70 border-purple-400 text-purple-100 shadow-md ring-1 ring-purple-400'
                              : 'bg-stone-900/90 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                          }`}
                        >
                          <div className="font-bold text-xs">{fam}</div>
                          <div className="text-[10px] opacity-80 mt-0.5 font-mono">
                            {fam === 'Aventuriers' && 'DR d8 • +1 PC'}
                            {fam === 'Combattants' && 'DR d10 • PV'}
                            {fam === 'Mages' && 'DR d6 • Magie'}
                            {fam === 'Mystiques' && 'DR d8 • +1 DR'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-xs text-amber-200/90 font-medium italic">
                « {selectedProfile.tagline} »
              </div>

              <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-line bg-stone-900/40 p-3 rounded-lg border border-stone-800">
                {selectedProfile.description}
              </p>

              {/* Caractéristiques privilégiées recommandées */}
              <div className="bg-amber-950/20 border border-amber-900/50 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    <span>Caractéristiques clés recommandées pour {selectedProfile.name} :</span>
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Privilégiez vos meilleures valeurs à l'Étape 4 sur ces caractéristiques :
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  {selectedProfile.primaryStats.map((st, idx) => (
                    <div
                      key={st}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded bg-stone-900 border border-amber-700/60"
                    >
                      <span className="text-[10px] text-stone-400">#{idx + 1}</span>
                      <strong className="text-amber-300 text-xs font-mono">{st}</strong>
                      <span className="text-[10px] text-stone-400">({STAT_NAMES[st]})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PARTIE DROITE INFÉRIEURE : ÉQUIPEMENT & VOIES */}
            <div className="bg-stone-950 p-4 sm:p-5 rounded-xl border border-stone-800 space-y-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-900/50 p-3 rounded-lg border border-stone-800">
                  <strong className="text-amber-300 block mb-1">Armes & armures maîtrisées :</strong>
                  <div className="text-stone-300 leading-relaxed whitespace-pre-line text-[11px]">
                    {selectedProfile.weaponsAndArmor}
                  </div>
                </div>

                <div className="bg-stone-900/50 p-3 rounded-lg border border-stone-800">
                  <strong className="text-amber-300 block mb-1">Équipement de départ :</strong>
                  <div className="text-stone-300 leading-relaxed whitespace-pre-line text-[11px]">
                    {selectedProfile.startingEquipment}
                  </div>
                </div>
              </div>

              {/* 5 Voies accessibles */}
              <div>
                <span className="text-xs font-semibold text-amber-300 block mb-1.5">
                  Les 5 voies accessibles à ce profil :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedProfile.paths.map(pid => {
                    const pth = getPathById(pid);
                    return (
                      <div
                        key={pid}
                        className="bg-stone-900 text-stone-200 border border-stone-700/80 p-2.5 rounded-lg text-xs"
                      >
                        <div className="font-serif font-medium text-amber-200">{pth?.name || pid}</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">5 rangs de capacités</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
