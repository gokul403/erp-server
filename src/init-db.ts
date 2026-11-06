import bcrypt from "bcryptjs";
import { pool } from "./config/database/postgres.js";

// Mock data definitions for seeding
const SCHOOLS = [
  { id: "SCH-001", name: "Greenfield International", city: "Bengaluru", students: 2487, plan: "Enterprise", status: "Active", academic_year: "2025-26", curriculum: "CBSE" },
  { id: "SCH-002", name: "Sunrise Public School", city: "Mumbai", students: 1842, plan: "Pro", status: "Active", academic_year: "2025-26", curriculum: "ICSE" },
  { id: "SCH-003", name: "Mount Carmel Academy", city: "Delhi", students: 3210, plan: "Enterprise", status: "Active", academic_year: "2025-26", curriculum: "CBSE" },
  { id: "SCH-004", name: "Riverdale High", city: "Pune", students: 1276, plan: "Pro", status: "Trial", academic_year: "2025-26", curriculum: "IB" },
  { id: "SCH-005", name: "Holy Cross Convent", city: "Chennai", students: 2104, plan: "Enterprise", status: "Active", academic_year: "2025-26", curriculum: "State Board" },
  { id: "SCH-006", name: "Vidya Niketan", city: "Hyderabad", students: 968, plan: "Starter", status: "Active", academic_year: "2025-26", curriculum: "State Board" },
  { id: "SCH-007", name: "Lotus Valley School", city: "Noida", students: 1542, plan: "Pro", status: "Suspended", academic_year: "2025-26", curriculum: "CBSE" },
  { id: "SCH-008", name: "Bright Horizons", city: "Kolkata", students: 1108, plan: "Starter", status: "Active", academic_year: "2025-26", curriculum: "ICSE" },
];

const ROLE_USERS = {
  super_admin: { name: "Ananya Kapoor", email: "ananya@edusync.io", avatar: "AK" },
  school_admin: { name: "Rohit Mehta", email: "rohit@greenfield.edu", avatar: "RM" },
  principal: { name: "Dr. Priya Sharma", email: "principal@greenfield.edu", avatar: "PS" },
  teacher: { name: "Vikram Iyer", email: "vikram@greenfield.edu", avatar: "VI" },
  student: { name: "Aarav Singh", email: "aarav.s@greenfield.edu", avatar: "AS" },
  librarian: { name: "Meena Joseph", email: "meena@greenfield.edu", avatar: "MJ" },
};

