export const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

// Recipient -> acceptable donor groups, exact match first.
export const COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

export const RADIUS_KM = { normal: 15, urgent: 30, critical: 50 };

export function compatibleDonorGroups(needed) {
  return COMPATIBILITY[needed] ?? [];
}

export function isExactMatch(donorGroup, needed) {
  return donorGroup === needed;
}
