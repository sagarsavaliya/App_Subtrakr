"use client";

import { useState } from "react";
import { addPaymentMethod, updatePaymentMethod } from "@/app/app/paymentMethodActions";
import { useServerAction } from "@/lib/useServerAction";
import { ChipSelect } from "@/components/ChipSelect";
import { CustomSelect } from "@/components/CustomSelect";
import type { PaymentMethod } from "@/components/ProfileEntitiesAndPaymentsSection";

const TYPE_OPTIONS = [
  { value: "credit_card", label: "Credit card" },
  { value: "debit_card", label: "Debit card" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "wallet", label: "Wallet" },
];

const CARD_NETWORKS = [
  { value: "Visa", label: "Visa" },
  { value: "Mastercard", label: "Mastercard" },
  { value: "RuPay", label: "RuPay" },
  { value: "American Express", label: "Amex" },
  { value: "Diners Club", label: "Diners" },
];

const CARD_VARIANTS = [
  { value: "standard", label: "Standard / Classic" },
  { value: "gold", label: "Gold Card" },
  { value: "platinum", label: "Platinum Card" },
  { value: "signature", label: "Signature / World Card" },
  { value: "infinite", label: "Infinite / Privilege / Black" },
  { value: "corporate", label: "Corporate / Business Card" },
  { value: "rewards", label: "Rewards / Cashback Card" },
];

const CO_BRANDED_OPTIONS = [
  { value: "none", label: "None (Standard Issuer Card)" },
  { value: "Amazon Pay", label: "Amazon Pay (e.g. ICICI Bank)" },
  { value: "Flipkart", label: "Flipkart (e.g. Axis Bank)" },
  { value: "Tata Neu", label: "Tata Neu (e.g. HDFC Bank)" },
  { value: "Swiggy", label: "Swiggy (e.g. HDFC Bank)" },
  { value: "Zomato", label: "Zomato (e.g. RBL / Edition)" },
  { value: "Paytm", label: "Paytm (e.g. HDFC / SBI)" },
  { value: "MakeMyTrip", label: "MakeMyTrip (e.g. ICICI Bank)" },
  { value: "Club Vistara", label: "Club Vistara (e.g. Axis / SBI)" },
  { value: "BPCL / HPCL / IOCL", label: "Fuel Co-Branded (BPCL / HPCL / IOCL)" },
  { value: "Other Co-Branded", label: "Other Co-Branded Card" },
];

const UPI_HANDLES = [
  { value: "@okicici", label: "@okicici (Google Pay)" },
  { value: "@okhdfcbank", label: "@okhdfcbank (Google Pay)" },
  { value: "@oksbi", label: "@oksbi (Google Pay)" },
  { value: "@okaxis", label: "@okaxis (Google Pay)" },
  { value: "@paytm", label: "@paytm (Paytm UPI)" },
  { value: "@ybl", label: "@ybl (PhonePe)" },
  { value: "@ibl", label: "@ibl (PhonePe)" },
  { value: "@axl", label: "@axl (PhonePe)" },
  { value: "@apl", label: "@apl (Amazon Pay)" },
  { value: "@upi", label: "@upi (BHIM / National)" },
  { value: "@postbank", label: "@postbank (IPPB)" },
  { value: "@dbs", label: "@dbs (DBS digibank)" },
  { value: "@icici", label: "@icici (iMobile)" },
  { value: "@barodampay", label: "@barodampay (BOB)" },
];

const BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "IDFC FIRST Bank",
  "Yes Bank",
  "IndusInd Bank",
  "Federal Bank",
  "RBL Bank",
  "IDBI Bank",
];

const WALLETS = ["Paytm", "PhonePe", "Amazon Pay", "MobiKwik", "Freecharge", "Airtel Money", "JioMoney"];

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const m = String(i + 1).padStart(2, "0");
  return { value: m, label: m };
});

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 21 }, (_, i) => {
  const y = String(currentYear + i);
  return { value: y, label: y };
});

const inputClass =
  "glass w-full rounded-lg px-4 py-2.5 text-sm outline-none placeholder:text-ink-3 focus:border-glow/60 focus:ring-1 focus:ring-glow/40 transition-all duration-150";

