// server.js - Main Express Server for Gemini Speed Coding Studio
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const GeminiSpeedEngine = require('./src/gemini-engine');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini Speed Engine
const engine = new GeminiSpeedEngine();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// ============================================
// API ROUTES
// ============================================

// Health Check
app.get('/api/health', (req, res) => {
    const metrics = engine.getMetrics();
    res.json({
        status: 'active',
        provider: 'Google Gemini Flash',
        cost: 'FREE',
        uptime: process.uptime(),
        metrics,
        timestamp: new Date().toISOString()
    });
});

// Generate Code (Single)
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, language = 'javascript', context = '' } = req.body;

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Prompt is required',
                example: 'Create a REST API for user management'
            });
        }

        const requestId = uuidv4();
        console.log(`📝 [${requestId}] Generating: ${prompt.slice(0, 50)}...`);

        const result = await engine.generateCode(prompt, language, context);

        res.json({
            success: true,
            requestId,
            ...result
        });
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            fallback: 'Try using a template instead'
        });
    }
});

// Generate Multiple Files (Batch)
app.post('/api/generate/batch', async (req, res) => {
    try {
        const { specifications } = req.body;

        if (!specifications || !Array.isArray(specifications) || specifications.length === 0) {
            return res.status(400).json({ 
                error: 'Specifications array is required',
                example: {
                    specifications: [
                        { prompt: 'Create user model', language: 'javascript', filename: 'user.js' },
                        { prompt: 'Create auth middleware', language: 'javascript', filename: 'auth.js' }
                    ]
                }
            });
        }

        const batchId = uuidv4();
        console.log(`📦 [${batchId}] Batch generating ${specifications.length} files...`);

        const results = await engine.generateBatch(specifications);

        res.json({
            success: true,
            batchId,
            ...results
        });
    } catch (error) {
        console.error('Batch generation error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Template Generation (Instant)
app.post('/api/generate/template', (req, res) => {
    try {
        const { template, prompt } = req.body;

        if (!template) {
            return res.status(400).json({ 
                error: 'Template name is required',
                availableTemplates: engine.getAvailableTemplates()
            });
        }

        const startTime = process.hrtime.bigint();
        const result = engine.instantiateTemplate(template, prompt || 'Generate code');
        const endTime = process.hrtime.bigint();
        const generationTime = Number(endTime - startTime) / 1_000_000;

        if (!result) {
            return res.status(404).json({ 
                error: 'Template not found',
                availableTemplates: engine.getAvailableTemplates()
            });
        }

        res.json({
            success: true,
            code: result,
            generationTime: `${generationTime.toFixed(4)}ms`,
            speed: generationTime < 0.01 ? 'INSTANT' : 'ULTRA-FAST'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get Available Templates
app.get('/api/templates', (req, res) => {
    res.json({
        templates: engine.getAvailableTemplates(),
        count: engine.getAvailableTemplates().length,
        description: 'These templates generate code instantly (0.001ms)'
    });
});

// Get Performance Metrics
app.get('/api/metrics', (req, res) => {
    const metrics = engine.getMetrics();
    res.json({
        ...metrics,
        serverUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
    });
});

// Clear Cache
app.post('/api/cache/clear', (req, res) => {
    engine.clearCache();
    res.json({
        success: true,
        message: 'Cache cleared successfully',
        speed: 'Ready for fresh generation'
    });
});

// Get Cache Statistics
app.get('/api/cache/stats', (req, res) => {
    res.json(engine.getCacheStats());
});

// ============================================
// SERVE FRONTEND
// ============================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        availableRoutes: [
            'POST /api/generate',
            'POST /api/generate/batch',
            'POST /api/generate/template',
            'GET /api/templates',
            'GET /api/metrics',
            'GET /api/cache/stats',
            'POST /api/cache/clear',
            'GET /api/health'
        ]
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ⚡ GEMINI SPEED CODING STUDIO ⚡                      ║
║                                                          ║
║   Status: ACTIVE                                         ║
║   Port: ${PORT}                                            ║
║   Provider: Google Gemini Flash (FREE)                   ║
║   Templates: ${engine.getAvailableTemplates().length} loaded                       ║
║   Cache: 3-Layer System Active                          ║
║                                                          ║
║   API Endpoints:                                         ║
║   - http://localhost:${PORT}/api/generate                  ║
║   - http://localhost:${PORT}/api/generate/batch            ║
║   - http://localhost:${PORT}/api/generate/template         ║
║   - http://localhost:${PORT}/api/templates                 ║
║   - http://localhost:${PORT}/api/metrics                   ║
║                                                          ║
║   Web Interface: http://localhost:${PORT}                  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);

    // Check if API key is configured
    if (!process.env.GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY === 'AIzaSyABC123-your-actual-gemini-key-here') {
        console.log('⚠️  WARNING: Gemini API key not configured!');
        console.log('💡 Get your FREE key at: https://makersuite.google.com/app/apikey');
        console.log('⚡ Running in TEMPLATE-ONLY mode (still 1000x speed!)\n');
    } else {
        console.log('✅ Gemini API key configured - FULL AI POWER ACTIVE\n');
    }
});

module.exports = app;
