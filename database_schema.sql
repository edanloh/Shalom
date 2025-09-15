-- Shalom Learning Platform Database Schema
-- PostgreSQL Database Creation Script

-- Drop existing tables if they exist (for fresh setup)
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
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS instructors CASCADE;
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

-- Instructors Table (extends users)
CREATE TABLE instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    expertise TEXT[],
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_students INTEGER DEFAULT 0,
    total_courses INTEGER DEFAULT 0,
    years_experience INTEGER,
    education TEXT,
    certifications TEXT[],
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
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    level VARCHAR(20) NOT NULL CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
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
    is_in_wishlist BOOLEAN DEFAULT false,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
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
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
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
('550e8400-e29b-41d4-a716-446655440102', 'jane.smith@email.com', 'Jane Smith', 'https://via.placeholder.com/150', '$2a$10$hashedpassword2', 'student', 2100, '2024-02-20 14:15:00'),
('550e8400-e29b-41d4-a716-446655440103', 'mike.johnson@email.com', 'Mike Johnson', 'https://via.placeholder.com/150', '$2a$10$hashedpassword3', 'student', 750, '2024-03-10 09:45:00'),
('550e8400-e29b-41d4-a716-446655440104', 'emily.davis@email.com', 'Emily Davis', 'https://via.placeholder.com/150', '$2a$10$hashedpassword4', 'student', 1800, '2024-01-25 16:20:00'),
('550e8400-e29b-41d4-a716-446655440105', 'alex.wilson@email.com', 'Alex Wilson', 'https://via.placeholder.com/150', '$2a$10$hashedpassword5', 'student', 950, '2024-04-05 11:30:00'),
-- Instructors
('550e8400-e29b-41d4-a716-446655440201', 'sarah.chen@email.com', 'Sarah Chen', 'https://via.placeholder.com/150', '$2a$10$hashedpassword6', 'instructor', 5000, '2023-08-15 08:00:00'),
('550e8400-e29b-41d4-a716-446655440202', 'james.wilson@email.com', 'Dr. James Wilson', 'https://via.placeholder.com/150', '$2a$10$hashedpassword7', 'instructor', 7500, '2023-06-10 10:15:00'),
('550e8400-e29b-41d4-a716-446655440203', 'emma.rodriguez@email.com', 'Emma Rodriguez', 'https://via.placeholder.com/150', '$2a$10$hashedpassword8', 'instructor', 4200, '2023-09-20 13:45:00'),
('550e8400-e29b-41d4-a716-446655440204', 'michael.park@email.com', 'Michael Park', 'https://via.placeholder.com/150', '$2a$10$hashedpassword9', 'instructor', 6800, '2023-07-05 15:30:00'),
('550e8400-e29b-41d4-a716-446655440205', 'lisa.anderson@email.com', 'Lisa Anderson', 'https://via.placeholder.com/150', '$2a$10$hashedpassword10', 'instructor', 3900, '2023-10-12 12:00:00');

-- Insert Instructors
INSERT INTO instructors (id, user_id, bio, expertise, rating, total_students, total_courses, years_experience, education, certifications) VALUES
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440201', 'Senior Full-Stack Developer with 8+ years of experience building scalable web applications. Passionate about teaching modern web technologies.', ARRAY['React', 'Node.js', 'JavaScript', 'TypeScript', 'MongoDB'], 4.9, 45000, 3, 8, 'BS Computer Science - Stanford University', ARRAY['AWS Certified Developer', 'Google Cloud Professional']),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440202', 'PhD in Machine Learning with extensive research background. Former Google AI researcher, now focusing on making AI accessible through education.', ARRAY['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch'], 4.8, 32000, 2, 12, 'PhD Machine Learning - MIT', ARRAY['TensorFlow Certificate', 'Google AI Certification']),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440203', 'Award-winning UX Designer with a passion for creating beautiful and functional user experiences. Previously worked at Apple and Airbnb.', ARRAY['UI/UX Design', 'Figma', 'Adobe Creative Suite', 'User Research', 'Prototyping'], 4.9, 28000, 2, 10, 'MFA Design - Art Center College of Design', ARRAY['Google UX Design Certificate', 'Adobe Certified Expert']),
('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440204', 'Senior Software Engineer specializing in React and TypeScript. Open source contributor and tech conference speaker.', ARRAY['React', 'TypeScript', 'JavaScript', 'Next.js', 'GraphQL'], 4.7, 18000, 1, 7, 'MS Computer Science - Carnegie Mellon', ARRAY['React Expert Certification', 'TypeScript Advanced']),
('550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440205', 'Digital Marketing expert with 6+ years helping businesses grow online. Specializes in SEO, content marketing, and social media strategy.', ARRAY['Digital Marketing', 'SEO', 'Content Marketing', 'Social Media', 'Google Analytics'], 4.6, 22000, 2, 6, 'MBA Marketing - Wharton School', ARRAY['Google Ads Certified', 'HubSpot Certified']);

