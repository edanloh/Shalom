import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DeviceEventEmitter, ScrollView } from 'react-native';
import { Text } from 'react-native';
import Screen from '../../components/common/Screen';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <View testID="safe-area-view">{children}</View>
    ),
  };
});

jest.mock('../../components/common/ScreenHeader', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockScreenHeader({
    title,
    subtitle,
  }: {
    title: string;
    subtitle?: string;
  }) {
    return (
      <Text testID="screen-header">
        {title}
        {subtitle ? ` - ${subtitle}` : ''}
      </Text>
    );
  };
});

jest.mock('../../components/common/Toast', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockToastHost() {
    return <Text testID="toast-host">ToastHost</Text>;
  };
});

describe('Screen', () => {
  it('renders header, children, and toast host by default', () => {
    const { getByTestId, getByText } = render(
      <Screen title="Home" subtitle="Welcome back">
        <Text>Content Area</Text>
      </Screen>,
    );

    expect(getByTestId('screen-header')).toBeTruthy();
    expect(getByText('Content Area')).toBeTruthy();
    expect(getByTestId('toast-host')).toBeTruthy();
  });

  it('does not render header when noHeader is true', () => {
    const { queryByTestId } = render(
      <Screen title="Hidden" noHeader={true}>
        <Text>Body</Text>
      </Screen>,
    );

    expect(queryByTestId('screen-header')).toBeNull();
  });

  it('renders with non-scroll layout when useScrollView is false', () => {
    const { queryByText, UNSAFE_queryByType } = render(
      <Screen title="Static" useScrollView={false}>
        <Text>Static Body</Text>
      </Screen>,
    );

    expect(queryByText('Static Body')).toBeTruthy();
    expect(UNSAFE_queryByType(ScrollView)).toBeNull();
  });

  it('wires refresh control when onRefresh is provided', () => {
    const onRefresh = jest.fn();
    const { UNSAFE_getByType } = render(
      <Screen title="Refresh" refreshing={false} onRefresh={onRefresh}>
        <Text>Refreshable</Text>
      </Screen>,
    );

    const scrollView = UNSAFE_getByType(ScrollView);
    const refreshControl = scrollView.props.refreshControl;

    expect(refreshControl).toBeTruthy();
    refreshControl.props.onRefresh();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('emits tabbar hide/show events based on scroll direction and threshold', () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

    const { UNSAFE_getByType } = render(
      <Screen title="Scroll Events">
        <Text>Scrollable Body</Text>
      </Screen>,
    );

    const scrollView = UNSAFE_getByType(ScrollView);

    // Small delta should not emit anything.
    fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 5 } } });
    expect(emitSpy).not.toHaveBeenCalled();

    // Scroll down enough to hide tab bar.
    fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 60 } } });
    expect(emitSpy).toHaveBeenCalledWith('tabbar:toggle', { visible: false });

    // Scroll up to show tab bar.
    fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 20 } } });
    expect(emitSpy).toHaveBeenCalledWith('tabbar:toggle', { visible: true });

    emitSpy.mockRestore();
  });
});
