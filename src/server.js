import express from 'express';
// import taskRouters from './interfaces/http/taskController.js'

const app = express();
app.use(express.json());
// app.use('/tasks', taskRouters);

app.listen(3001, ()=> {
    console.log('Task Service running on port 3001')
})