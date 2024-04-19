import {
    ElectiveType as PrismaElectiveType,
    DegreeType as PrismaDegreeType,
    SpecializationType as PrismaSpecializationType,
    RequirementType as PrismaRequirementType,
    Faculty as PrismaFaculty,
    Course as PrismaCourse,
    CoursePlan as PrismaCoursePlan,
    PlannedCourse as PrismaPlannedCourse,
    Degree as PrismaDegree,
    Specialization as PrismaSpecialization,
    Requirement as PrismaRequirement,
    User as PrismaUser,
    Password as PrismaPassword,
    IngestedFile as PrismaIngestedFile,
    Prisma,
  } from '@prisma/client';

export { PrismaElectiveType as ElectiveType };
export { PrismaDegreeType as DegreeType };
export { PrismaSpecializationType as SpecializationType };
export { PrismaRequirementType as RequirementType };
export { PrismaFaculty as Faculty };
export type { PrismaIngestedFile as IngestedFile };
  
export interface Course extends PrismaCourse {
    plannedCourses?: PlannedCourse[];
    equivalentCourses?: Course[];
    equivalentTo?: Course[];
    coRequisiteCourses?: Course[];
    coRequisiteOf?: Course[];
    excludedCourses?: Course[];
    excludedBy?: Course[];
    preRequisites:{ type: string; subtype: string; value: any; childNodes: any[]; } | null | Prisma.JsonValue;
}
  
export interface CoursePlan extends PrismaCoursePlan {
    degree?: Degree | null;
    user?: User | null;
    plannedCourses?: PlannedCourse[] | null;
}

export interface PlannedCourse extends PrismaPlannedCourse {
    course?: Course | null;
    requirement?: Requirement | null;
    coursePlan?: CoursePlan | null;
}

export interface Degree extends PrismaDegree {
    specializations?: Specialization[] | null;
    CoursePlan?: CoursePlan[] | null;
}

export interface Specialization extends PrismaSpecialization {
    requirements?: Requirement[] | null;
    degree?: Degree[] | null;
}

export interface Requirement extends PrismaRequirement {
    electiveCourse?: Course | null;
    specialization?: Specialization| null;
    plannedCourses?: PlannedCourse[] | null;
}

export interface User extends PrismaUser {
    password?: Password | null;
    coursePlans?: CoursePlan[] | null;
}

export interface Password extends PrismaPassword {
    user?: User | null;
}