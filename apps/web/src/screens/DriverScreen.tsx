import { useEffect, useState } from 'react';
import type { DriverProfile } from '@iitk-autowala/shared';
import { fetchProfile, readToken, writeToken } from '../api/client.js';
import { AvailabilityPanel } from '../components/AvailabilityPanel.js';
import { DriverAuthForm } from '../components/DriverAuthForm.js';

export function DriverScreen() {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [restoring, setRestoring] = useState(true);

  // A stored token is not proof of anything on its own — the account may have
  // been removed, or the token expired. Ask the API who it belongs to, and drop
  // it if the answer is nobody.
  useEffect(() => {
    if (readToken() === null) {
      setRestoring(false);
      return;
    }

    let cancelled = false;
    fetchProfile()
      .then((profile) => {
        if (!cancelled) setDriver(profile);
      })
      .catch(() => {
        writeToken(null);
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (restoring) {
    return <p className="muted">Checking your session…</p>;
  }

  if (driver === null) {
    return (
      <DriverAuthForm
        onAuthenticated={(result) => {
          writeToken(result.token);
          setDriver(result.driver);
        }}
      />
    );
  }

  return (
    <AvailabilityPanel
      driver={driver}
      onSignOut={() => {
        writeToken(null);
        setDriver(null);
      }}
    />
  );
}
