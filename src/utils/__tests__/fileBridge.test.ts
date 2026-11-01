import { describe, it, expect } from 'vitest';
import { sanitizeFilename, removeDiacritics } from '../fileBridge';

describe('fileBridge utils: sanitizeFilename & removeDiacritics', () => {
  describe('sanitizeFilename', () => {
    it('preserves accented characters in filenames', () => {
      expect(sanitizeFilename('Éléonore')).toBe('Éléonore');
      expect(sanitizeFilename('Gérard')).toBe('Gérard');
      expect(sanitizeFilename('Gwénaël l’Envoûteur')).toBe('Gwénaël l’Envoûteur');
      expect(sanitizeFilename('Hélène d\'Aulnay')).toBe('Hélène d\'Aulnay');
    });

    it('falls back to default fallback if name is empty or whitespace', () => {
      expect(sanitizeFilename('')).toBe('personnage');
      expect(sanitizeFilename('   ')).toBe('personnage');
      expect(sanitizeFilename(undefined)).toBe('personnage');
    });

    it('sanitizes illegal filesystem characters while keeping accents and spaces', () => {
      // < > : " / \ | ? * are illegal in filesystems (especially Windows)
      expect(sanitizeFilename('Gérard / Guerrier')).toBe('Gérard _ Guerrier');
      expect(sanitizeFilename('Héros: L\'Épée')).toBe('Héros_ L\'Épée');
      expect(sanitizeFilename('Magicien *Érudit*?')).toBe('Magicien _Érudit_');
    });

    it('trims leading/trailing spaces and dots', () => {
      expect(sanitizeFilename('  Éléonore... ')).toBe('Éléonore');
    });
  });

  describe('removeDiacritics', () => {
    it('transliterates accented characters into standard Latin letters rather than replacing them with underscores', () => {
      expect(removeDiacritics('Éléonore')).toBe('Eleonore');
      expect(removeDiacritics('Rôdeur')).toBe('Rodeur');
      expect(removeDiacritics('Séduction')).toBe('Seduction');
      expect(removeDiacritics('ça va')).toBe('ca va');
      expect(removeDiacritics('à côté d’un îlot où l’âne boit')).toBe('a cote d’un ilot ou l’ane boit');
    });
  });
});

