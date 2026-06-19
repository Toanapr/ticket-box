import { createStableHash } from './hash.util';

describe('createStableHash', () => {
  it('returns the same hash for objects with different key order', () => {
    const first = createStableHash({
      orderId: 'order-1',
      payload: {
        b: 2,
        a: 1,
      },
    });

    const second = createStableHash({
      payload: {
        a: 1,
        b: 2,
      },
      orderId: 'order-1',
    });

    expect(first).toBe(second);
  });

  it('returns different hashes for different values', () => {
    expect(createStableHash({ status: 'succeeded' })).not.toBe(
      createStableHash({ status: 'failed' }),
    );
  });
});
