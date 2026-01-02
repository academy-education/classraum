/**
 * Demo Data Seed Script for Classraum
 *
 * Creates a complete demo academy with:
 * - 1 Manager
 * - 3 Teachers
 * - 15 Students (with parents)
 * - 5 Classrooms (수학, 영어, 국어, 과학, 사회)
 * - ~30 Sessions with attendance
 * - Assignments with grades and comments
 * - Invoices and payment templates
 * - Announcements
 * - Student reports
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
const KOREAN_LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권']
const KOREAN_FIRST_NAMES_MALE = ['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준서']
const KOREAN_FIRST_NAMES_FEMALE = ['서연', '서윤', '지우', '서현', '민서', '하은', '하윤', '윤서', '지민', '채원']
const TEACHER_NAMES = ['김영희', '박철수', '이지연']
const PARENT_SUFFIXES = ['아버지', '어머니']

// Subject configuration
const SUBJECTS = [
  { name: '수학', color: '#3B82F6', grade: '중등' },
  { name: '영어', color: '#10B981', grade: '중등' },
  { name: '국어', color: '#F59E0B', grade: '중등' },
  { name: '과학', color: '#8B5CF6', grade: '중등' },
  { name: '사회', color: '#EC4899', grade: '중등' },
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
  name: string
  familyId: string
  parentUserId: string
}

async function createStudentsAndFamilies(academyId: string): Promise<StudentData[]> {
  console.log('👨‍👩‍👧‍👦 학생 및 가족 생성 중...')

  const students: StudentData[] = []

  for (let i = 0; i < 15; i++) {
    const isMale = i % 2 === 0
    const studentName = generateKoreanName(isMale)
    const studentEmail = `student${i + 1}@${DEMO_EMAIL_DOMAIN}`

    // Create student user
    const studentUserId = await createUser(studentEmail, studentName, 'student')

    await supabase.from('students').insert({
      user_id: studentUserId,
      academy_id: academyId,
      phone: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
      school_name: randomElement(['서울중학교', '강남중학교', '테헤란중학교', '역삼중학교']),
      active: true,
    })

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

  for (const subject of SUBJECTS) {
    const { data } = await supabase
      .from('subjects')
      .insert({
        name: subject.name,
        academy_id: academyId,
      })
      .select('id')
      .single()

    subjectMap.set(subject.name, data!.id)
    console.log(`   과목: ${subject.name}`)
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

  for (let i = 0; i < SUBJECTS.length; i++) {
    const subject = SUBJECTS[i]
    const teacherId = teacherIds[i % teacherIds.length]
    const subjectId = subjectMap.get(subject.name)!

    const { data: classroomData } = await supabase
      .from('classrooms')
      .insert({
        name: `${subject.name} ${subject.grade}반`,
        grade: subject.grade,
        subject: subject.name,
        subject_id: subjectId,
        teacher_id: teacherId,
        academy_id: academyId,
        color: subject.color,
        notes: `${subject.name} 수업을 진행하는 교실입니다.`,
      })
      .select('id')
      .single()

    const classroomId = classroomData!.id

    // Enroll students (randomly assign 8-12 students per class)
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5)
    const enrolledStudents = shuffledStudents.slice(0, randomInt(8, 12))
    const studentIds: string[] = []

    for (const student of enrolledStudents) {
      await supabase.from('classroom_students').insert({
        classroom_id: classroomId,
        student_id: student.userId,
      })
      studentIds.push(student.userId)
    }

    classrooms.push({
      id: classroomId,
      name: `${subject.name} ${subject.grade}반`,
      subject: subject.name,
      teacherId,
      studentIds,
    })

    console.log(`   교실: ${subject.name} ${subject.grade}반 (학생 ${enrolledStudents.length}명)`)
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

  // Create sessions for the past month and upcoming week
  for (const classroom of classrooms) {
    // Weekly schedule: 2 sessions per week for each class
    const dayOffsets = [-28, -21, -14, -7, 0, 7] // Past 4 weeks + this week + next week
    const sessionDays = [1, 4] // Monday and Thursday

    for (const weekOffset of dayOffsets) {
      for (const dayOfWeek of sessionDays) {
        const sessionDate = new Date(today)
        sessionDate.setDate(today.getDate() + weekOffset)
        // Adjust to correct day of week
        const currentDay = sessionDate.getDay()
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7
        sessionDate.setDate(sessionDate.getDate() + daysToAdd + (weekOffset < 0 ? -7 : 0))

        if (sessionDate > addDays(today, 14)) continue // Don't create sessions too far in future

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
  classrooms: ClassroomData[]
) {
  console.log('✅ 출석 데이터 생성 중...')

  const today = new Date()
  let attendanceCount = 0

  for (const session of sessions) {
    const sessionDate = new Date(session.date)
    if (sessionDate >= today) continue // Only past sessions have attendance

    const classroom = classrooms.find(c => c.id === session.classroomId)!

    for (const studentId of classroom.studentIds) {
      // 90% attendance rate, 5% late, 5% absent
      const rand = Math.random()
      const status = rand < 0.9 ? 'present' : rand < 0.95 ? 'late' : 'absent'

      await supabase.from('attendance').insert({
        classroom_session_id: session.id,
        student_id: studentId,
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

  // Filter past sessions for assignments
  const pastSessions = sessions.filter(s => new Date(s.date) < today)

  for (const session of pastSessions) {
    // 70% chance of having an assignment
    if (Math.random() > 0.7) continue

    const classroom = classrooms.find(c => c.id === session.classroomId)!
    const templates = ASSIGNMENT_TEMPLATES[classroom.subject] || ['일반 과제']

    const assignmentType = randomElement(ASSIGNMENT_TYPES)
    const title = randomElement(templates)
    const dueDate = addDays(new Date(session.date), randomInt(3, 7))

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

    // Create grades for each student
    for (const studentId of classroom.studentIds) {
      // 85% submission rate
      if (Math.random() > 0.85) continue

      const score = randomInt(60, 100)
      const status = score >= 60 ? 'graded' : 'pending'
      const feedback = score >= 80
        ? randomElement(POSITIVE_FEEDBACK)
        : randomElement(IMPROVEMENT_FEEDBACK)

      await supabase.from('assignment_grades').insert({
        assignment_id: assignmentId,
        student_id: studentId,
        score,
        status,
        feedback,
        submitted_date: new Date(dueDate.getTime() - randomInt(0, 48) * 60 * 60 * 1000).toISOString(),
      })
      gradeCount++

      // 30% chance of comments
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
  console.log('💰 청구서 생성 중...')

  const today = new Date()
  let invoiceCount = 0

  // Create payment template
  const { data: templateData } = await supabase
    .from('recurring_payment_templates')
    .insert({
      academy_id: academyId,
      name: '월 수강료',
      amount: 300000,
      recurrence_type: 'monthly',
      day_of_month: 1,
      start_date: formatDate(addDays(today, -90)),
      next_due_date: formatDate(addDays(today, 30)),
      is_active: true,
    })
    .select('id')
    .single()

  const templateId = templateData!.id

  // Create invoices for each student (past 3 months)
  for (const student of students) {
    for (let monthOffset = -2; monthOffset <= 0; monthOffset++) {
      const invoiceDate = new Date(today)
      invoiceDate.setMonth(invoiceDate.getMonth() + monthOffset)
      invoiceDate.setDate(1)

      const dueDate = new Date(invoiceDate)
      dueDate.setDate(10)

      const isPaid = monthOffset < 0 || (monthOffset === 0 && today.getDate() > 10)
      const hasDiscount = Math.random() < 0.2
      const amount = 300000
      const discountAmount = hasDiscount ? randomInt(1, 3) * 10000 : 0

      await supabase.from('invoices').insert({
        academy_id: academyId,
        student_id: student.userId,
        template_id: templateId,
        invoice_name: `${invoiceDate.getMonth() + 1}월 수강료`,
        amount,
        discount_amount: discountAmount,
        discount_reason: hasDiscount ? '형제 할인' : null,
        final_amount: amount - discountAmount,
        due_date: formatDate(dueDate),
        status: isPaid ? 'paid' : 'pending',
        paid_at: isPaid ? addDays(dueDate, randomInt(-5, 5)).toISOString() : null,
        payment_method: isPaid ? randomElement(['card', 'bank_transfer']) : null,
      })
      invoiceCount++
    }
  }

  console.log(`   청구서 ${invoiceCount}개 생성됨`)
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
      report_name: `${student.name} 월간 리포트`,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      selected_classrooms: studentClassrooms.map(c => c.id),
      status: 'published',
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
    await createAttendance(sessions, classrooms)
    await createAssignmentsAndGrades(sessions, classrooms, academyId)
    await createInvoices(academyId, students)
    await createAnnouncements(academyId, managerId)
    await createStudentReports(students, classrooms, managerId)

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
