import { describe, expect, it } from 'vitest';
import { formatPhoneDisplay, normalizePhone } from './storage';

describe('normalisation des numéros ivoiriens', () => {
  it('retire les espaces, signes et indicatifs 225', () => {
    expect(normalizePhone('+225 07 08 09 10 11')).toBe('0708091011');
    expect(normalizePhone('00225-0708091011')).toBe('0708091011');
    expect(normalizePhone('2250708091011')).toBe('0708091011');
  });

  it('retourne une chaîne vide pour une valeur vide', () => {
    expect(normalizePhone('')).toBe('');
  });

  it('formate un numéro de dix chiffres pour l’affichage', () => {
    expect(formatPhoneDisplay('0708091011')).toBe('07 08 09 10 11');
  });
});
