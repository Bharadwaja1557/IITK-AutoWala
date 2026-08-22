import { useEffect, useRef } from 'react';
import { VEHICLE_TYPE_LABELS, type NearbyDriver } from '@iitk-autowala/shared';

interface CallModalProps {
  driver: NearbyDriver;
  onClose: () => void;
}

/**
 * What "Call" does in this build: explain that it does nothing.
 *
 * The number is rendered as text. There is deliberately no `tel:` link here —
 * a demo that dials is a demo that can dial a stranger, and the whole point of
 * the 55501 prefix is that this number belongs to nobody.
 */
export function CallModal({ driver, onClose }: CallModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="call-modal-title">This is demo data</h2>

        <p>
          {driver.name} is not a real person. {VEHICLE_TYPE_LABELS[driver.vehicleType]}{' '}
          {driver.vehicleNumber} is not a real vehicle.
        </p>

        <p>
          The number on this record is <span className="fake-number">{driver.phone}</span>. Indian
          mobile numbers start with 6, 7, 8 or 9, so this one cannot be dialled and cannot belong
          to anybody. Nothing on this screen will place a call.
        </p>

        <p>
          In a real deployment this button would open your phone's dialler with the driver's
          number, which is the entire interaction — the app's job is to tell you who to call and
          how far away they are, not to run the ride.
        </p>

        <button ref={closeRef} type="button" className="primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
