const prisma = require("./prisma");

async function logger(type, user, des) {
    try {
        const activityLog = await prisma.activity.create({
            data: {
                type,
                user,
                des,
            },
        });

        return activityLog;
    } catch (error) {
        throw new Error("Error in activity logging");
    }
}

module.exports = { logger };
