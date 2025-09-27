import { SolapiMessageService } from 'solapi';

// Initialize SOLAPI client
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY,
  process.env.SOLAPI_API_SECRET
);

// SMS sending function
export async function sendSMS({ to, text, from = null }) {
  try {
    const response = await messageService.send({
      to,
      from: from || process.env.SOLAPI_SENDER_NUMBER,
      text,
    });

    console.log('SMS sent successfully:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return { success: false, error: error.message };
  }
}

// Bulk SMS sending function
export async function sendBulkSMS(messages) {
  try {
    const formattedMessages = messages.map(msg => ({
      to: msg.to,
      from: msg.from || process.env.SOLAPI_SENDER_NUMBER,
      text: msg.text,
    }));

    const response = await messageService.send(formattedMessages);

    console.log('Bulk SMS sent successfully:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to send bulk SMS:', error);
    return { success: false, error: error.message };
  }
}

// Scheduled SMS sending function
export async function sendScheduledSMS({ to, text, scheduledDate, from = null }) {
  try {
    const response = await messageService.sendOneFuture(
      {
        to,
        from: from || process.env.SOLAPI_SENDER_NUMBER,
        text,
      },
      scheduledDate
    );

    console.log('Scheduled SMS created successfully:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to create scheduled SMS:', error);
    return { success: false, error: error.message };
  }
}

// Get balance
export async function getBalance() {
  try {
    const balance = await messageService.getBalance();
    return { success: true, data: balance };
  } catch (error) {
    console.error('Failed to get balance:', error);
    return { success: false, error: error.message };
  }
}

// Validate API keys
export async function validateAPIKeys() {
  try {
    const balance = await messageService.getBalance();
    console.log('API keys are valid. Balance:', balance);
    return { success: true, valid: true, balance };
  } catch (error) {
    console.error('API key validation failed:', error);
    return { success: false, valid: false, error: error.message };
  }
}

// Send KakaoTalk AlimTalk (알림톡) - FREE messaging
export async function sendAlimTalk({ to, templateId, variables = {}, pfId = null, from = null, disableSms = true }) {
  try {
    const response = await messageService.send({
      to,
      from: from || process.env.SOLAPI_SENDER_NUMBER,
      kakaoOptions: {
        pfId: pfId || process.env.SOLAPI_KAKAO_CHANNEL_ID,
        templateId,
        variables,
        disableSms, // Disable SMS fallback by default to ensure free delivery
      },
    });

    console.log('AlimTalk sent successfully (FREE):', response);
    return { success: true, data: response, isFree: response.groupInfo.point.sum === 0 };
  } catch (error) {
    console.error('Failed to send AlimTalk:', error);
    return { success: false, error: error.message };
  }
}

// Send welcome message using your approved template
export async function sendWelcomeMessage({ to, name, url = 'classraum.com' }) {
  return sendAlimTalk({
    to,
    templateId: 'KA01TP221025083117992xkz17KyvNbr',
    variables: {
      '#{홍길동}': name,
      '#{url}': url, // Template has https:// prefix, so just send domain
    },
  });
}

// Send bulk KakaoTalk AlimTalk
export async function sendBulkAlimTalk(messages) {
  try {
    const formattedMessages = messages.map(msg => ({
      to: msg.to,
      from: msg.from || process.env.SOLAPI_SENDER_NUMBER,
      kakaoOptions: {
        pfId: msg.pfId,
        templateId: msg.templateId,
        variables: msg.variables || {},
      },
    }));

    const response = await messageService.send(formattedMessages);

    console.log('Bulk AlimTalk sent successfully:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to send bulk AlimTalk:', error);
    return { success: false, error: error.message };
  }
}

// Get KakaoTalk templates
export async function getKakaoTemplates(options = {}) {
  try {
    const templates = await messageService.getKakaoAlimtalkTemplates(options);
    return { success: true, data: templates };
  } catch (error) {
    console.error('Failed to get Kakao templates:', error);
    return { success: false, error: error.message };
  }
}