const ALLOWED_FIELDS = {
    create: ['topic', 'word', 'partOfSpeech'],
    update: ['topic', 'word', 'partOfSpeech'],
};

const pickAllowed = (body, allowedKeys) =>{
    if (!body || typeof body !== 'object') return {};
    return allowedKeys.reduce((acc, key)=>{
        if (key in body) acc[key] = body[key];
        return acc;
    }, {})
};


export const sanitizeCreateInput = (body) => pickAllowed(body, ALLOWED_FIELDS.create);
export const sanitizeUpdateInput = (body) => pickAllowed(body, ALLOWED_FIELDS.update);
