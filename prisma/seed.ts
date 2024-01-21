import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import csv from "csv-parser";
import fs from "fs";
import path from "path"; // Import the path module

const prisma = new PrismaClient();

async function seed() {

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
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on("data", async (row) => {

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

      await prisma.course.create({
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

    })
    .on("end", async () => {
      const courseCodes = ["COSC499", "COSC304", "COSC111", "COSC310", "MATH100", "COSC341", "COSC222", "MATH101"];

      const courses = await prisma.course.findMany({where: {code: {in: courseCodes}}});

      await prisma.coursePlan.create({
        data: {
          title: "Computer Science",
          user: {
            connect: {
              id: user.id,
            },
          },
          courses: {
            connect: courses.map(course => ({ id: course.id })),
          },
        },
      });
    });
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
