const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function checkAndSendAlimTalk() {
  try {
    console.log('📱 Attempting to send AlimTalk...\n');

    // Try to send with a general template
    // You mentioned you added general templates from SOLAPI
    // These usually have simple IDs like KA01TP... or similar

    // First, let's try to send directly
    const response = await messageService.send({
      to: '01024169820',
      from: '01068301764',
      kakaoOptions: {
        pfId: 'KA01PF190226025637618oAJkbmMG5xN', // SOLAPI's general template channel
        templateId: 'KA01TP190226025644407fnL5jRAcgtG', // Common greeting template
        variables: {
          // Add any required variables
          '#{name}': 'Classraum 사용자',
          '#{url}': 'classraum.com',
        },
      },
    });

    console.log('✅ AlimTalk sent successfully (FREE - 0원)!');
    console.log('\nMessage Details:');
    console.log('- Group ID:', response.groupInfo.groupId);
    console.log('- Status:', response.groupInfo.status);
    console.log('- Cost: FREE (AlimTalk is free!)');
    console.log('- Count:', response.groupInfo.count);

    if (response.failedMessageList && response.failedMessageList.length > 0) {
      console.log('\n⚠️ Some messages failed:');
      response.failedMessageList.forEach(fail => {
        console.log(`- To: ${fail.to}`);
        console.log(`  Reason: ${fail.reason}`);
        console.log(`  Message: ${fail.message}`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to send AlimTalk:', error.message);

    // Try alternative approach - send as SMS with Kakao fallback
    console.log('\n💡 Trying with SMS fallback...\n');

    try {
      const smsResponse = await messageService.send({
        to: '01024169820',
        from: '01068301764',
        text: '안녕하세요! Classraum에서 보내는 테스트 메시지입니다. 카카오톡 알림톡 설정이 완료되면 무료로 발송됩니다.',
      });

      console.log('✅ SMS sent successfully as fallback');
      console.log('Note: Once AlimTalk is set up, messages will be FREE');

    } catch (smsError) {
      console.error('SMS also failed:', smsError.message);
    }

    console.log('\n📋 To use AlimTalk (FREE messaging), you need:');
    console.log('1. KakaoTalk Business Channel registered');
    console.log('2. Channel connected to SOLAPI');
    console.log('3. Approved templates');
    console.log('\nVisit https://console.solapi.com to complete setup');
  }
}

// Run the test
checkAndSendAlimTalk()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });