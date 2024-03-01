export enum DegreeType {
    BSc,
    BA,
  }
  
export  enum SpecializationType {
    MAJOR,
    MINOR,
    HONOURS,
  }
  
export  enum RequirementType {
    AT_LEAST,
  }
  
export  enum Faculty {
    SCI,
    ART,
    OTHER,
  }

export  enum ElectiveType {
    ELEC,
    CHOICE
  }
  
export  interface Degree {
    id: string;
    degreeType: DegreeType;
    specializations: Specialization[];
    coursePlan: CoursePlan[];
  }
  
export  interface Specialization {
    id: string;
    name: string;
    specializationType: SpecializationType;
    discipline: string;
    requirements: Requirement[];
    degree: Degree[];
  }
  
export  interface Requirement {
    id: string;
    constraintType: RequirementType;
    credits: number;
    year: number;
    programSpecific: boolean;
    electiveCourse?: Course;
    alternatives: Course[];
    specialization?: Specialization;
    specializationId?: string;
  }
export  interface User {
    id: string;
    email: string;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
    password?: Password;
    coursePlans: CoursePlan[];
  }
  
export  interface Password {
    hash: string;
    user: User;
    userId: string;
  }
  
export  interface CoursePlan {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    numTerms: number;
    degree: Degree;
    degreeId: string;
    user: User;
    userId: string;
    plannedCourses: PlannedCourse[];
  }
  
export  interface PlannedCourse {
    electiveType: ElectiveType;
    isElective: any;
    id: string;
    term: number;
    course: Course;
    courseId: string;
    coursePlan: CoursePlan;
    coursePlanId: string;
    alternativeCourses: Course[];
  }
  
export  interface Course {
    preRequisiteString: String;
    id: string;
    code: string;
    name: string;
    description?: string;
    winterTerm1: boolean;
    winterTerm2: boolean;
    summerTerm1: boolean;
    summerTerm2: boolean;
    durationTerms: number;
    credits: number;
    isHonours: boolean;
    faculty: Faculty;
    requirements: Requirement[];
    plannedCourses: PlannedCourse[];
    equivalentCourses: Course[];
    equivalentTo: Course[];
    coRequisiteCourses: Course[];
    coRequisiteOf: Course[];
    excludedCourses: Course[];
    excludedBy: Course[];
    preRequisites: any; // JSON type in Prisma, consider using a specific interface or leave as any
  }
