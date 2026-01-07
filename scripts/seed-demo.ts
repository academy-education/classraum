/**
 * Demo Data Seed Script for Classraum
 *
 * Creates a complete MID-SIZED ACADEMY demo with:
 * - 1 Manager
 * - 15 Teachers
 * - 150 Students (with parents) = 300 family users
 * - 20 Classrooms (수학, 영어, 국어, 과학, 사회 - 기초/중급/심화/고급반)
 * - Many Sessions with attendance (including this week)
 * - Many assignments with grades and comments
 * - Invoices, payment templates, and varied payment history (with THIS MONTH revenue)
 * - Multiple announcements
 * - Student reports
 * - Notifications for all user types including managers
 *
 * Total: ~316 active users (matching mid-sized academy tier)
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts          # Create demo data
 *   npx tsx scripts/seed-demo.ts --reset  # Delete and recreate demo data
 *   npx tsx scripts/seed-demo.ts --delete # Delete demo data only
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

// Configuration
const DEMO_ACADEMY_NAME = '클래스라움 데모 학원'
const DEMO_EMAIL_DOMAIN = 'demo.classraum.com'
const DEFAULT_PASSWORD = 'demo1234!'

// Supabase client with service role for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Korean names for demo data
const KOREAN_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍']
const KOREAN_FIRST_NAMES_MALE = ['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준서', '건우', '현우', '지훈', '우진', '승현']
const KOREAN_FIRST_NAMES_FEMALE = ['서연', '서윤', '지우', '서현', '민서', '하은', '하윤', '윤서', '지민', '채원', '수아', '예린', '유진', '다은', '소율']
const TEACHER_NAMES = [
  '김영희', '박철수', '이지연', '최수진', '정민호',
  '강민정', '조현우', '윤서영', '장하나', '임지훈',
  '한소희', '오준혁', '서민지', '신동현', '권유리'
]
const PARENT_SUFFIXES = ['아버지', '어머니']

// Number of students to create (mid-sized academy: 150 students)
const NUM_STUDENTS = 150

// Subject names (used for subjects table)
const SUBJECT_NAMES = ['수학', '영어', '국어', '과학', '사회']

// Classroom configuration - each subject has 4 levels (기초/중급/심화/고급)
const CLASSROOMS_CONFIG = [
  { subject: '수학', color: '#3B82F6', grade: '기초' },
  { subject: '수학', color: '#60A5FA', grade: '중급' },
  { subject: '수학', color: '#2563EB', grade: '심화' },
  { subject: '수학', color: '#1D4ED8', grade: '고급' },
  { subject: '영어', color: '#10B981', grade: '기초' },
  { subject: '영어', color: '#34D399', grade: '중급' },
  { subject: '영어', color: '#059669', grade: '심화' },
  { subject: '영어', color: '#047857', grade: '고급' },
  { subject: '국어', color: '#F59E0B', grade: '기초' },
  { subject: '국어', color: '#FBBF24', grade: '중급' },
  { subject: '국어', color: '#D97706', grade: '심화' },
  { subject: '국어', color: '#B45309', grade: '고급' },
  { subject: '과학', color: '#8B5CF6', grade: '기초' },
  { subject: '과학', color: '#A78BFA', grade: '중급' },
  { subject: '과학', color: '#7C3AED', grade: '심화' },
  { subject: '과학', color: '#6D28D9', grade: '고급' },
  { subject: '사회', color: '#EC4899', grade: '기초' },
  { subject: '사회', color: '#F472B6', grade: '중급' },
  { subject: '사회', color: '#DB2777', grade: '심화' },
  { subject: '사회', color: '#BE185D', grade: '고급' },
]

// Assignment types and templates
const ASSIGNMENT_TYPES = ['homework', 'quiz', 'test', 'project']
const ASSIGNMENT_TEMPLATES: Record<string, string[]> = {
  '수학': ['방정식 연습문제', '함수 그래프 그리기', '기하학 증명', '수열 문제풀이', '미적분 기초'],
  '영어': ['영어 에세이 작성', '문법 연습문제', '독해 퀴즈', '단어 암기 테스트', '영작문 과제'],
  '국어': ['고전문학 감상문', '현대시 분석', '문법 정리', '논술문 작성', '독서록 작성'],
  '과학': ['실험 보고서', '과학 탐구 프로젝트', '개념 정리 노트', '물리 문제풀이', '화학 반응식'],
  '사회': ['역사 연표 정리', '지리 지도 분석', '시사 이슈 토론', '사회 탐구 보고서', '경제 개념 정리'],
}

// Feedback templates
const POSITIVE_FEEDBACK = [
  '잘했습니다! 계속 이렇게 열심히 하세요.',
  '훌륭한 결과입니다. 꾸준히 노력하는 모습이 보여요.',
  '정확하게 이해하고 있네요. 앞으로도 기대됩니다.',
  '매우 인상적인 답안입니다. 논리적으로 잘 풀었어요.',
  '창의적인 접근이 돋보입니다. 잘했습니다!',
]
const IMPROVEMENT_FEEDBACK = [
  '조금 더 연습이 필요해요. 힘내세요!',
  '기본 개념을 다시 복습해보세요.',
  '풀이 과정을 더 자세히 써보면 좋겠어요.',
  '다음에는 더 잘할 수 있을 거예요.',
  '실수가 있었네요. 다시 한번 확인해보세요.',
]

// Comment templates
const STUDENT_COMMENTS = [
  '질문이 있어요. 3번 문제가 이해가 안 됩니다.',
  '과제 제출했습니다!',
  '늦게 제출해서 죄송합니다.',
  '혹시 이 풀이가 맞을까요?',
  '더 연습해야겠네요.',
]
const TEACHER_COMMENTS = [
  '3번 문제는 다음 수업시간에 설명해드릴게요.',
  '제출 확인했습니다. 잘했어요!',
  '다음부터는 기한 내에 제출해주세요.',
  '네, 풀이가 맞습니다. 잘했어요!',
  '연습하면 분명 좋아질 거예요. 화이팅!',
]

// Announcement templates
const ANNOUNCEMENTS = [
  { title: '1월 학원 일정 안내', content: '안녕하세요, 학부모님들께. 1월 학원 운영 일정을 안내드립니다. 1월 1일~3일은 신정 연휴로 휴원합니다. 1월 25일부터 설 연휴 기간 휴원 예정입니다. 자세한 일정은 개별 안내드리겠습니다.' },
  { title: '겨울방학 특강 안내', content: '겨울방학을 맞아 특별 집중 강좌를 개설합니다. 수학 심화반, 영어 독해반, 국어 논술반이 운영됩니다. 신청은 학원 앱을 통해 가능합니다.' },
  { title: '신학기 수업 시간표 변경', content: '3월 신학기부터 수업 시간표가 일부 변경됩니다. 변경된 시간표는 개별 연락드릴 예정이오니 확인 부탁드립니다.' },
  { title: '학부모 상담 주간 안내', content: '이번 달 마지막 주는 학부모 상담 주간입니다. 자녀분의 학습 현황에 대해 담당 선생님과 상담하실 수 있습니다. 상담 예약은 앱에서 가능합니다.' },
  { title: '수학 경시대회 안내', content: '다음 달 15일에 전국 수학 경시대회가 개최됩니다. 참가를 희망하는 학생은 담당 선생님께 신청해 주세요. 대회 준비 특강도 별도로 운영됩니다.' },
  { title: '영어 말하기 대회 결과 발표', content: '지난주 진행된 영어 말하기 대회 결과를 발표합니다. 입상한 학생들에게는 개별 연락드리며, 시상식은 다음 주 금요일에 진행됩니다. 모든 참가 학생들 수고 많았습니다!' },
  { title: '새로운 과학 실험실 오픈', content: '최신 장비를 갖춘 과학 실험실이 새롭게 오픈했습니다. 앞으로 과학 수업에서 더욱 다양한 실험 활동이 진행될 예정입니다. 실험복은 학원에서 제공됩니다.' },
  { title: '안전 교육 실시 안내', content: '이번 주 수요일 전체 학생을 대상으로 안전 교육을 실시합니다. 소방 대피 훈련 및 응급처치 교육이 포함되어 있으니 모든 학생이 참여해 주세요.' },
  { title: '수업료 결제 안내', content: '이번 달 수업료 결제 기한은 10일까지입니다. 앱을 통한 카드 결제 또는 계좌이체가 가능합니다. 결제 관련 문의사항은 사무실로 연락 주세요.' },
  { title: '독서 프로그램 시작', content: '이번 학기부터 독서 프로그램을 운영합니다. 매월 선정된 도서를 읽고 독후감을 제출하면 특별 활동 점수가 부여됩니다. 많은 참여 바랍니다.' },
  { title: '학원 셔틀버스 노선 변경', content: '다음 달부터 셔틀버스 노선이 일부 변경됩니다. 변경된 노선과 시간표는 첨부파일을 확인해 주세요. 문의사항은 사무실로 연락 부탁드립니다.' },
  { title: '중간고사 대비 특강', content: '중간고사를 앞두고 각 과목별 특별 보충 수업을 진행합니다. 수학, 영어, 과학 과목 집중 대비반이 운영되며, 신청은 앱에서 가능합니다.' },
]

// Helper functions
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateKoreanName(isMale: boolean): string {
  const lastName = randomElement(KOREAN_LAST_NAMES)
  const firstName = randomElement(isMale ? KOREAN_FIRST_NAMES_MALE : KOREAN_FIRST_NAMES_FEMALE)
  return lastName + firstName
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatTime(hours: number, minutes: number = 0): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Main seed functions
async function deleteExistingDemoData() {
  console.log('🗑️  기존 데모 데이터 삭제 중...')

  // Find demo academy
  const { data: academy } = await supabase
    .from('academies')
    .select('id')
    .eq('name', DEMO_ACADEMY_NAME)
    .single()

  // Always clean up demo users from auth, even if academy doesn't exist
  // Keep fetching page 1 until no more demo users are found (users shift after deletion)
  let deletedAuthCount = 0
  let foundDemoUsers = true

  while (foundDemoUsers) {
    // Always fetch page 1 since users shift after deletion
    const { data: authUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (!authUsers?.users || authUsers.users.length === 0) {
      break
    }

    const demoAuthUsers = authUsers.users.filter(u => u.email?.endsWith(`@${DEMO_EMAIL_DOMAIN}`))
    if (demoAuthUsers.length === 0) {
      foundDemoUsers = false
      break
    }

    for (const user of demoAuthUsers) {
      await supabase.auth.admin.deleteUser(user.id)
      deletedAuthCount++
    }
  }

  if (deletedAuthCount > 0) {
    console.log(`   ${deletedAuthCount}명의 데모 auth 사용자 삭제됨`)
  }

  // Clean up orphaned users from users table
  const { data: orphanedUsers } = await supabase
    .from('users')
    .select('id')
    .like('email', `%@${DEMO_EMAIL_DOMAIN}`)

  if (orphanedUsers && orphanedUsers.length > 0) {
    // Delete notifications for these users first
    for (const user of orphanedUsers) {
      await supabase.from('notifications').delete().eq('user_id', user.id)
    }
    // Then delete users
    for (const user of orphanedUsers) {
      await supabase.from('users').delete().eq('id', user.id)
    }
    console.log(`   ${orphanedUsers.length}명의 orphaned users 및 알림 삭제됨`)
  }

  // Delete any orphaned demo academies (from previous failed runs)
  await supabase.from('academies').delete().eq('name', DEMO_ACADEMY_NAME)

  if (!academy) {
    console.log('   기존 데모 학원이 없습니다.')
    return
  }

  const academyId = academy.id
  console.log(`   데모 학원 ID: ${academyId}`)

  // Delete in order (respecting foreign keys)
  const tablesToDelete = [
    'assignment_comments',
    'assignment_grades',
    'assignments',
    'attendance',
    'classroom_sessions',
    'classroom_students',
    'classrooms',
    'student_reports',
    'invoices',
    'recurring_payment_templates',
    'announcements',
    'family_members',
    'families',
    'subjects',
  ]

  for (const table of tablesToDelete) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('academy_id', academyId)

    if (error && !error.message.includes('academy_id')) {
      // Try without academy_id filter for tables that don't have it
      await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  // Delete role tables
  await supabase.from('students').delete().eq('academy_id', academyId)
  await supabase.from('parents').delete().eq('academy_id', academyId)
  await supabase.from('teachers').delete().eq('academy_id', academyId)
  await supabase.from('managers').delete().eq('academy_id', academyId)

  // Get all demo users and delete them
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .like('email', `%@${DEMO_EMAIL_DOMAIN}`)

  if (users && users.length > 0) {
    for (const user of users) {
      // Delete from users table
      await supabase.from('users').delete().eq('id', user.id)
      // Delete auth user
      await supabase.auth.admin.deleteUser(user.id)
    }
    console.log(`   ${users.length}명의 데모 사용자 삭제됨`)
  }

  // Delete academy
  await supabase.from('academies').delete().eq('id', academyId)
  console.log('   데모 학원 삭제 완료')
}

async function createDemoAcademy(): Promise<string> {
  console.log('🏫 데모 학원 생성 중...')

  const { data, error } = await supabase
    .from('academies')
    .insert({
      name: DEMO_ACADEMY_NAME,
      address: '서울특별시 강남구 테헤란로 123, 4층',
      subscription_tier: 'pro',
    })
    .select('id')
    .single()

  if (error) throw error
  console.log(`   학원 ID: ${data.id}`)
  return data.id
}

async function createUser(
  email: string,
  name: string,
  role: 'manager' | 'teacher' | 'student' | 'parent'
): Promise<string> {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { name, role }
  })

  if (authError) throw authError
  const userId = authData.user.id

  // Create users table entry
  await supabase.from('users').insert({
    id: userId,
    name,
    email,
    role,
  })

  return userId
}

async function createManager(academyId: string): Promise<string> {
  console.log('👔 관리자 생성 중...')

  const email = `manager@${DEMO_EMAIL_DOMAIN}`
  const name = '김관리'

  const userId = await createUser(email, name, 'manager')

  await supabase.from('managers').insert({
    user_id: userId,
    academy_id: academyId,
    phone: '010-1234-5678',
    active: true,
  })

  console.log(`   관리자: ${name} (${email})`)
  return userId
}

async function createTeachers(academyId: string): Promise<string[]> {
  console.log('👨‍🏫 선생님 생성 중...')

  const teacherIds: string[] = []

  for (let i = 0; i < TEACHER_NAMES.length; i++) {
    const name = TEACHER_NAMES[i]
    const email = `teacher${i + 1}@${DEMO_EMAIL_DOMAIN}`

    const userId = await createUser(email, name, 'teacher')

    await supabase.from('teachers').insert({
      user_id: userId,
      academy_id: academyId,
      phone: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
      active: true,
    })

    teacherIds.push(userId)
    console.log(`   선생님 ${i + 1}: ${name} (${email})`)
  }

  return teacherIds
}

interface StudentData {
  userId: string
  studentRecordId: string
  name: string
  familyId: string
  parentUserId: string
}

async function createStudentsAndFamilies(academyId: string): Promise<StudentData[]> {
  console.log('👨‍👩‍👧‍👦 학생 및 가족 생성 중...')

  const students: StudentData[] = []

  for (let i = 0; i < NUM_STUDENTS; i++) {
    const isMale = i % 2 === 0
    const studentName = generateKoreanName(isMale)
    const studentEmail = `student${i + 1}@${DEMO_EMAIL_DOMAIN}`

    // Create student user
    const studentUserId = await createUser(studentEmail, studentName, 'student')

    const { data: studentRecord } = await supabase.from('students').insert({
      user_id: studentUserId,
      academy_id: academyId,
      phone: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
      school_name: randomElement(['서울중학교', '강남중학교', '테헤란중학교', '역삼중학교']),
      active: true,
    }).select('id').single()

    const studentRecordId = studentRecord!.id

    // Create parent
    const parentSuffix = randomElement(PARENT_SUFFIXES)
    const parentName = studentName.slice(0, 1) + studentName.slice(1) + ' ' + parentSuffix
    const parentEmail = `parent${i + 1}@${DEMO_EMAIL_DOMAIN}`

    const parentUserId = await createUser(parentEmail, parentName, 'parent')

    await supabase.from('parents').insert({
      user_id: parentUserId,
      academy_id: academyId,
      phone: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
      active: true,
    })

    // Create family
    const { data: familyData } = await supabase
      .from('families')
      .insert({
        academy_id: academyId,
        name: studentName.slice(0, 1) + '씨 가족',
      })
      .select('id')
      .single()

    const familyId = familyData!.id

    // Add family members
    await supabase.from('family_members').insert([
      { family_id: familyId, user_id: studentUserId, user_name: studentName, role: 'student' },
      { family_id: familyId, user_id: parentUserId, user_name: parentName, role: 'parent' },
    ])

    students.push({
      userId: studentUserId,
      studentRecordId,
      name: studentName,
      familyId,
      parentUserId,
    })

    console.log(`   학생 ${i + 1}: ${studentName} (학부모: ${parentName})`)
  }

  return students
}

async function createSubjects(academyId: string): Promise<Map<string, string>> {
  console.log('📚 과목 생성 중...')

  const subjectMap = new Map<string, string>()

  for (const subjectName of SUBJECT_NAMES) {
    const { data } = await supabase
      .from('subjects')
      .insert({
        name: subjectName,
        academy_id: academyId,
      })
      .select('id')
      .single()

    subjectMap.set(subjectName, data!.id)
    console.log(`   과목: ${subjectName}`)
  }

  return subjectMap
}

interface ClassroomData {
  id: string
  name: string
  subject: string
  teacherId: string
  studentIds: string[]
}

async function createClassrooms(
  academyId: string,
  teacherIds: string[],
  students: StudentData[],
  subjectMap: Map<string, string>
): Promise<ClassroomData[]> {
  console.log('🏛️ 교실 생성 중...')

  const classrooms: ClassroomData[] = []

  for (let i = 0; i < CLASSROOMS_CONFIG.length; i++) {
    const config = CLASSROOMS_CONFIG[i]
    const teacherId = teacherIds[i % teacherIds.length]
    const subjectId = subjectMap.get(config.subject)!

    const { data: classroomData } = await supabase
      .from('classrooms')
      .insert({
        name: `${config.subject} ${config.grade}반`,
        grade: config.grade,
        subject: config.subject,
        subject_id: subjectId,
        teacher_id: teacherId,
        academy_id: academyId,
        color: config.color,
        notes: `${config.subject} ${config.grade}반 수업을 진행하는 교실입니다.`,
      })
      .select('id')
      .single()

    const classroomId = classroomData!.id

    // Enroll students (randomly assign 10-18 students per class for larger dataset)
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5)
    const enrolledStudents = shuffledStudents.slice(0, randomInt(10, 18))
    const studentIds: string[] = []

    for (const student of enrolledStudents) {
      // Look up student_record_id
      const { data: studentRecord } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', student.userId)
        .eq('academy_id', academyId)
        .single()

      await supabase.from('classroom_students').insert({
        classroom_id: classroomId,
        student_id: student.userId,
        student_record_id: studentRecord?.id,
      })
      studentIds.push(student.userId)
    }

    classrooms.push({
      id: classroomId,
      name: `${config.subject} ${config.grade}반`,
      subject: config.subject,
      teacherId,
      studentIds,
    })

    console.log(`   교실: ${config.subject} ${config.grade}반 (학생 ${enrolledStudents.length}명)`)
  }

  return classrooms
}

interface SessionData {
  id: string
  classroomId: string
  date: string
}

async function createSessions(classrooms: ClassroomData[]): Promise<SessionData[]> {
  console.log('📅 수업 세션 생성 중...')

  const sessions: SessionData[] = []
  const today = new Date()

  // Create sessions for the past 2 months and upcoming 2 weeks
  // Including multiple sessions THIS WEEK
  for (const classroom of classrooms) {
    // Weekly schedule: 3 sessions per week for each class (Mon, Wed, Fri)
    const sessionDays = [1, 3, 5] // Monday, Wednesday, Friday

    // Create sessions for past 8 weeks and upcoming 2 weeks
    for (let weekOffset = -8; weekOffset <= 2; weekOffset++) {
      for (const dayOfWeek of sessionDays) {
        // Calculate the date for this day of the week
        const sessionDate = new Date(today)
        // Go to the start of the current week (Sunday)
        const currentDayOfWeek = sessionDate.getDay()
        sessionDate.setDate(sessionDate.getDate() - currentDayOfWeek)
        // Move to the target week
        sessionDate.setDate(sessionDate.getDate() + (weekOffset * 7))
        // Move to the target day
        sessionDate.setDate(sessionDate.getDate() + dayOfWeek)

        // Skip if too far in the past or future
        if (sessionDate > addDays(today, 14)) continue
        if (sessionDate < addDays(today, -60)) continue

        const startHour = 14 + (classrooms.indexOf(classroom) % 4) // Stagger class times
        const status = sessionDate < today ? 'completed' : 'scheduled'

        const { data: sessionData, error: sessionError } = await supabase
          .from('classroom_sessions')
          .insert({
            classroom_id: classroom.id,
            date: formatDate(sessionDate),
            start_time: formatTime(startHour, 0),
            end_time: formatTime(startHour + 1, 30),
            status,
            location: 'offline',
            room_number: `${randomInt(101, 105)}호`,
            notes: status === 'completed' ? '수업 완료' : null,
          })
          .select('id')
          .single()

        if (sessionError || !sessionData) {
          console.log(`   세션 생성 실패:`, sessionError?.message)
          continue
        }

        sessions.push({
          id: sessionData.id,
          classroomId: classroom.id,
          date: formatDate(sessionDate),
        })
      }
    }
  }

  console.log(`   총 ${sessions.length}개 세션 생성됨`)
  return sessions
}

async function createAttendance(
  sessions: SessionData[],
  classrooms: ClassroomData[],
  academyId: string
) {
  console.log('✅ 출석 데이터 생성 중...')

  const today = new Date()
  let attendanceCount = 0

  // Build student_record_id map for faster lookups
  const studentRecordMap = new Map<string, string>()

  for (const session of sessions) {
    const sessionDate = new Date(session.date)
    if (sessionDate >= today) continue // Only past sessions have attendance

    const classroom = classrooms.find(c => c.id === session.classroomId)!

    for (const studentId of classroom.studentIds) {
      // 90% attendance rate, 5% late, 5% absent
      const rand = Math.random()
      const status = rand < 0.9 ? 'present' : rand < 0.95 ? 'late' : 'absent'

      // Get student_record_id (cached)
      let studentRecordId = studentRecordMap.get(studentId)
      if (!studentRecordId) {
        const { data: studentRecord } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', studentId)
          .eq('academy_id', academyId)
          .single()
        if (studentRecord) {
          studentRecordId = studentRecord.id
          studentRecordMap.set(studentId, studentRecord.id)
        }
      }

      await supabase.from('attendance').insert({
        classroom_session_id: session.id,
        student_id: studentId,
        student_record_id: studentRecordId,
        status,
        note: status === 'late' ? '10분 지각' : status === 'absent' ? '병결' : null,
      })
      attendanceCount++
    }
  }

  console.log(`   총 ${attendanceCount}개 출석 기록 생성됨`)
}

async function createAssignmentsAndGrades(
  sessions: SessionData[],
  classrooms: ClassroomData[],
  academyId: string
): Promise<void> {
  console.log('📝 과제 및 성적 생성 중...')

  const today = new Date()
  let assignmentCount = 0
  let gradeCount = 0
  let commentCount = 0

  // Build student_record_id map for faster lookups
  const studentRecordMap = new Map<string, string>()

  // Include past sessions AND recent sessions (up to today)
  const sessionsForAssignments = sessions.filter(s => new Date(s.date) <= today)

  for (const session of sessionsForAssignments) {
    // 90% chance of having an assignment
    if (Math.random() > 0.9) continue

    const classroom = classrooms.find(c => c.id === session.classroomId)!
    const templates = ASSIGNMENT_TEMPLATES[classroom.subject] || ['일반 과제']

    const assignmentType = randomElement(ASSIGNMENT_TYPES)
    const title = randomElement(templates)
    const sessionDate = new Date(session.date)

    // Due date: 3-7 days after session
    const dueDate = addDays(sessionDate, randomInt(3, 7))
    const daysToDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const daysSinceSession = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))

    const { data: assignmentData, error: assignmentError } = await supabase
      .from('assignments')
      .insert({
        classroom_session_id: session.id,
        title,
        description: `${title}를 완료하세요. 기한: ${formatDate(dueDate)}`,
        assignment_type: assignmentType,
        due_date: formatDate(dueDate),
      })
      .select('id')
      .single()

    if (assignmentError || !assignmentData) {
      console.log(`   과제 생성 실패 (session: ${session.id}):`, assignmentError?.message)
      continue
    }

    assignmentCount++
    const assignmentId = assignmentData.id

    // Determine if this is a "current" assignment (due date is future or recent past)
    const isCurrentAssignment = daysToDue >= -3

    // Create grades for each student
    for (const studentId of classroom.studentIds) {
      // Get student_record_id (cached)
      let studentRecordId = studentRecordMap.get(studentId)
      if (!studentRecordId) {
        const { data: studentRecord } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', studentId)
          .eq('academy_id', academyId)
          .single()
        if (studentRecord) {
          studentRecordId = studentRecord.id
          studentRecordMap.set(studentId, studentRecord.id)
        }
      }

      if (isCurrentAssignment) {
        // Current assignments: mix of pending, submitted (with/without score)
        // Valid statuses: pending, submitted, not submitted, excused, overdue
        // "Graded" = submitted with a score
        const rand = Math.random()
        let status: string
        let score: number | null = null
        let feedback: string | null = null
        let submittedDate: string | null = null

        if (daysToDue > 3) {
          // Due date far in future (>3 days) - mostly pending
          if (rand < 0.2) {
            // 20% submitted without grade yet
            status = 'submitted'
            submittedDate = addDays(today, -randomInt(0, 2)).toISOString()
          } else if (rand < 0.3) {
            // 10% submitted AND graded early
            status = 'submitted'
            score = randomInt(75, 100)
            feedback = score >= 85 ? randomElement(POSITIVE_FEEDBACK) : randomElement(IMPROVEMENT_FEEDBACK)
            submittedDate = addDays(today, -randomInt(1, 3)).toISOString()
          } else {
            // 70% pending
            status = 'pending'
          }
        } else if (daysToDue > 0) {
          // Due date coming soon (1-3 days) - more activity
          if (rand < 0.25) {
            status = 'pending'
          } else if (rand < 0.45) {
            // 20% submitted without grade
            status = 'submitted'
            submittedDate = addDays(today, -randomInt(0, 1)).toISOString()
          } else {
            // 55% submitted AND graded
            status = 'submitted'
            score = randomInt(70, 100)
            feedback = score >= 80 ? randomElement(POSITIVE_FEEDBACK) : randomElement(IMPROVEMENT_FEEDBACK)
            submittedDate = addDays(today, -randomInt(1, 2)).toISOString()
          }
        } else {
          // Due date passed (within last 3 days) - mostly graded
          if (rand < 0.08) {
            status = 'not submitted' // 8% didn't submit
          } else if (rand < 0.15) {
            status = 'overdue' // 7% submitted late
            score = randomInt(50, 80)
            feedback = randomElement(IMPROVEMENT_FEEDBACK)
            submittedDate = addDays(dueDate, randomInt(1, 2)).toISOString()
          } else if (rand < 0.25) {
            // 10% submitted awaiting grade
            status = 'submitted'
            submittedDate = addDays(dueDate, randomInt(-1, 0)).toISOString()
          } else {
            // 75% submitted AND graded
            status = 'submitted'
            score = randomInt(60, 100)
            feedback = score >= 80 ? randomElement(POSITIVE_FEEDBACK) : randomElement(IMPROVEMENT_FEEDBACK)
            submittedDate = addDays(dueDate, randomInt(-2, 0)).toISOString()
          }
        }

        await supabase.from('assignment_grades').insert({
          assignment_id: assignmentId,
          student_id: studentId,
          student_record_id: studentRecordId,
          score,
          status,
          feedback,
          submitted_date: submittedDate,
        })
        gradeCount++
      } else {
        // Past assignments: mostly submitted with grades
        const rand = Math.random()
        if (rand < 0.08) continue // 8% didn't submit at all

        let status: string
        let score: number | null = null
        let feedback: string | null = null

        if (rand < 0.12) {
          // 4% not submitted
          status = 'not submitted'
        } else {
          // 88% submitted with grade
          status = 'submitted'
          score = randomInt(60, 100)
          feedback = score >= 80
            ? randomElement(POSITIVE_FEEDBACK)
            : randomElement(IMPROVEMENT_FEEDBACK)
        }

        await supabase.from('assignment_grades').insert({
          assignment_id: assignmentId,
          student_id: studentId,
          student_record_id: studentRecordId,
          score,
          status,
          feedback,
          submitted_date: status === 'submitted'
            ? new Date(dueDate.getTime() - randomInt(0, 48) * 60 * 60 * 1000).toISOString()
            : null,
        })
        gradeCount++
      }

      // 30% chance of comments (only for submitted/graded)
      if (Math.random() < 0.3) {
        await supabase.from('assignment_comments').insert({
          assignment_id: assignmentId,
          user_id: studentId,
          text: randomElement(STUDENT_COMMENTS),
        })

        await supabase.from('assignment_comments').insert({
          assignment_id: assignmentId,
          user_id: classroom.teacherId,
          text: randomElement(TEACHER_COMMENTS),
        })
        commentCount += 2
      }
    }
  }

  console.log(`   과제 ${assignmentCount}개, 성적 ${gradeCount}개, 댓글 ${commentCount}개 생성됨`)
}

async function createInvoices(
  academyId: string,
  students: StudentData[]
): Promise<void> {
  console.log('💰 청구서 및 결제 템플릿 생성 중...')

  const today = new Date()
  let invoiceCount = 0
  let templateCount = 0
  let totalRevenue = 0

  // Create multiple payment templates
  const templates = [
    { name: '월 수강료 (기본)', amount: 300000, description: '기본 수업 월 수강료' },
    { name: '월 수강료 (심화)', amount: 400000, description: '심화반 월 수강료' },
    { name: '월 수강료 (프리미엄)', amount: 500000, description: '프리미엄반 월 수강료' },
    { name: '교재비', amount: 80000, description: '학기별 교재비' },
    { name: '특강비 (수학)', amount: 150000, description: '수학 특별 강좌' },
    { name: '특강비 (영어)', amount: 150000, description: '영어 특별 강좌' },
    { name: '특강비 (과학)', amount: 120000, description: '과학 특별 강좌' },
    { name: '시험 응시료', amount: 50000, description: '모의고사 응시료' },
    { name: '겨울방학 집중반', amount: 450000, description: '겨울방학 집중 프로그램' },
    { name: '입시 컨설팅', amount: 200000, description: '진로 및 입시 상담' },
  ]

  const templateIds: string[] = []
  for (const template of templates) {
    const isSemesterly = template.name.includes('교재비')
    const { data: templateData, error: templateError } = await supabase
      .from('recurring_payment_templates')
      .insert({
        academy_id: academyId,
        name: template.name,
        amount: template.amount,
        recurrence_type: isSemesterly ? 'semesterly' : 'monthly',
        day_of_month: isSemesterly ? null : 1,
        semester_months: isSemesterly ? 6 : null,
        start_date: formatDate(addDays(today, -180)),
        next_due_date: formatDate(addDays(today, 30)),
        is_active: true,
      })
      .select('id')
      .single()

    if (templateError) {
      console.error(`   템플릿 "${template.name}" 생성 실패:`, templateError.message)
      continue
    }
    templateIds.push(templateData.id)
    templateCount++
  }

  console.log(`   결제 템플릿 ${templateCount}개 생성됨`)

  const discountReasons = ['형제 할인', '조기 등록 할인', '장기 수강 할인', '추천인 할인', '성적 우수 장학금']

  // Create invoices for each student
  for (const student of students) {
    // Determine student tier (affects pricing)
    const tier = Math.random()
    const tierName = tier < 0.3 ? '기본' : tier < 0.7 ? '심화' : '프리미엄'
    const baseAmount = tier < 0.3 ? 300000 : tier < 0.7 ? 400000 : 500000
    const templateIdx = tier < 0.3 ? 0 : tier < 0.7 ? 1 : 2

    // Monthly tuition for past 6 months
    for (let monthOffset = -5; monthOffset <= 0; monthOffset++) {
      const invoiceDate = new Date(today)
      invoiceDate.setMonth(invoiceDate.getMonth() + monthOffset)
      invoiceDate.setDate(1)

      const dueDate = new Date(invoiceDate)
      dueDate.setDate(10)

      // For current month, 80% are paid (early payers)
      const isPaid = monthOffset < 0 || (monthOffset === 0 && Math.random() < 0.8)
      const hasDiscount = Math.random() < 0.2
      const discountAmount = hasDiscount ? randomElement([10000, 20000, 30000, 50000]) : 0
      const finalAmount = baseAmount - discountAmount

      // For current month payments, paid_at should be within THIS month
      let paidAt: string | null = null
      if (isPaid) {
        if (monthOffset === 0) {
          // Current month: paid within the first few days of this month
          paidAt = addDays(new Date(today.getFullYear(), today.getMonth(), 1), randomInt(1, Math.min(today.getDate(), 5))).toISOString()
        } else {
          // Past months: paid around the due date
          paidAt = addDays(dueDate, randomInt(-5, 5)).toISOString()
        }
      }

      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: templateIds[templateIdx],
        invoice_name: `${invoiceDate.getMonth() + 1}월 ${tierName}반 수강료`,
        amount: baseAmount,
        discount_amount: discountAmount,
        discount_reason: hasDiscount ? randomElement(discountReasons) : null,
        final_amount: finalAmount,
        due_date: formatDate(dueDate),
        status: isPaid ? 'paid' : 'pending',
        paid_at: paidAt,
        payment_method: isPaid ? randomElement(['card', 'bank_transfer', 'card']) : null,
      })
      invoiceCount++
      if (isPaid) totalRevenue += finalAmount
    }

    // 교재비 (for 80% of students - two semesters)
    if (Math.random() < 0.8) {
      // 1학기 교재비
      const dueDate1 = addDays(today, -120)
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: templateIds[3],
        invoice_name: '1학기 교재비',
        amount: 80000,
        discount_amount: 0,
        final_amount: 80000,
        due_date: formatDate(dueDate1),
        status: 'paid',
        paid_at: addDays(dueDate1, randomInt(-3, 3)).toISOString(),
        payment_method: randomElement(['card', 'bank_transfer']),
      })
      invoiceCount++
      totalRevenue += 80000

      // 2학기 교재비
      const dueDate2 = addDays(today, -30)
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: templateIds[3],
        invoice_name: '2학기 교재비',
        amount: 80000,
        discount_amount: 0,
        final_amount: 80000,
        due_date: formatDate(dueDate2),
        status: 'paid',
        paid_at: addDays(dueDate2, randomInt(-3, 3)).toISOString(),
        payment_method: randomElement(['card', 'bank_transfer']),
      })
      invoiceCount++
      totalRevenue += 80000
    }

    // 특강비 - 수학 (for 60% of students) - paid THIS MONTH
    if (Math.random() < 0.6) {
      // Payment made within current month
      const paidAt = addDays(new Date(today.getFullYear(), today.getMonth(), 1), randomInt(1, Math.min(today.getDate(), 6))).toISOString()
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: templateIds[4],
        invoice_name: '1월 수학 심화 특강',
        amount: 150000,
        discount_amount: 0,
        final_amount: 150000,
        due_date: formatDate(addDays(today, -3)),
        status: 'paid',
        paid_at: paidAt,
        payment_method: 'card',
      })
      invoiceCount++
      totalRevenue += 150000
    }

    // 특강비 - 영어 (for 50% of students) - paid THIS MONTH
    if (Math.random() < 0.5) {
      const paidAt = addDays(new Date(today.getFullYear(), today.getMonth(), 1), randomInt(1, Math.min(today.getDate(), 6))).toISOString()
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: templateIds[5],
        invoice_name: '1월 영어 집중 특강',
        amount: 150000,
        discount_amount: 0,
        final_amount: 150000,
        due_date: formatDate(addDays(today, -2)),
        status: 'paid',
        paid_at: paidAt,
        payment_method: 'card',
      })
      invoiceCount++
      totalRevenue += 150000
    }

    // 특강비 - 과학 (for 40% of students) - paid THIS MONTH
    if (Math.random() < 0.4) {
      const paidAt = addDays(new Date(today.getFullYear(), today.getMonth(), 1), randomInt(1, Math.min(today.getDate(), 6))).toISOString()
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: templateIds[6],
        invoice_name: '1월 과학 실험 특강',
        amount: 120000,
        discount_amount: 0,
        final_amount: 120000,
        due_date: formatDate(addDays(today, -4)),
        status: 'paid',
        paid_at: paidAt,
        payment_method: randomElement(['card', 'bank_transfer']),
      })
      invoiceCount++
      totalRevenue += 120000
    }

    // 시험 응시료 (for 70% of students - multiple exams)
    if (Math.random() < 0.7) {
      for (let i = 0; i < randomInt(1, 3); i++) {
        const dueDate = addDays(today, -randomInt(5, 90))
        const examNames = ['11월 모의고사', '12월 학력평가', '중간고사 대비 모의', '기말고사 대비 모의']
        await supabase.from('invoices').insert({
          academy_id: academyId,
          student_id: student.userId,
          student_record_id: student.studentRecordId,
          template_id: templateIds[7],
          invoice_name: randomElement(examNames),
          amount: 50000,
          discount_amount: 0,
          final_amount: 50000,
          due_date: formatDate(dueDate),
          status: 'paid',
          paid_at: addDays(dueDate, randomInt(-3, 0)).toISOString(),
          payment_method: 'card',
        })
        invoiceCount++
        totalRevenue += 50000
      }
    }

    // 겨울방학 집중반 (for 35% of students)
    if (Math.random() < 0.35) {
      const dueDate = addDays(today, -randomInt(5, 20))
      const isPaid = Math.random() < 0.8
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: templateIds[8],
        invoice_name: '겨울방학 집중반',
        amount: 450000,
        discount_amount: 0,
        final_amount: 450000,
        due_date: formatDate(dueDate),
        status: isPaid ? 'paid' : 'pending',
        paid_at: isPaid ? addDays(dueDate, randomInt(-2, 2)).toISOString() : null,
        payment_method: isPaid ? 'card' : null,
      })
      invoiceCount++
      if (isPaid) totalRevenue += 450000
    }

    // 입시 컨설팅 (for 25% of students)
    if (Math.random() < 0.25) {
      const dueDate = addDays(today, -randomInt(10, 50))
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: templateIds[9],
        invoice_name: '입시 상담 (1회)',
        amount: 200000,
        discount_amount: 0,
        final_amount: 200000,
        due_date: formatDate(dueDate),
        status: 'paid',
        paid_at: addDays(dueDate, randomInt(-1, 1)).toISOString(),
        payment_method: 'card',
      })
      invoiceCount++
      totalRevenue += 200000
    }

    // Future invoice (next month tuition - pending)
    const nextMonthDue = new Date(today)
    nextMonthDue.setMonth(nextMonthDue.getMonth() + 1)
    nextMonthDue.setDate(10)

    await supabase.from('invoices').insert({
      academy_id: academyId,
      student_id: student.userId,
      student_record_id: student.studentRecordId,
      template_id: templateIds[templateIdx],
      invoice_name: `${nextMonthDue.getMonth() + 1}월 ${tierName}반 수강료`,
      amount: baseAmount,
      discount_amount: 0,
      final_amount: baseAmount,
      due_date: formatDate(nextMonthDue),
      status: 'pending',
      paid_at: null,
      payment_method: null,
    })
    invoiceCount++

    // === ONE-TIME INVOICES (template_id = null) ===
    // These will show in the "one-time" tab in the payments page

    // 일회성 자재비 (for 50% of students)
    if (Math.random() < 0.5) {
      const dueDate = addDays(today, -randomInt(10, 60))
      const isPaid = Math.random() < 0.85
      const amount = randomElement([15000, 25000, 35000, 45000])
      const materials = ['미술 재료비', '실험 재료비', '프린트 비용', '현장학습비', '체험활동비']
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: null, // ONE-TIME invoice
        invoice_name: randomElement(materials),
        amount: amount,
        discount_amount: 0,
        final_amount: amount,
        due_date: formatDate(dueDate),
        status: isPaid ? 'paid' : 'pending',
        paid_at: isPaid ? addDays(dueDate, randomInt(-3, 3)).toISOString() : null,
        payment_method: isPaid ? randomElement(['card', 'bank_transfer', 'cash']) : null,
      })
      invoiceCount++
      if (isPaid) totalRevenue += amount
    }

    // 일회성 행사비 (for 40% of students)
    if (Math.random() < 0.4) {
      const dueDate = addDays(today, -randomInt(5, 40))
      const isPaid = Math.random() < 0.9
      const amount = randomElement([30000, 50000, 70000])
      const events = ['학부모 간담회비', '송년회비', '체육대회비', '캠프비', '발표회비']
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: null, // ONE-TIME invoice
        invoice_name: randomElement(events),
        amount: amount,
        discount_amount: 0,
        final_amount: amount,
        due_date: formatDate(dueDate),
        status: isPaid ? 'paid' : 'pending',
        paid_at: isPaid ? addDays(dueDate, randomInt(-2, 2)).toISOString() : null,
        payment_method: isPaid ? 'card' : null,
      })
      invoiceCount++
      if (isPaid) totalRevenue += amount
    }

    // 일회성 추가 수업료 (for 30% of students) - PAID THIS MONTH for revenue
    if (Math.random() < 0.3) {
      const paidAt = addDays(new Date(today.getFullYear(), today.getMonth(), 1), randomInt(1, Math.min(today.getDate(), 6))).toISOString()
      const amount = randomElement([80000, 100000, 120000])
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: null, // ONE-TIME invoice
        invoice_name: '보충수업 추가비용',
        amount: amount,
        discount_amount: 0,
        final_amount: amount,
        due_date: formatDate(addDays(today, -5)),
        status: 'paid',
        paid_at: paidAt,
        payment_method: 'card',
      })
      invoiceCount++
      totalRevenue += amount
    }

    // 미결제 일회성 청구서 (for 20% of students) - pending invoices
    if (Math.random() < 0.2) {
      const dueDate = addDays(today, randomInt(5, 30))
      const amount = randomElement([50000, 75000, 100000])
      const items = ['특별 교재비', '추가 수업료', '개인 지도비', '자격증 시험료']
      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        student_record_id: student.studentRecordId,
        template_id: null, // ONE-TIME invoice
        invoice_name: randomElement(items),
        amount: amount,
        discount_amount: 0,
        final_amount: amount,
        due_date: formatDate(dueDate),
        status: 'pending',
        paid_at: null,
        payment_method: null,
      })
      invoiceCount++
    }
  }

  console.log(`   청구서 ${invoiceCount}개 생성됨`)
  console.log(`   총 매출: ${totalRevenue.toLocaleString()}원`)
}

async function createAnnouncements(
  academyId: string,
  managerId: string
): Promise<void> {
  console.log('📢 공지사항 생성 중...')

  for (const announcement of ANNOUNCEMENTS) {
    await supabase.from('announcements').insert({
      academy_id: academyId,
      title: announcement.title,
      content: announcement.content,
      created_by: managerId,
    })
  }

  console.log(`   공지사항 ${ANNOUNCEMENTS.length}개 생성됨`)
}

async function createStudentReports(
  students: StudentData[],
  classrooms: ClassroomData[],
  managerId: string
): Promise<void> {
  console.log('📊 성적표 생성 중...')

  const today = new Date()
  let reportCount = 0

  // Create reports for 50% of students
  const selectedStudents = students.filter(() => Math.random() < 0.5)

  for (const student of selectedStudents) {
    const startDate = addDays(today, -30)
    const endDate = today

    // Find classrooms this student is in
    const studentClassrooms = classrooms.filter(c => c.studentIds.includes(student.userId))

    await supabase.from('student_reports').insert({
      student_id: student.userId,
      student_record_id: student.studentRecordId,
      report_name: `${student.name} 월간 리포트`,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      selected_classrooms: studentClassrooms.map(c => c.id),
      status: 'Finished',
      feedback: `${student.name} 학생의 이번 달 학습 현황입니다. 전반적으로 성실하게 수업에 참여하고 있으며, 꾸준한 노력이 필요합니다.`,
      created_by: managerId,
      show_category_average: true,
      show_individual_grades: true,
      show_percentile_ranking: true,
    })
    reportCount++
  }

  console.log(`   성적표 ${reportCount}개 생성됨`)
}

async function createNotifications(
  students: StudentData[],
  classrooms: ClassroomData[],
  teacherIds: string[],
  managerId: string
): Promise<void> {
  console.log('🔔 알림 생성 중...')

  const today = new Date()
  let notificationCount = 0

  // Notification templates
  const notificationTemplates = {
    assignment: [
      { title: '새 과제가 등록되었습니다', message: '{subject} 과제가 등록되었습니다. 기한 내에 제출해주세요.' },
      { title: '과제 제출 마감 임박', message: '{subject} 과제 제출 마감일이 내일입니다.' },
      { title: '과제가 채점되었습니다', message: '{subject} 과제가 채점되었습니다. 점수를 확인해보세요.' },
      { title: '과제 피드백이 등록되었습니다', message: '선생님이 {subject} 과제에 피드백을 남겼습니다.' },
    ],
    attendance: [
      { title: '출석 확인', message: '오늘 {subject} 수업에 출석하셨습니다.' },
      { title: '지각 안내', message: '오늘 {subject} 수업에 지각으로 처리되었습니다.' },
      { title: '결석 안내', message: '오늘 {subject} 수업에 결석으로 처리되었습니다.' },
    ],
    billing: [
      { title: '청구서가 발행되었습니다', message: '이번 달 수강료 청구서가 발행되었습니다.' },
      { title: '결제 완료', message: '수강료 결제가 완료되었습니다. 감사합니다.' },
      { title: '결제 기한 알림', message: '수강료 결제 기한이 3일 남았습니다.' },
      { title: '미납금 안내', message: '미납된 수강료가 있습니다. 확인해주세요.' },
    ],
    session: [
      { title: '오늘 수업 안내', message: '오늘 {time}에 {subject} 수업이 있습니다.' },
      { title: '수업 시작 알림', message: '{subject} 수업이 곧 시작됩니다.' },
      { title: '보강 수업 안내', message: '{subject} 보강 수업이 예정되어 있습니다.' },
    ],
    report: [
      { title: '성적표가 발행되었습니다', message: '이번 달 성적표가 발행되었습니다. 확인해보세요.' },
      { title: '성적 분석 리포트', message: '월간 학습 분석 리포트가 준비되었습니다.' },
    ],
    system: [
      { title: '학원 공지사항', message: '새로운 공지사항이 등록되었습니다.' },
      { title: '시스템 점검 안내', message: '1월 7일 새벽 2시-4시 시스템 점검이 예정되어 있습니다.' },
      { title: '겨울방학 일정 안내', message: '겨울방학 특강 신청이 시작되었습니다.' },
    ],
  }

  // Create notifications for students (recent activity - past 7 days)
  for (const student of students) {
    const studentClassrooms = classrooms.filter(c => c.studentIds.includes(student.userId))

    // Assignment notifications (3-5 per student)
    for (let i = 0; i < randomInt(3, 6); i++) {
      const classroom = randomElement(studentClassrooms)
      if (!classroom) continue

      const template = randomElement(notificationTemplates.assignment)
      const createdAt = addDays(today, -randomInt(0, 7))

      await supabase.from('notifications').insert({
        user_id: student.userId,
        title: template.title,
        message: template.message.replace('{subject}', classroom.subject),
        type: 'assignment',
        is_read: Math.random() < 0.6,
        created_at: createdAt.toISOString(),
      })
      notificationCount++
    }

    // Attendance notifications (2-4 per student)
    for (let i = 0; i < randomInt(2, 5); i++) {
      const classroom = randomElement(studentClassrooms)
      if (!classroom) continue

      const template = randomElement(notificationTemplates.attendance)
      const createdAt = addDays(today, -randomInt(0, 5))

      await supabase.from('notifications').insert({
        user_id: student.userId,
        title: template.title,
        message: template.message.replace('{subject}', classroom.subject),
        type: 'attendance',
        is_read: Math.random() < 0.7,
        created_at: createdAt.toISOString(),
      })
      notificationCount++
    }

    // Billing notifications (1-3 per student)
    for (let i = 0; i < randomInt(1, 4); i++) {
      const template = randomElement(notificationTemplates.billing)
      const createdAt = addDays(today, -randomInt(0, 10))

      await supabase.from('notifications').insert({
        user_id: student.userId,
        title: template.title,
        message: template.message,
        type: 'billing',
        is_read: Math.random() < 0.5,
        created_at: createdAt.toISOString(),
      })
      notificationCount++
    }

    // Session notifications (2-3 per student)
    for (let i = 0; i < randomInt(2, 4); i++) {
      const classroom = randomElement(studentClassrooms)
      if (!classroom) continue

      const template = randomElement(notificationTemplates.session)
      const createdAt = addDays(today, -randomInt(0, 3))
      const times = ['14:00', '15:30', '17:00', '18:30', '19:00']

      await supabase.from('notifications').insert({
        user_id: student.userId,
        title: template.title,
        message: template.message
          .replace('{subject}', classroom.subject)
          .replace('{time}', randomElement(times)),
        type: 'session',
        is_read: Math.random() < 0.8,
        created_at: createdAt.toISOString(),
      })
      notificationCount++
    }

    // Report notifications (1 per student)
    const reportTemplate = randomElement(notificationTemplates.report)
    await supabase.from('notifications').insert({
      user_id: student.userId,
      title: reportTemplate.title,
      message: reportTemplate.message,
      type: 'report',
      is_read: Math.random() < 0.4,
      created_at: addDays(today, -randomInt(1, 5)).toISOString(),
    })
    notificationCount++

    // System notifications (1-2 per student)
    for (let i = 0; i < randomInt(1, 3); i++) {
      const template = randomElement(notificationTemplates.system)
      await supabase.from('notifications').insert({
        user_id: student.userId,
        title: template.title,
        message: template.message,
        type: 'system',
        is_read: Math.random() < 0.3,
        created_at: addDays(today, -randomInt(0, 7)).toISOString(),
      })
      notificationCount++
    }

    // Also create notifications for parent
    if (student.parentUserId) {
      // Parent gets fewer, more important notifications
      for (let i = 0; i < randomInt(2, 4); i++) {
        const type = randomElement(['billing', 'report', 'system', 'attendance'])
        const templates = notificationTemplates[type as keyof typeof notificationTemplates]
        const template = randomElement(templates)
        const classroom = randomElement(studentClassrooms)

        let message = template.message
        if (classroom) {
          message = message.replace('{subject}', classroom.subject)
        }

        await supabase.from('notifications').insert({
          user_id: student.parentUserId,
          title: template.title,
          message: message,
          type: type,
          is_read: Math.random() < 0.5,
          created_at: addDays(today, -randomInt(0, 7)).toISOString(),
        })
        notificationCount++
      }
    }
  }

  // Create notifications for teachers
  const teacherNotifications = [
    { title: '새 과제 제출', message: '학생이 과제를 제출했습니다.', type: 'assignment' },
    { title: '출석 미체크 알림', message: '오늘 수업의 출석을 체크해주세요.', type: 'attendance' },
    { title: '수업 시작 알림', message: '10분 후 수업이 시작됩니다.', type: 'session' },
    { title: '성적표 발행 완료', message: '월간 성적표가 발행되었습니다.', type: 'report' },
    { title: '학원 공지', message: '새로운 공지사항을 확인해주세요.', type: 'system' },
  ]

  for (const teacherId of teacherIds) {
    for (let i = 0; i < randomInt(5, 10); i++) {
      const template = randomElement(teacherNotifications)
      await supabase.from('notifications').insert({
        user_id: teacherId,
        title: template.title,
        message: template.message,
        type: template.type,
        is_read: Math.random() < 0.6,
        created_at: addDays(today, -randomInt(0, 7)).toISOString(),
      })
      notificationCount++
    }
  }

  // Create notifications for manager
  const managerNotifications = [
    { title: '새로운 학생 등록', message: '새로운 학생이 등록되었습니다.', type: 'system' },
    { title: '수강료 결제 완료', message: '학생의 수강료 결제가 완료되었습니다.', type: 'billing' },
    { title: '수강료 미납 알림', message: '미납된 수강료가 있는 학생이 있습니다.', type: 'billing' },
    { title: '새 문의사항', message: '학부모님께서 문의사항을 남기셨습니다.', type: 'system' },
    { title: '출석률 리포트', message: '이번 주 전체 출석률 리포트가 생성되었습니다.', type: 'report' },
    { title: '성적표 발행 완료', message: '이번 달 성적표가 모두 발행되었습니다.', type: 'report' },
    { title: '교사 일정 변경', message: '선생님의 일정이 변경되었습니다.', type: 'session' },
    { title: '학원 운영 리포트', message: '월간 운영 리포트가 준비되었습니다.', type: 'report' },
    { title: '시스템 업데이트', message: '새로운 기능이 추가되었습니다.', type: 'system' },
    { title: '결제 현황', message: '이번 달 결제 현황을 확인해주세요.', type: 'billing' },
  ]

  for (let i = 0; i < randomInt(15, 25); i++) {
    const template = randomElement(managerNotifications)
    await supabase.from('notifications').insert({
      user_id: managerId,
      title: template.title,
      message: template.message,
      type: template.type,
      is_read: Math.random() < 0.4,
      created_at: addDays(today, -randomInt(0, 7)).toISOString(),
    })
    notificationCount++
  }

  console.log(`   알림 ${notificationCount}개 생성됨`)
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const shouldReset = args.includes('--reset')
  const shouldDeleteOnly = args.includes('--delete')

  console.log('🚀 클래스라움 데모 데이터 시드 스크립트')
  console.log('=' .repeat(50))

  try {
    // Delete existing demo data if requested
    if (shouldReset || shouldDeleteOnly) {
      await deleteExistingDemoData()

      if (shouldDeleteOnly) {
        console.log('\n✅ 데모 데이터 삭제 완료!')
        return
      }
    }

    // Create demo data
    const academyId = await createDemoAcademy()
    const managerId = await createManager(academyId)
    const teacherIds = await createTeachers(academyId)
    const students = await createStudentsAndFamilies(academyId)
    const subjectMap = await createSubjects(academyId)
    const classrooms = await createClassrooms(academyId, teacherIds, students, subjectMap)
    const sessions = await createSessions(classrooms)
    await createAttendance(sessions, classrooms, academyId)
    await createAssignmentsAndGrades(sessions, classrooms, academyId)
    await createInvoices(academyId, students)
    await createAnnouncements(academyId, managerId)
    await createStudentReports(students, classrooms, managerId)
    await createNotifications(students, classrooms, teacherIds, managerId)

    console.log('\n' + '=' .repeat(50))
    console.log('✅ 데모 데이터 생성 완료!')
    console.log('\n📋 로그인 정보:')
    console.log(`   관리자: manager@${DEMO_EMAIL_DOMAIN} / ${DEFAULT_PASSWORD}`)
    console.log(`   선생님: teacher1@${DEMO_EMAIL_DOMAIN} / ${DEFAULT_PASSWORD}`)
    console.log(`   학생: student1@${DEMO_EMAIL_DOMAIN} / ${DEFAULT_PASSWORD}`)
    console.log(`   학부모: parent1@${DEMO_EMAIL_DOMAIN} / ${DEFAULT_PASSWORD}`)

  } catch (error) {
    console.error('\n❌ 오류 발생:', error)
    process.exit(1)
  }
}

main()
