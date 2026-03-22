import React from 'react';
import { Animated, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import MatchingQuestion from '../components/MatchingQuestion';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
    Line: () => <View />,
    Circle: () => <View />,
    Defs: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
    LinearGradient: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
    Stop: () => <View />,
  };
});

describe('MatchingQuestion', () => {
  const question = {
    id: 'q1',
    question_type: 'matching',
    correct_answer: [
      { left: 'Apple', right: 'Fruit' },
      { left: 'Carrot', right: 'Vegetable' },
    ],
  };

  beforeEach(() => {
    jest.spyOn(Animated, 'timing').mockReturnValue({ start: jest.fn() } as any);
    jest.spyOn(Animated, 'spring').mockReturnValue({ start: jest.fn() } as any);
    jest
      .spyOn(Animated, 'sequence')
      .mockReturnValue({ start: jest.fn() } as any);
    jest
      .spyOn(Animated, 'parallel')
      .mockReturnValue({ start: jest.fn() } as any);
    jest.spyOn(Animated, 'loop').mockReturnValue({ start: jest.fn() } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders interactive mode with items and instruction', () => {
    const matchingState = new Map<string, Map<string, string>>();
    const { getByText } = render(
      <MatchingQuestion
        question={question as any}
        matchingState={matchingState}
        reviewMode={false}
        onMatch={jest.fn()}
        onClearMatch={jest.fn()}
      />,
    );

    expect(getByText('Tap an A item to start')).toBeTruthy();
    expect(getByText('Apple')).toBeTruthy();
    expect(getByText('Carrot')).toBeTruthy();
  });

  it('calls onMatch when selecting left then right item', () => {
    const matchingState = new Map<string, Map<string, string>>();
    const onMatch = jest.fn();

    const { getByText } = render(
      <MatchingQuestion
        question={question as any}
        matchingState={matchingState}
        reviewMode={false}
        onMatch={onMatch}
        onClearMatch={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Apple'));
    fireEvent.press(getByText('Fruit'));

    expect(onMatch).toHaveBeenCalledWith('q1', 'Apple', 'Fruit');
  });

  it('calls onClearMatch when tapping already matched left item', () => {
    const currentMatches = new Map<string, string>([['Apple', 'Fruit']]);
    const matchingState = new Map<string, Map<string, string>>([
      ['q1', currentMatches],
    ]);
    const onClearMatch = jest.fn();

    const { getByText } = render(
      <MatchingQuestion
        question={question as any}
        matchingState={matchingState}
        reviewMode={false}
        onMatch={jest.fn()}
        onClearMatch={onClearMatch}
      />,
    );

    fireEvent.press(getByText('Apple'));
    expect(onClearMatch).toHaveBeenCalledWith('q1', 'Apple');
  });

  it('renders review mode with correct matches', () => {
    const matchingState = new Map<string, Map<string, string>>();
    const { getByText } = render(
      <MatchingQuestion
        question={question as any}
        matchingState={matchingState}
        reviewMode={true}
        onMatch={jest.fn()}
        onClearMatch={jest.fn()}
      />,
    );

    expect(getByText('Correct Matches')).toBeTruthy();
    expect(getByText('Apple')).toBeTruthy();
    expect(getByText('Fruit')).toBeTruthy();
    expect(getByText('Carrot')).toBeTruthy();
    expect(getByText('Vegetable')).toBeTruthy();
  });

  it('parses JSON string answers in review mode', () => {
    const matchingState = new Map<string, Map<string, string>>();
    const questionWithJson = {
      ...question,
      correct_answer: JSON.stringify(question.correct_answer),
    };

    const { getByText } = render(
      <MatchingQuestion
        question={questionWithJson as any}
        matchingState={matchingState}
        reviewMode={true}
        onMatch={jest.fn()}
        onClearMatch={jest.fn()}
      />,
    );

    expect(getByText('Correct Matches')).toBeTruthy();
    expect(getByText('Fruit')).toBeTruthy();
  });

  it('ignores a right-side tap until a left item is selected', () => {
    const matchingState = new Map<string, Map<string, string>>();
    const onMatch = jest.fn();

    const { getByText } = render(
      <MatchingQuestion
        question={question as any}
        matchingState={matchingState}
        reviewMode={false}
        onMatch={onMatch}
        onClearMatch={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Fruit'));
    expect(onMatch).not.toHaveBeenCalled();
  });

  it('updates the instruction while selecting and deselecting a left item', () => {
    const matchingState = new Map<string, Map<string, string>>();
    const { getByText } = render(
      <MatchingQuestion
        question={question as any}
        matchingState={matchingState}
        reviewMode={false}
        onMatch={jest.fn()}
        onClearMatch={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Apple'));
    expect(getByText('Now tap a B item →')).toBeTruthy();

    fireEvent.press(getByText('Apple'));
    expect(getByText('Tap an A item to start')).toBeTruthy();
  });

  it('does not allow selecting a right item that is already matched to another pair', () => {
    const currentMatches = new Map<string, string>([['Carrot', 'Fruit']]);
    const matchingState = new Map<string, Map<string, string>>([
      ['q1', currentMatches],
    ]);
    const onMatch = jest.fn();
    const onClearMatch = jest.fn();

    const { getByText } = render(
      <MatchingQuestion
        question={question as any}
        matchingState={matchingState}
        reviewMode={false}
        onMatch={onMatch}
        onClearMatch={onClearMatch}
      />,
    );

    fireEvent.press(getByText('Apple'));
    fireEvent.press(getByText('Fruit'));

    expect(onClearMatch).not.toHaveBeenCalled();
    expect(onMatch).not.toHaveBeenCalled();
  });

  it('falls back to an empty state when correct answers cannot be parsed', () => {
    const matchingState = new Map<string, Map<string, string>>();
    const invalidQuestion = {
      ...question,
      correct_answer: 'not-json',
    };

    const { getByText, queryByText } = render(
      <MatchingQuestion
        question={invalidQuestion as any}
        matchingState={matchingState}
        reviewMode={false}
        onMatch={jest.fn()}
        onClearMatch={jest.fn()}
      />,
    );

    expect(getByText('0/0')).toBeTruthy();
    expect(queryByText('Apple')).toBeNull();
  });
});
