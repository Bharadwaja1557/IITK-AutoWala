/**
 * Named pickup points on the IIT Kanpur campus.
 *
 * This list is the single source of truth for campus geography. The seed
 * script, the API's request validation, and the web client's location picker
 * all import it from here — the previous version of this project kept its zone
 * list in five places and they drifted.
 *
 * A landmark is an INPUT METHOD, not a model of proximity. Picking "Hall 5"
 * stores Hall 5's coordinates on the availability session; every distance the
 * rider sees is then computed by MongoDB's $geoNear over those coordinates on
 * a sphere. Nothing in the system asks "which landmarks are adjacent" — that
 * question is what produced the old fake-proximity table. See D-03.
 *
 * Coordinates are [longitude, latitude] — GeoJSON order, which is the reverse
 * of how humans say it. They are hand-placed from map knowledge and are good
 * to roughly 50-100m, which is finer than the spacing between landmarks but is
 * not survey data.
 */

export type LandmarkArea = 'halls' | 'academic' | 'services' | 'gates';

export interface CampusLandmark {
  /** Stable key. This is the value that travels over the wire and is never displayed. */
  readonly id: string;
  /** What a driver or rider reads in the picker. */
  readonly name: string;
  /** Groups the picker into optgroups. */
  readonly area: LandmarkArea;
  /** GeoJSON order: [longitude, latitude]. */
  readonly coordinates: readonly [number, number];
}

export const CAMPUS_LANDMARKS = [
  { id: 'main-gate', name: 'Main Gate', area: 'gates', coordinates: [80.2405, 26.5119] },
  { id: 'gt-road-gate', name: 'GT Road Gate', area: 'gates', coordinates: [80.2418, 26.5075] },

  { id: 'hall-1', name: 'Hall 1', area: 'halls', coordinates: [80.234, 26.509] },
  { id: 'hall-2', name: 'Hall 2', area: 'halls', coordinates: [80.2326, 26.5083] },
  { id: 'hall-3', name: 'Hall 3', area: 'halls', coordinates: [80.2312, 26.5076] },
  { id: 'hall-4', name: 'Hall 4', area: 'halls', coordinates: [80.2299, 26.5069] },
  { id: 'hall-5', name: 'Hall 5', area: 'halls', coordinates: [80.2286, 26.5062] },
  { id: 'hall-12', name: 'Hall 12', area: 'halls', coordinates: [80.2263, 26.5146] },
  { id: 'hall-13', name: 'Hall 13', area: 'halls', coordinates: [80.2252, 26.5154] },
  { id: 'gh-tower', name: 'Girls Hostel (GH Tower)', area: 'halls', coordinates: [80.2278, 26.5166] },

  { id: 'faculty-building', name: 'Faculty Building', area: 'academic', coordinates: [80.2296, 26.5128] },
  { id: 'lecture-hall-complex', name: 'Lecture Hall Complex', area: 'academic', coordinates: [80.2307, 26.5137] },
  { id: 'pk-kelkar-library', name: 'P. K. Kelkar Library', area: 'academic', coordinates: [80.2319, 26.5133] },
  { id: 'computer-centre', name: 'Computer Centre', area: 'academic', coordinates: [80.2289, 26.5143] },
  { id: 'airstrip', name: 'Airstrip / Flight Laboratory', area: 'academic', coordinates: [80.2318, 26.5193] },

  { id: 'shopping-centre', name: 'Shopping Centre', area: 'services', coordinates: [80.2358, 26.5109] },
  { id: 'health-centre', name: 'Health Centre', area: 'services', coordinates: [80.2373, 26.51] },
  { id: 'new-sac', name: 'New SAC', area: 'services', coordinates: [80.2271, 26.5118] },
  { id: 'visitors-hostel', name: "Visitors' Hostel", area: 'services', coordinates: [80.2392, 26.5089] },
] as const satisfies readonly CampusLandmark[];

export type LandmarkId = (typeof CAMPUS_LANDMARKS)[number]['id'];

/** Non-empty tuple, which is the shape `z.enum()` needs to produce a literal union. */
export const CAMPUS_LANDMARK_IDS = CAMPUS_LANDMARKS.map((landmark) => landmark.id) as [
  LandmarkId,
  ...LandmarkId[],
];

/** Where the rider picker starts: central, and a place people actually wait. */
export const DEFAULT_LANDMARK_ID: LandmarkId = 'shopping-centre';

export function findLandmark(id: string): CampusLandmark | undefined {
  return CAMPUS_LANDMARKS.find((landmark) => landmark.id === id);
}

export function isLandmarkId(id: string): id is LandmarkId {
  return CAMPUS_LANDMARKS.some((landmark) => landmark.id === id);
}

export const LANDMARK_AREA_LABELS: Record<LandmarkArea, string> = {
  gates: 'Gates',
  halls: 'Halls of Residence',
  academic: 'Academic Area',
  services: 'Services',
};
