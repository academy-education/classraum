const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function sendFriendTalk() {
  try {
    console.log('📱 Attempting to send KakaoTalk FriendTalk (no template required)...\n');

    // FriendTalk doesn't require a template - just free text!
    const response = await messageService.send({
      to: '01024169820',
      from: '01068301764',
      text: '안녕하세요! Classraum에서 보내는 카카오톡 친구톡 테스트입니다.\n\n템플릿 없이 자유롭게 메시지를 보낼 수 있습니다.',
      kakaoOptions: {
        pfId: 'KA01PF250926061345475sNlE9xhFn0E', // You need to replace this with your actual pfId
        // Optional: Add buttons
        buttons: [
          {
            buttonType: 'WL',
            buttonName: 'Classraum 바로가기',
            linkMo: 'https://classraum.com',
            linkPc: 'https://classraum.com',
          }
        ]
      },
    });

    console.log('✅ FriendTalk sent successfully!');
    console.log('Response:', JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('❌ Failed to send FriendTalk:', error.message);

    if (error.message.includes('pfId')) {
      console.log('\n💡 You need to set up a KakaoTalk Business Channel first:');
      console.log('1. Register at https://business.kakao.com');
      console.log('2. Connect it at https://console.solapi.com');
      console.log('3. Get your pfId from the SOLAPI console');
      console.log('4. Recipients must be friends with your channel');
    } else if (error.message.includes('잔액')) {
      console.log('\n💡 Insufficient balance. FriendTalk costs more than SMS.');
      console.log('Please recharge your account at https://console.solapi.com');
    } else {
      console.log('\n💡 Note: Recipients must be friends with your KakaoTalk channel');
      console.log('Unlike AlimTalk, FriendTalk is considered advertising/marketing');
    }
  }
}

// Run the test
sendFriendTalk()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });