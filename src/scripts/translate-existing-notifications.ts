import { db } from '@/lib/supabase'

// Translation mapping for existing notifications
const notificationTranslations = [
  {
    id: "c9c02912-166f-46ef-bb22-bc197bf847a5",
    title_key: "notifications.content.session.reminder.title",
    message_key: "notifications.content.session.reminder.message", 
    title_params: {},
    message_params: { classroom: "수학", time: "15분 후" }
  },
  {
    id: "003bc9b5-874d-45c4-9e67-0f7c15cc5a5e",
    title_key: "notifications.content.system.welcome.title",
    message_key: "notifications.content.system.dashboard_update.message",
    title_params: {},
    message_params: {}
  },
  {
    id: "d2bd373f-2575-4b6b-a96a-b7615c6778f8", 
    title_key: "notifications.content.assignment.new.title",
    message_key: "notifications.content.assignment.new.message",
    title_params: {},
    message_params: { classroom: "수학", title: "숙제", dueDate: "내일" }
  },
  {
    id: "d424db7c-25e7-46b7-91dc-ce194422c01e",
    title_key: "notifications.content.student.family_registered.title", 
    message_key: "notifications.content.student.family_registered.message",
    title_params: {},
    message_params: { family: "Smith 가족", count: "2" }
  },
  {
    id: "6a32f410-4cc1-4af0-954d-2ecf1274d95b",
    title_key: "notifications.content.system.welcome.title",
    message_key: "notifications.content.system.welcome.message", 
    title_params: {},
    message_params: {}
  },
  {
    id: "97060ab6-2060-42dd-b023-42019ed68712",
    title_key: "notifications.content.attendance.update_required.title",
    message_key: "notifications.content.attendance.update_required.message",
    title_params: {},
    message_params: { classroom: "과학" }
  },
  {
    id: "564f2a46-2193-4cd0-9858-69c08155d0d2",
    title_key: "notifications.content.payment.success.title", 
    message_key: "notifications.content.payment.success.message",
    title_params: {},
    message_params: { student: "수강생", amount: "180,000" }
  },
  {
    id: "685044f3-8044-4e9c-b9ad-b650c90356c7",
    title_key: "notifications.content.session.scheduled.title",
    message_key: "notifications.content.session.scheduled.message", 
    title_params: {},
    message_params: { classroom: "수학", time: "오후 2:00", date: "내일", location: "101호" }
  },
  {
    id: "cdd5679a-ef86-4a8c-a970-30c5765bb56b",
    title_key: "notifications.content.teacher.added.title",
    message_key: "notifications.content.teacher.added.message",
    title_params: {},
    message_params: { teacher: "John Davis", subject: "수학" }
  },
  {
    id: "e5b7f9ea-2d79-44e0-9528-801144ba9e79",
    title_key: "notifications.content.attendance.reminder.title", 
    message_key: "notifications.content.attendance.reminder.message",
    title_params: {},
    message_params: { date: "어제" }
  }
]

/**
 * Script to translate existing notifications to Korean by adding translation keys and parameters
 */
export async function translateExistingNotifications() {
  console.log('Starting translation of existing notifications...')
  
  let successCount = 0
  let errorCount = 0
  
  for (const translation of notificationTranslations) {
    try {
      const { error } = await db
        .from('notifications')
        .update({
          title_key: translation.title_key,
          message_key: translation.message_key,
          title_params: translation.title_params,
          message_params: translation.message_params,
          updated_at: new Date().toISOString()
        })
        .eq('id', translation.id)
      
      if (error) {
        console.error(`Error updating notification ${translation.id}:`, error)
        errorCount++
      } else {
        console.log(`✅ Updated notification ${translation.id}`)
        successCount++
      }
    } catch (error) {
      console.error(`Exception updating notification ${translation.id}:`, error)
      errorCount++
    }
  }
  
  console.log(`\n📊 Translation Summary:`)
  console.log(`✅ Successfully updated: ${successCount} notifications`)
  console.log(`❌ Failed updates: ${errorCount} notifications`)
  
  return { successCount, errorCount }
}

// Run the script if called directly
if (require.main === module) {
  translateExistingNotifications()
    .then((result) => {
      console.log('\n🎉 Translation completed!', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Translation failed:', error)
      process.exit(1)
    })
}