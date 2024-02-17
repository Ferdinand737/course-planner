
import { Course, CoursePlan, DegreeType, PlannedCourse, Requirement, Specialization } from "@prisma/client";
import e from "express";
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
      if (requirement.alternatives?.length > 0) {
        let creditsInAlternatives = requirement.alternatives?.reduce((accumulator, alternative) => accumulator + alternative.credits, 0);
        if (creditsInAlternatives == credits){
          for (const alternative of requirement.alternatives) {
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
    let plannedCoursePreReqs = plannedCoursesFromCodes(extractCourseValues(plannedCourse.course.preRequisites), coursePlan);
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

function extractCourseValues(node: any) {
  let courseCodes:String[] = [];
  if (node.type === "LEAF" && node.subtype === "COURSE") {
      return [node.value];
  }
  if (node.childNodes && node.childNodes.length > 0) {
      node.childNodes.forEach((child: any) => {
        courseCodes = courseCodes.concat(extractCourseValues(child));
      });
  }   
  return courseCodes;
}

function plannedCoursesFromCodes(courseCodes: String[], coursePlan: CoursePlan) {
  let planned: PlannedCourse[] = []
  courseCodes.map(async (courseCode) => {
    const course = await prisma.course.findFirst({where: {code: courseCode}});
    if (course) {
      const plannedCourse = await prisma.plannedCourse.findFirst({where: {courseId: course.id, coursePlanId: coursePlan.id}});
      if (plannedCourse) {
        planned.push(plannedCourse);
      }
    }
  });
  return planned;
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