const STUDENTS = [
  { id: "STU-1042", name: "Aarav Singh", grade: "Grade 10", section: "A", roll: 12, guardian: "Rajesh Singh", phone: "98214 33210", status: "Active", email: "aarav.s@greenfield.edu", dob: "2011-05-15", gender: "Male", address: "22 Lavelle Road, Bengaluru 560001", blood_group: "O+", admission_date: "2025-06-01", aadhaar_passport: "1234-5678-9012", father_name: "Rajesh Singh", mother_name: "Vandana Singh" },
  { id: "STU-1043", name: "Ananya Rao", grade: "Grade 9", section: "B", roll: 24, guardian: "Sunita Rao", phone: "98765 11220", status: "Active", email: "ananya.r@greenfield.edu", dob: "2012-08-20", gender: "Female", address: "45 Indiranagar, Bengaluru 560038", blood_group: "A+", admission_date: "2025-06-01", aadhaar_passport: "2345-6789-0123", father_name: "Suresh Rao", mother_name: "Sunita Rao" },
  { id: "STU-1044", name: "Ishaan Verma", grade: "Grade 6", section: "B", roll: 7, guardian: "Manoj Verma", phone: "99003 87241", status: "Active", email: "ishaan.v@greenfield.edu", dob: "2015-03-10", gender: "Male", address: "88 HSR Layout, Bengaluru 560102", blood_group: "B+", admission_date: "2025-06-01", aadhaar_passport: "3456-7890-1234", father_name: "Manoj Verma", mother_name: "Kiran Verma" },
  { id: "STU-1045", name: "Diya Patel", grade: "Grade 11", section: "A", roll: 3, guardian: "Kiran Patel", phone: "97412 09183", status: "Active", email: "diya.p@greenfield.edu", dob: "2010-11-05", gender: "Female", address: "12 Koramangala, Bengaluru 560034", blood_group: "AB+", admission_date: "2025-06-01", aadhaar_passport: "4567-8901-2345", father_name: "Kiran Patel", mother_name: "Sonal Patel" },
  { id: "STU-1046", name: "Kabir Khan", grade: "Grade 8", section: "C", roll: 18, guardian: "Salma Khan", phone: "98101 22388", status: "Active", email: "kabir.k@greenfield.edu", dob: "2013-01-25", gender: "Male", address: "101 Whitefield, Bengaluru 560066", blood_group: "O-", admission_date: "2025-06-01", aadhaar_passport: "5678-9012-3456", father_name: "Ahmed Khan", mother_name: "Salma Khan" },
  { id: "STU-1047", name: "Saanvi Iyer", grade: "Grade 7", section: "A", roll: 5, guardian: "Ramesh Iyer", phone: "99988 04412", status: "Active", email: "saanvi.i@greenfield.edu", dob: "2014-07-14", gender: "Female", address: "55 Jayanagar, Bengaluru 560041", blood_group: "B-", admission_date: "2025-06-01", aadhaar_passport: "6789-0123-4567", father_name: "Ramesh Iyer", mother_name: "Meenakshi Iyer" },
  { id: "STU-1048", name: "Arjun Nair", grade: "Grade 12", section: "B", roll: 21, guardian: "Geeta Nair", phone: "98765 88231", status: "Alumni", email: "arjun.n@greenfield.edu", dob: "2009-04-30", gender: "Male", address: "77 Malleshwaram, Bengaluru 560003", blood_group: "A-", admission_date: "2024-06-01", aadhaar_passport: "7890-1234-5678", father_name: "Madhavan Nair", mother_name: "Geeta Nair" },
  { id: "STU-1049", name: "Myra Kapoor", grade: "Grade 5", section: "A", roll: 9, guardian: "Anil Kapoor", phone: "98123 45901", status: "Active", email: "myra.k@greenfield.edu", dob: "2016-09-18", gender: "Female", address: "23 Sadashivanagar, Bengaluru 560080", blood_group: "O+", admission_date: "2025-06-01", aadhaar_passport: "8901-2345-6789", father_name: "Anil Kapoor", mother_name: "Ritu Kapoor" },
  { id: "STU-1050", name: "Vihaan Reddy", grade: "Grade 4", section: "B", roll: 14, guardian: "Lakshmi Reddy", phone: "98231 09812", status: "Active", email: "vihaan.r@greenfield.edu", dob: "2017-12-05", gender: "Male", address: "34 Electronic City, Bengaluru 560100", blood_group: "B+", admission_date: "2025-06-01", aadhaar_passport: "9012-3456-7890", father_name: "Venkat Reddy", mother_name: "Lakshmi Reddy" },
  { id: "STU-1051", name: "Anika Bose", grade: "Grade 10", section: "C", roll: 28, guardian: "Subir Bose", phone: "98711 23498", status: "Active", email: "anika.b@greenfield.edu", dob: "2011-10-12", gender: "Female", address: "12 Bannerghatta Road, Bengaluru 560076", blood_group: "AB-", admission_date: "2025-06-01", aadhaar_passport: "0123-4567-8901", father_name: "Subir Bose", mother_name: "Reema Bose" },
];