export function PaymentMethodForm({
  existing,
  entityId,
  onDone,
}: {
  existing?: PaymentMethod;
  entityId: string;
  onDone: () => void;
}) {
  const [type, setType] = useState(existing?.type ?? "credit_card");

  // Parse existing UPI ID if available
  const initialUpiParts = existing?.upi_id?.split("@") ?? [];
  const initialUpiUsername = initialUpiParts[0] ?? "";
  const initialUpiHandle = initialUpiParts[1] ? `@${initialUpiParts[1]}` : "@okhdfcbank";

  // Persistent Form State — Preserves user inputs across method tab switches!
  const [formState, setFormState] = useState({
    bank_name: existing?.bank_name ?? "",
    card_network: existing?.card_network ?? "Visa",
    card_variant: "standard",
    co_branded: "none",
    cardholder_name: "",
    expiry_month: "12",
    expiry_year: String(currentYear + 3),
    last_four: existing?.last_four ?? "",
    upi_username: initialUpiUsername,
    upi_handle: initialUpiHandle,
    bank_transfer_name: existing?.bank_name ?? "",
    bank_transfer_last_four: existing?.last_four ?? "",
    wallet_name: existing?.wallet_name ?? "",
    wallet_mobile: existing?.wallet_mobile ?? "",
    label: existing?.label ?? "",
    is_default: existing?.is_default ?? false,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { run, pending } = useServerAction(existing ? updatePaymentMethod : addPaymentMethod, {
    onSuccess: onDone,
  });

  function updateField<K extends keyof typeof formState>(key: K, value: (typeof formState)[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => ({ ...prev, [key]: "" }));
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (type === "credit_card" || type === "debit_card") {
      if (!formState.bank_name.trim()) errors.bank_name = "Select or enter issuing bank";
      if (!formState.last_four.trim()) {
        errors.last_four = "Enter last 4 digits";
      } else if (!/^\d{4}$/.test(formState.last_four.trim())) {
        errors.last_four = "Must be exactly 4 numeric digits";
      }
    } else if (type === "upi") {
      const uname = formState.upi_username.trim();
      if (!uname) {
        errors.upi_username = "Enter UPI username";
      } else if (uname.includes("@") || uname.includes(" ")) {
        errors.upi_username = "Username cannot contain spaces or '@'";
      }
    } else if (type === "bank_transfer") {
      if (!formState.bank_transfer_name.trim()) errors.bank_transfer_name = "Enter bank name";
      if (
        formState.bank_transfer_last_four.trim() &&
        !/^\d{4}$/.test(formState.bank_transfer_last_four.trim())
      ) {
        errors.bank_transfer_last_four = "Must be 4 digits if provided";
      }
    } else if (type === "wallet") {
      if (!formState.wallet_name.trim()) errors.wallet_name = "Enter wallet provider";
      if (!formState.wallet_mobile.trim()) {
        errors.wallet_mobile = "Enter mobile number";
      } else if (!/^\d{10}$/.test(formState.wallet_mobile.trim())) {
        errors.wallet_mobile = "Enter valid 10-digit mobile number";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateForm()) return;

    const fd = new FormData();
    if (existing) fd.set("id", existing.id);
    fd.set("entity_id", existing?.entity_id ?? entityId);
    fd.set("type", type);

    if (type === "credit_card" || type === "debit_card") {
      fd.set("bank_name", formState.bank_name);
      fd.set("card_network", formState.card_network);
      fd.set("card_variant", formState.card_variant);
      fd.set("co_branded", formState.co_branded);
      fd.set("cardholder_name", formState.cardholder_name);
      fd.set("expiry_date", `${formState.expiry_month}/${formState.expiry_year}`);
      fd.set("last_four", formState.last_four);
    } else if (type === "upi") {
      const fullUpi = `${formState.upi_username.trim()}${formState.upi_handle}`;
      fd.set("upi_id", fullUpi);
      fd.set("upi_username", formState.upi_username.trim());
      fd.set("upi_handle", formState.upi_handle);
    } else if (type === "bank_transfer") {
      fd.set("bank_name", formState.bank_transfer_name);
      fd.set("last_four", formState.bank_transfer_last_four);
    } else if (type === "wallet") {
      fd.set("wallet_name", formState.wallet_name);
      fd.set("wallet_mobile", formState.wallet_mobile);
    }

    if (formState.label) fd.set("label", formState.label);
    if (formState.is_default) fd.set("is_default", "on");

    run(fd);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* ── Type Selector ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
          Payment Method Type
        </p>
        <ChipSelect name="type" options={TYPE_OPTIONS} defaultValue={type} onChange={setType} />
      </div>

      {/* ── CARD FORM ── */}
      {(type === "credit_card" || type === "debit_card") && (
        <div className="space-y-4">
          {/* Issuing Bank & Card Network (Side-by-Side 2-Column Grid) */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2">Issuing Bank / Institution</label>
              <input
                name="bank_name"
                list="banks"
                placeholder="e.g. HDFC Bank, ICICI Bank, SBI…"
                value={formState.bank_name}
                onChange={(e) => updateField("bank_name", e.target.value)}
                tabIndex={1}
                required
                className={inputClass}
              />
              {validationErrors.bank_name && (
                <p className="mt-1 text-xs text-overdue">{validationErrors.bank_name}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2">Card Network</label>
              <CustomSelect
                name="card_network"
                defaultValue={formState.card_network}
                options={CARD_NETWORKS}
                onChange={(v) => updateField("card_network", v)}
              />
            </div>
          </div>

          {/* Card Variant & Co-Branded Card (Adaptive 2-Column Grid) */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2">Card Variant</label>
              <CustomSelect
                name="card_variant"
                defaultValue={formState.card_variant}
                options={CARD_VARIANTS}
                onChange={(v) => updateField("card_variant", v)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2">Co-Branded Partner</label>
              <CustomSelect
                name="co_branded"
                defaultValue={formState.co_branded}
                options={CO_BRANDED_OPTIONS}
                onChange={(v) => updateField("co_branded", v)}
              />
            </div>
          </div>

          {/* Name on Card (Auto-Capitalized) */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-ink-2">Name on Card</label>
              <span className="text-[10px] text-ink-3 font-mono">AUTO-CAPS</span>
            </div>
            <input
              name="cardholder_name"
              placeholder="e.g. JOHN DOE"
              value={formState.cardholder_name}
              onChange={(e) => updateField("cardholder_name", e.target.value.toUpperCase())}
              tabIndex={2}
              className={`${inputClass} font-mono uppercase tracking-wider`}
            />
          </div>

          {/* Expiry Date (MM/YYYY) & Last 4 Digits (Adaptive 2-Column Grid) */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:items-start">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2">
                Expiry Date (MM/YYYY)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <CustomSelect
                    name="expiry_month"
                    defaultValue={formState.expiry_month}
                    options={MONTHS}
                    onChange={(v) => updateField("expiry_month", v)}
                  />
                </div>
                <span className="text-ink-3 font-semibold">/</span>
                <div className="flex-1">
                  <CustomSelect
                    name="expiry_year"
                    defaultValue={formState.expiry_year}
                    options={YEARS}
                    onChange={(v) => updateField("expiry_year", v)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2">Last 4 Digits</label>
              <input
                name="last_four"
                inputMode="numeric"
                maxLength={4}
                placeholder="4242"
                value={formState.last_four}
                onChange={(e) => updateField("last_four", e.target.value.replace(/\D/g, ""))}
                tabIndex={3}
                required
                className={`${inputClass} font-mono tracking-widest`}
              />
              {validationErrors.last_four && (
                <p className="mt-1 text-xs text-overdue">{validationErrors.last_four}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── UPI FORM (SPLIT ENTRY) ── */}
      {type === "upi" && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-ink-2">
            UPI Virtual Payment Address (VPA)
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Username Field */}
            <div className="flex-1 min-w-0">
              <input
                name="upi_username"
                placeholder="Username (e.g. John)"
                value={formState.upi_username}
                onChange={(e) =>
                  updateField("upi_username", e.target.value.toLowerCase().replace(/[@\s]/g, ""))
                }
                tabIndex={1}
                required
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* Handle Dropdown */}
            <div className="w-full sm:w-48 shrink-0">
              <CustomSelect
                name="upi_handle"
                defaultValue={formState.upi_handle}
                options={UPI_HANDLES}
                onChange={(v) => updateField("upi_handle", v)}
              />
            </div>
          </div>

          {validationErrors.upi_username && (
            <p className="text-xs text-overdue">{validationErrors.upi_username}</p>
          )}

          {/* Live Preview Text Label (Read-Only) */}
          <p className="pt-1 text-xs text-ink-3">
            Live UPI ID Preview:{" "}
            <span className="font-mono font-semibold text-glow">
              {formState.upi_username
                ? `${formState.upi_username}${formState.upi_handle}`
                : `username${formState.upi_handle}`}
            </span>
          </p>
        </div>
      )}

      {/* ── BANK TRANSFER FORM ── */}
      {type === "bank_transfer" && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Bank Name</label>
            <input
              name="bank_name"
              list="banks"
              placeholder="e.g. ICICI Bank, State Bank of India…"
              value={formState.bank_transfer_name}
              onChange={(e) => updateField("bank_transfer_name", e.target.value)}
              tabIndex={1}
              required
              className={inputClass}
            />
            {validationErrors.bank_transfer_name && (
              <p className="mt-1 text-xs text-overdue">{validationErrors.bank_transfer_name}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">
              Last 4 Digits of Account Number (Optional)
            </label>
            <input
              name="last_four"
              inputMode="numeric"
              maxLength={4}
              placeholder="8890"
              value={formState.bank_transfer_last_four}
              onChange={(e) =>
                updateField("bank_transfer_last_four", e.target.value.replace(/\D/g, ""))
              }
              tabIndex={2}
              className={`${inputClass} font-mono tracking-widest`}
            />
            {validationErrors.bank_transfer_last_four && (
              <p className="mt-1 text-xs text-overdue">
                {validationErrors.bank_transfer_last_four}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── WALLET FORM ── */}
      {type === "wallet" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Wallet Provider</label>
            <input
              name="wallet_name"
              list="wallets"
              placeholder="e.g. Paytm, PhonePe, Amazon Pay…"
              value={formState.wallet_name}
              onChange={(e) => updateField("wallet_name", e.target.value)}
              tabIndex={1}
              required
              className={inputClass}
            />
            {validationErrors.wallet_name && (
              <p className="mt-1 text-xs text-overdue">{validationErrors.wallet_name}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Linked Mobile Number</label>
            <input
              name="wallet_mobile"
              inputMode="numeric"
              maxLength={10}
              placeholder="9999999999"
              value={formState.wallet_mobile}
              onChange={(e) => updateField("wallet_mobile", e.target.value.replace(/\D/g, ""))}
              tabIndex={2}
              required
              className={`${inputClass} font-mono tracking-wider`}
            />
            {validationErrors.wallet_mobile && (
              <p className="mt-1 text-xs text-overdue">{validationErrors.wallet_mobile}</p>
            )}
          </div>
        </div>
      )}

      <datalist id="banks">
        {BANKS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <datalist id="wallets">
        {WALLETS.map((w) => (
          <option key={w} value={w} />
        ))}
      </datalist>

      {/* ── Custom Label ── */}
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">
          Custom Label / Nickname (Optional)
        </label>
        <input
          name="label"
          placeholder="e.g. Primary Shopping Card, Business UPI…"
          value={formState.label}
          onChange={(e) => updateField("label", e.target.value)}
          tabIndex={4}
          className={inputClass}
        />
      </div>

      {/* ── Default Checkbox ── */}
      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-ink-2 select-none pt-1">
        <input
          type="checkbox"
          name="is_default"
          checked={formState.is_default}
          onChange={(e) => updateField("is_default", e.target.checked)}
          tabIndex={5}
          className="h-4 w-4 rounded accent-glow cursor-pointer"
        />
        Set as default payment method for this entity
      </label>

      {/* ── Submit Button ── */}
      <button
        type="submit"
        disabled={pending}
        tabIndex={6}
        className="brand-gradient w-full rounded-lg px-4 py-3 text-sm font-bold text-[#08201a] transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 glow-shadow"
      >
        {pending ? "Saving…" : existing ? "Save changes" : "Save payment method"}
      </button>
    </form>
  );
}
