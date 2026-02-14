import crypto from 'crypto'

export class UniqueId{
    generator(){
        const timestamp= Date.now().toString(36);
        const randomPart= crypto.randomBytes(4).toString("hex");
        return `${timestamp} -${randomPart}`
    }
}