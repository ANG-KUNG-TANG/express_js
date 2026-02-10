import crypto from 'crypto'

export class UniqueId{
    static generator(){
        return Math.floor(100000 + Math.random() * 9000000).toString()
    }
}