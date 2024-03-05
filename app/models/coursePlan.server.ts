
import { CoursePlan, DegreeType, ElectiveType, Requirement, Specialization, Course, PlannedCourse } from "../interfaces";
import { prisma } from "~/db.server";

export async function getUserCoursePlans(userId: string) {
  return await prisma.coursePlan.findMany({where: {userId}, orderBy: {createdAt: "desc"}});
}

export async function getCoursePlan(planId: string) {
  return await prisma.coursePlan.findUnique({
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

export async function setCoursePlan(coursePlanData: any) {
  const { id, title, numTerms, plannedCourses } = coursePlanData.coursePlan;

  return await prisma.$transaction(async (prisma) => {
    const existingPlannedCourses = await prisma.plannedCourse.findMany({ 
      where: { coursePlanId: id },
      include: {
        course: true,
        alternativeCourses: true,
      },

    });

    const existingPlannedCoursesMap = new Map(existingPlannedCourses.map(pc => [pc.id, pc]));
    const incomingPlannedCoursesMap = new Map(plannedCourses.map((pc: PlannedCourse) => [pc.id, pc]));

    const updates = plannedCourses
      .filter((pc:PlannedCourse ) => existingPlannedCoursesMap.has(pc.id)) // Filter for existing plannedCourses
      .map((pc: PlannedCourse) => prisma.plannedCourse.update({
        where: { id: pc.id },
        data: {
          term: pc.term,
          course: {
            connect: { id: pc.course.id}
          },
          alternativeCourses:{
            connect: pc.alternativeCourses?.map((alt: Course) => ({id: alt.id}))
          }
        },
      }));
    
    // // Delete plannedCourses that no longer exist in the incoming data
    // const deletions = existingPlannedCourses
    //   .filter(pc => !incomingPlannedCoursesMap.has(pc.id)) // Filter for non-existing in incoming data
    //   .map(pc => prisma.plannedCourse.delete({
    //     where: { id: pc.id },
    //   }));

    // // Add new plannedCourses (those in incoming data but not in existing data)
    // const additions = plannedCourses
    //   .filter(pc => !existingPlannedCoursesMap.has(pc.id)) // Filter for new plannedCourses
    //   .map(pc => prisma.plannedCourse.create({
    //     data: {
    //       term: pc.term,
    //       coursePlan: {
    //         connect: { id },
    //       },
    //       course: {
    //         connect: { id: pc.courseId },
    //       },
    //       alternativeCourses:{
    //         connect: pc.alternativeCourses.map((alt: Course) => ({id: alt.id}))
    //       }
    //     },
    //   }));

    // Execute updates, additions, and deletions
    await Promise.all([...updates]);
    
    // Update CoursePlan metadata like title and numTerms
    const updatedCoursePlan = await prisma.coursePlan.update({
      where: { id },
      data: {
        title,
        numTerms,
      },
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

    return updatedCoursePlan;
  });
}

export async function createCoursePlan(planName: string, specializations: Specialization[], userId: string) {
  
  const degree = await prisma.degree.create({
    data: {
      degreeType: DegreeType.BSc,
      specializations: {
        connect: specializations.map(specialization => ({ id: specialization.id }))
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
  
  for (const specialization of specializations){

    const requirements = (specialization as Specialization & { requirements: Requirement[] })?.requirements;

    for (const requirement of requirements) {
      const credits = requirement.credits;
      const alternatives = (requirement as Requirement & { alternatives: Course[] }).alternatives;
      const electiveCourse = (requirement as Requirement & { electiveCourse: Course }).electiveCourse;

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

            await prisma.plannedCourse.create({
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
                alternativeCourses: {
                  connect: alternatives.map(alt => ({ id: alt.id }))
                }
              },
            });
          }
        }else if(electiveCourse){

          let electiveTypeStr = electiveCourse.code
          if(electiveTypeStr.includes("CHOICE")){
            electiveTypeStr = ElectiveType.CHOICE
          }else{
            electiveTypeStr = ElectiveType.ELEC
          }
          
          let elecCredits = 0;

          while(elecCredits < credits){
            let year = requirement.year < 0 ? Math.floor(Math.random() * (3)) + 2 : requirement.year;
            const baseTermNumber = (year - 1) * 4;
            let term = baseTermNumber + 1; 
            
  
            await prisma.plannedCourse.create({
              data: {
                term,
                electiveType: electiveTypeStr as ElectiveType,
                isElective: true,
                course: {
                  connect: {
                    id: electiveCourse.id,
                  },
                },
                coursePlan: {
                  connect: {
                    id: coursePlan.id,
                  },
                },
                alternativeCourses: {
                  connect: alternatives.map(alt => ({ id: alt.id }))
                }
              },
            });
            elecCredits += electiveCourse.credits || 0;
          }
        }
      }
    }
  }
  
}

export async function getAlternatives(plannedCourseId: string, searchTerm: string) {
  const plannedCourse = await prisma.plannedCourse.findUnique({
    where: { id: plannedCourseId },
    include: {
      alternativeCourses: true,
    },
  });
  const alternatives = await prisma.course.findMany({
    where: {
      OR: [
        { code: { contains: searchTerm, mode: "insensitive" } },
        { name: { contains: searchTerm, mode: "insensitive" } },
      ],
      AND: {isElectivePlacholder: false},
      id: {
        in: plannedCourse?.alternativeCourses.map((course) => course.id),
      },
    },
  });

  const sortedAlternatives = alternatives.sort((a, b) => {
    const aCodeMatch = a.code.toLowerCase().includes(searchTerm.toLowerCase());
    const bCodeMatch = b.code.toLowerCase().includes(searchTerm.toLowerCase());
    if (aCodeMatch === bCodeMatch) return 0;
    if (aCodeMatch && !bCodeMatch) return -1;
    return 1;
  });

  return sortedAlternatives;
}

