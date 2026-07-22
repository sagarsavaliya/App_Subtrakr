"use client";

import { useState } from "react";
import { runWhatsAppTest } from "@/app/admin/actions";
import type { WhatsAppDiagnostic } from "@/lib/whatsapp";

export function WhatsAppTestButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    WhatsAppDiagnostic | { notConfigured: true } | null
  >(null);

  async function run() {
    setLoading(true);
    setResult(null);
    const r = await runWhatsAppTest();
    setResult(r);
    setLoading(false);
  }

  return (
    <div className="mt-4">
      <button
        onClick={run}
        disabled={loading}
        className="glass rounded-lg px-4 py-2 text-sm text-ink transition hover:border-glow/30 disabled:opacity-50"
      >
        {loading ? "Testing…" : "Test connection"}
      </button>

      {result && "notConfigured" in result && (
        <p className="mt-3 text-sm text-due">
          Save a phone number ID and access token above first.
        </p>
      )}

      {result && !("notConfigured" in result) && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="mb-1 font-semibold text-ink-2">Phone number</p>
            {result.phoneNumber.ok ? (
              <ul className="space-y-1 text-ink-2">
                <li>
                  <span className="text-glow">✓</span>{" "}
                  {result.phoneNumber.verifiedName ?? "(unnamed)"} —{" "}
                  {result.phoneNumber.displayPhoneNumber}
                </li>
                <li>Quality rating: {result.phoneNumber.qualityRating ?? "—"}</li>
                <li>
                  Code verification: {result.phoneNumber.codeVerificationStatus ?? "—"}
                </li>
              </ul>
            ) : (
              <p className="text-overdue">✗ {result.phoneNumber.error}</p>
            )}
          </div>

          <div>
            <p className="mb-1 font-semibold text-ink-2">
              Template — subtrakr_otp
            </p>
            {!result.template.checked ? (
              <p className="text-due">{result.template.error}</p>
            ) : result.template.ok ? (
              <>
                <ul className="space-y-1 text-ink-2">
                  {result.template.variants?.map((v) => (
                    <li key={v.language}>
                      <span
                        className={
                          v.status === "APPROVED" ? "text-glow" : "text-due"
                        }
                      >
                        {v.status}
                      </span>{" "}
                      — language <code className="font-mono">{v.language}</code> —{" "}
                      {v.category}
                    </li>
                  ))}
                </ul>
                {result.templateResolvedWabaId && (
                  <p className="mt-2 text-xs text-due">
                    Found via <code className="font-mono">{result.templateResolvedWabaId}</code>,
                    not the saved Business account ID — update that field above
                    to this value.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-overdue">✗ {result.template.error}</p>
                {result.tokenScopedWabaIds && result.tokenScopedWabaIds.length > 0 && (
                  <p className="mt-2 text-xs text-ink-3">
                    Your access token is scoped to:{" "}
                    {result.tokenScopedWabaIds.map((id) => (
                      <code key={id} className="mr-1 font-mono">
                        {id}
                      </code>
                    ))}
                    — try saving one of these as the Business account ID.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
