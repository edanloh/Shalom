-- Shalom Learning Platform Database Schema
-- PostgreSQL Database Creation Script

-- Drop existing tables if they exist (for fresh setup)
DROP VIEW IF EXISTS course_detailed_stats CASCADE;
DROP VIEW IF EXISTS user_dashboard_summary CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS user_learning_path_progress CASCADE;
DROP TABLE IF EXISTS learning_path_courses CASCADE;
DROP TABLE IF EXISTS learning_paths CASCADE;
DROP TABLE IF EXISTS discussion_replies CASCADE;
DROP TABLE IF EXISTS course_discussions CASCADE;
DROP TABLE IF EXISTS course_resources CASCADE;
DROP TABLE IF EXISTS course_analytics CASCADE;
DROP TABLE IF EXISTS user_analytics CASCADE;
DROP TABLE IF EXISTS user_lesson_progress CASCADE;
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS course_lessons CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS course_prereqs CASCADE;
DROP TABLE IF EXISTS course_skills CASCADE;
DROP TABLE IF EXISTS recommendation_feedback CASCADE;
DROP TABLE IF EXISTS recommendation_events CASCADE;
DROP TABLE IF EXISTS user_targets CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS content_features CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS course_wishlist CASCADE;
DROP TABLE IF EXISTS user_module_progress CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS video_progress CASCADE;
DROP TABLE IF EXISTS course_sections CASCADE;
DROP TABLE IF EXISTS course_requirements CASCADE;
DROP TABLE IF EXISTS course_outcomes CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS course_quizzes CASCADE;
DROP TABLE IF EXISTS course_videos CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS course_enrollments CASCADE;
DROP TABLE IF EXISTS course_ratings CASCADE;
DROP TABLE IF EXISTS credit_events CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
    points INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Credit Events Table
CREATE TABLE credit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    points INTEGER NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    reference_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    color VARCHAR(7), -- hex color
    course_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Courses Table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    instructor_id UUID REFERENCES users(id),
    instructor_name VARCHAR(255) DEFAULT 'Shalom Instructor', -- Single instructor
    category_id UUID NOT NULL REFERENCES categories(id),
    duration_hours INTEGER NOT NULL, -- total duration in hours
    thumbnail_url TEXT,
    video_preview_url TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_ratings INTEGER DEFAULT 0,
    student_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    language VARCHAR(10) DEFAULT 'EN',
    subtitles VARCHAR(50)[],
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Course Sections (modules/chapters)
CREATE TABLE course_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    lessons_count INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Course Videos
CREATE TABLE course_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    is_preview BOOLEAN DEFAULT false,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Course Quizzes
CREATE TABLE course_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    passing_score INTEGER DEFAULT 70, -- percentage
    time_limit_minutes INTEGER,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz Questions
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple-choice', 'true-false', 'text')),
    options JSONB, -- array of options for multiple choice
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Course Requirements
CREATE TABLE course_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    requirement TEXT NOT NULL,
    order_index INTEGER NOT NULL
);

-- Course Outcomes (learning objectives)
CREATE TABLE course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL,
    order_index INTEGER NOT NULL
);

-- Course Enrollments
CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP WITH TIME ZONE,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT false,
    current_video_id UUID REFERENCES course_videos(id),
    total_watch_time_minutes INTEGER DEFAULT 0,
    UNIQUE(user_id, course_id)
);

-- Video Progress Tracking
CREATE TABLE video_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES course_videos(id) ON DELETE CASCADE,
    watch_time_seconds INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    last_position_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, video_id)
);

-- Quiz Attempts
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL, -- percentage
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    time_taken_minutes INTEGER,
    is_passed BOOLEAN DEFAULT false,
    answers JSONB, -- store user answers
    attempt_number INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Course Ratings and Reviews
CREATE TABLE course_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

-- Achievements System
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    type VARCHAR(20) NOT NULL CHECK (type IN ('streak', 'certificate', 'badge', 'level')),
    criteria JSONB, -- conditions to earn this achievement
    points INTEGER DEFAULT 0,
    color VARCHAR(7), -- hex color
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Achievements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    value INTEGER, -- for achievements with numeric values (like streak count)
    UNIQUE(user_id, achievement_id)
);

