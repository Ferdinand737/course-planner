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
  } from '@prisma/client';

export { PrismaElectiveType as ElectiveType };
export { PrismaDegreeType as DegreeType };
export { PrismaSpecializationType as SpecializationType };
export { PrismaRequirementType as RequirementType };
export { PrismaFaculty as Faculty };
  
export interface Course extends PrismaCourse {
    plannedCourses: PlannedCourse[];
    alternativeCourses: PlannedCourse[];
    equivalentCourses: Course[];
    equivalentTo: Course[];
    coRequisiteCourses: Course[];
    coRequisiteOf: Course[];
    excludedCourses: Course[];
    excludedBy: Course[];
    requirements: Requirement[];
    preRequisites:{ type: string; subtype: string; value: any; childNodes: any[]; }
}
  
export interface CoursePlan extends PrismaCoursePlan {
    degree: Degree;
    user: User;
    plannedCourses: PlannedCourse[];
}

export interface PlannedCourse extends PrismaPlannedCourse {
    course: Course;
    alternativeCourses: Course[];
    coursePlan: CoursePlan;
}

export interface Degree extends PrismaDegree {
    specializations: Specialization[];
    CoursePlan: CoursePlan[];
}

export interface Specialization extends PrismaSpecialization {
    requirements: Requirement[];
    degree: Degree[];
}

export interface Requirement extends PrismaRequirement {
    electiveCourse?: Course;
    alternatives: Course[];
    specialization?: Specialization;
}

export interface User extends PrismaUser {
password?: Password;
coursePlans: CoursePlan[];
}

export interface Password extends PrismaPassword {
user: User;
}