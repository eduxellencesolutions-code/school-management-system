declare module 'flutterwave-node-v3' {
  interface Flutterwave {
    Payment: {
      initiate(payload: any): Promise<any>;
    };
    Transaction: {
      verify(payload: any): Promise<any>;
    };
  }

  class Flutterwave {
    constructor(publicKey: string, secretKey: string);
    Payment: {
      initiate(payload: any): Promise<any>;
    };
    Transaction: {
      verify(payload: any): Promise<any>;
    };
  }

  export default Flutterwave;
}