const STAFF = [
  { id: "EMP-201", name: "Vikram Iyer", role: "Mathematics Teacher", dept: "Sr. Secondary", phone: "98452 11023", joined: "2018-06-12", status: "Active" },
  { id: "EMP-202", name: "Dr. Priya Sharma", role: "Principal", dept: "Administration", phone: "98765 33421", joined: "2015-04-01", status: "Active" },
  { id: "EMP-203", name: "Neha Aggarwal", role: "Science Teacher", dept: "Sr. Secondary", phone: "98231 09182", joined: "2020-07-15", status: "Active" },
  { id: "EMP-204", name: "Sandeep Rao", role: "Sports Coach", dept: "Athletics", phone: "97412 98230", joined: "2021-08-02", status: "Active" },
  { id: "EMP-205", name: "Meena Joseph", role: "Librarian", dept: "Library", phone: "98109 22134", joined: "2019-11-09", status: "Active" },
  { id: "EMP-206", name: "Ravi Kumar", role: "English Teacher", dept: "Primary", phone: "97211 08231", joined: "2022-01-20", status: "On Leave" },
  { id: "EMP-207", name: "Sneha Pillai", role: "Accountant", dept: "Finance", phone: "98230 41023", joined: "2017-03-18", status: "Active" },
  { id: "EMP-208", name: "Dr. Sarah Miller", role: "Head of Science", dept: "Science", phone: "98230 41028", joined: "2016-05-14", status: "Active" },
  { id: "EMP-209", name: "Prof. James Wilson", role: "Head of Humanities", dept: "Humanities", phone: "98230 41029", joined: "2017-08-20", status: "Active" },
  { id: "EMP-210", name: "Elena Rodriguez", role: "Head of Administration", dept: "Administration", phone: "98230 41030", joined: "2019-03-11", status: "Active" },
  { id: "EMP-211", name: "Mark Davids", role: "Head of Visual Arts", dept: "Visual Arts", phone: "98230 41031", joined: "2020-09-01", status: "Active" },
  { id: "EMP-212", name: "Samira Al-Fayed", role: "Head of Technology", dept: "Technology", phone: "98230 41032", joined: "2018-11-15", status: "Active" },
];

const ADMISSIONS = [
  { id: "ADM-2025-091", applicant: "Aanya Gupta", grade: "Grade 1", appliedOn: "2025-06-12", status: "Approved" },
  { id: "ADM-2025-092", applicant: "Reyansh Joshi", grade: "Grade 6", appliedOn: "2025-06-13", status: "Pending" },
  { id: "ADM-2025-093", applicant: "Aadhya Menon", grade: "Grade 9", appliedOn: "2025-06-13", status: "Interview" },
  { id: "ADM-2025-094", applicant: "Vivaan Saxena", grade: "Grade 4", appliedOn: "2025-06-14", status: "Approved" },
  { id: "ADM-2025-095", applicant: "Mira Chowdhury", grade: "Grade 11", appliedOn: "2025-06-15", status: "Rejected" },
  { id: "ADM-2025-096", applicant: "Krish Bansal", grade: "Grade 2", appliedOn: "2025-06-15", status: "Documents" },
  { id: "ADM-2025-097", applicant: "Tara Sinha", grade: "Grade 7", appliedOn: "2025-06-16", status: "Pending" },
];

const FEES = [
  { id: "INV-30421", student: "Aarav Singh", grade: "Grade 10-A", amount: 32500, due: "2025-07-05", status: "Paid" },
  { id: "INV-30422", student: "Ananya Rao", grade: "Grade 9-B", amount: 28500, due: "2025-07-05", status: "Paid" },
  { id: "INV-30423", student: "Ishaan Verma", grade: "Grade 6-B", amount: 24000, due: "2025-07-10", status: "Pending" },
  { id: "INV-30424", student: "Diya Patel", grade: "Grade 11-A", amount: 36000, due: "2025-07-10", status: "Overdue" },
  { id: "INV-30425", student: "Kabir Khan", grade: "Grade 8-C", amount: 26500, due: "2025-07-12", status: "Paid" },
  { id: "INV-30426", student: "Saanvi Iyer", grade: "Grade 7-A", amount: 25500, due: "2025-07-12", status: "Partial" },
  { id: "INV-30427", student: "Myra Kapoor", grade: "Grade 5-A", amount: 22500, due: "2025-07-15", status: "Pending" },
];

