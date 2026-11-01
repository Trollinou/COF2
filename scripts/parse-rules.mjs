import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rulesFile = path.resolve(__dirname, '../regles/MEMENTO - Création de Personnage.md');
const content = fs.readFileSync(rulesFile, 'utf-8');

const FAMILY_CONFIG = {
  'Aventuriers': { hpPerLevel: 4, hd: 'd8', bonusPC: 1, bonusDR: 0 },
  'Combattants': { hpPerLevel: 5, hd: 'd10', bonusPC: 0, bonusDR: 0 },
  'Mages': { hpPerLevel: 3, hd: 'd6', bonusPC: 0, bonusDR: 0, hasMageBonus: true },
  'Mystiques': { hpPerLevel: 4, hd: 'd8', bonusPC: 0, bonusDR: 1 },
};

const PROFILES_CONFIG = {
  'ARQUEBUSIER': {
    family: 'Aventuriers',
    tagline: 'Spécialiste du maniement des armes à feu et des explosifs',
    primaryStats: ['AGI', 'INT', 'CON'],
  },
  'BARDE': {
    family: 'Aventuriers',
    tagline: 'Artiste polyvalent maniant le verbe, la rapière et la magie',
    primaryStats: ['CHA', 'AGI', 'VOL'],
  },
  'RÔDEUR': {
    family: 'Aventuriers',
    tagline: 'Chasseur et pisteur en milieu sauvage, archer d\'élite',
    primaryStats: ['AGI', 'PER', 'CON'],
  },
  'VOLEUR': {
    family: 'Aventuriers',
    tagline: 'Expert en discrétion, crocheteur habile et combattant sournois',
    primaryStats: ['AGI', 'INT', 'CHA'],
  },
  'BARBARE': {
    family: 'Combattants',
    tagline: 'Guerrier sauvage colossal capable d\'entrer en rage',
    primaryStats: ['FOR', 'CON', 'AGI'],
  },
  'CHEVALIER': {
    family: 'Combattants',
    tagline: 'Champion en armure lourde monté sur un destrier d\'exception',
    primaryStats: ['FOR', 'CHA', 'CON'],
  },
  'GUERRIER': {
    family: 'Combattants',
    tagline: 'Maître d\'armes incontesté et soldat d\'élite du corps-à-corps',
    primaryStats: ['FOR', 'CON', 'AGI'],
  },
  'ENSORCELEUR': {
    family: 'Mages',
    tagline: 'Lanceur de sorts dont la magie innée découle du charisme',
    primaryStats: ['CHA', 'VOL', 'AGI'],
  },
  'FORGESORT': {
    family: 'Mages',
    tagline: 'Mage-artisan fabriquant élixirs, artefacts runiques et armures',
    primaryStats: ['INT', 'VOL', 'CON'],
  },
  'MAGICIEN': {
    family: 'Mages',
    tagline: 'Érudit des arcanes maîtrisant une magie académique puissante',
    primaryStats: ['INT', 'VOL', 'AGI'],
  },
  'SORCIER': {
    family: 'Mages',
    tagline: 'Adepte des forces occultes, des démons et de la nécromancie',
    primaryStats: ['INT', 'VOL', 'CON'],
  },
  'DRUIDE': {
    family: 'Mystiques',
    tagline: 'Protecteur sacré de la nature, des bêtes et des métamorphoses',
    primaryStats: ['PER', 'VOL', 'CON'],
  },
  'MOINE': {
    family: 'Mystiques',
    tagline: 'Ascète voué à la perfection martiale et spirituelle à mains nues',
    primaryStats: ['VOL', 'PER', 'AGI'],
  },
  'PRÊTRE': {
    family: 'Mystiques',
    tagline: 'Guide spirituel et champion divin capable de soigner ou de châtier',
    primaryStats: ['CHA', 'VOL', 'FOR'],
  },
};

