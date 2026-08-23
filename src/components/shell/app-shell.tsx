"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Menu, Plus, Search } from "lucide-react";

import { Sidebar, type SidebarCounts } from "@/components/shell/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { relativeDays } from "@/lib/utils";

export type ShellNotification = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: string;
};

export function AppShell({
  user,
  counts,
  notifications,
  children,
}: {
  user: { name: string; email: string; studioName: string; avatarUrl?: string | null };
  counts: SidebarCounts;
  notifications: ShellNotification[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar
        user={user}
        counts={counts}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Left padding matches sidebar state; sidebar itself is fixed. */}
      <div className="transition-[padding] duration-200 lg:pl-64 peer-data-[collapsed=true]:lg:pl-[72px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-2">
            <QuickCreate />
            <NotificationBell notifications={notifications} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function GlobalSearch() {
  return (
    <form action="/search" className="relative hidden max-w-sm flex-1 sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        name="q"
        placeholder="Search clients, projects, invoices…"
        className="h-9.5 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
      />
    </form>
  );
}

const QUICK_LINKS = [
  ["New enquiry", "/enquiries/new"],
  ["New project", "/projects/new"],
  ["New quotation", "/quotations/new"],
  ["New invoice", "/finances/invoices/new"],
  ["Add expense", "/finances/expenses/new"],
  ["Add crew member", "/team/new"],
] as const;

function QuickCreate() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {QUICK_LINKS.map(([label, href]) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>{label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationBell({ notifications }: { notifications: ShellNotification[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell />
          {notifications.length > 0 && (
            <span className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-card" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-4 py-3 text-sm font-semibold text-foreground">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-0 my-0" />

        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <div className="scrollbar-slim max-h-80 overflow-y-auto py-1">
            {notifications.map((n) => (
              <DropdownMenuItem key={n.id} asChild className="rounded-none px-4 py-3">
                <Link href={n.href ?? "#"} className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-medium text-foreground">{n.title}</span>
                  {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                  <span className="text-[11px] text-muted-foreground/80">
                    {relativeDays(n.createdAt)}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
