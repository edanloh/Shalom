import { useState, useEffect } from "react";
import { moduleService } from "@/services";
import type { CourseSection, ModuleItem } from "@/services";

export interface NavigationItem {
  item: ModuleItem;
  sectionId: string;
}

/**
 * useCourseNavigation Hook
 * 
 * Manages course navigation logic including:
 * - Fetching course sections/modules
 * - Finding next/previous items across modules
 * - Determining if current item is the last in the course
 * 
 * @param courseId - The course ID
 * @param userId - The user ID
 * @param currentItemId - The current item ID (video/quiz/pdf)
 * @param currentItemType - The type of current item ('video' | 'quiz' | 'pdf')
 * @param currentSectionId - The current section/module ID
 */
export const useCourseNavigation = (
  courseId: string,
  userId: string,
  currentItemId: string,
  currentItemType: "video" | "quiz" | "pdf",
  currentSectionId: string
) => {
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [nextItem, setNextItem] = useState<NavigationItem | null>(null);
  const [previousItem, setPreviousItem] = useState<NavigationItem | null>(null);
  const [isLastItem, setIsLastItem] = useState(false);
  const [isFirstItem, setIsFirstItem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (courseId && userId) {
      fetchCourseSections();
    }
  }, [courseId, userId]);

  useEffect(() => {
    console.log('🎣 Hook useEffect triggered:', {
      hasCourseSections: courseSections.length > 0,
      currentSectionId,
      currentItemId,
      currentItemType,
      sectionsLength: courseSections.length,
    });

    if (courseSections.length > 0 && currentSectionId && currentItemId) {
      const next = findNextItemAcrossModules();
      const prev = findPreviousItemAcrossModules();
      
      console.log('🎣 Navigation calculated:', {
        hasNext: !!next,
        hasPrev: !!prev,
        willBeLastItem: !next,
        willBeFirstItem: !prev,
      });
      
      setNextItem(next);
      setPreviousItem(prev);
      setIsLastItem(!next);
      setIsFirstItem(!prev);
      setInitialized(true);
    } else if (courseSections.length > 0 && !currentSectionId) {
      // If we have sections but no current section, assume we're at the end
      console.log('⚠️ Have sections but no currentSectionId - assuming end of course');
      setNextItem(null);
      setPreviousItem(null);
      setIsLastItem(true);
      setIsFirstItem(false);
      setInitialized(true);
    }
  }, [courseSections, currentSectionId, currentItemId, currentItemType]);

  const fetchCourseSections = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching course sections...', { courseId, userId });
      const moduleDetail = await moduleService.getModuleDetail(courseId, userId);
      console.log('✅ Course sections fetched:', {
        sections: moduleDetail.sections.length,
        sectionTitles: moduleDetail.sections.map(s => s.title),
      });
      setCourseSections(moduleDetail.sections);
    } catch (err) {
      console.error("❌ Error fetching course sections:", err);
      // On error, set safe defaults
      setNextItem(null);
      setPreviousItem(null);
      setIsLastItem(true);
      setIsFirstItem(true);
    } finally {
      setLoading(false);
    }
  };

  const findNextItemAcrossModules = (): NavigationItem | null => {
    if (!currentSectionId || courseSections.length === 0) {
      console.log('❌ Cannot find next - missing data:', {
        hasCurrentSectionId: !!currentSectionId,
        sectionsLength: courseSections.length,
      });
      return null;
    }

    console.log('🔍 Finding next item:', {
      currentItemId,
      currentItemType,
      currentSectionId,
      totalSections: courseSections.length
    });

    const currentSectionIndex = courseSections.findIndex(
      (section) => section.id === currentSectionId
    );

    if (currentSectionIndex === -1) {
      console.log('❌ Current section not found:', currentSectionId);
      return null;
    }

    const currentSection = courseSections[currentSectionIndex];
    console.log(`📍 Current section [${currentSectionIndex}]: ${currentSection.title}, ${currentSection.items?.length || 0} items`);

    // Try to find next item in current module
    if (currentSection.items && currentSection.items.length > 0) {
      const currentItemIndex = currentSection.items.findIndex(
        (item) => item.id === currentItemId && item.type === currentItemType
      );

      console.log(`📍 Current item index: ${currentItemIndex}/${currentSection.items.length - 1}`);

      if (currentItemIndex !== -1 && currentItemIndex < currentSection.items.length - 1) {
        const nextItemInSection = currentSection.items[currentItemIndex + 1];
        console.log(`✅ Found next item in same section: ${nextItemInSection.title} (${nextItemInSection.type})`);
        return {
          item: nextItemInSection,
          sectionId: currentSection.id,
        };
      }
    }

    // Look through remaining sections
    console.log(`🔍 Searching ${courseSections.length - currentSectionIndex - 1} remaining sections...`);
    for (let i = currentSectionIndex + 1; i < courseSections.length; i++) {
      const section = courseSections[i];
      console.log(`  Checking section [${i}]: ${section.title}, ${section.items?.length || 0} items`);
      if (section.items && section.items.length > 0) {
        const nextItem = section.items[0];
        console.log(`✅ Found next item in section [${i}]: ${nextItem.title} (${nextItem.type})`);
        return {
          item: nextItem,
          sectionId: section.id,
        };
      }
    }

    console.log('❌ No next item found - end of course');
    return null;
  };

  const findPreviousItemAcrossModules = (): NavigationItem | null => {
    if (!currentSectionId || courseSections.length === 0) return null;

    const currentSectionIndex = courseSections.findIndex(
      (section) => section.id === currentSectionId
    );

    if (currentSectionIndex === -1) return null;

    const currentSection = courseSections[currentSectionIndex];

    // Try to find previous item in current module
    if (currentSection.items && currentSection.items.length > 0) {
      const currentItemIndex = currentSection.items.findIndex(
        (item) => item.id === currentItemId && item.type === currentItemType
      );

      if (currentItemIndex > 0) {
        return {
          item: currentSection.items[currentItemIndex - 1],
          sectionId: currentSection.id,
        };
      }
    }

    // Look through previous sections
    for (let i = currentSectionIndex - 1; i >= 0; i--) {
      const section = courseSections[i];
      if (section.items && section.items.length > 0) {
        return {
          item: section.items[section.items.length - 1],
          sectionId: section.id,
        };
      }
    }

    return null;
  };

  return {
    courseSections,
    nextItem,
    previousItem,
    isLastItem,
    isFirstItem,
    loading,
    initialized, // NEW: Track if hook has completed its first calculation
    refetch: fetchCourseSections,
  };
};
