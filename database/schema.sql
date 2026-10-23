-- =======================================================
-- MediCare - Hospital Website, Appointment & Queue System
-- Database Schema (MySQL 8.0+)
-- =======================================================

CREATE DATABASE IF NOT EXISTS medicare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medicare_db;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'heart-pulse',
    default_consult_min INT DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department_id INT NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    room VARCHAR(50) NOT NULL,
    experience_years INT DEFAULT 10,
    bio TEXT,
    image_url VARCHAR(255),
    status ENUM('available', 'busy', 'off') DEFAULT 'available',
    working_start TIME DEFAULT '10:00:00',
    working_end TIME DEFAULT '14:00:00',
    slot_duration INT DEFAULT 15, -- minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Users Table (Patients, Doctors, Admin/Receptionist)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor', 'admin', 'receptionist') DEFAULT 'patient',
    doctor_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    INDEX idx_user_role (role),
    INDEX idx_user_phone (phone)
) ENGINE=InnoDB;

-- 4. Slots Table (Auto-generated per doctor working hours)
CREATE TABLE IF NOT EXISTS slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('available', 'booked', 'missed') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_doc_date_time (doctor_id, date, start_time),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_slot_lookup (doctor_id, date, status)
) ENGINE=InnoDB;

-- 5. Appointments Table (Atomic slot booking)
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NULL,
    patient_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    disease TEXT NOT NULL,
    whatsapp_no VARCHAR(25) NOT NULL,
    notes TEXT NULL,
    slot_id INT NOT NULL,
    token_no VARCHAR(20) NOT NULL,
    doctor_id INT NOT NULL,
    department_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    checked_in BOOLEAN DEFAULT FALSE,
    status ENUM('booked', 'checked_in', 'rescheduled', 'missed', 'completed', 'cancelled') DEFAULT 'booked',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    INDEX idx_appt_date_doctor (date, doctor_id, status),
    INDEX idx_appt_whatsapp (whatsapp_no)
) ENGINE=InnoDB;

-- 6. Live Queue Table
CREATE TABLE IF NOT EXISTS queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    token_no VARCHAR(20) NOT NULL,
    doctor_id INT NOT NULL,
    department_id INT NOT NULL,
    patient_name VARCHAR(100) NOT NULL,
    status ENUM('waiting', 'in_progress', 'completed', 'missed') DEFAULT 'waiting',
    position INT DEFAULT 1,
    called_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    INDEX idx_queue_active (doctor_id, status)
) ENGINE=InnoDB;

-- 7. WhatsApp / Notification Logs Table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NULL,
    recipient_phone VARCHAR(25) NOT NULL,
    message_text TEXT NOT NULL,
    provider ENUM('whatsapp_cloud', 'twilio', 'simulation') DEFAULT 'simulation',
    status ENUM('sent', 'delivered', 'failed') DEFAULT 'sent',
    error_message TEXT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    INDEX idx_messages_phone (recipient_phone)
) ENGINE=InnoDB;

-- 8. System Settings Table (Admin configurable)
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Initial Settings
INSERT INTO settings (setting_key, setting_value) VALUES
('slot_duration_min', '15'),
('grace_period_min', '10'),
('hospital_name', 'MediCare Hospital & Medical Center'),
('hospital_phone', '+91 98765 43210'),
('hospital_email', 'contact@medicare.com')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);