const TIMETABLE = [
  { time: "08:00 — 08:45", mon: "Mathematics", tue: "English", wed: "Science", thu: "Mathematics", fri: "History" },
  { time: "08:45 — 09:30", mon: "English", tue: "Mathematics", wed: "Hindi", thu: "Science", fri: "Mathematics" },
  { time: "09:30 — 10:15", mon: "Science", tue: "Geography", wed: "English", thu: "Computer", fri: "Science" },
  { time: "10:15 — 10:30", mon: "— Break —", tue: "— Break —", wed: "— Break —", thu: "— Break —", fri: "— Break —" },
  { time: "10:30 — 11:15", mon: "Computer", tue: "Science", wed: "Mathematics", thu: "English", fri: "Art" },
  { time: "11:15 — 12:00", mon: "Hindi", tue: "Computer", wed: "Geography", thu: "Hindi", fri: "P.E." },
  { time: "12:00 — 12:45", mon: "P.E.", tue: "Music", wed: "Library", thu: "P.E.", fri: "English" },
];

const BOOKS = [
  { id: "BK-1001", title: "The Wings of Fire", author: "A.P.J. Abdul Kalam", category: "Biography", copies: 12, available: 8 },
  { id: "BK-1002", title: "Wings of Imagination", author: "Ruskin Bond", category: "Fiction", copies: 8, available: 3 },
  { id: "BK-1003", title: "Fundamentals of Physics", author: "Halliday & Resnick", category: "Reference", copies: 6, available: 2 },
  { id: "BK-1004", title: "A Brief History of Time", author: "Stephen Hawking", category: "Science", copies: 4, available: 4 },
  { id: "BK-1005", title: "The Discovery of India", author: "Jawaharlal Nehru", category: "History", copies: 10, available: 6 },
  { id: "BK-1006", title: "Harry Potter & The Sorcerer's Stone", author: "J.K. Rowling", category: "Fiction", copies: 15, available: 5 },
  { id: "BK-1007", title: "Atomic Habits", author: "James Clear", category: "Self-help", copies: 7, available: 7 },
];

const ISSUED_BOOKS = [
  { id: "ISS-7821", book: "Wings of Imagination", student: "Ananya Rao", grade: "Grade 9-B", issued: "2025-06-20", due: "2025-07-04", status: "Issued" },
  { id: "ISS-7822", book: "Harry Potter & The Sorcerer's Stone", student: "Ishaan Verma", grade: "Grade 6-B", issued: "2025-06-22", due: "2025-07-06", status: "Overdue" },
  { id: "ISS-7823", book: "Fundamentals of Physics", student: "Diya Patel", grade: "Grade 11-A", issued: "2025-06-25", due: "2025-07-09", status: "Issued" },
  { id: "ISS-7824", book: "The Discovery of India", student: "Arjun Nair", grade: "Grade 12-B", issued: "2025-06-26", due: "2025-07-10", status: "Issued" },
];

const ASSIGNMENTS = [
  { id: "ASG-401", title: "Quadratic Equations Worksheet", subject: "Mathematics", class: "Grade 10-A", due: "2025-07-05", submitted: 28, total: 34 },
  { id: "ASG-402", title: "Photosynthesis Lab Report", subject: "Science", class: "Grade 9-B", due: "2025-07-07", submitted: 22, total: 32 },
  { id: "ASG-403", title: "Essay on Climate Change", subject: "English", class: "Grade 8-C", due: "2025-07-04", submitted: 30, total: 30 },
  { id: "ASG-404", title: "Map Work: Indian Rivers", subject: "Geography", class: "Grade 7-A", due: "2025-07-08", submitted: 18, total: 28 },
];

const NOTIFICATIONS = [
  { title: "Parent-Teacher meeting on Saturday", time_ago: "2 hours ago", type: "notice" },
  { title: "Mid-term results published", time_ago: "Yesterday", type: "exam" },
  { title: "Library: New arrivals this week", time_ago: "2 days ago", type: "library" },
  { title: "Annual day rehearsals start Monday", time_ago: "3 days ago", type: "event" },
];

