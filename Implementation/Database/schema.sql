-- Lost Time Web Application - Database Schema
-- Based on SRS Section 3.3 & Appendix B.2 (Core Data Entities)

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- NFR-04: Secure password hashing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    classification ENUM('Productive', 'Unproductive', 'Lost Time') NOT NULL
);

CREATE TABLE activities (
    activity_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    activity_name VARCHAR(150) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    paused_duration_minutes INT DEFAULT 0,
    duration_minutes INT NOT NULL, -- (end_time - start_time) - paused_duration
    classification ENUM('Productive', 'Unproductive', 'Lost Time') NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE planned_activities (
    planned_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_name VARCHAR(150) NOT NULL,
    plan_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE daily_goals (
    goal_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    goal_type VARCHAR(100) NOT NULL,
    target_minutes INT NOT NULL,
    goal_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE notification_settings (
    setting_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    daily_reminder BOOLEAN DEFAULT TRUE,
    lost_time_alert BOOLEAN DEFAULT TRUE,
    reminder_time TIME DEFAULT '20:00:00',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Boshlang'ich standart kategoriyalar (Seed Data)
INSERT INTO categories (name, classification) VALUES
('Study & Research', 'Productive'),
('Coding / Project Work', 'Productive'),
('Social Media Scrolling', 'Lost Time'),
('Gaming / Entertainment', 'Unproductive'),
('Rest & Meals', 'Unproductive');
