import { useState } from 'react';
import {
  CAMPUS_LANDMARKS,
  LANDMARK_AREA_LABELS,
  type LandmarkArea,
  type LandmarkId,
} from '@iitk-autowala/shared';

interface LocationPickerProps {
  label: string;
  landmarkId: LandmarkId | null;
  onPickLandmark: (id: LandmarkId) => void;
  onPickDevice: (position: { lng: number; lat: number }) => void;
  disabled: boolean;
}

const AREA_ORDER: LandmarkArea[] = ['halls', 'academic', 'services', 'gates'];

/**
 * The only way a position enters this system. A landmark from the shared list,
 * or one reading from the browser.
 *
 * `getCurrentPosition`, never `watchPosition`: this asks once, when tapped, and
 * then stops. Nothing here runs in the background, which is the constraint the
 * whole design starts from — drivers will not carry a tracking app.
 */
export function LocationPicker({
  label,
  landmarkId,
  onPickLandmark,
  onPickDevice,
  disabled,
}: LocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  function useDeviceLocation() {
    if (!('geolocation' in navigator)) {
      setGeoError('This browser will not report a location. Pick a landmark instead.');
      return;
    }

    setGeoError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onPickDevice({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        });
      },
      (error) => {
        setLocating(false);
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission refused. Pick a landmark instead.'
            : 'Could not read your location. Pick a landmark instead.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  return (
    <div className="picker">
      <label htmlFor="landmark">{label}</label>
      <div className="picker-row">
        <select
          id="landmark"
          value={landmarkId ?? ''}
          disabled={disabled}
          onChange={(event) => onPickLandmark(event.target.value as LandmarkId)}
        >
          {landmarkId === null && (
            <option value="" disabled>
              Using your device location
            </option>
          )}
          {AREA_ORDER.map((area) => (
            <optgroup key={area} label={LANDMARK_AREA_LABELS[area]}>
              {CAMPUS_LANDMARKS.filter((landmark) => landmark.area === area).map((landmark) => (
                <option key={landmark.id} value={landmark.id}>
                  {landmark.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <button type="button" onClick={useDeviceLocation} disabled={disabled || locating}>
          {locating ? 'Locating…' : 'Use my current location'}
        </button>
      </div>

      {geoError !== '' && <p className="field-error">{geoError}</p>}
    </div>
  );
}
