import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { VnpayPaymentProvider } from './vnpay-payment-provider';

describe('VnpayPaymentProvider', () => {
  const hashSecret = 'query-dr-secret';
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        VNPAY_TMN_CODE: 'TESTTMN',
        VNPAY_HASH_SECRET: hashSecret,
        VNPAY_QUERYDR_URL: 'https://vnpay.example/querydr',
        VNPAY_IP_ADDR: '127.0.0.1',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['00', '00', 'succeeded'],
    ['00', '02', 'failed'],
    ['24', '02', 'failed'],
    ['94', '', 'pending'],
  ] as const)(
    'maps QueryDR response code %s and transaction status %s to %s',
    async (responseCode, transactionStatus, expectedStatus) => {
      const body = signedQueryDrResponse({
        vnp_ResponseCode: responseCode,
        vnp_TransactionStatus: transactionStatus,
        vnp_TransactionNo: '987654',
        vnp_TxnRef: 'payment_order_1_VNPAY',
      });
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => body,
      } as Response);

      const provider = new VnpayPaymentProvider(config);
      const result = await provider.queryIntent({
        provider: 'VNPAY',
        providerIntentId: 'payment_order_1_VNPAY',
        orderId: 'order-1',
        providerTxnId: null,
        createdAt: new Date('2026-07-07T00:00:00.000Z'),
        signal: new AbortController().signal,
      });

      expect(result).toEqual({
        status: expectedStatus,
        providerTxnId: '987654',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://vnpay.example/querydr',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('vnp_Command=querydr'),
        }),
      );
    },
  );

  it('rejects QueryDR responses with invalid signatures', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: '987654',
        vnp_SecureHash: 'invalid',
      }),
    } as Response);

    const provider = new VnpayPaymentProvider(config);

    await expect(
      provider.queryIntent({
        provider: 'VNPAY',
        providerIntentId: 'payment_order_1_VNPAY',
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: 'provider_response_invalid_signature',
    });
  });

  function signedQueryDrResponse(
    params: Record<string, string>,
  ): Record<string, string> {
    const signedData = Object.keys(params)
      .sort()
      .map((key) => `${vnpayEncode(key)}=${vnpayEncode(params[key])}`)
      .join('&');
    return {
      ...params,
      vnp_SecureHash: createHmac('sha512', hashSecret)
        .update(Buffer.from(signedData, 'utf-8'))
        .digest('hex'),
    };
  }

  function vnpayEncode(value: string): string {
    return encodeURIComponent(value).replace(/%20/g, '+');
  }
});
