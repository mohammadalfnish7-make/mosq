/** Syrian school grades per Ministry of Education naming (moed.gov.sy). */
export type SyrianGrade = {
  code: string;
  label: string;
  stage: "kindergarten" | "basic" | "secondary";
};

export const SYRIAN_GRADES: SyrianGrade[] = [
  { code: "kg1", label: "رياض أطفال - الأول", stage: "kindergarten" },
  { code: "kg2", label: "رياض أطفال - الثاني", stage: "kindergarten" },
  { code: "kg3", label: "رياض أطفال - الثالث", stage: "kindergarten" },
  { code: "g1", label: "الصف الأول", stage: "basic" },
  { code: "g2", label: "الصف الثاني", stage: "basic" },
  { code: "g3", label: "الصف الثالث", stage: "basic" },
  { code: "g4", label: "الصف الرابع", stage: "basic" },
  { code: "g5", label: "الصف الخامس", stage: "basic" },
  { code: "g6", label: "الصف السادس", stage: "basic" },
  { code: "g7", label: "الصف السابع", stage: "basic" },
  { code: "g8", label: "الصف الثامن", stage: "basic" },
  { code: "g9", label: "الصف التاسع", stage: "basic" },
  { code: "s10", label: "الأول الثانوي", stage: "secondary" },
  { code: "s11", label: "الثاني الثانوي", stage: "secondary" },
  { code: "s12", label: "الثالث الثانوي", stage: "secondary" }
];

const gradeByCode = new Map(SYRIAN_GRADES.map((grade) => [grade.code, grade]));

export function isValidGradeCode(code: string) {
  return gradeByCode.has(code);
}

export function gradeLabel(code: string | null | undefined) {
  if (!code) return null;
  return gradeByCode.get(code)?.label ?? null;
}

export const SYRIAN_GRADE_STAGE_LABELS: Record<SyrianGrade["stage"], string> = {
  kindergarten: "رياض الأطفال",
  basic: "التعليم الأساسي",
  secondary: "التعليم الثانوي"
};