// Helper to parse paths with 5 ranks
function parsePathsFromSection(text) {
  const paths = [];
  const pathRegex = /####\s+([▲■])\s+([^\n]+)/g;
  let match;
  const pathIndices = [];
  while ((match = pathRegex.exec(text)) !== null) {
    pathIndices.push({
      symbol: match[1],
      name: match[2].trim().replace(/\*+$/, '').trim(),
      index: match.index,
    });
  }

  for (let i = 0; i < pathIndices.length; i++) {
    const cur = pathIndices[i];
    const nextIndex = i + 1 < pathIndices.length ? pathIndices[i + 1].index : text.length;
    const pathContent = text.substring(cur.index, nextIndex);

    const rankRegex = /#####\s+(\d+)\.\s+([^:\n]+)\s*:\s*\n?([\s\S]*?)(?=(?:#####\s+\d+\.|$))/g;
    const ranks = [];
    let rankMatch;
    while ((rankMatch = rankRegex.exec(pathContent)) !== null) {
      const rankNum = parseInt(rankMatch[1], 10);
      let titleRaw = rankMatch[2].trim();
      const descRaw = rankMatch[3].trim();

      let actionType = 'Action';
      if (titleRaw.includes('(L)')) actionType = 'Limitée';
      else if (titleRaw.includes('(A)')) actionType = 'Attaque';
      else if (titleRaw.includes('(M)')) actionType = 'Mouvement';
      else if (titleRaw.includes('(G)')) actionType = 'Gratuite';

      const isSpell = titleRaw.includes('*');
      const cleanTitle = titleRaw.replace(/\([ALGM]\)/g, '').replace(/\*/g, '').trim();

      ranks.push({
        rank: rankNum,
        title: cleanTitle,
        actionType,
        isSpell,
        description: descRaw,
      });
    }

    paths.push({
      id: cur.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      name: cur.name,
      symbol: cur.symbol,
      ranks,
    });
  }

  return paths;
}

