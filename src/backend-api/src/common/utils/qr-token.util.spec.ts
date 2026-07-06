import { buildQrToken, hashQrToken } from './qr-token.util';

describe('qr token utils', () => {
  it('builds opaque token that includes the order and order item scope', () => {
    const token = buildQrToken('order-1', 'item-1', 2);

    expect(token).toContain('order-1:item-1:2:');
    expect(token.split(':')).toHaveLength(4);
  });

  it('hashes the same token deterministically', () => {
    const token = 'order-1:item-1:1:uuid';

    expect(hashQrToken(token)).toBe(hashQrToken(token));
    expect(hashQrToken(token)).not.toBe(hashQrToken('order-1:item-1:2:uuid'));
  });
});
