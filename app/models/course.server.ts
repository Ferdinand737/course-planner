
import { prisma } from "~/db.server";


export function getCourse(courseId: string) {
  return prisma.course.findUnique({where: {id: courseId}});
}