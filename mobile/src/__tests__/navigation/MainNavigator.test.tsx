import React from 'react';
import { act, render } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';

let mockIsResettingPassword = false;
let mockInAppNotifications: Array<{ read: boolean }> = [];
let mockHasUnreadMessages = false;
let mockCurrentTabIndex = 0;
const mockWithSpring = jest.fn((value: number) => value);
const mockWithTiming = jest.fn((value: number) => value);

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isResettingPassword: mockIsResettingPassword }),
}));

jest.mock('@/contexts/NotificationContext', () => ({
  useNotification: () => ({ inAppNotifications: mockInAppNotifications }),
}));

jest.mock('@/contexts/MessageContext', () => ({
  useMessages: () => ({ hasUnreadMessages: mockHasUnreadMessages }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigationState: (selector: (state: any) => number) =>
    selector({
      routes: [
        {
          name: 'MainTabs',
          state: {
            index: mockCurrentTabIndex,
          },
        },
      ],
    }),
}));

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    BottomTabBar: () => <Text>BottomTabBar</Text>,
    createBottomTabNavigator: () => ({
      Navigator: ({ children, screenOptions, tabBar }: any) => {
        const screens = React.Children.toArray(children).filter(React.isValidElement);
        const fakeState = {
          routes: screens.map((screen: any) => ({ name: screen.props.name })),
        };

        return (
          <View>
            <Text testID="bottom-tab-count">{String(screens.length)}</Text>
            {screens.map((screen: any, index: number) => {
              const route = { name: screen.props.name };
              const options =
                typeof screenOptions === 'function'
                  ? screenOptions({ route })
                  : (screenOptions ?? {});
              const focused = index === mockCurrentTabIndex;

              return (
                <View key={screen.props.name} testID={`tab-${screen.props.name}`}>
                  <Text>{screen.props.name}</Text>
                  {options.tabBarIcon?.({
                    focused,
                    color: '#fff',
                    size: 22,
                  })}
                  {index === 0 && options.tabBarBackground
                    ? options.tabBarBackground()
                    : null}
                </View>
              );
            })}
            {tabBar ? tabBar({ state: fakeState, descriptors: {}, navigation: {} }) : null}
            {screens.map((screen: any) =>
              React.createElement(screen.props.component, {
                key: `screen-${screen.props.name}`,
              }),
            )}
          </View>
        );
      },
      Screen: () => null,
    }),
  };
});

jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    createStackNavigator: () => ({
      Navigator: ({ children, initialRouteName }: any) => {
        const screens = React.Children.toArray(children).filter(React.isValidElement);
        const activeScreen =
          screens.find((screen: any) => screen.props.name === initialRouteName) ??
          screens[0];

        return (
          <View>
            <Text testID="stack-initial">{initialRouteName}</Text>
            {screens.map((screen: any) => (
              <Text key={screen.props.name}>{screen.props.name}</Text>
            ))}
            {activeScreen
              ? React.createElement((activeScreen as any).props.component)
              : null}
          </View>
        );
      },
      Screen: () => null,
    }),
  };
});

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { ScrollView, View } = require('react-native');

  return {
    __esModule: true,
    default: {
      View,
      ScrollView,
    },
    useAnimatedStyle: (callback: () => unknown) => callback(),
    useSharedValue: (value: number) => ({ value }),
    withSpring: mockWithSpring,
    withTiming: mockWithTiming,
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('../../screens/index', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const screen = (label: string) => () => <Text>{label}</Text>;

  return {
    HomeScreen: screen('Home Screen'),
    CoursesScreen: screen('Courses Screen'),
    Notification: screen('Notification Screen'),
    MessagesScreen: screen('Messages Screen'),
    UserProfile: screen('UserProfile Screen'),
    CourseDetailScreen: screen('CourseDetail Screen'),
    ModuleDetailScreen: screen('ModuleDetail Screen'),
    LessonPlayer: screen('LessonPlayer Screen'),
    QuizScreen: screen('QuizScreen Screen'),
    Settings: screen('Settings Screen'),
    EditProfile: screen('EditProfile Screen'),
    UserManagement: screen('UserManagement Screen'),
    UserConfig: screen('UserConfig Screen'),
    MyCourses: screen('MyCourses Screen'),
    WishlistScreen: screen('Wishlist Screen'),
    LeaveReviewScreen: screen('LeaveReview Screen'),
    TestScreen: screen('TestScreen Screen'),
    PointsHistory: screen('PointsHistory Screen'),
    AchievementsScreen: screen('Achievements Screen'),
    CertificatesScreen: screen('CertificatesScreen Screen'),
    DocumentView: screen('DocumentView Screen'),
    LearningGoalScreen: screen('LearningGoalScreen Screen'),
    ChangePassword: screen('ChangePassword Screen'),
    ResetPassword: screen('ResetPassword Screen'),
    ConversationScreen: screen('Conversation Screen'),
  };
});

const MainNavigator = require('../../screens/navigation/MainNavigator').default;

describe('MainNavigator', () => {
  beforeEach(() => {
    mockIsResettingPassword = false;
    mockInAppNotifications = [];
    mockHasUnreadMessages = false;
    mockCurrentTabIndex = 0;
    mockWithSpring.mockClear();
    mockWithTiming.mockClear();
  });

  it('uses ResetPassword as the initial route while resetting the password', () => {
    mockIsResettingPassword = true;

    const { getByTestId, getByText } = render(<MainNavigator />);

    expect(getByTestId('stack-initial').props.children).toBe('ResetPassword');
    expect(getByText('ResetPassword Screen')).toBeTruthy();
  });

  it('renders the main tabs with the correct focused and unfocused icons', () => {
    mockCurrentTabIndex = 2;
    mockInAppNotifications = [{ read: false }];
    mockHasUnreadMessages = true;

    const { getByTestId, getByText } = render(<MainNavigator />);

    expect(getByTestId('stack-initial').props.children).toBe('MainTabs');
    expect(getByTestId('bottom-tab-count').props.children).toBe('5');
    expect(getByText('home-outline')).toBeTruthy();
    expect(getByText('library-outline')).toBeTruthy();
    expect(getByText('notifications')).toBeTruthy();
    expect(getByText('chatbubble-outline')).toBeTruthy();
    expect(getByText('person-outline')).toBeTruthy();
    expect(getByText('BottomTabBar')).toBeTruthy();
  });

  it('registers the tab bar toggle listener, ignores invalid payloads, and cleans up on unmount', () => {
    const mockRemove = jest.fn();
    let mockTabbarToggleHandler: ((payload: { visible?: boolean }) => void) | undefined;

    const addListenerSpy = jest
      .spyOn(DeviceEventEmitter, 'addListener')
      .mockImplementation((eventName: any, listener: any) => {
        if (eventName === 'tabbar:toggle') {
          mockTabbarToggleHandler = listener;
        }
        return { remove: mockRemove } as any;
      });

    const { unmount } = render(<MainNavigator />);

    expect(addListenerSpy).toHaveBeenCalledWith(
      'tabbar:toggle',
      expect.any(Function),
    );

    mockWithTiming.mockClear();

    act(() => {
      mockTabbarToggleHandler?.({ visible: 'nope' as any });
    });
    expect(mockWithTiming).not.toHaveBeenCalled();

    act(() => {
      mockTabbarToggleHandler?.({ visible: false });
    });
    expect(mockWithTiming).toHaveBeenCalledWith(expect.any(Number), {
      duration: 220,
    });

    unmount();
    expect(mockRemove).toHaveBeenCalled();
    addListenerSpy.mockRestore();
  });
});
