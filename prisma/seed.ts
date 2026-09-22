import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding EVES...");

  const passwordManager = await bcrypt.hash("Manager123!", 10);
  const passwordEmployee = await bcrypt.hash("Employee123!", 10);
  const passwordAdrian = await bcrypt.hash("sharedroom228", 10);

  const manager = await prisma.user.upsert({
    where: { email: "manager@eves.local" },
    update: { password: passwordManager, role: "MANAGER", name: "Eves Manager" },
    create: {
      name: "Eves Manager",
      email: "manager@eves.local",
      password: passwordManager,
      role: "MANAGER",
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@eves.local" },
    update: { password: passwordEmployee, role: "EMPLOYEE", name: "Jane Employee" },
    create: {
      name: "Jane Employee",
      email: "employee@eves.local",
      password: passwordEmployee,
      role: "EMPLOYEE",
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "employee2@eves.local" },
    update: { password: passwordEmployee, role: "EMPLOYEE", name: "John Field" },
    create: {
      name: "John Field",
      email: "employee2@eves.local",
      password: passwordEmployee,
      role: "EMPLOYEE",
    },
  });

  const adrian = await prisma.user.upsert({
    where: { email: "adrian@eves.local" },
    update: { password: passwordAdrian, role: "ADMIN", name: "Adrian" },
    create: {
      name: "Adrian",
      email: "adrian@eves.local",
      password: passwordAdrian,
      role: "ADMIN",
    },
  });

  console.log("👤 Users:", { admin: adrian.email, manager: manager.email, employee: employee.email, employee2: employee2.email });

  const propertyNames = ["ADI", "BNB", "DREAM", "ECO", "GREEN", "KALAYAAN"];
  for (const name of propertyNames) {
    const prop = await prisma.property.upsert({
      where: { name },
      update: {},
      create: { name, address: `${name} Property, Metro Manila` },
    });
    // Ensure at least 2 units per property if missing
    const existing = await prisma.unit.count({ where: { propertyId: prop.id } });
    if (existing === 0) {
      for (let i = 1; i <= 3; i++) {
        await prisma.unit.create({
          data: {
            propertyId: prop.id,
            unitNumber: `${name}-${String(i).padStart(3, "0")}`,
            monthlyRate: 15000 + i * 2500,
            status: i === 1 ? "OCCUPIED" : "VACANT",
          },
        });
      }
    }
  }

  const prop = await prisma.property.findFirst({ where: { name: "ECO" } });
  if (prop) {
    const units = await prisma.unit.findMany({ where: { propertyId: prop.id }, take: 2 });
    // Seed sample tasks if none
    const taskCount = await prisma.task.count();
    if (taskCount === 0) {
      await prisma.task.create({
        data: {
          title: "Inspect water leak — ECO-001",
          description: "Tenant reported leak under kitchen sink. Check piping and replace seal.",
          status: "PENDING",
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          assignedToId: employee.id,
          createdById: manager.id,
          propertyId: prop.id,
          unitId: units[0]?.id,
          notes: "Priority: high. Bring tools.",
        },
      });
      await prisma.task.create({
        data: {
          title: "Collect rent — GREEN portfolio",
          description: "Follow up on overdue GREEN units for May.",
          status: "IN_PROGRESS",
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          assignedToId: employee2.id,
          createdById: manager.id,
          notes: "",
        },
      });
    }
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
