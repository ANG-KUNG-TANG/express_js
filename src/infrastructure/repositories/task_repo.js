import BaseRepository from "./base_repo";

export default class TaskRepository extends BaseRepository{
    constructor(){
        super();
    }

    async findCompletedTask(){
        return await this.model.find({ completed: true})
    }
}