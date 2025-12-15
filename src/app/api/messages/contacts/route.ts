import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Contact {
  id: string
  name: string
  email: string
  role: string
  category: string
}

// GET - Get list of users that the current user can message
export async function GET(request: NextRequest) {
  try {
    // Get user from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user's role and academy
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const contacts: Contact[] = []
    const contactIds = new Set<string>()

    const addContact = (contact: Contact) => {
      if (!contactIds.has(contact.id) && contact.id !== user.id) {
        contactIds.add(contact.id)
        contacts.push(contact)
      }
    }

    if (userData.role === 'manager') {
      // Manager can message anyone in their academy
      const { data: manager } = await supabase
        .from('managers')
        .select('academy_id')
        .eq('user_id', user.id)
        .single()

      if (manager?.academy_id) {
        // Get all teachers
        const { data: teachers } = await supabase
          .from('teachers')
          .select('user_id, users!inner(id, name, email, role)')
          .eq('academy_id', manager.academy_id)
          .eq('active', true)

        teachers?.forEach(t => {
          const u = t.users as any
          addContact({ id: u.id, name: u.name, email: u.email, role: u.role, category: 'teachers' })
        })

        // Get all students
        const { data: students } = await supabase
          .from('students')
          .select('user_id, users!inner(id, name, email, role)')
          .eq('academy_id', manager.academy_id)
          .eq('active', true)

        students?.forEach(s => {
          const u = s.users as any
          addContact({ id: u.id, name: u.name, email: u.email, role: u.role, category: 'students' })
        })

        // Get all parents
        const { data: parents } = await supabase
          .from('parents')
          .select('user_id, users!inner(id, name, email, role)')
          .eq('academy_id', manager.academy_id)
          .eq('active', true)

        parents?.forEach(p => {
          const u = p.users as any
          addContact({ id: u.id, name: u.name, email: u.email, role: u.role, category: 'parents' })
        })
      }
    } else if (userData.role === 'teacher') {
      // Teacher can message students and parents in their classrooms
      const { data: teacher } = await supabase
        .from('teachers')
        .select('academy_id')
        .eq('user_id', user.id)
        .single()

      if (teacher?.academy_id) {
        // Get classrooms this teacher teaches
        const { data: classrooms } = await supabase
          .from('classrooms')
          .select('id')
          .eq('teacher_id', user.id)
          .eq('academy_id', teacher.academy_id)

        const classroomIds = classrooms?.map(c => c.id) || []

        if (classroomIds.length > 0) {
          // Get students in these classrooms
          const { data: classroomStudents } = await supabase
            .from('classroom_students')
            .select('student_id')
            .in('classroom_id', classroomIds)

          const studentUserIds = classroomStudents?.map(cs => cs.student_id) || []

          if (studentUserIds.length > 0) {
            // Get student user info
            const { data: studentUsers } = await supabase
              .from('students')
              .select('user_id, users!inner(id, name, email, role)')
              .in('user_id', studentUserIds)

            studentUsers?.forEach(s => {
              const u = s.users as any
              addContact({ id: u.id, name: u.name, email: u.email, role: u.role, category: 'students' })
            })

            // Get parents of these students via family_members
            const { data: studentFamilies } = await supabase
              .from('family_members')
              .select('family_id')
              .in('user_id', studentUserIds)
              .eq('role', 'student')

            const familyIds = studentFamilies?.map(sf => sf.family_id) || []

            if (familyIds.length > 0) {
              const { data: parentMembers } = await supabase
                .from('family_members')
                .select('user_id, users!inner(id, name, email, role)')
                .in('family_id', familyIds)
                .eq('role', 'parent')

              parentMembers?.forEach(pm => {
                const u = pm.users as any
                addContact({ id: u.id, name: u.name, email: u.email, role: u.role, category: 'parents' })
              })
            }
          }
        }
      }
    } else if (userData.role === 'student') {
      // Student can message their teachers and parents in their family
      const { data: student } = await supabase
        .from('students')
        .select('academy_id')
        .eq('user_id', user.id)
        .single()

      if (student?.academy_id) {
        // Get classrooms student is in
        const { data: studentClassrooms } = await supabase
          .from('classroom_students')
          .select('classroom_id')
          .eq('student_id', user.id)

        const classroomIds = studentClassrooms?.map(sc => sc.classroom_id) || []

        if (classroomIds.length > 0) {
          // Get teachers of these classrooms
          const { data: classroomData } = await supabase
            .from('classrooms')
            .select('teacher_id, users:teacher_id(id, name, email, role)')
            .in('id', classroomIds)

          classroomData?.forEach(c => {
            const u = c.users as any
            if (u) {
              addContact({ id: u.id, name: u.name, email: u.email, role: u.role, category: 'teachers' })
            }
          })
        }

        // Get parents in the same family
        const { data: studentFamily } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id)
          .eq('role', 'student')
          .single()

        if (studentFamily?.family_id) {
          const { data: familyParents } = await supabase
            .from('family_members')
            .select('user_id, users!inner(id, name, email, role)')
            .eq('family_id', studentFamily.family_id)
            .eq('role', 'parent')

          familyParents?.forEach(fp => {
            const u = fp.users as any
            addContact({ id: u.id, name: u.name, email: u.email, role: u.role, category: 'family' })
          })
        }
      }
    } else if (userData.role === 'parent') {
      // Parent can message their children's teachers and their children
      const { data: parentFamilies } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('role', 'parent')

      const familyIds = parentFamilies?.map(pf => pf.family_id) || []

      if (familyIds.length > 0) {
        // Get children (students) in the family
        const { data: children } = await supabase
          .from('family_members')
          .select('user_id, users!inner(id, name, email, role)')
          .in('family_id', familyIds)
          .eq('role', 'student')

        const childUserIds: string[] = []
        children?.forEach(c => {
          const u = c.users as any
          childUserIds.push(u.id)
          addContact({ id: u.id, name: u.name, email: u.email, role: u.role, category: 'family' })
        })

        if (childUserIds.length > 0) {
          // Get classrooms children are in
          const { data: childClassrooms } = await supabase
            .from('classroom_students')
            .select('classroom_id')
            .in('student_id', childUserIds)

          const classroomIds = childClassrooms?.map(cc => cc.classroom_id) || []

          if (classroomIds.length > 0) {
            // Get teachers of these classrooms
            const { data: classroomData } = await supabase
              .from('classrooms')
              .select('teacher_id, users:teacher_id(id, name, email, role)')
              .in('id', classroomIds)

            classroomData?.forEach(c => {
              const u = c.users as any
              if (u) {
                addContact({ id: u.id, name: u.name, email: u.email, role: u.role, category: 'teachers' })
              }
            })
          }
        }
      }
    }

    // Group contacts by category
    const groupedContacts = {
      teachers: contacts.filter(c => c.category === 'teachers'),
      students: contacts.filter(c => c.category === 'students'),
      parents: contacts.filter(c => c.category === 'parents'),
      family: contacts.filter(c => c.category === 'family')
    }

    return NextResponse.json({ contacts: groupedContacts })
  } catch (error) {
    console.error('[Messages API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
