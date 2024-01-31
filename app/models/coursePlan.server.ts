
import { prisma } from "~/db.server";



export function getUserCoursePlans(userId: string) {
  return prisma.coursePlan.findMany({where: {userId}});
}

export function getUserCoursePlan(planId: string) {
  return prisma.coursePlan.findUnique({
    where: { id: planId },
    include: { 
      plannedCourses: {
        include: {
          course: {
            include: {
              equivalentCourses: true,
              excludedCourses: true,
            }
          }
        }
      } 
    },
  });
}