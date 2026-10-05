export const schoolStats = [
  "Campuses",
  "Students",
  "Teachers",
  "Cities",
  "Learning Programmes",
  "Years of Education",
].map((label) => ({ label, value: "[TO BE PROVIDED]" }));
export const campuses = [
  {
    id: "placeholder",
    name: "[Campus Name to be Provided]",
    city: "[City to be Provided]",
    area: "[Campus Location to be Provided]",
  },
] as const;
export const ecosystem = [
  ["Students", "Student-centered learning and digital resources."],
  ["Teachers", "Continuous professional development and technology-enabled teaching."],
  ["Parents", "Parent partnership and visibility into student progress."],
  ["Campus", "A safe, supportive and modern learning environment."],
  ["Digital School", "Connected student, parent, teacher and school-management systems."],
  ["Learning", "Academic excellence combined with practical and future-ready skills."],
] as const;
