import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Camera } from "lucide-react";

import { ContractSign } from "@/components/public/contract-sign";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Contract", robots: { index: false } };

export default async function ContractSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const contract = await prisma.contract.findUnique({
    where: { shareToken: token },
    include: {
      studio: true,
      project: {
        select: {
          name: true,
          venue: true,
          startDate: true,
          client: { select: { name: true, partnerName: true, email: true } },
        },
      },
    },
  });

  if (!contract) notFound();

  const studio = contract.studio;
  const client = contract.project.client;
  const address = [studio.addressLine, studio.city, studio.state, studio.pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border p-8">
            <div>
              <div className="flex items-center gap-2.5">
                {studio.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={studio.logoUrl} alt="" className="size-9 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Camera className="size-4.5" />
                  </span>
                )}
                <span className="text-lg font-semibold tracking-tight">{studio.name}</span>
              </div>

              <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
                {address && <p>{address}</p>}
                {studio.phone && <p>{studio.phone}</p>}
                {studio.email && <p>{studio.email}</p>}
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Agreement
              </p>
              <p className="mt-0.5 max-w-56 text-base font-semibold leading-tight">
                {contract.title}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatDate(contract.createdAt)}
              </p>
              {contract.status === "SIGNED" && (
                <Badge variant="success" className="mt-2">
                  Signed
                </Badge>
              )}
              {contract.status === "DECLINED" && (
                <Badge variant="danger" className="mt-2">
                  Declined
                </Badge>
              )}
            </div>
          </div>

          <div className="border-b border-border p-8 pb-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Client
                </p>
                <p className="mt-1 text-sm font-medium">
                  {client.name}
                  {client.partnerName ? ` & ${client.partnerName}` : ""}
                </p>
                {client.email && (
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Project
                </p>
                <p className="mt-1 text-sm font-medium">{contract.project.name}</p>
                <p className="text-sm text-muted-foreground">
                  {contract.project.startDate ? formatDate(contract.project.startDate) : ""}
                  {contract.project.venue ? ` · ${contract.project.venue}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{contract.body}</p>
          </div>

          {contract.status === "SIGNED" ? (
            <div className="border-t border-border bg-success-soft p-8">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-success">
                Signed
              </p>
              <p className="mt-1.5 text-lg font-medium text-success">{contract.signerName}</p>
              <p className="text-sm text-success/80">
                {contract.signedAt ? formatDateTime(contract.signedAt) : ""}
              </p>
            </div>
          ) : contract.status === "DECLINED" ? (
            <div className="border-t border-border bg-danger-soft p-8">
              <p className="text-sm text-danger">
                This agreement was declined. Contact the studio if that was a mistake.
              </p>
            </div>
          ) : (
            <ContractSign
              token={token}
              defaultName={client.name}
              studioName={studio.name}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {studio.name}
          {studio.website ? ` · ${studio.website}` : ""}
        </p>
      </div>
    </div>
  );
}
