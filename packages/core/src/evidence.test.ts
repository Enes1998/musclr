import { describe, it, expect } from 'vitest';
import {
  EVIDENCE_MODULE,
  isKnownCitation,
  isKnownPrinciple,
  getVolumeLandmark,
  volumeStatus,
  isVolumeSane,
  isRepRangeSane,
  validateGrounding,
} from './evidence';
import { MUSCLE_GROUPS } from './exercises';

describe('evidence module integrity', () => {
  it('is version-stamped', () => {
    expect(EVIDENCE_MODULE.moduleVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(EVIDENCE_MODULE.schemaVersion).toBeGreaterThanOrEqual(1);
    expect(EVIDENCE_MODULE.setCountingRule.length).toBeGreaterThan(10);
  });

  it('every principle has ≥1 citation, all resolvable', () => {
    for (const p of EVIDENCE_MODULE.principles) {
      expect(p.citations.length).toBeGreaterThanOrEqual(1);
      for (const c of p.citations) expect(isKnownCitation(c)).toBe(true);
    }
  });

  it('every citation has a reference and a provenance (doi/isbn/pmcid) where expected', () => {
    for (const c of EVIDENCE_MODULE.citations) {
      expect(c.ref.length).toBeGreaterThan(10);
      if (c.tier === 'peer_reviewed' || c.tier === 'position_stand') {
        expect(Boolean(c.doi || c.pmcid)).toBe(true);
      }
    }
  });

  it('volume landmarks cover every muscle group with ordered ranges (mev ≤ mav ≤ mrv)', () => {
    for (const g of MUSCLE_GROUPS) {
      const lm = getVolumeLandmark(g.id);
      expect(lm, `landmark for ${g.id}`).toBeDefined();
      if (!lm) continue;
      expect(lm.mev[0]).toBeLessThanOrEqual(lm.mev[1]);
      expect(lm.mev[1]).toBeLessThanOrEqual(lm.mav[1]);
      expect(lm.mav[1]).toBeLessThanOrEqual(lm.mrv[1]);
      expect(lm.tier).toBe('practitioner_guideline');
    }
  });
});

describe('grounding guardrails', () => {
  it('classifies weekly volume against landmarks', () => {
    expect(volumeStatus('chest', 2)).toBe('below_mev');
    expect(volumeStatus('chest', 14)).toBe('productive');
    expect(volumeStatus('chest', 21)).toBe('approaching_mrv');
    expect(volumeStatus('chest', 40)).toBe('above_mrv');
  });

  it('rejects insane volumes (the "40 sets/wk chest" guard)', () => {
    expect(isVolumeSane('chest', 14)).toBe(true);
    expect(isVolumeSane('chest', 40)).toBe(false);
    expect(isVolumeSane('chest', -1)).toBe(false);
  });

  it('enforces goal-appropriate rep ranges', () => {
    expect(isRepRangeSane('strength', 5)).toBe(true);
    expect(isRepRangeSane('strength', 15)).toBe(false);
    expect(isRepRangeSane('hypertrophy', 10)).toBe(true);
    expect(isRepRangeSane('endurance', 20)).toBe(true);
    expect(isRepRangeSane('hypertrophy', 0)).toBe(false);
  });

  it('validateGrounding flags unknown citations/principles and out-of-bounds prescriptions', () => {
    const bad = validateGrounding({
      citationIds: ['schoenfeld_volume_2017', 'made_up_2099'],
      principleIds: ['vol.dose_response', 'not.a.principle'],
      weeklyVolumes: [{ muscle: 'chest', setsPerWeek: 40 }],
      repPrescriptions: [{ goal: 'strength', reps: 20 }],
    });
    expect(bad.ok).toBe(false);
    expect(bad.issues.map((i) => i.kind).sort()).toEqual(
      ['rep_range', 'unknown_citation', 'unknown_principle', 'volume_exceeds_mrv'].sort(),
    );

    const good = validateGrounding({
      citationIds: ['acsm_2009'],
      principleIds: ['freq.twice_weekly'],
      weeklyVolumes: [{ muscle: 'chest', setsPerWeek: 14 }],
      repPrescriptions: [{ goal: 'hypertrophy', reps: 10 }],
    });
    expect(good.ok).toBe(true);
    expect(good.issues).toHaveLength(0);
  });

  it('known principle/citation lookups work', () => {
    expect(isKnownPrinciple('vol.landmarks_framework')).toBe(true);
    expect(isKnownPrinciple('nope')).toBe(false);
    expect(isKnownCitation('issn_protein_2017')).toBe(true);
  });
});
