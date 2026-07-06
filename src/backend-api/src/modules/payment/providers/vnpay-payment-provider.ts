import { createHmac } from 'crypto';
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

  async queryIntent(_input: {
    provider: string;
    providerIntentId: string;
    signal: AbortSignal;
  }) {
    return { status: 'pending' as const, providerTxnId: null };
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
  const parts = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ];
  const [year, ...rest] = parts;
  return `${year}${rest.map((part) => String(part).padStart(2, '0')).join('')}`;
}
