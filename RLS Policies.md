# RLS Policies Summary

This document provides a comprehensive overview of Row Level Security (RLS) policies in the Classraum database. All tables have RLS enabled except for `chat_conversations`.

## Summary Overview

- **Total Tables**: 42
- **Tables with RLS Enabled**: 41
- **Tables without RLS**: 1 (`chat_conversations`)
- **Total RLS Policies**: 125+

## Tables and Their RLS Policies

### Core User Management

#### `users`
- **RLS Enabled**: Yes
- **Policies**:
  - `users_own_access`: Users can manage their own records (ALL operations)
  - `users_simple_access`: All authenticated users can view basic user info (SELECT)

#### `user_preferences`
- **RLS Enabled**: Yes
- **Policies**:
  - `user_preferences_own_only`: Users can only access their own preferences (ALL)
  - `users_own_preferences`: Duplicate policy for own preferences (ALL)

### Academy Management

#### `academies`
- **RLS Enabled**: Yes
- **Policies**:
  - `academies_manage_by_managers`: Managers can manage academies they're assigned to (ALL)
  - `academies_view_by_members`: Academy members can view their academy info (SELECT)

#### `academy_settings`
- **RLS Enabled**: Yes
- **Policies**:
  - `academy_managers_can_access_settings`: Managers and teachers can access academy settings (ALL)

#### `academy_subscriptions`
- **RLS Enabled**: Yes
- **Policies**:
  - `Managers can view own academy subscription`: Managers can view subscription for their academy (SELECT)
  - `System can manage all subscriptions`: System user can manage all subscriptions (ALL)

#### `academy_notes`
- **RLS Enabled**: Yes
- **Policies**:
  - `Admins can manage academy notes`: Admin and super_admin roles can manage notes (ALL)

### Role-Based Tables

#### `managers`
- **RLS Enabled**: Yes
- **Policies**:
  - `managers_select_policy`: Users can view their own manager record or if they're a manager (SELECT)

#### `teachers`
- **RLS Enabled**: Yes
- **Policies**:
  - `teachers_own_access`: Teachers can manage their own records (ALL)
  - `teachers_update_by_managers`: Managers can update teachers in their academy (UPDATE)
  - `teachers_view_by_managers`: Managers can view teachers in their academy (SELECT)

#### `parents`
- **RLS Enabled**: Yes
- **Policies**:
  - `parents_own_access`: Parents can manage their own records (ALL)
  - `parents_update_by_managers`: Managers can update parents in their academy (UPDATE)
  - `parents_view_by_staff`: Staff can view parents in their academy (SELECT)

#### `students`
- **RLS Enabled**: Yes
- **Policies**:
  - `students_own_access`: Students can manage their own records (ALL)
  - `students_update_by_managers`: Managers can update students in their academy (UPDATE)
  - `students_view_by_staff`: Staff can view students in their academy (SELECT)

### Family Structure

#### `families`
- **RLS Enabled**: Yes
- **Policies**:
  - `families_full_access_managers`: Managers can fully manage families in their academy (ALL)
  - `families_select_policy`: Managers can view families in their academy (SELECT)

#### `family_members`
- **RLS Enabled**: Yes
- **Policies**:
  - `Authenticated users can insert family members`: Authenticated users can create family member records (INSERT)
  - `Family members can view other family members`: Family members can see others in their family (SELECT)
  - `Managers can view family members in their academies`: Managers can view family structures (SELECT)
  - `Users can delete their own family member records`: Users can remove themselves from families (DELETE)
  - `Users can update their own family member records`: Users can update their family info (UPDATE)
  - `Users can view own family member records`: Users can view their own family records (SELECT)

### Classroom Management

#### `classrooms`
- **RLS Enabled**: Yes
- **Policies**:
  - `classrooms_managers_access`: Managers can fully manage classrooms in their academy (ALL)
  - `classrooms_parents_access`: Parents can view classrooms their children are in (SELECT)
  - `classrooms_students_access`: Students can view classrooms they're enrolled in (SELECT)
  - `classrooms_teachers_own_only`: Teachers can manage only their own classrooms (ALL)

#### `classroom_students`
- **RLS Enabled**: Yes
- **Policies**:
  - `classroom_students_managers_access`: Managers can manage student enrollments (ALL)
  - `classroom_students_parents_access`: Parents can view their children's enrollments (SELECT)
  - `classroom_students_students_access`: Students can view their own enrollments (SELECT)
  - `classroom_students_teachers_own_only`: Teachers can view enrollments for their classrooms (SELECT)

