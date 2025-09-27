const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function sendAlimTalk() {
  try {
    console.log('🔍 Checking for approved AlimTalk templates...\n');

    // Get approved templates - simpler approach
    const templates = await messageService.getKakaoAlimtalkTemplates({
      limit: 20
    });

    if (templates && templates.templateList && templates.templateList.length > 0) {
      console.log('✅ Found templates:\n');

      // Filter for approved templates
      const approvedTemplates = templates.templateList.filter(t => t.status === 'APPROVED');

      if (approvedTemplates.length === 0) {
        console.log('❌ No approved templates found. Current templates:');
        templates.templateList.forEach(t => {
          console.log(`- ${t.name} (Status: ${t.status})`);
        });
        return;
      }

      approvedTemplates.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name}`);
        console.log(`   Template ID: ${template.templateId}`);
        console.log(`   Channel ID: ${template.channelId}`);
        console.log(`   Status: ${template.status}`);
        console.log(`   Content: ${template.content || 'No content'}`);

        // Check for variables
        if (template.variables && template.variables.length > 0) {
          console.log(`   Variables: ${template.variables.map(v => v.name).join(', ')}`);
        }
        console.log('');
      });

      // Use the first approved template
      const template = approvedTemplates[0];
      console.log(`📱 Sending AlimTalk using template: "${template.name}"\n`);

      // Prepare variables if needed
      const variables = {};
      if (template.variables && template.variables.length > 0) {
        // Add default values for any required variables
        template.variables.forEach(v => {
          if (v.name === '#{url}') variables['#{url}'] = 'classraum.com';
          else if (v.name === '#{name}') variables['#{name}'] = '테스트';
          else if (v.name === '#{date}') variables['#{date}'] = '2025-09-26';
          else variables[v.name] = 'TEST';
        });
        console.log('Using variables:', variables);
      }

      // Send AlimTalk
      const response = await messageService.send({
        to: '01024169820',
        from: '01068301764',
        kakaoOptions: {
          pfId: template.channelId,
          templateId: template.templateId,
          variables: variables,
          // disableSms: true, // Uncomment to disable SMS fallback
        },
      });

      console.log('✅ AlimTalk sent successfully (FREE)!');
      console.log('Response:', JSON.stringify(response, null, 2));

      // Check the status
      const groupId = response.groupInfo.groupId;
      console.log(`\n📊 Message Group ID: ${groupId}`);
      console.log('Status:', response.groupInfo.status);

      if (response.failedMessageList && response.failedMessageList.length > 0) {
        console.log('\n⚠️ Failed messages:', response.failedMessageList);
      }

    } else {
      console.log('❌ No templates found.');
      console.log('Please check your templates at https://console.solapi.com');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.response && error.response.data) {
      console.log('Error details:', error.response.data);
    }
  }
}

// Run the test
sendAlimTalk()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });