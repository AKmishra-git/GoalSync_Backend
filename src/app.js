import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.routes.js';
import goalRouter from './routes/goal.routes.js';
import approvalRouter from './routes/approval.routes.js';
import sharedGoalRouter from './routes/sharedGoal.routes.js';
import checkinRouter from './routes/checkIn.routes.js';
import adminRouter from './routes/admin.routes.js';
import reportRouter from './routes/report.routes.js';

const app = express();

app.use(express.json());
app.use(cors({
  origin: "*",
  credentials: true
}));

app.get("/", (req, res) => {
  res.send("GoalSync Backend Running Successfully");
});

app.use('/api/auth',         authRouter);
app.use('/api/goals',        goalRouter);
app.use('/api/approval',     approvalRouter);
app.use('/api/shared-goals', sharedGoalRouter);
app.use('/api/checkin',      checkinRouter);
app.use('/api/admin',        adminRouter);
app.use('/api/reports',      reportRouter);

export default app;