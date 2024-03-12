
import { CoursePlan, PlannedCourse } from "~/interfaces";
import { prisma } from "~/db.server";


export function getCourse(courseId: string) {
  return prisma.course.findUnique({where: {id: courseId}});
}


// export function extractCourseValues(node: any) {
//   let courseCodes:String[] = [];
//   if (node.type === "LEAF" && node.subtype === "COURSE") {
//       return [node.value];
//   }
//   if (node.childNodes && node.childNodes.length > 0) {
//       node.childNodes.forEach((child: any) => {
//         courseCodes = courseCodes.concat(extractCourseValues(child));
//       });
//   }   
//   return courseCodes;
// }

// export function plannedCoursesFromCodes(courseCodes: String[], coursePlan: CoursePlan) {
//   let planned: PlannedCourse[] = []
//   courseCodes.map(async (courseCode) => {
//     const course = await prisma.course.findFirst({where: {code: courseCode as string}});
//     if (course) {
//       const plannedCourse = await prisma.plannedCourse.findFirst({
//         where: {
//           courseId: course.id, 
//           coursePlanId: coursePlan.id
//         },
//         include:{
//           course: true
//         }
//       }
//       );
//       if (plannedCourse) {
//         planned.push(plannedCourse);
//       }
//     }
//   });
//   return planned;
// }