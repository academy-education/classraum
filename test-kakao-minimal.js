const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function testMinimalKakao() {
  try {
    console.log('📱 Testing AlimTalk with different variable combinations...\n');

    // Test 1: Only required variable
    console.log('Test 1: Only name variable (no URL)');
    try {
      const response1 = await messageService.send({
        to: '01024169820',
        from: '01068301764',
        kakaoOptions: {
          pfId: 'KA01PF2509260646100458NQzRI7JLb3',
          templateId: 'KA01TP221025083117992xkz17KyvNbr',
          variables: {
            '#{홍길동}': '테스트',
            // Not including #{url} to see if it's optional
          },
          disableSms: true,
        },
      });
      console.log('✅ Sent! Points charged:', response1.groupInfo.point.sum);
      if (response1.groupInfo.point.sum === 0) {
        console.log('🎉 FREE KakaoTalk delivery confirmed!');
      }
    } catch (e) {
      console.log('❌ Failed:', e.message);
    }

    console.log('\n-------------------\n');

    // Test 2: With empty URL
    console.log('Test 2: With empty URL variable');
    try {
      const response2 = await messageService.send({
        to: '01024169820',
        from: '01068301764',
        kakaoOptions: {
          pfId: 'KA01PF2509260646100458NQzRI7JLb3',
          templateId: 'KA01TP221025083117992xkz17KyvNbr',
          variables: {
            '#{홍길동}': '테스트',
            '#{url}': '', // Empty URL
          },
          disableSms: true,
        },
      });
      console.log('✅ Sent! Points charged:', response2.groupInfo.point.sum);
      if (response2.groupInfo.point.sum === 0) {
        console.log('🎉 FREE KakaoTalk delivery confirmed!');
      }
    } catch (e) {
      console.log('❌ Failed:', e.message);
    }

    console.log('\n-------------------\n');

    // Test 3: Try different number format
    console.log('Test 3: Testing with your own KakaoTalk number');
    console.log('(Replace 01068301764 with your KakaoTalk-linked number for testing)');
    try {
      const response3 = await messageService.send({
        to: '01068301764', // Trying sender's number (likely has KakaoTalk)
        from: '01068301764',
        kakaoOptions: {
          pfId: 'KA01PF2509260646100458NQzRI7JLb3',
          templateId: 'KA01TP221025083117992xkz17KyvNbr',
          variables: {
            '#{홍길동}': '본인',
          },
          disableSms: true,
        },
      });
      console.log('✅ Sent! Points charged:', response3.groupInfo.point.sum);
      if (response3.groupInfo.point.sum === 0) {
        console.log('🎉 FREE KakaoTalk delivery confirmed!');
        console.log('The issue is that 01024169820 doesn\'t have KakaoTalk linked.');
      } else {
        console.log('Still charging points - template/channel configuration issue.');
      }
    } catch (e) {
      console.log('❌ Failed:', e.message);
    }

    console.log('\n💡 Summary:');
    console.log('If all tests charge points (13 for SMS), the issue is likely:');
    console.log('1. The channel is not properly configured for AlimTalk');
    console.log('2. The template has issues');
    console.log('3. Check SOLAPI console for the exact error');
    console.log('\nIf sending to your own number works for free, then 01024169820 doesn\'t have KakaoTalk.');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

// Run the test
testMinimalKakao()
  .then(() => {
    console.log('\n✨ All tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  });