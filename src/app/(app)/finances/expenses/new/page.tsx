import { redirect } from "next/navigation";

type SearchParams = Promise<{ projectId?: string }>;

/**
 * Expenses are created from a dialog on the finances page rather than a
 * dedicated screen; this route just lands the user in the right tab.
 */
export default async function NewExpensePage({ searchParams }: { searchParams: SearchParams }) {
  await searchParams;
  redirect("/finances?tab=expenses");
}
