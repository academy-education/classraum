const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function sendAlimTalkDirect() {
  try {
    console.log('📱 Sending KakaoTalk AlimTalk...\n');
    console.log('Template: Welcome message');
    console.log('To: 01024169820\n');

    // Your actual pfId from SOLAPI console
    const possiblePfIds = [
      'KA01PF2509260646100458NQzRI7JLb3', // Your actual channel ID
    ];

    let success = false;
    let successResponse = null;

    for (const pfId of possiblePfIds) {
      console.log(`Trying with pfId: ${pfId}`);

      try {
        const response = await messageService.send({
          to: '01024169820',
          from: '01068301764',
          kakaoOptions: {
            pfId: pfId,
            templateId: 'KA01TP221025083117992xkz17KyvNbr',
            variables: {
              '#{홍길동}': '테스트 사용자',
            },
          },
        });

        console.log('✅ SUCCESS! AlimTalk sent with pfId:', pfId);
        success = true;
        successResponse = response;
        break;

      } catch (error) {
        console.log(`❌ Failed with ${pfId}`);
      }
    }

    if (success) {
      console.log('\n🎉 AlimTalk sent successfully (FREE)!');
      console.log('\nMessage Details:');
      console.log('- Group ID:', successResponse.groupInfo.groupId);
      console.log('- Status:', successResponse.groupInfo.status);
      console.log('- Cost: 0원 (AlimTalk is FREE!)');

      console.log('\n📱 The message will appear in KakaoTalk as:');
      console.log('-------------------');
      console.log('테스트 사용자님 가입을 환영합니다. (축하)');
      console.log('');
      console.log('가입 사실이 없는 경우');
      console.log('상담원에게 말씀해주시면');
      console.log('조치하겠습니다.');
      console.log('-------------------');

    } else {
      console.log('\n❓ Could not determine the correct pfId.');
      console.log('\n📋 To find your correct pfId:');
      console.log('1. Log in to https://console.solapi.com');
      console.log('2. Go to 카카오 > 채널 관리');
      console.log('3. Find your connected channel');
      console.log('4. Copy the pfId shown there');
      console.log('\nOnce you have the pfId, update the code with it.');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

// Run the test
sendAlimTalkDirect()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });