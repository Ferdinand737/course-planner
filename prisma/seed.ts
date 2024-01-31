import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import csv from "csv-parser";
import e from "express";
import fs from "fs";
import path from "path"; // Import the path module

const prisma = new PrismaClient();

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

  const csvPath = path.resolve(__dirname, "./data/allcourses.csv");
  let equivalencies: { course: string; equivalencies: string[]; }[] = []
  let exclusions: { course: string; exclusions: string[]; }[] = []

  let operations: any[] = []
  
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on("data", async (row) => {
      const operation = async () => {
        const preReqs = [row.Prereq1, row.Prereq2, row.Prereq3, row.Prereq4].filter((preReq) => preReq);

        const preRequisites = {
          and: preReqs.map(preReq => ({
            or: preReq.split(";").map((p: string | any[]) => {
              if (p.length === 1) {
                return { 
                  type: "year",
                  value: p
                }
              } else {
                return { 
                  type: "course", 
                  value: p 
                }
              }
            })
          }))
        }
          
        const availability = row.Availability
        const winterTerm1 = availability.split(";")[0] === "1" ? true : false
        const winterTerm2 = availability.split(";")[1] === "1" ? true : false
        const summerTerm1 = availability.split(";")[2] === "1" ? true : false
        const summerTerm2 = availability.split(";")[3] === "1" ? true : false
  
        const course = await prisma.course.create({
          data: {
            code: row.Code,
            name: row.Name,
            description: row.Description,
            winterTerm1,
            winterTerm2,
            summerTerm1,
            summerTerm2,
            credits: Number(row.Credits),
            isHonours: row["Is Honours"] === "1" ? true : false,
            preRequisites
          },
        });
  
        equivalencies.push(
          {
            course: course.id,
            equivalencies: row.Equivalences.split(";")
          }
        );
        exclusions.push(
          {
            course: course.id,
            exclusions: row.Exclusion.split(";")
          }
        );
      }
      operations.push(operation())
      
    }).on("end", async () => {
      await Promise.all(operations)
      
      equivalencies.forEach(async (equivalency) => {
        const course = await prisma.course.findUnique({where: {id: equivalency.course}});
        const equivalentCourses = await prisma.course.findMany({where: {code: {in: equivalency.equivalencies}}});
        await prisma.course.update({
          where: { id: course?.id },
          data: {
            equivalentCourses: {
              connect: equivalentCourses.map(course => ({ id: course.id }))
            }
          }
        });
      })
  
      exclusions.forEach(async (exclusion) => {
        const course = await prisma.course.findUnique({where: {id: exclusion.course}});
        const excludedCourses = await prisma.course.findMany({where: {code: {in: exclusion.exclusions}}});
        await prisma.course.update({
          where: { id: course?.id },
          data: {
            excludedCourses: {
              connect: excludedCourses.map(course => ({ id: course.id }))
            }
          }
        });
      })


      const courseCodes = ["COSC499", "COSC304", "COSC111", "COSC310", "MATH100", "COSC341", "COSC222", "MATH101"];
      
      const courses = await prisma.course.findMany({where: {code: {in: courseCodes}}});
    
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
    
      const plannedCourses = await Promise.all(courses.map((course, index) => {
        const term = Math.floor(Math.random() * coursePlan.numTerms) + 1;
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
          plannedCourses: {
            connect: plannedCourses.map(plannedCourse => ({ id: plannedCourse.id })),
          },
        },
      });
      
    })
  
    console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
