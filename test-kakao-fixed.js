const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function sendKakaoFixed() {
  try {
    console.log('📱 Sending KakaoTalk AlimTalk with correct URL format...\n');
    console.log('Template expects: https://#{url}');
    console.log('We need to send just the domain without https://\n');

    // Send AlimTalk with correct URL format (without https://)
    const response = await messageService.send({
      to: '01024169820',
      from: '01068301764',
      kakaoOptions: {
        pfId: 'KA01PF2509260646100458NQzRI7JLb3',
        templateId: 'KA01TP221025083117992xkz17KyvNbr',
        variables: {
          '#{홍길동}': '테스트 사용자',
          '#{url}': 'classraum.com', // Just domain, no https://
        },
        disableSms: true, // Disable SMS fallback to ensure KakaoTalk only
      },
    });

    console.log('✅ AlimTalk sent (KakaoTalk ONLY - SMS disabled)\n');

    // Check the message details
    const countForCharge = response.groupInfo.countForCharge;

    console.log('📊 Message Delivery Details:');
    console.log('- Group ID:', response.groupInfo.groupId);
    console.log('- Status:', response.groupInfo.status);
    console.log('- Total messages:', response.groupInfo.count.total);
    console.log('- Successfully registered:', response.groupInfo.count.registeredSuccess);

    console.log('\n📋 Message Type:');
    if (countForCharge.ata && Object.keys(countForCharge.ata).length > 0) {
      console.log('- AlimTalk (ATA):', countForCharge.ata);
    }
    if (countForCharge.sms && Object.keys(countForCharge.sms).length > 0) {
      console.log('- SMS:', countForCharge.sms);
    }

    console.log('\n💰 Cost:');
    console.log('- Points charged:', response.groupInfo.point.sum);

    if (response.groupInfo.point.sum === 0) {
      console.log('🎉 SUCCESS! Sent as FREE KakaoTalk AlimTalk!');
      console.log('\nThe recipient will see in KakaoTalk:');
      console.log('-------------------');
      console.log('테스트 사용자님 가입을 환영합니다. (축하)');
      console.log('');
      console.log('가입 사실이 없는 경우');
      console.log('상담원에게 말씀해주시면');
      console.log('조치하겠습니다.');
      console.log('');
      console.log('[Button: 홈페이지 → https://classraum.com]');
      console.log('-------------------');
    } else {
      console.log('⚠️ Points were charged:', response.groupInfo.point.sum);
      console.log('The message was sent as SMS (not KakaoTalk)');
    }

    if (response.failedMessageList && response.failedMessageList.length > 0) {
      console.log('\n❌ Failed messages:');
      response.failedMessageList.forEach(fail => {
        console.log('- To:', fail.to);
        console.log('  Reason:', fail.reason);
        console.log('  Message:', fail.message);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('failedMessageList')) {
      console.log('\n💡 Message failed to send. Possible reasons:');
      console.log('1. Recipient doesn\'t have KakaoTalk');
      console.log('2. Phone number not linked to KakaoTalk');
      console.log('3. Template variable issue');
      console.log('\nSince disableSms is true, it won\'t fall back to SMS.');
    }
  }
}

// Run the test
sendKakaoFixed()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });