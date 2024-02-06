import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import csv from "csv-parser";
import fs from "fs";
import path from "path"; 
import { HelperCourse } from './seedHelper';

const prisma = new PrismaClient();

async function readCSV(csvPath: string): Promise<HelperCourse[]> {
  return new Promise((resolve, reject) => {
    let operations: any[] = []
    let helperCourses: HelperCourse[] = []
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        const operation = async () => {
          const helperCourse = new HelperCourse(row);
          helperCourses.push(helperCourse)

          await prisma.course.create({
            data: {
              code: helperCourse.code,
              name: helperCourse.name,
              description: helperCourse.description,
              credits: helperCourse.credits,
              isHonours: helperCourse.isHonours,
              durationTerms: helperCourse.durationTerms,
              winterTerm1: helperCourse.winterTerm1,
              winterTerm2: helperCourse.winterTerm2,
              summerTerm1: helperCourse.summerTerm1,
              summerTerm2: helperCourse.summerTerm2,
              preRequisites: helperCourse.pre_req_json as any,
            },
          });
        }
        operations.push(operation())
      })
      .on("end", () => {
        Promise.all(operations).then(() => {
          resolve(helperCourses);
        }).catch(reject);
      })
      .on("error", reject);
  });
}

async function seed() {

  await prisma.plannedCourse.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.password.deleteMany({});
  await prisma.coursePlan.deleteMany({});


  const email = "rachel@remix.run";
  const hashedPassword = await bcrypt.hash("racheliscool", 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });

  const csvPath = path.resolve(__dirname, "../data-aquisition/courses.csv");

  let helperCourses = await readCSV(csvPath)


  helperCourses.forEach(async (helperCourse: HelperCourse) => {
    const course = await prisma.course.findFirst({where: {code: { equals: helperCourse.code }}});
    const equivalentCourses = await prisma.course.findMany({where: {code: {in: helperCourse.equ_arr}}});
    const coReqCourses = await prisma.course.findMany({where: {code: {in: helperCourse.co_req_arr}}});
    
    await prisma.course.update({
      where: { id: course?.id },
      data: {
        equivalentCourses: {
          connect: equivalentCourses.map(course => ({ id: course.id }))
        },
        coRequisiteCourses: {
          connect: coReqCourses.map(course => ({ id: course.id }))
        }
      }
    });
  })


  const sampleCourses = await prisma.course.findMany({
    where: {
        code: {
            contains: "COSC",
        },
    },
    take: 30,
  });

  const coursePlan = await prisma.coursePlan.create({
    data: {
      title: "Computer Science",
      user: {
        connect: {
          id: user.id,
        },
      },
    },
  });

  const plannedCourses = await Promise.all(sampleCourses.map((course, index) => {
    let term = 1


    if ( course.code.includes("C 1")){
      term = Math.floor(Math.random()*4)+1
    } else if ( course.code.includes("C 2")){
      term = Math.floor(Math.random()*4)+5
    } else if ( course.code.includes("C 3")){
      term = Math.floor(Math.random()*4)+9
    }else if ( course.code.includes("C 4")){
      term = Math.floor(Math.random()*4)+13
    }else if ( course.code.includes("C 5")){
      term = Math.floor(Math.random()*4)+13
    }

    return prisma.plannedCourse.create({
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
  }));
  
  await prisma.coursePlan.update({
    where: { id: coursePlan.id },
    data: {
      numTerms: 16,
      plannedCourses: {
        connect: plannedCourses.map(plannedCourse => ({ id: plannedCourse.id })),
      },
    },
  });
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
