// ---------------------------------------------------------------
// TEMPORARY AUTH MIDDLEWARE — for development / testing only
// Replace this entire file with real JWT / OAuth when ready
// ---------------------------------------------------------------

export const authenticate = (req, res, next) => {
    // In Postman / Thunder Client add a header:
    //   X-User-Id: <a real _id from your users collection>
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({
            success: false,
            code: 'MISSING_USER_ID',
            message: 'Dev mode: provide a userId via the X-User-Id request header',
        });
    }

    req.user = { id: userId };
    next();
};

// Stub — always passes during testing. Swap for real role check later.
export const authorizeAdmin = (req, res, next) => {
    next();
};