-- Indexes for better performance
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_published ON courses(is_published);
CREATE INDEX idx_courses_featured ON courses(is_featured);
CREATE INDEX idx_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_enrollments_progress ON course_enrollments(progress_percentage);
CREATE INDEX idx_video_progress_user ON video_progress(user_id);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_course_ratings_course ON course_ratings(course_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON course_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_progress_updated_at BEFORE UPDATE ON video_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_ratings_updated_at BEFORE UPDATE ON course_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert Categories
INSERT INTO categories (id, name, description, icon, color, course_count) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Web Development', 'Learn HTML, CSS, JavaScript, React, and modern web technologies', '💻', '#3b82f6', 0),
('550e8400-e29b-41d4-a716-446655440002', 'Data Science', 'Master Python, Machine Learning, AI, and data analysis', '📊', '#06b6d4', 0),
('550e8400-e29b-41d4-a716-446655440003', 'Design', 'UI/UX Design, Graphic Design, and Creative Skills', '🎨', '#8b5cf6', 0),
('550e8400-e29b-41d4-a716-446655440004', 'Business', 'Marketing, Entrepreneurship, and Business Strategy', '📈', '#10b981', 0),
('550e8400-e29b-41d4-a716-446655440005', 'Photography', 'Digital Photography, Photo Editing, and Visual Storytelling', '📷', '#f59e0b', 0),
('550e8400-e29b-41d4-a716-446655440006', 'Music', 'Music Production, Theory, and Performance', '🎵', '#ef4444', 0),
('550e8400-e29b-41d4-a716-446655440007', 'Programming', 'Software Development, Mobile Apps, and Programming Languages', '💻', '#3b82f6', 0),
('550e8400-e29b-41d4-a716-446655440008', 'Marketing', 'Digital Marketing, SEO, Social Media, and Advertising', '📢', '#dc2626', 0);

-- Insert Users (Students and Instructors)
INSERT INTO users (id, email, name, avatar_url, password_hash, role, points, joined_at) VALUES
-- Students
('550e8400-e29b-41d4-a716-446655440101', 'john.doe@email.com', 'John Doe', 'https://via.placeholder.com/150', '$2a$10$hashedpassword1', 'student', 1250, '2024-01-15 10:30:00'),
('550e8400-e29b-41d4-a716-446655440101', 'jane.smith@email.com', 'Jane Smith', 'https://via.placeholder.com/150', '$2a$10$hashedpassword2', 'student', 2100, '2024-02-20 14:15:00'),
('550e8400-e29b-41d4-a716-446655440103', 'mike.johnson@email.com', 'Mike Johnson', 'https://via.placeholder.com/150', '$2a$10$hashedpassword3', 'student', 750, '2024-03-10 09:45:00'),
('550e8400-e29b-41d4-a716-446655440104', 'emily.davis@email.com', 'Emily Davis', 'https://via.placeholder.com/150', '$2a$10$hashedpassword4', 'student', 1800, '2024-01-25 16:20:00'),
('550e8400-e29b-41d4-a716-446655440105', 'alex.wilson@email.com', 'Alex Wilson', 'https://via.placeholder.com/150', '$2a$10$hashedpassword5', 'student', 950, '2024-04-05 11:30:00'),
-- Admin/Instructor
('550e8400-e29b-41d4-a716-446655440201', 'admin@shalom.edu', 'Shalom Instructor', 'https://via.placeholder.com/150', '$2a$10$hashedpassword6', 'admin', 5000, '2023-08-15 08:00:00');

-- Insert Courses (instructor_name instead of instructor_id)
INSERT INTO courses (id, title, description, instructor_name, category_id, duration_hours, thumbnail_url, rating, total_ratings, student_count, is_published, is_featured, tags) VALUES
('550e8400-e29b-41d4-a716-446655440401', 'Complete Web Development Bootcamp 2024', 'Learn HTML, CSS, JavaScript, React, Node.js, and more in this comprehensive bootcamp. Build real-world projects and become a full-stack developer.', 'Shalom Instructor', '550e8400-e29b-41d4-a716-446655440001', 40, 'https://via.placeholder.com/400x250', 4.9, 2180, 45000, true, true, ARRAY['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Full-Stack']),
('550e8400-e29b-41d4-a716-446655440402', 'Machine Learning Fundamentals with Python', 'Master the basics of machine learning with hands-on Python projects. Learn scikit-learn, pandas, and build your first ML models.', 'Shalom Instructor', '550e8400-e29b-41d4-a716-446655440002', 35, 'https://via.placeholder.com/400x250', 4.8, 1536, 32000, true, true, ARRAY['Python', 'Machine Learning', 'Data Science', 'scikit-learn', 'pandas']),
('550e8400-e29b-41d4-a716-446655440403', 'UI/UX Design Masterclass', 'Learn user experience design from scratch. Master Figma, design thinking, user research, and create beautiful, functional interfaces.', 'Shalom Instructor', '550e8400-e29b-41d4-a716-446655440003', 25, 'https://via.placeholder.com/400x250', 4.9, 1372, 28000, true, true, ARRAY['UI Design', 'UX Design', 'Figma', 'User Research', 'Prototyping']),
('550e8400-e29b-41d4-a716-446655440404', 'Advanced React & TypeScript', 'Deep dive into advanced React patterns, hooks, performance optimization, and TypeScript integration for professional development.', 'Shalom Instructor', '550e8400-e29b-41d4-a716-446655440001', 30, 'https://via.placeholder.com/400x250', 4.7, 846, 18000, true, false, ARRAY['React', 'TypeScript', 'Advanced', 'Hooks', 'Performance']),
('550e8400-e29b-41d4-a716-446655440405', 'Digital Marketing Mastery', 'Complete guide to digital marketing including SEO, social media marketing, content strategy, and paid advertising campaigns.', 'Shalom Instructor', '550e8400-e29b-41d4-a716-446655440008', 20,'https://via.placeholder.com/400x250', 4.6, 1012, 22000, true, false, ARRAY['Digital Marketing', 'SEO', 'Social Media', 'Content Marketing', 'PPC']),
('550e8400-e29b-41d4-a716-446655440406', 'React Native Mobile Development', 'Build cross-platform mobile apps with React Native. Learn navigation, state management, and deploy to both iOS and Android.', 'Shalom Instructor', '550e8400-e29b-41d4-a716-446655440007', 28, 'https://via.placeholder.com/400x250', 4.8, 980, 20000, true, false, ARRAY['React Native', 'Mobile Development', 'iOS', 'Android', 'Cross-Platform']);

-- Insert Course Sections
INSERT INTO course_sections (id, course_id, title, description, order_index, lessons_count, duration_minutes) VALUES
-- Web Development Bootcamp Sections
('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440401', 'Introduction to Web Development', 'Get started with web development fundamentals and set up your development environment.', 1, 5, 120),
('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440401', 'HTML Fundamentals', 'Learn HTML structure, semantic elements, forms, and best practices.', 2, 8, 240),
('550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440401', 'CSS Styling', 'Master CSS selectors, flexbox, grid, animations, and responsive design.', 3, 10, 360),
('550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440401', 'JavaScript Basics', 'Learn JavaScript fundamentals, DOM manipulation, and modern ES6+ features.', 4, 12, 480),
('550e8400-e29b-41d4-a716-446655440505', '550e8400-e29b-41d4-a716-446655440401', 'React Framework', 'Build interactive UIs with React components, hooks, and state management.', 5, 15, 600),
-- Machine Learning Sections
('550e8400-e29b-41d4-a716-446655440506', '550e8400-e29b-41d4-a716-446655440402', 'Python for Data Science', 'Master Python basics and data science libraries like NumPy and Pandas.', 1, 8, 300),
('550e8400-e29b-41d4-a716-446655440507', '550e8400-e29b-41d4-a716-446655440402', 'Machine Learning Algorithms', 'Learn supervised and unsupervised learning algorithms with practical examples.', 2, 12, 450),
('550e8400-e29b-41d4-a716-446655440508', '550e8400-e29b-41d4-a716-446655440402', 'Model Evaluation and Deployment', 'Evaluate model performance and deploy ML models to production.', 3, 10, 350);

-- Insert Course Videos
INSERT INTO course_videos (id, course_id, section_id, title, description, video_url, duration_seconds, order_index, is_preview, thumbnail_url) VALUES
-- Web Development Course Videos
('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440501', 'Welcome to Web Development', 'Course introduction and what you will learn', 'https://example.com/video1.mp4', 900, 1, true, 'https://via.placeholder.com/320x180'),
('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440501', 'Setting Up Development Environment', 'Install VS Code, Node.js, and essential extensions', 'https://example.com/video2.mp4', 1200, 2, false, 'https://via.placeholder.com/320x180'),
('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440502', 'HTML Document Structure', 'Learn about HTML document structure and semantic elements', 'https://example.com/video3.mp4', 1500, 1, false, 'https://via.placeholder.com/320x180'),
('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440502', 'HTML Forms and Input Elements', 'Creating forms with various input types and validation', 'https://example.com/video4.mp4', 1800, 2, false, 'https://via.placeholder.com/320x180'),
-- Machine Learning Course Videos
('550e8400-e29b-41d4-a716-446655440605', '550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440506', 'Introduction to Machine Learning', 'Overview of machine learning concepts and applications', 'https://example.com/video5.mp4', 1200, 1, true, 'https://via.placeholder.com/320x180'),
('550e8400-e29b-41d4-a716-446655440606', '550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440506', 'Python Libraries for Data Science', 'Introduction to NumPy, Pandas, and Matplotlib', 'https://example.com/video6.mp4', 1800, 2, false, 'https://via.placeholder.com/320x180');

-- Insert Course Quizzes
INSERT INTO course_quizzes (id, course_id, section_id, title, description, order_index, passing_score, time_limit_minutes, max_attempts) VALUES
('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440502', 'HTML Basics Quiz', 'Test your knowledge of HTML fundamentals', 1, 70, 15, 3),
('550e8400-e29b-41d4-a716-446655440702', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440503', 'CSS Fundamentals Quiz', 'Test your understanding of CSS concepts', 1, 70, 20, 3),
('550e8400-e29b-41d4-a716-446655440703', '550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440506', 'Python Basics Quiz', 'Test your Python programming knowledge', 1, 75, 25, 3);

-- Insert Quiz Questions
INSERT INTO quiz_questions (id, quiz_id, question, question_type, options, correct_answer, explanation, points, order_index) VALUES
('550e8400-e29b-41d4-a716-446655440801', '550e8400-e29b-41d4-a716-446655440701', 'What does HTML stand for?', 'multiple-choice', '["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink and Text Markup Language"]', 'HyperText Markup Language', 'HTML stands for HyperText Markup Language, which is the standard markup language for creating web pages.', 1, 1),
('550e8400-e29b-41d4-a716-446655440802', '550e8400-e29b-41d4-a716-446655440701', 'Which HTML element is used for the largest heading?', 'multiple-choice', '["<h1>", "<h6>", "<header>", "<heading>"]', '<h1>', 'The <h1> element represents the largest heading in HTML, with <h6> being the smallest.', 1, 2),
('550e8400-e29b-41d4-a716-446655440803', '550e8400-e29b-41d4-a716-446655440701', 'HTML is a programming language.', 'true-false', '["True", "False"]', 'False', 'HTML is a markup language, not a programming language. It is used to structure content on the web.', 1, 3),
('550e8400-e29b-41d4-a716-446655440804', '550e8400-e29b-41d4-a716-446655440702', 'What does CSS stand for?', 'multiple-choice', '["Cascading Style Sheets", "Computer Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"]', 'Cascading Style Sheets', 'CSS stands for Cascading Style Sheets, used for styling HTML elements.', 1, 1),
('550e8400-e29b-41d4-a716-446655440805', '550e8400-e29b-41d4-a716-446655440703', 'What is the correct file extension for Python files?', 'multiple-choice', '[".py", ".python", ".pt", ".p"]', '.py', 'Python files use the .py extension.', 1, 1);

-- Insert Course Requirements
INSERT INTO course_requirements (id, course_id, requirement, order_index) VALUES
('550e8400-e29b-41d4-a716-446655440901', '550e8400-e29b-41d4-a716-446655440401', 'Basic computer knowledge', 1),
('550e8400-e29b-41d4-a716-446655440902', '550e8400-e29b-41d4-a716-446655440401', 'No programming experience required', 2),
('550e8400-e29b-41d4-a716-446655440903', '550e8400-e29b-41d4-a716-446655440401', 'A computer with internet connection', 3),
('550e8400-e29b-41d4-a716-446655440904', '550e8400-e29b-41d4-a716-446655440402', 'Basic Python programming knowledge', 1),
('550e8400-e29b-41d4-a716-446655440905', '550e8400-e29b-41d4-a716-446655440402', 'High school level mathematics', 2),
('550e8400-e29b-41d4-a716-446655440906', '550e8400-e29b-41d4-a716-446655440403', 'No design experience required', 1),
('550e8400-e29b-41d4-a716-446655440907', '550e8400-e29b-41d4-a716-446655440403', 'Computer with Figma installed', 2);

-- Insert Course Outcomes
INSERT INTO course_outcomes (id, course_id, outcome, order_index) VALUES
('550e8400-e29b-41d4-a716-446655441001', '550e8400-e29b-41d4-a716-446655440401', 'Build responsive websites from scratch', 1),
('550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655440401', 'Create interactive web applications with React', 2),
('550e8400-e29b-41d4-a716-446655441003', '550e8400-e29b-41d4-a716-446655440401', 'Understand modern web development practices', 3),
('550e8400-e29b-41d4-a716-446655441004', '550e8400-e29b-41d4-a716-446655440401', 'Deploy applications to the web', 4),
('550e8400-e29b-41d4-a716-446655441005', '550e8400-e29b-41d4-a716-446655440402', 'Build and evaluate machine learning models', 1),
('550e8400-e29b-41d4-a716-446655441006', '550e8400-e29b-41d4-a716-446655440402', 'Work with real-world datasets using Python', 2),
('550e8400-e29b-41d4-a716-446655441007', '550e8400-e29b-41d4-a716-446655440403', 'Design user-centered interfaces', 1),
('550e8400-e29b-41d4-a716-446655441008', '550e8400-e29b-41d4-a716-446655440403', 'Create prototypes and conduct user research', 2);

-- Insert Course Enrollments
INSERT INTO course_enrollments (id, user_id, course_id, enrollment_date, progress_percentage, is_completed, total_watch_time_minutes) VALUES
('550e8400-e29b-41d4-a716-446655441101', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440401', '2024-02-01 10:00:00', 65.50, false, 1200),
('550e8400-e29b-41d4-a716-446655441102', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440403', '2024-03-15 09:15:00', 45.25, false, 800),
('550e8400-e29b-41d4-a716-446655441103', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440402', '2024-01-20 11:30:00', 100.00, true, 2100),
('550e8400-e29b-41d4-a716-446655441104', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440405', '2024-04-10 13:45:00', 78.90, false, 980),
('550e8400-e29b-41d4-a716-446655441105', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440401', '2024-05-05 15:20:00', 32.75, false, 650),
('550e8400-e29b-41d4-a716-446655441106', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440403', '2024-02-28 08:45:00', 89.40, false, 1350),
('550e8400-e29b-41d4-a716-446655441107', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440404', '2024-06-12 12:10:00', 25.60, false, 480);

-- Insert Video Progress
INSERT INTO video_progress (id, user_id, video_id, watch_time_seconds, is_completed, last_position_seconds, completed_at) VALUES
('550e8400-e29b-41d4-a716-446655441201', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440601', 900, true, 900, '2024-02-01 11:15:00'),
('550e8400-e29b-41d4-a716-446655441202', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440602', 800, false, 800, NULL),
('550e8400-e29b-41d4-a716-446655441203', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440605', 1200, true, 1200, '2024-01-21 14:30:00'),
('550e8400-e29b-41d4-a716-446655441204', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440606', 1800, true, 1800, '2024-01-22 10:45:00');

-- Insert Course Ratings
INSERT INTO course_ratings (id, user_id, course_id, rating, review, created_at) VALUES
('550e8400-e29b-41d4-a716-446655441301', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440401', 5, 'Excellent course! Very comprehensive and well-structured. The instructor explains everything clearly.', '2024-08-20 15:30:00'),
('550e8400-e29b-41d4-a716-446655441302', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440402', 5, 'Great introduction to machine learning. The hands-on projects really helped me understand the concepts.', '2024-08-18 12:45:00'),
('550e8400-e29b-41d4-a716-446655441303', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440401', 4, 'Good course overall, but could use more advanced topics in the later sections.', '2024-09-01 09:20:00'),
('550e8400-e29b-41d4-a716-446655441304', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440403', 5, 'Amazing design course! Emma is an incredible instructor. Learned so much about UX principles.', '2024-09-05 16:15:00');

-- Insert Achievements
INSERT INTO achievements (id, name, description, icon, type, criteria, points, color, is_active) VALUES
('550e8400-e29b-41d4-a716-446655441401', 'First Steps', 'Complete your first lesson', 'first-steps', 'badge', '{"type": "lessons_completed", "count": 1}', 50, '#10b981', true),
('550e8400-e29b-41d4-a716-446655441402', 'Learning Streak', 'Learn for 7 consecutive days', 'streak', 'streak', '{"type": "consecutive_days", "count": 7}', 200, '#f59e0b', true),
('550e8400-e29b-41d4-a716-446655441403', 'Course Completion', 'Complete your first course', 'certificate', 'certificate', '{"type": "courses_completed", "count": 1}', 500, '#8b5cf6', true),
('550e8400-e29b-41d4-a716-446655441404', 'Knowledge Seeker', 'Complete 5 courses', 'level', 'level', '{"type": "courses_completed", "count": 5}', 1000, '#3b82f6', true),
('550e8400-e29b-41d4-a716-446655441405', 'Quick Learner', 'Complete a course in under 7 days', 'badge', 'badge', '{"type": "course_completion_time", "days": 7}', 300, '#ef4444', true),
('550e8400-e29b-41d4-a716-446655441406', 'Perfect Score', 'Get 100% on a quiz', 'badge', 'badge', '{"type": "quiz_score", "score": 100}', 150, '#10b981', true),
('550e8400-e29b-41d4-a716-446655441407', 'Credit Collector', 'Earn 500 total credits', 'badge', 'badge', '{"type": "total_credits", "count": 500}', 200, '#22c55e', true),
('550e8400-e29b-41d4-a716-446655441408', 'Credit Master', 'Earn 1000 total credits', 'level', 'level', '{"type": "total_credits", "count": 1000}', 400, '#14b8a6', true),
('550e8400-e29b-41d4-a716-446655441409', 'Goal Getter', 'Hit 1 learning goal', 'badge', 'badge', '{"type": "goal_hits", "count": 1}', 150, '#f97316', true),
('550e8400-e29b-41d4-a716-446655441410', 'Goal Streak', 'Hit 5 learning goals', 'level', 'level', '{"type": "goal_hits", "count": 5}', 350, '#f59e0b', true);

-- Insert User Achievements
INSERT INTO user_achievements (id, user_id, achievement_id, earned_at, value) VALUES
('550e8400-e29b-41d4-a716-446655441501', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655441401', '2024-02-01 10:30:00', NULL),
('550e8400-e29b-41d4-a716-446655441502', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655441402', '2024-02-08 19:45:00', 7),
('550e8400-e29b-41d4-a716-446655441503', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655441401', '2024-01-20 11:45:00', NULL),
('550e8400-e29b-41d4-a716-446655441504', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655441403', '2024-08-15 12:30:00', NULL),
('550e8400-e29b-41d4-a716-446655441505', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655441406', '2024-03-05 14:20:00', NULL);

-- Insert Quiz Attempts
INSERT INTO quiz_attempts (id, user_id, quiz_id, score, total_questions, correct_answers, time_taken_minutes, is_passed, answers, attempt_number, started_at, completed_at) VALUES
('550e8400-e29b-41d4-a716-446655441601', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440701', 85, 3, 3, 12, true, '{"q1": "HyperText Markup Language", "q2": "<h1>", "q3": "False"}', 1, '2024-02-05 10:00:00', '2024-02-05 10:12:00'),
('550e8400-e29b-41d4-a716-446655441602', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440703', 100, 1, 1, 8, true, '{"q1": ".py"}', 1, '2024-01-25 14:30:00', '2024-01-25 14:38:00'),
('550e8400-e29b-41d4-a716-446655441603', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440702', 100, 1, 1, 15, true, '{"q1": "Cascading Style Sheets"}', 1, '2024-03-05 14:00:00', '2024-03-05 14:15:00');

-- Update category course counts
UPDATE categories SET course_count = (
    SELECT COUNT(*) FROM courses WHERE category_id = categories.id AND is_published = true
);

-- Create views for common queries
CREATE VIEW course_overview AS
SELECT 
    c.id,
    c.title,
    c.description,
    c.duration_hours,
    c.rating,
    c.student_count,
    c.is_featured,
    cat.name as category_name,
    c.instructor_name
FROM courses c
JOIN categories cat ON c.category_id = cat.id
WHERE c.is_published = true;

CREATE VIEW user_progress_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(ce.id) as enrolled_courses,
    COUNT(CASE WHEN ce.is_completed = true THEN 1 END) as completed_courses,
    COALESCE(AVG(ce.progress_percentage), 0) as avg_progress,
    SUM(ce.total_watch_time_minutes) as total_watch_time_minutes,
    COUNT(ua.id) as total_achievements
FROM users u
LEFT JOIN course_enrollments ce ON u.id = ce.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.email;

-- Sample Queries to Test the Database

-- Get all published courses with instructor and category info
-- SELECT * FROM course_overview ORDER BY rating DESC, student_count DESC;

-- Get user's enrolled courses with progress
-- SELECT 
--     c.title,
--     c.instructor_name,
--     ce.progress_percentage,
--     ce.is_completed,
--     ce.last_accessed
-- FROM course_enrollments ce
-- JOIN course_overview c ON ce.course_id = c.id
-- WHERE ce.user_id = '550e8400-e29b-41d4-a716-446655440101'
-- ORDER BY ce.last_accessed DESC;

-- Get user achievements
-- SELECT 
--     a.name,
--     a.description,
--     a.type,
--     a.points,
--     ua.earned_at,
--     ua.value
-- FROM user_achievements ua
-- JOIN achievements a ON ua.achievement_id = a.id
-- WHERE ua.user_id = '550e8400-e29b-41d4-a716-446655440101'
-- ORDER BY ua.earned_at DESC;

-- Get course statistics
-- SELECT 
--     c.title,
--     c.student_count,
--     c.rating,
--     COUNT(cr.id) as review_count,
--     AVG(cr.rating) as calculated_rating
-- FROM courses c
-- LEFT JOIN course_ratings cr ON c.id = cr.course_id
-- WHERE c.is_published = true
-- GROUP BY c.id, c.title, c.student_count, c.rating
-- ORDER BY c.student_count DESC;

-- End of Database Schema

-- ADDITIONAL CHANGES 15/09/2025
-- Add to course_sections table
ALTER TABLE course_sections ADD COLUMN section_order INTEGER;

-- Add review aggregation data
ALTER TABLE courses ADD COLUMN rating_breakdown JSONB; -- Store {5: 40, 4: 30, 3: 15, 2: 10, 1: 5}

-- Add user progress tracking
CREATE TABLE IF NOT EXISTS user_module_progress (
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  section_id UUID REFERENCES course_sections(id),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  PRIMARY KEY (user_id, course_id, section_id)
);

-- Add default sections for courses missing them
INSERT INTO course_sections (
    id, course_id, title, description, order_index, lessons_count, duration_minutes
)
VALUES
-- UI/UX Design Masterclass
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440403',
 'Introduction to UI/UX Design',
 'Overview of the course and fundamentals of user interface and experience design.',
 1, 4, 120),

-- Advanced React & TypeScript
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440404',
 'Getting Started with Advanced React & TypeScript',
 'Introduction to TypeScript with React, project setup, and advanced concepts outline.',
 1, 5, 150),

-- Digital Marketing Mastery
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440405',
 'Digital Marketing Foundations',
 'Core concepts of digital marketing, audience targeting, and analytics basics.',
 1, 3, 90),

-- React Native Mobile Development
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440406',
 'Introduction to React Native',
 'Setup React Native environment and create your first mobile application.',
 1, 4, 100);


-- Insert default course_videos for new sections
-- Insert one intro video per new section
INSERT INTO course_videos (
    id, course_id, section_id, title, description, video_url,
    duration_seconds, order_index, is_preview, thumbnail_url
)
SELECT 
    uuid_generate_v4(),
    cs.course_id,
    cs.id,
    'Welcome to ' || c.title,
    'An introduction to the course and what you will learn.',
    'https://example.com/videos/' || c.id || '/intro.mp4',
    600,   -- 10 minutes
    1,
    true,
    'https://via.placeholder.com/320x180'
FROM course_sections cs
JOIN courses c ON c.id = cs.course_id
WHERE cs.course_id IN (
    '550e8400-e29b-41d4-a716-446655440403',
    '550e8400-e29b-41d4-a716-446655440404',
    '550e8400-e29b-41d4-a716-446655440405',
    '550e8400-e29b-41d4-a716-446655440406'
)
AND NOT EXISTS (
    SELECT 1 FROM course_videos v WHERE v.section_id = cs.id
);

-- ============================================================================
-- ADDITIONAL SCHEMA UPDATES BASED ON WEB/MOBILE SOURCE CODE ANALYSIS
-- 08/10/2025 - Align database with actual application requirements
-- ============================================================================

-- Course Wishlist Table - Separate table for better performance and features
CREATE TABLE IF NOT EXISTS course_wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

-- User Preferences Table - Store notification settings and app preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    assignment_reminders BOOLEAN DEFAULT true,
    course_updates BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    weekly_progress_summary BOOLEAN DEFAULT true,
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    theme_preference VARCHAR(20) DEFAULT 'light', -- light, dark, auto
    auto_play_videos BOOLEAN DEFAULT true,
    video_quality VARCHAR(20) DEFAULT 'auto', -- auto, 720p, 1080p
    subtitle_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table - Store in-app notifications and alerts
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- assignment, course_update, achievement, message, system
    related_entity_type VARCHAR(50), -- course, user, achievement, etc.
    related_entity_id UUID, -- ID of the related entity
    is_read BOOLEAN DEFAULT false,
    action_url TEXT, -- Optional URL for notification action
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Personalization: store per-user goals, interests, and interaction feedback
CREATE TABLE IF NOT EXISTS user_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_certificate TEXT,
    target_degree TEXT,
    target_role TEXT,
    current_level VARCHAR(20) DEFAULT 'Beginner' CHECK (current_level IN ('Beginner', 'Intermediate', 'Advanced')),
    desired_skills TEXT[],
    preferred_languages TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    weight NUMERIC(6,3) DEFAULT 1.000,
    source VARCHAR(50) DEFAULT 'declared', -- declared, behavior, inferred
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, topic)
);

-- Content features table keeps per-course signals (so we can evolve ranking without altering core courses table)
CREATE TABLE IF NOT EXISTS content_features (
    course_id UUID PRIMARY KEY REFERENCES courses(id) ON DELETE CASCADE,
    tags TEXT[],
    duration_minutes INTEGER,
    popularity_score NUMERIC(6,3) DEFAULT 0.000,
    freshness_score NUMERIC(6,3) DEFAULT 0.000,
    quality_score NUMERIC(6,3) DEFAULT 0.000,
    last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge graph edges: skills taught/required and prerequisites
CREATE TABLE IF NOT EXISTS course_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    proficiency VARCHAR(20) DEFAULT 'fundamentals', -- fundamentals, intermediate, advanced
    UNIQUE(course_id, skill)
);

CREATE TABLE IF NOT EXISTS course_prereqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    prereq_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(course_id, prereq_course_id)
);

-- Events emitted when recommendations are shown or interacted with
CREATE TABLE IF NOT EXISTS recommendation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('impression', 'view', 'click', 'start', 'complete', 'dismiss', 'save')),
    context JSONB,
    request_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Explicit feedback so we can fine-tune ranking weights
CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    relevance_score INTEGER CHECK (relevance_score BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_topic ON user_interests(topic);
CREATE INDEX IF NOT EXISTS idx_content_features_popularity ON content_features(popularity_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_course_skills_skill ON course_skills(skill);
CREATE INDEX IF NOT EXISTS idx_course_prereqs_course ON course_prereqs(course_id);
CREATE INDEX IF NOT EXISTS idx_course_prereqs_prereq ON course_prereqs(prereq_course_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_user ON recommendation_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_course ON recommendation_events(course_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user ON recommendation_feedback(user_id);

-- Course Content Enhancements - Support for lessons, assignments, and detailed content
CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL, -- video, text, quiz, assignment, resource
    content_url TEXT, -- URL for video, document, etc.
    content_data JSONB, -- Additional content metadata
    duration_minutes INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    is_preview BOOLEAN DEFAULT false,
    points_value INTEGER DEFAULT 0, -- Points awarded for completion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignments Table - Support for course assignments
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES course_lessons(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT,
    assignment_type VARCHAR(50) NOT NULL, -- essay, project, code, presentation
    max_points INTEGER DEFAULT 100,
    due_date TIMESTAMP WITH TIME ZONE,
    submission_format VARCHAR(100), -- file, text, link, etc.
    allowed_file_types TEXT[], -- Array of allowed file extensions
    max_file_size_mb INTEGER DEFAULT 10,
    rubric JSONB, -- Grading rubric
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignment Submissions Table
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_text TEXT,
    file_urls TEXT[], -- Array of submitted file URLs
    submission_status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, graded, returned
    submitted_at TIMESTAMP WITH TIME ZONE,
    graded_at TIMESTAMP WITH TIME ZONE,
    score INTEGER, -- Points earned
    feedback TEXT, -- Instructor feedback
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    attempt_number INTEGER DEFAULT 1,
    is_late BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, user_id, attempt_number)
);

-- User Lesson Progress - Detailed tracking of lesson completion
CREATE TABLE IF NOT EXISTS user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT false,
    time_spent_minutes INTEGER DEFAULT 0,
    last_position JSONB, -- Store last position for resumable content
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- Analytics Tables - Support for course and user analytics
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_time_minutes INTEGER DEFAULT 0,
    courses_accessed INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    quizzes_attempted INTEGER DEFAULT 0,
    assignments_submitted INTEGER DEFAULT 0,
    login_count INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS course_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_enrollments INTEGER DEFAULT 0,
    new_enrollments INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    average_progress DECIMAL(5,2) DEFAULT 0.00,
    total_watch_time_minutes INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    assignment_submissions INTEGER DEFAULT 0,
    dropout_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, date)
);

-- Course Resources Table - Additional resources like PDFs, links, etc.
CREATE TABLE IF NOT EXISTS course_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES course_lessons(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL, -- pdf, link, file, tool
    resource_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    download_count INTEGER DEFAULT 0,
    is_downloadable BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discussion Forums - Course discussions and Q&A
CREATE TABLE IF NOT EXISTS course_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES course_lessons(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    discussion_type VARCHAR(50) DEFAULT 'question', -- question, announcement, discussion
    is_pinned BOOLEAN DEFAULT false,
    is_answered BOOLEAN DEFAULT false,
    upvotes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discussion_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID NOT NULL REFERENCES course_discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_solution BOOLEAN DEFAULT false,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Learning Paths - Structured course sequences
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    difficulty_level VARCHAR(20) NOT NULL CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
    estimated_duration_hours INTEGER NOT NULL,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_path_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(learning_path_id, course_id)
);

-- User Learning Path Progress
CREATE TABLE IF NOT EXISTS user_learning_path_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    current_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, learning_path_id)
);

-- Certificates Table - Digital certificates for course completion
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    learning_path_id UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
    certificate_type VARCHAR(50) NOT NULL, -- course_completion, learning_path, achievement
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    issuer_name VARCHAR(500) DEFAULT 'Shalom Learning Platform',
    credential_url TEXT, -- URL to verify certificate
    metadata JSONB, -- Additional certificate data
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON course_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_course ON course_wishlist(course_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section ON course_lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON course_lessons(course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON assignment_submissions(submission_status);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON user_lesson_progress(lesson_id);

CREATE INDEX IF NOT EXISTS idx_user_analytics_user_date ON user_analytics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_course_analytics_course_date ON course_analytics(course_id, date);

CREATE INDEX IF NOT EXISTS idx_discussions_course ON course_discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_discussions_lesson ON course_discussions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_discussions_user ON course_discussions(user_id);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);

-- Add triggers for updated_at timestamps on new tables (drop existing first to avoid conflicts)
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
DROP TRIGGER IF EXISTS update_lessons_updated_at ON course_lessons;
DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
DROP TRIGGER IF EXISTS update_submissions_updated_at ON assignment_submissions;
DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON user_lesson_progress;
DROP TRIGGER IF EXISTS update_discussions_updated_at ON course_discussions;
DROP TRIGGER IF EXISTS update_discussion_replies_updated_at ON discussion_replies;
DROP TRIGGER IF EXISTS update_learning_paths_updated_at ON learning_paths;
DROP TRIGGER IF EXISTS update_learning_path_progress_updated_at ON user_learning_path_progress;
DROP TRIGGER IF EXISTS update_user_targets_updated_at ON user_targets;
DROP TRIGGER IF EXISTS update_user_interests_updated_at ON user_interests;
DROP TRIGGER IF EXISTS update_content_features_updated_at ON content_features;

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON course_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON assignment_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON user_lesson_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON course_discussions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discussion_replies_updated_at BEFORE UPDATE ON discussion_replies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON learning_paths FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_path_progress_updated_at BEFORE UPDATE ON user_learning_path_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_targets_updated_at BEFORE UPDATE ON user_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_interests_updated_at BEFORE UPDATE ON user_interests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_features_updated_at BEFORE UPDATE ON content_features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some sample data for new tables to test functionality (using ON CONFLICT to handle duplicates)
INSERT INTO user_preferences (user_id, email_notifications, push_notifications, theme_preference) VALUES
('550e8400-e29b-41d4-a716-446655440101', true, true, 'light'),
('550e8400-e29b-41d4-a716-446655440101', true, false, 'dark'),
('550e8400-e29b-41d4-a716-446655440103', false, true, 'auto')
ON CONFLICT (user_id) DO NOTHING;

-- Sample wishlist data
INSERT INTO course_wishlist (user_id, course_id) VALUES
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440404'),
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440403')
ON CONFLICT (user_id, course_id) DO NOTHING;

-- Sample notifications
INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'New Assignment Available', 'A new assignment has been posted in Complete Web Development Bootcamp 2024', 'assignment', 'course', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440101', 'Course Completed!', 'Congratulations! You have completed Machine Learning Fundamentals with Python', 'achievement', 'course', '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440103', 'Welcome to Shalom!', 'Welcome to Shalom Learning Platform. Start your learning journey today!', 'system', NULL, NULL);

-- Sample personalization data
INSERT INTO user_targets (id, user_id, target_certificate, target_role, current_level, desired_skills) VALUES
('550e8400-e29b-41d4-a716-446655520101', '550e8400-e29b-41d4-a716-446655440101', 'Full-Stack Web Developer', 'Frontend Engineer', 'Intermediate', ARRAY['React', 'TypeScript', 'UI/UX']),
('550e8400-e29b-41d4-a716-446655520102', '550e8400-e29b-41d4-a716-446655440103', 'Data Science Specialist', 'Data Analyst', 'Beginner', ARRAY['Python', 'SQL', 'Statistics'])
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_interests (id, user_id, topic, weight, source) VALUES
('550e8400-e29b-41d4-a716-446655520201', '550e8400-e29b-41d4-a716-446655440101', 'React', 2.500, 'declared'),
('550e8400-e29b-41d4-a716-446655520202', '550e8400-e29b-41d4-a716-446655440101', 'TypeScript', 2.000, 'behavior'),
('550e8400-e29b-41d4-a716-446655520203', '550e8400-e29b-41d4-a716-446655440103', 'Machine Learning', 2.700, 'declared')
ON CONFLICT (user_id, topic) DO NOTHING;

INSERT INTO content_features (course_id, tags, duration_minutes, popularity_score, freshness_score, quality_score) VALUES
('550e8400-e29b-41d4-a716-446655440401', ARRAY['React', 'Frontend', 'TypeScript'], 720, 9.500, 7.200, 9.200),
('550e8400-e29b-41d4-a716-446655440402', ARRAY['Python', 'Data Science', 'Machine Learning'], 640, 9.800, 8.100, 9.000),
('550e8400-e29b-41d4-a716-446655440404', ARRAY['Node', 'Backend', 'API'], 560, 8.900, 6.800, 8.700)
ON CONFLICT (course_id) DO NOTHING;

INSERT INTO course_skills (id, course_id, skill, proficiency) VALUES
('550e8400-e29b-41d4-a716-446655520501', '550e8400-e29b-41d4-a716-446655440401', 'React', 'intermediate'),
('550e8400-e29b-41d4-a716-446655520502', '550e8400-e29b-41d4-a716-446655440401', 'TypeScript', 'intermediate'),
('550e8400-e29b-41d4-a716-446655520503', '550e8400-e29b-41d4-a716-446655440402', 'Python', 'fundamentals'),
('550e8400-e29b-41d4-a716-446655520504', '550e8400-e29b-41d4-a716-446655440402', 'Machine Learning', 'fundamentals'),
('550e8400-e29b-41d4-a716-446655520505', '550e8400-e29b-41d4-a716-446655440404', 'Node', 'intermediate'),
('550e8400-e29b-41d4-a716-446655520506', '550e8400-e29b-41d4-a716-446655440404', 'APIs', 'intermediate')
ON CONFLICT (course_id, skill) DO NOTHING;

INSERT INTO course_prereqs (id, course_id, prereq_course_id) VALUES
('550e8400-e29b-41d4-a716-446655520601', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440402') -- React course requires Python/ML fundamentals (example)
ON CONFLICT (course_id, prereq_course_id) DO NOTHING;

INSERT INTO recommendation_events (id, user_id, course_id, event_type, context, request_id) VALUES
('550e8400-e29b-41d4-a716-446655520301', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440401', 'impression', '{"placement": "home_recs"}', 'req-recs-seed'),
('550e8400-e29b-41d4-a716-446655520302', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440401', 'click', '{"placement": "home_recs"}', 'req-recs-seed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO recommendation_feedback (id, user_id, course_id, relevance_score, notes) VALUES
('550e8400-e29b-41d4-a716-446655520401', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440401', 5, 'Aligned with my React goal'),
('550e8400-e29b-41d4-a716-446655520402', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440402', 4, 'Great for ML basics')
ON CONFLICT (id) DO NOTHING;

-- Sample course lessons
INSERT INTO course_lessons (id, course_id, section_id, title, description, content_type, content_url, duration_minutes, order_index, is_required, points_value) VALUES
('550e8400-e29b-41d4-a716-446655450001', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440501', 'Course Introduction', 'Welcome to the complete web development bootcamp', 'video', 'https://example.com/lesson1.mp4', 15, 1, true, 10),
('550e8400-e29b-41d4-a716-446655450002', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440501', 'Setting Up Your Environment', 'Install all necessary tools for web development', 'video', 'https://example.com/lesson2.mp4', 25, 2, true, 15),
('550e8400-e29b-41d4-a716-446655450003', '550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440506', 'Introduction to Python', 'Learn Python basics for data science', 'video', 'https://example.com/lesson3.mp4', 30, 1, true, 20)
ON CONFLICT (id) DO NOTHING;

-- Sample assignments
INSERT INTO assignments (id, course_id, lesson_id, title, description, instructions, assignment_type, max_points, due_date, submission_format, allowed_file_types) VALUES
('550e8400-e29b-41d4-a716-446655460001', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655450001', 'Build Your First Website', 'Create a simple HTML website with CSS styling', 'Create a personal portfolio website using HTML and CSS. Include at least 3 pages: Home, About, and Contact.', 'project', 100, '2024-12-15 23:59:00', 'file', ARRAY['html', 'css', 'zip']),
('550e8400-e29b-41d4-a716-446655460002', '550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655450003', 'Data Analysis Project', 'Analyze a dataset using Python and pandas', 'Download the provided dataset and perform exploratory data analysis. Submit a Jupyter notebook with your findings.', 'code', 100, '2024-12-20 23:59:00', 'file', ARRAY['ipynb', 'py'])
ON CONFLICT (id) DO NOTHING;

-- Sample assignment submissions
INSERT INTO assignment_submissions (id, assignment_id, user_id, submission_text, file_urls, submission_status, submitted_at, score, feedback, graded_by, attempt_number) VALUES
('550e8400-e29b-41d4-a716-446655470001', '550e8400-e29b-41d4-a716-446655460001', '550e8400-e29b-41d4-a716-446655440101', 'Here is my portfolio website project', ARRAY['https://example.com/portfolio.zip'], 'graded', '2024-12-10 18:30:00', 85, 'Great work! The design is clean and responsive. Consider adding more interactive elements.', '550e8400-e29b-41d4-a716-446655440201', 1),
('550e8400-e29b-41d4-a716-446655470002', '550e8400-e29b-41d4-a716-446655460002', '550e8400-e29b-41d4-a716-446655440101', 'My data analysis of the sales dataset', ARRAY['https://example.com/analysis.ipynb'], 'submitted', '2024-12-18 14:20:00', NULL, NULL, NULL, 1)
ON CONFLICT (id) DO NOTHING;

-- Sample user lesson progress
INSERT INTO user_lesson_progress (id, user_id, lesson_id, progress_percentage, is_completed, time_spent_minutes, completed_at) VALUES
('550e8400-e29b-41d4-a716-446655480001', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655450001', 100.00, true, 20, '2024-11-01 10:30:00'),
('550e8400-e29b-41d4-a716-446655480002', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655450002', 65.00, false, 18, NULL),
('550e8400-e29b-41d4-a716-446655480003', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655450003', 100.00, true, 35, '2024-11-05 16:45:00')
ON CONFLICT (id) DO NOTHING;

-- Sample user module progress
INSERT INTO user_module_progress (user_id, course_id, section_id, is_completed, completed_at) VALUES
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440501', true, '2024-11-01 15:00:00'),
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440502', false, NULL),
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440506', true, '2024-11-05 18:30:00')
ON CONFLICT (user_id, course_id, section_id) DO NOTHING;

-- Sample user analytics
INSERT INTO user_analytics (id, user_id, date, total_time_minutes, courses_accessed, lessons_completed, quizzes_attempted, assignments_submitted, login_count, streak_days, points_earned) VALUES
('550e8400-e29b-41d4-a716-446655490001', '550e8400-e29b-41d4-a716-446655440101', '2024-12-01', 120, 2, 3, 1, 0, 2, 5, 45),
('550e8400-e29b-41d4-a716-446655490002', '550e8400-e29b-41d4-a716-446655440101', '2024-12-02', 90, 1, 2, 2, 1, 1, 6, 70),
('550e8400-e29b-41d4-a716-446655490003', '550e8400-e29b-41d4-a716-446655440101', '2024-12-01', 150, 1, 4, 1, 1, 3, 8, 95)
ON CONFLICT (id) DO NOTHING;

-- Sample course analytics
INSERT INTO course_analytics (id, course_id, date, total_enrollments, new_enrollments, completions, average_progress, total_watch_time_minutes, quiz_attempts, assignment_submissions) VALUES
('550e8400-e29b-41d4-a716-446655500001', '550e8400-e29b-41d4-a716-446655440401', '2024-12-01', 45000, 150, 5, 42.5, 25000, 120, 45),
('550e8400-e29b-41d4-a716-446655500002', '550e8400-e29b-41d4-a716-446655440402', '2024-12-01', 32000, 98, 8, 56.8, 18000, 85, 32),
('550e8400-e29b-41d4-a716-446655500003', '550e8400-e29b-41d4-a716-446655440403', '2024-12-01', 28000, 78, 3, 35.2, 15000, 65, 28)
ON CONFLICT (id) DO NOTHING;

-- Sample course resources
INSERT INTO course_resources (id, course_id, lesson_id, title, description, resource_type, resource_url, is_downloadable, order_index) VALUES
('550e8400-e29b-41d4-a716-446655510001', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655450001', 'HTML Cheat Sheet', 'Quick reference for HTML tags', 'pdf', 'https://example.com/html-cheatsheet.pdf', true, 1),
('550e8400-e29b-41d4-a716-446655510002', '550e8400-e29b-41d4-a716-446655440401', NULL, 'MDN Web Docs', 'Official web development documentation', 'link', 'https://developer.mozilla.org', false, 2),
('550e8400-e29b-41d4-a716-446655510003', '550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655450003', 'Python Data Science Handbook', 'Comprehensive guide to data science in Python', 'pdf', 'https://example.com/python-ds-handbook.pdf', true, 1)
ON CONFLICT (id) DO NOTHING;

-- Sample course discussions
INSERT INTO course_discussions (id, course_id, lesson_id, user_id, title, content, discussion_type, is_pinned, views, upvotes) VALUES
('550e8400-e29b-41d4-a716-446655520001', '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655450001', '550e8400-e29b-41d4-a716-446655440101', 'Question about HTML semantics', 'Can someone explain when to use <section> vs <div>?', 'question', false, 25, 3),
('550e8400-e29b-41d4-a716-446655520002', '550e8400-e29b-41d4-a716-446655440402', NULL, '550e8400-e29b-41d4-a716-446655440201', 'Welcome to Machine Learning!', 'Introduction to the course and what you can expect to learn', 'announcement', true, 150, 18)
ON CONFLICT (id) DO NOTHING;

-- Sample discussion replies
INSERT INTO discussion_replies (id, discussion_id, user_id, content, is_solution, upvotes) VALUES
('550e8400-e29b-41d4-a716-446655530001', '550e8400-e29b-41d4-a716-446655520001', '550e8400-e29b-41d4-a716-446655440201', 'Great question! Use <section> for thematic groupings of content with a heading, and <div> for styling or layout purposes without semantic meaning.', true, 5),
('550e8400-e29b-41d4-a716-446655530002', '550e8400-e29b-41d4-a716-446655520001', '550e8400-e29b-41d4-a716-446655440101', 'Thanks for the explanation! That makes much more sense now.', false, 2)
ON CONFLICT (id) DO NOTHING;

-- Sample learning paths
INSERT INTO learning_paths (id, title, description, difficulty_level, estimated_duration_hours, is_published, is_featured, created_by) VALUES
('550e8400-e29b-41d4-a716-446655540001', 'Full-Stack Web Developer', 'Complete path from beginner to full-stack developer', 'Beginner', 120, true, true, '550e8400-e29b-41d4-a716-446655440201'),
('550e8400-e29b-41d4-a716-446655540002', 'Data Science Specialist', 'Master data science and machine learning', 'Intermediate', 80, true, false, '550e8400-e29b-41d4-a716-446655440201')
ON CONFLICT (id) DO NOTHING;

-- Sample learning path courses
INSERT INTO learning_path_courses (id, learning_path_id, course_id, order_index, is_required) VALUES
('550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655540001', '550e8400-e29b-41d4-a716-446655440401', 1, true),
('550e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655540001', '550e8400-e29b-41d4-a716-446655440404', 2, true),
('550e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655540002', '550e8400-e29b-41d4-a716-446655440402', 1, true)
ON CONFLICT (id) DO NOTHING;

-- Sample user learning path progress
INSERT INTO user_learning_path_progress (id, user_id, learning_path_id, current_course_id, progress_percentage, is_completed, started_at) VALUES
('550e8400-e29b-41d4-a716-446655560001', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655540001', '550e8400-e29b-41d4-a716-446655440401', 65.5, false, '2024-02-01 10:00:00'),
('550e8400-e29b-41d4-a716-446655560002', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655540002', NULL, 100.0, true, '2024-01-20 11:30:00')
ON CONFLICT (id) DO NOTHING;

-- Sample certificates
INSERT INTO certificates (id, user_id, course_id, certificate_type, certificate_number, issued_at, credential_url, is_public) VALUES
('550e8400-e29b-41d4-a716-446655570001', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440402', 'course_completion', 'CERT-ML-2024-001', '2024-08-15 12:30:00', 'https://shalom.edu/verify/CERT-ML-2024-001', true),
('550e8400-e29b-41d4-a716-446655570002', '550e8400-e29b-41d4-a716-446655440101', NULL, 'learning_path', 'CERT-DS-2024-001', '2024-09-01 14:00:00', 'https://shalom.edu/verify/CERT-DS-2024-001', true)
ON CONFLICT (certificate_number) DO NOTHING;

-- Create comprehensive views for the enhanced schema (moved after table creation)
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.points,
    COUNT(DISTINCT ce.id) as enrolled_courses,
    COUNT(DISTINCT CASE WHEN ce.is_completed = true THEN ce.id END) as completed_courses,
    COUNT(DISTINCT cw.id) as wishlist_count,
    COUNT(DISTINCT ua.id) as achievements_count,
    COUNT(DISTINCT CASE WHEN n.is_read = false THEN n.id END) as unread_notifications,
    COALESCE(AVG(ce.progress_percentage), 0) as avg_progress
FROM users u
LEFT JOIN course_enrollments ce ON u.id = ce.user_id
LEFT JOIN course_wishlist cw ON u.id = cw.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
LEFT JOIN notifications n ON u.id = n.user_id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.email, u.points;

CREATE OR REPLACE VIEW course_detailed_stats AS
SELECT 
    c.id,
    c.title,
    c.student_count,
    c.rating,
    COUNT(DISTINCT ce.id) as current_enrollments,
    COUNT(DISTINCT CASE WHEN ce.is_completed = true THEN ce.id END) as completions,
    COUNT(DISTINCT cw.id) as wishlist_count,
    COUNT(DISTINCT cr.id) as review_count,
    COUNT(DISTINCT cs.id) as sections_count,
    COUNT(DISTINCT cl.id) as lessons_count,
    COUNT(DISTINCT cq.id) as quizzes_count,
    COUNT(DISTINCT a.id) as assignments_count,
    COALESCE(AVG(ce.progress_percentage), 0) as avg_progress_percentage
FROM courses c
LEFT JOIN course_enrollments ce ON c.id = ce.course_id
LEFT JOIN course_wishlist cw ON c.id = cw.course_id
LEFT JOIN course_ratings cr ON c.id = cr.course_id
LEFT JOIN course_sections cs ON c.id = cs.course_id
LEFT JOIN course_lessons cl ON c.id = cl.course_id
LEFT JOIN course_quizzes cq ON c.id = cq.course_id
LEFT JOIN assignments a ON c.id = a.course_id
WHERE c.is_published = true
GROUP BY c.id, c.title, c.student_count, c.rating;
