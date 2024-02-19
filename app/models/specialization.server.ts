import { prisma } from "~/db.server";



export async function getSpecialization(specializationId: string) {
    return prisma.specialization.findUnique({
        where: { id: specializationId },
        include: {
            requirements: true,
        },
    });
}

export async function getSpecializations() {
  return prisma.specialization.findMany({
    include: {
      requirements: true,
    },
  });
}