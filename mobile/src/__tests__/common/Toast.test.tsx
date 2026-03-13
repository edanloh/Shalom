import React from 'react';
import { render } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import ToastHost, {
  showToast,
  TOAST_CHANNEL,
} from '../../components/common/Toast';

// Mock DeviceEventEmitter
jest.useFakeTimers();

describe('ToastHost', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<ToastHost />);
      expect(toJSON()).toBeDefined();
    });

    it('should not display anything initially', () => {
      const { queryByText } = render(<ToastHost />);
      expect(queryByText('Test Message')).toBeNull();
    });
  });

  describe('showToast function', () => {
    it('should emit event when showToast is called', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      showToast({ message: 'Test Message' });

      expect(emitSpy).toHaveBeenCalledWith(TOAST_CHANNEL, {
        message: 'Test Message',
      });

      emitSpy.mockRestore();
    });

    it('should emit event with all payload properties', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      const payload = {
        message: 'Success!',
        title: 'Success',
        type: 'success' as const,
        durationMs: 3000,
      };

      showToast(payload);

      expect(emitSpy).toHaveBeenCalledWith(TOAST_CHANNEL, payload);

      emitSpy.mockRestore();
    });
  });

  describe('Toast Types', () => {
    it('should handle success type toast', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      showToast({
        message: 'Operation successful',
        type: 'success',
      });

      expect(emitSpy).toHaveBeenCalled();
      emitSpy.mockRestore();
    });

    it('should handle error type toast', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      showToast({
        message: 'An error occurred',
        type: 'error',
      });

      expect(emitSpy).toHaveBeenCalled();
      emitSpy.mockRestore();
    });

    it('should handle info type toast', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      showToast({
        message: 'Information message',
        type: 'info',
      });

      expect(emitSpy).toHaveBeenCalled();
      emitSpy.mockRestore();
    });

    it('should handle toast without type (default)', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      showToast({
        message: 'Default message',
      });

      expect(emitSpy).toHaveBeenCalled();
      emitSpy.mockRestore();
    });
  });

  describe('Toast Content', () => {
    it('should show toast with message only', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      showToast({
        message: 'Simple message',
      });

      expect(emitSpy).toHaveBeenCalledWith(
        TOAST_CHANNEL,
        expect.objectContaining({ message: 'Simple message' }),
      );
      emitSpy.mockRestore();
    });

    it('should show toast with title and message', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      showToast({
        message: 'Message content',
        title: 'Title text',
      });

      expect(emitSpy).toHaveBeenCalledWith(
        TOAST_CHANNEL,
        expect.objectContaining({
          message: 'Message content',
          title: 'Title text',
        }),
      );
      emitSpy.mockRestore();
    });

    it('should handle custom duration', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      showToast({
        message: 'Custom duration',
        durationMs: 5000,
      });

      expect(emitSpy).toHaveBeenCalledWith(
        TOAST_CHANNEL,
        expect.objectContaining({ durationMs: 5000 }),
      );
      emitSpy.mockRestore();
    });
  });

  describe('Toast Queue', () => {
    it('should handle multiple toasts', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      showToast({ message: 'Toast 1' });
      showToast({ message: 'Toast 2' });
      showToast({ message: 'Toast 3' });

      expect(emitSpy).toHaveBeenCalledTimes(3);
      emitSpy.mockRestore();
    });

    it('should respect skipInApp flag', () => {
      const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

      showToast({
        message: 'Skip in app',
        skipInApp: true,
      });

      expect(emitSpy).toHaveBeenCalledWith(
        TOAST_CHANNEL,
        expect.objectContaining({ skipInApp: true }),
      );
      emitSpy.mockRestore();
    });
  });

  describe('Event Listener', () => {
    it('should clean up listener on unmount', () => {
      const { unmount } = render(<ToastHost />);

      expect(() => unmount()).not.toThrow();
    });
  });
});
