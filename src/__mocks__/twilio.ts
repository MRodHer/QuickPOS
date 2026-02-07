// Mock Twilio module for testing
export default function Twilio(accountSid: string, authToken: string) {
  return {
    messages: {
      create: async (params: any) => ({
        sid: 'test-sid-' + Math.random(),
        status: 'queued',
        ...params,
      }),
    },
  };
}
