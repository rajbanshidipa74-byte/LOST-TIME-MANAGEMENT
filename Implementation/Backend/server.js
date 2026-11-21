/**
 * Lost Time Web Application - Backend API & Business Logic
 * Aligned with Lost Time SRS v1.0 (Section 4 & Appendix B.8)
 */

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Vaqtinchalik xotira (In-memory store for demonstration / prototype)
let users = [];
let activities = [];
let plannedActivities = [];
let goals = [];

// 1. Account Management (SR-01 to SR-06)
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required (SR-02).' });
    }
    const newUser = { user_id: users.length + 1, name, email };
    users.push(newUser);
    res.status(201).json({ message: 'User registered successfully', user: newUser });
});

// 2. Activity Tracking & Time Calculation (SR-14 to SR-22, Appendix B.8)
app.post('/api/activities', (req, res) => {
    const { user_id, activity_name, category, classification, start_time, end_time, paused_minutes = 0 } = req.body;

    const start = new Date(start_time);
    const end = new Date(end_time);

    // Business Rule 5.5: End time must be later than start time
    if (end <= start) {
        return res.status(400).json({ error: 'End time must be later than start time.' });
    }

    // Appendix B.8 Formula: Activity duration = (end - start) - total paused time
    const rawMinutes = Math.round((end - start) / 60000);
    const duration_minutes = Math.max(0, rawMinutes - paused_minutes);

    const record = {
        activity_id: activities.length + 1,
        user_id,
        activity_name,
        category,
        classification, // 'Productive' | 'Unproductive' | 'Lost Time'
        start_time,
        end_time,
        paused_minutes,
        duration_minutes
    };

    activities.push(record);
    res.status(201).json(record);
});

// 3. Daily Planner & Variance Calculation (SR-23 to SR-29, Appendix B.8)
app.post('/api/plans', (req, res) => {
    const { user_id, activity_name, plan_date, start_time, end_time, priority } = req.body;
    if (!activity_name || !plan_date || !start_time || !end_time) {
        return res.status(400).json({ error: 'Incomplete planned activity details.' });
    }
    const plan = {
        planned_id: plannedActivities.length + 1,
        user_id,
        activity_name,
        plan_date,
        start_time,
        end_time,
        priority: priority || 'Medium'
    };
    plannedActivities.push(plan);
    res.status(201).json(plan);
});

// 4. Dashboard & Lost-Time Analysis Summary (SR-07 to SR-13, SR-30 to SR-42)
app.get('/api/summary/:user_id', (req, res) => {
    const userId = parseInt(req.params.user_id);
    const userActivities = activities.filter(a => a.user_id === userId);

    const totalTracked = userActivities.reduce((sum, a) => sum + a.duration_minutes, 0);
    const productiveTime = userActivities
        .filter(a => a.classification === 'Productive')
        .reduce((sum, a) => sum + a.duration_minutes, 0);
    const unproductiveTime = userActivities
        .filter(a => a.classification === 'Unproductive')
        .reduce((sum, a) => sum + a.duration_minutes, 0);
    const lostTime = userActivities
        .filter(a => a.classification === 'Lost Time')
        .reduce((sum, a) => sum + a.duration_minutes, 0);

    res.json({
        totalTrackedMinutes: totalTracked,
        productiveMinutes: productiveTime,
        unproductiveMinutes: unproductiveTime,
        lostTimeMinutes: lostTime,
        activities: userActivities
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Lost Time Backend API running on port ${PORT}`);
});