// 1. Parse PEUPLES
const PEOPLES_METADATA = {
  'demi-elfe': {
    startingAge: '20 ans',
    lifeExpectancy: '150 ans',
    heightRange: '1,50 m à 1,90 m',
    weightRange: '40 à 80 kg',
    physicalTraits: 'Grâce naturelle, oreilles légèrement pointues, silhouette élancée, pilosité faible.',
    defaultLanguages: 'Commun, Sylvestre',
    interpretationTip: 'Vous êtes souvent d\'une nature poétique, voire mélancolique. L\'écart d\'espérance de vie entre vos parents et votre famille vous pousse à des réflexions existentielles.',
    selectableRacialPaths: ['voie-de-l-humain', 'voie-de-l-elfe-haut', 'voie-de-l-elfe-sylvain'],
    names: {
      masculine: ['Aerindir', 'Caeldor', 'Elidan', 'Faelar', 'Gildor', 'Kaelen', 'Lorien', 'Rowan', 'Silas', 'Tristan'],
      feminine: ['Aeloria', 'Danielle', 'Elianne', 'Faelynn', 'Kaelia', 'Laureline', 'Miriel', 'Nolwen', 'Sylviane', 'Viviane'],
      namingTip: 'Prénom elfique associé à un nom de famille humain.',
    },
  },
  'demi-orc': {
    startingAge: '15 ans',
    lifeExpectancy: '60 ans',
    heightRange: '1,70 m à 2,10 m',
    weightRange: '70 à 150 kg',
    physicalTraits: 'Grand et athlétique. Peau verdâtre qui tend parfois vers un vert plus franc, mâchoire large, front bas, petits yeux, crocs apparents.',
    defaultLanguages: 'Commun, Noir parlé',
    interpretationTip: 'Endurci par les préjugés, vous savez qu\'il faut se montrer fort pour survivre. Vous savourez la crainte que vous allumez chez vos adversaires.',
    names: {
      masculine: ['Krush', 'Aog', 'Bargul', 'Carok', 'Drog', 'Erok', 'Farg', 'Gorog', 'Hurl', 'Jorgul', 'Krok', 'Lugn', 'Mog', 'Norok', 'Rork', 'Urdu'],
      feminine: ['Aoga', 'Bargula', 'Caroka', 'Droga', 'Eroka', 'Farga', 'Goroga', 'Hurla', 'Jorgula', 'Kroka', 'Krusha', 'Lugna', 'Moga', 'Noroka', 'Rorka', 'Urdua'],
      namingTip: 'Noms orcs courts et gutturaux (R, G, K, O). Pour les femmes, terminaison en A.',
    },
  },
  'elfe-haut': {
    startingAge: '80 ans',
    lifeExpectancy: '450 ans',
    heightRange: '1,50 m à 1,80 m',
    weightRange: '40 à 70 kg',
    physicalTraits: 'Élancé, svelte et gracieux. Jeunesse éternelle. Oreilles pointues, yeux en amande (verts, violets), cheveux blancs, argent, blond or ou platine.',
    defaultLanguages: 'Commun, Sylvestre',
    interpretationTip: 'Vous gardez une hauteur de vue et une réserve distinguée. Vous détestez la vulgarité et la violence gratuite et appréciez le luxe, les arts et les étoffes nobles.',
    names: {
      masculine: ['Arwendil', 'Caëldwendir', 'Eldwyndor', 'Elberenhdir', 'Elendur', 'Gilgalendil', 'Irwildur', 'Laurelith', 'Linaëndir', 'Laendoril', 'Nennendir'],
      feminine: ['Elberenh', 'Elidhwen', 'Ellenúviel', 'Laurelinn', 'Linaëwen', 'Laendorië', 'Maelwë', 'Maerwen', 'Nennenvaël', 'Ninwelotë', 'Tintaëlle'],
      namingTip: 'Sonorités douces mais complexes (L, W, N, M). Terminaisons masculines en -dir, -dur, -dor ; féminines en -wen, -wë, -ië, -aël.',
    },
  },
  'elfe-sylvain': {
    startingAge: '50 ans',
    lifeExpectancy: '350 ans',
    heightRange: '1,40 m à 1,70 m',
    weightRange: '30 à 60 kg',
    physicalTraits: 'Menu, agile et svelte. Oreilles pointues, yeux en amande, cheveux sombres (bruns, noirs, roux), tatouages rituels, pilosité corporelle absente.',
    defaultLanguages: 'Commun, Sylvestre',
    interpretationTip: 'Instinctif et intimement lié aux mystères de la forêt. Moins hautain que l\'elfe haut mais protecteur farouche de son sanctuaire végétal.',
    names: {
      masculine: ['Aëdin', 'Caëndor', 'Cirion', 'Doralion', 'Ealdor', 'Findalion', 'Glorfindor', 'Haëldion', 'Laurendor', 'Morwendir', 'Raëldirion'],
      feminine: ['Aëldill', 'Aluinill', 'Aliann', 'Dianaë', 'Eilinelle', 'Elenwëe', 'Lúthill', 'Nínielle', 'Nolwaënn', 'Mírielle', 'Keltienn'],
      namingTip: 'Terminaisons masculines en -din, -dor, -ion ; chez les femmes, consonne ou voyelle finale doublée.',
    },
  },
  'gnome': {
    startingAge: '40 ans',
    lifeExpectancy: '250 ans',
    heightRange: '1,00 m à 1,20 m',
    weightRange: '30 à 50 kg',
    physicalTraits: 'Petit et rondouillard, gros nez. Moustaches et rouflaquettes soignées pour les gnomes, couettes pour les gnomettes. Oreilles arrondies ou pointues.',
    defaultLanguages: 'Commun, Runique',
    interpretationTip: 'Joyeux, optimiste, curieux de tout et intarissable sur ses passions insolites ou ses collections improbables.',
    names: {
      masculine: ['Albert Blumdenplick', 'Eustache Dimtigballen', 'Firmin Vondemacht', 'Isidore Kolerbiltag', 'Nestor Wurmenship', 'Casimir Poldenkrast'],
      feminine: ['Thérèse Aliserwilp', 'Huguette Uhldimmerstelp', 'Rose Molkenpulp', 'Eugénie Bimpbelinedor', 'Agathe Fladerpenn'],
      namingTip: 'Prénoms désuets avec nom de famille germanique long et composé.',
    },
  },
  'halfelin': {
    startingAge: '20 ans',
    lifeExpectancy: '150 ans',
    heightRange: '80 cm à 1,00 m',
    weightRange: '20 à 30 kg',
    physicalTraits: 'Petit, vif et bien nourri. Pieds poilus et solides pour marcher pieds nus, regard malicieux et souriant.',
    defaultLanguages: 'Commun',
    interpretationTip: 'Attaché au confort, à la bonne cuisine et aux récits d\'auberge, mais capable d\'une témérité extraordinaire quand ses amis sont en péril.',
    names: {
      masculine: ['Bill', 'Bern', 'Don', 'Duky', 'Eckel', 'Fili', 'Ged', 'Gerry', 'Hek', 'Hicks', 'Jack', 'Karl', 'Litle', 'Luky', 'Mike', 'Polo', 'Sam', 'Titi'],
      feminine: ['Églantine', 'Lila', 'Jacinthe', 'Marguerite', 'Muguette', 'Pâquerette', 'Prune', 'Rose', 'Cerise', 'Violette'],
      namingTip: 'Prénoms courts masculins ; noms de fleurs/fruits féminins ; noms de famille ruraux (Dubois, Sur-le-pont, Sous-colline).',
    },
  },
  'humain': {
    startingAge: '18 ans',
    lifeExpectancy: '100 ans',
    heightRange: '1,50 m à 2,00 m',
    weightRange: '40 à 120 kg',
    physicalTraits: 'Toute la diversité humaine possible en termes de carnations, de corpulences et de visages.',
    defaultLanguages: 'Commun',
    interpretationTip: 'Vie courte et frénétique, soif permanente de découverte, d\'accomplissement et d\'adaptation rapide.',
    names: {
      masculine: ['Gareth', 'Adalrik', 'Arn', 'Bernulf', 'Brand', 'Edwald', 'Ketil', 'Ferwin', 'Gerulf', 'Godfred', 'Gunter', 'Halfdan', 'Ingvar', 'Knud', 'Lothar', 'Osvald', 'Roderick', 'Rurik', 'Sigmar', 'Svenn', 'Thorsten'],
      feminine: ['Annia', 'Alaina', 'Berthille', 'Bérénia', 'Télinne', 'Koralie', 'Floraline', 'Gadrielle', 'Jocynthe', 'Kéline', 'Myrthinne', 'Marille', 'Naelwen', 'Natasha', 'Odaelle', 'Prescille', 'Sorsha', 'Véronelle', 'Wendoline'],
      namingTip: 'Inspirations médiévales, scandinaves, franques ou celtiques variées.',
    },
  },
  'nain': {
    startingAge: '40 ans',
    lifeExpectancy: '250 ans',
    heightRange: '1,15 m à 1,35 m',
    weightRange: '50 à 100 kg',
    physicalTraits: 'Robuste, large d\'épaules et trapu. Pilosité très développée, tresses ornées de perles et d\'anneaux dans la barbe et les cheveux. Bijoux martelés.',
    defaultLanguages: 'Commun, Runique',
    interpretationTip: 'Fier, loyal au clan, travailleur infatigable de la pierre et du métal, doté d\'une mémoire sans faille pour ses dettes et ses rancunes.',
    names: {
      masculine: ['Gloin Mâchefer', 'Krorin Briseroc', 'Thorin Forgefer', 'Buldur Tranchetroll', 'Trorin Cassegranit', 'Orik Briselame', 'Durok Écu-de-chêne', 'Guerann Marteleur', 'Korik Peau-de-pierre', 'Balin', 'Dwalin', 'Gimli'],
      feminine: ['Astrid', 'Arnhild', 'Berthild', 'Brynild', 'Eldrid', 'Ermenhild', 'Frida', 'Gerda', 'Grimhild', 'Gudrun', 'Helga', 'Hilda', 'Ingrid', 'Klothild', 'Sigrid', 'Strida'],
      namingTip: 'Prénoms courts et percutants (-in, -un, -ik, -ir) avec nom de clan traduit ; féminins en -hild ou -id.',
    },
  },
};

