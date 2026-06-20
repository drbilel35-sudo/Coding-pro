// src/gemini-engine.js - Core AI Engine for Gemini Speed Coding Studio
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { templateMap, templateNames } = require('./templates');
const CacheManager = require('./cache-manager');

class GeminiSpeedEngine {
    constructor() {
        // Initialize Gemini AI
        this.apiKey = process.env.GOOGLE_AI_KEY;
        this.geminiAvailable = this.apiKey && this.apiKey !== 'AIzaSyABC123-your-actual-gemini-key-here';
        
        if (this.geminiAvailable) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({ 
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 0.7,
                    topK: 1,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                }
            });
        }

        // Initialize Cache System (3-Layer)
        this.cache = new CacheManager();
        
        // Performance Metrics
        this.metrics = {
            totalGenerations: 0,
            totalAIGenerations: 0,
            totalTemplateGenerations: 0,
            totalCachedGenerations: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
            speedMultiplier: 100,
            geminiAvailable: this.geminiAvailable,
            cacheHitRate: 0,
            startTime: Date.now(),
            languagesSupported: [
                'javascript', 'typescript', 'python', 'go', 'rust',
                'csharp', 'php', 'ruby', 'swift', 'kotlin',
                'html', 'css', 'json', 'markdown', 'sql', 'bash'
            ]
        };

        // Pre-warm cache with common patterns
        this._warmCache();
    }

    // ============================================
    // CORE GENERATION METHODS
    // ============================================

    async generateCode(prompt, language = 'javascript', context = '') {
        const startTime = Date.now();
        const cacheKey = this._generateCacheKey(prompt, language, context);

        // Check cache first (Layer 1)
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            this.metrics.totalCachedGenerations++;
            this._updateMetrics(startTime, true);
            return {
                ...cachedResult,
                source: 'Cache (Instant)',
                cached: true,
                generationTime: '0.001ms'
            };
        }

        // Try templates first (Layer 2)
        const templateResult = this._checkTemplates(prompt, language);
        if (templateResult) {
            this.metrics.totalTemplateGenerations++;
            this.cache.set(cacheKey, templateResult);
            this._updateMetrics(startTime, false);
            return {
                ...templateResult,
                source: 'Template (Instant)',
                cached: false,
                generationTime: '0.001ms'
            };
        }

        // Use Gemini AI (Layer 3)
        if (this.geminiAvailable) {
            try {
                const aiResult = await this._generateWithAI(prompt, language, context);
                this.metrics.totalAIGenerations++;
                this.cache.set(cacheKey, aiResult);
                this._updateMetrics(startTime, false);
                return {
                    ...aiResult,
                    source: 'Google Gemini Flash',
                    cached: false,
                    generationTime: `${Date.now() - startTime}ms`
                };
            } catch (error) {
                console.error('AI Generation failed:', error);
                // Fallback to basic template
                const fallback = this._generateFallback(prompt, language);
                return {
                    ...fallback,
                    source: 'Fallback Template',
                    cached: false,
                    generationTime: `${Date.now() - startTime}ms`,
                    error: error.message
                };
            }
        }

        // No AI, no template - generate basic scaffold
        const basic = this._generateBasicCode(prompt, language);
        return {
            ...basic,
            source: 'Basic Generator',
            cached: false,
            generationTime: `${Date.now() - startTime}ms`
        };
    }

    async generateBatch(specifications) {
        const startTime = Date.now();
        const results = [];

        // Generate files in parallel
        const promises = specifications.map(async (spec, index) => {
            const { prompt, language = 'javascript', filename = `file${index + 1}.js` } = spec;
            const result = await this.generateCode(prompt, language);
            return {
                filename,
                ...result,
                order: index
            };
        });

        const files = await Promise.all(promises);
        
        // Sort by order
        files.sort((a, b) => a.order - b.order);
        files.forEach(f => delete f.order);

        const totalTime = Date.now() - startTime;

        return {
            files,
            totalFiles: files.length,
            totalTime: `${totalTime}ms`,
            averageSpeed: `${(totalTime / files.length).toFixed(2)}ms/file`
        };
    }

    // ============================================
    // TEMPLATE SYSTEM
    // ============================================

    instantiateTemplate(templateName, prompt = '') {
        const template = templateMap[templateName];
        if (!template) return null;

        // Replace placeholders with prompt
        let code = template;
        if (prompt) {
            // Convert prompt to meaningful names
            const className = this._toPascalCase(prompt);
            const varName = this._toCamelCase(prompt);
            const constName = this._toScreamingSnakeCase(prompt);
            
            code = code
                .replace(/\{\{className\}\}/g, className)
                .replace(/\{\{varName\}\}/g, varName)
                .replace(/\{\{CONST_NAME\}\}/g, constName)
                .replace(/\{\{prompt\}\}/g, prompt);
        }

        return code;
    }

    getAvailableTemplates() {
        return templateNames;
    }

    // ============================================
    // CACHE MANAGEMENT
    // ============================================

    clearCache() {
        this.cache.clear();
        this.metrics.cacheHitRate = 0;
    }

    getCacheStats() {
        return this.cache.getStats();
    }

    // ============================================
    // METRICS
    // ============================================

    getMetrics() {
        const uptime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
        const total = this.metrics.totalGenerations || 1;
        const cacheHits = this.metrics.totalCachedGenerations || 0;
        
        return {
            ...this.metrics,
            uptime: `${Math.floor(uptime / 60)}m ${uptime % 60}s`,
            totalGenerations: this.metrics.totalGenerations,
            cacheHitRate: `${((cacheHits / total) * 100).toFixed(1)}%`,
            averageResponseTime: this.metrics.averageResponseTime 
                ? `${this.metrics.averageResponseTime.toFixed(2)}ms` 
                : '0ms',
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version,
            platform: process.platform,
            languagesSupported: this.metrics.languagesSupported
        };
    }

    // ============================================
    // PRIVATE METHODS
    // ============================================

    _generateCacheKey(prompt, language, context) {
        return `${language}:${prompt.trim().toLowerCase()}:${context.slice(0, 50)}`;
    }

    _checkTemplates(prompt, language) {
        // Check if prompt matches any template
        const lowerPrompt = prompt.toLowerCase();
        for (const template of templateNames) {
            const keywords = template.split('-');
            if (keywords.every(keyword => lowerPrompt.includes(keyword))) {
                const code = this.instantiateTemplate(template, prompt);
                if (code) {
                    return {
                        code,
                        language,
                        template: template,
                        description: `Generated from template: ${template}`
                    };
                }
            }
        }
        return null;
    }

    async _generateWithAI(prompt, language, context) {
        // Special handling for HTML/web apps
        const isHtml = language === 'html' || language === 'web-app';
        const languageName = isHtml ? 'HTML/CSS/JavaScript' : language;

        const systemPrompt = `You are an expert ${languageName} developer. Generate clean, production-ready code based on the user's request.

Rules:
1. Generate ONLY the code - no explanations or markdown
2. Use modern best practices
3. Include comments for complex logic
4. Make it immediately usable
5. Respond with plain text code only

${isHtml ? `
6. For HTML/Web Apps:
   - Include complete HTML structure
   - Use modern CSS (flexbox, grid, variables)
   - Include interactive JavaScript
   - Make it responsive
   - Use localStorage for data persistence when needed
` : ''}

Context: ${context || 'No additional context'}
Language: ${languageName}
Request: ${prompt}

Generate the code:`;

        try {
            const result = await this.model.generateContent(systemPrompt);
            const response = await result.response;
            let code = response.text();

            // Clean up markdown if present
            code = code.replace(/```\w*\n?/g, '').replace(/```\n?/g, '').trim();

            // For HTML, ensure proper structure
            if (isHtml && !code.includes('<!DOCTYPE html>') && !code.includes('<html')) {
                code = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Web App</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0f;
            color: #e8e8f0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            width: 100%;
            background: #14141c;
            border-radius: 12px;
            padding: 30px;
            border: 1px solid #2a2a3a;
            box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        }
        h1 { color: #7c3aed; margin-bottom: 20px; }
        .btn {
            background: #7c3aed;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .btn:hover { 
            background: #8b5cf6;
            transform: translateY(-2px);
            box-shadow: 0 0 20px rgba(124,58,237,0.3);
        }
        .btn-danger { background: #ef4444; }
        .btn-danger:hover { background: #dc2626; }
        .btn-success { background: #10b981; }
        .btn-success:hover { background: #059669; }
        input, select, textarea {
            background: #1e1e2a;
            border: 1px solid #2a2a3a;
            color: #e8e8f0;
            padding: 10px;
            border-radius: 6px;
            width: 100%;
            margin-bottom: 10px;
            font-family: inherit;
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #7c3aed;
            box-shadow: 0 0 0 3px rgba(124,58,237,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        ${code}
    </div>
</body>
</html>`;
            }

            return {
                code,
                language,
                description: `Generated from prompt: ${prompt.slice(0, 50)}...`
            };
        } catch (error) {
            throw new Error(`AI Generation Error: ${error.message}`);
        }
    }

    _generateFallback(prompt, language) {
        const isHtml = language === 'html' || language === 'web-app';
        
        if (isHtml) {
            return {
                code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web App</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0f;
            color: #e8e8f0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            width: 100%;
            background: #14141c;
            border-radius: 12px;
            padding: 30px;
            border: 1px solid #2a2a3a;
        }
        h1 { color: #7c3aed; }
        .btn {
            background: #7c3aed;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
        }
        .btn:hover { background: #8b5cf6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 Web App</h1>
        <p>Generated from: ${prompt}</p>
        <button class="btn" onclick="alert('Hello from your web app!')">Click Me</button>
    </div>
</body>
</html>`,
                language,
                description: 'Fallback generated HTML (AI unavailable)'
            };
        }

        const code = `// Generated from: ${prompt}
// Language: ${language}
// Note: Using fallback generator

function main() {
    console.log('Hello from ${language}!');
    console.log('Prompt: ${prompt}');
}

// TODO: Implement your logic here
main();

module.exports = { main };`;

        return {
            code,
            language,
            description: 'Fallback generated code (AI unavailable)'
        };
    }

    _generateBasicCode(prompt, language) {
        // Ultra-basic generator when nothing else works
        const isHtml = language === 'html' || language === 'web-app';
        
        if (isHtml) {
            return {
                code: `<!DOCTYPE html>
<html>
<head><title>Basic App</title></head>
<body>
    <h1>Hello World</h1>
    <p>Prompt: ${prompt}</p>
    <script>console.log('Welcome to Gemini Speed Studio!');</script>
</body>
</html>`,
                language,
                description: 'Basic HTML scaffold generated'
            };
        }

        const code = `// Basic code generated for: ${prompt}
// Language: ${language}

// Your code here
console.log('Welcome to Gemini Speed Studio!');

// ${prompt}`;

        return {
            code,
            language,
            description: 'Basic scaffold generated'
        };
    }

    _warmCache() {
        // Pre-cache common templates
        const commonPrompts = [
            'create express server',
            'create react component',
            'create api route',
            'create database model',
            'create utility function',
            'create web app',
            'create html page'
        ];

        for (const prompt of commonPrompts) {
            const result = this._checkTemplates(prompt, 'javascript');
            if (result) {
                const key = this._generateCacheKey(prompt, 'javascript', '');
                this.cache.set(key, result);
            }
        }
    }

    _updateMetrics(startTime, cached) {
        const duration = Date.now() - startTime;
        this.metrics.totalGenerations++;
        this.metrics.totalResponseTime += duration;
        this.metrics.averageResponseTime = 
            this.metrics.totalResponseTime / this.metrics.totalGenerations;

        // Update cache hit rate
        const total = this.metrics.totalGenerations;
        const hits = this.metrics.totalCachedGenerations;
        this.metrics.cacheHitRate = (hits / total) * 100;
    }

    // ============================================
    // STRING HELPERS
    // ============================================

    _toPascalCase(str) {
        // Remove special characters and split
        const words = str.replace(/[^a-zA-Z0-9 ]/g, '').split(' ');
        return words
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    _toCamelCase(str) {
        const pascal = this._toPascalCase(str);
        return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    }

    _toScreamingSnakeCase(str) {
        return str
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .split(' ')
            .map(word => word.toUpperCase())
            .join('_');
    }
}

module.exports = GeminiSpeedEngine;
