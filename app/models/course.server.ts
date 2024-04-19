import { Prisma } from "@prisma/client";
import { prisma } from "~/db.server";
import { Course, Faculty } from "~/interfaces";

export async function getCourse(courseId: string) {
  return await prisma.course.findUnique({where: {id: courseId}});
}

export async function getCourseByCode(courseCode: string) {
  return await prisma.course.findUnique({where: {code: courseCode}});
}

export async function getAlternativesForRequirement(alternativeQuery: string) {
  let alternativeCourses:Course[] = [];

  if (!alternativeQuery.includes("ELEC")) {// Indicates either a single course or a list of courses. eg: "PHYS111;PHYS112"

      const alternatives = alternativeQuery.split(";");
      for (const alternative of alternatives) {

          // Add a space to alternative course because that is how they are saved in the database
          const courseCodeWithSpace = alternative.replace(/([A-Za-z])(\d)/g, '$1 $2');

          // Find the course in the database based on the course code
          const course = await prisma.course.findUnique({
              where: { code: courseCodeWithSpace }
          });

          if (course) {
              // If the course is found, add it to the list of alternative courses
              alternativeCourses.push(course);
          }
      }
      // alternativeCourses will be the list of courses in he 'Alternatives' column in the csv file seperated by ;
      return alternativeCourses;

  } else {
    
      // this converts the string into an array of queries eg: ['UL', 'COSC']
      const queries = alternativeQuery.split("_").filter(q => q !== "" && q !== "ELEC").map(q => q.trim());

      // This gets all the courses in the database 
      let alternativeCourses = await prisma.course.findMany();
      for (const q of queries) {
          let queryResults:Course[] = [];

          // Run a query based on the query string
          if (q === "UL") {
              queryResults = await findUpperLevelCourses();
          } else if (q === "SCI") {
              queryResults = await findScienceCourses();
          } else if (q === "NONSCI") {
              // This needs to be fixed. Not all NONSCI courses are arts courses
              queryResults = await findArtsCourses();
          } else if (q.length === 4) {
              queryResults = await findDiciplineCourses(q);
          } else if (q.length === 1 && /^\d$/.test(q)) {
              queryResults = await findYearCourses(Number(q));
          } else {
              console.log("Unknown query:" + q);
          }
          
          // Only add the courses to the alternatives that are in the query results
          alternativeCourses = alternativeCourses.filter(course => {
              return queryResults.some(queryCourse => {
                  return queryCourse.code === course.code;
              });
          });
      }
      return alternativeCourses;
  }

  async function findUpperLevelCourses(): Promise<Course[]> {
    const query = Prisma.sql`
    SELECT * FROM \`Course\`
    WHERE \`code\` REGEXP ' [3-5]'
    `;
    const courses = await prisma.$queryRaw<Course[]>(query);
    return courses;
  }
  
  async function findYearCourses(year: number): Promise<Course[]> {
    const stryear = ' ' + String(year)
    const query = Prisma.sql`
        SELECT * FROM \`Course\`
        WHERE \`code\` REGEXP ${stryear}
    `;
    const courses = await prisma.$queryRaw<Course[]>(query);
    return courses;
  }
  
  async function findScienceCourses(){
    return await prisma.course.findMany({
        where: { faculty: Faculty.SCI }
    });
  }
  
  async function findArtsCourses(){
    return await prisma.course.findMany({
        where: { faculty: Faculty.ART }
    });
  }
  
  async function findDiciplineCourses(discipline:string){
    return await prisma.course.findMany({
        where: { code: { startsWith: discipline } }
    });
  }
}


