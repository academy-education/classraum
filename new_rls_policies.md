# RLS Policies Implementation Plan

## Progress Tracking
- [x] classrooms ✅ IMPLEMENTED
- [x] classroom_students ✅ IMPLEMENTED
- [x] assignments ✅ IMPLEMENTED
- [x] classroom_sessions ✅ IMPLEMENTED
- [x] family_members ✅ IMPLEMENTED
- [x] student_reports ✅ IMPLEMENTED
- [x] attendance ✅ IMPLEMENTED
- [x] assignment_grades ✅ IMPLEMENTED
- [x] assignment_attachments ✅ IMPLEMENTED
- [x] assignment_comments ✅ IMPLEMENTED
- [x] notifications ✅ IMPLEMENTED
- [x] invoices ✅ IMPLEMENTED
- [x] chat_conversations ✅ IMPLEMENTED
- [x] chat_messages ✅ IMPLEMENTED
- [x] users ✅ IMPLEMENTED
- [x] students ✅ IMPLEMENTED
- [x] parents ✅ IMPLEMENTED
- [x] teachers ✅ IMPLEMENTED
- [x] managers ✅ IMPLEMENTED

## Additional Tables - RECENTLY IMPLEMENTED ✅
- [x] families ✅ IMPLEMENTED
- [x] assignment_categories ✅ IMPLEMENTED
- [x] classroom_schedules ✅ IMPLEMENTED
- [x] support_tickets ✅ IMPLEMENTED
- [x] support_ticket_messages ✅ IMPLEMENTED
- [x] academy_settings ✅ IMPLEMENTED
- [x] comment_reports ✅ IMPLEMENTED
- [x] subjects ✅ IMPLEMENTED (done earlier)
- [x] user_preferences ✅ IMPLEMENTED (done earlier)

## Administrative Tables (Low Priority)
- [ ] academies - No RLS needed (already accessible to all)
- [ ] academy_subscriptions, subscription_invoices, subscription_usage - Admin only
- [ ] admin_activity_logs, admin_settings, academy_notes - Admin only
- [ ] recurring_payment_templates, recurring_payment_template_students - Admin/Manager only
- [ ] system_notifications - Admin broadcast system

## Table: classrooms

### Access Requirements

#### 1. Who can access classrooms:
- **Students**: Can see only classrooms they're enrolled in
- **Parents**: Can see classrooms their children are enrolled in (connected via family_members with same family_id)
- **Teachers**: Can see all classrooms they are assigned to (teacher_id)
- **Managers**: Can see all classrooms in their academy (academy_id)

#### 2. Operations allowed:
- **Students & Parents**: READ only
- **Teachers**: READ, CREATE, UPDATE, DELETE (only for classrooms they created/are assigned to)
- **Managers**: All operations for classrooms in their academy

#### 3. Special conditions:
- None at the moment

#### 4. Optimization:
- Use existing functions if available for better performance
- Check for `is_same_family()` function availability

### Implementation Strategy

1. **Students Access**: Check enrollment via `classroom_students` table
2. **Parents Access**: Use family relationship + children's enrollment
3. **Teachers Access**: Direct `teacher_id` check
4. **Managers Access**: Direct `academy_id` check

### Policy Structure
```sql
-- Policy 1: Students can view classrooms they're enrolled in
-- Policy 2: Parents can view classrooms their children are enrolled in
-- Policy 3: Teachers can view/manage classrooms they're assigned to
-- Policy 4: Managers can view/manage all classrooms in their academy
```

---

## Table: classroom_students

### Access Requirements

#### 1. Who can access classroom_students:
- **Students**: Can see their own enrollment records
- **Parents**: Can see their children's enrollment records (connected via family_id)
- **Teachers**: Can see enrollments for classrooms they teach (classroom_id)
- **Managers**: Can see all enrollments in their academy

#### 2. Operations allowed:
- **Students & Parents**: READ only
- **Teachers**: READ, CREATE, UPDATE, DELETE (only for classrooms they are assigned to)
- **Managers**: READ, CREATE, UPDATE, DELETE (for their academy)

#### 3. Special conditions:
- None at the moment

#### 4. Business logic:
- Only teachers and managers can enroll/unenroll students
- Students and parents cannot enroll themselves

