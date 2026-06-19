// src/gemini-engine.js - Core Speed Engine with Gemini AI
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { LRUCache } = require('lru-cache');
const crypto = require('crypto');

class GeminiSpeedEngine {
    constructor() {
        // Initialize Google Gemini
        this.geminiAvailable = false;
        if (process.env.GOOGLE_AI_KEY && process.env.GOOGLE_AI_KEY !== 'AIzaSyABC123-your-actual-gemini-key-here') {
            try {
                this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
                this.model = this.genAI.getGenerativeModel({ 
                    model: "gemini-1.5-flash",
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2000,
                        topP: 0.8,
                        topK: 40
                    }
                });
                this.geminiAvailable = true;
                console.log('✅ Gemini API initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Gemini:', error.message);
                console.log('⚡ Running in TEMPLATE-ONLY mode');
            }
        } else {
            console.log('ℹ️  No Gemini API key found - Using templates only');
        }

        // Multi-layer Cache System
        this.cache = new LRUCache({
            max: parseInt(process.env.MAX_CACHE_SIZE) || 10000,
            ttl: parseInt(process.env.CACHE_TTL) * 1000 || 3600000,
            updateAgeOnGet: true,
            allowStale: false
        });

        // Template System
        this.templates = new Map();
        this.initializeAllTemplates();

