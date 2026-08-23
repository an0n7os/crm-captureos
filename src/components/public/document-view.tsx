import { Camera } from "lucide-react";

import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export type DocumentLine = {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: unknown;
  amount: unknown;
};

/**
 * Shared print-friendly layout for the public quotation and invoice pages.
 * Rendered without the app shell so clients see only the document.
 */
export function DocumentView({
  kind,
  number,
  title,
  status,
  studio,
  recipient,
  issuedOn,
  dueLabel,
  dueOn,
  items,
  subtotal,
  discount,
  taxPercent,
  taxAmount,
  total,
  amountPaid,
  notes,
  terms,
  children,
}: {
  kind: "Quotation" | "Invoice";
  number: string;
  title?: string | null;
  status: string;
  studio: {
    name: string;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    addressLine?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    gstNumber?: string | null;
    currency: string;
  };
  recipient: { name: string; email?: string | null; phone?: string | null; city?: string | null };
  issuedOn: Date | string;
  dueLabel?: string;
  dueOn?: Date | string | null;
  items: DocumentLine[];
  subtotal: unknown;
  discount: unknown;
  taxPercent: unknown;
  taxAmount: unknown;
  total: unknown;
  amountPaid?: unknown;
  notes?: string | null;
  terms?: string | null;
  children?: React.ReactNode;
}) {
  const currency = studio.currency;
  const paid = toNumber(amountPaid);
  const balance = toNumber(total) - paid;

  const address = [studio.addressLine, studio.city, studio.state, studio.pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border p-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Camera className="size-4.5" />
                </span>
                <span className="text-lg font-semibold tracking-tight">{studio.name}</span>
              </div>

              <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
                {address && <p>{address}</p>}
                {studio.phone && <p>{studio.phone}</p>}
                {studio.email && <p>{studio.email}</p>}
                {studio.gstNumber && <p>GSTIN: {studio.gstNumber}</p>}
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {kind}
              </p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight">{number}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Issued {formatDate(issuedOn)}
              </p>
              {dueOn && (
                <p className="text-sm text-muted-foreground">
                  {dueLabel ?? "Due"} {formatDate(dueOn)}
                </p>
              )}
              <p className="mt-2 inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                {status}
              </p>
            </div>
          </div>

          {/* Recipient */}
          <div className="border-b border-border p-8 pb-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {kind === "Invoice" ? "Billed to" : "Prepared for"}
            </p>
            <p className="mt-1.5 text-base font-medium">{recipient.name}</p>
            <div className="mt-0.5 space-y-0.5 text-sm text-muted-foreground">
              {recipient.email && <p>{recipient.email}</p>}
              {recipient.phone && <p>{recipient.phone}</p>}
              {recipient.city && <p>{recipient.city}</p>}
            </div>
            {title && <p className="mt-4 text-sm font-medium">{title}</p>}
          </div>

          {/* Items */}
          <div className="p-8 pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Description
                    </th>
                    <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Qty
                    </th>
                    <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Rate
                    </th>
                    <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </td>
                      <td className="py-3 text-right tabular">{item.quantity}</td>
                      <td className="py-3 text-right tabular">
                        {formatCurrency(item.unitPrice, currency)}
                      </td>
                      <td className="py-3 text-right font-medium tabular">
                        {formatCurrency(item.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <dl className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular">{formatCurrency(subtotal, currency)}</dd>
                </div>
                {toNumber(discount) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="tabular">−{formatCurrency(discount, currency)}</dd>
                  </div>
                )}
                {toNumber(taxPercent) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tax ({toNumber(taxPercent)}%)</dt>
                    <dd className="tabular">{formatCurrency(taxAmount, currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular">{formatCurrency(total, currency)}</dd>
                </div>
                {amountPaid !== undefined && (
                  <>
                    <div className="flex justify-between text-success">
                      <dt>Received</dt>
                      <dd className="tabular">{formatCurrency(paid, currency)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-semibold">
                      <dt>Balance due</dt>
                      <dd className="tabular">{formatCurrency(balance, currency)}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          </div>

          {(notes || terms) && (
            <div className="grid gap-6 border-t border-border p-8 sm:grid-cols-2">
              {notes && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{notes}</p>
                </div>
              )}
              {terms && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Terms
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{terms}</p>
                </div>
              )}
            </div>
          )}

          {children}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {studio.name}
          {studio.website ? ` · ${studio.website}` : ""}
        </p>
      </div>
    </div>
  );
}
