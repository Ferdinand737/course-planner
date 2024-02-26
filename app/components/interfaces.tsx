enum DegreeType {
    BSc,
    BA,
  }
  
  enum SpecializationType {
    MAJOR,
    MINOR,
    HONOURS,
  }
  
  enum RequirementType {
    AT_LEAST,
  }
  
  enum Faculty {
    SCI,
    ART,
    OTHER,
  }
  
  interface Degree {
    id: string;
    degreeType: DegreeType;
    specializations: Specialization[];
    coursePlan: CoursePlan[];
  }
  
  interface Specialization {
    id: string;
    name: string;
    specializationType: SpecializationType;
    discipline: string;
    requirements: Requirement[];
    degree: Degree[];
  }
  
  interface Requirement {
    id: string;
    constraintType: RequirementType;
    credits: number;
    year: number;
    programSpecific: boolean;
    alternatives: Course[];
    specialization?: Specialization;
    specializationId?: string;
  }
  interface User {
    id: string;
    email: string;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
    password?: Password;
    coursePlans: CoursePlan[];
  }
  
  interface Password {
    hash: string;
    user: User;
    userId: string;
  }
  
  interface CoursePlan {
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
  
  interface PlannedCourse {
    id: string;
    term: number;
    course: Course;
    courseId: string;
    coursePlan: CoursePlan;
    coursePlanId: string;
    alternativeCourses: Course[];
  }
  
  interface Course {
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
