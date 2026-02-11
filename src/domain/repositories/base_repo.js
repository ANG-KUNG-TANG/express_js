export default class BaseRepository{
    constructor(model){
        this.model = model
    }
    async create(data){
        return await this.model.create(data);
    }
    async findById(id){
        return await this.model.findById(id);
    }
    async findAll(){
        return await this.model.findAll();
    }
    async update(id, data){
        return await this.model.findByIdUpdate(id, data, {new: true});
    }
    async delete(id){
        return await this.model.findByIdDelete(id)
    }
}