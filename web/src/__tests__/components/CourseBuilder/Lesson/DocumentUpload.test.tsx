import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DocumentUpload } from '../../../../components/CourseBuilder/Lesson/DocumentUpload';

vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn().mockResolvedValue({ value: '<p>doc</p>' }),
  },
}));

vi.mock('jszip', () => ({
  default: class MockZip {
    async loadAsync() {
      return this;
    }
    forEach() {
      return undefined;
    }
    file() {
      return { async: async () => '' };
    }
  },
}));

vi.mock('../../../services/storageService', () => ({
  StorageService: {
    uploadDocument: vi
      .fn()
      .mockResolvedValue({ url: 'https://doc.url', error: null }),
  },
}));

vi.mock('@/components/document/StyledPDFViewer', () => ({
  default: () => <div>Mock PDF Viewer</div>,
}));

vi.mock('@/components/document/OfficeOnlinePreview', () => ({
  default: () => <div>Mock Office Preview</div>,
}));

describe('DocumentUpload', () => {
  const updateLesson = vi.fn();
  const setValidationMessage = vi.fn();
  const setShowValidationModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__lessonFileCache = new Map();
  });

  it('renders document controls', () => {
    render(
      <DocumentUpload
        module={{ id: 'm1' }}
        lesson={{ id: 'l1', resourceUrl: '' }}
        updateLesson={updateLesson}
        showValidationErrors={false}
        hasPdf={false}
        setValidationMessage={setValidationMessage}
        setShowValidationModal={setShowValidationModal}
        currentCourseId="course1"
      />,
    );

    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'URL' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Upload File' }),
    ).toBeInTheDocument();
  });

  it('switches to upload mode by setting local placeholder', () => {
    render(
      <DocumentUpload
        module={{ id: 'm1' }}
        lesson={{ id: 'l1', resourceUrl: '' }}
        updateLesson={updateLesson}
        showValidationErrors={false}
        hasPdf={false}
        setValidationMessage={setValidationMessage}
        setShowValidationModal={setShowValidationModal}
        currentCourseId="course1"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Upload File' }));

    expect(updateLesson).toHaveBeenCalledWith('m1', 'l1', {
      resourceUrl: '[LOCAL_FILE: ]',
    });
  });
});
