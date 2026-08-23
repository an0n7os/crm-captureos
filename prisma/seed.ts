/**
 * Demo data for local development.
 *   npm run db:seed
 * Signs in with demo@studio.test / demo1234
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_EMAIL = "demo@studio.test";
const DEMO_PASSWORD = "demo1234";

const days = (n: number) => new Date(Date.now() + n * 86_400_000);

async function main() {
  // Start from a clean slate so re-seeding is idempotent.
  const existing = await prisma.studio.findUnique({ where: { slug: "frames-co" } });
  if (existing) {
    await prisma.studio.delete({ where: { id: existing.id } });
    console.log("Removed the previous demo studio.");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const studio = await prisma.studio.create({
    data: {
      name: "Frames & Co.",
      slug: "frames-co",
      email: DEMO_EMAIL,
      phone: "+91 98470 12345",
      city: "Kochi",
      state: "Kerala",
      gstNumber: "32ABCDE1234F1Z5",
      onboardedAt: new Date(),
      plan: "STUDIO",
    },
  });
  const studioId = studio.id;

  const [owner, manager, editor] = await Promise.all([
    prisma.user.create({
      data: { studioId, name: "Aswin", email: DEMO_EMAIL, passwordHash, role: "OWNER" },
    }),
    prisma.user.create({
      data: {
        studioId,
        name: "Nithya Raj",
        email: "nithya@studio.test",
        passwordHash,
        role: "MANAGER",
      },
    }),
    prisma.user.create({
      data: {
        studioId,
        name: "Vishnu P",
        email: "vishnu@studio.test",
        passwordHash,
        role: "EDITOR",
      },
    }),
  ]);

  await prisma.package.createMany({
    data: [
      {
        studioId,
        name: "Silver — Photo only",
        price: 65_000,
        inclusions: ["1 photographer", "Candid coverage", "300 edited photos", "Online gallery"],
        sortOrder: 0,
      },
      {
        studioId,
        name: "Gold — Photo + Video",
        price: 1_25_000,
        inclusions: [
          "2 photographers",
          "1 cinematographer",
          "500 edited photos",
          "Highlight film (5 min)",
          "Premium album (30 sheets)",
        ],
        sortOrder: 1,
      },
      {
        studioId,
        name: "Platinum — Full production",
        price: 2_40_000,
        inclusions: [
          "3 photographers",
          "2 cinematographers",
          "Drone coverage",
          "Teaser + highlight + full film",
          "2 premium albums",
          "Same-day edit",
        ],
        sortOrder: 2,
      },
    ],
  });

  await prisma.deliverableTemplate.createMany({
    data: [
      { studioId, name: "Edited photos", dueInDays: 30, sortOrder: 0 },
      { studioId, name: "Highlight film", dueInDays: 45, sortOrder: 1 },
      { studioId, name: "Teaser reel", dueInDays: 10, sortOrder: 2 },
      { studioId, name: "Premium album", dueInDays: 75, sortOrder: 3 },
    ],
  });

  // --- Crew ---------------------------------------------------------------
  const crew = await Promise.all(
    [
      { name: "Aswin", role: "PHOTOGRAPHER", type: "IN_HOUSE", dayRate: 12_000, userId: owner.id },
      { name: "Nithya Raj", role: "COORDINATOR", type: "IN_HOUSE", dayRate: 6_000, userId: manager.id },
      { name: "Vishnu P", role: "EDITOR", type: "IN_HOUSE", dayRate: 7_000, userId: editor.id },
      { name: "Rahul Krishnan", role: "CINEMATOGRAPHER", type: "FREELANCER", dayRate: 15_000 },
      { name: "Fahad M", role: "DRONE_PILOT", type: "FREELANCER", dayRate: 10_000 },
      { name: "Anjali S", role: "PHOTOGRAPHER", type: "FREELANCER", dayRate: 9_000 },
      { name: "Deepak Nair", role: "ALBUM_DESIGNER", type: "FREELANCER", dayRate: 5_000 },
    ].map((c) =>
      prisma.crewMember.create({
        data: {
          studioId,
          name: c.name,
          role: c.role as never,
          type: c.type as never,
          dayRate: c.dayRate,
          city: "Kochi",
          phone: "+91 98470 00000",
          userId: c.userId ?? null,
        },
      }),
    ),
  );

  // --- Enquiries across the pipeline --------------------------------------
  const enquiries = [
    {
      contactName: "Arjun Menon",
      partnerName: "Meera Nair",
      status: "NEW",
      source: "INSTAGRAM",
      eventDate: days(150),
      venue: "Le Meridien, Kochi",
      budgetMin: 1_00_000,
      budgetMax: 1_50_000,
      guestCount: 500,
      followUp: days(2),
    },
    {
      contactName: "Sneha Thomas",
      partnerName: "Rohit Varghese",
      status: "FOLLOW_UP",
      source: "REFERRAL",
      eventDate: days(95),
      venue: "Bolgatty Palace",
      budgetMin: 1_80_000,
      budgetMax: 2_40_000,
      guestCount: 800,
      followUp: days(-1),
    },
    {
      contactName: "Karthik Iyer",
      status: "QUOTED",
      source: "GOOGLE",
      eventDate: days(60),
      venue: "Crowne Plaza",
      budgetMin: 60_000,
      budgetMax: 90_000,
      guestCount: 250,
      followUp: days(4),
    },
    {
      contactName: "Fathima Rasheed",
      partnerName: "Ashiq Ali",
      status: "REVISE",
      source: "WHATSAPP",
      eventDate: days(200),
      venue: "Kumarakom Lake Resort",
      budgetMin: 2_00_000,
      budgetMax: 3_00_000,
      guestCount: 400,
      followUp: days(1),
    },
    {
      contactName: "Praveen Kumar",
      status: "CONTACTED",
      source: "WEBSITE",
      eventDate: days(120),
      venue: "Grand Hyatt",
      budgetMin: 80_000,
      budgetMax: 1_20_000,
      guestCount: 300,
      followUp: days(6),
    },
    {
      contactName: "Divya Prakash",
      status: "LOST",
      source: "FACEBOOK",
      eventDate: days(40),
      budgetMin: 40_000,
      budgetMax: 55_000,
      lostReason: "Budget mismatch",
    },
  ];

  for (const [i, e] of enquiries.entries()) {
    await prisma.enquiry.create({
      data: {
        studioId,
        contactName: e.contactName,
        partnerName: e.partnerName ?? null,
        phone: `+91 98470 1${String(1000 + i).slice(-4)}`,
        email: `${e.contactName.split(" ")[0].toLowerCase()}@example.com`,
        city: "Kochi",
        eventType: "WEDDING",
        eventDate: e.eventDate ?? null,
        venue: e.venue ?? null,
        guestCount: e.guestCount ?? null,
        budgetMin: e.budgetMin,
        budgetMax: e.budgetMax,
        status: e.status as never,
        source: e.source as never,
        nextFollowUpAt: e.followUp ?? null,
        lostReason: e.lostReason ?? null,
        closedAt: e.status === "LOST" ? days(-5) : null,
        ownerId: i % 2 === 0 ? owner.id : manager.id,
        notes:
          "Wants candid coverage with a cinematic highlight film. Prefers warm tones, no heavy retouching.",
      },
    });
  }

  // --- A booked project, end to end ---------------------------------------
  const client = await prisma.client.create({
    data: {
      studioId,
      name: "Anand Pillai",
      partnerName: "Lakshmi Menon",
      email: "anand@example.com",
      phone: "+91 98470 55555",
      city: "Thrissur",
    },
  });

  const project = await prisma.project.create({
    data: {
      studioId,
      clientId: client.id,
      code: "PRJ-0001",
      name: "Anand & Lakshmi",
      eventType: "WEDDING",
      status: "POST_PRODUCTION",
      startDate: days(-20),
      endDate: days(-18),
      venue: "Lulu Bolgatty International Convention Centre",
      city: "Kochi",
      packageValue: 2_40_000,
      managerId: manager.id,
      notes: "Three-day celebration. Bride's family wants a same-day edit for the reception.",
    },
  });

  const eventDays = await Promise.all(
    [
      { title: "Haldi", eventType: "HALDI", date: days(-20) },
      { title: "Wedding", eventType: "WEDDING", date: days(-19) },
      { title: "Reception", eventType: "RECEPTION", date: days(-18) },
    ].map((d) =>
      prisma.eventDay.create({
        data: {
          studioId,
          projectId: project.id,
          title: d.title,
          eventType: d.eventType as never,
          date: d.date,
          startTime: "09:00",
          endTime: "22:00",
          venue: "Lulu Bolgatty ICC",
          city: "Kochi",
        },
      }),
    ),
  );

  for (const day of eventDays) {
    await prisma.crewAssignment.createMany({
      data: [
        { studioId, eventDayId: day.id, crewId: crew[0].id, role: "PHOTOGRAPHER", status: "COMPLETED", agreedFee: 12_000, callTime: "08:30" },
        { studioId, eventDayId: day.id, crewId: crew[3].id, role: "CINEMATOGRAPHER", status: "COMPLETED", agreedFee: 15_000, callTime: "08:30" },
        { studioId, eventDayId: day.id, crewId: crew[5].id, role: "PHOTOGRAPHER", status: "COMPLETED", agreedFee: 9_000, callTime: "09:00" },
      ],
    });
  }

  const deliverables = await Promise.all(
    [
      { name: "Edited photos", status: "IN_PROGRESS", dueDate: days(10) },
      { name: "Highlight film", status: "REVIEW", dueDate: days(25) },
      { name: "Teaser reel", status: "DELIVERED", dueDate: days(-10), deliveredAt: days(-9) },
      { name: "Premium album", status: "PENDING", dueDate: days(55) },
    ].map((d) =>
      prisma.deliverable.create({
        data: {
          studioId,
          projectId: project.id,
          name: d.name,
          status: d.status as never,
          dueDate: d.dueDate,
          deliveredAt: d.deliveredAt ?? null,
        },
      }),
    ),
  );

  await prisma.postTask.createMany({
    data: [
      { studioId, projectId: project.id, deliverableId: deliverables[0].id, title: "Cull & colour grade — 2400 photos", status: "IN_PROGRESS", priority: "HIGH", assigneeId: editor.id, dueDate: days(8) },
      { studioId, projectId: project.id, deliverableId: deliverables[1].id, title: "Highlight film — first cut", status: "REVIEW", priority: "NORMAL", assigneeId: editor.id, dueDate: days(20) },
      { studioId, projectId: project.id, deliverableId: deliverables[3].id, title: "Album layout — 40 sheets", status: "NOT_STARTED", priority: "NORMAL", dueDate: days(50) },
      { studioId, projectId: project.id, title: "Reception full film — sync audio", status: "NOT_STARTED", priority: "LOW", dueDate: days(40) },
      { studioId, projectId: project.id, title: "Drone footage — stabilise", status: "CHANGES_REQUESTED", priority: "URGENT", assigneeId: editor.id, dueDate: days(3) },
    ],
  });

  await prisma.clientRequest.createMany({
    data: [
      { studioId, projectId: project.id, clientId: client.id, title: "Swap the opening shot of the teaser", status: "NEW", priority: "HIGH", fromPortal: true, description: "The family would prefer the temple entrance shot as the opener." },
      { studioId, projectId: project.id, clientId: client.id, title: "Brighten the haldi photos", status: "PENDING", priority: "NORMAL", fromPortal: true },
      { studioId, projectId: project.id, clientId: client.id, title: "Add 6 more photos to the album", status: "IN_PROGRESS", priority: "NORMAL" },
    ],
  });

  const invoice = await prisma.invoice.create({
    data: {
      studioId,
      projectId: project.id,
      clientId: client.id,
      number: "INV-0001",
      title: "Wedding coverage — Platinum",
      status: "PARTIAL",
      subtotal: 2_40_000,
      taxPercent: 18,
      taxAmount: 43_200,
      total: 2_83_200,
      amountPaid: 1_00_000,
      issueDate: days(-60),
      dueDate: days(12),
      items: {
        create: [
          { name: "Platinum package", quantity: 1, unitPrice: 2_40_000, amount: 2_40_000, sortOrder: 0 },
        ],
      },
    },
  });

  await prisma.payment.createMany({
    data: [
      { studioId, invoiceId: invoice.id, amount: 60_000, method: "UPI", paidOn: days(-60), reference: "Advance" },
      { studioId, invoiceId: invoice.id, amount: 40_000, method: "BANK_TRANSFER", paidOn: days(-25), reference: "Second instalment" },
    ],
  });

  await prisma.expense.createMany({
    data: [
      { studioId, projectId: project.id, title: "Freelancer — cinematographer", category: "FREELANCER", amount: 45_000, spentOn: days(-17) },
      { studioId, projectId: project.id, title: "Travel & accommodation", category: "TRAVEL", amount: 12_500, spentOn: days(-20) },
      { studioId, projectId: project.id, title: "Album printing advance", category: "ALBUM_PRINTING", amount: 18_000, spentOn: days(-5) },
      { studioId, title: "Adobe Creative Cloud", category: "SOFTWARE", amount: 4_200, spentOn: days(-12) },
      { studioId, title: "Lens rental — 85mm", category: "EQUIPMENT", amount: 6_000, spentOn: days(-19) },
    ],
  });

  await prisma.payout.createMany({
    data: [
      { studioId, crewId: crew[3].id, projectId: project.id, amount: 45_000, status: "PAID", paidOn: days(-15) },
      { studioId, crewId: crew[5].id, projectId: project.id, amount: 27_000, status: "PENDING" },
      { studioId, crewId: crew[4].id, projectId: project.id, amount: 10_000, status: "PENDING" },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { studioId, title: "Payment due in 12 days", body: "INV-0001 · Anand & Lakshmi · ₹1,83,200 balance", href: "/finances" },
      { studioId, title: "New client request", body: "Swap the opening shot of the teaser", href: "/requests" },
      { studioId, title: "Follow-up overdue", body: "Sneha Thomas — follow-up was due yesterday", href: "/enquiries" },
    ],
  });

  await prisma.activity.createMany({
    data: [
      { studioId, userId: owner.id, action: "project.created", entityType: "project", entityId: project.id, summary: "Created project Anand & Lakshmi" },
      { studioId, userId: manager.id, action: "payment.recorded", entityType: "invoice", entityId: invoice.id, summary: "Recorded ₹40,000 against INV-0001" },
      { studioId, userId: editor.id, action: "task.status", entityType: "post_task", entityId: project.id, summary: "Moved highlight film to review" },
      { studioId, userId: owner.id, action: "enquiry.created", entityType: "enquiry", entityId: project.id, summary: "New enquiry — Arjun Menon" },
    ],
  });

  console.log(`\nSeeded "${studio.name}".`);
  console.log(`  Sign in: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
