// ...existing code...
require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const app = express();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kp_web2';
const PORT = process.env.PORT || 3000;

// Increase body parser limit to handle large image payloads (50MB)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'public')));

// Mongoose setup
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Session schema for single-device login tracking
const SessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userEmail: { type: String, index: true },
  sessionToken: { type: String, required: true, unique: true, index: true },
  deviceInfo: { type: String }, // Optional: store device/browser info
  ipAddress: { type: String }, // Optional: store IP address
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }
});
const Session = mongoose.model('Session', SessionSchema);

// Utility to generate frontend-compatible IDs (similar to admin script)
function generateId(prefix = 'admin') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
}

// Admin data schemas: Category, Exam, Test (tests embed questions)
const CategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  courseDetails: String,
  courseCost: String,
  courseValidity: String,
  hasDiscount: { type: Boolean, default: false },
  discountPercent: { type: Number, default: 0 },
  discountCode: { type: String, default: '' },
  discountMessage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const Category = mongoose.model('Category', CategorySchema);

const ExamSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  categoryId: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  courseDetails: String,
  courseCost: String,
  courseValidity: String,
  hasDiscount: { type: Boolean, default: false },
  discountPercent: { type: Number, default: 0 },
  discountCode: { type: String, default: '' },
  discountMessage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const Exam = mongoose.model('Exam', ExamSchema);

const QuestionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: Number,
  explanation: String,
  imageData: String,
  explanationImage: String, // Image for answer explanation
  tableData: String,
  imageWidth: Number,
  imageHeight: Number,
  explanationImageWidth: Number,
  explanationImageHeight: Number,
  sectionIndex: Number
}, { _id: false });

const SectionSchema = new mongoose.Schema({
  name: String,
  numQuestions: Number,
  sectionalTiming: Boolean,
  timeLimit: String
}, { _id: false });

const TestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  categoryId: { type: String, required: true },
  examId: { type: String, required: true },
  name: { type: String, required: true },
  numQuestions: Number,
  timeLimit: String,
  positiveMark: String,
  negativeMark: String,
  hasSections: Boolean,
  isFree: { type: Boolean, default: false },
  sectionalTiming: { type: Boolean, default: false },
  sections: [SectionSchema],
  questions: [QuestionSchema],
  createdAt: { type: Date, default: Date.now }
});
const Test = mongoose.model('Test', TestSchema);

// --- Course Management Schemas ---
// Course Category Schema
const CourseCategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});
const CourseCategory = mongoose.model('CourseCategory', CourseCategorySchema);

// Course Schema
const CourseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  categoryId: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  courseDetails: String,
  courseCost: String,
  courseValidity: String,
  createdAt: { type: Date, default: Date.now }
});
const Course = mongoose.model('Course', CourseSchema);

// Lesson Schema
const LessonSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  courseId: { type: String, required: true },
  categoryId: { type: String, required: true },
  title: { type: String },
  subjectName: { type: String },
  videoPath: { type: String },
  videoFileName: { type: String },
  pdfPath: { type: String },
  pdfFileName: { type: String },
  thumbnailPath: { type: String },
  thumbnailFileName: { type: String },
  videoDescription: { type: String },
  hasSubjects: { type: Boolean, default: false },
  subjects: [{ name: String, description: String }],
  createdAt: { type: Date, default: Date.now }
});
const Lesson = mongoose.model('Lesson', LessonSchema);

// Ad Management Schema
const AdSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  position: { type: Number, required: true },
  posterPath: { type: String },
  posterFileName: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Ad = mongoose.model('Ad', AdSchema);

// Exam Detail Schema (for Exam Pattern and Syllabus page)
const ExamDetailSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  examName: { type: String, required: true, unique: true },
  aboutExamText: String,
  aboutExamImagePath: String,
  examPatternCaption: String,
  examSyllabusCaption: String,
  cutoffs: [{
    caption: String,
    type: { type: String, enum: ['picture', 'table'] },
    imagePath: String,
    table: String
  }],
  links: [{
    caption: String,
    url: String
  }],
  patterns: [{
    caption: String,
    type: { type: String, enum: ['text', 'picture', 'table'] },
    text: String,
    imagePath: String,
    table: String
  }],
  syllabuses: [{
    caption: String,
    type: { type: String, enum: ['text', 'picture', 'table'] },
    text: String,
    imagePath: String,
    table: String
  }],
  // Legacy fields for backward compatibility
  examSyllabusText: String,
  examSyllabusImagePath: String,
  cutoffImagePath: String,
  syllabusTable: String,
  cutoffTable: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const ExamDetail = mongoose.model('ExamDetail', ExamDetailSchema);

