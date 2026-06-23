import { PrismaClient } from "@prisma/client";
import { seedSurahs } from "./seed-surahs";

const prisma = new PrismaClient();

seedSurahs(prisma)
  .then(() => {
    console.log("Seeded 114 surahs");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