### Implementation Strategy

1. **Students Access**: Direct `student_id = auth.uid()` check
2. **Parents Access**: Use `is_same_family()` function
3. **Teachers Access**: Check via classroom assignment
4. **Managers Access**: Check via academy relationship

---

---

## Table: assignments

### Access Requirements

#### 1. Who can access assignments:
- **Students**: Can view all assignments from their classrooms
- **Parents**: Can see assignments for their children's classrooms
- **Teachers**: Can create/edit/delete assignments for their classroom sessions
- **Managers**: Can access all assignments in their academy

#### 2. Operations allowed:
- **Students & Parents**: READ only
- **Teachers**: READ, CREATE, UPDATE, DELETE (for their classroom sessions)
- **Managers**: READ, CREATE, UPDATE, DELETE (for their academy)

#### 3. Implementation Strategy:
- **Students Access**: Check via classroom_sessions → classrooms → classroom_students
- **Parents Access**: Same as students but for their children via family relationship
- **Teachers Access**: Check via classroom_sessions → classrooms where teacher_id matches
- **Managers Access**: Check via classroom_sessions → classrooms → academy where manager belongs

---

---

## Table: classroom_sessions

### Access Requirements

#### 1. Who can access classroom_sessions:
- **Students**: Can view sessions for their enrolled classrooms
- **Parents**: Can view sessions for their children's classrooms
- **Teachers**: Can create/edit/delete sessions for their assigned classrooms, and edit (not delete) sessions they are substitute teachers for
- **Managers**: Can access all sessions in their academy

#### 2. Operations allowed:
- **Students & Parents**: READ only
- **Teachers**:
  - READ, CREATE, UPDATE, DELETE (for their assigned classrooms)
  - READ, UPDATE only (for sessions they are substitute teachers for)
- **Managers**: READ, CREATE, UPDATE, DELETE (for their academy)

#### 3. Special conditions:
- **Substitute teacher functionality**: Teachers can edit sessions where they are listed as substitute_teacher, but cannot delete or create new sessions for those classrooms

#### 4. Implementation Strategy:
- **Students Access**: Check via classroom_id using get_user_accessible_classrooms()
- **Parents Access**: Same as students but for their children's classrooms
- **Teachers Access**:
  - Full access via get_user_accessible_classrooms() for assigned classrooms
  - Read/Update only via substitute_teacher = auth.uid() for substitute sessions
- **Managers Access**: Check via classrooms → academy relationship

---

---

## Table: family_members

### Access Requirements

#### 1. Who can access family_members:
- **Students**: Can view their own family relationships only
- **Parents**: Can view their own family relationships only
- **Teachers**: Can view family relationships for families that have students in their classrooms
- **Managers**: Can view, create, edit, delete family relationships within their academy

#### 2. Operations allowed:
- **Students & Parents**: READ only (for their own family)
- **Teachers**: READ only (for relevant families)
- **Managers**: READ, CREATE, UPDATE, DELETE (for families in their academy)

#### 3. Special conditions:
- **Privacy protection**: Students and parents cannot see other families
- **Teacher scope**: Teachers can only see families of students in their classrooms
- **Manager scope**: Managers can only access families connected to their academy

#### 4. Implementation Strategy:
- **Students Access**: Direct user_id = auth.uid() check
- **Parents Access**: Direct user_id = auth.uid() check
- **Teachers Access**: Check via classroom relationships (students in their classes)
- **Managers Access**: Check via academy relationships through students table

---

---

## Table: student_reports

### Access Requirements

#### 1. Who can access student_reports:
- **Students**: Can view their own reports only
- **Parents**: Can view reports for their children only
- **Teachers**: Can create reports for students in their academy, and edit/delete reports they created
- **Managers**: Can create, view, edit, and delete any reports within their academy

#### 2. Operations allowed:
- **Students & Parents**: READ only
- **Teachers**:
  - READ (for all students in their academy)
  - CREATE (for students in their academy)
  - UPDATE, DELETE (only for reports they created via ai_feedback_created_by)
- **Managers**: READ, CREATE, UPDATE, DELETE (for all reports in their academy)

