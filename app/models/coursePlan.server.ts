
import { Course, CoursePlan, PlannedCourse } from "@prisma/client";
import { prisma } from "~/db.server";



export function getUserCoursePlans(userId: string) {
  return prisma.coursePlan.findMany({where: {userId}});
}

export function getCoursePlan(planId: string) {
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
export async function setCoursePlan(coursePlanData: any) {
  const { id, title, numTerms, plannedCourses } = coursePlanData.coursePlan;

  return await prisma.$transaction(async (prisma) => {
    const updatedCoursePlan = await prisma.coursePlan.update({
      where: { id },
      data: {
        title,
        numTerms,
      },
    });

    // Delete existing plannedCourses for the coursePlan
    await prisma.plannedCourse.deleteMany({ where: { coursePlanId: id } });

    // Use Promise.all to wait for all plannedCourse creations
    const plannedCourseCreations = plannedCourses.map((plannedCourse: PlannedCourse) =>
      prisma.plannedCourse.create({
        data: {
          term: plannedCourse.term,
          course: {
            connect: {
              id: plannedCourse.course.id,
            },
          },
          coursePlan: {
            connect: {
              id,
            },
          },
        },
      })
    );

    // Await all plannedCourse creations
    await Promise.all(plannedCourseCreations);

    return updatedCoursePlan;
  });
}
