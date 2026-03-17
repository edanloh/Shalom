import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCourseBuilder } from './useCourseBuilder';
import { CourseBuilderContext } from './CourseBuilderContextStore';

describe('useCourseBuilder', () => {
  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useCourseBuilder())).toThrow(
      'useCourseBuilder must be used within CourseBuilderProvider',
    );
  });

  it('returns context value when provider is present', () => {
    const contextValue = {
      courseName: 'My course',
      setCourseName: () => undefined,
    } as any;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CourseBuilderContext.Provider value={contextValue}>
        {children}
      </CourseBuilderContext.Provider>
    );

    const { result } = renderHook(() => useCourseBuilder(), { wrapper });

    expect(result.current).toBe(contextValue);
  });
});
