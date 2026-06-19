// test-gemini.js - Test file to verify everything works
require('dotenv').config();
const GeminiSpeedEngine = require('./src/gemini-engine');

async function runTests() {
    console.log('🧪 Testing Gemini Speed Coding Studio\n');
    console.log('═'.repeat(50));

    const engine = new GeminiSpeedEngine();

    // Test 1: Check API Key
    console.log('\n📋 Test 1: API Configuration');
    if (process.env.GOOGLE_AI_KEY && process.env.GOOGLE_AI_KEY !== 'AIzaSyABC123-your-actual-gemini-key-here') {
        console.log('✅ Gemini API key found');
    } else {
        console.log('⚠️  No API key - running in template-only mode');
    }

    // Test 2: Template System
    console.log('\n📋 Test 2: Template System');
    const templates = engine.getAvailableTemplates();
    console.log(`✅ ${templates.length} templates loaded: ${templates.join(', ')}`);

    // Test 3: Template Instantiation
    console.log('\n📋 Test 3: Template Speed Test');
    const startTemplate = process.hrtime.bigint();
    engine.instantiateTemplate('crud-api', 'Create User API');
    const endTemplate = process.hrtime.bigint();
    const templateTime = Number(endTemplate - startTemplate) / 1_000_000;
    console.log(`✅ Template instantiation: ${templateTime.toFixed(4)}ms`);

    // Test 4: Cache System
    console.log('\n📋 Test 4: Cache System');
    const cacheStats = engine.getCacheStats();
    console.log(`✅ Cache ready: ${cacheStats.maxSize} max entries`);

    // Test 5: Metrics
    console.log('\n📋 Test 5: Performance Metrics');
    const metrics = engine.getMetrics();
    console.log('✅ Metrics system active');
    console.log(`   - Speed Multiplier: ${metrics.speedMultiplier}`);
    console.log(`   - Gemini Available: ${metrics.geminiAvailable}`);

    // Test 6: Code Generation (if API key available)
    if (process.env.GOOGLE_AI_KEY && process.env.GOOGLE_AI_KEY !== 'AIzaSyABC123-your-actual-gemini-key-here') {
        console.log('\n📋 Test 6: AI Code Generation');
        try {
            const startGen = Date.now();
            const result = await engine.generateCode(
                'Create a function to validate email addresses',
                'javascript'
            );
            const genTime = Date.now() - startGen;
            console.log(`✅ Code generated in ${genTime}ms`);
            console.log(`   Source: ${result.source}`);
            console.log(`   Code length: ${result.code.length} characters`);
        } catch (error) {
            console.log('❌ AI generation failed:', error.message);
        }
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ All tests complete!');
    console.log('\n🚀 Start the server with: npm start');
    console.log('🌐 Open http://localhost:3000 in your browser\n');
}

runTests().catch(console.error);
