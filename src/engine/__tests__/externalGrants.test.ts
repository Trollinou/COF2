import { describe, it, expect } from 'vitest';
import { createDefaultCharacter, resolveExternalGrants } from '../rulesEngine';

describe('External ability grants with replacement', () => {
  const farfadet = () => {
    const c = createDefaultCharacter();
    c.peopleId = 'farfadet';
    c.profileId = 'druide';
    return c;
  };

  it('grants Langage des animaux by default when not owned', () => {
    const c = farfadet();
    c.acquiredAbilities = [
      { pathId: 'voie-du-farfadet', rank: 1 },
      { pathId: 'voie-du-farfadet', rank: 2 },
    ];
    const [grant] = resolveExternalGrants(c);
    expect(grant.mode).toBe('default');
    expect(grant.ability).toEqual({ pathId: 'voie-des-animaux', rank: 1 });
    expect(grant.needsChoice).toBe(false);
  });

  it('requires a replacement when Langage des animaux is already owned', () => {
    const c = farfadet();
    c.acquiredAbilities = [
      { pathId: 'voie-des-animaux', rank: 1 },
      { pathId: 'voie-du-farfadet', rank: 1 },
      { pathId: 'voie-du-farfadet', rank: 2 },
    ];
    let [grant] = resolveExternalGrants(c);
    expect(grant.mode).toBe('replacement');
    expect(grant.needsChoice).toBe(true);
    expect(grant.options.length).toBeGreaterThan(0);
    // Owned ability can't be chosen again, only rank 1 abilities of druide / rôdeur.
    expect(grant.options.some((o) => o.pathId === 'voie-des-animaux')).toBe(false);
    expect(grant.options.every((o) => o.rank === 1)).toBe(true);

    c.externalAbilityChoices = { 'voie-du-farfadet_2': grant.options[0] };
    [grant] = resolveExternalGrants(c);
    expect(grant.needsChoice).toBe(false);
    expect(grant.ability).toEqual(grant.options[0]);

    // Invalid choice (the owned ability) is ignored.
    c.externalAbilityChoices = {
      'voie-du-farfadet_2': { pathId: 'voie-des-animaux', rank: 1 },
    };
    [grant] = resolveExternalGrants(c);
    expect(grant.needsChoice).toBe(true);
    expect(grant.ability).toBeUndefined();
  });

  it('offers Télékinésie or Confusion when Invisibilité is already owned', () => {
    const c = farfadet();
    c.acquiredAbilities = [
      { pathId: 'voie-de-la-magie-universelle', rank: 3 },
      { pathId: 'voie-du-farfadet', rank: 3 },
    ];
    const [grant] = resolveExternalGrants(c);
    expect(grant.mode).toBe('replacement');
    expect(grant.options).toEqual([
      { pathId: 'voie-de-l-air', rank: 3 },
      { pathId: 'voie-de-l-envouteur', rank: 3 },
    ]);
  });
});
