const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function sendFinalTest() {
  try {
    console.log('📱 Sending KakaoTalk AlimTalk to 010-2299-7460\n');
    console.log('Configuration:');
    console.log('- Template: KA01TP221025083117992xkz17KyvNbr');
    console.log('- Channel: KA01PF2509260646100458NQzRI7JLb3');
    console.log('- Variables: #{홍길동} = "테스트", #{url} = "classraum.com"');
    console.log('- SMS: Disabled\n');

    const response = await messageService.send({
      to: '01022997460',
      from: '01068301764',
      kakaoOptions: {
        pfId: 'KA01PF2509260646100458NQzRI7JLb3',
        templateId: 'KA01TP221025083117992xkz17KyvNbr',
        variables: {
          '#{홍길동}': '테스트',
          '#{url}': 'classraum.com', // Just domain, template adds https://
        },
        disableSms: true, // KakaoTalk only
      },
    });

    console.log('✅ Request sent successfully!\n');

    // Detailed analysis
    console.log('📊 Delivery Details:');
    console.log('- Group ID:', response.groupInfo.groupId);
    console.log('- Status:', response.groupInfo.status);
    console.log('- Registered:', response.groupInfo.count.registeredSuccess);

    console.log('\n💰 Cost:');
    console.log('- Points charged:', response.groupInfo.point.sum);

    if (response.groupInfo.point.sum === 0) {
      console.log('🎉 FREE delivery via KakaoTalk AlimTalk!');
      console.log('\nRecipient will see:');
      console.log('-------------------');
      console.log('테스트님 가입을 환영합니다. (축하)');
      console.log('');
      console.log('가입 사실이 없는 경우');
      console.log('상담원에게 말씀해주시면');
      console.log('조치하겠습니다.');
      console.log('');
      console.log('[홈페이지 → https://classraum.com]');
      console.log('-------------------');
    } else {
      console.log(`⚠️ ${response.groupInfo.point.sum} points charged - sent as SMS`);
      console.log('Recipient may not have KakaoTalk linked to this number');
    }

    // Message type breakdown
    const types = response.groupInfo.countForCharge;
    console.log('\n📋 Type Breakdown:');
    if (types.ata && Object.keys(types.ata).length > 0) {
      console.log('- AlimTalk:', types.ata);
    }
    if (types.sms && Object.keys(types.sms).length > 0) {
      console.log('- SMS:', types.sms);
    }

    // Check failures
    if (response.failedMessageList && response.failedMessageList.length > 0) {
      console.log('\n❌ Failed:', response.failedMessageList);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run test
sendFinalTest()
  .then(() => console.log('\n✨ Done'))
  .catch(console.error);