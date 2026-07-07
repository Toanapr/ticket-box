import { createHmac, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProviderError,
  PaymentProviderPort,
  ProviderIntent,
} from './payment-provider.port';

@Injectable()
export class VnpayPaymentProvider implements PaymentProviderPort {
  constructor(private readonly config: ConfigService) {}

  async createIntent(input: {
    provider: string;
    orderId: string;
    amount: string;
    idempotencyKey: string;
    signal: AbortSignal;
  }): Promise<ProviderIntent> {
    if (input.signal.aborted) {
      throw new PaymentProviderError(
        'Provider call timed out',
        'provider_timeout',
        true,
        true,
      );
    }

    const tmnCode = this.required('VNPAY_TMN_CODE');
    const hashSecret = this.required('VNPAY_HASH_SECRET');
    const returnUrl = this.buildReturnUrl(input.orderId);
    const paymentUrl =
      this.config.get<string>('VNPAY_PAYMENT_URL') ??
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const locale = this.config.get<string>('VNPAY_LOCALE') ?? 'vn';
    const orderType = this.config.get<string>('VNPAY_ORDER_TYPE') ?? 'other';
    const ipAddress = this.config.get<string>('VNPAY_IP_ADDR') ?? '127.0.0.1';
    const providerIntentId = input.idempotencyKey.replace(
      /[^A-Za-z0-9_-]/g,
      '_',
    );

    const params: Record<string, string> = {
      vnp_Amount: String(Math.round(Number(input.amount) * 100)),
      vnp_Command: 'pay',
      vnp_CreateDate: formatVnpayDate(new Date()),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: ipAddress,
      vnp_Locale: locale,
      vnp_OrderInfo: `Thanh toan don hang ${input.orderId}`,
      vnp_OrderType: orderType,
      vnp_ReturnUrl: returnUrl,
      vnp_TmnCode: tmnCode,
      vnp_TxnRef: providerIntentId,
      vnp_Version: '2.1.0',
    };

    const signedData = stringifySorted(params);
    const secureHash = createHmac('sha512', hashSecret)
      .update(Buffer.from(signedData, 'utf-8'))
      .digest('hex');
    const checkoutUrl = `${paymentUrl}?${signedData}&vnp_SecureHash=${secureHash}`;

    return {
      providerIntentId,
      providerTxnId: null,
      checkoutUrl,
      status: 'pending',
    };
  }

  async queryIntent(input: {
    provider: string;
    providerIntentId: string;
    orderId?: string;
    providerTxnId?: string | null;
    createdAt?: Date;
    signal: AbortSignal;
  }) {
    if (input.signal.aborted) {
      throw new PaymentProviderError(
        'Provider call timed out',
        'provider_timeout',
        true,
        true,
      );
    }

    const tmnCode = this.required('VNPAY_TMN_CODE');
    const hashSecret = this.required('VNPAY_HASH_SECRET');
    const queryDrUrl = this.required('VNPAY_QUERYDR_URL');
    const requestDate = formatVnpayDate(new Date());
    const transactionDate = formatVnpayDate(input.createdAt ?? new Date());
    const params: Record<string, string> = {
      vnp_RequestId: randomUUID().replace(/-/g, '').slice(0, 16),
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: tmnCode,
      vnp_TxnRef: input.providerIntentId,
      vnp_OrderInfo: `Truy van don hang ${input.orderId ?? input.providerIntentId}`,
      vnp_TransactionDate: transactionDate,
      vnp_CreateDate: requestDate,
      vnp_IpAddr: this.config.get<string>('VNPAY_IP_ADDR') ?? '127.0.0.1',
    };

    if (input.providerTxnId) {
      params.vnp_TransactionNo = input.providerTxnId;
    }

    const signedData = stringifySorted(params);
    const secureHash = createHmac('sha512', hashSecret)
      .update(Buffer.from(signedData, 'utf-8'))
      .digest('hex');
    const response = await fetch(queryDrUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `${signedData}&vnp_SecureHash=${secureHash}`,
      signal: input.signal,
    }).catch((error: unknown) => {
      if (input.signal.aborted) {
        throw new PaymentProviderError(
          'Provider call timed out',
          'provider_timeout',
          true,
          true,
        );
      }
      throw error;
    });

    if (!response.ok) {
      throw new PaymentProviderError(
        'VNPAY QueryDR request failed',
        'provider_error',
        true,
        true,
      );
    }

    const body = normalizeVnpayResponse(await response.json());
    this.verifyQueryDrResponse(body, hashSecret);

    return {
      status: mapQueryDrStatus(body),
      providerTxnId: body.vnp_TransactionNo ?? input.providerTxnId ?? null,
    };
  }

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value?.trim()) {
      throw new PaymentProviderError(
        `${key} is not configured`,
        'provider_configuration_error',
        false,
        false,
      );
    }
    return value;
  }

  private buildReturnUrl(orderId: string): string {
    return this.required('VNPAY_RETURN_URL').replace(
      ':orderId',
      encodeURIComponent(orderId),
    );
  }

  private verifyQueryDrResponse(
    params: Record<string, string>,
    hashSecret: string,
  ): void {
    const receivedHash = params.vnp_SecureHash;
    if (!receivedHash) {
      throw new PaymentProviderError(
        'VNPAY QueryDR response is missing secure hash',
        'provider_response_invalid',
        true,
        false,
      );
    }

    const signedData = Object.keys(params)
      .filter((key) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
      .sort()
      .map((key) => `${vnpayEncode(key)}=${vnpayEncode(params[key])}`)
      .join('&');
    const expectedHash = createHmac('sha512', hashSecret)
      .update(Buffer.from(signedData, 'utf-8'))
      .digest('hex');

    if (receivedHash.toLowerCase() !== expectedHash.toLowerCase()) {
      throw new PaymentProviderError(
        'VNPAY QueryDR response signature is invalid',
        'provider_response_invalid_signature',
        true,
        false,
      );
    }
  }
}

function stringifySorted(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${vnpayEncode(key)}=${vnpayEncode(params[key])}`)
    .join('&');
}

function vnpayEncode(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

function formatVnpayDate(date: Date): string {
  const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const parts = [
    gmt7.getUTCFullYear(),
    gmt7.getUTCMonth() + 1,
    gmt7.getUTCDate(),
    gmt7.getUTCHours(),
    gmt7.getUTCMinutes(),
    gmt7.getUTCSeconds(),
  ];
  const [year, ...rest] = parts;
  return `${year}${rest.map((part) => String(part).padStart(2, '0')).join('')}`;
}

function normalizeVnpayResponse(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PaymentProviderError(
      'VNPAY QueryDR response is invalid',
      'provider_response_invalid',
      true,
      true,
    );
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key.startsWith('vnp_'))
      .map(([key, entry]) => [key, String(entry)]),
  );
}

function mapQueryDrStatus(
  params: Record<string, string>,
): 'pending' | 'succeeded' | 'failed' {
  const responseCode = params.vnp_ResponseCode;
  const transactionStatus = params.vnp_TransactionStatus;
  if (responseCode === '00' && transactionStatus === '00') {
    return 'succeeded';
  }
  if (['91', '94'].includes(responseCode)) {
    return 'pending';
  }
  if (
    transactionStatus === '01' ||
    transactionStatus === '02' ||
    [
      '01',
      '02',
      '04',
      '05',
      '06',
      '07',
      '09',
      '10',
      '11',
      '12',
      '13',
      '24',
      '51',
      '65',
      '75',
      '79',
    ].includes(responseCode)
  ) {
    return 'failed';
  }
  return 'pending';
}
