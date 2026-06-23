import { ConfigService } from '@nestjs/config';
import { PaymentCircuitBreakerService } from './payment-circuit-breaker.service';

describe('PaymentCircuitBreakerService', () => {
  const create = () =>
    new PaymentCircuitBreakerService({
      get: (key: string) =>
        ({
          PAYMENT_CIRCUIT_FAILURE_THRESHOLD: '2',
          PAYMENT_CIRCUIT_COOLDOWN_MS: '1000',
        })[key],
    } as ConfigService);

  it('moves closed -> open -> half_open -> closed', () => {
    const circuit = create();
    circuit.failure(true, 1000);
    expect(circuit.getState()).toBe('closed');
    circuit.failure(true, 1100);
    expect(circuit.getState()).toBe('open');
    expect(() => circuit.beforeCall(1500)).toThrow('circuit is open');
    circuit.beforeCall(2200);
    expect(circuit.getState()).toBe('half_open');
    circuit.success();
    expect(circuit.getState()).toBe('closed');
  });

  it('allows one half-open probe and reopens on failure', () => {
    const circuit = create();
    circuit.failure(true, 1000);
    circuit.failure(true, 1001);
    circuit.beforeCall(2100);
    expect(() => circuit.beforeCall(2100)).toThrow('circuit is open');
    circuit.failure(true, 2101);
    expect(circuit.getState()).toBe('open');
  });

  it('does not count caller-side failures', () => {
    const circuit = create();
    circuit.failure(false, 1000);
    circuit.failure(false, 1001);
    expect(circuit.getState()).toBe('closed');
  });
});
