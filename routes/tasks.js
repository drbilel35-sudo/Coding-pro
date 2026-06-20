const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// ============================================
// CRUD OPERATIONS
// ============================================

// CREATE - POST /api/tasks
router.post('/', async (req, res) => {
    try {
        const task = new Task(req.body);
        const savedTask = await task.save();
        res.status(201).json({
            success: true,
            data: savedTask
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// READ ALL - GET /api/tasks
router.get('/', async (req, res) => {
    try {
        const { status, priority, search, sort, limit = 100, page = 1 } = req.query;
        const query = {};

        // Filter by status
        if (status) query.status = status;
        
        // Filter by priority
        if (priority) query.priority = priority;
        
        // Search in title and description
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Sorting
        let sortOption = { createdAt: -1 };
        if (sort) {
            const [field, order] = sort.split(':');
            sortOption = { [field]: order === 'desc' ? -1 : 1 };
        }

        // Pagination
        const skip = (page - 1) * limit;

        const tasks = await Task.find(query)
            .sort(sortOption)
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Task.countDocuments(query);

        res.json({
            success: true,
            count: tasks.length,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// READ ONE - GET /api/tasks/:id
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// UPDATE - PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// PATCH - Partial Update /api/tasks/:id
router.patch('/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE - DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// BATCH OPERATIONS
// ============================================

// BATCH CREATE - POST /api/tasks/batch
router.post('/batch', async (req, res) => {
    try {
        const { tasks } = req.body;
        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Tasks array is required'
            });
        }

        const createdTasks = await Task.insertMany(tasks);
        res.status(201).json({
            success: true,
            count: createdTasks.length,
            data: createdTasks
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// BATCH DELETE - DELETE /api/tasks/batch
router.delete('/batch', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'IDs array is required'
            });
        }

        const result = await Task.deleteMany({ _id: { $in: ids } });
        res.json({
            success: true,
            deletedCount: result.deletedCount,
            message: `${result.deletedCount} tasks deleted`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// BATCH UPDATE - PUT /api/tasks/batch
router.put('/batch', async (req, res) => {
    try {
        const { ids, updates } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'IDs array is required'
            });
        }

        const result = await Task.updateMany(
            { _id: { $in: ids } },
            { $set: updates }
        );
        res.json({
            success: true,
            modifiedCount: result.modifiedCount,
            message: `${result.modifiedCount} tasks updated`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ADVANCED QUERIES
// ============================================

// GET statistics
router.get('/stats', async (req, res) => {
    try {
        const total = await Task.countDocuments();
        const completed = await Task.countDocuments({ status: 'completed' });
        const pending = await Task.countDocuments({ status: 'pending' });
        const inProgress = await Task.countDocuments({ status: 'in-progress' });
        const highPriority = await Task.countDocuments({ priority: 'high' });
        const mediumPriority = await Task.countDocuments({ priority: 'medium' });
        const lowPriority = await Task.countDocuments({ priority: 'low' });

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentTasks = await Task.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });

        res.json({
            success: true,
            data: {
                total,
                completed,
                pending,
                inProgress,
                completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%',
                priorities: {
                    high: highPriority,
                    medium: mediumPriority,
                    low: lowPriority
                },
                recent: {
                    last7Days: recentTasks
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET by status
router.get('/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const tasks = await Task.find({ status });
        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET by priority
router.get('/priority/:priority', async (req, res) => {
    try {
        const { priority } = req.params;
        const tasks = await Task.find({ priority });
        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET by date range
router.get('/date-range', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate and endDate are required'
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const tasks = await Task.find({
            createdAt: { $gte: start, $lte: end }
        });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET due tasks (overdue and upcoming)
router.get('/due', async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Overdue tasks (due date < today)
        const overdue = await Task.find({
            dueDate: { $lt: today },
            status: { $ne: 'completed' }
        });

        // Due today
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueToday = await Task.find({
            dueDate: { $gte: today, $lt: tomorrow },
            status: { $ne: 'completed' }
        });

        // Due this week
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const dueThisWeek = await Task.find({
            dueDate: { $gte: today, $lt: nextWeek },
            status: { $ne: 'completed' }
        });

        res.json({
            success: true,
            data: {
                overdue: {
                    count: overdue.length,
                    tasks: overdue
                },
                dueToday: {
                    count: dueToday.length,
                    tasks: dueToday
                },
                dueThisWeek: {
                    count: dueThisWeek.length,
                    tasks: dueThisWeek
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET task count by status
router.get('/count-by-status', async (req, res) => {
    try {
        const counts = await Task.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const result = {
            pending: 0,
            'in-progress': 0,
            completed: 0
        };

        counts.forEach(item => {
            result[item._id] = item.count;
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET task count by priority
router.get('/count-by-priority', async (req, res) => {
    try {
        const counts = await Task.aggregate([
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);

        const result = {
            low: 0,
            medium: 0,
            high: 0
        };

        counts.forEach(item => {
            result[item._id] = item.count;
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// EXPORT
// ============================================

module.exports = router;
