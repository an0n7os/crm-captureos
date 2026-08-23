"use client";

import * as React from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Saving as PDF goes through the browser's own print dialog — no server-side
 * renderer to install, and the output matches what the client sees on screen.
 */
export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer />
      Save as PDF
    </Button>
  );
}

/** Opens the print dialog once the page has painted, for ?auto=1 links. */
export function AutoPrint() {
  React.useEffect(() => {
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
