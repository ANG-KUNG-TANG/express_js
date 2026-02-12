import e from "cors";
import { AppError } from "../errors&exceptions/base.errors";

export const errorHandler = (err, req, res, next) =>{
    if (err instanceof AppError){
        return res.status(err.statusCode).json({
            success:false,
            error:{
                code: err.code,
                message: err.message,
                ...(err.details && {details: err.details})
            }
        });
    }
    if (err.name === 'ValidationError'){
        const message = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: message.join(', ')
            }
        })
    }

    if (err.code === 11000){
        return res.status(409).json({
            success: false,
            error:{
                code: "CONFLICT",
                message: "Duplicate key error"
            }
        })
    }
    if (err.name === 'CastError'){
        return res.status(400).json({
            success: false,
            error:{
                code: "INVLID_ID",
                message: "Invalid resource identifier"
            }
        })
    }
    console.error('Unhandled error;', err);
    res.status(500).json({
        success:false,
        error:{
            code: "INTERNAL_SERVER_ERROR",
            message: "Something wend wrong"
        }
    })
}