const PEOPLES_LIST = [
  { name: 'Demi-elfe', id: 'demi-elfe', h3: 'DEMI[‑-]ELFE', bonusOptions: [['PER', 'CHA']], malusOptions: [['FOR', 'CON']] },
  { name: 'Demi-orc', id: 'demi-orc', h3: 'DEMI[‑-]ORC', bonusOptions: [['FOR', 'CON']], malusOptions: [['CHA', 'INT']] },
  { name: 'Elfe haut', id: 'elfe-haut', h3: 'ELFE HAUT', bonusOptions: [['INT', 'CHA']], malusOptions: [['FOR']] },
  { name: 'Elfe sylvain', id: 'elfe-sylvain', h3: 'ELFE SYLVAIN', bonusOptions: [['AGI', 'PER']], malusOptions: [['FOR']] },
  { name: 'Gnome', id: 'gnome', h3: 'GNOME', bonusOptions: [['INT', 'PER']], malusOptions: [['FOR']] },
  { name: 'Halfelin', id: 'halfelin', h3: 'HALFELIN', bonusOptions: [['AGI', 'VOL']], malusOptions: [['FOR']] },
  { name: 'Humain', id: 'humain', h3: 'HUMAIN', bonusOptions: [['ANY_LOWEST']], malusOptions: [] },
  { name: 'Nain', id: 'nain', h3: 'NAIN', bonusOptions: [['CON', 'VOL']], malusOptions: [['AGI']] },
];