        // Metrics Tracking
        this.metrics = {
            totalRequests: 0,
            cacheHits: 0,
            templateHits: 0,
            apiCalls: 0,
            averageSpeed: 0,
            totalTokensUsed: 0,
            startTime: Date.now()
        };
    }

    // ============================================
    // MAIN GENERATION METHODS
    // ============================================

    async generateCode(prompt, language = 'javascript', context = '') {
        const startTime = Date.now();
        this.metrics.totalRequests++;

        try {
            // Level 1: Check Cache (0.001ms)
            const cacheKey = this.createCacheKey(prompt, language);
            const cachedResult = this.cache.get(cacheKey);
            if (cachedResult) {
                this.metrics.cacheHits++;
                return {
                    code: cachedResult,
                    speed: '0.001ms',
                    source: 'cache',
                    tier: 'L1 Cache'
                };
            }

            // Level 2: Check Templates (0.001ms)
            const templateMatch = this.matchTemplate(prompt);
            if (templateMatch) {
                const templateCode = this.instantiateTemplate(templateMatch, prompt);
                this.cache.set(cacheKey, templateCode);
                this.metrics.templateHits++;
                return {
                    code: templateCode,
                    speed: '0.001ms',
                    source: 'template',
                    template: templateMatch,
                    tier: 'Template Engine'
                };
            }

            // Level 3: Generate with Gemini (50-200ms)
            if (this.geminiAvailable) {
                this.metrics.apiCalls++;
                const generatedCode = await this.callGeminiAPI(prompt, language, context);
                this.cache.set(cacheKey, generatedCode);
                
                const responseTime = Date.now() - startTime;
                this.updateMetrics(responseTime);

                return {
                    code: generatedCode,
                    speed: `${responseTime}ms`,
                    source: 'gemini',
                    model: 'gemini-1.5-flash',
                    tier: 'AI Generation'
                };
            }

            // Level 4: Fallback Template (0ms)
            const fallbackCode = this.generateFallback(prompt, language);
            return {
                code: fallbackCode,
                speed: '0ms',
                source: 'fallback',
                tier: 'Basic Template'
            };

        } catch (error) {
            console.error('Generation error:', error);
            return {
                code: this.generateFallback(prompt, language),
                speed: '0ms',
                source: 'error-fallback',
                error: error.message
            };
        }
    }

    async generateBatch(specifications) {
        const startTime = Date.now();
        
        // Process all specifications in parallel
        const promises = specifications.map(spec => 
            this.generateCode(spec.prompt, spec.language || 'javascript', spec.context || '')
        );
        
        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;

        // Attach filenames if provided
        const files = results.map((result, index) => ({
            ...result,
            filename: specifications[index].filename || `generated-${index + 1}.js`,
            index: index
        }));

        return {
            files,
            stats: {
                totalFiles: files.length,
                totalTime: `${totalTime}ms`,
                averageTime: `${(totalTime / files.length).toFixed(2)}ms`,
                speedMultiplier: `${Math.round(1000 / (totalTime / files.length))}x`,
                cacheHits: files.filter(f => f.source === 'cache').length,
                templateHits: files.filter(f => f.source === 'template').length,
                apiGenerated: files.filter(f => f.source === 'gemini').length
            }
        };
    }

    // ============================================
    // GEMINI API INTEGRATION
    // ============================================

    async callGeminiAPI(prompt, language, context) {
        const systemPrompt = `You are an expert ${language} developer. Generate clean, production-ready code.
Rules:
- Output ONLY the code, no explanations
- Use modern best practices
- Include error handling
- Add helpful comments
- Make it complete and runnable
${context ? `\nContext: ${context}` : ''}`;

        const fullPrompt = `${systemPrompt}\n\nTask: ${prompt}\n\n${language} code:`;

        try {
            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            let code = response.text();

            // Clean up the generated code
            code = this.cleanGeneratedCode(code);
            
            // Track token usage
            if (response.usageMetadata) {
                this.metrics.totalTokensUsed += 
                    (response.usageMetadata.promptTokenCount || 0) + 
                    (response.usageMetadata.candidatesTokenCount || 0);
            }

            return code;
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    // ============================================
    // TEMPLATE SYSTEM
    // ============================================

    initializeAllTemplates() {
        // CRUD API Template
        this.templates.set('crud-api', (entityName) => {
            const Entity = entityName || 'Item';
            const entity = Entity.toLowerCase();
            return `const express = require('express');
const router = express.Router();
const ${Entity} = require('../models/${Entity}');

// CREATE - POST /api/${entity}s
router.post('/', async (req, res) => {
  try {
    const ${entity} = new ${Entity}(req.body);
    const saved${Entity} = await ${entity}.save();
    res.status(201).json({
      success: true,
      data: saved${Entity}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// READ ALL - GET /api/${entity}s
router.get('/', async (req, res) => {
  try {
    const ${entity}s = await ${Entity}.find();
    res.json({
      success: true,
      count: ${entity}s.length,
      data: ${entity}s
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ ONE - GET /api/${entity}s/:id
router.get('/:id', async (req, res) => {
  try {
    const ${entity} = await ${Entity}.findById(req.params.id);
    if (!${entity}) {
      return res.status(404).json({
        success: false,
        error: '${Entity} not found'
      });
    }
    res.json({
      success: true,
      data: ${entity}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE - PUT /api/${entity}s/:id
router.put('/:id', async (req, res) => {
  try {
    const ${entity} = await ${Entity}.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!${entity}) {
      return res.status(404).json({
        success: false,
        error: '${Entity} not found'
      });
    }
    res.json({
      success: true,
      data: ${entity}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - DELETE /api/${entity}s/:id
router.delete('/:id', async (req, res) => {
  try {
    const ${entity} = await ${Entity}.findByIdAndDelete(req.params.id);
    if (!${entity}) {
      return res.status(404).json({
        success: false,
        error: '${Entity} not found'
      });
    }
    res.json({
      success: true,
      message: '${Entity} deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;`;
        });

        // React Component Template
        this.templates.set('react-component', (name) => {
            const ComponentName = name || 'Component';
            return `import React, { useState, useEffect } from 'react';
import './${ComponentName}.css';

const ${ComponentName} = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/${ComponentName.toLowerCase()}s');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/${ComponentName.toLowerCase()}s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to create item');
      const newItem = await response.json();
      setData([...data, newItem.data]);
      setFormData({ name: '', description: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(\`/api/${ComponentName.toLowerCase()}s/\${id}\`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete item');
      setData(data.filter(item => item._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="${ComponentName.toLowerCase()}-container">
      <h1>${ComponentName} Management</h1>
      
      <form onSubmit={handleSubmit} className="${ComponentName.toLowerCase()}-form">
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <button type="submit">Add ${ComponentName}</button>
      </form>

      <div className="${ComponentName.toLowerCase()}-list">
        {data.length === 0 ? (
          <p className="no-data">No ${ComponentName}s found</p>
        ) : (
          data.map(item => (
            <div key={item._id || item.id} className="${ComponentName.toLowerCase()}-item">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <button onClick={() => handleDelete(item._id || item.id)}>
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ${ComponentName};`;
        });

        // Authentication Template
        this.templates.set('auth', () => {
            return `const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRE = '30d';

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { email, password, name } = userData;

    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name: name || email.split('@')[0]
    });

    // Generate token
    const token = this.generateToken(user._id);

    return {
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user._id);

    return {
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    };
  }

  /**
   * Generate JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Auth middleware for Express
   */
  authMiddleware(req, res, next) {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      const token = authHeader.split(' ')[1];
      const decoded = this.verifyToken(token);
      
      // Attach user to request
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized'
      });
    }
  }
}

module.exports = new AuthService();`;
        });

        // Express Server Template
        this.templates.set('express-server', () => {
            return `const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Import route files
// const userRoutes = require('./routes/users');
// app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
  console.log(\`Environment: \${process.env.NODE_ENV || 'development'}\`);
});

module.exports = app;`;
        });

        // Utility Functions Template
        this.templates.set('utils', () => {
            return `/**
 * Utility Functions Library
 */

class Utils {
  /**
   * Format date to readable string
   */
  static formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Validate email format
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate random string
   */
  static generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Deep clone object
   */
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Debounce function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function
   */
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Capitalize first letter
   */
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = Utils;`;
        });
    }

    matchTemplate(prompt) {
        const lowerPrompt = prompt.toLowerCase();

        const templatePatterns = [
            { 
                keywords: ['api', 'crud', 'endpoint', 'rest', 'route', 'router'],
                template: 'crud-api'
            },
            { 
                keywords: ['react', 'component', 'ui', 'frontend', 'jsx'],
                template: 'react-component'
            },
            { 
                keywords: ['auth', 'login', 'register', 'jwt', 'token', 'authentication'],
                template: 'auth'
            },
            { 
                keywords: ['express', 'server', 'app', 'backend'],
                template: 'express-server'
            },
            { 
                keywords: ['util', 'helper', 'function', 'tool', 'format', 'validate'],
                template: 'utils'
            }
        ];

        for (const pattern of templatePatterns) {
            if (pattern.keywords.some(keyword => lowerPrompt.includes(keyword))) {
                return pattern.template;
            }
        }

        return null;
    }

    instantiateTemplate(templateName, prompt) {
        const words = prompt.split(' ');
        const entityName = words.find(w => 
            w.length > 2 && 
            w[0] === w[0].toUpperCase() && 
            !['I', 'A', 'API', 'CRUD', 'REST'].includes(w)
        ) || 'Item';

        const generator = this.templates.get(templateName);
        if (!generator) return null;

        return generator(entityName);
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    createCacheKey(prompt, language) {
        const str = `${prompt}-${language}`;
        return crypto.createHash('md5').update(str).digest('hex');
    }

    cleanGeneratedCode(code) {
        // Remove markdown code blocks
        code = code.replace(/```\w*\n?/g, '').replace(/```/g, '');
        // Remove leading/trailing whitespace
        code = code.trim();
        return code;
    }

    generateFallback(prompt, language) {
        const entityName = prompt.split(' ')
            .find(w => w.length > 2 && w[0] === w[0].toUpperCase()) || 'Item';

        return `// Generated from template (Gemini API not configured)
// Prompt: ${prompt}
// Language: ${language}

class ${entityName}Service {
  constructor() {
    this.items = [];
  }

  async create(data) {
    const item = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString()
    };
    this.items.push(item);
    return item;
  }

  async findAll() {
    return this.items;
  }

  async findById(id) {
    return this.items.find(item => item.id === id);
  }

  async update(id, data) {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;
    this.items[index] = { ...this.items[index], ...data, updatedAt: new Date().toISOString() };
    return this.items[index];
  }

  async delete(id) {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }
}

module.exports = new ${entityName}Service();`;
    }

    updateMetrics(responseTime) {
        if (this.metrics.totalRequests === 0) {
            this.metrics.averageSpeed = responseTime;
        } else {
            this.metrics.averageSpeed = 
                (this.metrics.averageSpeed * (this.metrics.totalRequests - 1) + responseTime) / 
                this.metrics.totalRequests;
        }
    }

    // ============================================
    // PUBLIC API METHODS
    // ============================================

    getAvailableTemplates() {
        return Array.from(this.templates.keys());
    }

    getMetrics() {
        const uptime = (Date.now() - this.metrics.startTime) / 1000;
        const speedMultiplier = this.metrics.averageSpeed > 0 
            ? Math.round(1000 / this.metrics.averageSpeed) 
            : 1000;

        return {
            totalRequests: this.metrics.totalRequests,
            cacheHits: this.metrics.cacheHits,
            templateHits: this.metrics.templateHits,
            apiCalls: this.metrics.apiCalls,
            cacheHitRate: this.metrics.totalRequests > 0
                ? `${((this.metrics.cacheHits / this.metrics.totalRequests) * 100).toFixed(1)}%`
                : '0%',
            averageSpeed: `${this.metrics.averageSpeed.toFixed(2)}ms`,
            speedMultiplier: `${speedMultiplier}x`,
            totalTokensUsed: this.metrics.totalTokensUsed,
            geminiAvailable: this.geminiAvailable,
            uptime: `${Math.floor(uptime)}s`,
            templatesLoaded: this.templates.size
        };
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.cache.max,
            itemCount: this.cache.size,
            utilizationRate: `${((this.cache.size / this.cache.max) * 100).toFixed(1)}%`
        };
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️  Cache cleared');
    }
}

module.exports = GeminiSpeedEngine;
