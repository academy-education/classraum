const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function sendToAnotherNumber() {
  try {
    console.log('📱 Sending KakaoTalk AlimTalk to 010-2299-7460...\n');
    console.log('Settings: SMS completely disabled (KakaoTalk only)');
    console.log('Template: Welcome message\n');

    // Send AlimTalk to the new number with SMS disabled
    const response = await messageService.send({
      to: '01022997460', // New number to test
      from: '01068301764',
      kakaoOptions: {
        pfId: 'KA01PF2509260646100458NQzRI7JLb3',
        templateId: 'KA01TP221025083117992xkz17KyvNbr',
        variables: {
          '#{홍길동}': '테스트 사용자',
        },
        disableSms: true, // SMS completely disabled
      },
    });

    console.log('✅ AlimTalk request sent!\n');

    // Check delivery status
    console.log('📊 Delivery Details:');
    console.log('- Group ID:', response.groupInfo.groupId);
    console.log('- Status:', response.groupInfo.status);
    console.log('- Messages registered:', response.groupInfo.count.registeredSuccess);

    // Check cost
    console.log('\n💰 Cost Analysis:');
    console.log('- Points charged:', response.groupInfo.point.sum);
    console.log('- Balance used:', response.groupInfo.balance.sum);

    if (response.groupInfo.point.sum === 0) {
      console.log('🎉 SUCCESS! Sent as FREE KakaoTalk AlimTalk!');
      console.log('\nRecipient will receive in KakaoTalk:');
      console.log('-------------------');
      console.log('테스트 사용자님 가입을 환영합니다. (축하)');
      console.log('');
      console.log('가입 사실이 없는 경우');
      console.log('상담원에게 말씀해주시면');
      console.log('조치하겠습니다.');
      console.log('-------------------');
    } else {
      console.log('⚠️ Points were charged:', response.groupInfo.point.sum);
      console.log('This indicates the message was sent as SMS instead of KakaoTalk');
    }

    // Check for failures
    if (response.failedMessageList && response.failedMessageList.length > 0) {
      console.log('\n❌ Message delivery failed:');
      response.failedMessageList.forEach(fail => {
        console.log('- To:', fail.to);
        console.log('  Reason:', fail.reason);
        console.log('  Message:', fail.message);
      });
      console.log('\nSince SMS is disabled, failed KakaoTalk delivery means no message sent.');
    } else {
      console.log('\n✅ No delivery failures reported');
    }

    // Message type breakdown
    const countForCharge = response.groupInfo.countForCharge;
    console.log('\n📋 Message Type Breakdown:');

    if (countForCharge.ata && Object.keys(countForCharge.ata).length > 0) {
      console.log('- AlimTalk (ATA):', countForCharge.ata);
    }
    if (countForCharge.sms && Object.keys(countForCharge.sms).length > 0) {
      console.log('- SMS:', countForCharge.sms);
    }

    console.log('\n📱 Testing Summary:');
    console.log('- 010-2416-9820: ✅ Received KakaoTalk (you confirmed)');
    console.log('- 010-6267-1171: ❌ Sent as SMS (13 points charged)');
    console.log('- 010-2299-7460: ' + (response.groupInfo.point.sum === 0 ? '✅ FREE KakaoTalk' : '❌ SMS (' + response.groupInfo.point.sum + ' points)'));

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('failedMessageList')) {
      console.log('\nThis typically means the recipient cannot receive KakaoTalk AlimTalk');
      console.log('and SMS is disabled, so no message was delivered.');
    }
  }
}

// Run the test
sendToAnotherNumber()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });