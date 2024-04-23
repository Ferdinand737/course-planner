
import { DegreeType, ElectiveType, Requirement, Specialization, Course, PlannedCourse } from "../interfaces";
import { prisma } from "~/db.server";
import { getAlternativesForRequirement, getCourseByCode } from "./course.server";
import { N, al } from "vitest/dist/reporters-5f784f42";
import { $Enums, Prisma } from "@prisma/client";

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


          // Create the planned course in the database
          await prisma.plannedCourse.create({
            data: {
              term: 0,// term is calculated at the end
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
            
            if (electiveTypeStr === ElectiveType.CHOICE.valueOf()) {
              const otherOptions = await getAlternativesForRequirement(requirement.alternativeQuery);
              for (const alt of otherOptions){
                const courseInPlan = await prisma.plannedCourse.findFirst({
                  where:{
                    coursePlanId: coursePlan.id,
                    courseId: alt.id,
                  }
                });
                if(!courseInPlan){
                  electiveCourse = alt;
                  break;
                }
              }
            }
  
            await prisma.plannedCourse.create({
              data: {
                term: 0,// term is calculated at the end
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

            if (electiveTypeStr === ElectiveType.CHOICE.valueOf()) {
              const otherOptions = await getAlternativesForRequirement(requirement.alternativeQuery);
              for (const alt of otherOptions){
                const courseInPlan = await prisma.plannedCourse.findFirst({
                  where:{
                    coursePlanId: coursePlan.id,
                    courseId: alt.id,
                  }
                });
                if(!courseInPlan){
                  electiveCourse = alt;
                  break;
                }
              }
            }

            // Update the chosen plannedCourse in the database
            // Replace elective course with minor requirement
            if(chosenPlannedCourse){
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

  const plannedCourses = await prisma.plannedCourse.findMany({
    where: { coursePlanId: coursePlan.id },
    include: {
      course: true,
      requirement: true,
      },
    },
  );

  const graph = await buildGraph(plannedCourses);

  await assignTerms(graph, plannedCourses);

  return await getCoursePlan(coursePlan.id);
}

async function assignTerms(graph:Map<PlannedCourse, PlannedCourse[]>, plannedCourses:PlannedCourse[], maxTermIdx = 15) {
  const TERMS_PER_YEAR = 4;
  const MAX_COURSES_PER_TERM = 5;

  // Helper function to calculate the base term for a year
  function baseTermForYear(year: number) {
    if(year < 0){
      return 0;
    }
    return (year - 1) * TERMS_PER_YEAR;
  }

  // Increment the term to the next available term that respects the constraints
  function incrementTerm(term: number) {
    do {
      term++;
    } while (term % TERMS_PER_YEAR > 1);  // Only terms 0, 1, 4, 5, ..., (winter terms) are allowed 
    return term;
  }

  // Find the next available term for a course
  function findNextAvailableTerm(startTerm: number, currentTerms: Map<number,PlannedCourse[]>, afterTerm = 0) {
    startTerm = Math.max(startTerm, afterTerm);
    while ((currentTerms.get(startTerm) ?? []).length >= MAX_COURSES_PER_TERM || startTerm % TERMS_PER_YEAR > 1) {
      startTerm = incrementTerm(startTerm);
    }
    return Math.min(startTerm, maxTermIdx);// maxTermIdx=15 is the last term in a 4 year plan
  }

  const terms = new Map<number, PlannedCourse[]>();
  const courseToTerm = new Map(); // Mapping to keep track of each course's current term

  // Helper function to move a course to a new term
  async function moveCourseToNewTerm(course: PlannedCourse, currentTerm: number, targetTerm: number) {
    (terms.get(currentTerm) ?? []).splice((terms.get(currentTerm) ?? []).indexOf(course), 1); // Remove course from current term
    if (!terms.has(targetTerm)) {
      terms.set(targetTerm, []); // Initialize array if new term doesn't exist
    }
    terms.get(targetTerm)?.push(course); // Fix: Add nullish coalescing operator
    courseToTerm.set(course, targetTerm); // Update our course-to-term mapping

    // Update the course with the new term in the database
    await prisma.plannedCourse.update({
      where: { id: course.id },
      data: { term: targetTerm },
    });
  }

  for (const plannedCourse of plannedCourses) {
    let term = plannedCourse.requirement 
      ? baseTermForYear(plannedCourse.requirement.year) 
      : 0;

    const parentTerm = [...graph.entries()]
      .filter(([, children]) => children.includes(plannedCourse))
      .map(([parent,]) => courseToTerm.get(parent))[0];
    
    // Ensure the planned course's term is greater than its parent's term, if it has one
    term = findNextAvailableTerm(term, terms, parentTerm === undefined ? 0 : parentTerm + 1);

    // Assign the planned course to the term and update the courseToTerm map
    if (!terms.has(term)) {
      terms.set(term, []);
    }
    terms.get(term)?.push(plannedCourse); // Fix: Add nullish coalescing operator
    courseToTerm.set(plannedCourse, term); // Update our course-to-term mapping

    // Update the term of the parent course in the database
    await prisma.plannedCourse.update({
      where: { id: plannedCourse.id },
      data: { term },
    });
  }

  // Now update children if necessary (This is done after assigning all parents)
  for (const [parent, children] of graph.entries()) {
    const parentTerm = courseToTerm.get(parent);
    for (const child of children) {
      if (parentTerm !== undefined) {
        const childTerm = courseToTerm.get(child);
        if (childTerm <= parentTerm) {
          const newTermForChild = findNextAvailableTerm(childTerm, terms, parentTerm + 1);
          await moveCourseToNewTerm(child, childTerm, newTermForChild);
        }
      }
    }
  }
}

async function buildGraph(plannedCourses: PlannedCourse[]) {
  const graph = new Map<PlannedCourse, PlannedCourse[]>();
  for (const plannedCourse of plannedCourses) {
    if (plannedCourse.isElective && plannedCourse.electiveType === ElectiveType.ELEC) {
      continue;
    }
    const course = plannedCourse.course;

    if (course) {
      if (course.preRequisites !== null) {
        const thisCourseParents = await getCoursesFromPrereqs(course.preRequisiteString);
        for (const parentCourse of thisCourseParents) {
          const parentPlannedCourse = plannedCourses.find(pc => pc.course?.code === parentCourse.code);

          if (!parentPlannedCourse) {
            continue;
          }

          if (!graph.has(parentPlannedCourse)) {
            graph.set(parentPlannedCourse, [plannedCourse]);
          } else {
            const existingCourses = graph.get(parentPlannedCourse);
            if (existingCourses) {
              existingCourses.push(plannedCourse);
            }
          }
        }
      }
    }
  }
  return graph;
}

async function getCoursesFromPrereqs(prereqs: string|null) {
  if (!prereqs) {
    return [];
  }

  const codes = prereqs.match(/[A-Z]{4} \d{3}/g)|| [];
  
  const courses = await prisma.course.findMany({
    where: {
      code: {
        in: codes,
      },
    },
  })

  return courses
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