// Setup multer for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const videosDir = path.join(uploadsDir, 'videos');
const pdfsDir = path.join(uploadsDir, 'pdfs');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
const postersDir = path.join(uploadsDir, 'posters');
const examDetailsDir = path.join(uploadsDir, 'exam-details');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
}
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}
if (!fs.existsSync(postersDir)) {
  fs.mkdirSync(postersDir, { recursive: true });
}
if (!fs.existsSync(examDetailsDir)) {
  fs.mkdirSync(examDetailsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'video') {
      cb(null, videosDir);
    } else if (file.fieldname === 'pdf') {
      cb(null, pdfsDir);
    } else if (file.fieldname === 'thumbnail') {
      cb(null, thumbnailsDir);
    } else if (file.fieldname === 'poster') {
      cb(null, postersDir);
    } else if (
      file.fieldname === 'aboutExamImage' ||
      file.fieldname === 'examSyllabusImage' || 
      file.fieldname === 'cutoffImage' ||
      file.fieldname.startsWith('patternImage_') ||
      file.fieldname.startsWith('cutoffImage_')
    ) {
      cb(null, examDetailsDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// New standalone Question model: stores each question as its own document
// and references the parent test by testId. This makes querying questions
// easier and avoids storing very large arrays inside Test documents.
const QuestionDocSchema = new mongoose.Schema({
  testId: { type: String, required: true, index: true },
  categoryId: { type: String, required: true, index: true },
  examId: { type: String, required: true, index: true },
  question: String,
  options: [String],
  correctAnswer: Number,
  explanation: String,
  imageData: String,
  explanationImage: String, // Image for answer explanation
  tableData: String,
  imageWidth: Number,
  imageHeight: Number,
  explanationImageWidth: Number,
  explanationImageHeight: Number,
  sectionIndex: Number,
  createdAt: { type: Date, default: Date.now }
});
const QuestionDoc = mongoose.model('Question', QuestionDocSchema);

// --- Result schema: stores user test results for rank/percentile ---
const ResultSchema = new mongoose.Schema({
  testId: { type: String, required: true, index: true },
  userId: { type: String }, // optional, for anonymous users can be blank
  name: { type: String }, // optional, was used for display (user name)
  testName: { type: String }, // optional, human-friendly test name
  userName: { type: String },
  score: { type: Number, required: true },
  totalMarks: { type: Number },
  correct: { type: Number },
  incorrect: { type: Number },
  unattempted: { type: Number },
  timeTaken: { type: String },
  userAnswers: { type: [Number] }, // Array of user's answer indices for each question
  submittedAt: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

// --- Admin schema/model ---
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Admin = mongoose.model('Admin', adminSchema);

// --- Razorpay Setup ---
const Razorpay = require('razorpay');
const crypto = require('crypto');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpayInstance = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
  console.log('Razorpay initialized');
} else {
  console.warn('Razorpay keys not found. Payment features will be disabled.');
}

// --- Purchase Schema ---
const PurchaseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userEmail: { type: String, index: true },
  userPhone: { type: String },
  purchaseType: { type: String, required: true, enum: ['course', 'test', 'category', 'exam'] },
  purchaseId: { type: String, required: true },
  purchaseName: { type: String },
  categoryId: { type: String },
  amount: { type: Number },
  currency: { type: String, default: 'INR' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  status: { type: String, default: 'pending', enum: ['pending', 'completed', 'failed'] },
  purchasedAt: { type: Date, default: Date.now },
  // Expiry fields
  courseValidity: { type: String }, // e.g., "6 months", "1 year", "30 days"
  validityValue: { type: Number }, // e.g., 6, 1, 30
  validityUnit: { type: String, enum: ['day', 'month', 'year'] }, // e.g., "month", "year", "day"
  expiresAt: { type: Date } // Calculated expiry date
});
const Purchase = mongoose.model('Purchase', PurchaseSchema);

// --- Visitor tracking schema ---
const VisitorLogSchema = new mongoose.Schema({
  path: { type: String, default: '/' },
  ipAddress: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now }
});
VisitorLogSchema.index({ createdAt: -1 });
const VisitorLog = mongoose.model('VisitorLog', VisitorLogSchema);

// Utility function to calculate expiry date from validity string
function calculateExpiryDate(courseValidity, purchasedAt) {
  if (!courseValidity || !purchasedAt) return null;
  
  try {
    const purchaseDate = purchasedAt instanceof Date ? purchasedAt : new Date(purchasedAt);
    if (isNaN(purchaseDate.getTime())) return null;
    
    const validity = courseValidity.toLowerCase().trim();
    const daysMatch = validity.match(/(\d+)\s*days?/);
    const monthsMatch = validity.match(/(\d+)\s*months?/);
    const yearsMatch = validity.match(/(\d+)\s*years?/);
    
    const expiryDate = new Date(purchaseDate);
    
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      expiryDate.setDate(expiryDate.getDate() + days);
      return { expiresAt: expiryDate, validityValue: days, validityUnit: 'day' };
    } else if (monthsMatch) {
      const months = parseInt(monthsMatch[1], 10);
      expiryDate.setMonth(expiryDate.getMonth() + months);
      return { expiresAt: expiryDate, validityValue: months, validityUnit: 'month' };
    } else if (yearsMatch) {
      const years = parseInt(yearsMatch[1], 10);
      expiryDate.setFullYear(expiryDate.getFullYear() + years);
      return { expiresAt: expiryDate, validityValue: years, validityUnit: 'year' };
    }
    
    return null;
  } catch (err) {
    console.error('Error calculating expiry date:', err);
    return null;
  }
}

// Utility function to check if a purchase is expired
function isPurchaseExpired(purchase) {
  if (!purchase.expiresAt) return false; // No expiry means valid forever
  const expiryDate = purchase.expiresAt instanceof Date ? purchase.expiresAt : new Date(purchase.expiresAt);
  return expiryDate < new Date();
}

// --- API: Submit a test result ---
app.post('/api/results', async (req, res) => {
  const { testId, userId, name, testName, userName, score, totalMarks, correct, incorrect, unattempted, timeTaken, userAnswers } = req.body || {};
  if (!testId || typeof score !== 'number') return res.json({ success: false, message: 'testId and score required' });
  try {
    const result = new Result({ testId, userId, name, testName, userName, score, totalMarks, correct, incorrect, unattempted, timeTaken, userAnswers });
    await result.save();
    res.json({ success: true, result });
  } catch (err) {
    console.error('Error saving result:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// --- API: Get all results for a user (dashboard) ---
app.get('/api/results', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ success: false, message: 'userId required' });
  try {
    // Optionally populate test name if needed
    let results = await Result.find({ userId }).sort({ submittedAt: -1 }).lean();
    // For older results that don't have testName, try to look up Test by testId
    results = await Promise.all(results.map(async r => {
      if (!r.testName && r.testId) {
        try {
          // Try find by Test._id first, then by Test.id
          let testDoc = null;
          // If testId looks like an ObjectId, try that
          if (/^[0-9a-fA-F]{24}$/.test(String(r.testId))) {
            testDoc = await Test.findById(r.testId).lean();
          }
          if (!testDoc) {
            testDoc = await Test.findOne({ id: r.testId }).lean();
          }
          if (testDoc && testDoc.name) r.testName = testDoc.name;
        } catch (e) {
          // ignore lookup errors
        }
      }
      return r;
    }));
    res.json({ success: true, results });
  } catch (err) {
    console.error('Error fetching user results:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// --- API: Get all results for a test (for rank/percentile) ---
app.get('/api/results/:testId', async (req, res) => {
  const { testId } = req.params;
  try {
    const results = await Result.find({ testId }).sort({ score: -1, submittedAt: 1 }).lean();
    res.json({ success: true, results });
  } catch (err) {
    console.error('Error fetching results:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// Get specific result by resultId
app.get('/api/result/:resultId', async (req, res) => {
  const { resultId } = req.params;
  try {
    const result = await Result.findById(resultId).lean();
    if (!result) {
      return res.json({ success: false, message: 'Result not found' });
    }
    res.json({ success: true, result });
  } catch (err) {
    console.error('Error fetching result:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// --- Visitor tracking endpoint ---
app.post('/api/track-visitor', async (req, res) => {
  try {
    const { path: visitedPath } = req.body || {};
    const ip = (req.headers['x-forwarded-for'] || '')
      .toString()
      .split(',')[0]
      .trim() || req.socket?.remoteAddress || '';
    await VisitorLog.create({
      path: visitedPath || '/',
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || ''
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error tracking visitor:', err);
    res.status(500).json({ success: false, message: 'Failed to track visitor' });
  }
});

// --- Admin Register API ---
app.post('/api/admin/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ success: false, message: 'Username and password required' });
  try {
    const exists = await Admin.findOne({ username });
    if (exists) return res.json({ success: false, message: 'Username already exists' });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const admin = new Admin({ username, passwordHash: hash });
    await admin.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Admin register error', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// --- Admin Login API (must be before middleware) ---
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ success: false, message: 'Username and password required' });
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.json({ success: false, message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.json({ success: false, message: 'Invalid credentials' });
    // Return token that will be verified by middleware
    res.json({ success: true, token: 'admin-' + admin._id });
  } catch (err) {
    console.error('Admin login error', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// --- Admin Authentication Middleware ---
async function verifyAdminToken(req, res, next) {
  // Skip auth check for login and register endpoints
  // req.path will be relative to the mounted path, so '/login' not '/api/admin/login'
  if (req.path === '/login' || req.path === '/register') {
    return next();
  }
  
  const token = req.headers['authorization']?.replace('Bearer ', '') || 
                req.headers['x-admin-token'] || 
                req.body?.token || 
                req.query?.token;
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }
  
  // Token format: 'admin-{_id}'
  if (!token.startsWith('admin-')) {
    return res.status(401).json({ success: false, message: 'Invalid token format' });
  }
  
  try {
    const adminId = token.replace('admin-', '');
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    // Attach admin info to request for use in route handlers
    req.admin = admin;
    next();
  } catch (err) {
    console.error('Admin token verification error:', err);
    return res.status(401).json({ success: false, message: 'Token verification failed' });
  }
}

// Apply admin auth middleware to all /api/admin/* routes (except login/register)
app.use('/api/admin', verifyAdminToken);

// --- Admin Dashboard Data Endpoints ---
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select('name email phone createdAt')
      .lean();
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users for admin dashboard:', err);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
});

// Delete user (and all related data)
app.delete('/api/admin/users/:id', async (req, res) => {
  console.log('DELETE /api/admin/users/:id called with id:', req.params.id);
  try {
    const { id } = req.params;
    
    // Try to find user by _id (MongoDB ObjectId) first
    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    
    // If not found, try to find by email
    if (!user) {
      user = await User.findOne({ email: id });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const userId = user._id.toString();
    
    // Delete all sessions for this user
    await Session.deleteMany({ userId: userId });
    
    // Delete all purchases for this user
    await Purchase.deleteMany({ userId: userId });
    
    // Delete the user
    await User.findByIdAndDelete(user._id);
    
    console.log(`User deleted: ${user.email} (ID: ${userId})`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

app.get('/api/admin/purchases', async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ purchasedAt: -1 }).lean();
    const objectIdUserIds = Array.from(new Set(
      purchases
        .map(p => (p.userId && p.userId.toString ? p.userId.toString() : String(p.userId || '')))
        .filter(id => id && mongoose.Types.ObjectId.isValid(id))
    ));

    let userMap = {};
    if (objectIdUserIds.length) {
      const users = await User.find({ _id: { $in: objectIdUserIds } })
        .select('name email phone')
        .lean();
      userMap = users.reduce((acc, user) => {
        acc[user._id.toString()] = user;
        return acc;
      }, {});
    }

    const payload = purchases.map(purchase => {
      const userIdStr = purchase.userId && purchase.userId.toString ? purchase.userId.toString() : String(purchase.userId || '');
      const userRecord = userMap[userIdStr];
      const derivedName = userRecord?.name || purchase.userName || userRecord?.email || purchase.userEmail || 'N/A';

      return {
        id: purchase._id?.toString ? purchase._id.toString() : purchase._id,
        userId: purchase.userId,
        userName: derivedName,
        userEmail: purchase.userEmail || userRecord?.email || '',
        userPhone: purchase.userPhone || userRecord?.phone || '',
        purchaseType: purchase.purchaseType,
        purchaseName: purchase.purchaseName,
        purchaseId: purchase.purchaseId,
        categoryId: purchase.categoryId,
        amount: purchase.amount,
        currency: purchase.currency,
        status: purchase.status,
        purchasedAt: purchase.purchasedAt,
        courseValidity: purchase.courseValidity,
        expiresAt: purchase.expiresAt
      };
    });

    res.json({ success: true, purchases: payload });
  } catch (err) {
    console.error('Error fetching purchases for admin dashboard:', err);
    res.status(500).json({ success: false, message: 'Failed to load purchases' });
  }
});

// Delete purchase record
app.delete('/api/admin/purchases/:id', async (req, res) => {
  console.log('DELETE /api/admin/purchases/:id called with id:', req.params.id);
  try {
    const { id } = req.params;
    
    // Find purchase by _id (MongoDB ObjectId)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid purchase ID' });
    }
    
    const purchase = await Purchase.findById(id);
    
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }
    
    // Delete the purchase record
    await Purchase.findByIdAndDelete(id);
    
    console.log(`Purchase deleted: ${purchase.purchaseName} (ID: ${id})`);
    res.json({ success: true, message: 'Purchase record deleted successfully' });
  } catch (err) {
    console.error('Error deleting purchase:', err);
    res.status(500).json({ success: false, message: 'Failed to delete purchase' });
  }
});

app.get('/api/admin/visitors', async (req, res) => {
  try {
    const [totalVisitors, last30Days] = await Promise.all([
      VisitorLog.countDocuments(),
      VisitorLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({ success: true, count: totalVisitors, last30Days });
  } catch (err) {
    console.error('Error fetching visitor stats for admin dashboard:', err);
    res.status(500).json({ success: false, message: 'Failed to load visitor count' });
  }
});

// --- NEW: API endpoint to get all exams ---
app.get('/api/exams', async (req, res) => {
  try {
    // We can populate category details if needed, but for now, just exams
    const exams = await Exam.find().sort({ name: 1 }).lean();
    res.json({ success: true, exams });
  } catch (err) {
    console.error('Error fetching exams:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- NEW: Public API endpoint to get all categories (no authentication required) ---
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: 1 }).lean();
    res.json({ success: true, categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- NEW: API endpoint to get all tests for a specific exam ---
app.get('/api/exams/:examId/tests', async (req, res) => {
  try {
    const { examId } = req.params;
    const tests = await Test.find({ examId }).select('-questions').sort({ name: 1 }).lean(); // Exclude questions for list view
    res.json({ success: true, tests });
  } catch (err) {
    console.error(`Error fetching tests for exam ${req.params.examId}:`, err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- NEW: API endpoint to get all free tests ---
app.get('/api/tests/free', async (req, res) => {
  try {
    const tests = await Test.find({ isFree: true }).select('-questions').sort({ createdAt: -1 }).lean();

    const examIds = Array.from(new Set((tests || []).map(test => test.examId).filter(Boolean)));
    const categoryIds = Array.from(new Set((tests || []).map(test => test.categoryId).filter(Boolean)));

    const [exams, categories] = await Promise.all([
      examIds.length ? Exam.find({ id: { $in: examIds } }).select('id name').lean() : [],
      categoryIds.length ? Category.find({ id: { $in: categoryIds } }).select('id name').lean() : []
    ]);

    const examNameMap = {};
    exams.forEach(exam => {
      if (exam && exam.id) examNameMap[exam.id] = exam.name || '';
    });

    const categoryNameMap = {};
    categories.forEach(category => {
      if (category && category.id) categoryNameMap[category.id] = category.name || '';
    });

    const payload = tests.map(test => ({
      id: test.id,
      name: test.name,
      description: test.description || '',
      timeLimit: test.timeLimit || '',
      numQuestions: typeof test.numQuestions === 'number' ? test.numQuestions : undefined,
      positiveMark: test.positiveMark || '',
      negativeMark: test.negativeMark || '',
      sectionalTiming: !!test.sectionalTiming,
      hasSections: !!test.hasSections,
      sections: Array.isArray(test.sections) ? test.sections : undefined,
      examId: test.examId || '',
      categoryId: test.categoryId || '',
      examName: examNameMap[test.examId] || '',
      categoryName: categoryNameMap[test.categoryId] || '',
      createdAt: test.createdAt
    }));

    res.json({ success: true, tests: payload });
  } catch (err) {
    console.error('Error fetching free tests:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- NEW: API endpoint to get a single test by its ID, including questions ---
app.get('/api/tests/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    let test = null;
    
    // Try to find by custom id field first
    test = await Test.findOne({ id: testId }).lean();
    
    // If not found and testId looks like MongoDB ObjectId, try _id
    if (!test && /^[0-9a-fA-F]{24}$/.test(testId)) {
      test = await Test.findById(testId).lean();
    }
    
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    
    // PERMANENT SOLUTION: Fetch questions from QuestionDoc collection (primary source)
    // This is the single source of truth for questions
    let questions = [];
    try {
      const questionDocs = await QuestionDoc.find({ testId: test.id || testId }).sort({ sectionIndex: 1 }).lean();
      
      if (questionDocs && questionDocs.length > 0) {
        // Convert QuestionDoc format to embedded question format for compatibility
        questions = questionDocs.map(qDoc => ({
          question: qDoc.question || '',
          options: qDoc.options || [],
          correctAnswer: qDoc.correctAnswer,
          explanation: qDoc.explanation || '',
          imageData: qDoc.imageData || '',
          explanationImage: qDoc.explanationImage || '', // Include explanation image
          tableData: qDoc.tableData || '',
          imageWidth: typeof qDoc.imageWidth === 'number' ? qDoc.imageWidth : null,
          imageHeight: typeof qDoc.imageHeight === 'number' ? qDoc.imageHeight : null,
          explanationImageWidth: typeof qDoc.explanationImageWidth === 'number' ? qDoc.explanationImageWidth : null,
          explanationImageHeight: typeof qDoc.explanationImageHeight === 'number' ? qDoc.explanationImageHeight : null,
          sectionIndex: qDoc.sectionIndex !== undefined ? qDoc.sectionIndex : null
        }));
        console.log(`Loaded ${questions.length} questions from QuestionDoc for test: ${test.name || testId}`);
      } else {
        // BACKWARD COMPATIBILITY: Fallback to embedded questions if QuestionDoc is empty
        if (test.questions && Array.isArray(test.questions) && test.questions.length > 0) {
          questions = test.questions;
          console.log(`Loaded ${questions.length} embedded questions (fallback) for test: ${test.name || testId}`);
        }
      }
    } catch (questionErr) {
      console.error('Error loading questions from QuestionDoc:', questionErr);
      // Fallback to embedded questions on error
      if (test.questions && Array.isArray(test.questions) && test.questions.length > 0) {
        questions = test.questions;
        console.log(`Using embedded questions (error fallback) for test: ${test.name || testId}`);
      }
    }
    
    // Attach questions to test object
    test.questions = questions;
    
    res.json({ success: true, test });
  } catch (err) {
    console.error(`Error fetching test ${req.params.testId}:`, err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!email || !password || !phone) return res.json({ success: false, message: 'Email, phone, and password required' });
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.json({ success: false, message: 'Email already registered' });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const u = new User({ name, email, phone, passwordHash: hash });
    await u.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Register error', err);
    res.json({ success: false, message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.json({ success: false, message: 'Email and password required' });
  try {
    const u = await User.findOne({ email });
    if (!u) return res.json({ success: false, message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.json({ success: false, message: 'Invalid credentials' });
    
    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Get device info and IP address (optional)
    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    
    // Invalidate all existing sessions for this user (single-device login)
    try {
      await Session.deleteMany({ 
        $or: [
          { userId: String(u._id) },
          { userEmail: email }
        ]
      });
    } catch (sessionDeleteErr) {
      console.warn('Error deleting old sessions (non-critical):', sessionDeleteErr);
      // Continue even if deletion fails
    }
    
    // Create new session
    try {
      const session = new Session({
        userId: String(u._id),
        userEmail: email,
        sessionToken: sessionToken,
        deviceInfo: deviceInfo,
        ipAddress: ipAddress
      });
      await session.save();
    } catch (sessionErr) {
      console.error('Error creating session:', sessionErr);
      // If session creation fails, still allow login but log the error
      // This ensures login works even if Session model has issues
    }
    
    res.json({ 
      success: true, 
      user: { 
        id: u._id, 
        name: u.name, 
        email: u.email, 
        phone: u.phone, 
        createdAt: u.createdAt 
      },
      sessionToken: sessionToken
    });
  } catch (err) {
    console.error('Login error:', err);
    res.json({ success: false, message: 'Server error: ' + (err.message || 'Unknown error') });
  }
});

// Session verification middleware for user authentication
async function verifyUserSession(req, res, next) {
  const sessionToken = req.headers['authorization']?.replace('Bearer ', '') || 
                       req.headers['x-session-token'] || 
                       req.body?.sessionToken || 
                       req.query?.sessionToken;
  
  if (!sessionToken) {
    return res.status(401).json({ success: false, message: 'Session token required' });
  }
  
  try {
    const session = await Session.findOne({ sessionToken }).lean();
    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }
    
    // Update last activity
    await Session.updateOne({ sessionToken }, { lastActivity: new Date() });
    
    // Attach session and user info to request
    req.session = session;
    req.userId = session.userId;
    req.userEmail = session.userEmail;
    
    next();
  } catch (err) {
    console.error('Session verification error:', err);
    return res.status(401).json({ success: false, message: 'Session verification failed' });
  }
}

// Logout endpoint - clears session
app.post('/api/logout', async (req, res) => {
  const sessionToken = req.headers['authorization']?.replace('Bearer ', '') || 
                       req.headers['x-session-token'] || 
                       req.body?.sessionToken;
  
  if (!sessionToken) {
    return res.json({ success: false, message: 'Session token required' });
  }
  
  try {
    await Session.deleteOne({ sessionToken });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// Session validation endpoint - check if session is still valid
app.get('/api/validate-session', async (req, res) => {
  const sessionToken = req.headers['authorization']?.replace('Bearer ', '') || 
                       req.headers['x-session-token'] || 
                       req.query?.sessionToken;
  
  if (!sessionToken) {
    return res.json({ success: false, valid: false, message: 'Session token required' });
  }
  
  try {
    const session = await Session.findOne({ sessionToken }).lean();
    if (!session) {
      return res.json({ success: true, valid: false, message: 'Session not found or expired' });
    }
    
    // Update last activity
    await Session.updateOne({ sessionToken }, { lastActivity: new Date() });
    
    // Get user info
    const user = await User.findById(session.userId).lean();
    if (!user) {
      return res.json({ success: true, valid: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      valid: true, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone 
      },
      session: {
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      }
    });
  } catch (err) {
    console.error('Session validation error:', err);
    res.json({ success: false, valid: false, message: 'Server error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for mock tests - check sectional timing and serve appropriate HTML
app.get('/mock-test', async (req, res) => {
  try {
    const testId = req.query.testId;
    if (!testId) {
      return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }

    // Fetch test data to check sectional timing - use only the 'id' field for custom string IDs
    const test = await Test.findOne({ id: testId }).lean();
    if (!test) {
      return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }

    console.log('Test found:', test.name, 'Sectional timing:', test.sectionalTiming);

    // Serve appropriate HTML based on sectional timing
    if (test.sectionalTiming === true) {
      console.log('Serving mock-test-sectioned.html for sectional timing test');
      res.sendFile(path.join(__dirname, 'public', 'mock-test-sectioned.html'));
    } else {
      console.log('Serving mock-test.html for regular test');
      res.sendFile(path.join(__dirname, 'public', 'mock-test.html'));
    }
  } catch (error) {
    console.error('Error routing mock test:', error);
    res.sendFile(path.join(__dirname, 'public', 'mock-test.html'));
  }
});

// --- Admin API: Categories, Exams, Tests, Questions ---

// List categories
app.get('/api/admin/categories', async (req, res) => {
  try {
    const cats = await Category.find().sort({ createdAt: 1 }).lean();
    res.json({ success: true, categories: cats });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Create or update category
app.post('/api/admin/categories', async (req, res) => {
  const { id, name, description, courseDetails, courseCost, courseValidity, hasDiscount, discountPercent, discountCode, discountMessage } = req.body || {};
  if (!name) return res.json({ success: false, message: 'Name required' });
  try {
    if (id) {
      const updateData = { name, description, courseDetails, courseCost, courseValidity };
      if (hasDiscount !== undefined) updateData.hasDiscount = hasDiscount;
      if (discountPercent !== undefined) updateData.discountPercent = discountPercent;
      if (discountCode !== undefined) updateData.discountCode = discountCode;
      if (discountMessage !== undefined) updateData.discountMessage = discountMessage;
      const updated = await Category.findOneAndUpdate({ id }, updateData, { new: true });
      return res.json({ success: !!updated, category: updated });
    }
    const newCat = new Category({ 
      id: generateId('cat'), 
      name, 
      description, 
      courseDetails, 
      courseCost, 
      courseValidity,
      hasDiscount: hasDiscount || false,
      discountPercent: discountPercent || 0,
      discountCode: discountCode || '',
      discountMessage: discountMessage || ''
    });
    await newCat.save();
    res.json({ success: true, category: newCat });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Delete category (and cascade exams/tests)
app.delete('/api/admin/categories/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await Category.deleteOne({ id });
    await Exam.deleteMany({ categoryId: id });
    await Test.deleteMany({ categoryId: id });
    res.json({ success: true });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Exams: list by category
app.get('/api/admin/exams/:categoryId', async (req, res) => {
  try {
    const list = await Exam.find({ categoryId: req.params.categoryId }).lean();
    res.json({ success: true, exams: list });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Create or update exam
app.post('/api/admin/exams', async (req, res) => {
  const { id, categoryId, name, description, courseDetails, courseCost, courseValidity, hasDiscount, discountPercent, discountCode, discountMessage } = req.body || {};
  if (!categoryId || !name) return res.json({ success: false, message: 'categoryId and name required' });
  try {
    if (id) {
      const updateData = { name, description, courseDetails, courseCost, courseValidity };
      if (hasDiscount !== undefined) updateData.hasDiscount = hasDiscount;
      if (discountPercent !== undefined) updateData.discountPercent = discountPercent;
      if (discountCode !== undefined) updateData.discountCode = discountCode;
      if (discountMessage !== undefined) updateData.discountMessage = discountMessage;
      const updated = await Exam.findOneAndUpdate({ id }, updateData, { new: true });
      return res.json({ success: !!updated, exam: updated, message: 'Exam updated successfully' });
    }
    const ex = new Exam({ 
      id: generateId('exam'), 
      categoryId, 
      name, 
      description, 
      courseDetails, 
      courseCost, 
      courseValidity,
      hasDiscount: hasDiscount || false,
      discountPercent: discountPercent || 0,
      discountCode: discountCode || '',
      discountMessage: discountMessage || ''
    });
    await ex.save();
    res.json({ success: true, exam: ex });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Delete exam and its tests
app.delete('/api/admin/exams/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await Exam.deleteOne({ id });
    await Test.deleteMany({ examId: id });
    res.json({ success: true });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Move exam to another category (and update all related tests and questions)
app.patch('/api/admin/exams/:id/move', async (req, res) => {
  const id = req.params.id;
  const { newCategoryId } = req.body || {};
  
  if (!newCategoryId) {
    return res.json({ success: false, message: 'newCategoryId is required' });
  }
  
  try {
    // Validate exam exists
    const exam = await Exam.findOne({ id });
    if (!exam) {
      return res.json({ success: false, message: 'Exam not found' });
    }
    
    // Check if moving to same category
    if (exam.categoryId === newCategoryId) {
      return res.json({ success: false, message: 'Exam is already in this category' });
    }
    
    // Validate target category exists
    const targetCategory = await Category.findOne({ id: newCategoryId });
    if (!targetCategory) {
      return res.json({ success: false, message: 'Target category not found' });
    }
    
    // Store original categoryId for potential rollback
    const originalCategoryId = exam.categoryId;
    
    try {
      // Update exam
      await Exam.findOneAndUpdate({ id }, { categoryId: newCategoryId });
      
      // Update all tests belonging to this exam
      const testUpdateResult = await Test.updateMany(
        { examId: id },
        { categoryId: newCategoryId }
      );
      
      // Update all questions belonging to this exam
      const questionUpdateResult = await QuestionDoc.updateMany(
        { examId: id },
        { categoryId: newCategoryId }
      );
      
      const updatedExam = await Exam.findOne({ id }).lean();
      res.json({
        success: true,
        message: 'Exam moved successfully',
        exam: updatedExam,
        testsUpdated: testUpdateResult.modifiedCount,
        questionsUpdated: questionUpdateResult.modifiedCount
      });
    } catch (updateErr) {
      // Attempt rollback on error (best effort)
      try {
        await Exam.findOneAndUpdate({ id }, { categoryId: originalCategoryId });
        await Test.updateMany({ examId: id }, { categoryId: originalCategoryId });
        await QuestionDoc.updateMany({ examId: id }, { categoryId: originalCategoryId });
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
      throw updateErr;
    }
  } catch (err) {
    console.error('Error moving exam:', err);
    res.json({ success: false, message: 'Server error: ' + (err.message || 'Unknown error') });
  }
});

// Tests: list by category
app.get('/api/admin/tests/:categoryId', async (req, res) => {
  try {
    const list = await Test.find({ categoryId: req.params.categoryId }).lean();
    res.json({ success: true, tests: list });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Create or update test
app.post('/api/admin/tests', async (req, res) => {
  const body = req.body || {};
  const { id, categoryId, examId, name } = body;
  if (!categoryId || !examId || !name) return res.json({ success: false, message: 'categoryId, examId and name required' });
  try {
    if (id) {
      // Exclude id from update body since we're querying by it
      const { id: _, ...updateData } = body;
      const updated = await Test.findOneAndUpdate({ id }, updateData, { new: true });
      return res.json({ success: !!updated, test: updated, message: 'Test updated successfully' });
    }
    const test = new Test({ id: generateId('test'), ...body });
    await test.save();
    res.json({ success: true, test });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Delete test
app.delete('/api/admin/tests/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await Test.deleteOne({ id });
    res.json({ success: true });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Save questions to a test
app.post('/api/admin/tests/:id/questions', async (req, res) => {
  const id = req.params.id;
  console.log('Saving questions for test:', id);
  const { questions } = req.body || {};
  if (!Array.isArray(questions)) {
    console.warn('Invalid questions payload:', req.body);
    return res.json({ success: false, message: 'questions array required' });
  }
  try {
    // Find the test first to obtain categoryId/examId for question docs
    const test = await Test.findOne({ id }).lean();
    if (!test) {
      console.warn('Test not found:', id);
      return res.json({ success: false, message: 'Test not found' });
    }
    console.log('Found test:', test.name, '- saving', questions.length, 'questions');

    // Replace the Test.questions array (keep embedded copy)
    test.questions = questions;
    await Test.updateOne({ id }, { questions });

    // Remove any existing Question docs for this testId, then insert new ones
    await QuestionDoc.deleteMany({ testId: id });

    const docs = questions.map((q, index) => {
      const doc = {
        testId: id,
        categoryId: test.categoryId || q.categoryId || '',
        examId: test.examId || q.examId || '',
        question: q.question || '',
        options: q.options || [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : null,
        explanation: q.explanation || '',
        imageData: q.imageData || '',
        explanationImage: q.explanationImage || '', // Store explanation image
        tableData: q.tableData || '',
        imageWidth: typeof q.imageWidth === 'number' ? q.imageWidth : null,
        imageHeight: typeof q.imageHeight === 'number' ? q.imageHeight : null,
        explanationImageWidth: typeof q.explanationImageWidth === 'number' ? q.explanationImageWidth : null,
        explanationImageHeight: typeof q.explanationImageHeight === 'number' ? q.explanationImageHeight : null,
        sectionIndex: typeof q.sectionIndex !== 'undefined' ? q.sectionIndex : null
      };
      // Log if imageData is present for debugging
      if (doc.imageData && doc.imageData.trim() !== '') {
        console.log(`Question ${index + 1} has imageData:`, doc.imageData.substring(0, 50) + '...');
      }
      // Log if explanationImage is present
      if (doc.explanationImage && doc.explanationImage.trim() !== '') {
        console.log(`Question ${index + 1} has explanationImage:`, doc.explanationImage.substring(0, 50) + '...');
      }
      return doc;
    });

    if (docs.length > 0) {
      await QuestionDoc.insertMany(docs);
      console.log('Saved', docs.length, 'questions to QuestionDoc collection');
    }

    const updatedTest = await Test.findOne({ id }).lean();
    console.log('Questions saved successfully for test:', id);
    return res.json({ success: true, test: updatedTest });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// --- Course Management API: Course Categories, Courses, Lessons ---

// Course Categories: List all
app.get('/api/admin/course-categories', async (req, res) => {
  console.log('GET /api/admin/course-categories hit');
  try {
    const cats = await CourseCategory.find().sort({ createdAt: 1 }).lean();
    res.json({ success: true, categories: cats });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Course Categories: Create or update
app.post('/api/admin/course-categories', async (req, res) => {
  console.log('POST /api/admin/course-categories hit', req.body);
  const { id, name, description } = req.body || {};
  if (!name) return res.json({ success: false, message: 'Name required' });
  try {
    if (id) {
      const updated = await CourseCategory.findOneAndUpdate({ id }, { name, description }, { new: true });
      return res.json({ success: !!updated, category: updated });
    }
    const newCat = new CourseCategory({ id: generateId('coursecat'), name, description });
    await newCat.save();
    res.json({ success: true, category: newCat });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Course Categories: Delete
app.delete('/api/admin/course-categories/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await CourseCategory.deleteOne({ id });
    await Course.deleteMany({ categoryId: id });
    await Lesson.deleteMany({ categoryId: id });
    res.json({ success: true });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Courses: List by category
app.get('/api/admin/courses/:categoryId', async (req, res) => {
  try {
    const list = await Course.find({ categoryId: req.params.categoryId }).lean();
    res.json({ success: true, courses: list });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Courses: Create or update
app.post('/api/admin/courses', async (req, res) => {
  const { id, categoryId, name, description, courseDetails, courseCost, courseValidity } = req.body || {};
  if (!categoryId || !name) return res.json({ success: false, message: 'categoryId and name required' });
  try {
    if (id) {
      const updated = await Course.findOneAndUpdate(
        { id },
        { categoryId, name, description, courseDetails, courseCost, courseValidity },
        { new: true }
      );
      return res.json({ success: !!updated, course: updated });
    }
    const newCourse = new Course({
      id: generateId('course'),
      categoryId,
      name,
      description,
      courseDetails,
      courseCost,
      courseValidity
    });
    await newCourse.save();
    res.json({ success: true, course: newCourse });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Courses: Delete
app.delete('/api/admin/courses/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // Delete all lessons and their files
    const lessons = await Lesson.find({ courseId: id });
    for (const lesson of lessons) {
      if (lesson.videoPath) {
        const videoFsPath = path.join(__dirname, lesson.videoPath.replace(/^\//, ''));
        if (fs.existsSync(videoFsPath)) {
          try { fs.unlinkSync(videoFsPath); } catch (e) { console.warn('Could not delete video:', e); }
        }
      }
      if (lesson.pdfPath) {
        const pdfFsPath = path.join(__dirname, lesson.pdfPath.replace(/^\//, ''));
        if (fs.existsSync(pdfFsPath)) {
          try { fs.unlinkSync(pdfFsPath); } catch (e) { console.warn('Could not delete PDF:', e); }
        }
      }
    }
    await Course.deleteOne({ id });
    await Lesson.deleteMany({ courseId: id });
    res.json({ success: true });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Lessons: List by course
app.get('/api/admin/lessons/:courseId', async (req, res) => {
  try {
    const list = await Lesson.find({ courseId: req.params.courseId }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, lessons: list });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Lessons: Create or update
app.post('/api/admin/lessons', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'pdf', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  const { id, courseId, categoryId } = req.body || {};
  if (!courseId || !categoryId) {
    // Clean up uploaded files if validation fails
    if (req.files) {
      if (req.files.video) req.files.video.forEach(f => fs.unlinkSync(f.path));
      if (req.files.pdf) req.files.pdf.forEach(f => fs.unlinkSync(f.path));
      if (req.files.thumbnail) req.files.thumbnail.forEach(f => fs.unlinkSync(f.path));
    }
    return res.json({ success: false, message: 'courseId and categoryId required' });
  }
  
  try {
    let videoPath = null;
    let videoFileName = null;
    let pdfPath = null;
    let pdfFileName = null;
    let thumbnailPath = null;
    let thumbnailFileName = null;
    // parse subjects info if provided
    const hasSubjects = String(req.body?.hasSubjects || '').toLowerCase() === 'true';
    let subjects = [];
    if (req.body && req.body.subjects) {
      try {
        const parsed = JSON.parse(req.body.subjects);
        if (Array.isArray(parsed)) {
          subjects = parsed.map(s => ({ name: String(s.name || ''), description: String(s.description || '') })).filter(s => s.name);
        }
      } catch (e) {
        // ignore malformed subjects
      }
    }
    
    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        videoPath = req.files.video[0].path;
        videoFileName = req.files.video[0].filename;
      }
      if (req.files.pdf && req.files.pdf[0]) {
        pdfPath = req.files.pdf[0].path;
        pdfFileName = req.files.pdf[0].filename;
      }
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        thumbnailPath = req.files.thumbnail[0].path;
        thumbnailFileName = req.files.thumbnail[0].filename;
      }
    }
    const title = (req.body && typeof req.body.title === 'string') ? req.body.title.trim() : '';
    const subjectName = (req.body && typeof req.body.subjectName === 'string') ? req.body.subjectName.trim() : '';
    const videoDescription = (req.body && typeof req.body.videoDescription === 'string') ? req.body.videoDescription.trim() : '';
    
    if (id) {
      // Update existing lesson
      const existingLesson = await Lesson.findOne({ id });
      if (!existingLesson) {
        // Clean up uploaded files
        if (videoPath) fs.unlinkSync(videoPath);
        if (pdfPath) fs.unlinkSync(pdfPath);
        return res.json({ success: false, message: 'Lesson not found' });
      }
      
      // Delete old files if new ones are uploaded
      if (videoPath && existingLesson.videoPath) {
        const videoFsPath = path.join(__dirname, existingLesson.videoPath.replace(/^\//, ''));
        if (fs.existsSync(videoFsPath)) {
          try { fs.unlinkSync(videoFsPath); } catch (e) { console.warn('Could not delete old video:', e); }
        }
      }
      if (pdfPath && existingLesson.pdfPath) {
        const pdfFsPath = path.join(__dirname, existingLesson.pdfPath.replace(/^\//, ''));
        if (fs.existsSync(pdfFsPath)) {
          try { fs.unlinkSync(pdfFsPath); } catch (e) { console.warn('Could not delete old PDF:', e); }
        }
      }
      if (thumbnailPath && existingLesson.thumbnailPath) {
        const thumbFsPath = path.join(__dirname, existingLesson.thumbnailPath.replace(/^\//, ''));
        if (fs.existsSync(thumbFsPath)) {
          try { fs.unlinkSync(thumbFsPath); } catch (e) { console.warn('Could not delete old thumbnail:', e); }
        }
      }
      
      const updateData = { courseId, categoryId, hasSubjects, subjects };
      if (title) updateData.title = title;
      if (subjectName) updateData.subjectName = subjectName;
      if (videoDescription) updateData.videoDescription = videoDescription;
      if (videoPath) {
        updateData.videoPath = `/uploads/videos/${videoFileName}`;
        updateData.videoFileName = videoFileName;
      }
      if (pdfPath) {
        updateData.pdfPath = `/uploads/pdfs/${pdfFileName}`;
        updateData.pdfFileName = pdfFileName;
      }
      if (thumbnailPath) {
        updateData.thumbnailPath = `/uploads/thumbnails/${thumbnailFileName}`;
        updateData.thumbnailFileName = thumbnailFileName;
      }
      
      const updated = await Lesson.findOneAndUpdate({ id }, updateData, { new: true });
      return res.json({ success: !!updated, lesson: updated });
    }
    
    // Create new lesson - video not required anymore
    const newLesson = new Lesson({
      id: generateId('lesson'),
      courseId,
      categoryId,
      title: title || undefined,
      subjectName: subjectName || undefined,
      videoPath: videoPath ? `/uploads/videos/${videoFileName}` : null,
      videoFileName,
      pdfPath: pdfPath ? `/uploads/pdfs/${pdfFileName}` : null,
      pdfFileName: pdfFileName || null,
      videoDescription: videoDescription || undefined,
      thumbnailPath: thumbnailPath ? `/uploads/thumbnails/${thumbnailFileName}` : null,
      thumbnailFileName: thumbnailFileName || null,
      hasSubjects,
      subjects
    });
    await newLesson.save();
    res.json({ success: true, lesson: newLesson });
  } catch (err) {
    console.error(err);
    // Clean up uploaded files on error
    if (req.files) {
      if (req.files.video) req.files.video.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      if (req.files.pdf) req.files.pdf.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      if (req.files.thumbnail) req.files.thumbnail.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
    res.json({ success: false, message: 'Server error' });
  }
});

// Lessons: Delete
app.delete('/api/admin/lessons/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const lesson = await Lesson.findOne({ id });
    if (lesson) {
      // Convert web path to file system path
      if (lesson.videoPath) {
        const videoFsPath = path.join(__dirname, lesson.videoPath.replace(/^\//, ''));
        if (fs.existsSync(videoFsPath)) {
          try { fs.unlinkSync(videoFsPath); } catch (e) { console.warn('Could not delete video:', e); }
        }
      }
      if (lesson.pdfPath) {
        const pdfFsPath = path.join(__dirname, lesson.pdfPath.replace(/^\//, ''));
        if (fs.existsSync(pdfFsPath)) {
          try { fs.unlinkSync(pdfFsPath); } catch (e) { console.warn('Could not delete PDF:', e); }
        }
      }
    if (lesson.thumbnailPath) {
      const thumbFsPath = path.join(__dirname, lesson.thumbnailPath.replace(/^\//, ''));
      if (fs.existsSync(thumbFsPath)) {
        try { fs.unlinkSync(thumbFsPath); } catch (e) { console.warn('Could not delete thumbnail:', e); }
      }
    }
    }
    await Lesson.deleteOne({ id });
    res.json({ success: true });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// --- Razorpay Payment API Endpoints ---

// Get Razorpay Key ID (public key for frontend)
app.get('/api/payment/key', (req, res) => {
  console.log('GET /api/payment/key called');
  if (!RAZORPAY_KEY_ID) {
    return res.json({ success: false, message: 'Razorpay not configured' });
  }
  res.json({ success: true, keyId: RAZORPAY_KEY_ID });
});

// Create Razorpay Order
app.post('/api/payment/create-order', async (req, res) => {
  console.log('POST /api/payment/create-order called', req.body);
  if (!razorpayInstance) {
    return res.json({ success: false, message: 'Razorpay not configured' });
  }

  const { amount, currency = 'INR', userId, purchaseType, purchaseId, purchaseName, categoryId } = req.body || {};
  
  if (!amount || !userId || !purchaseType || !purchaseId) {
    return res.json({ success: false, message: 'Missing required fields' });
  }

  // Convert amount to paise (Razorpay expects amount in smallest currency unit)
  const amountInPaise = Math.round(parseFloat(amount) * 100);

  try {
    const options = {
      amount: amountInPaise,
      currency: currency,
      receipt: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notes: {
        userId,
        purchaseType,
        purchaseId,
        purchaseName: purchaseName || '',
        categoryId: categoryId || ''
      }
    };

    const order = await razorpayInstance.orders.create(options);

    // Fetch the item to get courseValidity
    let courseValidity = null;
    try {
      if (purchaseType === 'course') {
        const course = await Course.findOne({ id: purchaseId }).lean();
        if (course) courseValidity = course.courseValidity;
      } else if (purchaseType === 'category') {
        const category = await Category.findOne({ id: purchaseId }).lean();
        if (category) courseValidity = category.courseValidity;
      } else if (purchaseType === 'exam') {
        const exam = await Exam.findOne({ id: purchaseId }).lean();
        if (exam) courseValidity = exam.courseValidity;
      }
      // Note: 'test' type doesn't have courseValidity, so it remains null
    } catch (err) {
      console.warn('Error fetching item for expiry info:', err);
    }

    // Calculate expiry if courseValidity exists
    let expiryData = null;
    if (courseValidity) {
      const purchaseDate = new Date();
      expiryData = calculateExpiryDate(courseValidity, purchaseDate);
    }

    // Save purchase record with pending status
    const user = await User.findById(userId).lean().catch(() => null) || 
                 await User.findOne({ email: userId }).lean().catch(() => null);
    
    const purchase = new Purchase({
      userId,
      userEmail: user ? user.email : null,
      userPhone: user ? user.phone : null,
      purchaseType,
      purchaseId,
      purchaseName: purchaseName || '',
      categoryId: categoryId || null,
      amount: parseFloat(amount),
      currency,
      razorpayOrderId: order.id,
      status: 'pending',
      courseValidity: courseValidity || null,
      validityValue: expiryData ? expiryData.validityValue : null,
      validityUnit: expiryData ? expiryData.validityUnit : null,
      expiresAt: expiryData ? expiryData.expiresAt : null
    });
    await purchase.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    res.json({ success: false, message: 'Failed to create order', error: err.message });
  }
});

// Verify Payment and Save Purchase
app.post('/api/payment/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
    return res.json({ success: false, message: 'Missing payment details' });
  }

  try {
    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('Payment signature verification failed');
      return res.json({ success: false, message: 'Payment verification failed' });
    }

    // Find and update purchase record
    // Try to find by orderId and userId (can be _id, email, or other identifier)
    let purchase = await Purchase.findOne({ 
      razorpayOrderId: razorpay_order_id,
      $or: [
        { userId: userId },
        { userEmail: userId }
      ]
    });
    
    // If not found, try to find user and use their _id
    if (!purchase) {
      const user = await User.findOne({ email: userId }).lean().catch(() => null) ||
                   await User.findById(userId).lean().catch(() => null);
      if (user && user._id) {
        purchase = await Purchase.findOne({ 
          razorpayOrderId: razorpay_order_id,
          userId: String(user._id)
        });
      }
    }
    
    if (!purchase) {
      console.error('Purchase record not found for order:', razorpay_order_id, 'userId:', userId);
      return res.json({ success: false, message: 'Purchase record not found' });
    }

    // If expiry not set, fetch item and calculate expiry (for backward compatibility or if item was updated)
    if (!purchase.expiresAt && purchase.purchaseType !== 'test') {
      let courseValidity = purchase.courseValidity;
      
      // If courseValidity not set, fetch from item
      if (!courseValidity) {
        try {
          if (purchase.purchaseType === 'course') {
            const course = await Course.findOne({ id: purchase.purchaseId }).lean();
            if (course) courseValidity = course.courseValidity;
          } else if (purchase.purchaseType === 'category') {
            const category = await Category.findOne({ id: purchase.purchaseId }).lean();
            if (category) courseValidity = category.courseValidity;
          } else if (purchase.purchaseType === 'exam') {
            const exam = await Exam.findOne({ id: purchase.purchaseId }).lean();
            if (exam) courseValidity = exam.courseValidity;
          }
        } catch (err) {
          console.warn('Error fetching item for expiry info in verify:', err);
        }
      }

      // Calculate expiry if courseValidity exists
      if (courseValidity) {
        const purchaseDate = purchase.purchasedAt || new Date();
        const expiryData = calculateExpiryDate(courseValidity, purchaseDate);
        if (expiryData) {
          purchase.courseValidity = courseValidity;
          purchase.validityValue = expiryData.validityValue;
          purchase.validityUnit = expiryData.validityUnit;
          purchase.expiresAt = expiryData.expiresAt;
        }
      }
    }

    // Update purchase with payment details
    purchase.razorpayPaymentId = razorpay_payment_id;
    purchase.razorpaySignature = razorpay_signature;
    purchase.status = 'completed';
    await purchase.save();

    res.json({
      success: true,
      message: 'Payment verified and purchase saved',
      purchase: {
        id: purchase._id,
        purchaseType: purchase.purchaseType,
        purchaseId: purchase.purchaseId,
        purchaseName: purchase.purchaseName
      }
    });
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.json({ success: false, message: 'Payment verification error', error: err.message });
  }
});

// Server-side access validation endpoint
app.post('/api/check-access', async (req, res) => {
  const { userId, itemId, itemType, categoryId } = req.body || {};
  
  if (!userId || !itemId || !itemType) {
    return res.json({ success: false, message: 'userId, itemId, and itemType are required' });
  }

  try {
    // Find user purchases
    let purchases = await Purchase.find({ 
      $or: [
        { userId: userId },
        { userEmail: userId }
      ],
      status: 'completed' 
    }).lean();
    
    // If no purchases found, try to find user by email and use their _id
    if (purchases.length === 0) {
      const user = await User.findOne({ email: userId }).lean().catch(() => null);
      if (user && user._id) {
        purchases = await Purchase.find({ 
          userId: String(user._id),
          status: 'completed' 
        }).lean();
      }
    }

    // Filter out expired purchases
    purchases = purchases.filter(purchase => !isPurchaseExpired(purchase));

    // Check if user has access to the requested item
    let hasAccess = false;
    let purchase = null;
    let isExpired = false;
    let daysUntilExpiry = null;

    for (const p of purchases) {
      const purchaseId = p.purchaseId;
      const purchaseType = p.purchaseType;

      // Direct match
      if (purchaseId === itemId) {
        if (itemType === 'course' && purchaseType === 'course') {
          hasAccess = true;
          purchase = p;
          break;
        }
        if (itemType === 'test' && purchaseType === 'test') {
          hasAccess = true;
          purchase = p;
          break;
        }
        if (itemType === 'category' && purchaseType === 'category') {
          hasAccess = true;
          purchase = p;
          break;
        }
        if (itemType === 'exam' && purchaseType === 'exam') {
          hasAccess = true;
          purchase = p;
          break;
        }
      }

      // Category access (category purchase grants access to exams/tests in that category)
      if (categoryId && p.categoryId === categoryId && purchaseType === 'category') {
        if (itemType === 'exam' || itemType === 'test') {
          hasAccess = true;
          purchase = p;
          break;
        }
      }

      // Exam access (exam purchase grants access to tests in that exam)
      if (purchaseType === 'exam' && p.purchaseId === categoryId && itemType === 'test') {
        hasAccess = true;
        purchase = p;
        break;
      }
    }

    // Calculate days until expiry if purchase found
    if (purchase && purchase.expiresAt) {
      const expiryDate = purchase.expiresAt instanceof Date ? purchase.expiresAt : new Date(purchase.expiresAt);
      const now = new Date();
      const diffTime = expiryDate - now;
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        isExpired = true;
        hasAccess = false;
      }
    }

    res.json({
      success: true,
      hasAccess,
      isExpired,
      purchase: purchase ? {
        id: purchase._id,
        purchaseType: purchase.purchaseType,
        purchaseId: purchase.purchaseId,
        purchaseName: purchase.purchaseName,
        purchasedAt: purchase.purchasedAt,
        expiresAt: purchase.expiresAt,
        courseValidity: purchase.courseValidity
      } : null,
      daysUntilExpiry
    });
  } catch (err) {
    console.error('Error checking access:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// Get user purchases
app.get('/api/purchases', async (req, res) => {
  const { userId, includeExpired = 'false' } = req.query;
  if (!userId) {
    return res.json({ success: false, message: 'userId required' });
  }

  try {
    // Try to find purchases by userId (can be _id, email, or other identifier)
    let purchases = await Purchase.find({ 
      $or: [
        { userId: userId },
        { userEmail: userId }
      ],
      status: 'completed' 
    })
      .sort({ purchasedAt: -1 })
      .lean();
    
    // If no purchases found, try to find user by email and use their _id
    if (purchases.length === 0) {
      const user = await User.findOne({ email: userId }).lean().catch(() => null);
      if (user && user._id) {
        purchases = await Purchase.find({ 
          userId: String(user._id),
          status: 'completed' 
        })
          .sort({ purchasedAt: -1 })
          .lean();
      }
    }
    
    // Filter out expired purchases unless includeExpired is true
    if (includeExpired !== 'true') {
      purchases = purchases.filter(purchase => !isPurchaseExpired(purchase));
    }
    
    console.log(`Found ${purchases.length} ${includeExpired === 'true' ? '(including expired)' : '(active)'} purchases for userId: ${userId}`);
    res.json({ success: true, purchases });
  } catch (err) {
    console.error('Error fetching purchases:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// --- Ad Management API Endpoints ---

// Get all ads (sorted by position)
app.get('/api/admin/ads', async (req, res) => {
  try {
    const ads = await Ad.find({ isActive: true }).sort({ position: 1 }).lean();
    res.json({ success: true, ads });
  } catch (err) {
    console.error('Error fetching ads:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create or update ad
app.post('/api/admin/ads', upload.single('poster'), async (req, res) => {
  try {
    const { id, position, isActive } = req.body;
    const positionNum = parseInt(position, 10);
    
    if (!positionNum || positionNum < 1) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.json({ success: false, message: 'Valid position number required' });
    }
    
    let posterPath = null;
    let posterFileName = null;
    
    if (req.file) {
      posterPath = `/uploads/posters/${req.file.filename}`;
      posterFileName = req.file.filename;
    }
    
    if (id) {
      // Update existing ad
      const existingAd = await Ad.findOne({ id });
      if (!existingAd) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.json({ success: false, message: 'Ad not found' });
      }
      
      // Delete old poster if new one is uploaded
      if (req.file && existingAd.posterPath) {
        const oldPosterPath = path.join(__dirname, existingAd.posterPath.replace(/^\//, ''));
        if (fs.existsSync(oldPosterPath)) {
          try { fs.unlinkSync(oldPosterPath); } catch (e) { console.warn('Could not delete old poster:', e); }
        }
      }
      
      const updateData = {
        position: positionNum,
        isActive: isActive === 'true' || isActive === true,
        updatedAt: new Date()
      };
      
      if (posterPath) {
        updateData.posterPath = posterPath;
        updateData.posterFileName = posterFileName;
      }
      
      const updated = await Ad.findOneAndUpdate({ id }, updateData, { new: true });
      res.json({ success: true, ad: updated });
    } else {
      // Create new ad
      const newAd = new Ad({
        id: generateId('ad'),
        position: positionNum,
        posterPath: posterPath || null,
        posterFileName: posterFileName || null,
        isActive: isActive === 'true' || isActive === true || isActive === undefined
      });
      await newAd.save();
      res.json({ success: true, ad: newAd });
    }
  } catch (err) {
    console.error('Error saving ad:', err);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete ad
app.delete('/api/admin/ads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findOne({ id });
    if (!ad) {
      return res.json({ success: false, message: 'Ad not found' });
    }
    
    // Delete poster file
    if (ad.posterPath) {
      const posterPath = path.join(__dirname, ad.posterPath.replace(/^\//, ''));
      if (fs.existsSync(posterPath)) {
        try { fs.unlinkSync(posterPath); } catch (e) { console.warn('Could not delete poster:', e); }
      }
    }
    
    await Ad.deleteOne({ id });
    res.json({ success: true, message: 'Ad deleted' });
  } catch (err) {
    console.error('Error deleting ad:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- Exam Details API Endpoints (Admin) ---

const normalizeMediaPath = (value) => {
  if (!value || typeof value !== 'string') return value || '';
  let pathValue = value.replace(/\\/g, '/');
  if (pathValue.startsWith('http://') || pathValue.startsWith('https://') || pathValue.startsWith('data:') || pathValue.startsWith('blob:')) {
    return pathValue;
  }
  if (!pathValue.startsWith('/')) {
    pathValue = '/' + pathValue.replace(/^\/+/, '');
  }
  return pathValue;
};

const normalizeCutoffEntries = (entries) => {
  if (!Array.isArray(entries)) return [];
  return entries.map(entry => ({
    caption: (entry?.caption || '').trim(),
    type: entry?.type || 'picture',
    imagePath: entry?.imagePath ? normalizeMediaPath(entry.imagePath) : '',
    table: entry?.table || ''
  }));
};

const formatExamDetailResponse = (detail) => {
  if (!detail) return null;
  const plain = typeof detail.toObject === 'function' ? detail.toObject() : { ...detail };
  const { examName, examNamedetails, ...rest } = plain;
  
  return {
    ...rest,
    aboutExamImagePath: normalizeMediaPath(rest.aboutExamImagePath || ''),
    examSyllabusImagePath: normalizeMediaPath(rest.examSyllabusImagePath || ''),
    cutoffImagePath: normalizeMediaPath(rest.cutoffImagePath || ''),
    cutoffs: normalizeCutoffEntries(rest.cutoffs),
    patterns: Array.isArray(rest.patterns)
      ? rest.patterns.map(pattern => ({
          ...pattern,
          imagePath: normalizeMediaPath(pattern?.imagePath || '')
        }))
      : [],
    syllabuses: Array.isArray(rest.syllabuses)
      ? rest.syllabuses.map(syllabus => ({
          ...syllabus,
          imagePath: normalizeMediaPath(syllabus?.imagePath || '')
        }))
      : [],
    examNamedetails: examNamedetails || examName || ''
  };
};

const buildExamDetailIdQuery = (identifier) => {
  if (!identifier) return null;
  const idString = String(identifier);
  if (mongoose.Types.ObjectId.isValid(idString) && idString.length === 24) {
    return { $or: [{ id: idString }, { _id: new mongoose.Types.ObjectId(idString) }] };
  }
  return { id: idString };
};

// Get all exam details
app.get('/api/admin/exam-details', async (req, res) => {
  try {
    const rawDetails = await ExamDetail.find().sort({ examName: 1 }).lean();
    const examDetails = rawDetails.map(formatExamDetailResponse);
    
    res.json({ success: true, examDetails });
  } catch (err) { console.error(err); res.json({ success: false, message: 'Server error' }); }
});

// Get single exam detail (admin)
app.get('/api/admin/exam-details/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = buildExamDetailIdQuery(id);
    if (!query) {
      return res.json({ success: false, message: 'Invalid exam detail identifier' });
    }
    const detail = await ExamDetail.findOne(query).lean();
    if (!detail) {
      return res.json({ success: false, message: 'Exam detail not found' });
    }
    res.json({ success: true, examDetail: formatExamDetailResponse(detail) });
  } catch (err) {
    console.error('Error fetching admin exam detail:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create or update exam details
app.post('/api/admin/exam-details', upload.any(), async (req, res) => {
  try {
    const { id, aboutExamText, examSyllabusText, links, patterns, syllabusTable, cutoffTable, cutoffs, syllabuses, examPatternCaption, examSyllabusCaption } = req.body || {};
    
    // Extract and validate exam name with new approach
    let examNamedetailsValue = null;
    const rawExamNamedetails = (req.body && (req.body['exam-namedetails'] ?? req.body.examNamedetails ?? req.body.examName)) || null;
    console.log('POST /api/admin/exam-details - Raw exam name from body:', { 
      'exam-namedetails': req.body['exam-namedetails'], 
      examNamedetails: req.body.examNamedetails, 
      examName: req.body.examName,
      rawExamNamedetails 
    });
    if (rawExamNamedetails) {
      examNamedetailsValue = rawExamNamedetails.toString().replace(/^\s+|\s+$/g, '');
    }
    console.log('POST /api/admin/exam-details - Processed exam name value:', examNamedetailsValue);
    if (!examNamedetailsValue || examNamedetailsValue.length < 1) {
      if (req.files) {
        Object.values(req.files).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      }
      return res.json({ success: false, message: 'Exam name must be provided' });
    }

    let aboutExamImagePath = null;
    let examSyllabusImagePath = null;
    let cutoffImagePath = null;
    let cutoffTableValue = cutoffTable || '';

    // Parse links, patterns, syllabuses, and cutoffs from JSON strings
    let linksArray = [];
    let patternsArray = [];
    let syllabusesArray = [];
    let cutoffsArray = [];
    try {
      if (links) linksArray = typeof links === 'string' ? JSON.parse(links) : links;
      if (patterns) {
        patternsArray = typeof patterns === 'string' ? JSON.parse(patterns) : patterns;
        console.log('Parsed patterns array:', JSON.stringify(patternsArray, null, 2));
        console.log('Patterns array length:', patternsArray.length);
      } else {
        console.log('No patterns received in request body');
      }
      if (syllabuses) {
        syllabusesArray = typeof syllabuses === 'string' ? JSON.parse(syllabuses) : syllabuses;
        console.log('Parsed syllabuses array:', JSON.stringify(syllabusesArray, null, 2));
        console.log('Syllabuses array length:', syllabusesArray.length);
      } else {
        console.log('No syllabuses received in request body');
      }
      if (cutoffs) {
        cutoffsArray = typeof cutoffs === 'string' ? JSON.parse(cutoffs) : cutoffs;
        console.log('Parsed cutoffs array:', JSON.stringify(cutoffsArray, null, 2));
        console.log('Cutoffs array length:', cutoffsArray.length);
      } else {
        console.log('No cutoffs received in request body');
      }
      cutoffsArray = normalizeCutoffEntries(cutoffsArray);
    } catch (e) {
      console.error('Error parsing links, patterns, syllabuses, or cutoffs:', e);
      console.error('Links value:', links);
      console.error('Patterns value:', patterns);
      console.error('Syllabuses value:', syllabuses);
      console.error('Cutoffs value:', cutoffs);
    }

    // Handle pattern images - find files with patternImage_ prefix
    if (patternsArray && Array.isArray(patternsArray) && req.files) {
      patternsArray.forEach((pattern, index) => {
        if (pattern.type === 'picture') {
          const patternFile = req.files.find(f => f.fieldname === `patternImage_${index}`);
          if (patternFile) {
            pattern.imagePath = normalizeMediaPath(`/uploads/exam-details/${patternFile.filename}`);
          }
        }
      });
    }

    // Handle syllabus images - find files with syllabusImage_ prefix
    if (syllabusesArray && Array.isArray(syllabusesArray) && req.files) {
      console.log('POST - Processing syllabus images. Total files:', req.files.length);
      console.log('POST - File fieldnames:', req.files.map(f => f.fieldname));
      syllabusesArray.forEach((syllabus, index) => {
        if (syllabus.type === 'picture') {
          const syllabusFile = req.files.find(f => f.fieldname === `syllabusImage_${index}`);
          if (syllabusFile) {
            syllabus.imagePath = normalizeMediaPath(`/uploads/exam-details/${syllabusFile.filename}`);
            console.log(`POST - Syllabus ${index} image saved:`, syllabus.imagePath);
          } else {
            // Normalize existing imagePath if no new file uploaded
            if (syllabus.imagePath) {
              syllabus.imagePath = normalizeMediaPath(syllabus.imagePath);
              console.log(`POST - No file found for syllabusImage_${index}, using existing imagePath:`, syllabus.imagePath);
            } else {
              console.log(`POST - No file and no existing imagePath for syllabusImage_${index}`);
            }
          }
        }
      });
    }

    if (cutoffsArray && Array.isArray(cutoffsArray) && req.files) {
      cutoffsArray.forEach((cutoff, index) => {
        if (cutoff.type === 'picture') {
          const cutoffFile = req.files.find(f => f.fieldname === `cutoffImage_${index}`);
          if (cutoffFile) {
            cutoff.imagePath = normalizeMediaPath(`/uploads/exam-details/${cutoffFile.filename}`);
            console.log(`POST - Cutoff ${index} image saved:`, cutoff.imagePath);
          }
        } else if (cutoff.type === 'table') {
          console.log(`POST - Cutoff ${index} table HTML length:`, cutoff.table ? cutoff.table.length : 0);
        }
      });
    }
    cutoffsArray = normalizeCutoffEntries(cutoffsArray);
    console.log('POST - Final cutoffs array:', JSON.stringify(cutoffsArray.map(c => ({ caption: c.caption, type: c.type, hasImage: !!c.imagePath, hasTable: !!c.table })), null, 2));

    // Extract main images from files array
    if (req.files) {
      const aboutExamFile = req.files.find(f => f.fieldname === 'aboutExamImage');
      const examSyllabusFile = req.files.find(f => f.fieldname === 'examSyllabusImage');
      const cutoffFile = req.files.find(f => f.fieldname === 'cutoffImage');
      
      if (aboutExamFile) aboutExamImagePath = normalizeMediaPath(`/uploads/exam-details/${aboutExamFile.filename}`);
      if (examSyllabusFile) examSyllabusImagePath = normalizeMediaPath(`/uploads/exam-details/${examSyllabusFile.filename}`);
      if (cutoffFile) cutoffImagePath = normalizeMediaPath(`/uploads/exam-details/${cutoffFile.filename}`);
    }

    if (Array.isArray(cutoffsArray) && cutoffsArray.length > 0) {
      if (!cutoffTableValue && cutoffsArray[0].table) {
        cutoffTableValue = cutoffsArray[0].table;
      }
      if (!cutoffImagePath && cutoffsArray[0].imagePath) {
        cutoffImagePath = cutoffsArray[0].imagePath;
      }
    }

    if (id) {
      const matchQuery = buildExamDetailIdQuery(id);
      // Update existing exam detail - try to find by id field first, then by _id
      const existing = matchQuery ? await ExamDetail.findOne(matchQuery) : null;
      if (!existing) {
        // Clean up uploaded files
        if (req.files) {
          Object.values(req.files).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        }
        return res.json({ success: false, message: 'Exam detail not found' });
      }
      
      // Check if examName is being changed and if the new name already exists
      if (existing.examName !== examNamedetailsValue) {
        const duplicate = await ExamDetail.findOne({ examName: examNamedetailsValue });
        if (duplicate && String(duplicate._id) !== String(existing._id)) {
          // Clean up uploaded files
          if (req.files) {
            Object.values(req.files).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
          }
          return res.json({ success: false, message: 'An exam with this name already exists' });
        }
      }
      
      // Use the id field from the found document for the update
      const updateId = existing.id || existing._id;

      // Delete old images if new ones are uploaded
      if (aboutExamImagePath && existing.aboutExamImagePath) {
        const oldPath = path.join(__dirname, existing.aboutExamImagePath.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Could not delete old image:', e); }
        }
      }
      if (examSyllabusImagePath && existing.examSyllabusImagePath) {
        const oldPath = path.join(__dirname, existing.examSyllabusImagePath.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Could not delete old image:', e); }
        }
      }
      if (cutoffImagePath && existing.cutoffImagePath) {
        const oldPath = path.join(__dirname, existing.cutoffImagePath.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Could not delete old image:', e); }
        }
      }

      // Delete old pattern images if new ones are uploaded
      if (patternsArray && existing.patterns) {
        patternsArray.forEach((newPattern, index) => {
          if (newPattern.type === 'picture' && newPattern.imagePath) {
            const oldPattern = existing.patterns[index];
            if (oldPattern && oldPattern.imagePath && oldPattern.imagePath !== newPattern.imagePath) {
              const oldPath = path.join(__dirname, oldPattern.imagePath.replace(/^\//, ''));
              if (fs.existsSync(oldPath)) {
                try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Could not delete old pattern image:', e); }
              }
            }
          }
        });
      }

      // Delete old syllabus images if new ones are uploaded
      if (syllabusesArray && existing.syllabuses) {
        syllabusesArray.forEach((newSyllabus, index) => {
          if (newSyllabus.type === 'picture' && newSyllabus.imagePath) {
            const oldSyllabus = existing.syllabuses[index];
            if (oldSyllabus && oldSyllabus.imagePath && oldSyllabus.imagePath !== newSyllabus.imagePath) {
              const oldPath = path.join(__dirname, oldSyllabus.imagePath.replace(/^\//, ''));
              if (fs.existsSync(oldPath)) {
                try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Could not delete old syllabus image:', e); }
              }
            }
          }
        });
      }

      if (Array.isArray(existing.cutoffs)) {
        existing.cutoffs.forEach((oldCutoff, index) => {
          const newCutoff = Array.isArray(cutoffsArray) ? cutoffsArray[index] : null;
          const newPath = newCutoff?.imagePath || '';
          if (oldCutoff && oldCutoff.imagePath && oldCutoff.imagePath !== newPath) {
            const oldPath = path.join(__dirname, oldCutoff.imagePath.replace(/^\//, ''));
            if (fs.existsSync(oldPath)) {
              try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Could not delete old cutoff image:', e); }
            }
          }
        });
      }

      const updateData = {
        examName: examNamedetailsValue,
        aboutExamText: aboutExamText || '',
        examPatternCaption: examPatternCaption || '',
        examSyllabusCaption: examSyllabusCaption || '',
        links: linksArray,
        patterns: patternsArray || [],
        syllabuses: syllabusesArray || [],
        cutoffs: cutoffsArray || [],
        updatedAt: new Date()
      };
      
      // Keep legacy fields for backward compatibility
      if (examSyllabusText) updateData.examSyllabusText = examSyllabusText;
      if (syllabusTable) updateData.syllabusTable = syllabusTable;
      if (cutoffTableValue) updateData.cutoffTable = cutoffTableValue;
      if (cutoffImagePath) updateData.cutoffImagePath = cutoffImagePath;
      if (examSyllabusImagePath) updateData.examSyllabusImagePath = examSyllabusImagePath;
      
      console.log('Update data patterns:', JSON.stringify(updateData.patterns, null, 2));
      console.log('Update data syllabuses:', JSON.stringify(updateData.syllabuses, null, 2));
      console.log('Update data cutoffs:', JSON.stringify(updateData.cutoffs, null, 2));

      if (aboutExamImagePath) updateData.aboutExamImagePath = aboutExamImagePath;
      if (examSyllabusImagePath) updateData.examSyllabusImagePath = examSyllabusImagePath;
      if (cutoffImagePath) updateData.cutoffImagePath = cutoffImagePath;

      const updateQuery = buildExamDetailIdQuery(updateId);
      const updated = await ExamDetail.findOneAndUpdate(updateQuery || { _id: existing._id }, updateData, { new: true });
      console.log('POST - Saved exam detail patterns:', JSON.stringify(updated?.patterns, null, 2));
      console.log('POST - Saved patterns count:', updated?.patterns?.length || 0);
      res.json({ success: true, examDetail: formatExamDetailResponse(updated) });
    } else {
      // Check if exam name already exists before creating new entry
      const existingExam = await ExamDetail.findOne({ examName: examNamedetailsValue });
      if (existingExam) {
        // Clean up uploaded files
        if (req.files) {
          Object.values(req.files).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        }
        return res.json({ success: false, message: 'An exam with this name already exists' });
      }
      
      // Create new exam detail
      const newExamDetail = new ExamDetail({
        id: generateId('examdetail'),
        examName: examNamedetailsValue,
        aboutExamText: aboutExamText || '',
        aboutExamImagePath,
        examPatternCaption: examPatternCaption || '',
        examSyllabusCaption: examSyllabusCaption || '',
        links: linksArray,
        patterns: patternsArray || [],
        syllabuses: syllabusesArray || [],
        cutoffs: cutoffsArray || []
      });
      
      // Add legacy fields for backward compatibility
      if (examSyllabusImagePath) newExamDetail.examSyllabusImagePath = examSyllabusImagePath;
      if (cutoffImagePath) newExamDetail.cutoffImagePath = cutoffImagePath;
      if (examSyllabusText) newExamDetail.examSyllabusText = examSyllabusText;
      if (syllabusTable) newExamDetail.syllabusTable = syllabusTable;
      if (cutoffTableValue) newExamDetail.cutoffTable = cutoffTableValue;
      
      console.log('POST - New exam detail patterns before save:', JSON.stringify(newExamDetail.patterns, null, 2));
      console.log('POST - New exam detail syllabuses before save:', JSON.stringify(newExamDetail.syllabuses, null, 2));
      console.log('POST - New exam detail cutoffs before save:', JSON.stringify(newExamDetail.cutoffs, null, 2));
      await newExamDetail.save();
      console.log('POST - Saved exam detail patterns:', JSON.stringify(newExamDetail.patterns, null, 2));
      console.log('POST - Saved exam detail syllabuses:', JSON.stringify(newExamDetail.syllabuses, null, 2));
      console.log('POST - Saved exam detail cutoffs:', JSON.stringify(newExamDetail.cutoffs, null, 2));
      console.log('POST - Saved patterns count:', newExamDetail.patterns?.length || 0);
      console.log('POST - Saved syllabuses count:', newExamDetail.syllabuses?.length || 0);
      console.log('POST - Saved cutoffs count:', newExamDetail.cutoffs?.length || 0);
      res.json({ success: true, examDetail: formatExamDetailResponse(newExamDetail) });
    }
  } catch (err) {
    console.error('Error saving exam details:', err);
    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
    // Handle MongoDB duplicate key error for examName
    if (err.code === 11000 && err.keyPattern && err.keyPattern.examName) {
      return res.status(400).json({ success: false, message: 'An exam with this name already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update exam details (PUT method) - same logic as POST
app.put('/api/admin/exam-details', upload.any(), async (req, res) => {
  // Reuse the POST handler logic by calling it directly
  // The POST handler already handles both create and update based on id field
  try {
    const { id, aboutExamText, examSyllabusText, links, patterns, syllabusTable, cutoffTable, cutoffs, syllabuses, examPatternCaption, examSyllabusCaption } = req.body || {};
    
    // Extract and validate exam name with new approach
    let examNamedetailsValue = null;
    const rawExamNamedetails = (req.body && (req.body['exam-namedetails'] ?? req.body.examNamedetails ?? req.body.examName)) || null;
    console.log('PUT /api/admin/exam-details - Raw exam name from body:', { 
      'exam-namedetails': req.body['exam-namedetails'], 
      examNamedetails: req.body.examNamedetails, 
      examName: req.body.examName,
      rawExamNamedetails 
    });
    if (rawExamNamedetails) {
      examNamedetailsValue = rawExamNamedetails.toString().replace(/^\s+|\s+$/g, '');
    }
    console.log('PUT /api/admin/exam-details - Processed exam name value:', examNamedetailsValue);
    if (!examNamedetailsValue || examNamedetailsValue.length < 1) {
      if (req.files) {
        Object.values(req.files).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      }
      return res.json({ success: false, message: 'Exam name must be provided' });
    }

    let aboutExamImagePath = null;
    let examSyllabusImagePath = null;
    let cutoffImagePath = null;

    let linksArray = [];
    let patternsArray = [];
    let syllabusesArray = [];
    let cutoffsArray = [];
    try {
      if (links) linksArray = typeof links === 'string' ? JSON.parse(links) : links;
      if (patterns) {
        patternsArray = typeof patterns === 'string' ? JSON.parse(patterns) : patterns;
        console.log('PUT - Parsed patterns array:', JSON.stringify(patternsArray, null, 2));
        console.log('PUT - Patterns array length:', patternsArray.length);
      } else {
        console.log('PUT - No patterns received in request body');
      }
      if (syllabuses) {
        syllabusesArray = typeof syllabuses === 'string' ? JSON.parse(syllabuses) : syllabuses;
        console.log('PUT - Parsed syllabuses array:', JSON.stringify(syllabusesArray, null, 2));
      }
      if (cutoffs) {
        cutoffsArray = typeof cutoffs === 'string' ? JSON.parse(cutoffs) : cutoffs;
        console.log('PUT - Parsed cutoffs array:', JSON.stringify(cutoffsArray, null, 2));
      }
      cutoffsArray = normalizeCutoffEntries(cutoffsArray);
    } catch (e) {
      console.error('PUT - Error parsing links, patterns, syllabuses, or cutoffs:', e);
      console.error('PUT - Links value:', links);
      console.error('PUT - Patterns value:', patterns);
      console.error('PUT - Syllabuses value:', syllabuses);
      console.error('PUT - Cutoffs value:', cutoffs);
    }

    // Handle pattern images - find files with patternImage_ prefix
    if (patternsArray && Array.isArray(patternsArray) && req.files) {
      patternsArray.forEach((pattern, index) => {
        if (pattern.type === 'picture') {
          const patternFile = req.files.find(f => f.fieldname === `patternImage_${index}`);
          if (patternFile) {
            pattern.imagePath = normalizeMediaPath(`/uploads/exam-details/${patternFile.filename}`);
          }
        }
      });
    }

    // Handle syllabus images - find files with syllabusImage_ prefix
    if (syllabusesArray && Array.isArray(syllabusesArray) && req.files) {
      console.log('PUT - Processing syllabus images. Total files:', req.files.length);
      console.log('PUT - File fieldnames:', req.files.map(f => f.fieldname));
      syllabusesArray.forEach((syllabus, index) => {
        if (syllabus.type === 'picture') {
          const syllabusFile = req.files.find(f => f.fieldname === `syllabusImage_${index}`);
          if (syllabusFile) {
            syllabus.imagePath = normalizeMediaPath(`/uploads/exam-details/${syllabusFile.filename}`);
            console.log(`PUT - Syllabus ${index} image saved:`, syllabus.imagePath);
          } else {
            // Normalize existing imagePath if no new file uploaded
            if (syllabus.imagePath) {
              syllabus.imagePath = normalizeMediaPath(syllabus.imagePath);
              console.log(`PUT - No file found for syllabusImage_${index}, using existing imagePath:`, syllabus.imagePath);
            } else {
              console.log(`PUT - No file and no existing imagePath for syllabusImage_${index}`);
            }
          }
        }
      });
    }

    // Handle cutoff images - find files with cutoffImage_ prefix
    if (cutoffsArray && Array.isArray(cutoffsArray) && req.files) {
      cutoffsArray.forEach((cutoff, index) => {
        if (cutoff.type === 'picture') {
          const cutoffFile = req.files.find(f => f.fieldname === `cutoffImage_${index}`);
          if (cutoffFile) {
            cutoff.imagePath = normalizeMediaPath(`/uploads/exam-details/${cutoffFile.filename}`);
            console.log(`PUT - Cutoff ${index} image saved:`, cutoff.imagePath);
          }
        } else if (cutoff.type === 'table') {
          console.log(`PUT - Cutoff ${index} table HTML length:`, cutoff.table ? cutoff.table.length : 0);
        }
      });
    }
    cutoffsArray = normalizeCutoffEntries(cutoffsArray);
    console.log('PUT - Final cutoffs array:', JSON.stringify(cutoffsArray.map(c => ({ caption: c.caption, type: c.type, hasImage: !!c.imagePath, hasTable: !!c.table })), null, 2));

    // Extract main images from files array
    if (req.files) {
      const aboutExamFile = req.files.find(f => f.fieldname === 'aboutExamImage');
      const examSyllabusFile = req.files.find(f => f.fieldname === 'examSyllabusImage');
      const cutoffFile = req.files.find(f => f.fieldname === 'cutoffImage');
      
      if (aboutExamFile) aboutExamImagePath = `/uploads/exam-details/${aboutExamFile.filename}`;
      if (examSyllabusFile) examSyllabusImagePath = `/uploads/exam-details/${examSyllabusFile.filename}`;
      if (cutoffFile) cutoffImagePath = `/uploads/exam-details/${cutoffFile.filename}`;
    }

    if (!id) {
      if (req.files) {
        Object.values(req.files).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      }
      return res.json({ success: false, message: 'ID required for update' });
    }

    const matchQuery = buildExamDetailIdQuery(id);
    const existing = matchQuery ? await ExamDetail.findOne(matchQuery) : null;
    if (!existing) {
      if (req.files) {
        Object.values(req.files).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      }
      return res.json({ success: false, message: 'Exam detail not found' });
    }
    
    // Check if examName is being changed and if the new name already exists
    if (existing.examName !== examNamedetailsValue) {
      const duplicate = await ExamDetail.findOne({ examName: examNamedetailsValue });
      if (duplicate && String(duplicate._id) !== String(existing._id)) {
        // Clean up uploaded files
        if (req.files) {
          Object.values(req.files).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        }
        return res.json({ success: false, message: 'An exam with this name already exists' });
      }
    }
    
    // Use the id field from the found document for the update
    const updateId = existing.id || existing._id;

    if (aboutExamImagePath && existing.aboutExamImagePath) {
      const oldPath = path.join(__dirname, existing.aboutExamImagePath.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Could not delete old image:', e); }
      }
    }
    if (examSyllabusImagePath && existing.examSyllabusImagePath) {
      const oldPath = path.join(__dirname, existing.examSyllabusImagePath.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Could not delete old image:', e); }
      }
    }
    if (cutoffImagePath && existing.cutoffImagePath) {
      const oldPath = path.join(__dirname, existing.cutoffImagePath.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Could not delete old image:', e); }
      }
    }

    if (patternsArray && existing.patterns) {
      patternsArray.forEach((newPattern, index) => {
        if (newPattern.type === 'picture' && newPattern.imagePath) {
          const oldPattern = existing.patterns[index];
          if (oldPattern && oldPattern.imagePath && oldPattern.imagePath !== newPattern.imagePath) {
            const oldPath = path.join(__dirname, oldPattern.imagePath.replace(/^\//, ''));
            if (fs.existsSync(oldPath)) {
              try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Could not delete old pattern image:', e); }
            }
          }
        }
      });
    }

    const updateData = {
      examName: examNamedetailsValue,
      aboutExamText: aboutExamText || '',
      examPatternCaption: examPatternCaption || '',
      examSyllabusCaption: examSyllabusCaption || '',
      links: linksArray,
      patterns: patternsArray || [],
      syllabuses: syllabusesArray || [],
      cutoffs: cutoffsArray || [],
      updatedAt: new Date()
    };
    
    // Keep legacy fields for backward compatibility
    if (examSyllabusText) updateData.examSyllabusText = examSyllabusText;
    if (syllabusTable) updateData.syllabusTable = syllabusTable;
    if (cutoffTable) updateData.cutoffTable = cutoffTable;
    
    console.log('PUT - Update data patterns:', JSON.stringify(updateData.patterns, null, 2));
    console.log('PUT - Update data syllabuses:', JSON.stringify(updateData.syllabuses, null, 2));
    console.log('PUT - Update data cutoffs:', JSON.stringify(updateData.cutoffs, null, 2));

    if (aboutExamImagePath) updateData.aboutExamImagePath = aboutExamImagePath;
    if (examSyllabusImagePath) updateData.examSyllabusImagePath = examSyllabusImagePath;
    if (cutoffImagePath) updateData.cutoffImagePath = cutoffImagePath;

    const updateQuery = buildExamDetailIdQuery(updateId);
      const updated = await ExamDetail.findOneAndUpdate(updateQuery || { _id: existing._id }, updateData, { new: true });
      console.log('PUT - Saved exam detail patterns:', JSON.stringify(updated?.patterns, null, 2));
      console.log('PUT - Saved exam detail syllabuses:', JSON.stringify(updated?.syllabuses, null, 2));
      console.log('PUT - Saved exam detail cutoffs:', JSON.stringify(updated?.cutoffs, null, 2));
      console.log('PUT - Saved patterns count:', updated?.patterns?.length || 0);
      console.log('PUT - Saved syllabuses count:', updated?.syllabuses?.length || 0);
      console.log('PUT - Saved cutoffs count:', updated?.cutoffs?.length || 0);
      res.json({ success: true, examDetail: formatExamDetailResponse(updated) });
  } catch (err) {
    console.error('Error updating exam details:', err);
    if (req.files) {
      Object.values(req.files).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
    // Handle MongoDB duplicate key error for examName
    if (err.code === 11000 && err.keyPattern && err.keyPattern.examName) {
      return res.status(400).json({ success: false, message: 'An exam with this name already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete exam details
app.delete('/api/admin/exam-details/:id', async (req, res) => {
  try {
    const examId = req.params.id;
    
    // New approach: Try multiple lookup methods
    let foundDoc = null;
    
    // Method 1: Search by custom id field
    foundDoc = await ExamDetail.findOne({ id: examId }).lean();
    
    // Method 2: If not found, try MongoDB _id
    if (!foundDoc) {
      if (mongoose.Types.ObjectId.isValid(examId)) {
        foundDoc = await ExamDetail.findById(examId).lean();
      }
    }
    
    // Method 3: Last attempt - search by _id as string
    if (!foundDoc) {
      foundDoc = await ExamDetail.findOne({ _id: examId }).lean();
    }
    
    if (!foundDoc) {
      return res.json({ success: false, message: 'Exam detail not found' });
    }

    // Collect all image paths to delete
    const filesToDelete = [];
    ['aboutExamImagePath', 'examSyllabusImagePath', 'cutoffImagePath'].forEach(field => {
      if (foundDoc[field]) filesToDelete.push(foundDoc[field]);
    });
    
    // Collect pattern images
    if (Array.isArray(foundDoc.patterns)) {
      foundDoc.patterns.forEach(p => {
        if (p && p.imagePath) filesToDelete.push(p.imagePath);
      });
    }

    if (Array.isArray(foundDoc.cutoffs)) {
      foundDoc.cutoffs.forEach(cutoff => {
        if (cutoff && cutoff.imagePath) filesToDelete.push(cutoff.imagePath);
      });
    }

    // Remove image files
    filesToDelete.forEach(filePath => {
      try {
        const absolutePath = path.resolve(__dirname, filePath.startsWith('/') ? filePath.slice(1) : filePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (fileErr) {
        // Silent fail for file deletion
      }
    });

    // Remove document from database using the found document's _id
    await ExamDetail.findByIdAndDelete(foundDoc._id);
    
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Server error occurred' });
  }
});

// --- Exam Details API Endpoints (Public) ---

// Get all exam details (public)
app.get('/api/exam-details', async (req, res) => {
  try {
    const examDetails = await ExamDetail.find().sort({ examName: 1 }).lean();
    res.json({ success: true, examDetails: examDetails.map(formatExamDetailResponse) });
  } catch (err) {
    console.error('Error fetching exam details:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single exam detail by ID (public)
app.get('/api/exam-details/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const examDetail = await ExamDetail.findOne({ $or: [{ id }, { _id: id }] }).lean();
    if (!examDetail) {
      return res.json({ success: false, message: 'Exam detail not found' });
    }
    res.json({ success: true, examDetail: formatExamDetailResponse(examDetail) });
  } catch (err) {
    console.error('Error fetching exam detail:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 404 handler for debugging API routes (must be last)
app.use('/api', (req, res) => {
  console.log('404 - API route not found:', req.method, req.originalUrl, req.path);
  res.status(404).json({ success: false, message: 'API route not found: ' + req.method + ' ' + req.originalUrl });
});

// ============================================
// AUTOMATIC CLEANUP JOB FOR EXPIRED PURCHASES
// ============================================
async function cleanupExpiredPurchases() {
  try {
    const now = new Date();
    // Find purchases that expired more than 90 days ago
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    const result = await Purchase.deleteMany({
      status: 'completed',
      expiresAt: { $exists: true, $lt: cutoffDate }
    });
    
    if (result.deletedCount > 0) {
      console.log(`[Cleanup Job] Deleted ${result.deletedCount} expired purchases (expired more than 90 days ago)`);
    }
  } catch (err) {
    console.error('[Cleanup Job] Error cleaning up expired purchases:', err);
  }
}

// Run cleanup job every 24 hours (86400000 ms)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
setInterval(cleanupExpiredPurchases, CLEANUP_INTERVAL);
// Run immediately on server start
cleanupExpiredPurchases();

// ============================================
// EXPIRY REMINDER/NOTIFICATION SYSTEM
// ============================================
async function checkAndNotifyExpiringPurchases() {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    
    // Find purchases expiring in the next 30 days
    const expiringPurchases = await Purchase.find({
      status: 'completed',
      expiresAt: { 
        $exists: true, 
        $gte: now,
        $lte: thirtyDaysFromNow
      }
    }).lean();
    
    // Group by user and check reminder thresholds
    const userReminders = {};
    
    for (const purchase of expiringPurchases) {
      if (!purchase.expiresAt) continue;
      
      const expiryDate = purchase.expiresAt instanceof Date ? purchase.expiresAt : new Date(purchase.expiresAt);
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      const userId = purchase.userId || purchase.userEmail;
      if (!userId) continue;
      
      if (!userReminders[userId]) {
        userReminders[userId] = {
          userId,
          userEmail: purchase.userEmail,
          reminders: []
        };
      }
      
      // Determine which reminder to send
      let reminderType = null;
      if (daysUntilExpiry <= 1 && daysUntilExpiry > 0) {
        reminderType = '1day';
      } else if (daysUntilExpiry <= 7 && daysUntilExpiry > 1) {
        reminderType = '7days';
      } else if (daysUntilExpiry <= 30 && daysUntilExpiry > 7) {
        reminderType = '30days';
      }
      
      if (reminderType) {
        userReminders[userId].reminders.push({
          purchaseId: purchase.purchaseId,
          purchaseName: purchase.purchaseName,
          purchaseType: purchase.purchaseType,
          expiresAt: purchase.expiresAt,
          daysUntilExpiry,
          reminderType
        });
      }
    }
    
    // Log reminders (in production, you would send emails/push notifications here)
    for (const userId in userReminders) {
      const userData = userReminders[userId];
      for (const reminder of userData.reminders) {
        console.log(`[Expiry Reminder] User: ${userData.userEmail || userId}, Purchase: ${reminder.purchaseName}, Expires in: ${reminder.daysUntilExpiry} days, Type: ${reminder.reminderType}`);
      }
    }
    
    if (Object.keys(userReminders).length > 0) {
      console.log(`[Expiry Reminder] Checked ${expiringPurchases.length} purchases, found ${Object.keys(userReminders).length} users with expiring purchases`);
    }
  } catch (err) {
    console.error('[Expiry Reminder] Error checking expiring purchases:', err);
  }
}

// API endpoint to manually trigger reminder check
app.get('/api/admin/check-expiry-reminders', async (req, res) => {
  try {
    await checkAndNotifyExpiringPurchases();
    res.json({ success: true, message: 'Expiry reminder check completed' });
  } catch (err) {
    console.error('Error in manual reminder check:', err);
    res.json({ success: false, message: 'Error checking reminders' });
  }
});

// Run reminder check every 12 hours (43200000 ms)
const REMINDER_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
setInterval(checkAndNotifyExpiringPurchases, REMINDER_INTERVAL);
// Run immediately on server start
checkAndNotifyExpiringPurchases();

// ============================================
// SERVER START
// ============================================
app.listen(PORT, () => console.log('Server listening on port', PORT));