#### 3. Special conditions:
- **Report ownership**: Teachers can only edit/delete reports they created (ai_feedback_created_by = auth.uid())
- **Academy scope**: Teachers and managers can only access reports for students in their academy
- **Manager override**: Managers can delete any report in their academy, regardless of who created it

#### 4. Implementation Strategy:
- **Students Access**: Direct student_id = auth.uid() check
- **Parents Access**: Use get_user_family_students() function
- **Teachers Access**: Check via students → academy relationship, with ownership check for modifications
- **Managers Access**: Check via students → academy relationship with full access

---

---

## Table: attendance

### Access Requirements

#### 1. Who can access attendance:
- **Students**: Can view their own attendance records only
- **Parents**: Can view attendance records for their children only
- **Teachers**: Can create, edit, delete attendance records for students in their classroom sessions
- **Managers**: Can create, edit, delete any attendance records within their academy

#### 2. Operations allowed:
- **Students & Parents**: READ only
- **Teachers**: READ, CREATE, UPDATE, DELETE (for their classroom sessions)
- **Managers**: READ, CREATE, UPDATE, DELETE (for their academy)

#### 3. Special conditions:
- **Session scope**: Teachers can only manage attendance for classroom sessions they conduct
- **Academy scope**: Managers can access all attendance within their academy
- **Student privacy**: Students can only see their own attendance

#### 4. Implementation Strategy:
- **Students Access**: Direct student_id = auth.uid() check
- **Parents Access**: Use get_user_family_students() function
- **Teachers Access**: Check via classroom_sessions → classrooms where teacher_id matches
- **Managers Access**: Check via classroom_sessions → classrooms → academy relationship

---

---

## Table: assignment_grades

### Access Requirements

#### 1. Who can access assignment_grades:
- **Students**: Can view their own grades and feedback only
- **Parents**: Can view grades and feedback for their children only
- **Teachers**: Can create, edit, delete grades for assignments in their classrooms, and provide feedback and scores
- **Managers**: Can create, edit, delete any assignment grades within their academy

#### 2. Operations allowed:
- **Students & Parents**: READ only
- **Teachers**: READ, CREATE, UPDATE, DELETE (for assignments in their classrooms)
- **Managers**: READ, CREATE, UPDATE, DELETE (for their academy)

#### 3. Special conditions:
- **Assignment scope**: Teachers can only manage grades for assignments in their own classrooms
- **Academy scope**: Managers can access all assignment grades within their academy
- **Student privacy**: Students can only see their own grades and feedback

#### 4. Implementation Strategy:
- **Students Access**: Direct student_id = auth.uid() check
- **Parents Access**: Use get_user_family_students() function
- **Teachers Access**: Check via assignments → classroom_sessions → classrooms where teacher_id matches
- **Managers Access**: Check via assignments → classroom_sessions → classrooms → academy relationship

---

---

## Table: assignment_attachments

### Access Requirements

#### 1. Who can access assignment_attachments:
- **Students**: Can view attachments for assignments in their classrooms (teacher-uploaded files like instructions, worksheets)
- **Parents**: Can view attachments for their children's assignments
- **Teachers**: Can view and upload attachments to assignments in their classroom sessions
- **Managers**: Can view, upload, and delete any assignment attachments within their academy

#### 2. Operations allowed:
- **Students & Parents**: READ only
- **Teachers**: READ, CREATE, UPDATE, DELETE (for assignments in their classroom sessions)
- **Managers**: READ, CREATE, UPDATE, DELETE (for their academy)

#### 3. Special conditions:
- **Assignment scope**: Access is tied to assignments in classroom sessions
- **Teacher uploads**: Teachers upload instructional materials, worksheets, etc. (not student submissions)
- **Academy scope**: Managers can access all assignment attachments within their academy

#### 4. Implementation Strategy:
- **Students Access**: Check via assignments → classroom_sessions → get_user_accessible_classrooms()
- **Parents Access**: Same as students but for their children's classrooms
- **Teachers Access**: Check via assignments → classroom_sessions → classrooms where teacher_id matches
- **Managers Access**: Check via assignments → classroom_sessions → classrooms → academy relationship

---

---

## Table: assignment_comments

### Access Requirements

