import { describe, it, expect } from 'vitest';
import {
  HUMAN_ORIGINS,
  formatHumanDiversityNote,
  isHumanDiversityValid,
  resolveHumanDiversity,
} from '../humanDiversity';

describe('humanDiversity', () => {
  it('exposes the 6 official origins without random roll metadata', () => {
    expect(HUMAN_ORIGINS).toHaveLength(6);
    expect(HUMAN_ORIGINS.map(o => o.id)).toEqual([
      'montagnard',
      'citadin',
      'campagnard',
      'riverain',
      'sauvage',
      'nomade',
    ]);
  });

  it('resolves a standard origin and formats its situational note', () => {
    const choice = { originId: 'montagnard' };
    expect(isHumanDiversityValid(choice)).toBe(true);
    const resolved = resolveHumanDiversity(choice);
    expect(resolved?.originLabel).toBe('Montagnard');
    expect(resolved?.effectiveDomains).toEqual(['Escalade', 'Résistance au froid']);
    expect(formatHumanDiversityNote(choice)).toBe(
      'Diversité (Montagnard) : +3 aux tests de Escalade et Résistance au froid',
    );
  });

  it('replaces one origin domain with a custom trade (gagne-pain)', () => {
    const choice = {
      originId: 'citadin',
      replacedDomainIndex: 1,
      replacementTrade: 'Forgeron',
    };
    expect(isHumanDiversityValid(choice)).toBe(true);
    const resolved = resolveHumanDiversity(choice);
    expect(resolved?.effectiveDomains).toEqual(['Commerce', 'Forgeron']);
    expect(resolved?.replacedDomainIndex).toBe(1);
    expect(formatHumanDiversityNote(choice)).toBe(
      'Diversité (Citadin) : +3 aux tests de Commerce et Forgeron (gagne-pain)',
    );
  });

  it('rejects incomplete replacement trade or incomplete custom origin', () => {
    expect(isHumanDiversityValid(undefined)).toBe(false);
    expect(isHumanDiversityValid({ originId: 'sauvage', replacedDomainIndex: 0 })).toBe(false);
    expect(
      isHumanDiversityValid({
        originId: 'custom',
        customOriginName: 'Marais',
        customDomain1: 'Natation',
      }),
    ).toBe(false);
    expect(
      isHumanDiversityValid({
        originId: 'custom',
        customOriginName: 'Marais',
        customDomain1: 'Natation',
        customDomain2: 'Discrétion',
      }),
    ).toBe(true);
  });
});
