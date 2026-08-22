/**
 * Present on every screen, not dismissible. Everything in this deployment is
 * invented — the names, the vehicle numbers, and the phone numbers, which begin
 * 55501 and cannot be dialled.
 */
export function DemoBanner() {
  return (
    <div className="banner" role="status">
      <strong>Demo data</strong> — synthetic drivers, no real contact information.
    </div>
  );
}
