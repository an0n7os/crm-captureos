/**
 * Plain constants and pure helpers. These live outside the `"use server"`
 * action files because a server-action module may only export async functions.
 */

export const DEFAULT_HEADING = "Tell us about your day";
export const DEFAULT_SUBTEXT =
  "Share a few details and we'll come back to you with availability and pricing.";

/** Starting text for a new contract, filled with what the project already knows. */
export function defaultContractBody(input: {
  studioName: string;
  clientName: string;
  projectName: string;
  eventDates: string;
  venue: string;
  amount: string;
}) {
  return `1. Parties
This agreement is between ${input.studioName} ("the Studio") and ${input.clientName} ("the Client").

2. Engagement
The Client engages the Studio to provide photography and videography coverage for ${input.projectName}${
    input.eventDates ? ` on ${input.eventDates}` : ""
  }${input.venue ? ` at ${input.venue}` : ""}.

3. Fee and payment
The total fee is ${input.amount}. A booking advance is payable to confirm the date. The balance is payable before final delivery. The date is held only once the advance is received.

4. Deliverables and timeline
Deliverables and their expected delivery windows are as listed in the project. Timelines begin from the last event day and assume the Client responds to review requests within seven days.

5. Cancellation
If the Client cancels, the booking advance is non-refundable. If the Studio cannot attend due to circumstances beyond its control, the Studio will arrange a replacement of comparable standard or refund all amounts received.

6. Copyright and usage
The Studio retains copyright in all images and footage. The Client receives a personal, non-commercial licence to use the delivered files. The Studio may use selected work in its portfolio and marketing unless the Client asks in writing that it does not.

7. Archival
Files are retained for ninety days after final delivery. The Client is responsible for keeping their own backup after that.

8. Acceptance
Signing below confirms the Client has read and accepted these terms.`;
}
