import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Animated, DeviceEventEmitter } from 'react-native';
import ToastHost, {
  showToast,
  TOAST_CHANNEL,
} from '../../components/common/Toast';

// Mock DeviceEventEmitter
jest.useFakeTimers();

describe('ToastHost', () => {
  beforeEach(() => {
    jest.spyOn(Animated, 'timing').mockReturnValue({ start: jest.fn() } as any);
    jest.spyOn(Animated, 'parallel').mockImplementation(() => ({
      start: (callback?: () => void) => callback?.(),
    }) as any);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<ToastHost />);
      expect(toJSON()).toBeDefined();
    });

    it('should not display anything initially', () => {
      const { queryByText } = render(<ToastHost />);
      expect(queryByText('Test Message')).toBeNull();
    });

    it('renders the toast title and message when an event is emitted', () => {
      const { getByText } = render(<ToastHost />);

      act(() => {
        showToast({
          title: 'Success',
          message: 'Changes saved',
          type: 'success',
        });
      });

      expect(getByText('Success')).toBeTruthy();
      expect(getByText('Changes saved')).toBeTruthy();
    });

    it('hides the active toast after its duration elapses', () => {
      const { getByText, queryByText } = render(<ToastHost />);

      act(() => {
        showToast({ message: 'Temporary toast', durationMs: 500 });
      });

      expect(getByText('Temporary toast')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(queryByText('Temporary toast')).toBeNull();
    });

    it('shows queued toasts one after another', () => {
      const { getByText, queryByText } = render(<ToastHost />);

      act(() => {
        showToast({ message: 'First toast', durationMs: 300 });
        showToast({ message: 'Second toast', durationMs: 300 });
      });

      expect(getByText('First toast')).toBeTruthy();
      expect(queryByText('Second toast')).toBeNull();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(getByText('Second toast')).toBeTruthy();
      expect(queryByText('First toast')).toBeNull();
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
      const remove = jest.fn();
      const addListenerSpy = jest
        .spyOn(DeviceEventEmitter, 'addListener')
        .mockReturnValue({ remove } as any);

      const { unmount } = render(<ToastHost />);
      unmount();

      expect(remove).toHaveBeenCalled();
      addListenerSpy.mockRestore();
    });
  });
});
