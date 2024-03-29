
import { DegreeType, ElectiveType, Requirement, Specialization, Course, PlannedCourse } from "../interfaces";
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
            connect: { id: pc.course?.id}
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

  // Create a new degree with desired major/minor combination
  const degree = await prisma.degree.create({
    data: {
      degreeType: DegreeType.BSc,
      specializations: {
        connect: specializations.map(specialization => ({ id: specialization.id }))
      },
    },
  });

  // Create a new course plan with the desired degree
  const coursePlan = await prisma.coursePlan.create({
    data: {
      title: planName,
      numTerms: 16,// Default to 4 years
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

        // Find the total credits in the alternatives, this number could be very large if this requirement is a general 'ELEC'
        let creditsInAlternatives = alternatives.reduce((accumulator, alternative) => accumulator + alternative.credits, 0);

        /* The below if staments only executes when all courses in the 'Alternatives' column are required. 
          For example in 'BSc-MATH-Major.csv': 'Alternatives'=MATH100;MATH101 and credits=6
          So all courses in the alternatives are required to be taken to satisfy the requirement
        */
        if (creditsInAlternatives == credits){

          for (const alternative of alternatives) {
 
            const term = getRandomTerm(requirement, alternative);

            // Create the planned course in the database
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
              },
            });
          }
        }else if(electiveCourse){

          // Find the elective type based on elective course code
          // This could be done in a better way
          let electiveTypeStr = electiveCourse.code
          if(electiveTypeStr.includes("CHOICE")){
            electiveTypeStr = ElectiveType.CHOICE
          }else{
            electiveTypeStr = ElectiveType.ELEC
          }

          // remove all elecive placholer courses from the alternatives
          const thisCourseAlternative = alternatives.filter(alt => !alt.isElectivePlaceholder);

          // add the elective course to the alternatives so that there is only on elective placholder in the alternatives
          thisCourseAlternative.push(electiveCourse);
          
          let elecCredits = 0;

          while(elecCredits < credits){
           
            const term = getRandomTerm(requirement, electiveCourse);
  
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
                  connect: thisCourseAlternative.map(alt => ({ id: alt.id }))
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

function getRandomTerm(requirement:Requirement, alternative:Course){
  // if year is negative, choose a random year between 2 and 4
  let year = requirement.year < 0 ? Math.floor(Math.random() * (3)) + 2 : requirement.year;
  const baseTermNumber = (year - 1) * 4;
            
  let availableTerms = [];
  if (alternative.winterTerm1) {
    availableTerms.push(baseTermNumber + 1);
  } 
  if (alternative.winterTerm2) {
    availableTerms.push(baseTermNumber + 2);
  }
  if (alternative.summerTerm1) {
    availableTerms.push(baseTermNumber + 3);
  }
  if (alternative.summerTerm2) {
    availableTerms.push(baseTermNumber + 4);
  }
  
  // If no terms were selected, default to the first term
  if (availableTerms.length === 0) {
    availableTerms.push(baseTermNumber + 1);
  }
  
  // choose a random term from the available terms
  return availableTerms[Math.floor(Math.random() * availableTerms.length)];
}

export async function getAlternatives(plannedCourseId: string, searchTerm: string) {
  const plannedCourse = await prisma.plannedCourse.findUnique({
    where: { id: plannedCourseId },
    include: {
      alternativeCourses: true,
    },
  });
  return plannedCourse?.alternativeCourses.filter(alt => !alt.isElectivePlaceholder && (alt.code.includes(searchTerm) || alt.name.includes(searchTerm)));
}

export async function getElectivePlaceholder(plannedCourseId: string) {
  const plannedCourse = await prisma.plannedCourse.findUnique({
    where: { id: plannedCourseId },
    include: {
      alternativeCourses: true,
    },
  });
  return plannedCourse?.alternativeCourses.find(alt => alt.isElectivePlaceholder);
}

