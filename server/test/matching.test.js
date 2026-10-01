import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPATIBILITY, compatibleDonorGroups } from '../src/services/compatibility.js';
import { haversineKm } from '../src/services/geo.js';
import { rankDonors } from '../src/services/matching.js';

describe('compatibility matrix', () => {
  it('O- recipient only accepts O-', () => {
    assert.deepEqual(compatibleDonorGroups('O-'), ['O-']);
  });
  it('AB+ recipient accepts all 8 groups', () => {
    assert.equal(COMPATIBILITY['AB+'].length, 8);
  });
  it('Rh-negative recipients never get Rh-positive', () => {
    for (const r of ['O-', 'A-', 'B-', 'AB-']) {
      for (const g of compatibleDonorGroups(r)) assert.ok(g.endsWith('-'), `${r} got ${g}`);
    }
  });
});

describe('geo', () => {
  it('haversine Delhi ~ short distance', () => {
    const d = haversineKm([77.209, 28.6139], [77.23, 28.62]);
    assert.ok(d > 0 && d < 10, `got ${d}`);
  });
});

describe('matching', () => {
  it('ranks exact group before compatible, nearest first', async () => {
    const request = {
      bloodGroupNeeded: 'B+',
      urgency: 'urgent',
      location: { coordinates: [77.209, 28.6139] },
    };
    const donors = [
      { _id: '1', bloodGroup: 'O-', phone: '111', isAvailable: true, location: { coordinates: [77.2095, 28.614] } },
      { _id: '2', bloodGroup: 'B+', phone: '222', isAvailable: true, location: { coordinates: [77.25, 28.64] } },
      { _id: '3', bloodGroup: 'B+', phone: '333', isAvailable: false, location: { coordinates: [77.2091, 28.614] } },
    ];
    const { matches } = await rankDonors(request, donors);
    assert.equal(matches.length, 2);
    assert.equal(matches[0].donorId, '2'); // exact first despite farther
    assert.equal(matches[0].provider, 'haversine-fallback');
  });
});
