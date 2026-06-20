// src/templates.js - Instant Templates for 0.001ms Generation

const templateMap = {
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

const {{className}} = ({ initialData = {} }) => {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log('{{className}} mounted');
        return () => console.log('{{className}} unmounted');
    }, []);

    const handleAction = async () => {
        setLoading(true);
        try {
            setData({ ...data, updated: new Date() });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="{{varName}}">
            <h1>{{className}}</h1>
            {loading ? <p>Loading...</p> : (
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

// GET all
router.get('/', async (req, res) => {
    try {
        res.json({ success: true, data: [], message: '{{className}}s retrieved' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET one
router.get('/:id', async (req, res) => {
    try {
        res.json({ success: true, data: { id: req.params.id }, message: '{{className}} retrieved' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST create
router.post('/', async (req, res) => {
    try {
        res.status(201).json({ success: true, data: req.body, message: '{{className}} created' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// PUT update
router.put('/:id', async (req, res) => {
    try {
        res.json({ success: true, data: { id: req.params.id, ...req.body }, message: '{{className}} updated' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        res.json({ success: true, message: '{{className}} deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'active'
    }
}, { timestamps: true });

{{varName}}Schema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const {{className}} = mongoose.model('{{className}}', {{varName}}Schema);

module.exports = {{className}};`,

    'utility-function': `
/**
 * {{className}} Utility Function
 * Generated from: {{prompt}}
 */
function {{varName}}(input, options = {}) {
    if (!input) throw new Error('Input is required for {{className}}');
    return input;
}

module.exports = { {{varName}} };`,

    'crud-api': `
// CRUD API for {{className}}
const express = require('express');
const router = express.Router();

let items = [];
let currentId = 1;

router.post('/', (req, res) => {
    const newItem = { id: currentId++, ...req.body, createdAt: new Date() };
    items.push(newItem);
    res.status(201).json(newItem);
});

router.get('/', (req, res) => res.json(items));

router.get('/:id', (req, res) => {
    const item = items.find(i => i.id === parseInt(req.params.id));
    if (!item) return res.status(404).json({ error: '{{className}} not found' });
    res.json(item);
});

router.put('/:id', (req, res) => {
    const index = items.findIndex(i => i.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: '{{className}} not found' });
    items[index] = { ...items[index], ...req.body, updatedAt: new Date() };
    res.json(items[index]);
});

router.delete('/:id', (req, res) => {
    const index = items.findIndex(i => i.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: '{{className}} not found' });
    items.splice(index, 1);
    res.json({ message: '{{className}} deleted' });
});

module.exports = router;`,

    'react-hook': `
import { useState, useEffect, useCallback } from 'react';

const use{{className}} = (initialData = null) => {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (params) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchData(params);
            setData(result);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(initialData);
        setLoading(false);
        setError(null);
    }, [initialData]);

    return { data, loading, error, fetch: fetchData, reset };
};

export default use{{className}};`,

    'middleware-auth': `
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, error: 'Authorization required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        const userRole = req.user.role || 'user';
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        next();
    };
};

module.exports = { authMiddleware, authorize };`,

    'websocket-server': `
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class {{className}}Server {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map();
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            const clientId = uuidv4();
            this.clients.set(clientId, ws);
            console.log(\`Client \${clientId} connected\`);

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log(\`Message from \${clientId}: \${message.type}\`);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });

            ws.on('close', () => {
                this.clients.delete(clientId);
                console.log(\`Client \${clientId} disconnected\`);
            });
        });
    }

    getStats() {
        return { totalClients: this.clients.size };
    }
}

module.exports = {{className}}Server;`,

    'web-app': `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{className}} - Web App</title>
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
        }
        .btn:hover { background: #8b5cf6; }
        input, select, textarea {
            background: #1e1e2a;
            border: 1px solid #2a2a3a;
            color: #e8e8f0;
            padding: 10px;
            border-radius: 6px;
            width: 100%;
            margin-bottom: 10px;
        }
        .task-item {
            background: #1e1e2a;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-left: 4px solid #7c3aed;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin: 15px 0;
            flex-wrap: wrap;
        }
        .stat {
            background: #1e1e2a;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            color: #a8a8b8;
        }
        .stat span { color: #e8e8f0; font-weight: 600; }
        .filters {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }
        .filter-btn {
            background: #1e1e2a;
            border: 1px solid #2a2a3a;
            color: #a8a8b8;
            padding: 4px 12px;
            border-radius: 20px;
            cursor: pointer;
        }
        .filter-btn.active {
            background: #7c3aed;
            color: white;
            border-color: #7c3aed;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 10px;
            margin-bottom: 15px;
        }
        @media (max-width: 600px) {
            .form-row { grid-template-columns: 1fr; }
            .container { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 {{className}}</h1>
        <div id="app">
            <p>Your web app content goes here.</p>
            <button class="btn" onclick="alert('Hello from {{className}}!')">Click Me</button>
        </div>
    </div>
    <script>
        console.log('{{className}} loaded!');
        // Your JavaScript here
    </script>
</body>
</html>`
};

// Available template names
const templateNames = Object.keys(templateMap);

module.exports = { templateMap, templateNames };
