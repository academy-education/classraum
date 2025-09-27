const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function sendWelcomeAlimTalk() {
  try {
    console.log('📱 Sending KakaoTalk AlimTalk (FREE) with your welcome template...\n');
    console.log('Template: KA01TP221025083117992xkz17KyvNbr');
    console.log('Message preview:');
    console.log('-------------------');
    console.log('테스트님 가입을 환영합니다. (축하)');
    console.log('');
    console.log('가입 사실이 없는 경우');
    console.log('상담원에게 말씀해주시면');
    console.log('조치하겠습니다.');
    console.log('-------------------\n');

    // Send AlimTalk with your actual template
    const response = await messageService.send({
      to: '01024169820',
      from: '01068301764',
      kakaoOptions: {
        pfId: 'KA01PF241025082729011v4nvnaaqhsq', // Your connected channel ID
        templateId: 'KA01TP221025083117992xkz17KyvNbr', // Your template ID
        variables: {
          '#{홍길동}': '테스트', // Replace the name variable
        },
      },
    });

    console.log('✅ AlimTalk sent successfully!');
    console.log('\n📊 Message Details:');
    console.log('- Group ID:', response.groupInfo.groupId);
    console.log('- Status:', response.groupInfo.status);
    console.log('- Total messages:', response.groupInfo.count.total);
    console.log('- Registered:', response.groupInfo.count.registeredSuccess);
    console.log('- Cost: FREE! (0원 - AlimTalk is free!)');

    // Check balance impact
    console.log('\n💰 Balance Information:');
    console.log('- Points used:', response.groupInfo.point.sum || 0);
    console.log('- Balance used:', response.groupInfo.balance.sum || 0);

    if (response.failedMessageList && response.failedMessageList.length > 0) {
      console.log('\n⚠️ Failed messages:');
      response.failedMessageList.forEach(fail => {
        console.log(`- To: ${fail.to}`);
        console.log(`  Reason: ${fail.reason}`);
      });
    } else {
      console.log('\n🎉 Message queued for delivery via KakaoTalk!');
      console.log('The recipient will receive this as a KakaoTalk notification.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message && error.message.includes('failedMessageList')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure the pfId matches your connected channel');
      console.log('2. Verify the template ID is correct');
      console.log('3. Check that all required variables are provided');
      console.log('4. The recipient phone number must have KakaoTalk installed');
    }
  }
}

// Run the test
sendWelcomeAlimTalk()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });