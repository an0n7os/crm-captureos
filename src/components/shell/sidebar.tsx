"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, ChevronLeft, LogOut, MoreHorizontal, Moon, Sun } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/actions/auth-actions";
import { NAV, isActivePath } from "@/lib/nav";
import { cn } from "@/lib/utils";

export type SidebarCounts = {
  enquiries: number;
  requests: number;
  postProduction: number;
};

export function Sidebar({
  user,
  counts,
  mobileOpen,
  onMobileClose,
}: {
  user: { name: string; email: string; studioName: string; avatarUrl?: string | null };
  counts: SidebarCounts;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  // Restore the collapsed preference after mount to avoid a hydration mismatch.
  React.useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", prev ? "0" : "1");
      return !prev;
    });
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      <aside
        data-collapsed={collapsed}
        className={cn(
          "peer fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-200",
          collapsed ? "w-[72px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-16 items-center justify-between", collapsed ? "px-3" : "px-4")}>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Camera className="size-4.5" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {user.studioName}
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-widest text-sidebar-muted">
                  CaptureOS
                </span>
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "hidden size-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-white lg:flex",
              !collapsed && "ml-auto"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="scrollbar-slim flex-1 overflow-y-auto px-3 pb-4">
          {NAV.map((group, gi) => (
            <div key={gi} className={cn(gi > 0 && "mt-6")}>
              {group.heading && !collapsed && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
                  {group.heading}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const count = item.badge ? counts[item.badge] : 0;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-active text-sidebar-active-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-active/60 hover:text-white",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <item.icon className="size-4.5 shrink-0" />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!collapsed && count > 0 && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                        {collapsed && count > 0 && (
                          <span className="absolute ml-6 -mt-5 size-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account */}
        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-active",
                  collapsed && "justify-center",
                )}
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">
                        {user.name}
                      </span>
                      <span className="block truncate text-xs text-sidebar-muted">{user.email}</span>
                    </span>
                    <MoreHorizontal className="size-4 shrink-0 text-sidebar-muted" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ThemeMenuItem />
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={logoutAction}>
                <button type="submit" className="w-full">
                  <DropdownMenuItem variant="danger" onSelect={(e) => e.preventDefault()} asChild>
                    <span>
                      <LogOut />
                      Sign out
                    </span>
                  </DropdownMenuItem>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}

function ThemeMenuItem() {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={toggle}>
      {dark ? <Sun /> : <Moon />}
      {dark ? "Light mode" : "Dark mode"}
    </DropdownMenuItem>
  );
}
