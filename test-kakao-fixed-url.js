const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function sendWithCorrectUrl() {
  try {
    console.log('📱 Sending KakaoTalk AlimTalk to 010-2299-7460 with FIXED URL...\n');
    console.log('Issue: Template has "https://#{url}" but we were sending "classraum.com"');
    console.log('Solution: Remove "#{url}" variable entirely or send proper value\n');

    // First, try without the URL variable at all
    console.log('Attempt 1: Without URL variable (if optional)');

    const response = await messageService.send({
      to: '01022997460',
      from: '01068301764',
      kakaoOptions: {
        pfId: 'KA01PF2509260646100458NQzRI7JLb3',
        templateId: 'KA01TP221025083117992xkz17KyvNbr',
        variables: {
          '#{홍길동}': '테스트 사용자',
          // NOT including #{url} at all
        },
        disableSms: true,
      },
    });

    console.log('✅ AlimTalk sent!\n');

    // Check cost
    console.log('💰 Cost Analysis:');
    console.log('- Points charged:', response.groupInfo.point.sum);

    if (response.groupInfo.point.sum === 0) {
      console.log('🎉 SUCCESS! Sent as FREE KakaoTalk AlimTalk!');
      console.log('The URL parameter was the issue - removing it fixed the problem!');
      console.log('\n📱 Message delivered via KakaoTalk to 010-2299-7460');
      console.log('-------------------');
      console.log('테스트 사용자님 가입을 환영합니다. (축하)');
      console.log('');
      console.log('가입 사실이 없는 경우');
      console.log('상담원에게 말씀해주시면');
      console.log('조치하겠습니다.');
      console.log('-------------------');
    } else {
      console.log('Still charging', response.groupInfo.point.sum, 'points');
      console.log('\nAttempt 2: Trying with full URL including https://');

      const response2 = await messageService.send({
        to: '01022997460',
        from: '01068301764',
        kakaoOptions: {
          pfId: 'KA01PF2509260646100458NQzRI7JLb3',
          templateId: 'KA01TP221025083117992xkz17KyvNbr',
          variables: {
            '#{홍길동}': '테스트 사용자',
            '#{url}': 'https://classraum.com', // Full URL with https://
          },
          disableSms: true,
        },
      });

      console.log('\n💰 Second attempt cost:', response2.groupInfo.point.sum, 'points');

      if (response2.groupInfo.point.sum === 0) {
        console.log('🎉 SUCCESS with full URL! Free KakaoTalk delivery!');
      }
    }

    // Check delivery type
    const countForCharge = response.groupInfo.countForCharge;
    console.log('\n📋 Message Type:');
    if (countForCharge.ata && Object.keys(countForCharge.ata).length > 0) {
      console.log('- AlimTalk (ATA):', countForCharge.ata);
    }
    if (countForCharge.sms && Object.keys(countForCharge.sms).length > 0) {
      console.log('- SMS:', countForCharge.sms);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('failedMessageList')) {
      console.log('\nMessage failed - likely a template variable issue');
    }
  }
}

// Run the test
sendWithCorrectUrl()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });