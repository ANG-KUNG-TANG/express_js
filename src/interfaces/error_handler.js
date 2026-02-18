import { ERROR_STATUS_MAP } from "./user/error.map.js";
import { sendFailure } from "./response_formatter.js";
import { HTTP_STATUS } from "./http_status.js";


const toErrorCode = (name) =>
    name
        .replace(/([A-Z])/g,'_$1')
        .toUpperCase()
        .replace(/^_/,'');


export const errorHandler = (err, req, res, next) =>{
    console.error('ERROR NAME:', err.constructor.name);
    console.error('ERROR MESSAGE:', err.message);
    console.error('STACK:', err.stack);

    const errorName = err.constructor.name;
    const status = ERROR_STATUS_MAP[errorName] ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const code = toErrorCode(errorName);

    const message = 
        status === HTTP_STATUS.INTERNAL_SERVER_ERROR ? 'An unexpected error occurred': err.message;

    return sendFailure(res,status,code,message);
}