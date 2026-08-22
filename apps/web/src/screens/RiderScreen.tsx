import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_LANDMARK_ID,
  LANDMARKS_BY_ID,
  VEHICLE_TYPE_LABELS,
  type LandmarkId,
  type NearbyDriver,
} from '@iitk-autowala/shared';
import { ApiRequestError, fetchNearby } from '../api/client.js';
import { CallModal } from '../components/CallModal.js';
import { LocationPicker } from '../components/LocationPicker.js';
import { formatDistance, formatMinutesAgo } from '../lib/format.js';

interface Origin {
  lng: number;
  lat: number;
}

function landmarkOrigin(id: LandmarkId): Origin {
  const [lng, lat] = LANDMARKS_BY_ID[id].coordinates;
  return { lng, lat };
}

export function RiderScreen() {
  const [landmarkId, setLandmarkId] = useState<LandmarkId | null>(DEFAULT_LANDMARK_ID);
  const [origin, setOrigin] = useState<Origin>(() => landmarkOrigin(DEFAULT_LANDMARK_ID));
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calling, setCalling] = useState<NearbyDriver | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchNearby(origin.lng, origin.lat);
      setDrivers(response.drivers);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [origin]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="card">
      <LocationPicker
        label="Where are you waiting?"
        landmarkId={landmarkId}
        disabled={loading}
        onPickLandmark={(id) => {
          setLandmarkId(id);
          setOrigin(landmarkOrigin(id));
        }}
        onPickDevice={(position) => {
          setLandmarkId(null);
          setOrigin(position);
        }}
      />

      <div className="row-between">
        <p className="muted">
          {loading
            ? 'Looking…'
            : `${drivers.length} ${drivers.length === 1 ? 'driver' : 'drivers'} available`}
        </p>
        <button type="button" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {error !== '' && <p className="form-error">{error}</p>}

      {!loading && drivers.length === 0 && error === '' && (
        <p className="muted">
          Nobody has said they are free near here. Availability expires on its own, so an empty
          list means nobody has tapped recently — not that every driver is busy.
        </p>
      )}

      <ul className="driver-list">
        {drivers.map((driver) => (
          <li key={driver.driverId} className="driver">
            <div className="driver-main">
              <span className="driver-name">{driver.name}</span>
              <span className="driver-distance">{formatDistance(driver.distanceMeters)}</span>
            </div>
            <p className="muted">
              {VEHICLE_TYPE_LABELS[driver.vehicleType]} · {driver.vehicleNumber}
            </p>
            <p className="muted">
              {driver.landmarkName === null
                ? 'Reported from their device'
                : `At ${driver.landmarkName}`}{' '}
              · said so {formatMinutesAgo(driver.declaredAt)}
            </p>
            <button type="button" onClick={() => setCalling(driver)}>
              Call
            </button>
          </li>
        ))}
      </ul>

      {calling !== null && <CallModal driver={calling} onClose={() => setCalling(null)} />}
    </section>
  );
}
