
import { Course, CoursePlan, DegreeType, PlannedCourse, Specialization } from "@prisma/client";
import { prisma } from "~/db.server";



export function getUserCoursePlans(userId: string) {
  return prisma.coursePlan.findMany({where: {userId}});
}

export function getCoursePlan(planId: string) {
  return prisma.coursePlan.findUnique({
    where: { id: planId },
    include: {
      degree: {
        include: {
          specializations: true,
        },
      },
      plannedCourses: {
        include: {
          course: {
            include: {
              equivalentCourses: true,
              excludedCourses: true,
            },
          },
        },
      },
    },
  });
}


export async function createCoursePlan(planName: string, major: Specialization, minor: Specialization, userId: string) {
  const degree = await prisma.degree.create({
    data: {
      degreeType: DegreeType.BSc,
      specializations: {
        connect: [
          { id: major.id },
          { id: minor.id },
        ],
      },
    },
  });

  const coursePlan = await prisma.coursePlan.create({
    data: {
      title: planName,
      numTerms: 16,
      user: {
        connect: {
          id: userId,
        },
      },
      degree: {
        connect: {
          id: degree?.id,
        },
      },
    },
  });

  for (const specialization of [major, minor]){

    for (const requirement of specialization?.requirements ?? []) {
      if (requirement.alternatives.length > 0) {
        const numCourses = requirement.credits / 3;
        const randomAlternatives = [...requirement.alternatives].sort(() => 0.5 - Math.random()).slice(0, numCourses) as Course[];
        await Promise.all(randomAlternatives.map(async (course) => {
          const baseTermNumber = (requirement.year - 1) * 4;
          let term;
          
          if (course.winterTerm1) {
            term = baseTermNumber + 1;
          } else if (course.winterTerm2) {
            term = baseTermNumber + 2;
          } else if (course.summerTerm1) {
            term = baseTermNumber + 3;
          } else if (course.summerTerm2) {
            term = baseTermNumber + 4;
          } else {
            term = baseTermNumber + 1;
          }
  
          await prisma.plannedCourse.create({
            data: {
              term,
              course: {
                connect: {
                  id: course.id
                }
              },
              coursePlan: {
                connect: {
                  id: coursePlan.id
                }
              }
            }
          });
        }))
      }
    }
  }
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
