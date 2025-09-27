const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function checkChannel() {
  try {
    console.log('🔍 Looking for your KakaoTalk channel and template...\n');

    // Get all templates to find the channel ID
    const templates = await messageService.getKakaoAlimtalkTemplates({
      templateId: 'KA01TP221025083117992xkz17KyvNbr'
    });

    if (templates && templates.templateList && templates.templateList.length > 0) {
      const template = templates.templateList[0];

      console.log('✅ Found your template!\n');
      console.log('Template Details:');
      console.log('- Name:', template.name);
      console.log('- Template ID:', template.templateId);
      console.log('- Channel ID (pfId):', template.channelId);
      console.log('- Status:', template.status);
      console.log('- Content:', template.content);

      if (template.variables && template.variables.length > 0) {
        console.log('\nVariables required:');
        template.variables.forEach(v => {
          console.log(`- ${v.name}`);
        });
      }

      console.log('\n📱 Now sending AlimTalk with correct channel ID...\n');

      // Send with the correct channel ID
      const response = await messageService.send({
        to: '01024169820',
        from: '01068301764',
        kakaoOptions: {
          pfId: template.channelId, // Use the actual channel ID from the template
          templateId: 'KA01TP221025083117992xkz17KyvNbr',
          variables: {
            '#{홍길동}': '테스트',
          },
        },
      });

      console.log('✅ AlimTalk sent successfully (FREE)!');
      console.log('\nMessage Status:');
      console.log('- Group ID:', response.groupInfo.groupId);
      console.log('- Status:', response.groupInfo.status);
      console.log('- Messages sent:', response.groupInfo.count.registeredSuccess);
      console.log('- Cost: 0원 (AlimTalk is FREE!)');

      if (response.failedMessageList && response.failedMessageList.length > 0) {
        console.log('\n⚠️ Failed messages:', response.failedMessageList);
      }

    } else {
      console.log('❌ Could not find template with ID: KA01TP221025083117992xkz17KyvNbr');

      // Try to list all templates
      console.log('\n📋 Checking all available templates...\n');

      const allTemplates = await messageService.getKakaoAlimtalkTemplates({
        limit: 20
      });

      if (allTemplates && allTemplates.templateList) {
        allTemplates.templateList.forEach((t, index) => {
          console.log(`${index + 1}. ${t.name}`);
          console.log(`   ID: ${t.templateId}`);
          console.log(`   Channel: ${t.channelId}`);
          console.log(`   Status: ${t.status}\n`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkChannel()
  .then(() => {
    console.log('\n✨ Done');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });