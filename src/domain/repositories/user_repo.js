import BaseRepository from "./base_repo";


export default class UserRepository extends BaseRepository{
    constructor(){
        super();
    }
    async findUser(){
        return await this.model.find({completed: true})
    }
}