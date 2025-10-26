// CSV Parser for Family Import
// Handles parsing, validation, and grouping of family import CSV files
// Supports bilingual headers (English and Korean)

export interface CSVRow {
  family_id: string
  role: string
  user_name: string
  phone?: string
  email?: string
}

// Header mapping for bilingual support
const HEADER_MAP: Record<string, string> = {
  'family_id': 'family_id',
  '가족번호': 'family_id',
  'role': 'role',
  '역할': 'role',
  'user_name': 'user_name',
  '이름': 'user_name',
  'phone': 'phone',
  '전화번호': 'phone',
  'email': 'email',
  '이메일': 'email'
}

export interface FamilyMember {
  role: 'student' | 'parent'
  user_name: string
  phone?: string
  email?: string
  rowIndex: number // For error reporting
}

export interface GroupedFamily {
  family_id: string
  members: FamilyMember[]
  errors: string[]
  name?: string // Auto-generated family name
}

export interface ValidationError {
  rowIndex: number
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  groupedFamilies: GroupedFamily[]
  validCount: number
  errorCount: number
}

// Role mapping for bilingual support
const ROLE_MAP: Record<string, 'student' | 'parent' | null> = {
  'student': 'student',
  '학생': 'student',
  'parent': 'parent',
  '부모': 'parent'
}

/**
 * Normalize role to English
 */
export function normalizeRole(role: string): 'student' | 'parent' | null {
  const normalized = role.trim().toLowerCase()
  return ROLE_MAP[normalized] || ROLE_MAP[role.trim()] || null
}

/**
 * Normalize header to English
 */
function normalizeHeader(header: string): string | null {
  const trimmed = header.trim()
  return HEADER_MAP[trimmed.toLowerCase()] || HEADER_MAP[trimmed] || null
}

/**
 * Parse CSV file to array of objects
 */
export async function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())

        if (lines.length < 2) {
          reject(new Error('CSV file is empty or has no data rows'))
          return
        }

        // Parse and normalize headers
        const rawHeaders = parseCSVLine(lines[0])
        const headers: (string | null)[] = rawHeaders.map(h => normalizeHeader(h))

        // Validate required headers
        const requiredHeaders = ['family_id', 'role', 'user_name']
        const normalizedHeaders = headers.filter(h => h !== null) as string[]
        const missingHeaders = requiredHeaders.filter(h => !normalizedHeaders.includes(h))

        if (missingHeaders.length > 0) {
          reject(new Error(`Missing required columns: ${missingHeaders.join(', ')}`))
          return
        }

        // Parse rows
        const rows: CSVRow[] = []
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const values = parseCSVLine(line)
          const row: any = {}

          headers.forEach((header, index) => {
            if (header) {
              row[header] = values[index] || ''
            }
          })

          rows.push(row as CSVRow)
        }

        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Parse a CSV line, handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  if (!email) return true // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone format (basic check)
 */
function isValidPhone(phone: string): boolean {
  if (!phone) return true // Phone is optional
  // Allow numbers, spaces, hyphens, parentheses, and plus
  const phoneRegex = /^[\d\s\-\(\)\+]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8
}

/**
 * Validate all rows and return detailed results
 */
