
import { DegreeType, ElectiveType, Requirement, Specialization, Course, PlannedCourse } from "../interfaces";
import { prisma } from "~/db.server";
import { getAlternativesForRequirement, getCourseByCode } from "./course.server";
import { al } from "vitest/dist/reporters-5f784f42";

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

export async function createCoursePlan(planName: string, major: Specialization, minor: Specialization|undefined, userId: string) {

  const specializations = [major];

  if(minor){
    specializations.push(minor);
  }

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
  
  const requirements = (major as Specialization & { requirements: Requirement[] })?.requirements;

  for (const requirement of requirements) {
    const credits = requirement.credits;
    const alternatives = await getAlternativesForRequirement(requirement.alternativeQuery);

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
              requirement: {
                connect: {
                  id: requirement.id,
                },
              },
            },
          });
        }
      }else{

        let electiveCourse = await getCourseByCode(requirement.alternativeQuery);
        let electiveTypeStr = ElectiveType.ELEC.valueOf();
        if(!electiveCourse){
          electiveCourse = await getCourseByCode("CHOICE")
          electiveTypeStr = ElectiveType.CHOICE.valueOf();
        }

        if(electiveCourse){
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
                requirement: {
                  connect: {
                    id: requirement.id,
                  },
                },
              },
            });
            elecCredits += electiveCourse.credits || 0;
          }
        }
      }
    }
  }

  if(minor){
    // TODO: Implement minor requirements
    // Minor requirements need to be alternatives for the majors electives

    const majorPlannedCourses = await prisma.plannedCourse.findMany({
      where:{
        coursePlanId: coursePlan.id,
      },
      include:{
        requirement: true,
        course: true,
      }
    }) as PlannedCourse[];

    const majorPlannedCourseElectivesAndChoices = majorPlannedCourses.filter(pc => pc.isElective);

    const allCoursesInMajor = majorPlannedCourses.map(pc => pc.course);// Currently selected courses in major

    const majorPlannedCourseChoices = majorPlannedCourseElectivesAndChoices.filter(pc => pc.electiveType === ElectiveType.CHOICE);

    const majorPlannedCourseElectives = majorPlannedCourseElectivesAndChoices.filter(pc => pc.electiveType === ElectiveType.ELEC);

    const allCourseChoicesInMajor = await Promise.all(majorPlannedCourseChoices.map(async (pc) => {
      if(pc.electiveType === ElectiveType.CHOICE){
        return await getAlternatives(pc.id, '');
      }
    })).then(result => result.flat().filter(course => course !== undefined));

    const allCoursesInMajorIds = allCoursesInMajor.map(c => c?.id);

    const allCourseChoicesInMajorIds = allCourseChoicesInMajor.map(c => c?.id);

    const minorRequirements = (minor as Specialization & { requirements: Requirement[] }).requirements;

    for (const requirement of minorRequirements){
      const credits = requirement.credits;
      const alternatives = await getAlternativesForRequirement(requirement.alternativeQuery);

      let creditsInAlternatives = alternatives.reduce((accumulator, alternative) => accumulator + alternative.credits, 0);

      // If all courses in the alternatives are required
      if (creditsInAlternatives == credits){

        for (const alternative of alternatives) {

          if(allCoursesInMajorIds.includes(alternative.id)){
            // Do not add course that is already in plan from major
            continue;
          }
          
          let chosenPlannedCourse: PlannedCourse | undefined;
          // Check if the course is in the list of choices
          if (allCourseChoicesInMajorIds.includes(alternative.id)) {
            chosenPlannedCourse = majorPlannedCourseChoices.find(async (pc) => {
              const alternatives = await getAlternatives(pc.id, '');
              if (alternatives) {
                return alternatives.map((alt) => alt.id).includes(alternative.id);
              }
            });
          }
          
          // Find the smallest list of alternatives that contains the course among majorPlannedCourseElectives
          let shortestListLength = Infinity;
          for (const majorPlannedCourse of majorPlannedCourseElectives){
            const alternativeCourses = await getAlternatives(majorPlannedCourse.id,'');
            if(alternativeCourses){
              const alternativeCoursesIds = alternativeCourses.map(alt => alt.id);
              if(alternativeCoursesIds.includes(alternative.id)){
                if(alternativeCourses.length < shortestListLength){
                  chosenPlannedCourse = majorPlannedCourse;
                  shortestListLength = alternativeCourses.length;
                }
              }
            }
          }
          
          // Update the chosen plannedCourse in the database
          // Replace elective course with minor requirement
          if(chosenPlannedCourse){
            console.log(`Replacing ${chosenPlannedCourse.course?.code} with ${alternative.code}`)
            await prisma.plannedCourse.update({
              where: { id: chosenPlannedCourse.id },
              data: {
                course: {
                  connect: {
                    id: alternative.id,
                  },
                },
                requirement: {
                  connect: {
                    id: requirement.id,// update requirement to minor requirement
                  },
                },
                isElective: false,
                electiveType: undefined,
              },
            });
          }
        }
       
      }else{
        let electiveCourse = await getCourseByCode(requirement.alternativeQuery);
        let electiveTypeStr = ElectiveType.ELEC.valueOf();
        if(!electiveCourse){
          electiveCourse = await getCourseByCode("CHOICE")
          electiveTypeStr = ElectiveType.CHOICE.valueOf();
        }

        if(electiveCourse){
          let elecCredits = 0;

          const alreadyUpdatedPlannedCourses: string[] = []
  
          while(elecCredits < credits){
            
            // Find the smallest list of planned course alternatives that contains all alternatives from minor elective query
            let shortestListLength = Infinity;
            let chosenPlannedCourse: PlannedCourse | undefined;

            for (const majorPlannedCourse of majorPlannedCourseElectives){
              if (!alreadyUpdatedPlannedCourses.includes(majorPlannedCourse.id)){
                const alternativeCourses = await getAlternatives(majorPlannedCourse.id,'');
                if(alternativeCourses){
                  const requirementAlternativesIds = alternatives.map(alt => alt.id);
                  const alternativeCoursesIds = alternativeCourses.map(alt => alt.id);
                  if(requirementAlternativesIds.every(id => alternativeCoursesIds.includes(id))){
                    if(alternativeCourses.length < shortestListLength){
                      chosenPlannedCourse = majorPlannedCourse;
                      shortestListLength = alternativeCourses.length;
                    }
                  }
                }
              }
            }

            // Update the chosen plannedCourse in the database
            // Replace elective course with minor requirement
            if(chosenPlannedCourse){
              console.log(`Replacing ${chosenPlannedCourse.course?.code} with ${electiveCourse.code}`)
              console.log(`Updating planned course ${chosenPlannedCourse.id}`)
              await prisma.plannedCourse.update({
                where: { id: chosenPlannedCourse.id },
                data: {
                  course: {
                    connect: {
                      id: electiveCourse.id,
                    },
                  },
                  requirement: {
                    connect: {
                      id: requirement.id,// update requirement to minor requirement
                    },
                  },
                  isElective: true,
                  electiveType: electiveTypeStr as ElectiveType,
                },
              });
              alreadyUpdatedPlannedCourses.push(chosenPlannedCourse.id);
            }
            elecCredits += electiveCourse.credits || 0;
          }
        }
      }
    }
  }
  return coursePlan;
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
      requirement: true,
    },
  });
  if (plannedCourse){
    const alternatives = await getAlternativesForRequirement(plannedCourse.requirement.alternativeQuery);
    return alternatives.filter(
      alt => !alt.isElectivePlaceholder && (
        alt.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        alt.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
  }
}

export async function getElectivePlaceholder(plannedCourseId: string) {
  const plannedCourse = await prisma.plannedCourse.findUnique({
    where: { id: plannedCourseId },
    include: {
      requirement: true,
    },
  });
  if (plannedCourse){
    const elec = await getCourseByCode(plannedCourse.requirement.alternativeQuery);
    if(!elec){
      return await getCourseByCode("CHOICE");
    }
    return elec;
  }
}