#### 1. Who can access assignment_comments:
- **Students**: Can view and add comments on assignments in their classrooms, and delete their own comments
- **Parents**: Can view and add comments on their children's assignments, and delete their own comments
- **Teachers**: Can view and add comments on assignments in their classroom sessions, but cannot delete other users' comments (only their own)
- **Managers**: Can view, add, edit, and delete any assignment comments within their academy

#### 2. Operations allowed:
- **Students**: READ (for their classroom assignments), CREATE (their own), DELETE (their own only)
- **Parents**: READ (for their children's assignments), CREATE (their own), DELETE (their own only)
- **Teachers**: READ (for their classroom assignments), CREATE (their own), DELETE (their own only)
- **Managers**: READ, CREATE, UPDATE, DELETE (for their academy)

#### 3. Special conditions:
- **Comment ownership**: Users can only delete comments they created (user_id = auth.uid())
- **Assignment scope**: Access is tied to assignments in classroom sessions
- **Teacher limitation**: Teachers cannot delete student/parent comments (promotes open communication)
- **Manager override**: Managers can delete any inappropriate comments

#### 4. Implementation Strategy:
- **Students/Parents Access**: Check via assignments → classroom_sessions → get_user_accessible_classrooms()
- **Teachers Access**: Check via assignments → classroom_sessions → classrooms where teacher_id matches
- **Managers Access**: Check via assignments → classroom_sessions → classrooms → academy relationship
- **Ownership checks**: user_id = auth.uid() for CREATE/DELETE operations

---

---

## Table: notifications

### Access Requirements

#### 1. Who can access notifications:
- **All Users**: Can only access their own notifications (user_id = auth.uid())

#### 2. Operations allowed:
- **All Users**: READ, CREATE, UPDATE, DELETE (for their own notifications only)

#### 3. Special conditions:
- **Simple ownership model**: Users can only see and manage notifications sent to them
- **Privacy protection**: No cross-user access - notifications are completely private
- **Full control**: Users can mark as read, delete, or modify their own notifications

#### 4. Implementation Strategy:
- **Single policy**: user_id = auth.uid() for all operations
- **No role-based restrictions**: All user roles have the same access pattern
- **Clean and simple**: No complex JOINs or academy relationships needed

---

---

## Table: invoices

### Access Requirements

#### 1. Who can access invoices:
- **Students**: Can view their own invoices only (full read access to all invoice details)
- **Parents**: Can view invoices for their children only (full read access)
- **Teachers**: No access to invoices (financial data privacy)
- **Managers**: Full access to all invoices within their academy

#### 2. Operations allowed:
- **Students & Parents**: READ only (no financial modifications)
- **Teachers**: No access
- **Managers**: READ, CREATE, UPDATE, DELETE (full invoice management)

#### 3. Special conditions:
- **Financial privacy**: Teachers have no access to sensitive billing information
- **Read-only for families**: Students and parents can view but not modify financial data
- **Academy scope**: Managers can manage all invoices for students in their academy
- **Payment processing**: Status updates should be handled by secure payment systems, not direct user updates

#### 4. Implementation Strategy:
- **Students Access**: Direct student_id = auth.uid() check
- **Parents Access**: Use get_user_family_students() function for children's invoices
- **Teachers Access**: No policies created (no access)
- **Managers Access**: Check via academy_id relationship through managers table

---

---

## Table: chat_conversations

### Access Requirements

#### 1. Who can access chat_conversations:
- **Students & Parents**: No access (cannot create or view support conversations)
- **Teachers & Managers**: Can create and view only conversations they started
- **Super Admin**: Can view and manage all conversations in the system

#### 2. Operations allowed:
- **Students & Parents**: No access
- **Teachers & Managers**: READ, CREATE, UPDATE, DELETE (for conversations they created only)
- **Super Admin**: READ, CREATE, UPDATE, DELETE (for all conversations)

#### 3. Special conditions:
- **Support system**: This is a 1-on-1 support chat between staff and users
- **Creator ownership**: Only the staff member who created the conversation can access it
- **Super admin oversight**: Super admins can access all conversations for moderation/support

#### 4. Implementation Strategy:
- **Teachers/Managers Access**: user_id = auth.uid() (conversation creator)
- **Super Admin Access**: role = 'super_admin' with full access

---

## Table: chat_messages

### Access Requirements

#### 1. Who can access chat_messages:
- **Conversation Creators**: Can view and send messages in conversations they created
- **Super Admin**: Can view and send messages in all conversations

#### 2. Operations allowed:
- **Conversation Creators**: READ, CREATE, UPDATE, DELETE (for their conversations)
- **Super Admin**: READ, CREATE, UPDATE, DELETE (for all conversations)

#### 3. Special conditions:
- **Message scope**: Access is tied to conversation ownership
- **Support communication**: Messages are part of the support ticket system
- **Admin moderation**: Super admins can participate in all conversations

#### 4. Implementation Strategy:
- **Creators Access**: Check via conversation_id → chat_conversations where user_id = auth.uid()
- **Super Admin Access**: role = 'super_admin' with full access

---

---

## Table: users

### Access Requirements

#### 1. Who can access users:
- **All Users**: Full access to their own user record (id = auth.uid())
- **Students**: Can view teachers/managers in their classrooms
- **Parents**: Can view teachers/managers in their children's classrooms
- **Teachers**: Can view students and parents in their academy
- **Managers**: Can view all users connected to their academy (students, parents, teachers, other managers)
- **Super Admin**: Full access to all users

#### 2. Operations allowed:
- **All Users**: READ, CREATE, UPDATE, DELETE (for their own record)
- **Students/Parents**: READ only (for staff in their scope)
- **Teachers**: READ only (for academy users)
- **Managers**: READ only (for academy users)
- **Super Admin**: READ, CREATE, UPDATE, DELETE (for all users)

#### 3. Special conditions:
- **Profile privacy**: Users can only edit their own profiles
- **Staff visibility**: Students/parents can see contact info for their teachers/managers
- **Academy scope**: Teachers/managers can see users within their academy
- **Family connections**: Parents access based on their children's academy relationships

#### 4. Implementation Strategy:
- **Own access**: Direct id = auth.uid() check
- **Students**: Check via classroom_students → classrooms → teacher_id/academy relationships
- **Parents**: Use get_user_family_students() + academy relationships
- **Teachers**: Check via teachers table → academy relationships
- **Managers**: Check via managers table → academy relationships
- **Super Admin**: role = 'super_admin' with full access

---

## Implementation Status

Major tables with RLS policies implemented:

**Core System Tables:**
- ✅ users, classrooms, classroom_students, classroom_sessions
- ✅ assignments, assignment_grades, assignment_attachments, assignment_comments
- ✅ attendance, student_reports, family_members

**Communication & Support:**
- ✅ notifications, chat_conversations, chat_messages

**Financial:**
- ✅ invoices

---

## Table: students

### Access Requirements

#### 1. Who can access students:
- **Students**: Can view and edit their own student record (phone, school_name only)
- **Parents**: Can view their children's student records (read-only)
- **Teachers**: Can view all students in their academy (read-only)
- **Managers**: Can view all students in their academy and edit active field only
- **Super Admin**: Full access to all student records

#### 2. Operations allowed:
- **Students**: READ (own record), UPDATE (phone, school_name only)
- **Parents**: READ only (children's records)
- **Teachers**: READ only (academy students)
- **Managers**: READ, UPDATE (active field only, academy students)
- **Super Admin**: READ, CREATE, UPDATE, DELETE (all records)

#### 3. Special conditions:
- **Limited self-editing**: Students can only update contact info (phone, school_name)
- **Manager control**: Only managers can activate/deactivate students
- **Academy scope**: Teachers and managers access scoped to their academy
- **Family privacy**: Parents can only see their own children's records

#### 4. Implementation Strategy:
- **Students**: user_id = auth.uid() for own record access
- **Parents**: Use get_user_family_students() function
- **Teachers**: Check via teachers table → academy_id match
- **Managers**: Check via managers table → academy_id match with active field update permission
- **Super Admin**: role = 'super_admin' with full access

---

---

## Table: parents

### Access Requirements

#### 1. Who can access parents:
- **Parents**: Can view and edit their own parent record (phone only)
- **Students**: Can view their parents' records (same family_id, read-only)
- **Teachers**: Can view all parents in their academy (read-only)
- **Managers**: Can view all parents in their academy and edit active field only
- **Super Admin**: Full access to all parent records

#### 2. Operations allowed:
- **Parents**: READ (own record), UPDATE (phone only)
- **Students**: READ only (their parents via family relationship)
- **Teachers**: READ only (academy parents)
- **Managers**: READ, UPDATE (active field only, academy parents)
- **Super Admin**: READ, CREATE, UPDATE, DELETE (all records)

#### 3. Special conditions:
- **Family visibility**: Students can see their parents through family_members relationship
- **Limited self-editing**: Parents can only update their phone number
- **Manager control**: Only managers can activate/deactivate parents
- **Academy scope**: Teachers and managers access scoped to their academy
- **Contact privacy**: Parents maintain control over their own contact information

#### 4. Implementation Strategy:
- **Parents**: user_id = auth.uid() for own record access
- **Students**: Check via family_members with same family_id
- **Teachers**: Check via teachers table → academy_id match
- **Managers**: Check via managers table → academy_id match with active field update permission
- **Super Admin**: role = 'super_admin' with full access

---

---

## Table: teachers

### Access Requirements

#### 1. Who can access teachers:
- **Teachers**: Can view and edit their own teacher record (phone only)
- **Students**: Can view teachers in their classrooms (read-only)
- **Parents**: Can view teachers in their children's classrooms (read-only)
- **Managers**: Can view all teachers in their academy and edit active field only
- **Super Admin**: Full access to all teacher records

#### 2. Operations allowed:
- **Teachers**: READ (own record), UPDATE (phone only)
- **Students**: READ only (their classroom teachers)
- **Parents**: READ only (their children's teachers)
- **Managers**: READ, UPDATE (active field only, academy teachers)
- **Super Admin**: READ, CREATE, UPDATE, DELETE (all records)

#### 3. Special conditions:
- **Classroom visibility**: Students/parents can see teachers through classroom enrollment
- **Limited self-editing**: Teachers can only update their phone number
- **Manager control**: Only managers can activate/deactivate teachers
- **Academy scope**: Manager access scoped to their academy
- **Educational contact**: Students/parents can access teacher contact info for educational purposes

#### 4. Implementation Strategy:
- **Teachers**: user_id = auth.uid() for own record access
- **Students**: Check via classroom_students → classrooms → teacher_id
- **Parents**: Use get_user_family_students() + classroom relationships
- **Managers**: Check via managers table → academy_id match with active field update permission
- **Super Admin**: role = 'super_admin' with full access

---

---

## Table: managers

### Access Requirements

#### 1. Who can access managers:
- **Managers**: Can view their own record and other managers in the same academy, edit own phone only
- **Students**: Can view managers in their classrooms (through academy relationship)
- **Parents**: Can view managers in their children's classrooms (through academy relationship)
- **Teachers**: Can view managers in their academy
- **Super Admin**: Full access to all manager records

#### 2. Operations allowed:
- **Managers**: READ (own record + same academy managers), UPDATE (own phone only)
- **Students**: READ only (managers in their classroom's academy)
- **Parents**: READ only (managers in their children's classroom's academy)
- **Teachers**: READ only (managers in their academy)
- **Super Admin**: READ, CREATE, UPDATE, DELETE (all records)

#### 3. Special conditions:
- **Academy visibility**: Students/parents see managers through classroom→academy relationship
- **Limited self-editing**: Managers can only update their phone number
- **Peer visibility**: Managers can see other managers in the same academy
- **Academy scope**: All access scoped to academy relationships
- **Active status**: Only super admin can change manager active status

#### 4. Implementation Strategy:
- **Managers**: user_id = auth.uid() for own record + same academy check for peers
- **Students**: Check via classroom_students → classrooms → academy_id
- **Parents**: Use get_user_family_students() + classroom → academy relationship
- **Teachers**: Check via teachers table → academy_id match
- **Super Admin**: role = 'super_admin' with full access

---

## 🎉 All User Role Tables Complete!

We have successfully implemented RLS policies for all user role tables:
- ✅ users (main user table)
- ✅ students (student profiles)
- ✅ parents (parent profiles)
- ✅ teachers (teacher profiles)
- ✅ managers (manager profiles)

**Still Need Implementation:**
- [ ] academies, academy_settings, subjects
- [ ] support_tickets, support_ticket_messages
- [ ] user_preferences
- [ ] Other administrative tables