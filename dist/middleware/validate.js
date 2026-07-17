export function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const issues = result.error.issues.map((i) => ({
                path: i.path.join("."),
                message: i.message,
            }));
            res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Request validation failed",
                    details: issues,
                },
            });
            return;
        }
        req.body = result.data;
        next();
    };
}
export function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid URL parameter",
                    details: result.error.issues.map((i) => ({
                        path: i.path.join("."),
                        message: i.message,
                    })),
                },
            });
            return;
        }
        next();
    };
}
export function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid query parameter",
                    details: result.error.issues.map((i) => ({
                        path: i.path.join("."),
                        message: i.message,
                    })),
                },
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=validate.js.map