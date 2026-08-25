export const ZONES = [
  { value: "IITK_GATE", label: "IITK Gate" },
  { value: "KV_SCHOOL", label: "KV School" },
  { value: "CSE", label: "CSE Building" },
  { value: "AUDITORIUM", label: "Auditorium" },
  { value: "NEW_SC", label: "New Shopping Complex" },
  { value: "HALL_10", label: "Hall 10" },
  { value: "HALL_14", label: "Hall 14" },
];

export const NEARBY = {
  IITK_GATE: ["CSE", "KV_SCHOOL", "AUDITORIUM"],
  KV_SCHOOL: ["CSE", "AUDITORIUM", "NEW_SC"],
  CSE: ["KV_SCHOOL", "AUDITORIUM", "IITK_GATE"],
  AUDITORIUM: ["CSE", "HALL_14", "NEW_SC"],
  NEW_SC: ["KV_SCHOOL", "AUDITORIUM", "HALL_10"],
  HALL_14: ["HALL_10", "CSE", "NEW_SC"],
  HALL_10: ["HALL_14", "CSE", "NEW_SC"],
};

export const zoneLabel = z =>
  ZONES.find(x => x.value === z)?.label || z;
