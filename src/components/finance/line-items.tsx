"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

export type LineItem = { name: string; quantity: number; unitPrice: number };

export type PackageOption = {
  id: string;
  name: string;
  price: number;
  inclusions: string[];
};

const EMPTY: LineItem = { name: "", quantity: 1, unitPrice: 0 };

/**
 * Editable line items plus the totals block. Values are submitted as repeated
 * `itemName` / `itemQty` / `itemPrice` fields the server action reads with getAll.
 */
export function LineItemsEditor({
  initialItems,
  initialDiscount = 0,
  initialTaxPercent = 0,
  packages = [],
  currency,
}: {
  initialItems?: LineItem[];
  initialDiscount?: number;
  initialTaxPercent?: number;
  packages?: PackageOption[];
  currency: string;
}) {
  const [items, setItems] = React.useState<LineItem[]>(
    initialItems && initialItems.length > 0 ? initialItems : [{ ...EMPTY }],
  );
  const [discount, setDiscount] = React.useState(initialDiscount);
  const [taxPercent, setTaxPercent] = React.useState(initialTaxPercent);

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxable = Math.max(subtotal - discount, 0);
  const taxAmount = Math.round(taxable * (taxPercent / 100) * 100) / 100;
  const total = taxable + taxAmount;

  function update(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addPackage(packageId: string) {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;

    const line: LineItem = { name: pkg.name, quantity: 1, unitPrice: pkg.price };
    setItems((prev) => {
      // Replace a single blank starter row rather than leaving it behind.
      const isBlank = prev.length === 1 && !prev[0].name && prev[0].unitPrice === 0;
      return isBlank ? [line] : [...prev, line];
    });
  }

  return (
    <div className="space-y-4">
      {packages.length > 0 && (
        <div className="flex items-center gap-2">
          <NativeSelect
            className="h-9 max-w-xs"
            value=""
            onChange={(e) => {
              addPackage(e.target.value);
              e.currentTarget.value = "";
            }}
          >
            <option value="">Add from a package…</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCurrency(p.price, currency)}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Item
              </th>
              <th className="w-20 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Qty
              </th>
              <th className="w-32 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rate
              </th>
              <th className="w-32 px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Amount
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="p-2">
                  <Input
                    name="itemName"
                    value={item.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder="Platinum package"
                    className="h-9 border-transparent bg-transparent shadow-none focus-visible:border-ring focus-visible:bg-card"
                  />
                </td>
                <td className="p-2">
                  <Input
                    name="itemQty"
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => update(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    className="h-9 border-transparent bg-transparent shadow-none focus-visible:border-ring focus-visible:bg-card"
                  />
                </td>
                <td className="p-2">
                  <Input
                    name="itemPrice"
                    type="number"
                    min={0}
                    step="100"
                    value={item.unitPrice}
                    onChange={(e) => update(i, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-9 border-transparent bg-transparent shadow-none focus-visible:border-ring focus-visible:bg-card"
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium tabular">
                  {formatCurrency(item.quantity * item.unitPrice, currency)}
                </td>
                <td className="px-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove line"
                    disabled={items.length === 1}
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setItems((prev) => [...prev, { ...EMPTY }])}
      >
        <Plus />
        Add line
      </Button>

      <div className="flex justify-end">
        <dl className="w-full max-w-xs space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between text-sm">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium tabular">{formatCurrency(subtotal, currency)}</dd>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">Discount</dt>
            <dd>
              <Input
                name="discount"
                type="number"
                min={0}
                step="500"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="h-8 w-28 text-right"
              />
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">Tax %</dt>
            <dd>
              <Input
                name="taxPercent"
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={taxPercent}
                onChange={(e) =>
                  setTaxPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                }
                className="h-8 w-28 text-right"
              />
            </dd>
          </div>

          <div className="flex items-center justify-between text-sm">
            <dt className="text-muted-foreground">Tax amount</dt>
            <dd className="font-medium tabular">{formatCurrency(taxAmount, currency)}</dd>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold tabular">{formatCurrency(total, currency)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