export function validateFamilyCSV(rows: CSVRow[], language: 'english' | 'korean' = 'english'): ValidationResult {
  const errors: ValidationError[] = []
  const familyGroups: Map<string, FamilyMember[]> = new Map()

  // Track emails to detect duplicates
  const emailSet = new Set<string>()

  rows.forEach((row, index) => {
    const rowIndex = index + 2 // +2 because: +1 for header, +1 for 0-indexed

    // Validate family_id
    if (!row.family_id || !row.family_id.trim()) {
      errors.push({
        rowIndex,
        field: 'family_id',
        message: 'Family ID is required'
      })
    }

    // Validate and normalize role
    const normalizedRole = normalizeRole(row.role)
    if (!normalizedRole) {
      errors.push({
        rowIndex,
        field: 'role',
        message: `Invalid role. Must be 'student', '학생', 'parent', or '부모'`
      })
    }

    // Validate user_name
    if (!row.user_name || !row.user_name.trim()) {
      errors.push({
        rowIndex,
        field: 'user_name',
        message: 'User name is required'
      })
    }

    // Validate email format
    if (row.email && !isValidEmail(row.email)) {
      errors.push({
        rowIndex,
        field: 'email',
        message: 'Invalid email format'
      })
    }

    // Check for duplicate emails
    if (row.email && row.email.trim()) {
      const email = row.email.trim().toLowerCase()
      if (emailSet.has(email)) {
        errors.push({
          rowIndex,
          field: 'email',
          message: 'Duplicate email found in CSV'
        })
      } else {
        emailSet.add(email)
      }
    }

    // Validate phone format
    if (row.phone && !isValidPhone(row.phone)) {
      errors.push({
        rowIndex,
        field: 'phone',
        message: 'Invalid phone number format'
      })
    }

    // Group by family_id (only if row is valid)
    const rowErrors = errors.filter(e => e.rowIndex === rowIndex)
    if (rowErrors.length === 0 && normalizedRole) {
      const familyId = row.family_id.trim()
      if (!familyGroups.has(familyId)) {
        familyGroups.set(familyId, [])
      }

      familyGroups.get(familyId)!.push({
        role: normalizedRole,
        user_name: row.user_name.trim(),
        phone: row.phone?.trim(),
        email: row.email?.trim(),
        rowIndex
      })
    }
  })

  // Check for empty families
  familyGroups.forEach((members, familyId) => {
    if (members.length === 0) {
      errors.push({
        rowIndex: -1,
        field: 'family_id',
        message: `Family ${familyId} has no valid members`
      })
    }
  })

  // Create grouped families
  const groupedFamilies: GroupedFamily[] = Array.from(familyGroups.entries()).map(([family_id, members]) => {
    // Get family errors
    const familyErrors = errors
      .filter(e => members.some(m => m.rowIndex === e.rowIndex))
      .map(e => `Row ${e.rowIndex}, ${e.field}: ${e.message}`)

    return {
      family_id,
      members,
      errors: familyErrors,
      name: generateFamilyName(members, language)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    groupedFamilies,
    validCount: groupedFamilies.filter(f => f.errors.length === 0).length,
    errorCount: errors.length
  }
}

/**
 * Generate family name based on first student
 */
export function generateFamilyName(members: FamilyMember[], language: 'english' | 'korean'): string {
  // Find first student
  const firstStudent = members.find(m => m.role === 'student')

  if (!firstStudent) {
    // If no student, use first parent
    const firstParent = members.find(m => m.role === 'parent')
    if (firstParent) {
      return language === 'korean'
        ? `${firstParent.user_name} 가족`
        : `${firstParent.user_name} Family`
    }
    // Fallback
    return language === 'korean' ? '이름 없는 가족' : 'Unnamed Family'
  }

  return language === 'korean'
    ? `${firstStudent.user_name} 가족`
    : `${firstStudent.user_name} Family`
}

/**
 * Group rows by family_id
 */
export function groupByFamily(rows: CSVRow[]): GroupedFamily[] {
  const result = validateFamilyCSV(rows)
  return result.groupedFamilies
}

/**
 * Generate CSV template content based on language
 */
export function generateCSVTemplate(language: 'english' | 'korean' = 'english'): string {
  if (language === 'korean') {
    // Korean template
    const header = '가족번호,역할,이름,전화번호,이메일'
    const examples = [
      '1,학생,홍길동,010-1234-5678,hong@example.com',
      '1,부모,홍부모,010-9876-5432,parent@example.com',
      '2,학생,김철수,010-1111-2222,kim@example.com',
      '2,부모,김부모,010-3333-4444,kimparent@example.com'
    ]
    return [header, ...examples].join('\n')
  } else {
    // English template
    const header = 'family_id,role,user_name,phone,email'
    const examples = [
      '1,student,John Smith,010-1234-5678,john@example.com',
      '1,parent,Jane Smith,010-9876-5432,jane@example.com',
      '2,student,Tom Brown,010-1111-2222,tom@example.com',
      '2,parent,Mary Brown,010-3333-4444,mary@example.com'
    ]
    return [header, ...examples].join('\n')
  }
}

/**
 * Download CSV template
 */
export function downloadCSVTemplate(language: 'english' | 'korean' = 'english'): void {
  const content = generateCSVTemplate(language)
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' }) // Add BOM for Excel
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  const filename = language === 'korean'
    ? 'family_import_template_ko.csv'
    : 'family_import_template_en.csv'

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
