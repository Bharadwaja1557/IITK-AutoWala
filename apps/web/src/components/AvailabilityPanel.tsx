import { useEffect, useState } from 'react';
import {
  DEFAULT_LANDMARK_ID,
  VEHICLE_TYPE_LABELS,
  type AvailabilityStatus,
  type DriverProfile,
  type LandmarkId,
} from '@iitk-autowala/shared';
import {
  ApiRequestError,
  declareAvailability,
  endAvailability,
  fetchAvailability,
} from '../api/client.js';
import { formatMinutesAgo, formatMinutesLeft } from '../lib/format.js';
import { LocationPicker } from './LocationPicker.js';

interface AvailabilityPanelProps {
  driver: DriverProfile;
  onSignOut: () => void;
}

export function AvailabilityPanel({ driver, onSignOut }: AvailabilityPanelProps) {
  const [status, setStatus] = useState<AvailabilityStatus | null>(null);
  const [landmarkId, setLandmarkId] = useState<LandmarkId>(DEFAULT_LANDMARK_ID);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchAvailability()
      .then((current) => {
        if (cancelled) return;
        setStatus(current);
        if (current.session?.landmarkId) {
          setLandmarkId(current.session.landmarkId as LandmarkId);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your current status.');
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function run(action: () => Promise<AvailabilityStatus>): Promise<void> {
    setBusy(true);
    setError('');
    try {
      setStatus(await action());
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError ? caught.message : 'Could not reach the server.',
      );
    } finally {
      setBusy(false);
    }
  }

  const session = status?.session ?? null;

  return (
    <section className="card">
      <div className="row-between">
        <div>
          <h2>{driver.name}</h2>
          <p className="muted">
            {VEHICLE_TYPE_LABELS[driver.vehicleType]} · {driver.vehicleNumber}
          </p>
        </div>
        <button type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      {session ? (
        <p className="status live">
          Riders can see you at <strong>{session.landmarkName ?? 'your device location'}</strong>.
          Declared {formatMinutesAgo(session.declaredAt)}, visible for{' '}
          {formatMinutesLeft(session.expiresAt)}.
        </p>
      ) : (
        <p className="status off">
          You are not visible to riders. Say where you are and you will show up in searches until
          the window runs out.
        </p>
      )}

      <LocationPicker
        label="Where are you now?"
        landmarkId={landmarkId}
        disabled={busy}
        onPickLandmark={(id) => {
          setLandmarkId(id);
          void run(() => declareAvailability({ source: 'landmark', landmarkId: id }));
        }}
        onPickDevice={(position) => {
          void run(() =>
            declareAvailability({ source: 'device', lng: position.lng, lat: position.lat }),
          );
        }}
      />

      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() =>
            void run(() => declareAvailability({ source: 'landmark', landmarkId }))
          }
        >
          {session ? 'Still here — reset the timer' : "I'm available"}
        </button>

        {session && (
          <button type="button" disabled={busy} onClick={() => void run(endAvailability)}>
            Go off duty
          </button>
        )}
      </div>

      {error !== '' && <p className="form-error">{error}</p>}
    </section>
  );
}
