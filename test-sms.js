const { SolapiMessageService } = require('solapi');

// Initialize SOLAPI client with your credentials
const messageService = new SolapiMessageService(
  'NCSDJWHEJ28QU2IS',
  'DCIBBSMZXNBYACRIUK6MCAIUF9EHW1AT'
);

// Send test SMS
async function sendTestSMS() {
  try {
    const response = await messageService.send({
      to: '01024169820',
      from: '01068301764',
      text: '안녕하세요! Classraum에서 보내는 SOLAPI 테스트 메시지입니다.',
    });

    console.log('SMS sent successfully!');
    console.log('Response:', response);
    return response;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw error;
  }
}

// Execute the test
sendTestSMS()
  .then(result => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed');
    process.exit(1);
  });