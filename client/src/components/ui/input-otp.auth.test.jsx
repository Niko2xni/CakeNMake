import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './input-otp';
import '@/styles/client-theme.css';

describe('login OTP presentation', () => {
  it('keeps the library input invisible and renders each digit in its own slot', () => {
    const { container } = render(
      <div className="cn-auth-page">
        <InputOTP maxLength={6} value="315485" onChange={() => {}} pushPasswordManagerStrategy="none">
          <InputOTPGroup className="cn-auth-otp-group">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} className="cn-auth-otp-slot" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>,
    );

    const internalInput = container.querySelector('[data-input-otp]');
    const slots = [...container.querySelectorAll('.cn-auth-otp-slot')];

    expect(internalInput).toHaveStyle({ color: 'rgba(0, 0, 0, 0)', background: 'transparent' });
    expect(slots).toHaveLength(6);
    expect(slots.map((slot) => slot.textContent)).toEqual(['3', '1', '5', '4', '8', '5']);
    slots.forEach((slot) => expect(slot).toHaveAttribute('data-filled', 'true'));
  });
});
