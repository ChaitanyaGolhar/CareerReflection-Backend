import { prisma } from './src/lib/prisma.js';

async function main() {
  const count = await prisma.reflection.count();
  const reflections = await prisma.reflection.findMany({
    include: { contributor: true },
  });
  console.log("Total reflections:", count);
  console.log("Reflections data:", JSON.stringify(reflections, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