const parsedPeoples = [];
for (let i = 0; i < PEOPLES_LIST.length; i++) {
  const p = PEOPLES_LIST[i];
  const startRegex = new RegExp(`###\\s+${p.h3}`, 'i');
  const startMatch = content.match(startRegex);
  if (!startMatch) {
    console.warn('Could not find section for peuple:', p.h3);
    continue;
  }
  const startIndex = startMatch.index;
  const nextMatch = content.substring(startIndex + 10).match(/\n###\s+[^#\n]+/);
  const endIndex = nextMatch ? startIndex + 10 + nextMatch.index : content.length;
  const sectionText = content.substring(startIndex, endIndex);

  // Extract description
  const descMatch = sectionText.match(/###[^\n]+\n\n([\s\S]*?)(?=\n\*\*Dans les Terres|\n####)/);
  const description = descMatch ? descMatch[1].trim() : '';

  const repMatch = sectionText.match(/####\s+Repères\s+([\s\S]*?)(?=\n####)/);
  const repText = repMatch ? repMatch[1].trim() : '';

  const paths = parsePathsFromSection(sectionText);
  const meta = PEOPLES_METADATA[p.id] || {};

  const validPath = paths.find(pth => pth.ranks.length > 0) || null;

  parsedPeoples.push({
    id: p.id,
    name: p.name,
    description,
    bonusOptions: p.bonusOptions,
    malusOptions: p.malusOptions,
    reperes: repText,
    startingAge: meta.startingAge || '20 ans',
    lifeExpectancy: meta.lifeExpectancy || '100 ans',
    heightRange: meta.heightRange || '1,70 m',
    weightRange: meta.weightRange || '70 kg',
    physicalTraits: meta.physicalTraits || '',
    defaultLanguages: meta.defaultLanguages || 'Commun',
    interpretationTip: meta.interpretationTip || '',
    selectableRacialPaths: meta.selectableRacialPaths || undefined,
    names: meta.names || { masculine: [], feminine: [], namingTip: '' },
    path: validPath,
  });
}

console.log(`Parsed ${parsedPeoples.length} peoples.`);

// 2. Parse PROFILES
const parsedProfiles = [];
const allPaths = [];

// Add racial paths to allPaths (only those with ranks)
parsedPeoples.forEach(p => {
  if (p.path && p.path.ranks.length > 0) {
    allPaths.push({ ...p.path, type: 'racial', owner: p.name });
  }
});

for (const [profKey, pConf] of Object.entries(PROFILES_CONFIG)) {
  const cleanProfKey = profKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startRegex = new RegExp(`###\\s*\\*{0,2}\\s*${cleanProfKey}\\s*\\*{0,2}`, 'i');
  let startMatch = content.match(startRegex);
  if (!startMatch) {
    console.warn(`Could not match profile ${profKey}`);
    continue;
  }
  const startIndex = startMatch.index;
  // find next profile heading or next chapter
  const nextMatch = content.substring(startIndex + 15).match(/\n###\s+[A-ZÉÈÀ*]/);
  const endIndex = nextMatch ? startIndex + 15 + nextMatch.index : content.length;
  const sectionText = content.substring(startIndex, endIndex);

  // Extract description
  const descMatch = sectionText.match(/###[^\n]+\n+([\s\S]*?)(?=\n\*\*Dans les Terres|\n####)/);
  let description = descMatch ? descMatch[1].trim() : '';
  description = description.replace(/\*\*Points de vigueur\s*:[^\n]*\n*/gi, '').trim();

  // Extract weapons & armors
  const armMatch = sectionText.match(/####\s+Armes\s*&?\s*armures[^\n]*\n+([\s\S]*?)(?=\n####)/i);
  const weaponsAndArmor = armMatch ? armMatch[1].trim() : '';
  const cleanWeaponsAndArmor = weaponsAndArmor
    .replace(/>\s*\[!WARNING\][^\n]*/gi, '')
    .replace(/^>\s*/gm, '')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();

  // Extract equipment
  const eqMatch = sectionText.match(/####\s+Équipement de départ[^\n]*\n+([\s\S]*?)(?=\n####)/i);
  const startingEquipment = eqMatch ? eqMatch[1].trim() : '';

  const paths = parsePathsFromSection(sectionText);
  paths.forEach(pth => {
    allPaths.push({ ...pth, type: 'profile', owner: profKey });
  });

  const famConf = FAMILY_CONFIG[pConf.family];

  parsedProfiles.push({
    id: profKey.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name: profKey.charAt(0) + profKey.slice(1).toLowerCase(),
    family: pConf.family,
    tagline: pConf.tagline,
    primaryStats: pConf.primaryStats,
    hpPerLevel: famConf.hpPerLevel,
    hd: famConf.hd,
    bonusPC: famConf.bonusPC,
    bonusDR: famConf.bonusDR,
    hasMageBonus: !!famConf.hasMageBonus,
    description,
    weaponsAndArmor: cleanWeaponsAndArmor,
    startingEquipment,
    paths: paths.map(pth => pth.id),
  });
}

console.log(`Parsed ${parsedProfiles.length} profiles and ${allPaths.length} paths.`);

// Write out JSON
const outDir = path.resolve(__dirname, '../src/data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'peoples.json'), JSON.stringify(parsedPeoples, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'profiles.json'), JSON.stringify(parsedProfiles, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'paths.json'), JSON.stringify(allPaths, null, 2), 'utf-8');

console.log('Successfully written data files to src/data!');
