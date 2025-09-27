const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function testKakaoTalk() {
  try {
    // First, let's check if you have any registered templates
    console.log('🔍 Checking for registered KakaoTalk templates...\n');

    const templates = await messageService.getKakaoAlimtalkTemplates({
      status: 'APPROVED', // Only show approved templates
      limit: 10
    });

    if (templates.templateList && templates.templateList.length > 0) {
      console.log('📋 Found approved templates:');
      templates.templateList.forEach((template, index) => {
        console.log(`\n${index + 1}. Template: ${template.name}`);
        console.log(`   ID: ${template.templateId}`);
        console.log(`   Channel: ${template.channelId}`);
        console.log(`   Status: ${template.status}`);
        console.log(`   Content Preview: ${template.content.substring(0, 100)}...`);
      });

      // If templates exist, you can send a message
      const firstTemplate = templates.templateList[0];
      console.log('\n\n💬 Ready to send AlimTalk with template:', firstTemplate.name);

      // Example of sending AlimTalk (uncomment to actually send)
      /*
      const result = await messageService.send({
        to: '01024169820',
        from: '01068301764',
        kakaoOptions: {
          pfId: firstTemplate.channelId,
          templateId: firstTemplate.templateId,
          variables: {
            // Add any template variables here if needed
            // "#{name}": "홍길동",
            // "#{date}": "2025-09-26"
          }
        }
      });

      console.log('✅ AlimTalk sent successfully:', result);
      */

    } else {
      console.log('❌ No approved KakaoTalk templates found.\n');
      console.log('To use KakaoTalk messaging, you need to:');
      console.log('1. Register your KakaoTalk Business Channel at https://business.kakao.com');
      console.log('2. Connect your channel to SOLAPI at https://console.solapi.com');
      console.log('3. Create and get approval for AlimTalk templates');
      console.log('\nAlimTalk templates require approval from Kakao and typically take 1-2 business days.');
    }

    // Check all templates including pending ones
    console.log('\n\n📊 Checking all templates (including pending)...\n');
    const allTemplates = await messageService.getKakaoAlimtalkTemplates({
      limit: 10
    });

    if (allTemplates.templateList && allTemplates.templateList.length > 0) {
      const statusCount = {};
      allTemplates.templateList.forEach(template => {
        statusCount[template.status] = (statusCount[template.status] || 0) + 1;
      });

      console.log('Template Status Summary:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`- ${status}: ${count} template(s)`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);

    if (error.message && error.message.includes('pfId')) {
      console.log('\n💡 It seems you haven\'t connected a KakaoTalk channel yet.');
      console.log('Please visit https://console.solapi.com to connect your KakaoTalk Business Channel.');
    }
  }
}

// Run the test
testKakaoTalk()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });