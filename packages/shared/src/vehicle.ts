export const VEHICLE_TYPES = ['auto', 'e-rickshaw'] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  auto: 'Auto',
  'e-rickshaw': 'E-rickshaw',
};
