const prisma = require("../utils/prisma");
const { logger } = require("../utils/activityLogger")
const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const { createToken } = require("../utils/token");
const { uploadFile } = require("../uploadFile");

// TODO USER ENDPOINTS

// get last user_id from user collection

router.post("/getLastUserId", async (req, res) => {
    try {
        const result = await prisma.user.findFirst({
            select: {
                user_id: true
            },
            orderBy: {
                user_id: 'desc'
            },
            take: 1
        });

        if (!result) {
            return res.json({ message: "001" });
        }

        const lastID = parseInt(result.user_id.slice(3)) + 1;
        const paddedLastID = String(lastID).padStart(3, "0");
        const newId = `U${new Date().getFullYear() % 100}${paddedLastID}`

        res.json({ message: newId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

router.post(`/registerUser`, async (req, res) => {
    let newId;
    try {
        const generateNewUserId = async () => {
            try {
                const result = await prisma.user.findFirst({
                    select: {
                        user_id: true
                    },
                    orderBy: {
                        user_id: 'desc'
                    },
                    take: 1
                });

                if (!result) {
                    // If there are no existing users, start with "N23001"
                    newId = 'U23001';
                } else {
                    // Parse the current user_id, increment it, and format the new user_id
                    const lastID = parseInt(result.user_id.slice(3)) + 1;
                    const paddedLastId = String(lastID).padStart(3, "0");
                    newId = `U23${paddedLastId}`;
                }

            } catch (error) {
                console.error(error);
            }
        };

        await generateNewUserId();

        const { name, number, password } = req.body;

        const salt = await bcrypt.genSalt(10);

        newPassword = await bcrypt.hash(password, salt);

        const result = await prisma.user.create({
            data: {
                name,
                user_id: newId,
                number,
                password: newPassword
            },
        });
        // await logger("user_created", req.user.id, `User created: ${name}`);
        res.status(201).json(result); // 201 for successful creation
    } catch (error) {
        // await logger("error", req.user.id, `Error creating organization: ${error.message}`);
        res.status(500).json({ message: error.message });
    }
});


router.post('/loginUser', async (req, res) => {
    const { number, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: {
                number: number,
            },
        });

        if (!user) throw Error("Incorrect Number");

        const match = await bcrypt.compare(password, user.password);

        if (!match) throw Error("Incorrect Password");

        const user_id = user.user_id;
        const token = await createToken(number);

        res.status(200).json({ user_id, token });

    } catch (error) {
        // await logger("error", req.user.id, `Error creating organization: ${error.message}`);
        res.status(500).json({ message: error.message });
    }
})


// get single user and organization collection data by user_id by  aggregating

router.post('/getUserAndOrganization', async (req, res) => {
    const { user_id } = req.body;
    try {
        const result = await prisma.user.aggregateRaw({
            pipeline: [
                {
                    $match: {
                        user_id: user_id
                    }
                },
                {
                    $lookup: {
                        from: "organization",
                        localField: "user_id",
                        foreignField: "user_id",
                        as: "organizationData"
                    }
                },
                {
                    $unwind: {
                        path: "$organizationData",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        user_id: 1,
                        name: 1,
                        number: 1,
                        email: 1,
                        role: 1,
                        isComplete: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        organizationData: {
                            org_id: "$organizationData.org_id",
                            name: "$organizationData.name",
                            owner_name: "$organizationData.owner_name",
                            number: "$organizationData.number",
                            email: "$organizationData.email",
                            type: "$organizationData.type",
                            isMulti: "$organizationData.isMulti",
                            location: "$organizationData.location",
                            logo: "$organizationData.logo",
                            status: "$organizationData.status",
                            date: "$organizationData.date"
                        }
                    }
                }
            ]
        });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});



router.post('/getAllUsers', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                user_id: true,
                name: true,
                number: true,
                role: true,
                createdAt: true,
                updatedAt: true
            },
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});


router.post(`/deleteUser`, async (req, res) => {
    try {
        const { user_id } = req.body;
        const user = await prisma.user.delete({
            where: {
                user_id: user_id,
            },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});



// TODO ORGANIZATION ENDPOINTS

// Middleware for input validation
const validateOrganizationInput = (req, res, next) => {
    const { name, type, des } = req.body;
    if (!name || !type || !des) {
        return res.status(400).json({ error: "Missing required fields." });
    }
    next();
};

router.post(`/createOrganization`, async (req, res) => {
    const { name, owner_name, number, email, user_id, type, isMulti, location, img } = req.body;

    try {
        const imageName = await uploadFile(req.files.img, "image");

        // Check if organization with the same user_id already exists
        let organization;

        const existingOrganization = await prisma.organization.findUnique({
            where: { user_id: user_id },
        });

        if (existingOrganization) {
            // If organization exists, update it
            organization = await prisma.organization.update({
                where: { user_id: user_id },
                data: {
                    name,
                    owner_name,
                    number,
                    email,
                    type,
                    isMulti,
                    location,
                    logo: imageName,
                },
            });

            // Log activity for organization update
            await logger("organization_updated", user_id, `Organization updated: ${name}`);
        } else {
            // If organization does not exist, create it
            organization = await prisma.organization.create({
                data: {
                    name,
                    owner_name,
                    number,
                    email,
                    user_id,
                    type,
                    isMulti,
                    location,
                    logo: imageName,
                },
            });

            // Update user completeness
            await prisma.user.update({
                where: { user_id: user_id },
                data: { isComplete: "YES" },
            });

            // Log activity for organization creation
            await logger("organization_created", user_id, `Organization created: ${name}`);
        }

        res.json({ message: `${name} Organization ${existingOrganization ? 'updated' : 'created'} successfully` });
    } catch (error) {
        // Log error
        await logger("error", user_id, `Error creating/updating organization: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});



router.post('/getAllOrganizations', async (req, res) => {
    try {
        const organizations = await prisma.organization.findMany();
        res.json(organizations);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post(`/getOrganizationById`, async (req, res) => {
    try {
        const { user_id } = req.body;

        const organization = await prisma.organization.findUniqueOrThrow({
            where: {
                user_id: user_id,
            },
            select: {
                id: true,
                org_id: true,
                name: true,
                number: true,
                user_id: true,
            },
        });

        if (!organization) {
            return res.status(404).json({ error: "Organization not found" });
        }
        res.json(organization);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.post(`/deleteOrganization`, async (req, res) => {
    try {
        const { id } = req.body;
        const organization = await prisma.organization.delete({
            where: {
                id: id,
            },
        });

        if (!organization) {
            return res.status(404).json({ error: "Organization not found" });
        }
        res.json(organization);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});


// TODO ACTIVITY LOG ENDPOINTS

router.post('/getAllActivitiesForOrg', async (req, res) => {
    const { user_id, page = 1, pageSize = 10 } = req.body;
    try {
        const skip = (page - 1) * pageSize;

        const [activities, count] = await Promise.all([
            prisma.activity.findMany({
                where: {
                    user: user_id
                },
                orderBy: {
                    date: 'desc' 
                },
                skip,
                take: pageSize
            }),
            prisma.activity.count({
                where: {
                    user: user_id
                }
            })
        ]);

        res.json({ activities, count });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});


module.exports = router;