-- Insert Courses
INSERT INTO courses (id, title, description, instructor_id, category_id, level, duration_hours, thumbnail_url, rating, total_ratings, student_count, is_published, is_featured, tags) VALUES
('550e8400-e29b-41d4-a716-446655440401', 'Complete Web Development Bootcamp 2024', 'Learn HTML, CSS, JavaScript, React, Node.js, and more in this comprehensive bootcamp. Build real-world projects and become a full-stack developer.', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440001', 'Beginner', 40, 'https://via.placeholder.com/400x250', 4.9, 2180, 45000, true, true, ARRAY['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Full-Stack']),
('550e8400-e29b-41d4-a716-446655440402', 'Machine Learning Fundamentals with Python', 'Master the basics of machine learning with hands-on Python projects. Learn scikit-learn, pandas, and build your first ML models.', '550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440002', 'Intermediate', 35, 'https://via.placeholder.com/400x250', 4.8, 1536, 32000, true, true, ARRAY['Python', 'Machine Learning', 'Data Science', 'scikit-learn', 'pandas']),
('550e8400-e29b-41d4-a716-446655440403', 'UI/UX Design Masterclass', 'Learn user experience design from scratch. Master Figma, design thinking, user research, and create beautiful, functional interfaces.', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440003', 'Beginner', 25, 'https://via.placeholder.com/400x250', 4.9, 1372, 28000, true, true, ARRAY['UI Design', 'UX Design', 'Figma', 'User Research', 'Prototyping']),
('550e8400-e29b-41d4-a716-446655440404', 'Advanced React & TypeScript', 'Deep dive into advanced React patterns, hooks, performance optimization, and TypeScript integration for professional development.', '550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440001', 'Advanced', 30, 'https://via.placeholder.com/400x250', 4.7, 846, 18000, true, false, ARRAY['React', 'TypeScript', 'Advanced', 'Hooks', 'Performance']),
('550e8400-e29b-41d4-a716-446655440405', 'Digital Marketing Mastery', 'Complete guide to digital marketing including SEO, social media marketing, content strategy, and paid advertising campaigns.', '550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440008', 'Beginner', 20,'https://via.placeholder.com/400x250', 4.6, 1012, 22000, true, false, ARRAY['Digital Marketing', 'SEO', 'Social Media', 'Content Marketing', 'PPC']),
('550e8400-e29b-41d4-a716-446655440406', 'React Native Mobile Development', 'Build cross-platform mobile apps with React Native. Learn navigation, state management, and deploy to both iOS and Android.', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440007', 'Intermediate', 28, 'https://via.placeholder.com/400x250', 4.8, 980, 20000, true, false, ARRAY['React Native', 'Mobile Development', 'iOS', 'Android', 'Cross-Platform']);

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
INSERT INTO course_enrollments (id, user_id, course_id, enrollment_date, progress_percentage, is_completed, last_accessed, total_watch_time_minutes) VALUES
('550e8400-e29b-41d4-a716-446655441101', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440401', '2024-02-01 10:00:00', 65.50, false, '2024-09-10 14:30:00', 1200),
('550e8400-e29b-41d4-a716-446655441102', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440403', '2024-03-15 09:15:00', 45.25, false, '2024-09-08 16:45:00', 800),
('550e8400-e29b-41d4-a716-446655441103', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440402', '2024-01-20 11:30:00', 100.00, true, '2024-08-15 12:00:00', 2100),
('550e8400-e29b-41d4-a716-446655441104', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440405', '2024-04-10 13:45:00', 78.90, false, '2024-09-09 10:20:00', 980),
('550e8400-e29b-41d4-a716-446655441105', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440401', '2024-05-05 15:20:00', 32.75, false, '2024-09-07 18:15:00', 650),
('550e8400-e29b-41d4-a716-446655441106', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440403', '2024-02-28 08:45:00', 89.40, false, '2024-09-11 09:30:00', 1350),
('550e8400-e29b-41d4-a716-446655441107', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440404', '2024-06-12 12:10:00', 25.60, false, '2024-09-05 20:45:00', 480);

-- Insert Video Progress
INSERT INTO video_progress (id, user_id, video_id, watch_time_seconds, is_completed, last_position_seconds, completed_at) VALUES
('550e8400-e29b-41d4-a716-446655441201', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440601', 900, true, 900, '2024-02-01 11:15:00'),
('550e8400-e29b-41d4-a716-446655441202', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440602', 800, false, 800, NULL),
('550e8400-e29b-41d4-a716-446655441203', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440605', 1200, true, 1200, '2024-01-21 14:30:00'),
('550e8400-e29b-41d4-a716-446655441204', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440606', 1800, true, 1800, '2024-01-22 10:45:00');

-- Insert Course Ratings
INSERT INTO course_ratings (id, user_id, course_id, rating, review, created_at) VALUES
('550e8400-e29b-41d4-a716-446655441301', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440401', 5, 'Excellent course! Very comprehensive and well-structured. The instructor explains everything clearly.', '2024-08-20 15:30:00'),
('550e8400-e29b-41d4-a716-446655441302', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440402', 5, 'Great introduction to machine learning. The hands-on projects really helped me understand the concepts.', '2024-08-18 12:45:00'),
('550e8400-e29b-41d4-a716-446655441303', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440401', 4, 'Good course overall, but could use more advanced topics in the later sections.', '2024-09-01 09:20:00'),
('550e8400-e29b-41d4-a716-446655441304', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440403', 5, 'Amazing design course! Emma is an incredible instructor. Learned so much about UX principles.', '2024-09-05 16:15:00');

-- Insert Achievements
INSERT INTO achievements (id, name, description, icon, type, criteria, points, color, is_active) VALUES
('550e8400-e29b-41d4-a716-446655441401', 'First Steps', 'Complete your first lesson', 'first-steps', 'badge', '{"type": "lessons_completed", "count": 1}', 50, '#10b981', true),
('550e8400-e29b-41d4-a716-446655441402', 'Learning Streak', 'Learn for 7 consecutive days', 'streak', 'streak', '{"type": "consecutive_days", "count": 7}', 200, '#f59e0b', true),
('550e8400-e29b-41d4-a716-446655441403', 'Course Completion', 'Complete your first course', 'certificate', 'certificate', '{"type": "courses_completed", "count": 1}', 500, '#8b5cf6', true),
('550e8400-e29b-41d4-a716-446655441404', 'Knowledge Seeker', 'Complete 5 courses', 'level', 'level', '{"type": "courses_completed", "count": 5}', 1000, '#3b82f6', true),
('550e8400-e29b-41d4-a716-446655441405', 'Quick Learner', 'Complete a course in under 7 days', 'badge', 'badge', '{"type": "course_completion_time", "days": 7}', 300, '#ef4444', true),
('550e8400-e29b-41d4-a716-446655441406', 'Perfect Score', 'Get 100% on a quiz', 'badge', 'badge', '{"type": "quiz_score", "score": 100}', 150, '#10b981', true);

-- Insert User Achievements
INSERT INTO user_achievements (id, user_id, achievement_id, earned_at, value) VALUES
('550e8400-e29b-41d4-a716-446655441501', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655441401', '2024-02-01 10:30:00', NULL),
('550e8400-e29b-41d4-a716-446655441502', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655441402', '2024-02-08 19:45:00', 7),
('550e8400-e29b-41d4-a716-446655441503', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655441401', '2024-01-20 11:45:00', NULL),
('550e8400-e29b-41d4-a716-446655441504', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655441403', '2024-08-15 12:30:00', NULL),
('550e8400-e29b-41d4-a716-446655441505', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655441406', '2024-03-05 14:20:00', NULL);

-- Insert Quiz Attempts
INSERT INTO quiz_attempts (id, user_id, quiz_id, score, total_questions, correct_answers, time_taken_minutes, is_passed, answers, attempt_number, started_at, completed_at) VALUES
('550e8400-e29b-41d4-a716-446655441601', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440701', 85, 3, 3, 12, true, '{"q1": "HyperText Markup Language", "q2": "<h1>", "q3": "False"}', 1, '2024-02-05 10:00:00', '2024-02-05 10:12:00'),
('550e8400-e29b-41d4-a716-446655441602', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440703', 100, 1, 1, 8, true, '{"q1": ".py"}', 1, '2024-01-25 14:30:00', '2024-01-25 14:38:00'),
('550e8400-e29b-41d4-a716-446655441603', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440702', 100, 1, 1, 15, true, '{"q1": "Cascading Style Sheets"}', 1, '2024-03-05 14:00:00', '2024-03-05 14:15:00');

-- Update category course counts
UPDATE categories SET course_count = (
    SELECT COUNT(*) FROM courses WHERE category_id = categories.id AND is_published = true
);

-- Update instructor statistics
UPDATE instructors SET 
    total_courses = (SELECT COUNT(*) FROM courses WHERE instructor_id = instructors.id AND is_published = true),
    total_students = (SELECT COALESCE(SUM(student_count), 0) FROM courses WHERE instructor_id = instructors.id AND is_published = true);

-- Create views for common queries
CREATE VIEW course_overview AS
SELECT 
    c.id,
    c.title,
    c.description,
    c.level,
    c.duration_hours,
    c.rating,
    c.student_count,
    c.is_featured,
    cat.name as category_name,
    u.name as instructor_name,
    i.rating as instructor_rating
FROM courses c
JOIN categories cat ON c.category_id = cat.id
JOIN instructors i ON c.instructor_id = i.id
JOIN users u ON i.user_id = u.id
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
CREATE TABLE user_module_progress (
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

