import { describe, it, expect } from 'vitest';
import { inferGoalType, inferPresetIdFromName } from '@/lib/onboarding/inferGoalType';

describe('inferGoalType', () => {
  describe('presetId exact match (7 presets)', () => {
    const cases: Array<[string, 'savings' | 'investments']> = [
      ['fondo-emergenza', 'savings'],
      ['comprare-casa', 'savings'],
      ['iniziare-a-investire', 'investments'],
      ['eliminare-debiti', 'savings'],
      ['risparmiare-di-piu', 'savings'],
      ['viaggi-vacanza', 'savings'],
      ['far-crescere-patrimonio', 'investments'],
    ];
    it.each(cases)('presetId %s → pool %s', (presetId, expected) => {
      expect(inferGoalType({ presetId, name: 'irrelevant' })).toBe(expected);
    });
  });

  describe('name-keyword match → investments', () => {
    const investNames = [
      'Iniziare a investire',
      'Azioni FTSE MIB',
      'Portafoglio ETF globale',
      'Crypto Bitcoin long-term',
      'Accumulo borsa',
      'Crescere il mio patrimonio',
      'BTP decennali',
      'Obbligazioni corporate',
      'PAC su fondo comune',
      'INVESTIMENTI di lungo periodo',
    ];
    it.each(investNames)('name "%s" → investments', (name) => {
      expect(inferGoalType({ name })).toBe('investments');
    });
  });

  describe('name without invest keywords → savings (default)', () => {
    const savingsNames = [
      'Risparmiare per la casa',
      'Fondo emergenza famiglia',
      'Vacanze estate',
      'Eliminare carta di credito',
      'Acquisto auto nuova',
      'Matrimonio',
    ];
    it.each(savingsNames)('name "%s" → savings', (name) => {
      expect(inferGoalType({ name })).toBe('savings');
    });
  });

  describe('edge cases', () => {
    it('null name → savings', () => {
      expect(inferGoalType({ name: null })).toBe('savings');
    });
    it('undefined name → savings', () => {
      expect(inferGoalType({})).toBe('savings');
    });
    it('empty string name → savings', () => {
      expect(inferGoalType({ name: '' })).toBe('savings');
    });
    it('whitespace-only name → savings', () => {
      expect(inferGoalType({ name: '   \t\n  ' })).toBe('savings');
    });
    it('unknown presetId falls through to name heuristic', () => {
      expect(inferGoalType({ presetId: 'unknown-preset', name: 'Crypto' })).toBe('investments');
      expect(inferGoalType({ presetId: 'unknown-preset', name: 'Casa' })).toBe('savings');
    });
    it('null presetId falls through to name heuristic', () => {
      expect(inferGoalType({ presetId: null, name: 'ETF' })).toBe('investments');
    });
    it('presetId takes precedence over name', () => {
      // presetId savings even if name would suggest investments
      expect(inferGoalType({ presetId: 'comprare-casa', name: 'Crypto house' })).toBe('savings');
    });
  });
});

// ─── Sprint 1.6.4D #032: inferPresetIdFromName reverse lookup ───────────
describe('inferPresetIdFromName', () => {
  const presetMatches: Array<[string, string]> = [
    ['Fondo Emergenza', 'fondo-emergenza'],
    ['Comprare Casa', 'comprare-casa'],
    ['Iniziare a Investire', 'iniziare-a-investire'],
    ['Eliminare Debiti', 'eliminare-debiti'],
    ['Risparmiare di Più', 'risparmiare-di-piu'],
    ['Viaggi / Vacanza', 'viaggi-vacanza'],
    ['Far Crescere Patrimonio', 'far-crescere-patrimonio'],
  ];

  it.each(presetMatches)('exact name %s → presetId %s', (name, expected) => {
    expect(inferPresetIdFromName(name)).toBe(expected);
  });

  it('returns null for null input', () => {
    expect(inferPresetIdFromName(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(inferPresetIdFromName(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(inferPresetIdFromName('')).toBeNull();
  });

  it('returns null for name not in preset map', () => {
    expect(inferPresetIdFromName('Obiettivo Custom')).toBeNull();
  });

  it('case-sensitive match (no normalization)', () => {
    expect(inferPresetIdFromName('fondo emergenza')).toBeNull();
    expect(inferPresetIdFromName('FONDO EMERGENZA')).toBeNull();
  });

  it('does not match whitespace-padded names', () => {
    expect(inferPresetIdFromName(' Fondo Emergenza ')).toBeNull();
  });
});
