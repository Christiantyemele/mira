class PocketFlowMock {
  chat = jest.fn(async (_input: any) => ({ text: 'mocked text' }));
  plan = jest.fn(async (_input: any) => ({ outline: 'mocked outline' }));
}

export default PocketFlowMock;
