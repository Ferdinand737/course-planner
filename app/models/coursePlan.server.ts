
import { DegreeType, PlannedCourse, Requirement, Specialization } from "@prisma/client";
import { prisma } from "~/db.server";
import { extractCourseValues, plannedCoursesFromCodes } from "./course.server";



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


export async function createCoursePlan(planName: string, major: Specialization & { requirements: Requirement[] }, minor: Specialization & { requirements: Requirement[] }, userId: string) {
  
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
  
  let plannedCourses: PlannedCourse[] = [];

  for (const specialization of [major, minor]){

    const requirements = specialization?.requirements;


    for (const requirement of requirements) {
      const credits = requirement.credits;
      const alternatives = (requirement as Requirement & { alternatives: Course[] }).alternatives;

      if (alternatives.length > 0) {
        let creditsInAlternatives = alternatives.reduce((accumulator, alternative) => accumulator + alternative.credits, 0);
        if (creditsInAlternatives == credits){
          for (const alternative of alternatives) {
            let year = requirement.year;

            if(requirement.year < 0){
              year = Math.floor(Math.random() * (4 - 2 + 1)) + 2;
            }

            const baseTermNumber = (year - 1) * 4;
            let term;
            
            if (alternative.winterTerm1) {
              term = baseTermNumber + 1;
            } else if (alternative.winterTerm2) {
              term = baseTermNumber + 2;
            } else if (alternative.summerTerm1) {
              term = baseTermNumber + 3;
            } else if (alternative.summerTerm2) {
              term = baseTermNumber + 4;
            } else {
              term = baseTermNumber + 1;
            }


            const plannedCourse = await prisma.plannedCourse.create({
              data: {
                term,
                course: {
                  connect: {
                    id: alternative.id,
                  },
                },
                coursePlan: {
                  connect: {
                    id: coursePlan.id,
                  },
                },
              },
              include:{
                course: true
              }
            });
            plannedCourses.push(plannedCourse);
          }
        }
      }
    }
  }


  for (const plannedCourse of plannedCourses) {
    let thisCourseTerm = plannedCourse.term;
    let plannedCoursePreReqs = plannedCoursesFromCodes(extractCourseValues((plannedCourse as any).course.preRequisites), coursePlan);
    let latestPreReqTerm = Math.max(...plannedCoursePreReqs.map(preReq => preReq.term));
    if (latestPreReqTerm >= thisCourseTerm) {
      let newTerm = latestPreReqTerm + 1; 
      await prisma.plannedCourse.update({
        where: { id: plannedCourse.id },
        data: {
          term: newTerm,
        },
      });
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
              id: plannedCourse.courseId,
            },
          },
          coursePlan: {
            connect: {
              id,
            },
          },
        },
        include:{
          course: true
        }
      })
    );

    // Await all plannedCourse creations
    await Promise.all(plannedCourseCreations);

    return updatedCoursePlan;
  });
}
