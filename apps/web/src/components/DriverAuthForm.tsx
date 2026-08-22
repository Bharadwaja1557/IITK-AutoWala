import { useState, type FormEvent } from 'react';
import {
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  type AuthResponse,
  type VehicleType,
} from '@iitk-autowala/shared';
import { ApiRequestError, registerDriver, signIn } from '../api/client.js';

interface DriverAuthFormProps {
  onAuthenticated: (result: AuthResponse) => void;
}

type Mode = 'register' | 'login';

const EMPTY_FIELDS = {
  name: '',
  phone: '',
  vehicleNumber: '',
  vehicleType: 'auto' as VehicleType,
  password: '',
};

export function DriverAuthForm({ onAuthenticated }: DriverAuthFormProps) {
  const [mode, setMode] = useState<Mode>('register');
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof EMPTY_FIELDS, value: string): void {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError('');

    try {
      const result =
        mode === 'register'
          ? await registerDriver({
              name: fields.name,
              phone: fields.phone,
              vehicleNumber: fields.vehicleNumber,
              vehicleType: fields.vehicleType,
              password: fields.password,
            })
          : await signIn({ phone: fields.phone, password: fields.password });

      onAuthenticated(result);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setFieldErrors(error.details);
        setFormError(error.message);
      } else {
        setFormError('Could not reach the server.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <div className="tabs">
        <button
          type="button"
          className={mode === 'register' ? 'tab active' : 'tab'}
          onClick={() => setMode('register')}
        >
          New driver
        </button>
        <button
          type="button"
          className={mode === 'login' ? 'tab active' : 'tab'}
          onClick={() => setMode('login')}
        >
          Sign in
        </button>
      </div>

      <form onSubmit={(event) => void onSubmit(event)}>
        {mode === 'register' && (
          <>
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              value={fields.name}
              autoComplete="name"
              onChange={(event) => update('name', event.target.value)}
            />
            {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
          </>
        )}

        <label htmlFor="phone">Phone number</label>
        <input
          id="phone"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10 digits, starting 6 to 9"
          value={fields.phone}
          onChange={(event) => update('phone', event.target.value)}
        />
        {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}

        {mode === 'register' && (
          <>
            <label htmlFor="vehicleNumber">Vehicle number</label>
            <input
              id="vehicleNumber"
              placeholder="UP 78 AB 1234"
              value={fields.vehicleNumber}
              onChange={(event) => update('vehicleNumber', event.target.value)}
            />
            {fieldErrors.vehicleNumber && (
              <p className="field-error">{fieldErrors.vehicleNumber}</p>
            )}

            <label htmlFor="vehicleType">Vehicle</label>
            <select
              id="vehicleType"
              value={fields.vehicleType}
              onChange={(event) => update('vehicleType', event.target.value)}
            >
              {VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {VEHICLE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </>
        )}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          value={fields.password}
          onChange={(event) => update('password', event.target.value)}
        />
        {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}

        {formError !== '' && <p className="form-error">{formError}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Working…' : mode === 'register' ? 'Register' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
