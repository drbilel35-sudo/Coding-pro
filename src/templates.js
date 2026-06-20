// src/templates.js - Instant Templates for 0.001ms Generation

const templateMap = {
    // ============================================
    // WEB FRAMEWORKS
    // ============================================

    'express-server': `
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.json({ message: '{{className}} API is running!' });
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
});

module.exports = app;`,

    'react-component': `
import React, { useState, useEffect } from 'react';
import './{{varName}}.css';

const {{className}} = ({ initialData = {} }) => {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Initialize component
        console.log('{{className}} mounted');
        return () => {
            // Cleanup
            console.log('{{className}} unmounted');
        };
    }, []);

    const handleAction = async () => {
        setLoading(true);
        try {
            // Your logic here
            setData({ ...data, updated: new Date() });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    return (
        <div className="{{varName}}">
            <h1>{{className}}</h1>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <div>
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                    <button onClick={handleAction}>Action</button>
                </div>
            )}
        </div>
    );
};

export default {{className}};`,

    'api-route': `
const express = require('express');
const router = express.Router();

// GET all {{varName}}s
router.get('/', async (req, res) => {
    try {
        // Fetch all {{varName}}s
        res.json({ 
            success: true, 
            data: [],
            message: '{{className}}s retrieved'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// GET single {{varName}}
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch {{varName}} by id
        res.json({ 
            success: true, 
            data: { id },
            message: '{{className}} retrieved'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// POST create {{varName}}
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        // Create new {{varName}}
        res.status(201).json({ 
            success: true, 
            data: body,
            message: '{{className}} created'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// PUT update {{varName}}
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        // Update {{varName}}
        res.json({ 
            success: true, 
            data: { id, ...body },
            message: '{{className}} updated'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// DELETE {{varName}}
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Delete {{varName}}
        res.json({ 
            success: true, 
            message: '{{className}} deleted'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;`,

    'database-model': `
const mongoose = require('mongoose');

const {{varName}}Schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Pre-save middleware
{{varName}}Schema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Instance method
{{varName}}Schema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

// Static method
{{varName}}Schema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

const {{className}} = mongoose.model('{{className}}', {{varName}}Schema);

module.exports = {{className}};`,

    'utility-function': `
/**
 * {{className}} Utility Function
 * Generated from: {{prompt}}
 */

/**
 * Main function for {{varName}} operation
 * @param {*} input - Input data
 * @param {Object} options - Configuration options
 * @returns {*} Processed result
 */
function {{varName}}(input, options = {}) {
    // Validate input
    if (!input) {
        throw new Error('Input is required for {{className}}');
    }

    // Default options
    const config = {
        strict: true,
        transform: false,
        ...options
    };

    // Your logic here
    let result = input;

    if (config.transform) {
        result = transformData(result);
    }

    if (config.strict) {
        result = validateResult(result);
    }

    return result;
}

/**
 * Helper function for data transformation
 * @param {*} data - Data to transform
 * @returns {*} Transformed data
 */
function transformData(data) {
    // Implement transformation logic
    return data;
}

/**
 * Helper function for validation
 * @param {*} data - Data to validate
 * @returns {*} Validated data
 */
function validateResult(data) {
    // Implement validation logic
    return data;
}

// Export the main function
module.exports = {
    {{varName}},
    transformData,
    validateResult
};`,

    'crud-api': `
// CRUD API for {{className}} - Generated instantly
const express = require('express');
const router = express.Router();

// In-memory database (replace with real DB)
let {{varName}}s = [];
let currentId = 1;

// CREATE
router.post('/', (req, res) => {
    const { name, description } = req.body;
    const new{{className}} = {
        id: currentId++,
        name,
        description,
        createdAt: new Date()
    };
    {{varName}}s.push(new{{className}});
    res.status(201).json(new{{className}});
});

// READ - All
router.get('/', (req, res) => {
    res.json({{varName}}s);
});

// READ - One
router.get('/:id', (req, res) => {
    const {{varName}} = {{varName}}s.find(item => item.id === parseInt(req.params.id));
    if (!{{varName}}) {
        return res.status(404).json({ error: '{{className}} not found' });
    }
    res.json({{varName}});
});

// UPDATE
router.put('/:id', (req, res) => {
    const index = {{varName}}s.findIndex(item => item.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ error: '{{
