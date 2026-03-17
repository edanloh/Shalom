import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ProgressSection from '../../components/home/ProgressSection';

describe('ProgressSection', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  it('renders achievements and weekly goal when goals is undefined', () => {
    const achievements = [
      { id: 'a1', title: '12 Day Streak', value: '12', color: '#fff' },
      {
        id: 'a2',
        title: '3 Certificates',
        value: '3',
        color: '#fff',
        navigationTarget: 'CertificatesScreen',
      },
    ];

    const { getByText } = render(
      <ProgressSection
        current={6}
        target={10}
        unit="hours"
        label="Weekly Goal"
        achievements={achievements}
        navigation={navigation}
      />,
    );

    expect(getByText('12 Day Streak')).toBeTruthy();
    expect(getByText('Weekly Goal')).toBeTruthy();
    expect(getByText('6/10 hours')).toBeTruthy();
  });

  it('navigates to LearningGoalScreen when weekly goal card is pressed', () => {
    const { getByText } = render(
      <ProgressSection
        current={2}
        target={5}
        unit="courses"
        label="Weekly Goal"
        achievements={[]}
        navigation={navigation}
      />,
    );

    fireEvent.press(getByText('Weekly Goal'));
    expect(navigation.navigate).toHaveBeenCalledWith('LearningGoalScreen');
  });

  it('navigates to an achievement target when an achievement card is pressed', () => {
    const achievements = [
      {
        id: 'a1',
        title: '3 Certificates',
        value: '3',
        color: '#fff',
        navigationTarget: 'CertificatesScreen',
      },
    ];

    const { getByText } = render(
      <ProgressSection
        current={1}
        target={2}
        unit="courses"
        achievements={achievements}
        navigation={navigation}
      />,
    );

    fireEvent.press(getByText('3 Certificates'));
    expect(navigation.navigate).toHaveBeenCalledWith('CertificatesScreen');
  });

  it('formats hour values cleanly and clamps current progress to target', () => {
    const { getByText } = render(
      <ProgressSection
        current={6.5}
        target={6.25}
        unit="hours"
        label="Weekly Goal"
        achievements={[]}
        navigation={navigation}
      />,
    );

    expect(getByText('6.25/6.25 hours')).toBeTruthy();
  });

  it('renders compact goals card when goals array is provided', () => {
    const { getByText } = render(
      <ProgressSection
        current={0}
        target={0}
        unit="points"
        achievements={[]}
        navigation={navigation}
        goals={[
          {
            id: 'g1',
            label: 'Read lessons',
            current: 2,
            target: 5,
            unit: 'lessons',
          },
          {
            id: 'g2',
            label: 'Take quizzes',
            current: 1,
            target: 3,
            unit: 'quizzes',
          },
          {
            id: 'g3',
            label: 'Complete course',
            current: 0,
            target: 1,
            unit: 'courses',
          },
        ]}
      />,
    );

    expect(getByText('Active goals')).toBeTruthy();
    expect(getByText('Read lessons')).toBeTruthy();
    expect(getByText('+1 more')).toBeTruthy();
  });

  it('formats compact goal units for hours and points', () => {
    const { getByText } = render(
      <ProgressSection
        current={0}
        target={0}
        unit="points"
        achievements={[]}
        navigation={navigation}
        goals={[
          {
            id: 'g1',
            label: 'Study time',
            current: 2.5,
            target: 3,
            unit: 'hours',
          },
          {
            id: 'g2',
            label: 'Earn points',
            current: 20,
            target: 50,
            unit: 'points',
          },
        ]}
      />,
    );

    expect(getByText('2.5/3 h')).toBeTruthy();
    expect(getByText('20/50 pts')).toBeTruthy();
  });

  it('renders empty goals state when goals is empty', () => {
    const { getByText } = render(
      <ProgressSection
        current={0}
        target={0}
        unit="points"
        achievements={[]}
        navigation={navigation}
        goals={[]}
      />,
    );

    expect(getByText('No active goals set')).toBeTruthy();
  });
});
