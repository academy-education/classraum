academies (managers, teachers, parents, students with same academy_id can view): 
id (uuid), name (text), address (text) 

assignment_categories (teachers, parents, students with same academy_id can view, managers with same academy_id has full access): 
id (uuid), name (text), academy_id (uuid) 

assignment_grades (students with same student_id has view access, parents in the same family of the students has view access, teachers of the classrooms of the session of the assignment has full access): 
id (uuid), assignment_id (uuid), student_id (uuid), score (numeric), feedback (text), status (enum: pending, submitted, graded, not submitted, excused, overdue) 

assignments (students in the classrooms of the sessions of the assignment has view access, parents in the same family of the students has view access, teachers of the classrooms of the session of the assignment has full access, managers of the academies of the classrooms of the session of the assignment has full access): 
id (uuid), assignment_type (enum: quiz, homework, test, project), title (text), description (text), due date (date), classroom_session_id (uuid), assignment_categories_id (uuid), deleted_at (timestamp) 

attendance (students in the classrooms of the sessions of the attendance has view access, parents in the same family of the students has view access, teachers of the classrooms of the session of the assignment has full access, managers in the academies of the classrooms of the session of the attendance has full access): 
id (uuid), classroom_session_id (uuid), student_id (uuid), status (enum: present, absent, excused, late, other), note (text) 

classroom_schedules (students in the classrooms of the schedule has view access, parents in the same family of the students has view access, teachers of the classrooms of the schedule has full access, managers in the academies of the classroom of the schedule has full access): 
id (uuid), classroom_id (uuid), day (enum: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday), start_time (text), end_time (text) 

classroom_sessions (students in the classrooms of the session has view access, parents in the same family of the students has view access, teachers of the classrooms of the sessions has full access, managers in the academies of the classroom of the schedule has full access): 
id (uuid), classroom_id (uuid), status (enum: scheduled, completed, cancelled), date (date), start_time (text), end_time (text), location (enum: offline, online), notes (text), deleted_at (timestamp), substitute_teacher (uuid)

classroom_students (students in the classrooms has view access, parents in the same family of the students has view access, teachers of the classrooms has full access, managers in the academies of the classroom has full access): 
id (uuid), classroom_id (uuid), student_id (uuid) 

classrooms (students in the classroom_students has view access, parents in the same family of the students has view access, teachers of the classrooms has full access, managers in the academies of the classroom has full access): 
id (uuid), name (text), grade (text), subject (text), teacher_id (uuid), color (text), notes (text), academy_id (uuid), deleted_at (timestamp) 

assignment_comments (students in the classrooms of the assignments of the assignment_comments has view access, parents in the same family of the students has view access, teachers of the classrooms of the sessions of the assignments of the comments has full access, managers in the academies of the classrooms of the sessions of the assignments of the comments has full access): 
id (uuid), assignment_id (uuid), text (text), user_id (uuid) 

families (students in the families has view access, parents in the families has view access, managers in the academies of the families has full access):
id (uuid), academy_id (uuid) 

family_members (students in the same family has view access, parents in the same family has view access, managers in the academies of the family_members of the familes has full access): 
user_id (uuid), family_id (uuid), role (enum: student, parent) 

managers (managers in the academies has view access): 
user_id (uuid), academy_id (uuid), phone (text), active (bool) 

notifications (user_id = auth.uid() only): 
id (uuid), user_id (uuid), title (text), message (text), type (enum: grade, attendance, success, report), is_read (bool) 

parents (user_id = auth.uid(), teachers in the academies of the parents has view access, managers in the academies of the parents has full access): 
user_id (uuid), academy_id (uuid), phone (text), active (bool) 

comment_reports (user_id = auth.uid(), teachers in the academies of the classrooms of the sessions of the assignments of the comments of the comment_reports has full access, managers in the academies of the classrooms of the sessions of the assignments of the comments of the comment_reports has full access): 
id (uuid), comment_id (uuid), text (text), user_id (uuid), report_type (enum: spam, abuse, other)

students (user_id = auth.uid(), teachers in the academies of the students has view access, managers in the academies of the students has full access): 
user_id (uuid), academy_id (uuid), phone (text), active (bool), school_name (text) 

teachers (user_id = auth.uid(), teachers in the academies of the teachers has view access, managers in the academies of the teachers has full access): 
user_id (uuid), academy_id (uuid), phone (text), active (bool) 

user_preferences (user_id = auth.uid()): 
user_id (uuid), push_notifications (bool), language (enum: korean, english), theme (light, dark, system) 

users (users can update their own data, all users can view other users data if they are in the same academy): 
id (uuid), name (text), email (text), role (enum: manager, teacher, parent, student)