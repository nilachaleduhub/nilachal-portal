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
  createdAt: { type: Date, default: Date.now }
});
const Exam = mongoose.model('Exam', ExamSchema);

const QuestionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: Number,
  explanation: String,
  imageData: String,
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

// Setup multer for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const videosDir = path.join(uploadsDir, 'videos');
const pdfsDir = path.join(uploadsDir, 'pdfs');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
const postersDir = path.join(uploadsDir, 'posters');
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
  purchasedAt: { type: Date, default: Date.now }
});
const Purchase = mongoose.model('Purchase', PurchaseSchema);

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
    res.json({ success: true, user: { id: u._id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt } });
  } catch (err) {
    console.error('Login error', err);
    res.json({ success: false, message: 'Server error' });
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
  const { id, name, description, courseDetails, courseCost, courseValidity } = req.body || {};
  if (!name) return res.json({ success: false, message: 'Name required' });
  try {
    if (id) {
      const updateData = { name, description, courseDetails, courseCost, courseValidity };
      const updated = await Category.findOneAndUpdate({ id }, updateData, { new: true });
      return res.json({ success: !!updated, category: updated });
    }
    const newCat = new Category({ id: generateId('cat'), name, description, courseDetails, courseCost, courseValidity });
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
  const { id, categoryId, name, description, courseDetails, courseCost, courseValidity } = req.body || {};
  if (!categoryId || !name) return res.json({ success: false, message: 'categoryId and name required' });
  try {
    if (id) {
      const updateData = { name, description, courseDetails, courseCost, courseValidity };
      const updated = await Exam.findOneAndUpdate({ id }, updateData, { new: true });
      return res.json({ success: !!updated, exam: updated });
    }
    const ex = new Exam({ id: generateId('exam'), categoryId, name, description, courseDetails, courseCost, courseValidity });
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
      const updated = await Test.findOneAndUpdate({ id }, body, { new: true });
      return res.json({ success: !!updated, test: updated });
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
        sectionIndex: typeof q.sectionIndex !== 'undefined' ? q.sectionIndex : null
      };
      // Log if imageData is present for debugging
      if (doc.imageData && doc.imageData.trim() !== '') {
        console.log(`Question ${index + 1} has imageData:`, doc.imageData.substring(0, 50) + '...');
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
      status: 'pending'
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

// Get user purchases
app.get('/api/purchases', async (req, res) => {
  const { userId } = req.query;
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
    
    console.log(`Found ${purchases.length} purchases for userId: ${userId}`);
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

// 404 handler for debugging API routes (must be last)
app.use('/api', (req, res) => {
  console.log('404 - API route not found:', req.method, req.originalUrl, req.path);
  res.status(404).json({ success: false, message: 'API route not found: ' + req.method + ' ' + req.originalUrl });
});

app.listen(PORT, () => console.log('Server listening on port', PORT));
