'use client';

interface RoleSelectionModalProps {
  open: boolean;
  onSelectStaff: () => void;
  onSelectTenant: () => void;
}

export function RoleSelectionModal({
  open,
  onSelectStaff,
  onSelectTenant,
}: RoleSelectionModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-background rounded-lg shadow-lg w-full max-w-lg p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-dialog-title"
      >
        <h2
          id="role-dialog-title"
          className="text-xl font-semibold text-center mb-2"
        >
          Welcome Back
        </h2>
        <p className="text-muted-foreground text-center mb-6">
          How would you like to continue?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Staff Portal Card */}
          <button
            onClick={onSelectStaff}
            className="flex flex-col items-center p-6 border border-input rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-1">Staff Portal</h3>
            <p className="text-sm text-muted-foreground text-center">
              Manage properties, tenants, and billing
            </p>
          </button>

          {/* Tenant Portal Card */}
          <button
            onClick={onSelectTenant}
            className="flex flex-col items-center p-6 border border-input rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-1">Tenant Portal</h3>
            <p className="text-sm text-muted-foreground text-center">
              View lease, make payments, submit requests
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
