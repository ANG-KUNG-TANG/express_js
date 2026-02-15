import { TaskOwnershipError} from '../../core/errors/task.errors.js';

export const ensuerOwnership =(task, userId) =>{
    if (task.userId !== userId){
        throw new TaskOwnershipError(userId, task.id);
    }
}