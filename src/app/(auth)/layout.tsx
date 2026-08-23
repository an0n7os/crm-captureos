import Link from "next/link";
import { Camera } from "lucide-react";

/**
 * Split layout: form on the left, product pitch on the right. The right panel
 * is hidden below lg so the form owns the full width on phones.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Camera className="size-4.5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">CaptureOS</span>
          </Link>
          {children}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #ec4899, transparent 70%)" }}
        />

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-white">
            Every enquiry, shoot and edit — in one place.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground">
            Built for wedding and event studios that are tired of running the business across
            WhatsApp groups, spreadsheets and sticky notes.
          </p>

          <ul className="mt-9 space-y-4">
            {[
              ["Lead pipeline", "Track enquiries from first DM to signed booking."],
              ["Crew scheduling", "Assign your team per event day, without double-booking."],
              ["Post production", "A board that shows exactly where every edit stands."],
              ["Client portal", "Share deliverables and collect approvals in one link."],
              ["Finances", "Payment schedules, expenses and profit per project."],
            ].map(([title, copy]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-sm text-sidebar-muted">{copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
