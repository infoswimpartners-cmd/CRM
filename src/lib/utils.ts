import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInYears } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAge(birthDate: Date): number {
  return differenceInYears(new Date(), birthDate)
}

export function calculateSchoolGrade(birthDate: Date): string {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1 // 1-12
  const currentDay = today.getDate()

  // Calculate "Current Academic Year"
  // If today is before April 2nd, the academic year is previous year
  let currentAcademicYear = currentYear
  if (currentMonth < 4 || (currentMonth === 4 && currentDay < 2)) {
    currentAcademicYear -= 1
  }

  const birthYear = birthDate.getFullYear()
  const birthMonth = birthDate.getMonth() + 1
  const birthDay = birthDate.getDate()

  // Calculate "Birth Academic Year"
  let birthAcademicYear = birthYear
  if (birthMonth < 4 || (birthMonth === 4 && birthDay < 2)) {
    birthAcademicYear -= 1
  }

  const academicYearDiff = currentAcademicYear - birthAcademicYear

  // Grade Logic
  // P1 (Age 6-7): Diff 6 (Enter P1 at 6) -> No, Enter P1 in the year they turn 7?
  // Japan: Enters Elementary School in the April after 6th birthday.
  // Born 2017-04-02 -> Turns 6 on 2023-04-02. Enters Apr 2024. 
  // Wait.
  // Born 2017-04-02 (AY 2017).
  // Apr 2023: Turns 6.
  // Apr 2024: Enters Grade 1. (Turns 7)
  // AY 2024 - AY 2017 = 7 years. Grade 1.
  // Correct. Grade = Diff - 6.

  const gradeScore = academicYearDiff - 6

  if (gradeScore === 0) return '年長'
  if (gradeScore === -1) return '年中'
  if (gradeScore === -2) return '年少'
  if (gradeScore < -2) return '幼児' // Below Nensho
  if (gradeScore <= 6) return `小学${gradeScore}年生`
  if (gradeScore <= 9) return `中学${gradeScore - 6}年生`
  if (gradeScore <= 12) return `高校${gradeScore - 9}年生`
  if (gradeScore <= 16) return `大学${gradeScore - 12}年生`
  return '社会人'
}