#### `classroom_schedules`
- **RLS Enabled**: Yes
- **Policies**:
  - `classroom_schedules_managers_access`: Managers can manage schedules for their academy (ALL)
  - `classroom_schedules_teachers_access`: Teachers can manage schedules for their classrooms (ALL)

#### `classroom_sessions`
- **RLS Enabled**: Yes
- **Policies**:
  - `classroom_sessions_managers_access`: Managers can manage all sessions in their academy (ALL)
  - `classroom_sessions_parents_access`: Parents can view sessions for their children's classes (SELECT)
  - `classroom_sessions_students_access`: Students can view sessions for their enrolled classes (SELECT)
  - `classroom_sessions_teachers_own_only`: Teachers can manage sessions for their classes or as substitutes (ALL)

### Assignments and Grading

#### `subjects`
- **RLS Enabled**: Yes
- **Policies**:
  - `Managers can delete subjects`: Managers can delete subjects in their academy (DELETE)
  - `Managers can insert subjects`: Managers can create subjects in their academy (INSERT)
  - `Managers can update subjects`: Managers can update subjects in their academy (UPDATE)
  - `Users can view subjects from their academy`: Academy members can view subjects (SELECT)

#### `assignment_categories`
- **RLS Enabled**: Yes
- **Policies**:
  - `assignment_categories_manage_by_managers`: Managers can manage categories in their academy (ALL)
  - `assignment_categories_view_by_academy`: Academy members can view categories (SELECT)

#### `assignments`
- **RLS Enabled**: Yes
- **Policies**:
  - `assignments_managers_access`: Managers can manage all assignments in their academy (ALL)
  - `assignments_parents_access`: Parents can view assignments for their children (SELECT)
  - `assignments_students_access`: Students can view assignments for their enrolled classes (SELECT)
  - `assignments_teachers_own_only`: Teachers can manage assignments for their classes (ALL)

#### `assignment_grades`
- **RLS Enabled**: Yes
- **Policies**:
  - `assignment_grades_full_access_staff`: Staff can manage grades using custom function (ALL)
  - `assignment_grades_student_access`: Students can view their own grades (SELECT)
  - `assignment_grades_view_by_parents`: Parents can view their children's grades (SELECT)
  - `assignment_grades_view_by_student`: Students can view their own grades (SELECT)

#### `assignment_comments`
- **RLS Enabled**: Yes
- **Policies**:
  - `assignment_comments_full_access_managers`: Managers can manage all comments (ALL)
  - `assignment_comments_full_access_teachers`: Teachers can manage comments for their assignments (ALL)
  - `assignment_comments_view_by_parents`: Parents can view comments on their children's assignments (SELECT)
  - `assignment_comments_view_by_students`: Students can view comments on their assignments (SELECT)

#### `assignment_attachments`
- **RLS Enabled**: Yes
- **Policies**:
  - `Teachers and managers can manage assignment attachments`: Staff can manage attachments (ALL)
  - `Teachers and managers can view assignment attachments`: Staff and students can view attachments (SELECT)

### Attendance

#### `attendance`
- **RLS Enabled**: Yes
- **Policies**:
  - `attendance_managers_access`: Managers can manage attendance for their academy (ALL)
  - `attendance_parents_access`: Parents can view their children's attendance (SELECT)
  - `attendance_students_access`: Students can view their own attendance (SELECT)
  - `attendance_teachers_own_only`: Teachers can manage attendance for their classes (ALL)

### Communication

#### `notifications`
- **RLS Enabled**: Yes
- **Policies**:
  - `notifications_own_only`: Users can only access their own notifications (ALL)

#### `chat_conversations`
- **RLS Enabled**: No
- **Note**: This table does not have RLS enabled, which means all authenticated users can potentially access all conversations.

#### `chat_messages`
- **RLS Enabled**: Yes
- **Policies**:
  - `Users can insert messages to their conversations`: Users can send messages to their conversations (INSERT)
  - `Users can update message read status`: Users can mark messages as read in their conversations (UPDATE)
  - `Users can view messages from their conversations`: Users can view messages from their conversations (SELECT)

### Reports and Comments

#### `student_reports`
- **RLS Enabled**: Yes
- **Policies**:
  - `Allow access to student_reports based on academy`: Teachers and managers can access reports for students in their academy (ALL)
  - `Parents can view their children's reports`: Parents can view their children's reports (SELECT)
  - `Students can view their own reports`: Students can view their own reports (SELECT)

#### `comment_reports`
- **RLS Enabled**: Yes
- **Policies**:
  - `comment_reports_full_access_managers`: Managers can manage comment reports (ALL)
  - `comment_reports_full_access_teachers`: Teachers can manage comment reports (ALL)
  - `comment_reports_insert_own`: Users can create their own comment reports (INSERT)
  - `comment_reports_view_own`: Users can view their own comment reports (SELECT)

### Billing and Payments

#### `invoices`
- **RLS Enabled**: Yes
- **Policies**:
  - `Managers can manage invoices for students in their academy`: Managers can manage invoices for their students (ALL)
  - `Students can view their own invoices`: Students can view their own invoices (SELECT)

#### `recurring_payment_templates`
- **RLS Enabled**: Yes
- **Policies**:
  - `Managers can manage recurring payment templates for their academy`: Managers can manage payment templates (ALL)

#### `recurring_payment_template_students`
- **RLS Enabled**: Yes
- **Policies**:
  - `Managers can manage recurring payment template students`: Managers can manage student payment assignments (ALL)

### Subscription Management

#### `subscription_usage`
- **RLS Enabled**: Yes
- **Policies**:
  - `Managers can view own academy usage`: Managers can view usage for their academy (SELECT)
  - `System can manage all usage`: System user can manage all usage data (ALL)
  - `Teachers can view own academy usage`: Teachers can view usage for their academy (SELECT)

#### `subscription_invoices`
- **RLS Enabled**: Yes
- **Policies**:
  - `Managers can view own academy invoices`: Managers can view invoices for their academy (SELECT)
  - `System can manage all invoices`: System user can manage all invoices (ALL)

### Admin and Support

#### `admin_activity_logs`
- **RLS Enabled**: Yes
- **Policies**:
  - `Admins can insert activity logs`: Admins can create activity logs (INSERT)
  - `Admins can view all activity logs`: Admins can view all activity logs (SELECT)

#### `admin_settings`
- **RLS Enabled**: Yes
- **Policies**:
  - `Admins can view non-sensitive settings`: Admins can view settings based on sensitivity (SELECT)
  - `Super admins can manage all settings`: Super admins have full access to all settings (ALL)

#### `support_tickets`
- **RLS Enabled**: Yes
- **Policies**:
  - `Admins can update support tickets`: Admins can update ticket status and assignments (UPDATE)
  - `Admins can view all support tickets`: Admins can view all tickets (SELECT)
  - `Users can create support tickets`: Users can create tickets (INSERT)
  - `Users can view their own support tickets`: Users can view their own tickets (SELECT)

#### `support_ticket_messages`
- **RLS Enabled**: Yes
- **Policies**:
  - `Users can create messages for their tickets`: Users and admins can add messages to tickets (INSERT)
  - `Users can view messages for their tickets`: Users can view messages for their tickets, excluding internal notes unless admin (SELECT)

#### `system_notifications`
- **RLS Enabled**: Yes
- **Policies**:
  - `Admins can manage system notifications`: Admins can manage system-wide notifications (ALL)
  - `Users can view active system notifications`: Users can view notifications targeted to them (SELECT)

## Security Patterns

### Common Access Patterns

1. **Own Data Access**: Most user-related tables allow users to manage their own data
2. **Manager Override**: Managers typically have broader access within their academy
3. **Teacher Scope**: Teachers can access data related to their classrooms
4. **Parent-Child Relationship**: Parents can view data for their children through family relationships
5. **Academy Isolation**: Most data is isolated by academy boundaries
6. **Admin Privileges**: Admin and super_admin roles have elevated access

### Custom Functions Used

- `is_same_academy()`: Checks if user belongs to the same academy
- `is_same_family()`: Checks if users are in the same family
- `can_access_assignment_grade()`: Complex function for grade access control
- `user_enrolled_classrooms()`: Returns classrooms a user is enrolled in

### Security Considerations

1. **No RLS on chat_conversations**: This could be a security risk as it allows unrestricted access
2. **System User**: Special UUID `00000000-0000-0000-0000-000000000000` has elevated privileges
3. **Complex Joins**: Many policies use complex JOIN operations which could impact performance
4. **Role-Based Access**: Heavy reliance on user roles stored in the users table

## Recommendations

1. **Enable RLS on chat_conversations**: This table should have RLS policies to prevent unauthorized access
2. **Performance Optimization**: Consider indexing strategies for frequently joined tables in RLS policies
3. **Policy Consolidation**: Some tables have redundant policies that could be simplified
4. **Documentation**: Consider adding comments to complex policies for maintainability