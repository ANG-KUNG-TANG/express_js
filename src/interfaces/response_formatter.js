import { HTTP_STATUS } from './http_status.js'

export const sendSuccess = (res, data, status = HTTP_STATUS.OK) => {
    return res.status(status).json({
        success: true,
        data,
    });
};

export const sendFailure = (res, status, code, message) =>{
    return res.status(status).json({
        success: false,
        error: {
            code,
            message
        }
    });
};