const SUBSCRIPTIONS = [
  { id: "SUB-9001", school: "Greenfield International", plan: "Enterprise", seats: 2500, mrr: 142000, renews: "2026-01-15", status: "Active" },
  { id: "SUB-9002", school: "Sunrise Public School", plan: "Pro", seats: 2000, mrr: 84000, renews: "2025-11-02", status: "Active" },
  { id: "SUB-9003", school: "Mount Carmel Academy", plan: "Enterprise", seats: 3500, mrr: 168000, renews: "2026-03-22", status: "Active" },
  { id: "SUB-9004", school: "Riverdale High", plan: "Pro", seats: 1500, mrr: 0, renews: "2025-07-30", status: "Trial" },
  { id: "SUB-9005", school: "Lotus Valley School", plan: "Pro", seats: 1800, mrr: 78000, renews: "2025-09-12", status: "Past Due" },
];

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log("Connected to the database. Initializing schemas...");

    // Start transaction
    await client.query("BEGIN");

    // Drop tables if they exist in reverse dependency order
    await client.query(`
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS assignments CASCADE;
      DROP TABLE IF EXISTS issued_books CASCADE;
      DROP TABLE IF EXISTS books CASCADE;
      DROP TABLE IF EXISTS class_timetables CASCADE;
      DROP TABLE IF EXISTS timetable CASCADE;
      DROP TABLE IF EXISTS fees CASCADE;
      DROP TABLE IF EXISTS admissions CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
      DROP TABLE IF EXISTS staff CASCADE;
      DROP TABLE IF EXISTS classes CASCADE;
      DROP TABLE IF EXISTS students CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS schools CASCADE;
      DROP TABLE IF EXISTS subscriptions CASCADE;
    `);

    console.log("Dropped existing tables (if any).");

    // 1. schools
    await client.query(`
      CREATE TABLE schools (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        students_count INTEGER DEFAULT 0,
        plan VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        academic_year VARCHAR(50),
        curriculum VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. users
    await client.query(`
      CREATE TABLE users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        role VARCHAR(255) NOT NULL,
        custom_role VARCHAR(255),
        user_type INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar VARCHAR(10) NOT NULL,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
        dept VARCHAR(100),
        phone VARCHAR(50),
        joined DATE,
        status VARCHAR(50) DEFAULT 'Active',
        address TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        is_logging BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. students
    await client.query(`
      CREATE TABLE students (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        grade VARCHAR(50) NOT NULL,
        section VARCHAR(10) NOT NULL,
        roll INTEGER NOT NULL,
        guardian VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
        email VARCHAR(255),
        dob DATE,
        gender VARCHAR(50),
        address TEXT,
        blood_group VARCHAR(10),
        admission_date DATE,
        aadhaar_passport VARCHAR(50),
        father_name VARCHAR(255),
        mother_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3b. classes
    await client.query(`
      CREATE TABLE classes (
        id VARCHAR(50) PRIMARY KEY,
        grade VARCHAR(100) NOT NULL,
        section VARCHAR(50),
        batch VARCHAR(100),
        academic_year VARCHAR(50) NOT NULL,
        campus VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        teacher VARCHAR(255),
        room VARCHAR(50),
        students_count INTEGER DEFAULT 0,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3c. class_timetables
    await client.query(`
      CREATE TABLE class_timetables (
        class_id VARCHAR(50) NOT NULL,
        academic_year VARCHAR(50) NOT NULL,
        term VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Draft',
        periods JSONB NOT NULL DEFAULT '[]'::jsonb,
        days JSONB NOT NULL DEFAULT '[]'::jsonb,
        slots JSONB NOT NULL DEFAULT '{}'::jsonb,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (class_id, academic_year, term)
      )
    `);

    // 3d. attendance
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
        class_name VARCHAR(100) NOT NULL,
        academic_date DATE NOT NULL,
        period VARCHAR(50) DEFAULT 'Period 4',
        student_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(255),
        roll INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
        marked_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_student_attendance UNIQUE (school_id, class_name, academic_date, period, student_id)
      );
    `);

    // 4b. departments
    await client.query(`
      CREATE TABLE departments (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        head_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        category VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        classes JSONB DEFAULT '[]'::jsonb,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. admissions
    await client.query(`
      CREATE TABLE admissions (
        id VARCHAR(50) PRIMARY KEY,
        applicant VARCHAR(255) NOT NULL,
        grade VARCHAR(50) NOT NULL,
        applied_on DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. fees
    await client.query(`
      CREATE TABLE fees (
        id VARCHAR(50) PRIMARY KEY,
        student_name VARCHAR(255) NOT NULL,
        grade VARCHAR(50) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        due DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. timetable
    await client.query(`
      CREATE TABLE timetable (
        id SERIAL PRIMARY KEY,
        time VARCHAR(50) NOT NULL,
        mon VARCHAR(100) NOT NULL,
        tue VARCHAR(100) NOT NULL,
        wed VARCHAR(100) NOT NULL,
        thu VARCHAR(100) NOT NULL,
        fri VARCHAR(100) NOT NULL,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL
      )
    `);

    // 8. books
    await client.query(`
      CREATE TABLE books (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        copies INTEGER NOT NULL,
        available INTEGER NOT NULL,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL
      )
    `);

    // 9. issued_books
    await client.query(`
      CREATE TABLE issued_books (
        id VARCHAR(50) PRIMARY KEY,
        book VARCHAR(255) NOT NULL,
        student VARCHAR(255) NOT NULL,
        grade VARCHAR(50) NOT NULL,
        issued DATE NOT NULL,
        due DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL
      )
    `);

    // 10. assignments
    await client.query(`
      CREATE TABLE assignments (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        class VARCHAR(50) NOT NULL,
        due DATE NOT NULL,
        submitted INTEGER NOT NULL,
        total INTEGER NOT NULL,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL
      )
    `);

    // 11. notifications
    await client.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        time_ago VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. subscriptions
    await client.query(`
      CREATE TABLE subscriptions (
        id VARCHAR(50) PRIMARY KEY,
        school VARCHAR(255) NOT NULL,
        plan VARCHAR(50) NOT NULL,
        seats INTEGER NOT NULL,
        mrr NUMERIC(12, 2) NOT NULL,
        renews DATE NOT NULL,
        status VARCHAR(50) NOT NULL
      )
    `);

    console.log("Created all tables successfully. Seeding data...");

    // Seed schools
    for (const school of SCHOOLS) {
      await client.query(
        "INSERT INTO schools (id, name, city, students_count, plan, status, academic_year, curriculum) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [school.id, school.name, school.city, school.students, school.plan, school.status, school.academic_year, school.curriculum]
      );
    }
    console.log("Seeded schools.");

    // Seed users
    const defaultPasswordHash = await bcrypt.hash("demo1234", 10);
    const userDetails: Record<string, { id: string; user_type: number; custom_role: string; dept?: string; phone?: string; joined?: string }> = {
      super_admin: { id: "USR-101", user_type: 1, custom_role: "Super Admin" },
      school_admin: { id: "USR-102", user_type: 1, custom_role: "School Admin" },
      principal: { id: "EMP-202", user_type: 4, custom_role: "Principal", dept: "Administration", phone: "98765 33421", joined: "2015-04-01" },
      teacher: { id: "EMP-201", user_type: 2, custom_role: "Mathematics Teacher", dept: "Sr. Secondary", phone: "98452 11023", joined: "2018-06-12" },
      student: { id: "USR-103", user_type: 4, custom_role: "Student" },
      librarian: { id: "EMP-205", user_type: 4, custom_role: "Librarian", dept: "Library", phone: "98109 22134", joined: "2019-11-09" }
    };

    for (const [role, data] of Object.entries(ROLE_USERS)) {
      const details = userDetails[role];
      const schoolId = role === "super_admin" ? null : "SCH-001";
      await client.query(
        `INSERT INTO users (id, email, password_hash, role, custom_role, user_type, name, avatar, school_id, dept, phone, joined, status, is_logging)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          details.id,
          data.email,
          defaultPasswordHash,
          role,
          details.custom_role,
          details.user_type,
          data.name,
          data.avatar,
          schoolId,
          details.dept || null,
          details.phone || null,
          details.joined || null,
          "Active",
          true
        ]
      );
    }
    console.log("Seeded users.");

    // Seed students
    for (const student of STUDENTS) {
      await client.query(
        "INSERT INTO students (id, name, grade, section, roll, guardian, phone, status, school_id, email, dob, gender, address, blood_group, admission_date, aadhaar_passport, father_name, mother_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)",
        [
          student.id,
          student.name,
          student.grade,
          student.section,
          student.roll,
          student.guardian,
          student.phone,
          student.status,
          "SCH-001",
          student.email,
          student.dob,
          student.gender,
          student.address,
          student.blood_group,
          student.admission_date,
          student.aadhaar_passport,
          student.father_name,
          student.mother_name,
        ]
      );
    }
    console.log("Seeded students.");

    // Seeding of staff and departments has been removed to use only actual user-created data.
    console.log("Skipping staff and departments seeding.");

    // Seed admissions
    for (const adm of ADMISSIONS) {
      await client.query(
        "INSERT INTO admissions (id, applicant, grade, applied_on, status, school_id) VALUES ($1, $2, $3, $4, $5, $6)",
        [adm.id, adm.applicant, adm.grade, adm.appliedOn, adm.status, "SCH-001"]
      );
    }
    console.log("Seeded admissions.");

    // Seed fees
    for (const fee of FEES) {
      await client.query(
        "INSERT INTO fees (id, student_name, grade, amount, due, status, school_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [fee.id, fee.student, fee.grade, fee.amount, fee.due, fee.status, "SCH-001"]
      );
    }
    console.log("Seeded fees.");

    // Seed timetable
    for (const t of TIMETABLE) {
      await client.query(
        "INSERT INTO timetable (time, mon, tue, wed, thu, fri, school_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [t.time, t.mon, t.tue, t.wed, t.thu, t.fri, "SCH-001"]
      );
    }
    console.log("Seeded timetable.");

    // Seed books
    for (const book of BOOKS) {
      await client.query(
        "INSERT INTO books (id, title, author, category, copies, available, school_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [book.id, book.title, book.author, book.category, book.copies, book.available, "SCH-001"]
      );
    }
    console.log("Seeded books.");

    // Seed issued_books
    for (const ib of ISSUED_BOOKS) {
      await client.query(
        "INSERT INTO issued_books (id, book, student, grade, issued, due, status, school_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [ib.id, ib.book, ib.student, ib.grade, ib.issued, ib.due, ib.status, "SCH-001"]
      );
    }
    console.log("Seeded issued_books.");

    // Seed assignments
    for (const asg of ASSIGNMENTS) {
      await client.query(
        "INSERT INTO assignments (id, title, subject, class, due, submitted, total, school_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [asg.id, asg.title, asg.subject, asg.class, asg.due, asg.submitted, asg.total, "SCH-001"]
      );
    }
    console.log("Seeded assignments.");

    // Seed notifications
    for (const n of NOTIFICATIONS) {
      await client.query(
        "INSERT INTO notifications (title, time_ago, type, school_id) VALUES ($1, $2, $3, $4)",
        [n.title, n.time_ago, n.type, "SCH-001"]
      );
    }
    console.log("Seeded notifications.");

    // Seed subscriptions
    for (const sub of SUBSCRIPTIONS) {
      await client.query(
        "INSERT INTO subscriptions (id, school, plan, seats, mrr, renews, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [sub.id, sub.school, sub.plan, sub.seats, sub.mrr, sub.renews, sub.status]
      );
    }
    console.log("Seeded subscriptions.");

    await client.query("COMMIT");
    console.log("Database initialized and seeded successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to initialize database:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
