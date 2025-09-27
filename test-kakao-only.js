const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

async function sendKakaoOnly() {
  try {
    console.log('📱 Sending KakaoTalk AlimTalk (WITHOUT SMS fallback)...\n');

    // Send AlimTalk with SMS fallback DISABLED
    const response = await messageService.send({
      to: '01024169820',
      from: '01068301764',
      kakaoOptions: {
        pfId: 'KA01PF2509260646100458NQzRI7JLb3',
        templateId: 'KA01TP221025083117992xkz17KyvNbr',
        variables: {
          '#{홍길동}': '카카오톡 테스트',
        },
        disableSms: true, // This disables SMS fallback - KakaoTalk ONLY
      },
    });

    console.log('✅ AlimTalk request sent (KakaoTalk ONLY - no SMS fallback)\n');

    // Check the message type breakdown
    const countForCharge = response.groupInfo.countForCharge;

    console.log('📊 Message Type Breakdown:');
    if (countForCharge.sms && Object.keys(countForCharge.sms).length > 0) {
      console.log('- SMS:', countForCharge.sms);
    }
    if (countForCharge.ata && Object.keys(countForCharge.ata).length > 0) {
      console.log('- AlimTalk (ATA):', countForCharge.ata);
    }

    console.log('\n💰 Cost Analysis:');
    console.log('- Points used:', response.groupInfo.point.sum);
    console.log('- Balance used:', response.groupInfo.balance.sum);

    if (response.groupInfo.point.sum === 0) {
      console.log('✅ Confirmed: Sent as FREE KakaoTalk AlimTalk!');
    } else if (response.groupInfo.point.sum > 0) {
      console.log('⚠️ Points were charged - this went as SMS');
      console.log('Possible reasons:');
      console.log('1. Recipient doesn\'t have KakaoTalk installed');
      console.log('2. Recipient\'s KakaoTalk is not linked to this phone number');
      console.log('3. Template or channel configuration issue');
    }

    if (response.failedMessageList && response.failedMessageList.length > 0) {
      console.log('\n⚠️ Failed messages:');
      response.failedMessageList.forEach(fail => {
        console.log(`- Reason: ${fail.reason}`);
        console.log(`  Message: ${fail.message}`);
      });
    }

    // Now let's check with SMS fallback enabled for comparison
    console.log('\n\n📱 Now sending WITH SMS fallback enabled...\n');

    const response2 = await messageService.send({
      to: '01024169820',
      from: '01068301764',
      kakaoOptions: {
        pfId: 'KA01PF2509260646100458NQzRI7JLb3',
        templateId: 'KA01TP221025083117992xkz17KyvNbr',
        variables: {
          '#{홍길동}': '자동 전환 테스트',
        },
        // disableSms is not set, so SMS fallback is ENABLED (default)
      },
    });

    console.log('✅ AlimTalk request sent (with SMS fallback if needed)\n');

    const countForCharge2 = response2.groupInfo.countForCharge;

    console.log('📊 Message Type Breakdown:');
    if (countForCharge2.sms && Object.keys(countForCharge2.sms).length > 0) {
      console.log('- SMS:', countForCharge2.sms);
    }
    if (countForCharge2.ata && Object.keys(countForCharge2.ata).length > 0) {
      console.log('- AlimTalk (ATA):', countForCharge2.ata);
    }

    console.log('\n💰 Cost Analysis:');
    console.log('- Points used:', response2.groupInfo.point.sum);

    if (response2.groupInfo.point.sum === 0) {
      console.log('✅ Sent as FREE KakaoTalk AlimTalk!');
    } else {
      console.log('📱 Sent as SMS (fallback) - charged', response2.groupInfo.point.sum, 'points');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('failedMessageList')) {
      console.log('\n💡 This error usually means:');
      console.log('1. The recipient cannot receive KakaoTalk (no KakaoTalk or number not linked)');
      console.log('2. With disableSms: true, the message cannot fall back to SMS');
    }
  }
}

// Run the test
sendKakaoOnly()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });