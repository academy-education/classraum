# Classraum UI Specification

## Overview

Classraum is a SaaS platform for academy management.  
The UI is optimized for four user types: Managers, Teachers, Parents, and Students.

---

## 1. Dashboard (Managers & Teachers)

### Home Overview
- **KPIs:**  
  - Total Active Users  
  - Total Classrooms  
  - Total Students  
  - Total Parents  
  - Total Teachers  
  - Attendance Rate  
  - Attendance Distribution  
  - Top Performing Students

### Classroom Section
- **Features:** Filter, Search, Add Classroom
- **Add Classroom Popup:**  
  - Classroom Name  
  - Grade  
  - Subject  
  - Teacher  
  - Color  
  - Notes  
  - Schedule

- **Classroom Card:**  
  - Name  
  - Subject  
  - Main Teacher Name  
  - Students Count  
  - [View Details] Button  
  - [Triple Dot: Move to Trash]

#### Classroom Details Page
- **Modes:** View / Edit (Edit toggles Cancel/Save)
- **Sections:**  
  - Classroom Information (Name, Subject, Color, Grade, Students Count, Schedule)  
  - Teacher Information (Name)  
  - Notes  
  - Students Table (Name, Email, School, Phone, Status, Joined Date)  
      - **Actions:** View Profile, View Attendance, View Assignments, View Parents, Remove

- **Edit Mode:**  
  - Add Student (opens Side Sheet: Student List)

---

## 2. Sessions

- **Features:** Filter, Search, Add Session
- **Add Session Popup:**  
  - Classroom  
  - Substitute Teacher (checkbox: if checked, pick teacher)  
  - Date  
  - Create Multiple Sessions (checkbox: if checked, pick dates)  
  - Start Time  
  - End Time  
  - Location  
  - Notes

- **Session Card:**  
  - Classroom Name  
  - Subject  
  - Status  
  - Session Date  
  - Start–End Time  
  - Location  
  - [View Details] Button  
  - [Triple Dot: Move to Trash]

#### Session Details Page
- **Modes:** View / Edit (Edit toggles Cancel/Save)
- **Sections:**  
  - Session Information (Date, Start–End Time, Location, Status)  
  - Teacher Information (Name, Substitution Teacher)  
  - Notes  
  - Assignments  
      - **Add Assignment Button → Add Assignment Popup:**  
        - Type  
        - Title  
        - Description  
        - Due Date  
        - Category  
      - Assignment Cards (Name, Due Date)  
  - Attendance  
      - **Add Attendance Button → Side Sheet:** Student List (Name, Status, School, Note)

---

## 3. Assignments

- **Features:** Filter, Search
- **Assignment Cards:** Grade, Subject, Type, Category
- **Students Table:** Name, Grade, Feedback, Status, Submitted Date  
    - **Actions:** Save Changes (only if edited)

---

## 4. Attendance

- **Features:** Filter, Search
- **Attendance Cards:** Classroom, Grade, Subject, Session Date, Start–End Date, Location
- **Students Table:** Name, Status, Notes  
    - **Actions:** Save Changes (only if edited)

---

## 5. Reports

- **Features:** Filter, Search
- **Report Cards:** Name, Email, Phone, Classrooms Count, List of Classrooms, [View Reports]

#### Report Details Page
- **Sections:**  
  - Student Information: Avatar, Name, School Name, Enrolled Date
  - Tabs: View, Generate

**View Tab**
- Reports Table: Name, Status, Created Date  
    - **Actions:** Share, Download

**Generate Tab**
- Generate Report Form:  
  - Report Title  
  - Date Range (Start–End Date)  
  - Classrooms (multi-select)  
  - Assignment Categories
  - [Show Preview] Button

**Report Preview**
- Format:
  - Report for [Student Name]
  - Report Period: [Start–End Date]
  - Student Information: Name, Email, Phone, School Name
  - Summary: Total Assignments, Completed Assignments
  - Average Score (for graded assignments in range)
  - Classrooms: List (Subject, Grade, Avg. Score)
  - Score Over Time by Category: Line Graph (trend)
  - Homework/Quiz/Test ASOT: Line Graphs (each)
  - Student Percentile: Percentile Graph (indicator in class)
  - **AI Feedback Toggle:** Auto-writes student feedback
  - [Download Report] (PDF), [Send Report] (to student/parent)

---

## 6. Contacts

### Teachers
- **Features:** Filter (All, Active, Inactive), Search, Export, Add Teacher
- **Add Teacher Popup:** Copyable link with Academy ID & Role in params
- **Teachers Table:** Name, Email, Phone, Status, Joined Date  
    - **Actions:** View Profile, View Classrooms, Make Inactive/Active

### Families
- **Features:** Filter, Search, Add Family
- **Add Family Popup:**  
  - Parent Register Link (Academy ID, Family ID, Role)  
  - Student Register Link (Academy ID, Family ID, Role)
- **Family Cards:** Family ID, Created Date, Student/Parent Count, Names, [View Details]

#### Family Details Page
- **Modes:** View / Edit (Edit toggles Cancel/Save)
- **Sections:**  
  - Parents  
    - Add Parent (Side Sheet), Parent Table (View Profile, View Children, Make Inactive/Active, Remove)
  - Students  
    - Add Student (Side Sheet), Students Table (View Profile, View Attendance, View Assignments, View Parents, Make Inactive/Active, Remove)
- **Invite Popup:** Same links as Add Family Popup

### Parents
- **Features:** Filter (All, Active, Inactive), Search, Export
- **Parents Table:** Name, Email, Phone, Status, Joined Date  
    - **Actions:** View Profile, View Children, Make Inactive/Active

### Students
- **Features:** Filter (All, Active, Inactive), Search, Export
- **Students Table:** Name, Email, Phone, Status, Joined Date  
    - **Actions:** View Profile, View Attendance, View Assignments, View Parents, Make Inactive/Active

#### [View Profile / Attendance / Assignments / Parents] Popups
- Student/Parent profile info, attendance (tab: list/calendar), assignment list, parent/child list

---

## 7. General UI Patterns

- **[Triple Dot]:** Context menus for actions (edit, move to trash, etc)
- **Popup/Modal:** For add/edit flows
- **Side Sheet:** For adding students/parents (list selection)
- **Cards & Tables:** Use cards for entity summaries, tables for detailed lists
- **Tabs:** For toggling between view/generate/report

---

## 8. Accessibility & Responsiveness

- Mobile-optimized views for Parents & Students
- Responsive layouts for all dashboards and lists

---

## 9. Notifications

- All relevant actions (report send, assignment added, etc) trigger notification (KakaoTalk, Email, in-app)

---

## 10. Customization & Theming

- Color options for Classrooms and key UI sections

---

## 11. Quick Links

- [Copyable Registration Links]: For teachers, parents, students, families (parameterized for academy/family/role)
- [Export]: Export teachers, students, parents as CSV/Excel

---

**End of UI Spec**
